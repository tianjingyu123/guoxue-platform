import { Module } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";
import { SearchWeightService } from "./search-weight.service";
import { SearchWeightController } from "./search-weight.controller";

@Module({
  controllers: [SearchController, SearchWeightController],
  providers: [SearchService, SearchWeightService],
  exports: [SearchService, SearchWeightService],
})
export class SearchModule {}
