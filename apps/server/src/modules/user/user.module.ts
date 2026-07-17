import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { PushAudienceService } from "./push-audience.service";
import { UserController } from "./user.controller";
import { PaymentPasswordController } from "./payment-password.controller";
import { PaymentPasswordService } from "./payment-password.service";
import { PointsController, CreationRankingsController } from "./points.controller";
import { PointsService } from "./points.service";
import { TeenModeController } from "./teen-mode.controller";
import { TeenModeService } from "./teen-mode.service";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { SystemModule } from "../system/system.module";
import { CoinModule } from "../coin/coin.module";
import { InteractionModule } from "../interaction/interaction.module";
import { CommentModule } from "../comment/comment.module";
import { AuditModule } from "../audit/audit.module";
import { SmsModule } from "../sms/sms.module";
import { SettlementModule } from "../settlement/settlement.module";
import { UserGrowthModule } from "../user-growth/user-growth.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [SystemModule, CoinModule, InteractionModule, CommentModule, AuditModule, SmsModule, SettlementModule, UserGrowthModule, AuthModule],
  // CreationRankingsController 必须置于 UserController 之前：GET users/creation-rankings 是静态段，
  // 若 users/:id 先注册会将其吞掉（Express 按注册序匹配）
  controllers: [CreationRankingsController, UserController, PaymentPasswordController, PointsController, TeenModeController, FeedbackController, WalletController],
  providers: [UserService, PushAudienceService, PaymentPasswordService, PointsService, TeenModeService, FeedbackService, WalletService],
  exports: [UserService, PointsService, PushAudienceService],
})
export class UserModule {}
