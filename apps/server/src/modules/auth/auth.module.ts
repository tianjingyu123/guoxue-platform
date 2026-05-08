import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { WechatService } from "./wechat.service";
import { JwtStrategy } from "../../common/jwt.strategy";
import { SystemModule } from "../system/system.module";
import { ImModule } from "../im/im.module";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "guoxue-dev-secret",
      signOptions: { expiresIn: "24h" },
    }),
    SystemModule,
    ImModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, WechatService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
