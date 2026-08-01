import { Module } from "@nestjs/common";
import { PractitionerService } from "./practitioner.service";
import { ReportAiService } from "./report-ai.service";
import { PractitionerController } from "./practitioner.controller";

/**
 * 从业者工作台（V0 还原 · 批次4）
 * 客户档案复用 CrmModule 的 ClientBook，本模块不重复建客户表。
 */
@Module({
  controllers: [PractitionerController],
  providers: [PractitionerService, ReportAiService],
  exports: [PractitionerService],
})
export class PractitionerModule {}
