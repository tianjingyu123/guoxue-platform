import { Module } from "@nestjs/common";
import { ContentQualityService } from "./content-quality.service";

@Module({
  providers: [ContentQualityService],
  exports: [ContentQualityService],
})
export class ContentQualityModule {}
