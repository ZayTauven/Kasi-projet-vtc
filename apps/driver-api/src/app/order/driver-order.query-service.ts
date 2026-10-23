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
import { ServiceOrderType } from '@kasi/database/enums/service-order-type.enum';
import { vehicleTypeAllowed } from '@kasi/database/enums/vehicle-type.enum';
import { RequestActivityType } from '@kasi/database/enums/request-activity-type.enum';
import { RequestActivityEntity } from '@kasi/database/request-activity.entity';
import { RequestEntity } from '@kasi/database/request.entity';
import {
  ACCEPTABLE_STATUSES,
  isAtOrBeyond,
  transitionOrder,
} from '@kasi/order/order-transition';
import { debtLimitError, kasimanDebtStatus } from '@kasi/order/debt-limit';
import { isWavesMode } from '@kasi/order/dispatch-config';
import { RoutingService } from '@kasi/order/routing/routing.service';
import {
  canCarryPackage,
  SharedDriverService,
} from '@kasi/order/shared-driver.service';
import { SharedOrderService } from '@kasi/order/shared-order.service';
import { DriverRedisService } from '@kasi/redis/driver-redis.service';
import { OrderRedisService } from '@kasi/redis/order-redis.service';
import { ForbiddenError } from '@nestjs/apollo';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { EntityManager, Repository } from 'typeorm';

import { UserContext } from '../auth/authenticated-user';
import { DispatchAttemptJournal } from '../dispatch/dispatch-attempt.journal';
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
    private readonly dispatchJournal: DispatchAttemptJournal,
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
        return this.cancelByDriver(orderId, driverId, update.cancelReasonId);
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
        // p2-argent I3 (2026-10-19, fiche argent §4.2) : refus au-dela du
        // plafond de dette, AVANT l'ecriture conditionnelle. Seul controle
        // qui fait foi (les filtres d'offres ne sont que des filtres).
        await this.assertNotBlockedForDebt(manager, orderId, driverId);
        await this.assertCanTake(manager, orderId, driverId);
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
    // p2-dispatch D4 (2026-10-20) : journal des sollicitations (mode waves
    // seulement ; en legacy rien n'y est ecrit). Le gagnant `accepted`, les
    // autres offres ouvertes `no_answer`. Sans effet sur l'acceptation.
    if (isWavesMode()) {
      try {
        await this.dispatchJournal.accepted(orderId, driverId);
      } catch (error) {
        Logger.warn(
          `journal de dispatch non mis a jour pour la course ${orderId} : ${(error as Error).message}`,
          'DriverOrderQueryService',
        );
      }
    }
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

  /**
   * p2-argent I3 : leve le refus lisible (message francais affiche tel quel
   * par driver-app, code `KASIMAN_DEBT_LIMIT` dans `extensions.code`) si le
   * Kasiman est au-dela du plafond dans la devise de la course. Le rejeu
   * d'une acceptation deja gagnee par ce Kasiman n'est pas refuse.
   */
  private async assertNotBlockedForDebt(
    manager: EntityManager,
    orderId: number,
    driverId: number,
  ): Promise<void> {
    const rows: Array<{ currency: string; driverId: number | null }> =
      await manager.query(
        `SELECT "currency", "driverId" FROM "request" WHERE "id" = $1`,
        [orderId],
      );
    if (rows.length === 0 || rows[0].driverId === driverId) {
      return;
    }
    const status = await kasimanDebtStatus(manager, driverId, rows[0].currency);
    if (status.blocked && status.debtLimit != null) {
      throw debtLimitError(status.balance, {
        currency: status.currency,
        debtLimit: status.debtLimit,
        debtAlertThreshold: status.debtAlertThreshold ?? status.debtLimit,
      });
    }
  }

  /**
   * p2-dispatch (banc pilote, 2026-10-20) : le Kasiman peut prendre cette
   * course. Meme regle que les offres (`getOnlineDriversWithServiceId`) :
   * service active, vehicule admis par le service, et pour une livraison
   * capacite de livraison suffisante pour le colis. Avant, la dette etait le
   * seul controle : les numeros de course se suivent, et n'importe quel
   * Kasiman pouvait accepter une course qui ne lui etait pas offerte.
   * Refus = `Already Taken`, deja affiche par les apps installees. Le
   * rejeu du gagnant n'est pas controle. Non couvert : zones d'exclusivite
   * de flotte, et en `waves`, course pas encore offerte a ce Kasiman.
   */
  private async assertCanTake(
    manager: EntityManager,
    orderId: number,
    driverId: number,
  ): Promise<void> {
    const order = await manager.getRepository(RequestEntity).findOne({
      where: { id: orderId },
      relations: { service: true },
    });
    if (order == null || order.driverId === driverId) {
      return;
    }
    const driver = await manager.getRepository(DriverEntity).findOne({
      where: { id: driverId },
      relations: { enabledServices: true },
    });
    const allowed =
      driver != null &&
      driver.enabledServices.some((s) => s.id === order.serviceId) &&
      vehicleTypeAllowed(order.service?.vehicleTypes, driver.vehicleType) &&
      (order.service?.orderType !== ServiceOrderType.Delivery ||
        canCarryPackage(driver, order.packageSize));
    if (!allowed) {
      throw new ForbiddenError(ALREADY_TAKEN);
    }
  }

  /** Annulation par le Kasiman (bug-annulation). */
  private async cancelByDriver(
    orderId: number,
    driverId: number,
    cancelReasonId?: unknown,
  ): Promise<RequestEntity> {
    // Statut, activite CanceledByDriver et remise en ligne : une transaction
    // (OrderService.cancelOrder). p3-mesures M4 : motif facultatif.
    const { changed } = await this.orderService.cancelOrder(
      orderId,
      driverId,
      cancelReasonId,
    );
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
