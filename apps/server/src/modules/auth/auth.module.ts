import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { WechatService } from "./wechat.service";
import { JwtStrategy } from "../../common/jwt.strategy";
import { SystemModule } from "../system/system.module";
import { ImModule } from "../im/im.module";
import { WebhookModule } from "../webhook/webhook.module";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || (() => { throw new Error("[Auth] JWT_SECRET 环境变量未设置，拒绝启动"); })(),
      signOptions: { expiresIn: "24h" },
    }),
    SystemModule,
    ImModule,
    WebhookModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, WechatService, JwtStrategy],
  exports: [AuthService, WechatService, JwtModule],
})
export class AuthModule {}
