import { Module } from '@nestjs/common';
import { PilotInsightsResolver } from './pilot-insights.resolver';
import { PilotInsightsService } from './pilot-insights.service';

/**
 * p3-mesures M1 et M3 (2026-10-21) : tableau de suivi du pilote, en lecture
 * (docs/fiche-mesures-pilote.md). Aucune table, aucune migration.
 */
@Module({
  providers: [PilotInsightsService, PilotInsightsResolver],
})
export class PilotInsightsModule {}
