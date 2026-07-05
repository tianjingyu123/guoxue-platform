import { Module } from "@nestjs/common";
import { SentinelService } from "./sentinel.service";

/** 业务哨兵模块（O-T1）：8 条业务规则巡检+告警去重+站内信/webhook 通知 */
@Module({
  providers: [SentinelService],
  exports: [SentinelService],
})
export class SentinelModule {}
