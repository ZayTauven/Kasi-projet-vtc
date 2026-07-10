export const RIDER_NOTIFICATION_SERVICE = 'RIDER_NOTIFICATION_SERVICE';

export interface IRiderNotificationService {
  message(rider: any, msg: any): void;
  canceled(rider: any): void;
  accepted(rider: any): void;
  bookingAssigned(rider: any, time: string): void;
  arrived(rider: any): void;
  started(rider: any): void;
  waitingForPostPay(rider: any): void;
  finished(rider: any): void;
}
