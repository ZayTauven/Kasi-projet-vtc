export const DRIVER_NOTIFICATION_SERVICE = 'DRIVER_NOTIFICATION_SERVICE';

export interface IDriverNotificationService {
  requests(drivers: any[]): Promise<void>;
  canceled(driver: any): void;
  message(driver: any, msg: any): void;
  paid(driver: any): void;
  assigned(driver: any, time: string, from: string, to: string): void;
  upcomingBooking(driver: any): void;
}
