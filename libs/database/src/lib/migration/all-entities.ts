import { entities } from '../database.module';
import { RequestActivityEntity } from '../entities/request-activity.entity';
import { RewardEntity } from '../entities/reward.entity';

/**
 * Union des entites des trois API : c'est le schema que les migrations doivent
 * produire.
 *
 * Chaque API ne charge que ses propres entites (`autoLoadEntities`) :
 * - les trois chargent `entities` (48 classes) + `RequestActivityEntity` ;
 * - seule admin-api charge `RewardEntity` (module reward).
 * Aucune API ne voit donc a elle seule le schema complet : ni `synchronize`
 * ni un `migration:generate` lance depuis une API ne seraient fiables.
 *
 * Toute nouvelle entite doit etre ajoutee ici (ou a `entities`) : la DataSource
 * de la CLI (`data-source.cli.ts`) refuse de demarrer si un fichier du dossier
 * `entities/` declare une entite absente de cette liste.
 */
export const allEntities = [...entities, RequestActivityEntity, RewardEntity];
