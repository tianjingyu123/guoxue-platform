/**
 * 圈子治理常量与纯函数（待办 #8-#14）。
 * - 权限矩阵默认位（取自 V0 circle-admin-roles 设计稿矩阵·锁定项硬编码仅圈主）
 * - 官方圈规模板（V0 circle-admin-rules·一键套用不覆盖手改项）
 * - 治理阶梯默认参数（警告 90 天清零 / 满 3 次禁言 7 天 / 申诉 72h 窗口 48h 答复）
 */

/** 可被授权的管理角色（成员/义工不进矩阵；圈主恒全权） */
export type ManagedRole = "ADMIN" | "PARTNER" | "GUEST";
export const MANAGED_ROLES: ManagedRole[] = ["ADMIN", "PARTNER", "GUEST"];

export interface CirclePermissionMeta {
  key: string;
  label: string;
  group: string;
  /** 锁定项：仅圈主可操作，不可授予（资金/移出·设计稿金锁） */
  locked?: boolean;
  defaults: Record<ManagedRole, boolean>;
}

/** 权限矩阵定义（顺序即展示顺序·与设计稿一致） */
export const CIRCLE_PERMISSIONS: CirclePermissionMeta[] = [
  { key: "content.moderate", label: "删帖 / 折叠", group: "内容治理", defaults: { ADMIN: true, PARTNER: true, GUEST: false } },
  { key: "content.pin", label: "置顶 / 加精", group: "内容治理", defaults: { ADMIN: true, PARTNER: true, GUEST: true } },
  { key: "content.review", label: "发布审核", group: "内容治理", defaults: { ADMIN: true, PARTNER: true, GUEST: false } },
  { key: "member.discipline", label: "警告 / 禁言", group: "成员治理", defaults: { ADMIN: true, PARTNER: false, GUEST: false } },
  { key: "member.remove", label: "移出圈子", group: "成员治理", locked: true, defaults: { ADMIN: false, PARTNER: false, GUEST: false } },
  { key: "member.approve", label: "审批加入申请", group: "成员治理", defaults: { ADMIN: true, PARTNER: false, GUEST: false } },
  { key: "announcement.manage", label: "公告管理", group: "圈务", defaults: { ADMIN: true, PARTNER: true, GUEST: false } },
  { key: "knowledge.manage", label: "知识库管理", group: "圈务", defaults: { ADMIN: true, PARTNER: true, GUEST: false } },
  { key: "funds.manage", label: "退款审核 / 分账调整 / 收益提现", group: "资金相关", locked: true, defaults: { ADMIN: false, PARTNER: false, GUEST: false } },
];

export type RolePermissionOverrides = Partial<Record<ManagedRole, Record<string, boolean>>>;

/**
 * 解析某角色是否拥有某权限位。
 * 铁律：圈主恒 true；锁定项（资金/移出）对非圈主恒 false（不可被 overrides 抬升）；
 * 其余按 overrides 覆盖，缺省回落设计稿默认位。
 */
export function resolvePermission(
  role: string,
  key: string,
  overrides?: RolePermissionOverrides | null,
): boolean {
  if (role === "OWNER") return true;
  const meta = CIRCLE_PERMISSIONS.find((p) => p.key === key);
  if (!meta) return false;
  if (meta.locked) return false;
  if (!MANAGED_ROLES.includes(role as ManagedRole)) return false;
  const managed = role as ManagedRole;
  const override = overrides?.[managed]?.[key];
  return typeof override === "boolean" ? override : meta.defaults[managed];
}

/** 官方圈规模板（#14·templateKey 幂等·套用不覆盖 editedAt 非空的条目） */
export const OFFICIAL_RULE_TEMPLATE: { key: string; text: string }[] = [
  { key: "official-1", text: "友善交流，不进行人身攻击与地域歧视" },
  { key: "official-2", text: "禁止发布广告、外部引流及无关链接" },
  { key: "official-3", text: "尊重原创，转载请注明出处" },
  { key: "official-4", text: "提问请附必要背景信息，涉及隐私请自行打码" },
  { key: "official-5", text: "圈内课程与资料仅限本圈学习，禁止外传" },
  { key: "official-6", text: "遵守法律法规，禁止发布违法违规内容" },
];

/** 禁言可选天数（设计稿：1/3/7/30） */
export const MUTE_DAY_OPTIONS = [1, 3, 7, 30];
/** 处理后可申诉窗口（小时） */
export const APPEAL_WINDOW_HOURS = 72;
/** 平台仲裁答复承诺（小时·超时按承诺自动撤销处理） */
export const APPEAL_REPLY_HOURS = 48;
/** 自动升级/超时裁决的操作者标记 */
export const SYSTEM_OPERATOR = "system";

/** 治理配置默认值（未落库时的生效值·与 schema 默认一致） */
export const DEFAULT_GOVERNANCE_CONFIG = {
  requireRuleAck: true,
  warningThreshold: 3,
  warningResetDays: 90,
  muteDays: 7,
  removeBanRejoin: true,
  newMemberReviewEnabled: false,
  newMemberReviewDays: 7,
  sensitiveWordsEnabled: true,
  sensitiveWords: [] as string[],
  postIntervalSeconds: 0,
  reportAutoHideEnabled: true,
  reportAutoHideThreshold: 3,
  rolePermissions: null as RolePermissionOverrides | null,
};

export type EffectiveGovernanceConfig = typeof DEFAULT_GOVERNANCE_CONFIG;
