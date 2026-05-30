import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
import { WechatService } from "./wechat.service";
import { JwtStrategy } from "../../common/jwt.strategy";
import { StationAccessGuard } from "../../common/station-access.guard";
import { MemberGuard } from "../../common/member.guard";
import { SystemModule } from "../system/system.module";
import { ImModule } from "../im/im.module";
import { WebhookModule } from "../webhook/webhook.module";
import { SmsModule } from "../sms/sms.module";
import { serverConfig } from "../../config/server-config";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: serverConfig.jwtSecret,
      signOptions: { expiresIn: "24h" },
    }),
    SystemModule,
    ImModule,
    WebhookModule,
    SmsModule,
  ],
  controllers: [AuthController, AccountController],
  providers: [AuthService, AccountService, WechatService, JwtStrategy, StationAccessGuard, MemberGuard],
  exports: [AuthService, WechatService, JwtModule],
})
export class AuthModule {}
