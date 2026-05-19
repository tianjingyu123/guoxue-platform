import { Module } from "@nestjs/common";
import { SmsService } from "./sms.service";
import { SmsController } from "./sms.controller";
import { RedisModule } from "../../redis/redis.module";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [RedisModule, PrismaModule],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
