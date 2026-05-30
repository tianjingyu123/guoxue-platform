import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { PaymentPasswordController } from "./payment-password.controller";
import { PaymentPasswordService } from "./payment-password.service";
import { PointsController } from "./points.controller";
import { PointsService } from "./points.service";
import { TeenModeController } from "./teen-mode.controller";
import { TeenModeService } from "./teen-mode.service";
import { SystemModule } from "../system/system.module";

@Module({
  imports: [SystemModule],
  controllers: [UserController, PaymentPasswordController, PointsController, TeenModeController],
  providers: [UserService, PaymentPasswordService, PointsService, TeenModeService],
  exports: [UserService, PointsService],
})
export class UserModule {}
