/**
 * Migration de reference (p1-migrations) : schema de PRODUCTION au 2026-09-28,
 * commit deploye 8cbe512 (59 tables, 52 types enum, extension PostGIS).
 *
 * Generee par `migration:generate` contre une base vide a partir des 50
 * entites (allEntities), puis comparee au `pg_dump --schema-only` de la
 * production : 0 ecart (voir docs/migrations-base-de-donnees.md).
 *
 * - Base NEUVE (staging, poste neuf, tests) : executee par `migrate.js run`.
 * - Base DEJA PEUPLEE (production, base locale de demo) : jamais executee,
 *   seulement ENREGISTREE par `migrate.js mark-baseline`.
 *
 * NE JAMAIS MODIFIER ce fichier : toute evolution passe par une nouvelle
 * migration. Le nom `Baseline1790629154960` est la cle enregistree en base.
 */
import { MigrationInterface, QueryRunner } from "typeorm";

export class Baseline1790629154960 implements MigrationInterface {
    name = 'Baseline1790629154960'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Types geometry(Point|Polygon|MultiPoint, 4326). Deja presente en production.
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
        await queryRunner.query(`
            CREATE TABLE "car" (
                "id" SERIAL NOT NULL,
                "title" character varying NOT NULL,
                CONSTRAINT "PK_55bbdeb14e0b1d7ab417d11ee6d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."promotion_usertype_enum" AS ENUM('Driver', 'Rider', 'Operator')
        `);
        await queryRunner.query(`
            CREATE TABLE "promotion" (
                "id" SERIAL NOT NULL,
                "userType" "public"."promotion_usertype_enum" array NOT NULL DEFAULT '{Rider}',
                "startTimestamp" TIMESTAMP NOT NULL,
                "expirationTimestamp" TIMESTAMP NOT NULL,
                "title" character varying NOT NULL,
                "url" character varying,
                "description" character varying NOT NULL,
                "mediaId" integer,
                CONSTRAINT "REL_5de52c7f8e5ba20f85f2881909" UNIQUE ("mediaId"),
                CONSTRAINT "PK_fab3630e0789a2002f1cadb7d38" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "gift_batch" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "currency" character varying(3) NOT NULL,
                "amount" numeric(10, 2) NOT NULL,
                "quantity" integer NOT NULL,
                "availableTimestamp" TIMESTAMP,
                "expirationTimestamp" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3fde87dd760bcad48df7d54e82a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "gift_card" (
                "id" SERIAL NOT NULL,
                "code" character varying NOT NULL,
                "currency" character varying(3) NOT NULL,
                "amount" numeric(10, 2) NOT NULL,
                "isUsed" boolean NOT NULL,
                "availableTimestamp" TIMESTAMP NOT NULL,
                "expirationTimestamp" TIMESTAMP NOT NULL,
                "batchId" integer,
                CONSTRAINT "PK_af4e338d2d41035042843ad641f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."rider_transaction_status_enum" AS ENUM('Processing', 'Done', 'Canceled', 'Rejected')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."rider_transaction_action_enum" AS ENUM('Recharge', 'Deduct')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."rider_transaction_deducttype_enum" AS ENUM('OrderFee', 'Withdraw', 'Correction')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."rider_transaction_rechargetype_enum" AS ENUM(
                'BankTransfer',
                'Gift',
                'Correction',
                'InAppPayment'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "rider_transaction" (
                "id" SERIAL NOT NULL,
                "transactionTime" TIMESTAMP NOT NULL DEFAULT now(),
                "status" "public"."rider_transaction_status_enum" NOT NULL DEFAULT 'Processing',
                "action" "public"."rider_transaction_action_enum" NOT NULL,
                "deductType" "public"."rider_transaction_deducttype_enum",
                "rechargeType" "public"."rider_transaction_rechargetype_enum",
                "amount" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "currency" character(3) NOT NULL,
                "documentNumber" character varying,
                "details" character varying,
                "riderId" integer NOT NULL,
                "paymentGatewayId" integer,
                "operatorId" integer,
                "giftCardId" integer,
                "requestId" integer,
                CONSTRAINT "REL_f7a678c7049ddb14c0caad5783" UNIQUE ("giftCardId"),
                CONSTRAINT "PK_b520e2e36bdb4e9d812788528c2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."admin_transaction_action_enum" AS ENUM('Recharge', 'Deduct')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."admin_transaction_deducttype_enum" AS ENUM('Withdraw')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."admin_transaction_rechargetype_enum" AS ENUM('Commission')
        `);
        await queryRunner.query(`
            CREATE TABLE "admin_transaction" (
                "id" SERIAL NOT NULL,
                "transactionTime" TIMESTAMP NOT NULL DEFAULT now(),
                "action" "public"."admin_transaction_action_enum" NOT NULL,
                "deductType" "public"."admin_transaction_deducttype_enum",
                "rechargeType" "public"."admin_transaction_rechargetype_enum",
                "amount" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "currency" character(3) NOT NULL,
                "documentNumber" character varying,
                "details" character varying,
                "operatorId" integer,
                "requestId" integer,
                "paymentGatewayId" integer,
                CONSTRAINT "PK_8616b7c7261919123e241b711fc" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "gateway_to_user" (
                "id" SERIAL NOT NULL,
                "gatewayId" integer NOT NULL,
                "internalUserId" character varying NOT NULL,
                "externalReferenceNumber" character varying NOT NULL,
                CONSTRAINT "PK_0703ac8ca8dc2b78a57816fe0e5" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e9069d8e66cfa097605f908e81" ON "gateway_to_user" ("internalUserId")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."payment_gateway_type_enum" AS ENUM(
                'stripe',
                'braintree',
                'paypal',
                'paytm',
                'razorpay',
                'paystack',
                'payu',
                'instamojo',
                'flutterwave',
                'paygate',
                'mips',
                'mercadopago',
                'amazon',
                'mytmoney',
                'wayforpay',
                'MyFatoorah',
                'SberBank',
                'BinancePay',
                'OpenPix',
                'link'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "payment_gateway" (
                "id" SERIAL NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "title" character varying NOT NULL,
                "type" "public"."payment_gateway_type_enum" NOT NULL,
                "publicKey" text,
                "privateKey" text NOT NULL,
                "saltKey" text,
                "merchantId" text,
                "deletedAt" TIMESTAMP,
                "mediaId" integer,
                CONSTRAINT "REL_897f64218b621b1072a19280a7" UNIQUE ("mediaId"),
                CONSTRAINT "PK_8cd60dcc29059b7a42ea42b0eda" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "region" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "currency" character(3) NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "location" geometry(Polygon, 4326) NOT NULL,
                CONSTRAINT "PK_5f48ffc3af96bc486f5f3f3a6da" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "service_category" (
                "id" SERIAL NOT NULL,
                "title" character varying NOT NULL,
                "deletedAt" TIMESTAMP,
                CONSTRAINT "PK_9d513b39d251063f98f2a7b941d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."service_option_type_enum" AS ENUM('Free', 'Paid', 'TwoWay')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."service_option_icon_enum" AS ENUM(
                'Pet',
                'TwoWay',
                'Luggage',
                'PackageDelivery',
                'Shopping',
                'Custom1',
                'Custom2',
                'Custom3',
                'Custom4',
                'Custom5'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "service_option" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "type" "public"."service_option_type_enum" NOT NULL,
                "additionalFee" numeric(12, 2),
                "icon" "public"."service_option_icon_enum" NOT NULL,
                CONSTRAINT "PK_70d8bf485defd38a96799f31a97" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."fleet_device_deviceplatform_enum" AS ENUM(
                'ANDROID',
                'IOS',
                'WEB',
                'MACOS',
                'WINDOWS',
                'LINUX'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "fleet_device" (
                "id" SERIAL NOT NULL,
                "devicePlatform" "public"."fleet_device_deviceplatform_enum",
                "deviceName" character varying NOT NULL,
                "ipAddress" character varying NOT NULL,
                "jwt" character varying NOT NULL,
                "lastSeenAt" TIMESTAMP NOT NULL DEFAULT now(),
                "isTerminated" boolean NOT NULL DEFAULT false,
                "fleetId" integer NOT NULL,
                CONSTRAINT "PK_2750f48686419ed1c055682e5d2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."fleet_transaction_action_enum" AS ENUM('Recharge', 'Deduct')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."fleet_transaction_deducttype_enum" AS ENUM('Withdraw')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."fleet_transaction_rechargetype_enum" AS ENUM('Commission')
        `);
        await queryRunner.query(`
            CREATE TABLE "fleet_transaction" (
                "id" SERIAL NOT NULL,
                "transactionTime" TIMESTAMP NOT NULL DEFAULT now(),
                "action" "public"."fleet_transaction_action_enum" NOT NULL,
                "deductType" "public"."fleet_transaction_deducttype_enum",
                "rechargeType" "public"."fleet_transaction_rechargetype_enum",
                "amount" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "currency" character(3) NOT NULL,
                "documentNumber" character varying,
                "details" character varying,
                "requestId" integer,
                "driverId" integer,
                "fleetId" integer NOT NULL,
                "operatorId" integer,
                CONSTRAINT "PK_b71909633dbb4d6b0f5d5a50397" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "fleet_wallet" (
                "id" SERIAL NOT NULL,
                "amount" double precision NOT NULL DEFAULT '0',
                "currency" character varying NOT NULL,
                "fleetId" integer NOT NULL,
                CONSTRAINT "PK_80c950b9f55e7e576dd2adb24ef" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "fleet" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "phoneNumber" bigint NOT NULL,
                "accountNumber" character varying NOT NULL,
                "mobileNumber" bigint NOT NULL,
                "commissionSharePercent" smallint NOT NULL DEFAULT '0',
                "commissionShareFlat" double precision NOT NULL DEFAULT '0',
                "address" character varying,
                "userName" character varying,
                "password" character varying,
                "feeMultiplier" numeric(10, 2),
                "exclusivityAreas" geometry(Polygon, 4326),
                CONSTRAINT "PK_17e0760d2492f67c67ce0fe4aa7" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "zone_price" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "from" geometry(Polygon, 4326) NOT NULL,
                "to" geometry(Polygon, 4326) NOT NULL,
                "cost" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "timeMultipliers" text,
                CONSTRAINT "PK_2a1e6d4b110da215a579796a7e1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."service_paymentmethod_enum" AS ENUM('CashCredit', 'OnlyCredit', 'OnlyCash')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."service_ordertype_enum" AS ENUM('Ride', 'Delivery')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."service_distancefeemode_enum" AS ENUM('None', 'PickupToDestination', 'Radial')
        `);
        await queryRunner.query(`
            CREATE TABLE "service" (
                "id" SERIAL NOT NULL,
                "categoryId" integer NOT NULL,
                "title" character varying NOT NULL,
                "description" character varying,
                "personCapacity" smallint,
                "baseFare" numeric(12, 2) NOT NULL DEFAULT '0.00',
                "perHundredMeters" numeric(12, 2) NOT NULL DEFAULT '0.00',
                "perMinuteDrive" numeric(12, 2) NOT NULL DEFAULT '0.00',
                "perMinuteWait" numeric(12, 2) NOT NULL DEFAULT '0.00',
                "minimumFee" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "searchRadius" integer NOT NULL DEFAULT '10000',
                "paymentMethod" "public"."service_paymentmethod_enum" NOT NULL DEFAULT 'CashCredit',
                "distanceFeeMode" "public"."service_distancefeemode_enum" NOT NULL DEFAULT 'PickupToDestination',
                "availableTimeFrom" TIME NOT NULL DEFAULT '00:00',
                "availableTimeTo" TIME NOT NULL DEFAULT '23:59',
                "maxDestinationDistance" integer NOT NULL DEFAULT '0',
                "prepayPercent" smallint NOT NULL DEFAULT '0',
                "twoWayAvailable" boolean NOT NULL DEFAULT false,
                "cancellationTotalFee" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "cancellationDriverShare" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "providerSharePercent" smallint NOT NULL DEFAULT '0',
                "providerShareFlat" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "roundingFactor" numeric(10, 2),
                "mediaId" integer NOT NULL,
                "timeMultipliers" text,
                "distanceMultipliers" text,
                "dateRangeMultipliers" text,
                "weekdayMultipliers" text,
                "deletedAt" TIMESTAMP,
                "touristMultiplier" double precision NOT NULL DEFAULT '1',
                -- Ordre physique aligne sur la production (colonne ajoutee apres coup).
                "orderType" "public"."service_ordertype_enum" NOT NULL DEFAULT 'Ride',
                CONSTRAINT "REL_8fc7040cc10d7b34cc749d18b6" UNIQUE ("mediaId"),
                CONSTRAINT "PK_85a21558c006647cd76fdce044b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "media" (
                "id" SERIAL NOT NULL,
                "address" character varying NOT NULL,
                "base64" text,
                "driverDocumentId" integer,
                CONSTRAINT "PK_f4e0fcac36e050de337b670d8bd" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."rider_address_type_enum" AS ENUM(
                'Home',
                'Work',
                'Partner',
                'Gym',
                'Parent',
                'Cafe',
                'Park',
                'Other'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "rider_address" (
                "id" SERIAL NOT NULL,
                "type" "public"."rider_address_type_enum" NOT NULL DEFAULT 'Other',
                "title" character varying NOT NULL,
                "address" character varying,
                "location" geometry(Point, 4326) NOT NULL,
                "riderId" integer NOT NULL,
                CONSTRAINT "PK_fba4b6205b8f8df72bb8c25fe49" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "rider_wallet" (
                "id" SERIAL NOT NULL,
                "amount" double precision NOT NULL DEFAULT '0',
                "currency" character(3) NOT NULL,
                "riderId" integer NOT NULL,
                CONSTRAINT "PK_809fe8b1b9e556759e67f02d169" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."rider_status_enum" AS ENUM('enabled', 'blocked')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."rider_gender_enum" AS ENUM('male', 'female', 'unknown')
        `);
        await queryRunner.query(`
            CREATE TABLE "rider" (
                "id" SERIAL NOT NULL,
                "status" "public"."rider_status_enum" NOT NULL DEFAULT 'enabled',
                "firstName" character varying,
                "lastName" character varying,
                "mobileNumber" bigint NOT NULL,
                "registrationTimestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "email" character varying,
                "gender" "public"."rider_gender_enum",
                "address" character varying,
                "isResident" boolean,
                "idNumber" character varying,
                "documentType" character varying,
                "notificationPlayerId" character varying,
                "deletedAt" TIMESTAMP,
                "mediaId" integer,
                CONSTRAINT "UQ_95d70b9bf30b239065c6c670fac" UNIQUE ("mobileNumber"),
                CONSTRAINT "REL_41d8263064e9cc18cdbbb1df6f" UNIQUE ("mediaId"),
                CONSTRAINT "PK_1ed6540e613592e2a470a162ef1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "coupon" (
                "id" SERIAL NOT NULL,
                "code" character varying NOT NULL,
                "title" character varying NOT NULL,
                "description" character varying,
                "manyUsersCanUse" integer NOT NULL DEFAULT '0',
                "manyTimesUserCanUse" integer NOT NULL DEFAULT '1',
                "minimumCost" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "maximumCost" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "startTimestamp" TIMESTAMP NOT NULL,
                "expirationTimestamp" TIMESTAMP,
                "discountPercent" smallint NOT NULL DEFAULT '0',
                "discountFlat" numeric(10, 2) NOT NULL DEFAULT '0',
                "creditGift" numeric(10, 2) NOT NULL DEFAULT '0',
                "isEnabled" boolean NOT NULL DEFAULT true,
                "isFirstTravelOnly" boolean NOT NULL DEFAULT false,
                CONSTRAINT "UQ_62d3c5b0ce63a82c48e86d904bc" UNIQUE ("code"),
                CONSTRAINT "PK_fcbe9d72b60eed35f46dc35a682" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "review_parameter" (
                "id" SERIAL NOT NULL,
                "title" character varying NOT NULL,
                "isGood" boolean NOT NULL,
                CONSTRAINT "PK_8bebfbe623a228a95cea3bcdcf6" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "request_review" (
                "id" SERIAL NOT NULL,
                "reviewTimestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "score" smallint NOT NULL,
                "review" character varying,
                "driverId" integer NOT NULL,
                "requestId" integer,
                CONSTRAINT "REL_1217dda9665e24ab5cf176a94a" UNIQUE ("requestId"),
                CONSTRAINT "PK_3b842c0be5547a8dc83787a7e91" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."request_chat_state_enum" AS ENUM('sent', 'delivered', 'seen')
        `);
        await queryRunner.query(`
            CREATE TABLE "request_chat" (
                "id" SERIAL NOT NULL,
                "sentAt" TIMESTAMP NOT NULL DEFAULT now(),
                "sentByDriver" boolean NOT NULL,
                "state" "public"."request_chat_state_enum" NOT NULL DEFAULT 'sent',
                "content" character varying NOT NULL,
                "requestId" integer NOT NULL,
                CONSTRAINT "PK_71a23b0948f86daf42ffdcd7980" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."request_activity_type_enum" AS ENUM(
                'RequestedByOperator',
                'BookedByOperator',
                'RequestedByRider',
                'BookedByRider',
                'DriverAccepted',
                'ArrivedToPickupPoint',
                'CanceledByDriver',
                'CanceledByRider',
                'CanceledByOperator',
                'Started',
                'ArrivedToDestination',
                'Paid',
                'Reviewed',
                'Expired'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "request_activity" (
                "id" SERIAL NOT NULL,
                "type" "public"."request_activity_type_enum" NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "requestId" integer NOT NULL,
                CONSTRAINT "PK_aa4908b6cb3eabe8de0c5b79a48" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."sos_activity_action_enum" AS ENUM(
                'Submitted',
                'Seen',
                'ContactDriver',
                'ContactAuthorities',
                'MarkedAsResolved',
                'MarkedAsFalseAlarm'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "sos_activity" (
                "id" SERIAL NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "action" "public"."sos_activity_action_enum" NOT NULL,
                "note" character varying(2000) NOT NULL,
                "operatorId" integer,
                "sosId" integer NOT NULL,
                CONSTRAINT "PK_30b0594574f5deeb380dc38bf62" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."sos_status_enum" AS ENUM(
                'Submitted',
                'UnderReview',
                'FalseAlarm',
                'Resolved'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "sos" (
                "id" SERIAL NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "status" "public"."sos_status_enum" NOT NULL DEFAULT 'Submitted',
                "location" geometry(Point, 4326),
                "requestId" integer NOT NULL,
                "submittedByRider" boolean NOT NULL,
                CONSTRAINT "PK_eb329f400ba735af187e98faec6" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."order_cancel_reason_usertype_enum" AS ENUM('Driver', 'Rider', 'Operator')
        `);
        await queryRunner.query(`
            CREATE TABLE "order_cancel_reason" (
                "id" SERIAL NOT NULL,
                "title" character varying NOT NULL,
                "isEnabled" boolean NOT NULL DEFAULT true,
                "userType" "public"."order_cancel_reason_usertype_enum" NOT NULL DEFAULT 'Rider',
                CONSTRAINT "PK_96536ac6ca78d4c4203fa3f426d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."request_status_enum" AS ENUM(
                'Requested',
                'NotFound',
                'NoCloseFound',
                'Found',
                'DriverAccepted',
                'Arrived',
                'WaitingForPrePay',
                'DriverCanceled',
                'RiderCanceled',
                'Started',
                'WaitingForPostPay',
                'WaitingForReview',
                'Finished',
                'Booked',
                'Expired'
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."request_packagesize_enum" AS ENUM('Small', 'Medium', 'Large')
        `);
        await queryRunner.query(`
            CREATE TABLE "request" (
                "id" SERIAL NOT NULL,
                "requestTimestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "startTimestamp" TIMESTAMP,
                "finishTimestamp" TIMESTAMP,
                "status" "public"."request_status_enum" NOT NULL DEFAULT 'Requested',
                "distanceBest" integer NOT NULL DEFAULT '0',
                "durationBest" integer NOT NULL DEFAULT '0',
                "waitMinutes" integer NOT NULL DEFAULT '0',
                "expectedTimestamp" TIMESTAMP NOT NULL,
                "etaPickup" TIMESTAMP,
                "costBest" numeric(10, 2) NOT NULL,
                "costAfterCoupon" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "tipAmount" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "paidAmount" numeric(10, 2) NOT NULL DEFAULT '0',
                "providerShare" numeric(10, 2) NOT NULL DEFAULT '0',
                "destinationArrivedTo" smallint NOT NULL DEFAULT '0',
                "addresses" text NOT NULL,
                "points" geometry(MultiPoint, 4326) NOT NULL,
                "directions" geometry(MultiPoint, 4326),
                "driverLastSeenMessagesAt" TIMESTAMP NOT NULL DEFAULT now(),
                "riderLastSeenMessagesAt" TIMESTAMP NOT NULL DEFAULT now(),
                "driverId" integer,
                "riderId" integer NOT NULL,
                "couponId" integer,
                "currency" character(3) NOT NULL,
                "paymentGatewayId" integer,
                "serviceId" integer NOT NULL,
                "operatorId" integer,
                "fleetId" integer,
                "cancelReasonId" integer,
                -- Ordre physique aligne sur la production (colonnes Kasi Moto ajoutees apres coup).
                "packageSize" "public"."request_packagesize_enum",
                "recipientName" character varying,
                "recipientMobileNumber" character varying,
                "deliveryInstructions" character varying,
                CONSTRAINT "PK_167d324701e6867f189aed52e18" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."complaint_status_enum" AS ENUM('Submitted', 'UnderInvestigation', 'Resolved')
        `);
        await queryRunner.query(`
            CREATE TABLE "complaint" (
                "id" SERIAL NOT NULL,
                "inscriptionTimestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "requestId" integer NOT NULL,
                "requestedByDriver" boolean NOT NULL,
                "subject" character varying NOT NULL,
                "content" character varying,
                "status" "public"."complaint_status_enum" NOT NULL DEFAULT 'Submitted',
                CONSTRAINT "PK_a9c8dbc2ab4988edcc2ff0a7337" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."complaint_activity_type_enum" AS ENUM('AssignedToOperator', 'Update', 'Resolved')
        `);
        await queryRunner.query(`
            CREATE TABLE "complaint_activity" (
                "id" SERIAL NOT NULL,
                "type" "public"."complaint_activity_type_enum" NOT NULL,
                "assignedToId" integer,
                "comment" character varying,
                "complaintId" integer NOT NULL,
                "actorId" integer,
                CONSTRAINT "PK_bc8af1a02b24ad0cf2e1e89400b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."operator_role_permissions_enum" AS ENUM(
                'Drivers_View',
                'Drivers_Edit',
                'Riders_View',
                'Riders_Edit',
                'Regions_View',
                'Regions_Edit',
                'Services_View',
                'Services_Edit',
                'Complaints_View',
                'Complaints_Edit',
                'Coupons_View',
                'Coupons_Edit',
                'Announcements_View',
                'Announcements_Edit',
                'Requests_View',
                'Fleets_View',
                'Fleets_Edit',
                'Gateways_View',
                'Gateways_Edit',
                'Users_View',
                'Users_Edit',
                'Cars_View',
                'Cars_Edit',
                'FleetWallet_View',
                'FleetWallet_Edit',
                'ProviderWallet_View',
                'ProviderWallet_Edit',
                'DriverWallet_View',
                'DriverWallet_Edit',
                'RiderWallet_View',
                'RiderWallet_Edit',
                'ReviewParameter_Edit',
                'GiftCards_View',
                'GiftCards_Create',
                'GiftCards_ViewCodes',
                'EmailProviders_View',
                'EmailProviders_Edit',
                'ShiftRules_View',
                'ShiftRules_Edit',
                'DocumentRetention_View',
                'DocumentRetention_Edit',
                'MapSettings_View',
                'MapSettings_Edit'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "operator_role" (
                "id" SERIAL NOT NULL,
                "title" character varying NOT NULL,
                "permissions" "public"."operator_role_permissions_enum" array NOT NULL,
                CONSTRAINT "PK_910b516595ea6e4577af0cf23c5" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."operator_enablednotifications_enum" AS ENUM(
                'sos',
                'complaint',
                'order',
                'driverSubmittedDocs'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "operator" (
                "id" SERIAL NOT NULL,
                "firstName" character varying,
                "lastName" character varying,
                "userName" character varying NOT NULL,
                "password" character varying NOT NULL DEFAULT 'admin',
                "mobileNumber" bigint,
                "enabledNotifications" "public"."operator_enablednotifications_enum" array NOT NULL DEFAULT '{complaint,sos,driverSubmittedDocs}',
                "email" character varying,
                "address" character varying,
                "mediaId" integer,
                "roleId" integer,
                "fleetId" integer,
                CONSTRAINT "UQ_c889287e2951bc87f7af326e5d2" UNIQUE ("userName"),
                CONSTRAINT "UQ_ba48103911b18bcd29c9039c987" UNIQUE ("mobileNumber"),
                CONSTRAINT "REL_092affee7993ba757fad472be1" UNIQUE ("mediaId"),
                CONSTRAINT "PK_8b950e1572745d9f69be7748ae8" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."driver_transaction_status_enum" AS ENUM('Processing', 'Done', 'Canceled', 'Rejected')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."driver_transaction_action_enum" AS ENUM('Recharge', 'Deduct')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."driver_transaction_deducttype_enum" AS ENUM('Withdraw', 'Commission', 'Correction')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."driver_transaction_rechargetype_enum" AS ENUM(
                'OrderFee',
                'BankTransfer',
                'InAppPayment',
                'Gift'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "driver_transaction" (
                "id" SERIAL NOT NULL,
                "transactionTime" TIMESTAMP NOT NULL DEFAULT now(),
                "status" "public"."driver_transaction_status_enum" NOT NULL DEFAULT 'Processing',
                "action" "public"."driver_transaction_action_enum" NOT NULL,
                "deductType" "public"."driver_transaction_deducttype_enum",
                "rechargeType" "public"."driver_transaction_rechargetype_enum",
                "amount" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "currency" character(3) NOT NULL,
                "documentNumber" character varying,
                "details" character varying,
                "driverId" integer NOT NULL,
                "paymentGatewayId" integer,
                "operatorId" integer,
                "requestId" integer,
                CONSTRAINT "PK_909fa3f379909f6e5cd64ba6877" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "driver_wallet" (
                "id" SERIAL NOT NULL,
                "amount" double precision NOT NULL DEFAULT '0',
                "currency" character(3) NOT NULL,
                "driverId" integer NOT NULL,
                CONSTRAINT "PK_349e94197daace215703557b144" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."payout_session_status_enum" AS ENUM('Pending', 'Processed', 'Canceled')
        `);
        await queryRunner.query(`
            CREATE TABLE "payout_session" (
                "id" SERIAL NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "processedAt" TIMESTAMP,
                "status" "public"."payout_session_status_enum" NOT NULL DEFAULT 'Pending',
                "currency" character(3) NOT NULL,
                "minimumAmount" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "totalAmount" numeric(12, 2) NOT NULL DEFAULT '0.00',
                "description" character varying,
                "operatorId" integer,
                CONSTRAINT "PK_ed1a6b6cfdd9221a740c1872c5f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."payout_status_enum" AS ENUM('Pending', 'Paid', 'Canceled')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."payout_methodtype_enum" AS ENUM('Wave', 'OrangeMoney', 'BankTransfer', 'Cash')
        `);
        await queryRunner.query(`
            CREATE TABLE "payout" (
                "id" SERIAL NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "status" "public"."payout_status_enum" NOT NULL DEFAULT 'Pending',
                "amount" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "currency" character(3) NOT NULL,
                "methodType" "public"."payout_methodtype_enum" NOT NULL,
                "methodName" character varying NOT NULL,
                "accountNumber" character varying,
                "processedAt" TIMESTAMP,
                "driverTransactionId" integer,
                "sessionId" integer NOT NULL,
                "driverId" integer NOT NULL,
                "methodId" integer,
                CONSTRAINT "PK_1cb73ce021dc6618a3818b0a474" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."payout_method_type_enum" AS ENUM('Wave', 'OrangeMoney', 'BankTransfer', 'Cash')
        `);
        await queryRunner.query(`
            CREATE TABLE "payout_method" (
                "id" SERIAL NOT NULL,
                "type" "public"."payout_method_type_enum" NOT NULL,
                "name" character varying NOT NULL,
                "currency" character(3) NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "minimumAmount" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "instructions" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                CONSTRAINT "PK_b90a23fbcc6be221b8c385cf6e2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."driver_maxpackagesize_enum" AS ENUM('Small', 'Medium', 'Large')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."driver_status_enum" AS ENUM(
                'online',
                'offline',
                'blocked',
                'in service',
                'waiting documents',
                'pending approval',
                'soft reject',
                'hard reject'
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."driver_gender_enum" AS ENUM('male', 'female', 'unknown')
        `);
        await queryRunner.query(`
            CREATE TABLE "driver" (
                "id" SERIAL NOT NULL,
                "firstName" character varying,
                "lastName" character varying,
                "mobileNumber" bigint NOT NULL,
                "certificateNumber" character varying,
                "email" character varying,
                "carId" integer,
                "carColor" character varying,
                "carColorId" integer,
                "carProductionYear" integer,
                "carPlate" character varying,
                "searchDistance" integer,
                "status" "public"."driver_status_enum" NOT NULL DEFAULT 'waiting documents',
                "gender" "public"."driver_gender_enum",
                "registrationTimestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "rating" smallint,
                "reviewCount" smallint NOT NULL DEFAULT '0',
                "lastSeenTimestamp" TIMESTAMP,
                "accountNumber" character varying,
                "bankName" character varying,
                "bankRoutingNumber" character varying,
                "bankSwift" character varying,
                "address" character varying,
                "notificationPlayerId" character varying,
                "documentsNote" character varying,
                "deletedAt" TIMESTAMP,
                "mediaId" integer,
                "fleetId" integer,
                -- Ordre physique aligne sur la production (colonnes ajoutees apres coup).
                "canDeliver" boolean NOT NULL DEFAULT false,
                "maxPackageSize" "public"."driver_maxpackagesize_enum",
                "payoutMethodId" integer,
                "payoutAccountNumber" character varying,
                CONSTRAINT "UQ_e6297db8efeb6cbdb2281e4d892" UNIQUE ("mobileNumber"),
                CONSTRAINT "REL_f3cbfdc82019ea5fda5b5adfb8" UNIQUE ("mediaId"),
                CONSTRAINT "PK_61de71a8d217d585ecd5ee3d065" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "car_color" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                CONSTRAINT "PK_50b0c15b9716171fd9d769fac17" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "admin_wallet" (
                "id" SERIAL NOT NULL,
                "amount" double precision NOT NULL DEFAULT '0',
                "currency" character varying NOT NULL,
                CONSTRAINT "PK_460ae39ea5ec6807a4e55580b34" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."payment_status_enum" AS ENUM(
                'processing',
                'authorized',
                'success',
                'canceled',
                'failed'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "payment" (
                "id" SERIAL NOT NULL,
                "status" "public"."payment_status_enum" NOT NULL DEFAULT 'processing',
                "amount" integer NOT NULL,
                "currency" character varying NOT NULL,
                "transactionNumber" character varying NOT NULL,
                "externalReferenceNumber" text,
                "orderNumber" character varying,
                "userType" character varying NOT NULL,
                "userId" character varying NOT NULL,
                "gatewayId" integer NOT NULL,
                "returnUrl" character varying NOT NULL,
                CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "INDEX_ORDER_NUMBER" ON "payment" ("orderNumber")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."sms_provider_type_enum" AS ENUM('LogOnly', 'Twilio', 'OrangeSms')
        `);
        await queryRunner.query(`
            CREATE TABLE "sms_provider" (
                "id" SERIAL NOT NULL,
                "type" "public"."sms_provider_type_enum" NOT NULL,
                "name" character varying NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "isDefault" boolean NOT NULL DEFAULT false,
                "accountId" character varying,
                "apiSecret" character varying,
                "senderId" character varying,
                "verificationTemplate" character varying NOT NULL DEFAULT 'Your Kasi verification code is: %code%',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_583b8905944a22e31954c4cf0fd" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."email_provider_type_enum" AS ENUM('LogOnly', 'Smtp')
        `);
        await queryRunner.query(`
            CREATE TABLE "email_provider" (
                "id" SERIAL NOT NULL,
                "type" "public"."email_provider_type_enum" NOT NULL,
                "name" character varying NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "isDefault" boolean NOT NULL DEFAULT false,
                "host" character varying,
                "port" integer,
                "secure" boolean NOT NULL DEFAULT false,
                "username" character varying,
                "password" character varying,
                "fromAddress" character varying,
                "fromName" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_7244c12625778820c445d2c17de" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."call_masking_provider_type_enum" AS ENUM('Direct', 'TwilioVoice')
        `);
        await queryRunner.query(`
            CREATE TABLE "call_masking_provider" (
                "id" SERIAL NOT NULL,
                "type" "public"."call_masking_provider_type_enum" NOT NULL,
                "name" character varying NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "isDefault" boolean NOT NULL DEFAULT false,
                "accountId" character varying,
                "apiSecret" character varying,
                "proxyNumber" character varying,
                "webhookAuthToken" character varying,
                "sessionTtlMinutes" integer NOT NULL DEFAULT '120',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dc98b6b23bb0898031092b46046" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."shift_rule_frequency_enum" AS ENUM('Daily', 'Weekly')
        `);
        await queryRunner.query(`
            CREATE TABLE "shift_rule" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "frequency" "public"."shift_rule_frequency_enum" NOT NULL DEFAULT 'Daily',
                "maxHoursPerPeriod" integer NOT NULL,
                "mandatoryBreakMinutes" integer NOT NULL DEFAULT '0',
                "enforced" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_efdedef59fbadc08e287f4780ed" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "retention_policy" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "retentionDays" integer NOT NULL,
                "dryRun" boolean NOT NULL DEFAULT true,
                "lastRunAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4e113cd29b4039d30d5d6e1a43a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."map_setting_provider_enum" AS ENUM('Mapbox', 'OpenStreetMap', 'Google')
        `);
        await queryRunner.query(`
            CREATE TABLE "map_setting" (
                "id" SERIAL NOT NULL,
                "provider" "public"."map_setting_provider_enum" NOT NULL DEFAULT 'OpenStreetMap',
                "mapboxToken" character varying,
                "mapboxStyleUser" character varying NOT NULL DEFAULT 'mapbox',
                "mapboxStyleId" character varying NOT NULL DEFAULT 'streets-v12',
                "googleMapsApiKey" character varying,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cdccc1f6c4442d6d4a985db802d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."reward_apptype_enum" AS ENUM('Driver', 'Rider')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."reward_beneficiary_enum" AS ENUM('Self', 'Referrer')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."reward_event_enum" AS ENUM('Register', 'ServiceCompleted')
        `);
        await queryRunner.query(`
            CREATE TABLE "reward" (
                "id" SERIAL NOT NULL,
                "title" character varying NOT NULL,
                "startDate" TIMESTAMP,
                "endDate" TIMESTAMP,
                "appType" "public"."reward_apptype_enum" NOT NULL,
                "beneficiary" "public"."reward_beneficiary_enum" NOT NULL,
                "event" "public"."reward_event_enum" NOT NULL,
                "creditGift" numeric(10, 2) NOT NULL DEFAULT '0.00',
                "deletedAt" TIMESTAMP,
                "tripFeePercentGift" integer,
                "creditCurrency" character(3),
                "conditionTripCountsLessThan" integer,
                "conditionUserNumberFirstDigits" text,
                CONSTRAINT "PK_a90ea606c229e380fb341838036" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "zone_price_fleets_fleet" (
                "zonePriceId" integer NOT NULL,
                "fleetId" integer NOT NULL,
                CONSTRAINT "PK_684e7c33bf43bf1b0d35c383908" PRIMARY KEY ("zonePriceId", "fleetId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_416865e00a9d171b1845f38fd7" ON "zone_price_fleets_fleet" ("zonePriceId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_323a24306bf40cd2ba9d05e692" ON "zone_price_fleets_fleet" ("fleetId")
        `);
        await queryRunner.query(`
            CREATE TABLE "zone_price_services_service" (
                "zonePriceId" integer NOT NULL,
                "serviceId" integer NOT NULL,
                CONSTRAINT "PK_d5b4beff2c780a20660238a836c" PRIMARY KEY ("zonePriceId", "serviceId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c3dfbf791b1fc27d841faa9253" ON "zone_price_services_service" ("zonePriceId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_849862e93fe0d89d094f32d11a" ON "zone_price_services_service" ("serviceId")
        `);
        await queryRunner.query(`
            CREATE TABLE "service_regions_region" (
                "serviceId" integer NOT NULL,
                "regionId" integer NOT NULL,
                CONSTRAINT "PK_0ed67cf9256de017a0bc9cbc8f5" PRIMARY KEY ("serviceId", "regionId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_57731efa92f6ce3495042b80a4" ON "service_regions_region" ("serviceId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_58ba035359e1a0548e6b4af5e3" ON "service_regions_region" ("regionId")
        `);
        await queryRunner.query(`
            CREATE TABLE "service_options_service_option" (
                "serviceId" integer NOT NULL,
                "serviceOptionId" integer NOT NULL,
                CONSTRAINT "PK_97f62e776703766aa9639920ff6" PRIMARY KEY ("serviceId", "serviceOptionId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_db653734d17c0e3dc6791ac1c3" ON "service_options_service_option" ("serviceId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9ae3d19c8c4d44787ee5ab7751" ON "service_options_service_option" ("serviceOptionId")
        `);
        await queryRunner.query(`
            CREATE TABLE "rider_coupons_coupon" (
                "riderId" integer NOT NULL,
                "couponId" integer NOT NULL,
                CONSTRAINT "PK_0df1c4b5768ec8104668f20abb9" PRIMARY KEY ("riderId", "couponId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_43d628b9a182c423ddb148758c" ON "rider_coupons_coupon" ("riderId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_a541b32022ca897e0cd83cc970" ON "rider_coupons_coupon" ("couponId")
        `);
        await queryRunner.query(`
            CREATE TABLE "coupon_services_service" (
                "couponId" integer NOT NULL,
                "serviceId" integer NOT NULL,
                CONSTRAINT "PK_710508372ca344934724e7a4606" PRIMARY KEY ("couponId", "serviceId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_32610819efa346d401fbeb7403" ON "coupon_services_service" ("couponId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_050c71256e20c925e1ff151b17" ON "coupon_services_service" ("serviceId")
        `);
        await queryRunner.query(`
            CREATE TABLE "review_parameter_feedbacks_request_review" (
                "reviewParameterId" integer NOT NULL,
                "requestReviewId" integer NOT NULL,
                CONSTRAINT "PK_15367ebab810e941accd9563441" PRIMARY KEY ("reviewParameterId", "requestReviewId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6d9d82347a8741a84043fe61ab" ON "review_parameter_feedbacks_request_review" ("reviewParameterId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3ef8ac8dea08ee1f45d9b258bd" ON "review_parameter_feedbacks_request_review" ("requestReviewId")
        `);
        await queryRunner.query(`
            CREATE TABLE "request_options_service_option" (
                "requestId" integer NOT NULL,
                "serviceOptionId" integer NOT NULL,
                CONSTRAINT "PK_c69090e0e94adc38bf06bec564f" PRIMARY KEY ("requestId", "serviceOptionId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_29d4940b127343fcd02de1425a" ON "request_options_service_option" ("requestId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9ebc4b188cef0bf2f6918c8972" ON "request_options_service_option" ("serviceOptionId")
        `);
        await queryRunner.query(`
            CREATE TABLE "driver_services_service" (
                "driverId" integer NOT NULL,
                "serviceId" integer NOT NULL,
                CONSTRAINT "PK_1451869fb720706ac04efcd39d4" PRIMARY KEY ("driverId", "serviceId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8ba3c0a700b7afc12ec813f7ae" ON "driver_services_service" ("driverId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1f4089e0b2df52144cec0282a5" ON "driver_services_service" ("serviceId")
        `);
        await queryRunner.query(`
            ALTER TABLE "promotion"
            ADD CONSTRAINT "FK_5de52c7f8e5ba20f85f28819097" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "gift_card"
            ADD CONSTRAINT "FK_bbbde1dd2d39c4c465b27de658d" FOREIGN KEY ("batchId") REFERENCES "gift_batch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "rider_transaction"
            ADD CONSTRAINT "FK_40f7afba0e122fbba23fddd7ea1" FOREIGN KEY ("riderId") REFERENCES "rider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "rider_transaction"
            ADD CONSTRAINT "FK_7563caa05c5733822a1faf36a4d" FOREIGN KEY ("paymentGatewayId") REFERENCES "payment_gateway"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "rider_transaction"
            ADD CONSTRAINT "FK_d25d5c32582190b66c88b34e4e7" FOREIGN KEY ("operatorId") REFERENCES "operator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "rider_transaction"
            ADD CONSTRAINT "FK_f7a678c7049ddb14c0caad57833" FOREIGN KEY ("giftCardId") REFERENCES "gift_card"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "rider_transaction"
            ADD CONSTRAINT "FK_1d23bcdb55c7cdf4a3d0e7c4a54" FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "admin_transaction"
            ADD CONSTRAINT "FK_914ebbdaec28c1368bf984e8568" FOREIGN KEY ("operatorId") REFERENCES "operator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "admin_transaction"
            ADD CONSTRAINT "FK_5b8da89ca75241b99a6733b83e2" FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "admin_transaction"
            ADD CONSTRAINT "FK_cee200bcb3d358e0c567b90be0b" FOREIGN KEY ("paymentGatewayId") REFERENCES "payment_gateway"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "gateway_to_user"
            ADD CONSTRAINT "FK_3e3dbfc08c263f57768bc18132b" FOREIGN KEY ("gatewayId") REFERENCES "payment_gateway"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "payment_gateway"
            ADD CONSTRAINT "FK_897f64218b621b1072a19280a7e" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "fleet_device"
            ADD CONSTRAINT "FK_ab48871aed3c43fbeb2411eb8c0" FOREIGN KEY ("fleetId") REFERENCES "fleet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "fleet_transaction"
            ADD CONSTRAINT "FK_ab44143498c5f5303fd6cf92123" FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "fleet_transaction"
            ADD CONSTRAINT "FK_fb98fcad1e84c984b30815785bb" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "fleet_transaction"
            ADD CONSTRAINT "FK_270e4676e06fe415d0cfed1ac13" FOREIGN KEY ("fleetId") REFERENCES "fleet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "fleet_transaction"
            ADD CONSTRAINT "FK_4aa43cc3147292c7c7cc73cbd38" FOREIGN KEY ("operatorId") REFERENCES "operator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "fleet_wallet"
            ADD CONSTRAINT "FK_18abcc00421c196abf88a92e29f" FOREIGN KEY ("fleetId") REFERENCES "fleet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "service"
            ADD CONSTRAINT "FK_cb169715cbb8c74f263ba192ca8" FOREIGN KEY ("categoryId") REFERENCES "service_category"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "service"
            ADD CONSTRAINT "FK_8fc7040cc10d7b34cc749d18b60" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "media"
            ADD CONSTRAINT "FK_3fb4de1fa67d1f815a2215c8309" FOREIGN KEY ("driverDocumentId") REFERENCES "driver"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "rider_address"
            ADD CONSTRAINT "FK_50568a1f6172e9853957a8c5250" FOREIGN KEY ("riderId") REFERENCES "rider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "rider_wallet"
            ADD CONSTRAINT "FK_2b3989de3eae7994d4d9217214f" FOREIGN KEY ("riderId") REFERENCES "rider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "rider"
            ADD CONSTRAINT "FK_41d8263064e9cc18cdbbb1df6f1" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request_review"
            ADD CONSTRAINT "FK_154861806a1c51e71b818096d22" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request_review"
            ADD CONSTRAINT "FK_1217dda9665e24ab5cf176a94a5" FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request_chat"
            ADD CONSTRAINT "FK_cfba8e1b7531ad2f82399e4d512" FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request_activity"
            ADD CONSTRAINT "FK_8d7963489163ad61a97b4a803c7" FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "sos_activity"
            ADD CONSTRAINT "FK_12dc0de7d780a7e2812d3b5a3da" FOREIGN KEY ("operatorId") REFERENCES "operator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "sos_activity"
            ADD CONSTRAINT "FK_472d08a544329ce4d990bd4de60" FOREIGN KEY ("sosId") REFERENCES "sos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "sos"
            ADD CONSTRAINT "FK_7e0ce019ea987dd3aa0fcfbe0eb" FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request"
            ADD CONSTRAINT "FK_fb7a42d1d3e0cf4d1360847d0bf" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request"
            ADD CONSTRAINT "FK_3f449d0151371b1e66437639347" FOREIGN KEY ("riderId") REFERENCES "rider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request"
            ADD CONSTRAINT "FK_22ca0197d9cfebe55b8e3aa0435" FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request"
            ADD CONSTRAINT "FK_1a139b882e6c145afb09636baa1" FOREIGN KEY ("paymentGatewayId") REFERENCES "payment_gateway"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request"
            ADD CONSTRAINT "FK_3b61a54006531e8c6836e600653" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request"
            ADD CONSTRAINT "FK_f2aa7a73d50212a58c30b460a10" FOREIGN KEY ("operatorId") REFERENCES "operator"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request"
            ADD CONSTRAINT "FK_f59aaf4654126934df65b26edf0" FOREIGN KEY ("fleetId") REFERENCES "fleet"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request"
            ADD CONSTRAINT "FK_65da674a871f4efd798f7361bf3" FOREIGN KEY ("cancelReasonId") REFERENCES "order_cancel_reason"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "complaint"
            ADD CONSTRAINT "FK_89ce73f64e0691d01a0c145cdf3" FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "complaint_activity"
            ADD CONSTRAINT "FK_1eb5cf7d6bd1cce752f05517889" FOREIGN KEY ("actorId") REFERENCES "operator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "complaint_activity"
            ADD CONSTRAINT "FK_4f980d68f06fd0ef5fafd545bd8" FOREIGN KEY ("assignedToId") REFERENCES "operator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "complaint_activity"
            ADD CONSTRAINT "FK_b0bd5c9e9ecc76bc56de912dcb7" FOREIGN KEY ("complaintId") REFERENCES "complaint"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "operator"
            ADD CONSTRAINT "FK_092affee7993ba757fad472be1c" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "operator"
            ADD CONSTRAINT "FK_6c951b4fe5f84a6000a741908ac" FOREIGN KEY ("roleId") REFERENCES "operator_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "operator"
            ADD CONSTRAINT "FK_ca17fb799ea693b9b72c91b3509" FOREIGN KEY ("fleetId") REFERENCES "fleet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_transaction"
            ADD CONSTRAINT "FK_7b433bf733afdea636322f99920" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_transaction"
            ADD CONSTRAINT "FK_eca1cd5fd25685c46847e6f0b36" FOREIGN KEY ("paymentGatewayId") REFERENCES "payment_gateway"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_transaction"
            ADD CONSTRAINT "FK_f1a21153d95f19eb1e17a193fdd" FOREIGN KEY ("operatorId") REFERENCES "operator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_transaction"
            ADD CONSTRAINT "FK_45cffa9abe9b9a8b88ec7abaa82" FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_wallet"
            ADD CONSTRAINT "FK_6e56cf769a5bf5cf38ed1641854" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "payout_session"
            ADD CONSTRAINT "FK_969eee0b918c650d9a1de89b1a8" FOREIGN KEY ("operatorId") REFERENCES "operator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "payout"
            ADD CONSTRAINT "FK_a05f88c69a03ce0cf4c2918654c" FOREIGN KEY ("sessionId") REFERENCES "payout_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "payout"
            ADD CONSTRAINT "FK_406e91129b56b54a6669c059eac" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "payout"
            ADD CONSTRAINT "FK_e22dbc3d12ad16688678704d0f1" FOREIGN KEY ("methodId") REFERENCES "payout_method"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver"
            ADD CONSTRAINT "FK_7174f800666245cdf8454882d3b" FOREIGN KEY ("carId") REFERENCES "car"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver"
            ADD CONSTRAINT "FK_9b6383172071e15432eed3c480b" FOREIGN KEY ("carColorId") REFERENCES "car_color"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver"
            ADD CONSTRAINT "FK_9cd33b57e823623b79204bbda2b" FOREIGN KEY ("payoutMethodId") REFERENCES "payout_method"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver"
            ADD CONSTRAINT "FK_f3cbfdc82019ea5fda5b5adfb88" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver"
            ADD CONSTRAINT "FK_6bf9b4327f17d5e3a985031ddff" FOREIGN KEY ("fleetId") REFERENCES "fleet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "zone_price_fleets_fleet"
            ADD CONSTRAINT "FK_416865e00a9d171b1845f38fd70" FOREIGN KEY ("zonePriceId") REFERENCES "zone_price"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "zone_price_fleets_fleet"
            ADD CONSTRAINT "FK_323a24306bf40cd2ba9d05e6922" FOREIGN KEY ("fleetId") REFERENCES "fleet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "zone_price_services_service"
            ADD CONSTRAINT "FK_c3dfbf791b1fc27d841faa9253a" FOREIGN KEY ("zonePriceId") REFERENCES "zone_price"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "zone_price_services_service"
            ADD CONSTRAINT "FK_849862e93fe0d89d094f32d11a5" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "service_regions_region"
            ADD CONSTRAINT "FK_57731efa92f6ce3495042b80a4f" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "service_regions_region"
            ADD CONSTRAINT "FK_58ba035359e1a0548e6b4af5e39" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "service_options_service_option"
            ADD CONSTRAINT "FK_db653734d17c0e3dc6791ac1c3b" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "service_options_service_option"
            ADD CONSTRAINT "FK_9ae3d19c8c4d44787ee5ab77517" FOREIGN KEY ("serviceOptionId") REFERENCES "service_option"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "rider_coupons_coupon"
            ADD CONSTRAINT "FK_43d628b9a182c423ddb148758c1" FOREIGN KEY ("riderId") REFERENCES "rider"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "rider_coupons_coupon"
            ADD CONSTRAINT "FK_a541b32022ca897e0cd83cc970d" FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "coupon_services_service"
            ADD CONSTRAINT "FK_32610819efa346d401fbeb74031" FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "coupon_services_service"
            ADD CONSTRAINT "FK_050c71256e20c925e1ff151b175" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "review_parameter_feedbacks_request_review"
            ADD CONSTRAINT "FK_6d9d82347a8741a84043fe61ab3" FOREIGN KEY ("reviewParameterId") REFERENCES "review_parameter"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "review_parameter_feedbacks_request_review"
            ADD CONSTRAINT "FK_3ef8ac8dea08ee1f45d9b258bd7" FOREIGN KEY ("requestReviewId") REFERENCES "request_review"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "request_options_service_option"
            ADD CONSTRAINT "FK_29d4940b127343fcd02de1425aa" FOREIGN KEY ("requestId") REFERENCES "request"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "request_options_service_option"
            ADD CONSTRAINT "FK_9ebc4b188cef0bf2f6918c89722" FOREIGN KEY ("serviceOptionId") REFERENCES "service_option"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_services_service"
            ADD CONSTRAINT "FK_8ba3c0a700b7afc12ec813f7ae0" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "driver_services_service"
            ADD CONSTRAINT "FK_1f4089e0b2df52144cec0282a5c" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(): Promise<void> {
        // Annuler la reference supprimerait tout le schema et toutes les donnees.
        // migrate.js revert la refuse deja ; ceci protege aussi la CLI TypeORM.
        throw new Error(
            "Baseline1790629154960 ne s annule pas : restaurer une sauvegarde pg_dump.",
        );
    }
}
