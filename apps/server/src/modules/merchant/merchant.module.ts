import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../redis/redis.module";
import { FeatureFlagModule } from "../feature-flag/feature-flag.module";
import { NotificationModule } from "../notification/notification.module";
import { SystemModule } from "../system/system.module";
import { ShopModule } from "../shop/shop.module";
import { CommissionModule } from "../commission/commission.module";
import { AuditModule } from "../audit/audit.module";
import { MerchantService } from "./merchant.service";
import { MerchantDepositService } from "./merchant-deposit.service";
import { MerchantAgreementService } from "./merchant-agreement.service";
import { MerchantSettlementService } from "./merchant-settlement.service";
import { MerchantMetricService } from "./merchant-metric.service";
import { MerchantCreditService } from "./merchant-credit.service";
import { MerchantPunishmentService } from "./merchant-punishment.service";
import { MerchantInventoryService } from "./merchant-inventory.service";
import { MerchantShippingService } from "./merchant-shipping.service";
import { MerchantGuard } from "./merchant.guard";
import { MerchantController } from "./merchant.controller";
import { MerchantBackendController } from "./merchant-backend.controller";
import { MerchantAdminController } from "./merchant-admin.controller";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    FeatureFlagModule,
    NotificationModule,
    SystemModule,
    ShopModule,
    CommissionModule,
    AuditModule,
  ],
  controllers: [MerchantController, MerchantBackendController, MerchantAdminController],
  providers: [MerchantService, MerchantDepositService, MerchantAgreementService, MerchantSettlementService, MerchantMetricService, MerchantCreditService, MerchantPunishmentService, MerchantInventoryService, MerchantShippingService, MerchantGuard],
  exports: [MerchantService, MerchantDepositService, MerchantSettlementService, MerchantMetricService, MerchantCreditService, MerchantPunishmentService],
})
export class MerchantModule {}
