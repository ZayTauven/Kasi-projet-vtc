import { Injectable } from '@nestjs/common';
import {
  DispatchAttemptEntity,
  DispatchAttemptOutcome,
} from '@kasi/database/dispatch-attempt.entity';
import { DataSource } from 'typeorm';

export type NewDispatchAttempt = Pick<
  DispatchAttemptEntity,
  'requestId' | 'driverId' | 'wave' | 'rank' | 'airDistanceM'
> &
  Partial<Pick<DispatchAttemptEntity, 'roadDistanceM' | 'roadDurationS' | 'routingSource'>>;

/** Resultat d'une reponse de Kasiman : ecrite, deja donnee, ou sans offre. */
export type AttemptResponse = 'changed' | 'same' | 'none';

/**
 * p2-dispatch D4 (2026-10-20) : journal `dispatch_attempt` (fiche dispatch
 * §3, `dira-r-journal`). Une ligne par (course, Kasiman). Toutes les
 * ecritures sont conditionnelles (rejouables) :
 * - `record` n'insere que les Kasimen pas encore sollicites pour la course
 *   (ON CONFLICT DO NOTHING) et renvoie ceux reellement ajoutes : c'est ce qui
 *   decide de la push (deux vagues ou deux refus concurrents = une push) ;
 * - une issue n'est ecrite que sur une offre encore `pending`, sauf
 *   l'acceptation qui fait foi (transition de course deja gagnee).
 * Utilise en `DISPATCH_MODE=waves` seulement.
 */
@Injectable()
export class DispatchAttemptJournal {
  constructor(private readonly dataSource: DataSource) {}

  async record(rows: NewDispatchAttempt[]): Promise<number[]> {
    if (rows.length === 0) return [];
    const result = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(DispatchAttemptEntity)
      .values(rows)
      .orIgnore()
      .returning(['driverId'])
      .execute();
    return (result.raw as Array<{ driverId: number }>).map((r) => Number(r.driverId));
  }

  /** Refus (ou toute reponse) du Kasiman sur son offre ouverte. */
  async respond(
    requestId: number,
    driverId: number,
    outcome: DispatchAttemptOutcome.Rejected,
  ): Promise<{ result: AttemptResponse; wave: number | null }> {
    const raw: unknown = await this.dataSource.query(
      `UPDATE "dispatch_attempt" SET "outcome" = $3, "respondedAt" = now()
        WHERE "requestId" = $1 AND "driverId" = $2 AND "outcome" = 'pending'
        RETURNING "wave"`,
      [requestId, driverId, outcome],
    );
    const changed = this.affected<{ wave: number }>(raw);
    if (changed.length > 0) {
      return { result: 'changed', wave: Number(changed[0].wave) };
    }
    const rows: Array<{ outcome: string; wave: number }> = await this.dataSource.query(
      `SELECT "outcome", "wave" FROM "dispatch_attempt" WHERE "requestId" = $1 AND "driverId" = $2`,
      [requestId, driverId],
    );
    if (rows.length === 0) return { result: 'none', wave: null };
    return { result: rows[0].outcome === outcome ? 'same' : 'none', wave: Number(rows[0].wave) };
  }

  /** Course prise : le gagnant `accepted`, les autres offres ouvertes `no_answer`. */
  async accepted(requestId: number, winnerId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE "dispatch_attempt" SET "outcome" = 'accepted', "respondedAt" = now()
          WHERE "requestId" = $1 AND "driverId" = $2 AND "outcome" <> 'accepted'`,
        [requestId, winnerId],
      );
      await manager.query(
        `UPDATE "dispatch_attempt" SET "outcome" = 'no_answer', "respondedAt" = now()
          WHERE "requestId" = $1 AND "driverId" <> $2 AND "outcome" = 'pending'`,
        [requestId, winnerId],
      );
    });
  }

  /** Offres encore ouvertes closes : `expired` (aucun Kasiman) ou `no_answer`. */
  async close(
    requestId: number,
    outcome: DispatchAttemptOutcome.Expired | DispatchAttemptOutcome.NoAnswer,
  ): Promise<number> {
    const rows = await this.dataSource.query(
      `UPDATE "dispatch_attempt" SET "outcome" = $2, "respondedAt" = now()
        WHERE "requestId" = $1 AND "outcome" = 'pending' RETURNING "id"`,
      [requestId, outcome],
    );
    return this.affected(rows).length;
  }

  async pendingCount(requestId: number): Promise<number> {
    const [{ n }] = await this.dataSource.query(
      `SELECT count(*)::int AS n FROM "dispatch_attempt" WHERE "requestId" = $1 AND "outcome" = 'pending'`,
      [requestId],
    );
    return Number(n);
  }

  async solicitedCount(requestId: number): Promise<number> {
    const [{ n }] = await this.dataSource.query(
      `SELECT count(*)::int AS n FROM "dispatch_attempt" WHERE "requestId" = $1`,
      [requestId],
    );
    return Number(n);
  }

  async rankCount(requestId: number, wave: number): Promise<number> {
    const [{ n }] = await this.dataSource.query(
      `SELECT count(*)::int AS n FROM "dispatch_attempt" WHERE "requestId" = $1 AND "wave" = $2`,
      [requestId, wave],
    );
    return Number(n);
  }

  /** `UPDATE ... RETURNING` par `query()` : [lignes, nombre] selon le pilote. */
  private affected<T>(raw: unknown): T[] {
    if (Array.isArray(raw) && raw.length === 2 && Array.isArray(raw[0]) && typeof raw[1] === 'number') {
      return raw[0] as T[];
    }
    return (raw as T[]) ?? [];
  }
}
