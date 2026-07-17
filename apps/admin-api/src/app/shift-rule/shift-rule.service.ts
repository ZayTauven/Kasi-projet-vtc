import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftRuleEntity } from '@kasi/database/shift-rule.entity';

// Le CRUD (createOne / updateOne / deleteOne / shiftRules query) est généré
// par NestjsQueryGraphQLModule.forFeature dans shift-rule.module.ts, comme pour
// sms-provider / email-provider. Ce service porte le dépôt pour d'éventuelles
// opérations métier ultérieures (aucune règle Ridy n'est codée en dur ici).
@Injectable()
export class ShiftRuleService {
  constructor(
    @InjectRepository(ShiftRuleEntity)
    private shiftRuleRepo: Repository<ShiftRuleEntity>,
  ) {}
}
