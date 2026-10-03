import { AutonomyLevel } from "../../common/autonomy";
import { RedLine } from "../../common/red-lines";

/**
 * 运维动作白名单（后台管理自动化·M3-1 一键化试点 · 护栏底座第一个真实客户）
 *
 * 每个动作 = 一个「安全可逆的运营配置调整」，经护栏执行：
 *   分级标注(@Autonomy) → 受一键接管开关约束 → 红线断言 → 写审计快照 → 可一键回滚。
 *
 * 🔴 故意排除的红线配置（永不进白名单，见 red-lines.ts）：
 *   分佣比例 commission_*_rate / 会员价 member_*_price / 提现额 withdraw* /
 *   商家保证金 merchant_deposit_* / 直播抽成 live_gift_commission / 充值比率 coin_recharge_rate。
 *   —— 这些碰「钱」，无论多自动都必须真人拍板。白名单只收安全可逆的运营开关。
 */
export interface OpsActionDef {
  /** 动作标识（URL/审计用） */
  key: string;
  /** 中文动作名 */
  label: string;
  /** 目标配置项 */
  configKey: string;
  /** 自主档位（本批均 L2：人点一下、AI 执行、带回滚） */
  autonomyLevel: AutonomyLevel;
  /** 触碰的红线（本批均为空 —— 白名单只收非红线动作） */
  redLines: RedLine[];
  /** 值域说明（给前端/董事长看） */
  hint: string;
  /** 入参校验：返回错误消息则拒绝，null 通过 */
  validate: (value: string) => string | null;
}

const boolValidator = (v: string) => (["true", "false"].includes(v) ? null : "只能是 true 或 false");
const intRange = (min: number, max: number) => (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n)) return "必须是整数";
  if (n < min || n > max) return `必须在 ${min} ~ ${max} 之间`;
  return null;
};
const enumValidator = (allowed: string[]) => (v: string) => (allowed.includes(v) ? null : `只能是 ${allowed.join(" / ")}`);

export const OPS_ACTIONS: OpsActionDef[] = [
  {
    key: "maintenance_mode",
    label: "维护模式",
    configKey: "maintenance_mode",
    autonomyLevel: AutonomyLevel.L2_ONE_CLICK,
    redLines: [],
    hint: "true=开启维护模式（前台只读/停服提示），false=关闭",
    validate: boolValidator,
  },
  {
    key: "content_audit_auto",
    label: "内容自动审核开关",
    configKey: "content_audit_auto",
    autonomyLevel: AutonomyLevel.L2_ONE_CLICK,
    redLines: [],
    hint: "true=开启自动审核，false=转人工",
    validate: boolValidator,
  },
  {
    key: "content_audit_mode",
    label: "内容审核模式",
    configKey: "content_audit_mode",
    autonomyLevel: AutonomyLevel.L2_ONE_CLICK,
    redLines: [],
    hint: "PRE=先审后发，POST=先发后审",
    validate: enumValidator(["PRE", "POST"]),
  },
  {
    key: "ai_daily_free_limit",
    label: "每日免费AI分析次数",
    configKey: "ai_daily_free_limit",
    autonomyLevel: AutonomyLevel.L2_ONE_CLICK,
    redLines: [],
    hint: "每个用户每日免费 AI 次数，0 ~ 100",
    validate: intRange(0, 100),
  },
  {
    key: "sms_daily_limit",
    label: "每日短信验证码上限",
    configKey: "sms_daily_limit",
    autonomyLevel: AutonomyLevel.L2_ONE_CLICK,
    redLines: [],
    hint: "每手机号每日短信上限，0 ~ 20",
    validate: intRange(0, 20),
  },
];

export function findOpsAction(key: string): OpsActionDef | undefined {
  return OPS_ACTIONS.find((a) => a.key === key);
}
