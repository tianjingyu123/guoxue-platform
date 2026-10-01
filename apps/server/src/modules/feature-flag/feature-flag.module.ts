import { Global, Module } from "@nestjs/common";
import { FeatureFlagService } from "./feature-flag.service";
import { FeatureFlagController, FeatureFlagPublicController } from "./feature-flag.controller";
import { ClientPresentationService } from "./client-presentation.service";
import { ClientPresentationController } from "./client-presentation.controller";

@Global()
@Module({
  providers: [FeatureFlagService, ClientPresentationService],
  controllers: [FeatureFlagController, FeatureFlagPublicController, ClientPresentationController],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule {}
