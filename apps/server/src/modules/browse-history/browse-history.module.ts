import { Module } from "@nestjs/common";
import { BrowseHistoryService } from "./browse-history.service";
import { BrowseHistoryController } from "./browse-history.controller";

@Module({
  controllers: [BrowseHistoryController],
  providers: [BrowseHistoryService],
  exports: [BrowseHistoryService],
})
export class BrowseHistoryModule {}
