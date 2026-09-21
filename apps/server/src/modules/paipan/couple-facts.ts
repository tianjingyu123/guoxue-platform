/**
 * 双人合盘的关系事实（2026-09-18）
 *
 * 起因是一个实打实的隐私缺口。`CoupleService` 的设计写得很明白：
 *   「任何端点都不返回对方 recordId / 生辰 / 四柱 / 原始盘，双方唯一共享内容＝合婚报告文本」
 * 字段这一层确实堵住了，但**报告正文没堵**——合婚 prompt 把双方出生日期与四柱干支
 * 原样喂给模型，还要求它分析「年柱纳音配对、年柱天干地支合冲」，
 * 模型必然要写出具体干支来说明。而四柱能反推出生时刻，这份报告又是双方都能看的，
 * 等于把对方的生辰交了出去。
 *
 * 所以跨用户合盘改成这样：**引擎先把两盘算成「关系」，模型只拿关系**。
 * 拿不到原始值，也就写不出来——这比在 prompt 里叮嘱模型「不要泄露」可靠得多。
 *
 * 哪些能给、哪些不能，按「能不能反推出生时刻」划线：
 * - 出生年月日时：一概不给。
 * - 年柱纳音名：**不给**。「路旁土」唯一对应庚午/辛未，等于交出出生年份。
 *   只给纳音五行之间的生克关系。
 * - 地支：不给具体字，只给「哪两柱之间、是什么关系」（如日支相冲）。
 * - 日主天干：给。十神、五行互补全从它推，是合婚分析的地基；
 *   单个天干十选一，配合关系也推不出生日。
 * - 五行占比：给。它是全局统计量，反推不到具体八字。
 *
 * 自己给自己的两个盘做合婚（`/paipan/hehun`，两条记录都是同一个用户的）不受此限，
 * 那里没有第二个人，照旧给完整四柱。
 */

import {
  NA_YIN,
  ZHI_HE_PAIRS,
  ZHI_CHONG_PAIRS,
  ZHI_HAI_PAIRS,
  ZHI_SAN_XING,
  ZHI_ZI_XING,
  type BaziResult,
} from "@guoxue/bazi-engine";

/** 五行 */
type WuXing = "木" | "火" | "土" | "金" | "水";

const GAN_WU_XING: Record<string, WuXing> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

/** 生：木火土金水依次相生 */
const SHENG_NEXT: Record<WuXing, WuXing> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
/** 克：木克土、土克水、水克火、火克金、金克木 */
const KE_NEXT: Record<WuXing, WuXing> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

export type WuXingRelation =
  | { type: "比和" }
  | { type: "相生"; from: "男" | "女" }
  | { type: "相克"; from: "男" | "女" };

/** 两个五行之间是什么关系，站在「谁生谁、谁克谁」的角度说清方向 */
export function relateWuXing(male?: WuXing, female?: WuXing): WuXingRelation | null {
  if (!male || !female) return null;
  if (male === female) return { type: "比和" };
  if (SHENG_NEXT[male] === female) return { type: "相生", from: "男" };
  if (SHENG_NEXT[female] === male) return { type: "相生", from: "女" };
  if (KE_NEXT[male] === female) return { type: "相克", from: "男" };
  if (KE_NEXT[female] === male) return { type: "相克", from: "女" };
  return null;
}

/** 纳音名（如「路旁土」）末字即其五行 */
function nayinWuXing(nayin?: string): WuXing | undefined {
  const last = (nayin || "").trim().slice(-1);
  return (["木", "火", "土", "金", "水"] as WuXing[]).includes(last as WuXing) ? (last as WuXing) : undefined;
}

const PILLARS = ["nian", "yue", "ri", "shi"] as const;
type PillarKey = (typeof PILLARS)[number];
const PILLAR_CN: Record<PillarKey, string> = { nian: "年", yue: "月", ri: "日", shi: "时" };

export interface CoupleZhiRelation {
  /** 男方哪一柱 */
  male: string;
  /** 女方哪一柱 */
  female: string;
  type: "六合" | "六冲" | "六害" | "相刑";
}

export interface CoupleFacts {
  /** 年柱纳音的五行关系（只给关系，不给纳音名） */
  nayin: { relation: WuXingRelation | null };
  /** 日主：天干与五行，以及两者的生克方向 */
  dayMaster: {
    male: { gan: string; wuXing?: WuXing };
    female: { gan: string; wuXing?: WuXing };
    relation: WuXingRelation | null;
  };
  /** 双方地支之间的合冲刑害：说清哪两柱、什么关系，不给地支本身 */
  zhiRelations: CoupleZhiRelation[];
  /** 夫妻宫（日支）之间是什么关系——合婚最看重的一处 */
  spousePalace: CoupleZhiRelation["type"] | "无特殊关系";
  /** 五行强弱占比（全局统计量，反推不到具体八字） */
  wuXingEnergy: { male?: Record<string, number>; female?: Record<string, number> };
  /** 用神互补：我需要的五行，在对方盘里旺不旺 */
  yongShen: {
    male?: { needs: string; partnerHasStrong: boolean | null };
    female?: { needs: string; partnerHasStrong: boolean | null };
  };
  /** 格局名（不含生辰信息） */
  geJu: { male?: string; female?: string };
}

const inPair = (pairs: [string, string][], a: string, b: string) =>
  pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** 两支是否相刑：三刑取「同组且不同支」，自刑取「两支相同且属自刑支」 */
const isXing = (a: string, b: string) =>
  ZHI_SAN_XING.some((g) => (g as string[]).includes(a) && (g as string[]).includes(b) && a !== b) ||
  (a === b && (ZHI_ZI_XING as string[]).includes(a));

function zhiRelation(a: string, b: string): CoupleZhiRelation["type"] | null {
  if (!a || !b) return null;
  if (inPair(ZHI_HE_PAIRS as [string, string][], a, b)) return "六合";
  if (inPair(ZHI_CHONG_PAIRS as [string, string][], a, b)) return "六冲";
  if (inPair(ZHI_HAI_PAIRS as [string, string][], a, b)) return "六害";
  if (isXing(a, b)) return "相刑";
  return null;
}

/** 用神所需的五行，在对方盘里是不是旺（占比 ≥ 20% 视为有力） */
function partnerSupplies(needs: string | undefined, energy?: Record<string, number>): boolean | null {
  const key = { 木: "mu", 火: "huo", 土: "tu", 金: "jin", 水: "shui" }[(needs || "").trim().slice(0, 1)];
  if (!key || !energy) return null;
  const v = Number(energy[key]);
  return Number.isFinite(v) ? v >= 20 : null;
}

/**
 * 把两张盘算成「关系」。
 * 入参是完整的 BaziResult，但产出里**不含任何可反推出生时刻的原始值**——
 * 这正是这个函数存在的意义：让调用方即使想泄露也无从泄露。
 */
export function extractCoupleFacts(male: BaziResult, female: BaziResult): CoupleFacts {
  const mSi = male?.siZhu as any;
  const fSi = female?.siZhu as any;

  const zhiRelations: CoupleZhiRelation[] = [];
  for (const mp of PILLARS) {
    for (const fp of PILLARS) {
      const type = zhiRelation(mSi?.[mp]?.zhi, fSi?.[fp]?.zhi);
      if (type) zhiRelations.push({ male: `${PILLAR_CN[mp]}柱`, female: `${PILLAR_CN[fp]}柱`, type });
    }
  }

  const mGan = String(mSi?.ri?.gan ?? "");
  const fGan = String(fSi?.ri?.gan ?? "");
  const mNayin = nayinWuXing(mSi?.nian?.nayin ?? NA_YIN[`${mSi?.nian?.gan}${mSi?.nian?.zhi}`]);
  const fNayin = nayinWuXing(fSi?.nian?.nayin ?? NA_YIN[`${fSi?.nian?.gan}${fSi?.nian?.zhi}`]);

  const mEnergy = male?.wuXingEnergy as unknown as Record<string, number> | undefined;
  const fEnergy = female?.wuXingEnergy as unknown as Record<string, number> | undefined;
  const mYong = male?.geJu?.yongShen;
  const fYong = female?.geJu?.yongShen;

  const spouse = zhiRelation(mSi?.ri?.zhi, fSi?.ri?.zhi);

  return {
    nayin: { relation: relateWuXing(mNayin, fNayin) },
    dayMaster: {
      male: { gan: mGan, wuXing: GAN_WU_XING[mGan] },
      female: { gan: fGan, wuXing: GAN_WU_XING[fGan] },
      relation: relateWuXing(GAN_WU_XING[mGan], GAN_WU_XING[fGan]),
    },
    zhiRelations,
    spousePalace: spouse ?? "无特殊关系",
    wuXingEnergy: { male: mEnergy, female: fEnergy },
    yongShen: {
      male: mYong ? { needs: mYong, partnerHasStrong: partnerSupplies(mYong, fEnergy) } : undefined,
      female: fYong ? { needs: fYong, partnerHasStrong: partnerSupplies(fYong, mEnergy) } : undefined,
    },
    geJu: { male: male?.geJu?.name, female: female?.geJu?.name },
  };
}

/**
 * 合盘场景（决策人 2026-09-18：「合盘不光是合婚，还有合作等其他场景」）。
 *
 * 同一张关系盘，换个场景要看的东西就不一样：
 * 合婚看夫妻宫与相处，合作看谁主导、钱怎么分、会不会因利起争执，
 * 亲子看代际与庇护。措辞更不能混——把合作伙伴讲成「感情和睦」是笑话。
 */
export type CoupleScene = "marriage" | "partnership" | "family" | "colleague" | "friend";

export const SCENE_LABEL: Record<CoupleScene, string> = {
  marriage: "婚恋",
  partnership: "合作",
  family: "亲子家人",
  colleague: "同事上下级",
  friend: "朋友",
};

/** 两人在这个场景里各自怎么称呼——措辞错了，整篇就荒腔走板 */
export const SCENE_SIDES: Record<CoupleScene, [string, string]> = {
  marriage: ["男方", "女方"],
  partnership: ["发起方", "合作方"],
  family: ["长辈一方", "晚辈一方"],
  colleague: ["发起方", "对方"],
  friend: ["发起方", "对方"],
};

export const isCoupleScene = (v: unknown): v is CoupleScene =>
  typeof v === "string" && v in SCENE_LABEL;

/**
 * 合盘的检索信号。
 *
 * 与六个单人工具一样：`tags hasSome signals.value` 精确命中，
 * 所以这里产出什么值，知识条目的 tags 就得**一字不差**地写成什么值。
 * 合盘的信号只能来自关系（不能来自任何一方的原始值），这既是隐私要求，
 * 也正好合用——合盘要断的本来就是两个人之间的关系。
 *
 * 场景也是一个信号：同一处「日主相克」，在婚恋里讲的是管束与张力，
 * 在合作里讲的是主导权与话语权，条目本就该分开写、分开命中。
 */
export function coupleSignals(f: CoupleFacts, scene: CoupleScene = "marriage"): { value: string; weight: number; reason: string }[] {
  const out: { value: string; weight: number; reason: string }[] = [];
  const push = (v: string | undefined, weight: number, reason: string) => {
    if (v) out.push({ value: v, weight, reason });
  };

  const rel = (r: WuXingRelation | null, prefix: string) =>
    r ? (r.type === "比和" ? `${prefix}比和` : `${prefix}${r.type}（${r.from === "男" ? "男" : "女"}方主动）`) : undefined;

  // 夫妻宫最重：合婚第一眼看的就是双方日支什么关系
  push(`夫妻宫${f.spousePalace}`, 10, "夫妻宫");
  push(rel(f.dayMaster.relation, "日主"), 9, "日主五行关系");
  push(rel(f.nayin.relation, "纳音"), 5, "年柱纳音关系");

  // 各柱合冲刑害：只取类型，不取具体柱位，免得条目要为 16 种组合各写一份
  for (const t of new Set(f.zhiRelations.map((r) => r.type))) push(`地支${t}`, 6, "地支关系");

  // 用神能不能互补，是「搭不搭」最实在的一条
  const supplies = [f.yongShen.male?.partnerHasStrong, f.yongShen.female?.partnerHasStrong].filter((x) => x != null);
  if (supplies.length) {
    push(supplies.every((x) => x) ? "用神双向互补" : supplies.some((x) => x) ? "用神单向可补" : "用神互补有限", 7, "喜用互益");
  }

  // 场景信号：权重最高，保证这个场景专属的条目一定进得来。
  // 同一处「日主相克」，婚恋里讲管束与张力、合作里讲主导权，条目分开写、分开命中。
  push(`合盘场景·${SCENE_LABEL[scene]}`, 11, "合盘场景");
  return out;
}

/** 关系说成一句人话 */
function relationText(r: WuXingRelation | null, what: string): string {
  if (!r) return `${what}：无明显生克`;
  if (r.type === "比和") return `${what}：比和（同一五行）`;
  return `${what}：${r.type}，${r.from === "男" ? "男方" : "女方"}${r.type === "相生" ? "生" : "克"}${r.from === "男" ? "女方" : "男方"}`;
}

/**
 * 给模型看的事实清单。
 * 这里是最后一道关：**只允许写出 CoupleFacts 里有的东西**，
 * 一旦有人往里加「出生：xxxx年」这类行，隐私就又漏了，所以配套测试会盯住这一点。
 */
export function formatCoupleFacts(f: CoupleFacts): string {
  const energy = (e?: Record<string, number>) =>
    e ? `木${e.mu ?? 0}% 火${e.huo ?? 0}% 土${e.tu ?? 0}% 金${e.jin ?? 0}% 水${e.shui ?? 0}%` : "未详";

  const lines = [
    "## 双方盘面关系（引擎计算，确定性事实）",
    `- ${relationText(f.nayin.relation, "年柱纳音五行")}`,
    `- 日主：男方${f.dayMaster.male.gan}（${f.dayMaster.male.wuXing ?? "未详"}）、女方${f.dayMaster.female.gan}（${f.dayMaster.female.wuXing ?? "未详"}）`,
    `- ${relationText(f.dayMaster.relation, "日主五行")}`,
    `- 夫妻宫（双方日支）：${f.spousePalace}`,
    `- 地支合冲刑害：${
      f.zhiRelations.length
        ? f.zhiRelations.map((r) => `男${r.male}与女${r.female}${r.type}`).join("；")
        : "未见明显合冲刑害"
    }`,
    `- 五行强弱：男方 ${energy(f.wuXingEnergy.male)}；女方 ${energy(f.wuXingEnergy.female)}`,
    `- 格局：男方${f.geJu.male || "未定"}、女方${f.geJu.female || "未定"}`,
  ];

  if (f.yongShen.male) {
    lines.push(
      `- 男方喜用${f.yongShen.male.needs}，女方盘中此五行${
        f.yongShen.male.partnerHasStrong == null ? "强弱未详" : f.yongShen.male.partnerHasStrong ? "有力（可补）" : "偏弱（补力有限）"
      }`,
    );
  }
  if (f.yongShen.female) {
    lines.push(
      `- 女方喜用${f.yongShen.female.needs}，男方盘中此五行${
        f.yongShen.female.partnerHasStrong == null ? "强弱未详" : f.yongShen.female.partnerHasStrong ? "有力（可补）" : "偏弱（补力有限）"
      }`,
    );
  }
  return lines.join("\n");
}

/**
 * 兜底：万一模型自己写出或编出了具体出生日期，发给用户之前删掉。
 *
 * 前面已经不把生辰给模型了，这里是第二道门——模型也可能凭空编一个日期，
 * 编出来的同样不该出现在一份双方共享的报告里（用户会当真）。
 */
export function stripBirthDetails(text: string): string {
  return String(text ?? "")
    // 1990年3月15日 / 1990年3月15日10时
    .replace(/\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日(\s*\d{1,2}\s*[时点])?/g, "（出生信息不展示）")
    // 1990-03-15 / 1990/03/15
    .replace(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/g, "（出生信息不展示）");
}
