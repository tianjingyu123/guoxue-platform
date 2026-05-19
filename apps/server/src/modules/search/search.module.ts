import { Module } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";
import { SearchWeightService } from "./search-weight.service";
import { SearchWeightController } from "./search-weight.controller";
import { AiSearchController } from "./ai-search.controller";
import { SemanticSearchService } from "./semantic-search.service";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";

@Module({
  imports: [AiGatewayModule],
  controllers: [SearchController, SearchWeightController, AiSearchController],
  providers: [SearchService, SearchWeightService, SemanticSearchService],
  exports: [SearchService, SearchWeightService, SemanticSearchService],
})
export class SearchModule {}
