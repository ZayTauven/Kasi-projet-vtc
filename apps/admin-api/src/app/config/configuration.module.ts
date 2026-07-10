import { Module } from "@nestjs/common";
import { ConfigurationController } from "./configuration.controller";
import { ConfigurationResolver } from "./configuration.resolver";
import { ConfigurationService } from "./configuration.service";

@Module({
    imports: [],
    providers: [
        ConfigurationService,
        ConfigurationResolver
    ],
    controllers: [
        ConfigurationController
    ]
})
export class ConfigurationModule {}