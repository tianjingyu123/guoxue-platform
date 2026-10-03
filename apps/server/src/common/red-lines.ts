import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { BusinessException } from "./business.exception";
import { ErrorCode } from "./error-codes";

/**
 * 四红线 + 合规红线（治理护栏 §2.2 · 五条不可动摇之三）
 *
 * 这五类动作**永久保留人的最终裁决**——无论自动化进化到多高（L4/L5）都不得自动执行。
 * 这不是能力不足，而是**故意的免疫机制**：正因为这五类有人守着，其余一切才敢放心自动跑。
 *
 *   MONEY            钱：退款 / 分佣 / 提现 / 改价
 *   USER_DATA        用户数据：删 / 改 / 导出
 *   EXTERNAL_PUBLISH 对外发布：内容 / 推送 / 公告
 *   IRREVERSIBLE     不可逆：删库 / 删用户 / DROP
 *   COMPLIANCE       合规：传销两级 / 杀熟 / 命理数据聚合 / 占卜类目
 */
export enum RedLine {
  MONEY = "MONEY",
  USER_DATA = "USER_DATA",
  EXTERNAL_PUBLISH = "EXTERNAL_PUBLISH",
  IRREVERSIBLE = "IRREVERSIBLE",
  COMPLIANCE = "COMPLIANCE",
}

export interface RedLineMeta {
  label: string;
  desc: string;
  examples: string[];
}

export const RED_LINE_META: Record<RedLine, RedLineMeta> = {
  [RedLine.MONEY]: {
    label: "钱",
    desc: "任何触碰资金流的动作",
    examples: ["退款", "分佣", "提现", "改价"],
  },
  [RedLine.USER_DATA]: {
    label: "用户数据",
    desc: "对用户数据的写/导出",
    examples: ["删用户数据", "改用户数据", "导出用户数据"],
  },
  [RedLine.EXTERNAL_PUBLISH]: {
    label: "对外发布",
    desc: "面向用户/公众的对外触达",
    examples: ["发布内容", "推送消息", "发公告"],
  },
  [RedLine.IRREVERSIBLE]: {
    label: "不可逆",
    desc: "无法回滚的破坏性操作",
    examples: ["删库", "删用户", "DROP 表"],
  },
  [RedLine.COMPLIANCE]: {
    label: "合规",
    desc: "触碰合规红线的动作",
    examples: ["传销两级返佣", "价格杀熟", "命理数据聚合", "占卜类目"],
  },
};

/** 执行者类型：自动化（含 Claude 数字员工/内部 cron）或真人 */
export type ExecutorType = "AUTOMATION" | "HUMAN";

/**
 * 从 HTTP 请求判定执行者类型。
 * - 显式头 `x-executor-type: CLAUDE|AUTOMATION` → 自动化（Claude 对自己的 API 调用如实标记）
 * - 登录身份带数字员工标记 → 自动化
 * - 其余（普通管理员 JWT）→ 真人
 *
 * 默认真人，保证正常管理员操作不受影响；红线闸只拦"如实标记的自动化"与"数字员工身份"。
 */
export function resolveExecutorType(req: {
  headers?: Record<string, unknown>;
  user?: unknown;
}): ExecutorType {
  const raw = req?.headers?.["x-executor-type"];
  const header = (Array.isArray(raw) ? raw[0] : raw)?.toString().toUpperCase() ?? "";
  if (header === "CLAUDE" || header === "AUTOMATION" || header === "BOT") return "AUTOMATION";
  const user = req?.user as { isDigitalEmployee?: boolean; automationRole?: string } | undefined;
  if (user?.isDigitalEmployee || user?.automationRole === "DIGITAL_EMPLOYEE") {
    return "AUTOMATION";
  }
  return "HUMAN";
}

/**
 * 服务/任务层红线断言：执行者若为自动化，触碰任一红线即拒绝（永久人工闸）。
 * cron/ops 自动执行路径（不经 HTTP 守卫）用它兜底。
 */
export function assertHumanForRedLine(executor: ExecutorType, lines: RedLine[]): void {
  if (executor === "AUTOMATION" && lines.length > 0) {
    const names = lines.map((l) => RED_LINE_META[l].label).join("/");
    throw new BusinessException(
      ErrorCode.RED_LINE_HUMAN_ONLY,
      `触碰红线（${names}）须由真人执行，自动化永久禁止`,
    );
  }
}

// ─────────────────────────────────────────────────
// @RedLineGate(...RedLine[]) + RedLineGuard —— HTTP 层硬闸
// 标了红线的端点：执行者为自动化 → 永久 403（不受一键接管开关影响，红线是硬编码人工闸）。
// ─────────────────────────────────────────────────

export const RED_LINE_KEY = "red_line";

export const RedLineGate = (...lines: RedLine[]) => SetMetadata(RED_LINE_KEY, lines);

@Injectable()
export class RedLineGuard implements CanActivate {
  private readonly logger = new Logger(RedLineGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const lines = this.reflector.getAllAndOverride<RedLine[]>(RED_LINE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!lines || lines.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const executor = resolveExecutorType(req);
    if (executor === "AUTOMATION") {
      const names = lines.map((l) => RED_LINE_META[l].label).join("/");
      this.logger.warn(`红线拦截：自动化尝试 ${req?.method} ${req?.url}（${names}）`);
      throw new BusinessException(
        ErrorCode.RED_LINE_HUMAN_ONLY,
        `该操作触碰红线（${names}），须由真人执行，自动化永久禁止`,
      );
    }
    return true;
  }
}
