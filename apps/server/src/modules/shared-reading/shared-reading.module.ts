import { Module } from "@nestjs/common";
import { SharedReadingService } from "./shared-reading.service";
import { SharedReadingController } from "./shared-reading.controller";
import { UserGrowthModule } from "../user-growth/user-growth.module";

@Module({
  imports: [UserGrowthModule],
  controllers: [SharedReadingController],
  providers: [SharedReadingService],
  exports: [SharedReadingService],
})
export class SharedReadingModule {}
