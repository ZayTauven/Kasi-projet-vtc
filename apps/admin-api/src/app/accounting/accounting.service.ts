import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverEntity } from '@kasi/database/driver.entity';
import { ProviderTransactionEntity } from '@kasi/database/provider-transaction.entity';
import { RiderEntity } from '@kasi/database/rider-entity';
import { Repository } from 'typeorm';
import { ChartTimeframe } from './dto/chart-timeframe.enum';
import { IncomeResultItem } from './dto/income-result-item.dto';
import { RegistrationResultItemDto } from './dto/registration-result-item.dto';
import { RequestResultItem } from './dto/request-result-item.dto';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(ProviderTransactionEntity)
    private providerTransactionRepository: Repository<ProviderTransactionEntity>,
    @InjectRepository(RiderEntity)
    private riderRepository: Repository<RiderEntity>,
    @InjectRepository(DriverEntity)
    private driverRepository: Repository<DriverEntity>,
  ) {}

  incomeChart(timeframe: ChartTimeframe): Promise<IncomeResultItem[]> {
    const vars = this.getQueryVars(timeframe, 'transactionTime');
    return this.providerTransactionRepository.query(
      `SELECT currency, SUM(amount)::float8 as sum, (EXTRACT(EPOCH FROM MIN("transactionTime")) * 1000)::float8 AS time from admin_transaction WHERE ${vars.query} GROUP BY currency, ${vars.groupBy}`,
    );
  }

  requestsChart(timeframe: ChartTimeframe): Promise<RequestResultItem[]> {
    const vars = this.getQueryVars(timeframe, 'requestTimestamp');
    return this.providerTransactionRepository.query(
      `SELECT COUNT(status)::int as count, status, (EXTRACT(EPOCH FROM MIN("requestTimestamp")) * 1000)::float8 AS time from "request" WHERE ${vars.query} GROUP BY ${vars.groupBy}, status`,
    );
  }

  driverRegistrations(
    timeframe: ChartTimeframe,
  ): Promise<RegistrationResultItemDto[]> {
    const vars = this.getQueryVars(timeframe, 'registrationTimestamp');
    return this.driverRepository.query(
      `SELECT COUNT(id)::int as count, (EXTRACT(EPOCH FROM MIN("registrationTimestamp")) * 1000)::float8 AS time from driver WHERE ${vars.query} GROUP BY ${vars.groupBy}`,
    );
  }

  riderRegistrations(
    timeframe: ChartTimeframe,
  ): Promise<RegistrationResultItemDto[]> {
    const vars = this.getQueryVars(timeframe, 'registrationTimestamp');
    return this.riderRepository.query(
      `SELECT COUNT(id)::int as count, (EXTRACT(EPOCH FROM MIN("registrationTimestamp")) * 1000)::float8 AS time from rider WHERE ${vars.query} GROUP BY ${vars.groupBy}`,
    );
  }

  private getQueryVars(
    query: ChartTimeframe,
    timeField: string,
  ): { groupBy: string; query: string } {
    // Les colonnes TypeORM sont en camelCase : à quoter en Postgres.
    const field = `"${timeField}"`;
    switch (query) {
      case ChartTimeframe.Daily:
        return {
          groupBy: `${field}::date, ${field}::time`,
          query: `${field}::date = CURRENT_DATE`,
        };
      case ChartTimeframe.Monthly:
        return {
          groupBy: `EXTRACT(DOY FROM ${field}), EXTRACT(YEAR FROM ${field})`,
          query: `${field} > CURRENT_DATE - INTERVAL '2 months'`,
        };
      case ChartTimeframe.Weekly:
        return {
          groupBy: `EXTRACT(WEEK FROM ${field}), EXTRACT(YEAR FROM ${field})`,
          query: `${field} > CURRENT_DATE - INTERVAL '6 months'`,
        };
      case ChartTimeframe.Yearly:
        return {
          groupBy: `EXTRACT(MONTH FROM ${field}), EXTRACT(YEAR FROM ${field})`,
          query: `${field} > CURRENT_DATE - INTERVAL '12 months'`,
        };
    }
  }
}
