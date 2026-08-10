import { Module } from "@nestjs/common";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { RedisModule } from "../../redis/redis.module";
import { AppleIapController } from "./apple-iap.controller";
import { AppleIapService } from "./apple-iap.service";

@Module({
  imports: [RedisModule],
  controllers: [AppleIapController],
  providers: [AppleIapService, ActiveUserGuard],
  exports: [AppleIapService],
})
export class AppleIapModule {}
