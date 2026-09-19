/**
 * 通用 AI 对话接口（POST /ai/chat、POST /ai/chat/stream）的场景准入与参数边界注册表。
 *
 * ## 为什么需要它
 *
 * 这两个接口此前只有 JwtAuthGuard + 限流：
 * - `scene` 是自由字符串，任何登录用户都能指定任意场景名；
 * - `maxTokens` 无上限，是外部输入能直接放大成本的唯一入口；
 * - 省略的参数走路由默认值，而路由默认值可能超过该场景应有的边界。
 *
 * **指定任意 scene 暴露的到底是什么（口径要说准）**：拿到的是**该场景的模型路由与参数**，
 * 并让用量、预算与审计记在该场景名下。它**不会**触发该场景的知识检索、工具执行或权益发放
 * ——那些都在各自的专用接口与服务里。
 * 所以风险是：**模型路由暴露 + 成本与计量归属错配 + 绕过专用接口的限频与额度门禁**；
 * **不是**绕过了对应业务资源的数据权限。
 *
 * ## 设计原则
 *
 * 1. **默认拒绝**。不在本表内的场景一律不经此接口开放，无论调用者是否知道场景名。
 *    平台内部服务仍可直接调 `AiGatewayService`，不受本表约束——本表只管 HTTP 公开入口。
 * 2. **不自动收录源码里的 scene 字面量**。本表每一条都必须有明确的已知调用方证据，
 *    并在 `callers` 里写明；没有调用方证据的场景不进表。
 * 3. **参数边界按场景声明，不设全平台统一上限**。不同场景对应不同模型与用途，
 *    统一上限既会误伤（管理端长会话）又会放行（成本敏感场景）。
 * 4. **参数判定针对「最终生效值」**，不是只针对显式传入值：路由默认值也必须落在场景边界内。
 *    调用方传入越界 → 拒绝；路由默认值越界 → 裁剪到边界并告警（理由见
 *    `chat-scene-access.service.ts` 的类注释）。
 * 5. **每个边界都要写 `source`**。下面所有数值都是**平台侧的保守约束**，
 *    取自平台自身的路由配置与既有调用方实际取值，**不是供应商官方参数上限**。
 *    供应商官方范围本轮未核实（未联网核供应商、未调用付费模型），
 *    放宽任何一个上界之前必须先核实并在 `source` 里记录来源。
 */

/** 单个数值参数的可接受区间 */
export interface SceneParamRange {
  min: number;
  max: number;
  /** 该区间的依据，必填。评审时按此逐条核对 */
  source: string;
}

/** 输入规模上限 */
export interface SceneInputLimits {
  /** messages 条数上限 */
  maxMessages: { max: number; source: string };
  /** 单条 message.content 字符数上限 */
  maxContentChars: { max: number; source: string };
  /** 所有 message.content 合计字符数上限 */
  maxTotalContentChars: { max: number; source: string };
}

/** 场景准入方式 */
export type SceneAccess =
  /** 任何已通过 JwtAuthGuard 的用户 */
  | { kind: "authenticated" }
  /** 需要命中其中任一角色（取值与 Prisma RoleType 一致，此处故意用 string 以免引入 @prisma/client） */
  | { kind: "roles"; roles: readonly string[] };

export interface ChatSceneRule {
  access: SceneAccess;
  /** 已核实的调用方，带源码位置。没有调用方证据的场景不应出现在本表 */
  callers: readonly string[];
  input: SceneInputLimits;
  params: {
    temperature: SceneParamRange;
    topP: SceneParamRange;
    maxTokens: SceneParamRange;
  };
  /** 遗留问题、待决策项 */
  notes?: readonly string[];
}

/**
 * 经此 HTTP 接口开放的场景全集。**新增条目必须同时补 `callers` 与各 `source`。**
 */
export const PUBLIC_CHAT_SCENES: Readonly<Record<string, ChatSceneRule>> = {
  /**
   * 压测脚本使用的通用对话场景。
   * 它是本表里唯一对普通登录用户开放的场景，也是唯一让普通用户拿到"自由提示词 + 平台模型"的入口。
   */
  general_chat: {
    access: { kind: "authenticated" },
    callers: ["tests/performance/k6/main.js:357（k6 压测脚本，POST /api/v1/ai/chat）"],
    input: {
      maxMessages: {
        max: 20,
        source: "平台上下文最长的入口 zhixuan 取近 8 轮历史（zhixuan.service.ts:233），20 条留余量",
      },
      maxContentChars: {
        max: 4000,
        source: "取平台既有单条历史裁剪上限 2000（zhixuan.service.ts:235）的 2 倍作保守上界",
      },
      maxTotalContentChars: {
        max: 12000,
        source: "约为默认 maxTokens 2048（model-router.service.ts:45）的 6 倍输入预算；供应商上下文窗口未核实，取保守值",
      },
    },
    params: {
      temperature: {
        min: 0,
        max: 1,
        source: "平台各场景在用区间为 0.1–0.9（prisma/seed.ts:1232 起、model-router.service.ts:38 起），取 1.0 为保守上界；供应商官方上限待核",
      },
      topP: {
        min: 0,
        max: 1,
        source: "路由配置 topP 取 0.9（model-router.service.ts:46）；topP 是概率质量，数学上界即 1",
      },
      maxTokens: {
        min: 1,
        max: 2048,
        source: "该场景未单独配置路由，走 default.maxTokens=2048（prisma/seed.ts:1233）",
      },
    },
    notes: [
      "唯一调用方是压测脚本，不是产品路径。是否保留该场景对普通用户开放，属待决策项（见《剩余决策点》D-1）。",
    ],
  },

  /**
   * 管理端「AI 数据助手」的自然语言转 SQL。
   *
   * 它的非流式兄弟接口 /ai/data-explorer/ask 带 @Roles("SUPER_ADMIN","OPERATION_ADMIN")，
   * 而流式走的是本通用接口，此前没有任何角色校验。
   *
   * **要求角色的理由，不是"防止普通用户读数据"**：经本接口指定 scene=nl2sql 只会让模型
   * **生成 SQL 文本**，不会执行它——执行在 `/ai/data-explorer/ask` 之后的
   * `data-explorer.service.ts` 里，本来就受 @Roles 保护，且本接口根本不走那条路径。
   * 补角色要求的实际理由是三条：① 同一功能的两条路径门禁应当一致；
   * ② 成本与计量应记在真正有权使用该能力的账号上；
   * ③ 该场景的模型与参数是为管理任务配置的，不应对普通用户开放。
   */
  nl2sql: {
    access: { kind: "roles", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
    callers: [
      "apps/admin/src/views/ai/DataExplorer.vue:166（管理端页面，POST /api/v1/ai/chat/stream）",
      "对齐依据：apps/server/src/modules/ai-gateway/data-explorer.controller.ts:11-13 的 @Roles",
    ],
    input: {
      maxMessages: {
        max: 30,
        source: "管理端 ChatUI 每轮携带完整会话历史（apps/admin/src/components/ChatUI/ChatUI.vue:142-146），给管理员长会话留余量",
      },
      maxContentChars: {
        max: 4000,
        source: "同 general_chat：取 zhixuan.service.ts:235 单条裁剪上限 2000 的 2 倍",
      },
      maxTotalContentChars: {
        max: 20000,
        source: "管理端会话更长且带固定 schema 提示词（DataExplorer.vue:171-180），按 30 条 × 平均长度留余量",
      },
    },
    params: {
      temperature: {
        min: 0,
        max: 0.3,
        source: "该场景服务端内部固定取 0.1（data-explorer.service.ts:203）；上界取平台默认 temperature 0.3（model-router.service.ts:45），SQL 生成不需要高随机性",
      },
      topP: {
        min: 0,
        max: 0.9,
        source: "平台默认 topP 0.9（model-router.service.ts:46）",
      },
      maxTokens: {
        min: 1,
        max: 500,
        source: "该场景服务端内部固定取 500（data-explorer.service.ts:203）",
      },
    },
    notes: [
      "管理端目前把 maxTokens/temperature 嵌在 `options` 对象里下发（DataExplorer.vue:182），" +
        "而 ChatDto 是平铺字段，`options` 会被全局 ValidationPipe 的 whitelist 剥掉——" +
        "也就是说这两个参数从来没有生效过。本次不改前端，仅记录（见《剩余决策点》D-2）。",
    ],
  },
} as const;

/** 已核实的内部场景：有各自的专用接口与门禁，**不**经本通用接口开放。仅用于说明，不影响判定（判定一律默认拒绝）。 */
export const KNOWN_INTERNAL_SCENES: Readonly<Record<string, string>> = {
  zhixuan_chat: "POST /ai/zhixuan/chat[/stream]，门禁：JwtAuthGuard + consumeAiQuota（zhixuan.controller.ts:40,55）",
  circle_assistant: "圈主助理，门禁：圈成员/状态/过期三重校验（circle-assistant.service.ts:32-48）",
  paipan_report: "POST /paipan/report/generate，门禁：记录归属校验（paipan-report.service.ts:264）",
  classic_qa: "古籍问答，门禁：consumeAiQuota（classic.controller.ts:369）",
  classic_translate: "文言翻译，门禁：consumeAiQuota（classic.controller.ts:357）",
  classic_dictionary: "字典查询，门禁：consumeAiQuota（classic.controller.ts:345）",
  classic_companion: "古籍伴读，门禁：consumeAiQuota（classic.controller.ts:391,408）",
  customer_service: "POST /ai/customer-service[/stream]，有独立控制器",
  practitioner_report_ask: "报告问答，门禁：分享令牌 + 按报告限频 30 次/日（report-ask.service.ts:66-75）",
  "data-summary": "管理端数据解读，经 /ai/data-explorer 专用接口（data-explorer.service.ts:408）",
  "multi-agent": "多智能体编排内部场景，当前无调用方（multi-agent.service.ts:393）",
  knowledge_graph: "知识图谱抽取，内部调用",
} as const;
