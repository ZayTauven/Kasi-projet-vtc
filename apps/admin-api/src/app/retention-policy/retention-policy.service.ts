import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, IsNull, Repository } from 'typeorm';
import { RetentionPolicyEntity } from '@kasi/database/retention-policy.entity';
import { MediaEntity } from '@kasi/database/media.entity';

@Injectable()
export class RetentionPolicyService {
  private readonly logger = new Logger(RetentionPolicyService.name);

  constructor(
    @InjectRepository(RetentionPolicyEntity)
    private policyRepo: Repository<RetentionPolicyEntity>,
    // Entité cible identifiée pour la purge documentaire : MediaEntity
    // (pièces jointes / documents driver via driverDocumentId). Voir la note
    // dans purgeExpiredDocuments : MediaEntity NE porte AUCUNE colonne de date
    // (createdAt/uploadedAt), donc l'âge d'un document ne peut PAS être calculé
    // en base à ce stade -> aucune ligne n'est jamais flaguée pour purge.
    @InjectRepository(MediaEntity)
    private mediaRepo: Repository<MediaEntity>,
  ) {}

  // Job quotidien approximatif (24h). Aligné sur le style @Interval déjà
  // utilisé dans driver-api (order/cron-job.service.ts). admin-api n'utilise
  // pas @Cron ailleurs, donc on reste sur @Interval.
  //
  // LOT NON DESTRUCTIF : ce job ne SUPPRIME RIEN. Selon dryRun il ne fait que
  // logger (dryRun=true, défaut) ou logger un WARNING (dryRun=false). Aucune
  // suppression physique n'est câblée tant que la validation utilisateur
  // explicite n'a pas été donnée.
  @Interval('retention-policy-purge', 24 * 60 * 60 * 1000)
  async purgeExpiredDocuments(): Promise<void> {
    const policies = await this.policyRepo.findBy({ enabled: true });
    if (policies.length === 0) {
      this.logger.debug(
        'Aucune politique de rétention activée : purge ignorée.',
      );
      return;
    }

    for (const policy of policies) {
      const cutoff = new Date(
        Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000,
      );

      // MediaEntity ne dispose d'aucune colonne temporelle : impossible de
      // déterminer les documents plus vieux que `cutoff`. On log la cible
      // candidate et l'impossibilité de calculer l'âge -> 0 document flagué.
      // (Quand une colonne de date sera ajoutée à MediaEntity, remplacer ce
      // bloc par un findBy({ createdAt: LessThan(cutoff) }).)
      const candidateCount = await this.mediaRepo.count({
        where: { driverDocumentId: Not(IsNull()) },
      });

      const eligibleIds: number[] = []; // aucune cible d'âge calculable

      this.logger.log(
        `[retention:${policy.name}] cutoff=${cutoff.toISOString()} ` +
          `(retentionDays=${policy.retentionDays}) ; cible=MediaEntity ` +
          `(documents driver) ; MediaEntity NE PORTE PAS de colonne de date, ` +
          `l'âge ne peut être calculé -> 0 document éligible ` +
          `(pool candidat ~${candidateCount}).`,
      );

      if (policy.dryRun) {
        // dryRun (défaut) : LOG UNIQUEMENT, aucune écriture/suppression.
        this.logger.log(
          `[retention:${policy.name}] dryRun=true -> SERAIENT purgés : ` +
            `${eligibleIds.length} document(s) ` +
            `ids=[${eligibleIds.join(', ')}] (aucune suppression effectuée).`,
        );
      } else {
        // dryRun=false : suppression réelle VOLONTAIREMENT non câblée à ce
        // stade. On log un WARNING et on ne supprime toujours RIEN.
        this.logger.warn(
          `[retention:${policy.name}] dryRun=false mais suppression réelle ` +
            `DÉSACTIVÉE en attente de validation utilisateur explicite : ` +
            `${eligibleIds.length} document(s) auraient été ciblés ` +
            `ids=[${eligibleIds.join(', ')}] (aucune suppression effectuée).`,
        );
      }

      policy.lastRunAt = new Date();
      await this.policyRepo.save(policy);
    }
  }
}
