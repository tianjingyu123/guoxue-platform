import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { PaymentPasswordController } from "./payment-password.controller";
import { PaymentPasswordService } from "./payment-password.service";
import { PointsController } from "./points.controller";
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

@Module({
  imports: [SystemModule, CoinModule, InteractionModule, CommentModule, AuditModule, SmsModule, SettlementModule],
  controllers: [UserController, PaymentPasswordController, PointsController, TeenModeController, FeedbackController, WalletController],
  providers: [UserService, PaymentPasswordService, PointsService, TeenModeService, FeedbackService, WalletService],
  exports: [UserService, PointsService],
})
export class UserModule {}
