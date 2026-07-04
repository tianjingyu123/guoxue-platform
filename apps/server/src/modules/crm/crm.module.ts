import { Module } from "@nestjs/common";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { CrmService } from "./crm.service";
import { InsightService } from "./insight.service";
import { CrmController } from "./crm.controller";

/** 课-P3 客户经营 CRM（服务环·从业者私有客户簿+提醒+RFM 分层）+ 课-P4 经营洞察（R3 统计聚合） */
@Module({
  imports: [AiGatewayModule],
  controllers: [CrmController],
  providers: [CrmService, InsightService],
  exports: [CrmService, InsightService],
})
export class CrmModule {}
