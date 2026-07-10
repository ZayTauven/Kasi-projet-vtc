import { Injectable } from '@nestjs/common';
import {
  IRiderNotificationService,
} from './rider-notification.interface';

@Injectable()
export class NoOpRiderNotificationService implements IRiderNotificationService {
  message(rider: any, msg: any): void {
    console.warn('Firebase not configured: rider notification skipped', rider, msg);
  }

  canceled(rider: any): void {
    console.warn('Firebase not configured: rider notification skipped', rider);
  }

  accepted(rider: any): void {
    console.warn('Firebase not configured: rider notification skipped', rider);
  }

  bookingAssigned(rider: any, time: string): void {
    console.warn('Firebase not configured: rider notification skipped', rider, time);
  }

  arrived(rider: any): void {
    console.warn('Firebase not configured: rider notification skipped', rider);
  }

  started(rider: any): void {
    console.warn('Firebase not configured: rider notification skipped', rider);
  }

  waitingForPostPay(rider: any): void {
    console.warn('Firebase not configured: rider notification skipped', rider);
  }

  finished(rider: any): void {
    console.warn('Firebase not configured: rider notification skipped', rider);
  }
}
