import { Global, Module } from "@nestjs/common";
import { FeatureFlagService } from "./feature-flag.service";
import { FeatureFlagController, FeatureFlagPublicController } from "./feature-flag.controller";

@Global()
@Module({
  providers: [FeatureFlagService],
  controllers: [FeatureFlagController, FeatureFlagPublicController],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule {}
