import { Module } from "@nestjs/common";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";
import { ScheduleService } from "./schedule.service";
import { TagController } from "./tag.controller";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { SystemModule } from "../system/system.module";
import { RedisModule } from "../../redis/redis.module";
import { WebhookModule } from "../webhook/webhook.module";

@Module({
  imports: [SystemModule, RedisModule, WebhookModule],
  controllers: [ContentController, TagController],
  providers: [ContentService, ScheduleService, ActiveUserGuard, StationIsolationGuard],
  exports: [ContentService],
})
export class ContentModule {}
