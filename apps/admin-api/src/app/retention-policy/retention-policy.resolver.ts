import { UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RetentionPolicyService } from './retention-policy.service';

// CRUD de base fourni par nestjs-query (voir retention-policy.module.ts).
// Ce resolver n'expose qu'un déclencheur manuel du job de purge en dryRun,
// utile pour tester la politique depuis le panel sans attendre l'intervalle.
// 100% NON DESTRUCTIF : délègue à purgeExpiredDocuments qui ne supprime rien.
@Resolver()
@UseGuards(JwtAuthGuard)
export class RetentionPolicyResolver {
  constructor(private retentionPolicyService: RetentionPolicyService) {}

  @Mutation(() => Boolean)
  async runRetentionPolicyDryRun(): Promise<boolean> {
    await this.retentionPolicyService.purgeExpiredDocuments();
    return true;
  }
}
