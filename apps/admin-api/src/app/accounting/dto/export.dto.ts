import { SortDirection } from '@ptc-org/nestjs-query-core';
import { Field, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';

@ObjectType('ExportResult')
export class ExportResultDTO {
  url: string;
}
enum ExportTable {
  ProviderWallet = 'ProviderWallet',
  DriverWallet = 'DriverWallet',
  RiderWallet = 'RiderWallet',
  FleetWallet = 'FleetWallet',
}
registerEnumType(ExportTable, { name: 'ExportTable' });

enum ExportType {
  CSV = 'csv',
}
registerEnumType(ExportType, { name: 'ExportType' });

@InputType('ExportArgs')
export class ExportArgsDTO {
  table: ExportTable;
  filters?: ExportFilterArg[];
  sort?: ExportSortArg;
  relations?: string[];
  @Field(() => ExportType)
  type: ExportType;
}

@InputType('ExportFilterArg')
export class ExportFilterArg {
  field: string;
  value: string;
}

@InputType('ExportSortArg')
export class ExportSortArg {
  property: string;
  direction: SortDirection;
}
