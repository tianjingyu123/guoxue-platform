import { Module } from "@nestjs/common";
import { StationPickService } from "./station-pick.service";
import { StationPickController } from "./station-pick.controller";

@Module({
  controllers: [StationPickController],
  providers: [StationPickService],
  exports: [StationPickService],
})
export class StationPickModule {}
