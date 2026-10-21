import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { DriverEntity } from '@kasi/database/driver.entity';
import { DriverDocumentService, isoDay } from '@kasi/order/driver-document.service';
import {
  DRIVER_NOTIFICATION_SERVICE,
  IDriverNotificationService,
} from '@kasi/order/interfaces/driver-notification.interface';
import { KasimanSmsService } from '@kasi/order/kasiman-sms.service';
import { DriverRedisService } from '@kasi/redis/driver-redis.service';
import { DataSource, In } from 'typeorm';

/** Planificateur BullMQ du controle (file kasi-dispatch, une fois par heure). */
export const KYC_CHECK_SCHEDULER = 'kyc-check';
export const KYC_CHECK_PATTERN = '5 * * * *';
/** Q6 : les rappels ne partent qu'entre 8 h et 21 h (Dakar = UTC). */
export const KYC_REMINDER_FROM_HOUR = 8;
export const KYC_REMINDER_TO_HOUR = 21;

export interface KycCheckResult {
  expired: number;
  suspended: number[];
  reminded: number;
}

function frenchDate(day: string): string {
  const [y, m, d] = day.split('-');
  return `${d}/${m}/${y}`;
}

/** Textes des push (francais, sans cle de traduction : apps installees). */
export function reminderPush(title: string, expiresAt: string, daysLeft: number): { title: string; body: string } {
  const when =
    daysLeft <= 0
      ? "expire aujourd'hui"
      : `expire le ${frenchDate(expiresAt)} (dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''})`;
  return {
    title: 'Document bientôt expiré',
    body: `Votre document « ${title} » ${when}. Envoyez le nouveau dans l'application pour éviter la suspension.`,
  };
}

/**
 * p2-kyc K4 (2026-10-20) : texte du SMS, tire de la push. Les guillemets
 * francais sortent de l'alphabet GSM : ils passeraient le SMS en Unicode
 * (70 caracteres par segment au lieu de 160).
 */
export function kycSms(body: string): string {
  return `Kasi Pro : ${body.replace(/«\s?/g, '"').replace(/\s?»/g, '"')}`;
}

/** SMS envoyes seulement si KYC_SMS_ENABLED=true (desactive par defaut). */
export function kycSmsEnabled(): boolean {
  return process.env.KYC_SMS_ENABLED?.trim().toLowerCase() === 'true';
}

export function suspensionPush(titles: string): { title: string; body: string } {
  return {
    title: 'Compte suspendu',
    body: `Document expiré : ${titles}. Envoyez un document à jour depuis l'application pour reprendre les courses.`,
  };
}

/**
 * p2-kyc K1 (2026-10-20) : controle des documents (docs/fiche-kyc.md §3),
 * job `kyc-check` de la file kasi-dispatch (driver-api), chaque heure :
 * 1. documents echus passes `expired` ;
 * 2. Kasimen bloques par un document obligatoire expire suspendus
 *    (`soft reject`), retires des positions Redis, prevenus par push ;
 * 3. entre 8 h et 21 h, rappels a J-30, 14, 7, 3, 1 (une push par seuil).
 * Chaque etape est une ecriture conditionnelle : un job rejoue ne suspend ni
 * ne rappelle deux fois. Port du `kyc-expiration` de BetterSuite 5.3.2
 * (e-mail remplace par la push, documents obligatoires seulement).
 */
@Injectable()
export class KycCheckService {
  private readonly logger = new Logger(KycCheckService.name);

  constructor(
    private readonly documents: DriverDocumentService,
    private readonly driverRedis: DriverRedisService,
    private readonly dataSource: DataSource,
    @Inject(DRIVER_NOTIFICATION_SERVICE)
    private readonly notifications: IDriverNotificationService,
    // p2-kyc K4 : SMS en plus de la push (KYC_SMS_ENABLED).
    @Optional() private readonly sms?: KasimanSmsService,
  ) {}

  async run(now = new Date()): Promise<KycCheckResult> {
    const today = isoDay(now);
    const expired = await this.documents.expireDue(today);
    const suspended = await this.documents.suspendBlocked();
    if (suspended.length > 0) {
      await this.driverRedis.expire(suspended.map((x) => x.driverId));
      const drivers = await this.drivers(suspended.map((x) => x.driverId));
      for (const { driverId, titles } of suspended) {
        const push = suspensionPush(titles);
        await this.send(drivers.get(driverId), push.title, push.body);
      }
    }
    let reminded = 0;
    const hour = now.getUTCHours();
    if (hour >= KYC_REMINDER_FROM_HOUR && hour < KYC_REMINDER_TO_HOUR) {
      const due = await this.documents.claimReminders(today);
      const drivers = await this.drivers(due.map((x) => x.driverId));
      for (const reminder of due) {
        const push = reminderPush(reminder.title, reminder.expiresAt, reminder.daysLeft);
        await this.send(drivers.get(reminder.driverId), push.title, push.body);
      }
      reminded = due.length;
    }
    if (expired + suspended.length + reminded > 0) {
      this.logger.log(
        `Controle KYC : ${expired} document(s) expire(s), ${suspended.length} Kasiman(s) suspendu(s), ` +
          `${reminded} rappel(s).`,
      );
    }
    return { expired, suspended: suspended.map((x) => x.driverId), reminded };
  }

  private async drivers(ids: number[]): Promise<Map<number, DriverEntity>> {
    if (ids.length === 0) return new Map();
    const found = await this.dataSource.getRepository(DriverEntity).find({ where: { id: In(ids) } });
    return new Map(found.map((x) => [x.id, x]));
  }

  private async send(driver: DriverEntity | undefined, title: string, body: string): Promise<void> {
    if (driver == null) return;
    try {
      await this.notifications.plainText(driver, title, body);
    } catch (error) {
      this.logger.warn(`Push KYC non envoyee au Kasiman ${driver.id} : ${(error as Error).message}`);
    }
    // p2-kyc K4 : meme message par SMS (app desinstallee, notifications
    // coupees). Les heures de rappel (8 h - 21 h) valent pour les deux.
    if (this.sms != null && kycSmsEnabled()) {
      await this.sms.send(driver.mobileNumber, kycSms(body));
    }
  }
}
