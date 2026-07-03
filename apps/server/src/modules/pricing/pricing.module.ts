import { Module } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { UnifiedPricingService } from "./unified-pricing.service";
import { PricingController } from "./pricing.controller";
import { PricingReferenceService } from "./pricing-reference.service";
import { PricingReferenceController } from "./pricing-reference.controller";

@Module({
  controllers: [PricingController, PricingReferenceController],
  providers: [PricingService, UnifiedPricingService, PricingReferenceService],
  exports: [PricingService, UnifiedPricingService, PricingReferenceService],
})
export class PricingModule {}
