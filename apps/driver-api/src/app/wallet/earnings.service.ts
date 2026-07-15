import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RequestEntity } from "@kasi/database/request.entity";
import { Repository } from "typeorm";
import { Datapoint, StatisticsResult, TimeQuery } from "./dto/earnings.dto";

// SQL Postgres (la version amont était en dialecte MySQL : ANY_VALUE,
// DATE_FORMAT/DATEDIFF/MAKEDATE, placeholders « ? », identifiants camelCase
// non quotés — toutes les requêtes de cet écran plantaient sur Postgres).
const FIELDS = `
    SUM("costBest" - "providerShare")::float AS earning,
    COUNT(id)::int AS count,
    SUM("distanceBest")::int AS distance,
    SUM("durationBest")::int AS "time"`;

@Injectable()
export class EarningsService {
    constructor(
        @InjectRepository(RequestEntity)
        private requestRepository: Repository<RequestEntity>
    ) {}

    private async mostUsedCurrency(driverId: number): Promise<string | null> {
        const q: Array<any> = await this.requestRepository.query(
            `SELECT currency, COUNT(currency)::int AS count FROM request WHERE "driverId" = $1 GROUP BY currency ORDER BY count DESC LIMIT 1`,
            [driverId]
        );
        return q.length < 1 ? null : q[0].currency;
    }

    private datasetQuery(timeFrame: TimeQuery, extraWhere: string): string {
        switch (timeFrame) {
            case TimeQuery.Daily:
                return `
                    SELECT
                        to_char(DATE("requestTimestamp"), 'FMDay') AS name,
                        to_char(CURRENT_TIMESTAMP, 'FMMM/FMDD') AS current,
                        ${FIELDS}
                    FROM request
                    WHERE ${extraWhere}
                    GROUP BY DATE("requestTimestamp")
                    ORDER BY DATE("requestTimestamp")`;
            case TimeQuery.Weekly:
                return `
                    SELECT
                        to_char("requestTimestamp", 'IYYY",W"IW') AS name,
                        to_char(CURRENT_TIMESTAMP, 'IYYY",W"IW') AS current,
                        ${FIELDS}
                    FROM request
                    WHERE ${extraWhere}
                    GROUP BY to_char("requestTimestamp", 'IYYY",W"IW')
                    ORDER BY to_char("requestTimestamp", 'IYYY",W"IW')`;
            case TimeQuery.Monthly:
                return `
                    SELECT
                        to_char("requestTimestamp", 'FMYYYY/FMMM') AS name,
                        to_char(CURRENT_TIMESTAMP, 'FMYYYY/FMMM') AS current,
                        ${FIELDS}
                    FROM request
                    WHERE ${extraWhere}
                    GROUP BY to_char("requestTimestamp", 'FMYYYY/FMMM')
                    ORDER BY to_char("requestTimestamp", 'FMYYYY/FMMM')`;
        }
    }

    async getStats(driverId: number, timeFrame: TimeQuery): Promise<StatisticsResult> {
        const currency = await this.mostUsedCurrency(driverId);
        if (currency == null) {
            return { currency: 'USD', dataset: [] };
        }
        let timeWindow: string;
        switch (timeFrame) {
            case TimeQuery.Daily:
                timeWindow = `"requestTimestamp" > NOW() - INTERVAL '7 days'`;
                break;
            case TimeQuery.Weekly:
                timeWindow = 'TRUE';
                break;
            case TimeQuery.Monthly:
                timeWindow = `"requestTimestamp" >= date_trunc('year', NOW())`;
                break;
        }
        const dataset: Datapoint[] = await this.requestRepository.query(
            this.datasetQuery(timeFrame, `${timeWindow} AND "driverId" = $1 AND currency = $2`),
            [driverId, currency]
        );
        return { currency, dataset };
    }

    async getStatsNew(driverId: number, timeFrame: TimeQuery, startDate: Date, endDate: Date): Promise<StatisticsResult> {
        const currency = await this.mostUsedCurrency(driverId);
        if (currency == null) {
            return { currency: 'USD', dataset: [] };
        }
        const dataset: Datapoint[] = await this.requestRepository.query(
            this.datasetQuery(
                timeFrame,
                `"requestTimestamp" > $1 AND "requestTimestamp" < $2 AND "driverId" = $3 AND currency = $4`
            ),
            [startDate, endDate, driverId, currency]
        );
        return { currency, dataset };
    }
}
