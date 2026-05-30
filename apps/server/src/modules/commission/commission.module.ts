import { Module } from "@nestjs/common";
import { CommissionController } from "./commission.controller";
import { CommissionService } from "./commission.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { WebhookModule } from "../webhook/webhook.module";
import { SystemModule } from "../system/system.module";

@Module({
  imports: [PrismaModule, WebhookModule, SystemModule],
  controllers: [CommissionController],
  providers: [CommissionService, ActiveUserGuard],
  exports: [CommissionService],
})
export class CommissionModule {}
