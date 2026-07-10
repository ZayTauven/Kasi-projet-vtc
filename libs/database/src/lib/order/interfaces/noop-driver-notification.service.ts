import { Injectable } from '@nestjs/common';
import {
  IDriverNotificationService,
} from './driver-notification.interface';

@Injectable()
export class NoOpDriverNotificationService implements IDriverNotificationService {
  async requests(drivers: any[]): Promise<void> {
    console.warn('Firebase not configured: driver notification skipped', drivers);
  }

  canceled(driver: any): void {
    console.warn('Firebase not configured: driver notification skipped', driver);
  }

  message(driver: any, msg: any): void {
    console.warn('Firebase not configured: driver notification skipped', driver, msg);
  }

  paid(driver: any): void {
    console.warn('Firebase not configured: driver notification skipped', driver);
  }

  assigned(driver: any, time: string, from: string, to: string): void {
    console.warn('Firebase not configured: driver notification skipped', driver, time, from, to);
  }

  upcomingBooking(driver: any): void {
    console.warn('Firebase not configured: driver notification skipped', driver);
  }
}
