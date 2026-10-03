import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CollaborationService } from "../ai-gateway/collaboration.service";
import { InspectionService } from "./inspection.service";

export const INSPECTION_HANDLER_KEY = "ops.run_inspection";

/**
 * 首个真实协作执行器：只诊断、建人工待办、保存报告，不改资金、内容或运行配置。
 * 不接受任意脚本/URL/目标；没有业务变更可撤销，因此不伪造 rollback 能力。
 * 日常白名单修复仍归原巡检调度和 automation_enabled 管理，不在协作入口扩权。
 */
@Injectable()
export class CollaborationInspectionService implements OnModuleInit, OnModuleDestroy {
  private unregister?: () => void;

  constructor(
    private readonly collaboration: CollaborationService,
    private readonly inspection: InspectionService,
  ) {}

  onModuleInit(): void {
    this.unregister = this.collaboration.registerActionHandler(INSPECTION_HANDLER_KEY, {
      execute: async (proposal) => {
        const plan = proposal.executionPlan;
        if (
          proposal.riskLevel !== "low" ||
          !plan ||
          typeof plan !== "object" ||
          Array.isArray(plan) ||
          (plan as Record<string, unknown>).handlerKey !== INSPECTION_HANDLER_KEY ||
          Object.keys(plan).some((key) => key !== "handlerKey")
        ) {
          throw new BusinessException(
            ErrorCode.BAD_REQUEST,
            "安全巡检执行器只接受低风险、无额外参数的巡检计划",
          );
        }
        const report = await this.inspection.runInspection("MANUAL", { allowAutoFix: false });
        if (!report.reportTaskId) {
          throw new BusinessException(
            ErrorCode.INTERNAL_ERROR,
            "巡检报告未成功留存，不能标记协作已完成",
          );
        }
        return {
          mode: "diagnostic_only",
          reportTaskId: report.reportTaskId,
          date: report.date,
          anomalies: report.anomalies,
          tasksCreated: report.tasksCreated,
          autoFixed: report.autoFixed,
          requiresHumanReview: report.anomalies > 0,
          // 仅保存检查状态和证据标识，不复制底层异常、订单或连接信息。
          checks: report.items.map(({ key, status }) => ({ key, status })),
        };
      },
    });
  }

  onModuleDestroy(): void {
    this.unregister?.();
  }
}
