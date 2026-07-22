import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { DriverStatus } from '@kasi/database/enums/driver-status.enum';
import { OrderStatus } from '@kasi/database/enums/order-status.enum';
import { ShiftRuleEntity } from '@kasi/database/shift-rule.entity';
import { ShiftRuleFrequency } from '@kasi/database/enums/shift-rule-frequency.enum';
import {
  DRIVER_NOTIFICATION_SERVICE,
  IDriverNotificationService,
} from '@kasi/order/interfaces/driver-notification.interface';
import { DriverRedisService } from '@kasi/redis/driver-redis.service';
import { OrderRedisService } from '@kasi/redis/order-redis.service';
import { InjectRedis } from '@songkeys/nestjs-redis';

import { DriverService } from '../driver/driver.service';
import { OrderService } from './order.service';
import { Redis } from 'ioredis';
import { SharedDriverService } from '@kasi/order/shared-driver.service';
import { Between, In, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { SharedFleetService } from '@kasi/order/shared-fleet.service';

@Injectable()
export class CronJobService {
    constructor(
        private orderService: OrderService,
        private driverService: DriverService,
        @InjectRedis() private readonly redisService: Redis,
        private driverRedisService: DriverRedisService,
        private orderRedisService: OrderRedisService,
        @Inject(DRIVER_NOTIFICATION_SERVICE) private readonly driverNotificationService: IDriverNotificationService,
        private sharedDriverService: SharedDriverService,
        private sharedFleetService: SharedFleetService,
        @InjectRepository(ShiftRuleEntity) private shiftRuleRepository: Repository<ShiftRuleEntity>
    ) {}

    @Interval(300_000)
    async cronTask() {
        const logger = new Logger(CronJobService.name);
        logger.debug('Running expiration validation cron task.');
        const ts = Math.round(new Date().getTime());
        // Driver Locations Expire Time If Not Updated, 60 Minutes By Default
        const tsDriverMaxTime = ts - (60 * 60000);
        // Requests Expire Time, 10 Minutes By Default
        const expirationMinutes = parseInt(process.env.REQUEST_EXPIRATION ?? '10');
        const tsRequestMaxTime = ts - (expirationMinutes * 60000);
        const expiredDrivers: number[] = (await this.redisService.zrangebyscore('driver-location-time', 0, tsDriverMaxTime)).map(str => parseInt(str));
        const expiredRequests: number[] = (await this.redisService.zrangebyscore('request-time', 0, tsRequestMaxTime)).map(str => parseInt(str));

        // Expiring drivers locations with outdated location
        if(expiredDrivers.length > 0 && process.env.DRIVERS_ALWAYS_ON == null) {
            const drivers = (await this.driverService.findByIds(expiredDrivers)).filter(driver => driver.status != DriverStatus.InService).map(driver => driver.id);
            this.driverService.expireDriverStatus(drivers);
        }
        // Expiring requests with expired timestamp (10 minutes ago by default)
        if(expiredRequests.length > 0) {
            this.orderService.expireOrders(expiredRequests);
        }

        // Notifying drivers of an unaccepted orders
        const waitingMinTime = ts - (10 * 60000);
        const waitingMaxTime = ts + (30 * 60000);
        const waitingRequestIds = (await this.orderRedisService.getRequestIdsInTimeRage(waitingMinTime, waitingMaxTime)).map(id => parseInt(id));
        for (const waitingRequest of waitingRequestIds) {
            const driversNotified = await this.orderRedisService.getDriversNotified(waitingRequest);
            const requestLocation = await this.redisService.geopos('request', waitingRequest.toString());
            let closeDrivers = await this.driverRedisService.getClose({lat: parseFloat(requestLocation[0][1]), lng: parseFloat(requestLocation[0][0])},10000);
            closeDrivers = closeDrivers.filter(x => {
                return !(driversNotified.includes(x.driverId));
            });
            if(closeDrivers.length > 0) {
                let driverIds = closeDrivers.map(x=>x.driverId);
                const order = await this.orderService.orderRepository.findOneBy({id: waitingRequest});
                const fleetIds = await this.sharedFleetService.getFleetIdsInPoint(order.points[0]);
                const drivers = await this.sharedDriverService.getOnlineDriversWithServiceId(driverIds, order.serviceId, fleetIds);
                this.driverNotificationService.requests(drivers);
            }
        }

        // Notifiying driver on upcoming booking orders
        const expectedTimestampFrom = ts - (15 * 60000);
        const expectedTimestampTo = ts - (10 * 60000);
        const expectedTimestampFromDate = new Date(expectedTimestampFrom);
        const expectedTimestampToDate = new Date(expectedTimestampTo);
        const drivers = (await this.orderService.orderRepository.find({where: {expectedTimestamp: Between(expectedTimestampFromDate, expectedTimestampToDate) as any, driverId: Not(IsNull()) }, relations: { driver: true }})).map(order => order.driver);
        for(const driver of drivers) {
            //this.driverNotificationService.upcomingBooking(driver);
        }

        // P6.3 Shift Rules — avertissement SOFT non bloquant (jamais d'offline forcé).
        await this.enforceShiftRulesSoft();
    }

    /**
     * P6.3 Shift Rules — enforcement SOFT (strictement non bloquant).
     *
     * Objectif : avertir les Kasimen qui dépassent le temps de travail
     * configuré (`maxHoursPerPeriod` sur la période `frequency`), SANS jamais
     * les mettre hors-ligne. `enforced === true` est prévu pour un durcissement
     * FUTUR : dans CE lot il reste non bloquant (aucune écriture d'offline).
     *
     * Estimation prudente : en l'absence d'une table de suivi du temps en ligne
     * cumulé (non créée dans ce lot), on approxime le temps de travail par la
     * somme des durées de courses TERMINÉES (finishTimestamp - startTimestamp)
     * du Kasiman sur la période. Cette approximation SOUS-ESTIME le temps réel
     * passé en ligne (le temps d'attente idle n'est pas compté) : elle ne peut
     * donc pas sur-avertir. Le caractère approximatif est loggé explicitement.
     */
    private async enforceShiftRulesSoft(): Promise<void> {
        const logger = new Logger(CronJobService.name);
        try {
            const rules = await this.shiftRuleRepository.find({ where: { enabled: true } });
            if (rules.length === 0) {
                return;
            }

            const now = Date.now();
            // Kasimen "actifs/en ligne" = ceux ayant une localisation récente
            // (fenêtre de 60 min, cohérente avec l'expiration de localisation ci-dessus).
            const onlineWindowStart = now - (60 * 60000);
            const onlineDriverIds: number[] = (
                await this.redisService.zrangebyscore('driver-location-time', onlineWindowStart, '+inf')
            ).map(str => parseInt(str)).filter(id => !isNaN(id));

            if (onlineDriverIds.length === 0) {
                return;
            }

            for (const rule of rules) {
                const maxMs = (rule.maxHoursPerPeriod ?? 0) * 60 * 60000;
                if (maxMs <= 0) {
                    continue;
                }

                // Daily = depuis minuit aujourd'hui ; Weekly = 7 derniers jours.
                const periodStart =
                    rule.frequency === ShiftRuleFrequency.Weekly
                        ? new Date(now - (7 * 24 * 60 * 60000))
                        : new Date(new Date().setHours(0, 0, 0, 0));

                // Approximation prudente : courses terminées du Kasiman sur la période.
                const orders = await this.orderService.orderRepository.find({
                    where: {
                        driverId: In(onlineDriverIds),
                        status: OrderStatus.Finished,
                        finishTimestamp: MoreThanOrEqual(periodStart) as any,
                    },
                    relations: { driver: true },
                });

                const workedMsByDriver = new Map<number, number>();
                const driverById = new Map<number, any>();
                for (const order of orders) {
                    if (order.driverId == null || order.startTimestamp == null || order.finishTimestamp == null) {
                        continue;
                    }
                    const duration = order.finishTimestamp.getTime() - order.startTimestamp.getTime();
                    if (duration <= 0) {
                        continue;
                    }
                    workedMsByDriver.set(order.driverId, (workedMsByDriver.get(order.driverId) ?? 0) + duration);
                    if (order.driver != null) {
                        driverById.set(order.driverId, order.driver);
                    }
                }

                for (const [driverId, workedMs] of workedMsByDriver) {
                    if (workedMs <= maxMs) {
                        continue;
                    }

                    const workedHours = (workedMs / 3600000).toFixed(1);
                    logger.warn(
                        `[ShiftRule#${rule.id}] Kasiman ${driverId} dépasse le temps de travail estimé ` +
                        `(~${workedHours}h >= ${rule.maxHoursPerPeriod}h / ${rule.frequency}). ` +
                        `Estimation prudente basée sur les courses terminées (sous-estime le temps en ligne réel). ` +
                        `Action : avertissement SOFT uniquement, aucun passage hors-ligne.`
                    );

                    if (rule.enforced === true) {
                        // TODO P6+: enforcement dur ici (ex: throttle des nouvelles requêtes).
                        // Pour CE lot on reste STRICTEMENT non bloquant : aucun offline.
                        logger.warn(
                            `[ShiftRule#${rule.id}] enforced=true pour Kasiman ${driverId}, ` +
                            `mais l'enforcement dur n'est pas activé dans ce lot (comportement non bloquant conservé).`
                        );
                    }

                    // Canal driver EXISTANT : notification informative best-effort.
                    try {
                        const driver = driverById.get(driverId);
                        if (driver != null) {
                            const breakHint = (rule.mandatoryBreakMinutes ?? 0) > 0
                                ? ` Pensez à faire une pause d'au moins ${rule.mandatoryBreakMinutes} min.`
                                : '';
                            this.driverNotificationService.message(driver, {
                                content: `Vous atteignez la limite de temps de travail configurée (${rule.maxHoursPerPeriod}h).${breakHint}`,
                            } as any);
                        }
                    } catch (notifyError) {
                        logger.warn(`[ShiftRule] Notification informative échouée pour Kasiman ${driverId}: ${notifyError}`);
                    }
                }
            }
        } catch (error) {
            // Défensif : ne jamais casser le reste du cron.
            logger.warn(`[ShiftRule] Évaluation SOFT échouée, ignorée sans impact sur le cron: ${error}`);
        }
    }
}