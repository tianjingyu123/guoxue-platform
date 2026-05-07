import { Module } from "@nestjs/common";
import { StationService } from "./station.service";
import { StationController } from "./station.controller";
import { RedisModule } from "../../redis/redis.module";

@Module({
  imports: [RedisModule],
  controllers: [StationController],
  providers: [StationService],
  exports: [StationService],
})
export class StationModule {}
