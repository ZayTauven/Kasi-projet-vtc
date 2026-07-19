import { ValueTransformer } from 'typeorm';

// Postgres renvoie les colonnes `numeric`/`decimal` sous forme de CHAINE
// (node-postgres preserve la precision arbitraire). Sans transformer, une
// valeur comme baseFare arrive en "1000.00" : la moindre operation `+`
// declenche une concatenation de chaine -> NaN -> "Float cannot represent
// NaN" a la serialisation GraphQL. Ce transformer normalise en number a la
// lecture. A l'ecriture on laisse passer la valeur telle quelle (Postgres
// accepte un number pour une colonne numeric) : aucun double formatage.
export class ColumnNumericTransformer implements ValueTransformer {
  // Types `any` : la config du repo desactive strictNullChecks, un union
  // number|null s'effondre en number et casse l'assignabilite. On calque
  // donc la signature permissive de ValueTransformer.
  to(value: any): any {
    return value;
  }

  from(value: any): any {
    if (value == null) return value; // preserve null/undefined (colonnes nullable)
    return parseFloat(value);
  }
}
