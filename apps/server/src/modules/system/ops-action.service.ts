import { Injectable, Logger } from "@nestjs/common";
import { SystemService } from "./system.service";
import { OPS_ACTIONS, findOpsAction, OpsActionDef } from "./ops-action.registry";
import { AUTONOMY_META } from "../../common/autonomy";
import { assertHumanForRedLine, ExecutorType, RED_LINE_META } from "../../common/red-lines";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 运维动作中心（后台管理自动化·M3-1 一键化试点）
 *
 * 护栏底座的第一个真实客户：把白名单内「安全可逆的运营配置调整」做成一键动作，
 * 全程走 分级 → 接管开关 → 红线断言 → 审计快照 → 可回滚。
 */
@Injectable()
export class OpsActionService {
  private readonly logger = new Logger(OpsActionService.name);

  constructor(private readonly system: SystemService) {}

  /** 列出所有可用运维动作 + 当前值 + 档位说明（供后台面板渲染） */
  async listActions() {
    const items = await Promise.all(
      OPS_ACTIONS.map(async (a) => {
        const cfg = await this.system.getConfig(a.configKey).catch(() => null);
        return {
          key: a.key,
          label: a.label,
          configKey: a.configKey,
          currentValue: cfg?.configValue ?? null,
          autonomyLevel: a.autonomyLevel,
          autonomyLabel: AUTONOMY_META[a.autonomyLevel].label,
          redLines: a.redLines.map((r) => RED_LINE_META[r].label),
          hint: a.hint,
        };
      }),
    );
    return { total: items.length, items };
  }

  /**
   * 执行一个运维动作（L2 一键·带回滚）。
   * @param actionKey  白名单动作标识
   * @param value      新值（经动作自带 validator 校验）
   * @param executor   执行者标识（"CLAUDE" / 用户名）
   * @param executorType 执行者类型（红线断言用）
   */
  async execute(actionKey: string, value: string, executor: string, executorType: ExecutorType) {
    const action = findOpsAction(actionKey);
    if (!action) {
      throw new BusinessException(ErrorCode.NOT_FOUND, `未注册的运维动作：${actionKey}（仅白名单动作可一键执行）`);
    }

    // 红线断言：白名单动作均非红线，但保留这道闸 —— 未来若误把红线配置加进白名单，自动化在此被拦。
    assertHumanForRedLine(executorType, action.redLines);

    const v = String(value ?? "").trim();
    const err = action.validate(v);
    if (err) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `「${action.label}」取值非法：${err}`);
    }

    // 走护栏回滚入口：写快照审计（rollbackData），返回 auditId 供一键回滚
    const res = await this.system.setConfigWithRollback(
      action.configKey,
      v,
      `运维动作「${action.label}」— ${executor}`,
      executor,
      action.autonomyLevel,
    );

    this.logger.log(`运维动作执行：${action.key}=${v}（执行者 ${executor}/${executorType}，审计 ${res.auditId}）`);
    return {
      action: action.key,
      label: action.label,
      value: v,
      previousValue: res.previousValue,
      autonomyLevel: action.autonomyLevel,
      auditId: res.auditId, // 可用 POST /system/automation/rollback/:auditId 一键回滚
      rollbackable: true,
    };
  }
}
