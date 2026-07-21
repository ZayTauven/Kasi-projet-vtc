import { FindOptionsRelations } from 'typeorm';

/**
 * TypeORM 1.0 a retiré le support runtime de l'ancienne syntaxe
 * `relations: string[]` en dot-notation (ex. `['driver', 'driver.car']`) :
 * `FindOptionsUtils` lève désormais une `TypeORMError` si un tableau est
 * passé (voir node_modules/typeorm/find-options/FindOptionsUtils.js).
 *
 * Cet utilitaire convertit un tableau de chemins pointés en l'objet imbriqué
 * attendu par la nouvelle API (`{ driver: { car: true } }`), pour les
 * endroits du code où les relations à charger sont construites
 * dynamiquement (paramètre de service interne, filtre GraphQL d'export...)
 * et ne peuvent pas être réécrites en littéral objet statique.
 */
export function relationsArrayToTree(
  paths: string[],
): FindOptionsRelations<any> {
  const tree: Record<string, any> = {};
  for (const path of paths) {
    const parts = path.split('.');
    let node = tree;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        if (node[part] === undefined) {
          node[part] = true;
        }
      } else {
        if (typeof node[part] !== 'object' || node[part] === null) {
          node[part] = {};
        }
        node = node[part];
      }
    });
  }
  return tree;
}
