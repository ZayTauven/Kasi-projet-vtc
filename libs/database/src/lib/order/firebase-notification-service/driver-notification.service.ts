import { Injectable, Logger } from '@nestjs/common';
import { DriverEntity } from '../../entities/driver.entity';
import { OrderMessageEntity } from '../../entities/request-message.entity';
import { messaging } from 'firebase-admin';
import { IDriverNotificationService } from '../interfaces/driver-notification.interface';
import { DRIVER_PUSH } from './push-texts';

@Injectable()
export class FirebaseDriverNotificationService implements IDriverNotificationService {
  constructor() {}

  async requests(driver: DriverEntity[]) {
    const tokens: string[] = driver
      .filter((_driver) => (_driver.notificationPlayerId?.length ?? 0) > 0)
      .map((x) => x.notificationPlayerId) as unknown as string[];
    if (tokens.length < 1) return;
    // p1-sentry (hygiene des journaux) : le nombre d'appareils, pas leurs jetons.
    Logger.log(`Sending notification to ${tokens.length} device(s)`);
    try {
      const notificationResult = await messaging().sendMulticast({
        tokens: tokens,
        android: {
          notification: {
            sound: 'default',
            title: DRIVER_PUSH.newRequest.title,
            body: DRIVER_PUSH.newRequest.body,
            channelId: 'request',
            icon: 'notification_icon',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: {
                critical: true,
                name: process.env.REQUEST_SOUND ?? 'default',
                volume: 1.0,
              },
              badge: 1,
              contentAvailable: true,
              alert: {
                title: DRIVER_PUSH.newRequest.title,
                body: DRIVER_PUSH.newRequest.body,
              },
            },
          },
        },
      });
      Logger.log(notificationResult);
    } catch (error) {
      Logger.error(error);
    }
  }

  canceled(driver: DriverEntity) {
    this.sendNotification(driver, DRIVER_PUSH.canceled.title, DRIVER_PUSH.canceled.body);
  }

  message(driver: DriverEntity, message: OrderMessageEntity) {
    if (driver.notificationPlayerId == null) return;
    try {
      messaging().send({
        token: driver.notificationPlayerId,
        android: {
          notification: {
            sound: 'default',
            title: DRIVER_PUSH.newMessageTitle,
            body: message.content,
            channelId: 'message',
            icon: 'notification_icon',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
              alert: {
                title: DRIVER_PUSH.newMessageTitle,
                body: message.content,
              },
            },
          },
        },
      });
    } catch (error) {}
  }

  paid(driver: DriverEntity) {
    this.sendNotification(driver, DRIVER_PUSH.paid.title, DRIVER_PUSH.paid.body);
  }

  assigned(driver: DriverEntity, time: string, from: string, to: string) {
    const text = DRIVER_PUSH.assigned(time, from, to);
    this.sendNotification(driver, text.title, text.body);
  }

  upcomingBooking(driver: DriverEntity) {
    this.sendNotification(driver, DRIVER_PUSH.upcomingBooking.title, DRIVER_PUSH.upcomingBooking.body);
  }

  /**
   * p2-argent I3 (2026-10-19) : push en texte direct (`title` / `body`), comme
   * la push de message : alerte au seuil et blocage de dette (fiche argent
   * §4.2). Canal `tripEvents`, deja declare par driver-app.
   */
  async plainText(driver: DriverEntity, title: string, body: string): Promise<void> {
    if (driver?.notificationPlayerId == null || process.env['NODE_ENV'] === 'dev') return;
    try {
      await messaging().send({
        token: driver.notificationPlayerId,
        notification: { title, body },
        android: {
          notification: {
            sound: 'default',
            title,
            body,
            channelId: 'tripEvents',
            icon: 'notification_icon',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              alert: { title, body },
            },
          },
        },
      });
    } catch (error) {
      Logger.warn(`Push texte non envoyee au Kasiman ${driver.id} : ${(error as Error).message}`);
    }
  }

  /** Push en texte francais (bug-push-anglais) : plus de cle de traduction. */
  private sendNotification(
    driver: DriverEntity,
    title: string,
    body: string,
    sound: string = 'default',
    channelId: string = 'tripEvents',
  ) {
    if (
      driver.notificationPlayerId == null ||
      process.env['NODE_ENV'] === 'dev'
    )
      return;
    messaging()
      .send({
        token: driver.notificationPlayerId,
        notification: { title, body },
        android: {
          notification: {
            sound,
            title,
            body,
            channelId,
            icon: 'notification_icon',
          },
        },
        apns: {
          payload: {
            aps: {
              sound,
              alert: { title, body },
            },
          },
        },
      })
      .catch((error) => Logger.warn(`Push non envoyee au Kasiman ${driver.id} : ${(error as Error).message}`));
  }
}
