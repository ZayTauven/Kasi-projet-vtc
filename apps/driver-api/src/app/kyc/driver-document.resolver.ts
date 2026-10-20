import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DriverDocumentService } from '@kasi/order/driver-document.service';

import { UserContext } from '../auth/authenticated-user';
import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';
import { DriverDocumentDTO, DriverDocumentTypeDTO, SubmitDriverDocumentInput } from './dto/driver-document.dto';

/**
 * p2-kyc K1 (2026-10-20) : documents types du Kasiman, cote driver-api.
 * Ajouts facultatifs : les driver-app installees ne les appellent pas
 * (elles gardent `upload_document` + `setDocumentsOnDriver`) ; l'ecran
 * « Mes documents » arrive en K3.
 */
@Resolver()
@UseGuards(GqlAuthGuard)
export class DriverDocumentResolver {
  constructor(
    private readonly documents: DriverDocumentService,
    @Inject(CONTEXT) private readonly context: UserContext,
  ) {}

  /**
   * Catalogue actif, dans l'ordre d'affichage. p2-kyc K4 : seuls les types
   * exiges pour le vehicule du Kasiman (tout le catalogue s'il n'en a pas).
   */
  @Query(() => [DriverDocumentTypeDTO])
  async driverDocumentTypes(): Promise<DriverDocumentTypeDTO[]> {
    return this.documents.listTypesForDriver(this.context.req.user.id);
  }

  /** Documents du Kasiman connecte (hors documents remplaces). */
  @Query(() => [DriverDocumentDTO])
  async driverDocuments(): Promise<DriverDocumentDTO[]> {
    return (await this.documents.listForDriver(this.context.req.user.id)) as DriverDocumentDTO[];
  }

  /**
   * Envoi d'un document type : `mediaId` vient de `POST /upload_document`.
   * Le document attend la revue d'un operateur ; il remplace l'envoi en
   * attente du meme type. Rejeu : le meme document.
   */
  @Mutation(() => DriverDocumentDTO)
  async submitDriverDocument(
    @Args('input', { type: () => SubmitDriverDocumentInput }) input: SubmitDriverDocumentInput,
  ): Promise<DriverDocumentDTO> {
    return (await this.documents.submit(this.context.req.user.id, {
      typeId: Number(input.typeId),
      mediaId: Number(input.mediaId),
      number: input.number,
      expiresAt: input.expiresAt,
    })) as DriverDocumentDTO;
  }
}
