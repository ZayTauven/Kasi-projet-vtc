import { Injectable, Logger } from '@nestjs/common';
import { OrderMessageEntity } from '@kasi/database/request-message.entity';
import { RiderEntity } from '@kasi/database/rider-entity';
import { messaging } from 'firebase-admin';
import { IRiderNotificationService } from '../interfaces/rider-notification.interface';
import { PushText, RIDER_PUSH } from './push-texts';

@Injectable()
export class FirebaseRiderNotificationService implements IRiderNotificationService {
  constructor() {}

  message(rider: RiderEntity, message: OrderMessageEntity) {
    if (rider.notificationPlayerId == null) return;
    try {
      messaging().send({
        token: rider.notificationPlayerId,
        android: {
          notification: {
            sound: 'default',
            title: RIDER_PUSH.newMessageTitle,
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
              alert: {
                title: RIDER_PUSH.newMessageTitle,
                body: message.content,
              },
            },
          },
        },
      });
    } catch (error) {}
  }

  canceled(rider: RiderEntity) {
    this.sendNotification(rider, RIDER_PUSH.canceled);
  }

  accepted(rider: RiderEntity) {
    this.sendNotification(rider, RIDER_PUSH.accepted);
  }

  bookingAssigned(rider: RiderEntity, time: string) {
    this.sendNotification(rider, RIDER_PUSH.bookingAssigned(time));
  }

  arrived(rider: RiderEntity) {
    this.sendNotification(rider, RIDER_PUSH.arrived);
  }

  started(rider: RiderEntity) {
    this.sendNotification(rider, RIDER_PUSH.started);
  }

  waitingForPostPay(rider: RiderEntity) {
    this.sendNotification(rider, RIDER_PUSH.waitingForPostPay);
  }

  finished(rider: RiderEntity) {
    this.sendNotification(rider, RIDER_PUSH.finished);
  }

  /**
   * p2-dispatch D3 (2026-10-20) : push en texte direct, sans cle de traduction
   * cote app (meme forme que la push texte du Kasiman, p2-argent I3). Sert a
   * « aucun Kasiman disponible » (Q11 de la fiche de portage du dispatch).
   */
  async plainText(rider: RiderEntity, title: string, body: string): Promise<void> {
    if (
      rider?.notificationPlayerId == null ||
      rider.notificationPlayerId.length < 5 ||
      process.env.NODE_ENV === 'dev'
    )
      return;
    try {
      await messaging().send({
        token: rider.notificationPlayerId,
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
      Logger.warn(`Push texte non envoyee au client ${rider.id} : ${(error as Error).message}`);
    }
  }

  /** Push en texte francais (bug-push-anglais) : plus de cle de traduction. */
  private sendNotification(
    rider: RiderEntity,
    text: PushText,
    sound: string = 'default',
    channelId: string = 'tripEvents',
  ) {
    if (
      rider.notificationPlayerId == null ||
      rider.notificationPlayerId.length < 5 ||
      process.env.NODE_ENV === 'dev'
    )
      return;
    const { title, body } = text;
    messaging()
      .send({
        token: rider.notificationPlayerId,
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
        webpush: {
          notification: { title, body },
        },
      })
      .catch((error) => Logger.warn(`Push non envoyee au client ${rider.id} : ${(error as Error).message}`));
  }
}
