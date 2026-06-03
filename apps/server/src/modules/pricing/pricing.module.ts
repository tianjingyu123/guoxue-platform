import { Module } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { UnifiedPricingService } from "./unified-pricing.service";
import { PricingController } from "./pricing.controller";

@Module({
  controllers: [PricingController],
  providers: [PricingService, UnifiedPricingService],
  exports: [PricingService, UnifiedPricingService],
})
export class PricingModule {}
