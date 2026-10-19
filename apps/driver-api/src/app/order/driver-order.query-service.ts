import { QueryService } from '@ptc-org/nestjs-query-core';
import { InjectPubSub } from '@ptc-org/nestjs-query-graphql';
import { TypeOrmQueryService } from '@ptc-org/nestjs-query-typeorm';
import { Inject, Logger } from '@nestjs/common';
import {
  RIDER_NOTIFICATION_SERVICE,
  IRiderNotificationService,
} from '@kasi/order/interfaces/rider-notification.interface';
import { CONTEXT } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverEntity } from '@kasi/database/driver.entity';
import { DriverStatus } from '@kasi/database/enums/driver-status.enum';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { RequestActivityType } from '@kasi/database/enums/request-activity-type.enum';
import { RequestActivityEntity } from '@kasi/database/request-activity.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import {
  ACCEPTABLE_STATUSES,
  isAtOrBeyond,
  transitionOrder,
} from '@kasi/order/order-transition';
import { RoutingService } from '@kasi/order/routing/routing.service';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { SharedOrderService } from '@kasi/order/shared-order.service';
import { DriverRedisService } from '@kasi/redis/driver-redis.service';
import { OrderRedisService } from '@kasi/redis/order-redis.service';
import { ForbiddenError } from '@nestjs/apollo';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Repository } from 'typeorm';

import { UserContext } from '../auth/authenticated-user';
import { UpdateOrderInput } from './dto/update-order.input';
import { OrderService } from './order.service';

/** Message deja affiche tel quel par driver-app quand une offre est prise. */
export const ALREADY_TAKEN = 'Already Taken';
/** Message historique d'une transition refusee. */
export const TRANSITION_NOT_POSSIBLE = 'Update status to this is not possible';

@QueryService(RequestEntity)
export class DriverOrderQueryService extends TypeOrmQueryService<RequestEntity> {
  constructor(
    @InjectRepository(RequestEntity)
    public orderRepository: Repository<RequestEntity>,
    @InjectRepository(RequestActivityEntity)
    private activityRepository: Repository<RequestActivityEntity>,
    private driverService: SharedDriverService,
    private orderService: OrderService,
    private orderRedisService: OrderRedisService,
    private driverRedisService: DriverRedisService,
    private routingService: RoutingService,
    private sharedOrderService: SharedOrderService,
    @InjectPubSub()
    private pubSub: RedisPubSub,
    @Inject(CONTEXT) private context: UserContext,
    @Inject(RIDER_NOTIFICATION_SERVICE) private readonly riderNotificationService: IRiderNotificationService,
  ) {
    super(orderRepository);
  }

  /**
   * Mutation `updateOneOrder` de driver-api : toutes les transitions de course
   * cote Kasiman.
   *
   * p1-transitions (2026-09-29) : chaque transition est une ECRITURE
   * CONDITIONNELLE par statut attendu et par Kasiman (voir
   * libs/database/src/lib/order/order-transition.ts) :
   *
   *   DriverAccepted  Requested/Found/NoCloseFound/Booked -> DriverAccepted (un seul gagnant)
   *   DriverCanceled  DriverAccepted/Arrived (sa course)  -> DriverCanceled
   *   Arrived         DriverAccepted (sa course)          -> Arrived
   *   Started         Arrived (sa course)                 -> Started
   *   Finished        Started/WaitingForPostPay           -> WaitingForPostPay ou WaitingForReview
   *   sans statut     destinationArrivedTo, course Started du Kasiman
   *
   * Activite, notifications et diffusion n'ont lieu QUE si la ligne a ete
   * modifiee. Un rejeu du meme Kasiman (timeout de 20 s de l'app, double
   * glissement) renvoie l'etat courant sans effet de bord ni erreur, y compris
   * quand la course est deja plus loin que l'etape demandee.
   */
  async updateOne(
    id: number,
    update: UpdateOrderInput,
  ): Promise<RequestEntity> {
    const orderId = Number(id);
    const driverId: number = this.context.req.user.id;
    switch (update.status) {
      case OrderStatus.DriverCanceled:
        return this.cancelByDriver(orderId, driverId);
      case OrderStatus.DriverAccepted:
        return this.accept(orderId, driverId);
      case OrderStatus.Arrived:
        return this.advance(orderId, driverId, {
          from: OrderStatus.DriverAccepted,
          to: OrderStatus.Arrived,
          activity: RequestActivityType.ArrivedToPickupPoint,
          notify: (order) => this.riderNotificationService.arrived(order.rider),
        });
      case OrderStatus.Started:
        return this.advance(orderId, driverId, {
          from: OrderStatus.Arrived,
          to: OrderStatus.Started,
          activity: RequestActivityType.Started,
          notify: (order) => this.riderNotificationService.started(order.rider),
        });
      case OrderStatus.Finished:
        return this.finish(orderId, driverId, update.paidAmount);
      default:
        if (update.status != null) {
          throw new ForbiddenError(TRANSITION_NOT_POSSIBLE);
        }
        return this.updateProgress(orderId, driverId, update);
    }
  }

  /** Acceptation d'une offre : exactement un Kasiman gagne (bug-double-assignation). */
  private async accept(
    orderId: number,
    driverId: number,
  ): Promise<RequestEntity> {
    // Attribution, activite et passage « in service » : une transaction.
    const changed = await this.orderRepository.manager.transaction(
      async (manager) => {
        const changed = await transitionOrder(manager, orderId, {
          from: ACCEPTABLE_STATUSES,
          to: OrderStatus.DriverAccepted,
          set: { driverId },
        });
        if (changed) {
          await manager.insert(RequestActivityEntity, {
            requestId: orderId,
            type: RequestActivityType.DriverAccepted,
          });
          await manager.update(DriverEntity, driverId, {
            status: DriverStatus.InService,
          });
        }
        return changed;
      },
    );
    if (!changed) {
      const current = await this.orderRepository.findOneBy({ id: orderId });
      if (
        current != null &&
        current.driverId === driverId &&
        isAtOrBeyond(current.status, OrderStatus.DriverAccepted)
      ) {
        return this.loadOrder(orderId); // rejeu du gagnant
      }
      throw new ForbiddenError(ALREADY_TAKEN);
    }
    await this.orderRedisService.expire([orderId]);
    // Heure d'arrivee au point de depart : calculee APRES l'attribution, par
    // RoutingService (provider de map_setting, replis OSRM / haversine). Une
    // erreur ici ne remet pas en cause l'acceptation deja enregistree.
    try {
      const [travel, driverLocation] = await Promise.all([
        this.orderRepository.findOneBy({ id: orderId }),
        this.driverRedisService.getDriverCoordinate(driverId),
      ]);
      const metrics =
        driverLocation != null
          ? await this.routingService.getSumDistanceAndDuration([
              travel.points[0],
              driverLocation,
            ])
          : { distance: 0, duration: 0 };
      const dt = new Date();
      await this.orderRepository.update(
        { id: orderId, driverId },
        {
          etaPickup: new Date(
            dt.setSeconds(dt.getSeconds() + metrics.duration),
          ),
        },
      );
    } catch (error) {
      Logger.warn(
        `etaPickup non calcule pour la course ${orderId} : ${(error as Error).message}`,
        'DriverOrderQueryService',
      );
    }
    const order = await this.loadOrder(orderId);
    this.riderNotificationService.accepted(order.rider);
    this.pubSub.publish('orderUpdated', { orderUpdated: order });
    // Filtre cote abonnement : previent tous les Kasimen sauf celui qui a accepte.
    this.pubSub.publish('orderRemoved', { orderRemoved: order });
    return order;
  }

  /** Annulation par le Kasiman (bug-annulation). */
  private async cancelByDriver(
    orderId: number,
    driverId: number,
  ): Promise<RequestEntity> {
    // Statut, activite CanceledByDriver et remise en ligne : une transaction
    // (OrderService.cancelOrder).
    const { changed } = await this.orderService.cancelOrder(orderId, driverId);
    const order = await this.loadOrder(orderId);
    if (changed) {
      this.riderNotificationService.canceled(order.rider);
      this.pubSub.publish('orderUpdated', { orderUpdated: order });
    }
    return order;
  }

  /** Arrived / Started (bug-doublon-statut). */
  private async advance(
    orderId: number,
    driverId: number,
    step: {
      from: OrderStatus;
      to: OrderStatus;
      activity: RequestActivityType;
      notify: (order: RequestEntity) => void;
    },
  ): Promise<RequestEntity> {
    const changed = await this.orderRepository.manager.transaction(
      async (manager) => {
        const changed = await transitionOrder(manager, orderId, {
          from: [step.from],
          to: step.to,
          driverId,
        });
        if (changed) {
          await manager.insert(RequestActivityEntity, {
            requestId: orderId,
            type: step.activity,
          });
        }
        return changed;
      },
    );
    if (!changed) {
      await this.assertReplay(orderId, driverId, step.to);
      return this.loadOrder(orderId);
    }
    const order = await this.loadOrder(orderId);
    step.notify(order);
    this.pubSub.publish('orderUpdated', { orderUpdated: order });
    return order;
  }

  /** Fin de course : paiement unique (SharedOrderService.finish). */
  private async finish(
    orderId: number,
    driverId: number,
    cashAmount?: number,
  ): Promise<RequestEntity> {
    const outcome = await this.sharedOrderService.finish(
      orderId,
      cashAmount ?? 0,
      driverId,
    );
    const order = await this.loadOrder(orderId);
    if (!outcome.changed) {
      return order; // rejeu, ou toujours en attente de paiement
    }
    // Activites ArrivedToDestination / Paid et remise en ligne : ecrites par
    // finish() dans la transaction du paiement.
    if (outcome.status === OrderStatus.WaitingForPostPay) {
      this.riderNotificationService.waitingForPostPay(order.rider);
    } else {
      this.riderNotificationService.finished(order.rider);
    }
    this.pubSub.publish('orderUpdated', { orderUpdated: order });
    return order;
  }

  /**
   * Mise a jour sans statut : seule l'etape de destination atteinte
   * (`destinationArrivedTo`, courses a plusieurs arrets) est modifiable, et
   * seulement sur la course demarree du Kasiman. Avant : tout champ de
   * l'entree (dont `paidAmount`) etait ecrit sur n'importe quelle course.
   */
  private async updateProgress(
    orderId: number,
    driverId: number,
    update: UpdateOrderInput,
  ): Promise<RequestEntity> {
    if (update.destinationArrivedTo != null) {
      const result = await this.orderRepository.update(
        { id: orderId, driverId, status: OrderStatus.Started },
        { destinationArrivedTo: update.destinationArrivedTo },
      );
      if ((result.affected ?? 0) === 0) {
        throw new ForbiddenError(TRANSITION_NOT_POSSIBLE);
      }
    }
    const order = await this.loadOrder(orderId);
    this.pubSub.publish('orderUpdated', { orderUpdated: order });
    return order;
  }

  /**
   * Transition refusee par l'ecriture conditionnelle : rejeu du meme Kasiman
   * (course a l'etape demandee ou au-dela) : aucune erreur ; sinon refus.
   */
  private async assertReplay(
    orderId: number,
    driverId: number,
    requested: OrderStatus,
  ): Promise<void> {
    const current = await this.orderRepository.findOneBy({ id: orderId });
    if (
      current != null &&
      current.driverId === driverId &&
      isAtOrBeyond(current.status, requested)
    ) {
      return;
    }
    throw new ForbiddenError(TRANSITION_NOT_POSSIBLE);
  }

  private loadOrder(orderId: number): Promise<RequestEntity> {
    return this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        rider: true,
        service: true,
        options: true,
        conversation: true,
        driver: { car: true, carColor: true },
      },
    });
  }
}
