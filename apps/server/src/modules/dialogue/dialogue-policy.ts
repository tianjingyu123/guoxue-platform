/**
 * 小卜对话统一策略（2026-09-17 决策人指示）
 *
 * 三层作答逻辑，所有对话场景共用（报告问答 / 古籍伴读 / 圈主助理 / 广场智能体）：
 *
 * 1. **知识库优先**：命中审核过的条目时，依据条目作答并标注编号。
 * 2. **模型兜底**：知识库暂未覆盖时允许模型用通用知识回答，避免前期知识库不全拖累体验；
 *    但**必须向用户标明这是通用解释、平台暂无审核依据**，且绝不虚构书名原文出处。
 *    （兜底不标明会毁掉「有出处」这块招牌——标明反而让用户更信任哪些内容是有依据的。）
 * 3. **超范围转介**：问题不属于本场景职责时，不硬答，也不敷衍，而是先给力所能及的帮助，
 *    再引导到平台更合适的工具、智能体或专业服务。
 *    这样既避免用户绕开付费服务白嫖完整解读，也真正把用户送到更专业的地方。
 */

import { personaOfIntent, personaOfScene, personaPrompt } from "./dialogue-personas";

export type AnswerSource = "kb" | "model" | "referral";

export interface ReferralTarget {
  label: string;
  /** 真实页面路径（已与 apps/mobile/src/pages.json 核对） */
  path: string;
  kind: "tool" | "service" | "agent";
  /** 是否属于付费/专业服务：对话中不得免费替代其完整交付 */
  paid: boolean;
}

export interface ReferralRule {
  intent: string;
  patterns: RegExp[];
  target: ReferralTarget;
  /** 给模型的引导要点（模型据此组织语言，不是死板模板） */
  hint: string;
}

export interface ScenePolicy {
  scene: string;
  label: string;
  /** 本场景负责什么 */
  covers: string;
  /** 明确不负责什么 */
  outOfScope: string;
  /** 知识库不足时是否允许模型兜底 */
  allowModelFallback: boolean;
  referrals: ReferralRule[];
  /**
   * 圈子优先：该场景的助理由圈主付费供养，转介必须先看圈内资源，
   * 且不得把成员导向与圈主构成竞争的对象（平台其他老师、其他圈子）。
   */
  circleFirst?: boolean;
}

// ── 转介目标（路径与 pages.json 一致）──
const T = {
  bazi: { label: "八字排盘", path: "/pkg-paipan/bazi/index", kind: "tool", paid: true } as ReferralTarget,
  ziwei: { label: "紫微斗数", path: "/pkg-paipan/ziwei/index", kind: "tool", paid: true } as ReferralTarget,
  liuyao: { label: "六爻起卦", path: "/pkg-paipan2/liuyao/index", kind: "tool", paid: true } as ReferralTarget,
  meihua: { label: "梅花易数", path: "/pkg-paipan/meihua/index", kind: "tool", paid: true } as ReferralTarget,
  qimen: { label: "奇门遁甲", path: "/pkg-paipan/qimen/index", kind: "tool", paid: true } as ReferralTarget,
  daliuren: { label: "大六壬", path: "/pkg-paipan/daliuren/index", kind: "tool", paid: true } as ReferralTarget,
  hehun: { label: "八字合婚", path: "/pkg-paipan/hepan/index", kind: "tool", paid: true } as ReferralTarget,
  fengshui: { label: "玄空飞星风水", path: "/pkg-paipan/xuankong/index", kind: "tool", paid: true } as ReferralTarget,
  bazhai: { label: "八宅风水", path: "/pkg-paipan3/bazhai/index", kind: "tool", paid: true } as ReferralTarget,
  qiming: { label: "起名", path: "/pkg-paipan2/qiming/index", kind: "tool", paid: true } as ReferralTarget,
  xingming: { label: "姓名解析", path: "/pkg-paipan2/xingming/index", kind: "tool", paid: true } as ReferralTarget,
  zeri: { label: "万年历择吉", path: "/pkg-paipan/wannianli/index", kind: "tool", paid: false } as ReferralTarget,
  paipanHome: { label: "排盘工具", path: "/pages/paipan/index", kind: "tool", paid: true } as ReferralTarget,
  expert: { label: "专业老师咨询", path: "/pkg-circle/circles/consult-experts", kind: "service", paid: true } as ReferralTarget,
  classics: { label: "古籍阅读", path: "/pkg-classics/reader/index", kind: "tool", paid: false } as ReferralTarget,
};

/** 排盘类请求：所有非排盘场景共用这组转介规则 */
const PAIPAN_REFERRALS: ReferralRule[] = [
  {
    intent: "ziwei_reading",
    patterns: [/紫微/, /斗数/],
    target: T.ziwei,
    hint: "紫微斗数需要按生辰起十二宫命盘才能谈",
  },
  {
    intent: "hehun",
    patterns: [/合婚/, /合一?下?八字/, /我(和|跟).{0,6}(合不合|配不配|般配)/, /(合不合适|配不配).{0,4}(结婚|在一起)/],
    target: T.hehun,
    hint: "合婚要两个人的盘对看，单凭聊天说不了",
  },
  {
    intent: "bazi_reading",
    patterns: [
      /看.{0,4}八字/, /算.{0,2}命/, /批.{0,2}命/, /我的?命(怎么样|如何|好不好)/,
      /(帮|给).{0,4}(看看|算算|排).{0,6}(八字|命|盘)/, /排.{0,2}盘/,
      /我.{0,6}(运势|财运|事业运|姻缘|婚姻)(怎么样|如何|好不好)/,
      /生辰八字/, /我是\d{4}年.{0,12}(出生|生的)/,
    ],
    target: T.bazi,
    hint: "八字要先按出生时间排盘、校真太阳时，才谈得上解读",
  },
  {
    intent: "divination",
    patterns: [/起一?卦/, /占一?卦/, /算一?卦/, /六爻/, /梅花易数/, /摇卦/, /测一下.{0,6}(能不能|会不会)/],
    target: T.liuyao,
    hint: "占卦要按时间起卦、装卦取用神",
  },
  {
    intent: "qimen",
    patterns: [/奇门/, /遁甲/],
    target: T.qimen,
    hint: "奇门要按时辰起局",
  },
  {
    intent: "liuren",
    patterns: [/六壬/, /金口诀/],
    target: T.daliuren,
    hint: "六壬要按时辰起四课三传",
  },
  {
    intent: "fengshui",
    patterns: [/风水/, /(房子|住宅|办公室|店铺).{0,6}(朝向|方位|布局|好不好)/, /玄空/, /飞星/, /八宅/, /罗盘/],
    target: T.fengshui,
    hint: "风水要知道坐向与元运，还要看实际格局",
  },
  {
    intent: "naming",
    patterns: [/起名/, /取名/, /改名/, /名字.{0,6}(好不好|怎么样|打分)/],
    target: T.qiming,
    hint: "起名要结合八字喜忌与字义音形",
  },
  {
    intent: "zeri",
    patterns: [/择日/, /看.{0,4}(日子|吉日)/, /哪天.{0,6}(适合|好)/, /黄道吉日/],
    target: T.zeri,
    hint: "择日要按事项与当事人八字挑日子",
  },
  {
    intent: "expert_consult",
    patterns: [/找.{0,4}(老师|大师|师傅)/, /真人.{0,4}(咨询|看)/, /一对一/, /预约.{0,4}老师/],
    target: T.expert,
    hint: "复杂或私人的问题，平台有可预约的专业老师",
  },
];

export const SCENE_POLICIES: Record<string, ScenePolicy> = {
  classic_companion: {
    scene: "classic_companion",
    label: "古籍伴读",
    covers: "所读古籍的字词训诂、文义脉络、典故出处、义理阐发，以及与其他典籍的关联",
    outOfScope: "为用户本人排盘算命、看风水、起名、择日、预测具体吉凶",
    allowModelFallback: true,
    referrals: PAIPAN_REFERRALS,
  },
  paipan_report_dialogue: {
    scene: "paipan_report_dialogue",
    label: "报告问答",
    covers: "本份报告的盘面事实、术语含义、门派依据、章节内容，以及基于本报告的延伸解释",
    outOfScope: "改动盘面、为其他人或其他工具另起一盘、替代真人咨询",
    allowModelFallback: true,
    referrals: PAIPAN_REFERRALS.filter((r) => !["bazi_reading"].includes(r.intent)),
  },
  circle_assistant: {
    scene: "circle_assistant",
    label: "圈子助理",
    covers: "本圈公开知识、圈内课程与资料、圈子玩法与常见问题",
    outOfScope: "本圈知识库之外的专业断事",
    allowModelFallback: true,
    // 圈子助理由圈主付费供养，转介规则与平台场景不同：
    // 只保留「中立工具」（排盘工具本身不抢客），去掉会把成员送给平台其他老师的 expert_consult。
    // 真正的优先级是「先看圈内有没有」，见 buildCircleReferralPrompt。
    referrals: PAIPAN_REFERRALS.filter((r) => r.intent !== "expert_consult"),
    circleFirst: true,
  },
  agent_square: {
    scene: "agent_square",
    label: "广场智能体",
    covers: "本智能体人设与知识范围内的问题",
    outOfScope: "超出本智能体专长的专业断事",
    allowModelFallback: true,
    referrals: PAIPAN_REFERRALS,
  },
};

/** 命中转介规则则返回（更具体的意图排在前面，先匹配先生效） */
export function detectReferral(scene: string, question: string): ReferralRule | null {
  const policy = SCENE_POLICIES[scene];
  if (!policy || !question) return null;
  const q = question.trim();
  for (const rule of policy.referrals) {
    if (rule.patterns.some((re) => re.test(q))) return rule;
  }
  return null;
}

/**
 * 生成注入到 system 的策略片段。
 *
 * @param hasEvidence 本次是否检索到可用的知识库条目
 * @param referral    命中的转介规则（若有）
 */
export function buildPolicyPrompt(opts: { scene: string; hasEvidence: boolean; referral?: ReferralRule | null }): string {
  const policy = SCENE_POLICIES[opts.scene];
  if (!policy) return "";
  const parts: string[] = [];

  if (opts.referral) {
    const t = opts.referral.target;
    parts.push(
      `【超出范围 · 请转介】用户这个问题不属于你的职责（你负责：${policy.covers}）。按下面四步回应：\n` +
        `1. 先给出你力所能及的那部分帮助（例如概念层面的简要说明），别让用户空手而归；\n` +
        `2. 坦率说明为什么这里答不了：${opts.referral.hint}；\n` +
        `3. 把用户交给${referralWho(opts.referral, t)}——用介绍同伴的口吻，说明在「${t.label}」那里能得到什么；\n` +
        `4. **不要在这里直接给出完整的排盘结果或命理断语**——没有排盘数据的解读不负责任，也不是本场景的职责。\n` +
        `语气是把用户交到更合适的人手上，不是推销，也不是敷衍打发。`,
    );
  }

  if (opts.hasEvidence) {
    parts.push("【作答依据】优先使用【依据】中的条目作答，并用编号标注；依据与你的通用认识冲突时，以依据为准。");
  } else if (policy.allowModelFallback) {
    parts.push(
      "【依据不足时】知识库暂无匹配条目。你可以基于通用知识回答，但必须做到：\n" +
        "1. 在回答中明确说明这是通行说法、平台尚无审核过的依据（例如「这部分平台还没收录审核过的依据，我按通行的说法讲一下」）；\n" +
        "2. 绝不虚构书名、篇名、原文或出处，不把通用解释说成某本书里的话；\n" +
        "3. 有门派分歧的内容，说明存在不同说法，不下独断结论。",
    );
  } else {
    parts.push("【依据不足时】知识库没有匹配条目时，如实告诉用户本场景暂无可依据的内容，不要自行发挥。");
  }

  return parts.join("\n\n");
}

/**
 * 圈子场景的转介话术（决策人 2026-09-17 指正：
 * 圈主助理是圈主花钱供养的，把成员往外推，圈主不会满意）。
 *
 * 优先级：
 *   1. 圈内有相关课程/资料/圈主提供的服务 → 先介绍圈主自己的；
 *   2. 圈内确实没有 → 只给「中立工具」（排盘工具本身不抢客户，用完还在圈里聊）；
 *   3. **绝不**主动把成员推给平台其他老师、其他圈子或站外——那是把圈主的客户送人。
 */
export function buildCircleReferralPrompt(opts: {
  referral?: ReferralRule | null;
  circleName?: string;
  /** 圈主自己提供的服务名（如「张老师详批」），由圈子配置提供 */
  ownerServices?: string[];
}): string {
  const circle = opts.circleName ? `「${opts.circleName}」` : "本圈";
  const lines: string[] = [
    `【本圈优先】你是${circle}的专属助理，立场是帮圈主服务好圈里的人：
` +
      `1. 用户想要的东西，**圈内有就先介绍圈内的**（本圈课程、资料、圈主提供的服务与答疑）；
` +
      `2. 不要主动把成员介绍到其他老师、其他圈子或站外——这不是你的职责；
` +
      `3. 圈主没有覆盖到的通用工具（如排盘计算），可以告诉用户平台有，用完回来继续在圈里聊。`,
  ];
  if (opts.ownerServices?.length) {
    lines.push(`【本圈可提供】${opts.ownerServices.join("、")}——相关问题优先引导到这里。`);
  }
  if (opts.referral) {
    const t = opts.referral.target;
    lines.push(
      `【这次的问题】用户问的事${opts.referral.hint}。按上面的顺序：先看圈内有没有对应的课程或服务，` +
        `有就介绍圈内的；确实没有，再提一句平台的「${t.label}」可以起盘，并请用户起完盘回来接着聊。` +
        `**不要在这里直接给出完整的排盘结果或命理断语。**`,
    );
  }
  return lines.join("\n\n");
}

/** 转介话术里「交给谁」：平台场景交给同伴角色，圈子场景不点名平台角色（见 §圈子优先） */
function referralWho(rule: ReferralRule, t: ReferralTarget): string {
  const mate = personaOfIntent(rule.intent);
  return mate ? `我的同伴「${mate.name}」（${mate.tagline}）` : `平台的「${t.label}」`;
}

/** 供前端展示的转介卡片 */
export function referralCard(rule: ReferralRule) {
  const mate = personaOfIntent(rule.intent);
  return {
    intent: rule.intent,
    label: rule.target.label,
    path: rule.target.path,
    kind: rule.target.kind,
    paid: rule.target.paid,
    reason: rule.hint,
    /** 接手的同伴角色（前端可展示名字，圈子场景不展示） */
    persona: mate ? { id: mate.id, name: mate.name, tagline: mate.tagline } : null,
  };
}

/** 场景完整 system 前缀：角色人设 + 作答策略 */
export function buildSceneSystemPrefix(opts: { scene: string; hasEvidence: boolean; referral?: ReferralRule | null }): string {
  return [personaPrompt(opts.scene), buildPolicyPrompt(opts)].filter(Boolean).join("\n\n");
}

export { personaOfScene, personaPrompt };
