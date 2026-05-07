import { Module } from "@nestjs/common";
import { OfflineService } from "./offline.service";
import { OfflineController } from "./offline.controller";

@Module({
  controllers: [OfflineController],
  providers: [OfflineService],
  exports: [OfflineService],
})
export class OfflineModule {}
