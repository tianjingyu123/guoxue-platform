import { Module } from "@nestjs/common";
import { ArticleService } from "./article.service";
import { ArticleController } from "./article.controller";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { RecommendModule } from "../recommend/recommend.module";

@Module({
  imports: [RecommendModule],
  controllers: [ArticleController],
  providers: [ArticleService, StationIsolationGuard],
  exports: [ArticleService],
})
export class ArticleModule {}
