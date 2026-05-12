import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../redis/redis.module";
import { FeatureFlagModule } from "../feature-flag/feature-flag.module";
import { NotificationModule } from "../notification/notification.module";
import { SystemModule } from "../system/system.module";
import { ShopModule } from "../shop/shop.module";
import { CommissionModule } from "../commission/commission.module";
import { MerchantService } from "./merchant.service";
import { MerchantDepositService } from "./merchant-deposit.service";
import { MerchantAgreementService } from "./merchant-agreement.service";
import { MerchantSettlementService } from "./merchant-settlement.service";
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
    forwardRef(() => ShopModule),
    CommissionModule,
  ],
  controllers: [MerchantController, MerchantBackendController, MerchantAdminController],
  providers: [MerchantService, MerchantDepositService, MerchantAgreementService, MerchantSettlementService, MerchantGuard],
  exports: [MerchantService, MerchantDepositService, MerchantSettlementService],
})
export class MerchantModule {}
