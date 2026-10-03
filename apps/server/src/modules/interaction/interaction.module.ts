import { Module } from "@nestjs/common";
import { InteractionService } from "./interaction.service";
import { InteractionController } from "./interaction.controller";
import { NotificationModule } from "../notification/notification.module";

@Module({
  // NotificationModule：举报满阈值自动隐藏后通知圈主（治理 TODO#3）
  imports: [NotificationModule],
  controllers: [InteractionController],
  providers: [InteractionService],
  exports: [InteractionService],
})
export class InteractionModule {}
