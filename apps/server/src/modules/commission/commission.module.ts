import { Module } from "@nestjs/common";
import { CommissionController } from "./commission.controller";
import { CommissionService } from "./commission.service";
import { ChannelClickService } from "./channel-click.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { WebhookModule } from "../webhook/webhook.module";
import { SystemModule } from "../system/system.module";
import { FundApprovalCoreModule } from "../fund-approval/fund-approval-core.module";
import { SettlementModule } from "../settlement/settlement.module";
import { UserGrowthModule } from "../user-growth/user-growth.module";

@Module({
  imports: [PrismaModule, WebhookModule, SystemModule, FundApprovalCoreModule, SettlementModule, UserGrowthModule],
  controllers: [CommissionController],
  providers: [CommissionService, ChannelClickService, ActiveUserGuard],
  exports: [CommissionService, ChannelClickService],
})
export class CommissionModule {}
