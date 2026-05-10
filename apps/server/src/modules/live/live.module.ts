import { Module } from "@nestjs/common";
import { LiveService } from "./live.service";
import { LiveStreamService } from "./live-stream.service";
import { LiveController } from "./live.controller";
import { WebhookModule } from "../webhook/webhook.module";

@Module({
  imports: [WebhookModule],
  controllers: [LiveController],
  providers: [LiveService, LiveStreamService],
  exports: [LiveService, LiveStreamService],
})
export class LiveModule {}
