import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShiftRuleService } from './shift-rule.service';

// Les mutations/queries CRUD nestjs-query (createOne / updateOne / deleteOne /
// shiftRules) sont générées par le module. Ce resolver custom est le point
// d'extension pour d'éventuelles mutations métier (ex: bascule enforced), sur
// le même modèle que sms-provider.resolver — sans logique Ridy figée.
@Resolver()
@UseGuards(JwtAuthGuard)
export class ShiftRuleResolver {
  constructor(private shiftRuleService: ShiftRuleService) {}
}
