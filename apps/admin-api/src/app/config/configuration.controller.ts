import { Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import * as fastify from 'fastify';
import { ConfigurationService } from "./configuration.service";
import { ConfigWriteRestGuard } from "./config-write.guard";

@Controller('config')
export class ConfigurationController {
    constructor(
        private configurationService: ConfigurationService
    ) {}

    /**
     * Depot de la cle de service Firebase pendant l'installation.
     *
     * Cet endpoint ecrit dans `config/`, le volume monte sur les 3 APIs
     * (docker-compose.yml) qui contient `config.production.json` ET la cle de
     * service Firebase. Il etait expose SANS AUCUNE garde et avec un nom de
     * fichier fourni par le client : n'importe qui pouvait ecraser ces deux
     * fichiers. Par ailleurs l'appel n'etait pas `await`, donc une requete
     * non-multipart produisait un rejet non capture qui TUAIT le process Node
     * (deni de service a une seule requete).
     */
    @Post('upload')
    @UseGuards(ConfigWriteRestGuard)
    async upload(@Req() req: fastify.FastifyRequest, @Res() res: fastify.FastifyReply) {
        await this.configurationService.uploadFirebaseKeyFile(req, res);
    }
}
