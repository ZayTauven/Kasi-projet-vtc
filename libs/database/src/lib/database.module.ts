import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CarColorEntity } from './entities/car-color.entity';
import { CarModelEntity } from './entities/car-model.entity';
import { ComplaintActivityEntity } from './entities/complaint-activity.entity';
import { ComplaintEntity } from './entities/complaint.entity';
import { CouponEntity } from './entities/coupon.entity';
import { DriverTransactionEntity } from './entities/driver-transaction.entity';
import { DriverWalletEntity } from './entities/driver-wallet.entity';
import { DriverEntity } from './entities/driver.entity';
import { FeedbackParameterEntity } from './entities/feedback-parameter.entity';
import { FeedbackEntity } from './entities/feedback.entity';
import { FleetTransactionEntity } from './entities/fleet-transaction.entity';
import { FleetWalletEntity } from './entities/fleet-wallet.entity';
import { FleetEntity } from './entities/fleet.entity';
import { MediaEntity } from './entities/media.entity';
import { OperatorRoleEntity } from './entities/operator-role.entity';
import { OperatorEntity } from './entities/operator.entity';
import { OrderMessageEntity } from './entities/request-message.entity';
import { RequestEntity } from './entities/request.entity';
import { PaymentGatewayEntity } from './entities/payment-gateway.entity';
import { ProviderTransactionEntity } from './entities/provider-transaction.entity';
import { ProviderWalletEntity } from './entities/provider-wallet.entity';
import { RegionEntity } from './entities/region.entity';
import { RiderAddressEntity } from './entities/rider-address.entity';
import { RiderEntity } from './entities/rider-entity';
import { RiderTransactionEntity } from './entities/rider-transaction.entity';
import { RiderWalletEntity } from './entities/rider-wallet.entity';
import { ServiceCategoryEntity } from './entities/service-category.entity';
import { ServiceEntity } from './entities/service.entity';
import { PaymentEntity } from './entities/payment.entity';
import { ServiceOptionEntity } from './entities/service-option.entity';
import { GiftCardEntity } from './entities/gift-card.entity';
import { GiftBatchEntity } from './entities/gift-batch.entity';
import { SOSEntity } from './entities/sos.entity';
import { SOSActivityEntity } from './entities/sos-activity.entity';
import { AnnouncementEntity } from './entities/announcement.entity';
import { ZonePriceEntity } from './entities/zone-price.entity';
import { GatewayToUserEntity } from './entities/gateway-to-user.entity';
import { FleetDeviceEntity } from './entities/fleet-device.entity';
import { OrderCancelReasonEntity } from './entities/order-cancel-reason.entity';
import { PayoutMethodEntity } from './entities/payout-method.entity';
import { PayoutSessionEntity } from './entities/payout-session.entity';
import { PayoutEntity } from './entities/payout.entity';
import { SmsProviderEntity } from './entities/sms-provider.entity';
import { EmailProviderEntity } from './entities/email-provider.entity';
import { CallMaskingProviderEntity } from './entities/call-masking-provider.entity';
import { ShiftRuleEntity } from './entities/shift-rule.entity';
import { RetentionPolicyEntity } from './entities/retention-policy.entity';
import { MapSettingEntity } from './entities/map-setting.entity';
import { LedgerAccountEntity } from './entities/ledger-account.entity';
import { LedgerEntryEntity } from './entities/ledger-entry.entity';
import { LedgerLineEntity } from './entities/ledger-line.entity';
import { kasiConnectionOptions, MIGRATIONS_TABLE_NAME } from './migration/connection-options';
import { kasiMigrations } from './migration/index';

/**
 * Lecture seule : signale au demarrage d'une API les migrations du code non
 * appliquees a la base (service `migrate` saute ou en echec). N'ecrit rien et
 * ne bloque pas le demarrage.
 */
async function warnOnPendingMigrations(dataSource: DataSource): Promise<void> {
  const logger = new Logger('Migrations');
  try {
    const [{ exists }] = await dataSource.query(
      `SELECT to_regclass($1) IS NOT NULL AS exists`,
      [`public.${MIGRATIONS_TABLE_NAME}`],
    );
    const applied: string[] = exists
      ? (await dataSource.query(`SELECT name FROM "${MIGRATIONS_TABLE_NAME}"`)).map(
          (row: { name: string }) => row.name,
        )
      : [];
    const pending = dataSource.migrations
      .map((m) => m.name ?? m.constructor.name)
      .filter((name) => !applied.includes(name));
    if (pending.length > 0) {
      logger.error(
        `${pending.length} migration(s) non appliquee(s) a la base : ${pending.join(', ')}. ` +
          'Lancer le service `migrate` (docker compose run --rm migrate) avant les API.',
      );
    } else {
      logger.log(`schema a jour (${applied.length} migration(s) appliquee(s))`);
    }
  } catch (error) {
    logger.error(`verification des migrations impossible : ${error}`);
  }
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        return {
          ...kasiConnectionOptions(),
          autoLoadEntities: true,
          // p1-migrations (2026-09-28) : le schema n'evolue plus que par
          // migrations, executees par le service compose `migrate` AVANT les
          // API (voir libs/database/src/lib/migration/ et
          // docs/migrations-base-de-donnees.md). `synchronize` est fige a
          // false, sans aucune variable pour le reactiver : l'ancienne regle
          // (`tables < 5 || FORCE_SYNC_DB`) et la procedure FORCE_SYNC_DB
          // sont retirees. Les API ne creent plus ni base ni extension.
          migrations: kasiMigrations,
          migrationsTableName: MIGRATIONS_TABLE_NAME,
          synchronize: false,
          migrationsRun: false,
          dropSchema: false,
          logging: true,
          // TypeORM 1.0 rejette par defaut les valeurs `undefined` dans un where
          // (auparavant tolerees silencieusement en 0.3). Plusieurs services du
          // code (ex. SharedFleetService.getFleetById appele avec un fleetId
          // absent quand aucune zone de flotte ne couvre le point) reposent
          // volontairement sur ce comportement permissif pour un "lookup optionnel".
          // On restaure le comportement 0.3 globalement plutot que de patcher
          // chaque site d'appel, pour ne pas changer le comportement fonctionnel.
          invalidWhereValuesBehavior: { undefined: 'ignore' },
        };
      },
      dataSourceFactory: async (options) => {
        const dataSource = await new DataSource(options!).initialize();
        await warnOnPendingMigrations(dataSource);
        return dataSource;
      },
    }),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class DatabaseModule {}

export const entities = [
  MediaEntity,
  OperatorEntity,
  OperatorRoleEntity,
  DriverEntity,
  ProviderTransactionEntity,
  ProviderWalletEntity,
  ComplaintActivityEntity,
  ComplaintEntity,
  CarModelEntity,
  CarColorEntity,
  DriverTransactionEntity,
  DriverWalletEntity,
  FeedbackParameterEntity,
  FeedbackEntity,
  FleetEntity,
  FleetWalletEntity,
  FleetTransactionEntity,
  FleetDeviceEntity,
  RequestEntity,
  OrderMessageEntity,
  OrderCancelReasonEntity,
  PaymentGatewayEntity,
  PaymentEntity,
  ServiceEntity,
  ServiceCategoryEntity,
  CouponEntity,
  RegionEntity,
  RiderEntity,
  RiderWalletEntity,
  RiderTransactionEntity,
  RiderAddressEntity,
  ServiceOptionEntity,
  GiftCardEntity,
  GiftBatchEntity,
  SOSEntity,
  SOSActivityEntity,
  AnnouncementEntity,
  ZonePriceEntity,
  GatewayToUserEntity,
  PayoutMethodEntity,
  PayoutSessionEntity,
  PayoutEntity,
  SmsProviderEntity,
  EmailProviderEntity,
  CallMaskingProviderEntity,
  ShiftRuleEntity,
  RetentionPolicyEntity,
  MapSettingEntity,
  // p2-argent I2 (2026-10-19) : grand livre en partie double (migration LedgerTables).
  LedgerAccountEntity,
  LedgerEntryEntity,
  LedgerLineEntity,
];
