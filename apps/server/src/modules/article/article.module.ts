import { Module } from "@nestjs/common";
import { ArticleService } from "./article.service";
import { ArticleController } from "./article.controller";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { RecommendModule } from "../recommend/recommend.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [RecommendModule, AuditModule],
  controllers: [ArticleController],
  providers: [ArticleService, StationIsolationGuard],
  exports: [ArticleService],
})
export class ArticleModule {}
