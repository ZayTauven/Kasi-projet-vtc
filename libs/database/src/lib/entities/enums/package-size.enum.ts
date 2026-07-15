import { registerEnumType } from "@nestjs/graphql";

export enum PackageSize {
    Small = 'Small',
    Medium = 'Medium',
    Large = 'Large'
}

registerEnumType(PackageSize, { name: 'PackageSize' });

const PACKAGE_SIZE_RANK: Record<PackageSize, number> = {
    [PackageSize.Small]: 1,
    [PackageSize.Medium]: 2,
    [PackageSize.Large]: 3,
};

// Un colis sans taille déclarée est traité comme le plus petit gabarit ;
// un chauffeur sans capacité déclarée ne peut transporter que ce gabarit.
export function packageSizeRank(size?: PackageSize | null): number {
    return size == null ? 1 : PACKAGE_SIZE_RANK[size];
}
