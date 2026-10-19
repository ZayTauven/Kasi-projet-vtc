export const DRIVER_NOTIFICATION_SERVICE = 'DRIVER_NOTIFICATION_SERVICE';

export interface IDriverNotificationService {
  requests(drivers: any[]): Promise<void>;
  canceled(driver: any): void;
  message(driver: any, msg: any): void;
  paid(driver: any): void;
  assigned(driver: any, time: string, from: string, to: string): void;
  upcomingBooking(driver: any): void;
  /**
   * p2-argent I3 (2026-10-19) : push en texte direct (titre et corps deja
   * rediges en francais). Les apps installees ne connaissent aucune cle de
   * traduction nouvelle (fiche argent §4.2) : alerte et blocage de dette.
   */
  plainText(driver: any, title: string, body: string): Promise<void>;
}
