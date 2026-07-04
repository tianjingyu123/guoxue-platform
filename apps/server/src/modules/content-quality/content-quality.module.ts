import { Module } from "@nestjs/common";
import { ContentQualityService } from "./content-quality.service";
import { UserGrowthModule } from "../user-growth/user-growth.module";

@Module({
  // UserGrowthModule 提供 ContentExpService：评分落库后发内容学分（创-P1 创作激励接线）
  imports: [UserGrowthModule],
  providers: [ContentQualityService],
  exports: [ContentQualityService],
})
export class ContentQualityModule {}
