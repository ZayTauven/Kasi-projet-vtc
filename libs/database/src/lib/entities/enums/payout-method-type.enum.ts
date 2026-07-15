import { registerEnumType } from "@nestjs/graphql";

// Canaux de versement des gains aux Kasimen (contexte Sénégal :
// mobile money d'abord, le virement et l'espèce en repli).
export enum PayoutMethodType {
    Wave = 'Wave',
    OrangeMoney = 'OrangeMoney',
    BankTransfer = 'BankTransfer',
    Cash = 'Cash'
}

registerEnumType(PayoutMethodType, { name: 'PayoutMethodType' });
