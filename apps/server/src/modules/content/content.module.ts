import { Module } from "@nestjs/common";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";
import { SystemModule } from "../system/system.module";
import { RedisModule } from "../../redis/redis.module";
import { WebhookModule } from "../webhook/webhook.module";

@Module({
  imports: [SystemModule, RedisModule, WebhookModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
