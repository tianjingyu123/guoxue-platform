/**
 * 起名候选生成（2026-09-19 新建）
 *
 * ══ 要解决的是「重名」，而重名有两个成因 ══
 *
 * 决策人 2026-09-19：「名字组合要多一些，避免重名，而且组合要符合起名的场景。」
 *
 * **成因一：字库太小。** 原前端 `CHAR_POOL` 只有 159 字，按风格＋喜用五行过滤后
 * 有效池仅 9–26 个，双名组合 72–650 种却要输出 60 个候选。
 * 这一条已由 `naming-pool.ts` 解决（《通用规范汉字表》一二级 6489 字，组合百万级）。
 *
 * **成因二：打分完全确定性——这一条更要命，且与字库大小无关。**
 * 原实现按总分降序取前 60，于是**同姓＋同八字＋同风格恒得同一批名字**。
 * 字库再大也没用：所有人都拿到同一个 argmax。
 * 6M 用户规模下，工具本身就是重名制造机——**我们推荐得越多，重名越集中**。
 *
 * ══ 解法：先筛合格，再从合格集里按种子抽样 ══
 *
 * 不再返回「分最高的 N 个」，改为：
 *   1. 按硬条件筛出**合格集**（五格数理不犯凶、三才配置不犯凶、字形五行合喜用）；
 *   2. 从合格集里**按种子抽样**取 N 个。
 *
 * 两个用户输入完全相同时，只要种子不同就拿到不同的名字，而每个名字都是合格的。
 * 种子可由调用方给（如用户 ID ＋ 日期），不给则用输入本身派生——
 * 后者退化为确定性，便于测试与复现。
 *
 * 这不是「随机给答案」：合格线是硬的，抽样只发生在**已经都合格**的集合内部。
 * 起名本就没有唯一最优解——同样合格的一万个名字里挑哪个，是审美不是算法。
 * 假装能排出第 1 名和第 2 名的高下，才是不诚实。
 *
 * ══ 评分只用有据可依的四项 ══
 *
 * 五格数理、三才配置、字形五行、声调搭配——全部可由已核验的数据算出。
 * **不含「字义」维度**：`naming-pool.ts` 头部记着，
 * 通用辞书抽不出面向起名的简明字义（实测抽取率仅 50%，热门起名字一个都抽不出）。
 * 没有这层数据就不做这维评分，不靠拍脑袋凑一个。
 *
 * ══ ⚠️ 本引擎在拿到「适名字表」之前不可直接面向用户 ══
 *
 * 机制已经跑通（张姓双名喜用木：合格集 **448,146** 个，换种子两批各 60 个**零重叠**），
 * 但**输出不可用**——实测头十个是：
 *
 * > 张喃复、张筲匾、张茎毯、张巽绒、张棰驭、张跞苇、张筮唯、张茜跆、张评觇、张胜楮
 *
 * 这些字全都是规范汉字、笔画五行声调五格三才也全都合格，**但没人会这么取名**。
 * 6489 个规范字里有几千个「合法但荒唐」的字，光靠笔画/五行/声调筛不掉。
 *
 * **试过部首过滤，不成立**：按起名学不宜部首（疒歹虫鬼尸骨…）筛，
 * 命中字池的 7%，却只能滤掉上面那批怪字用字的 **4/24（17%）**，
 * 同时会误杀成、北、号、汇这些完全正常的起名字。
 * 加上去只会制造虚假信心——**没加**。
 *
 * 故本引擎接受 `allowChars` 参数：**给了才按适名字表筛**。
 * 不给时会在返回里带 `unfiltered: true` 标记，调用方必须据此决定是否展示。
 * 这一条写在代码里而不只写在文档里，是因为文档拦不住人。
 */

import { calcWuGe, calcSanCai, type WuGeNumbers, type WuXing } from "./wuge";
import { pickNamingChars, namingCharOf, type NamingChar } from "./naming-pool";
import { strokeOfOrNull } from "./kangxi";

/** 八十一数理的吉凶归类（调用方注入，避免共享包依赖服务端数据） */
export type ShuLiJiXiong = "大吉" | "吉" | "半吉" | "凶" | "大凶";
export type ShuLiTable = (n: number) => ShuLiJiXiong;

/** 三才配置吉凶：由天人地三才五行的生克关系判定 */
const SHENG: Record<WuXing, WuXing> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const KE: Record<WuXing, WuXing> = { 木: "土", 火: "金", 土: "水", 金: "木", 水: "火" };

/**
 * 三才吉凶。
 *
 * 判据取通行讲法：相生为吉、比和次之、相克为凶；
 * 其中**人才被天才或地才所克**最忌（上克下、下克上皆主不顺）。
 */
export function sanCaiJiXiong(tian: WuXing, ren: WuXing, di: WuXing): "吉" | "平" | "凶" {
  const tianKeRen = KE[tian] === ren;
  const diKeRen = KE[di] === ren;
  if (tianKeRen || diKeRen) return "凶";
  const tianShengRen = SHENG[tian] === ren;
  const renShengDi = SHENG[ren] === di;
  if (tianShengRen && renShengDi) return "吉";
  if (tianShengRen || renShengDi) return "吉";
  if (tian === ren && ren === di) return "平";
  return "平";
}

/** 声调搭配：全同调最忌（读起来平板），有起伏为佳 */
export function toneScore(tones: number[]): number {
  const valid = tones.filter((t) => t > 0);
  if (valid.length < 2) return 70;
  const uniq = new Set(valid).size;
  if (uniq === 1) return 40;                 // 全同调
  if (valid.length === 3 && uniq === 3) return 95;
  return 80;
}

export interface NamingRequest {
  /** 姓（可复姓） */
  surname: string;
  /** 名字数：1 单名、2 双名 */
  givenLength: 1 | 2;
  /** 喜用五行（八字定，本模块不算八字）。留空则不按五行筛 */
  xiYong?: WuXing[];
  /** 辈字或指定字 */
  fixedChar?: string;
  /** 指定字的位置 */
  fixedPosition?: "first" | "last";
  /** 排除字 */
  excludeChars?: string;
  /** 取多少个候选 */
  limit?: number;
  /**
   * 抽样种子。**同输入不同种子得到不同批次**，这是避开重名的关键。
   * 不给则由输入派生，退化为确定性（便于测试复现）。
   */
  seed?: number;
  /**
   * 适名字表：只有出现在这里的字才进候选。
   *
   * **不给等于没有筛过**——6489 个规范字里有几千个合法但荒唐的字
   * （匾、毯、驭、跞、觇、楮…），出来的名字没人会用。
   * 见本文件头部「⚠️ 在拿到适名字表之前不可直接面向用户」。
   */
  allowChars?: Iterable<string>;
}

export interface NameCandidate {
  /** 名（不含姓） */
  given: string;
  chars: NamingChar[];
  wuGe: WuGeNumbers;
  /** 五格各自的数理吉凶 */
  geJiXiong: Record<keyof WuGeNumbers, ShuLiJiXiong>;
  sanCai: { tian: WuXing; ren: WuXing; di: WuXing; combo: string; jiXiong: "吉" | "平" | "凶" };
  /** 0–100。仅由五格数理、三才、五行合度、声调四项合成，**不含字义** */
  score: number;
  detail: { shuLi: number; sanCai: number; wuXing: number; tone: number };
}

/** xorshift32：小而可复现的伪随机，避免依赖运行环境的 Math.random */
function makeRng(seed: number) {
  let x = seed >>> 0 || 0x9e3779b9;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 0x100000000;
  };
}

/** 由字符串派生种子（输入相同则种子相同，退化为确定性） */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const JI_SCORE: Record<ShuLiJiXiong, number> = { 大吉: 100, 吉: 88, 半吉: 70, 凶: 35, 大凶: 15 };

/**
 * 生成候选名。
 *
 * **硬条件（不合格直接淘汰，不是扣分）**：
 * · 人格、地格、总格的数理不得为「凶」或「大凶」——这三格是主运、前运、后运；
 * · 三才配置不得为「凶」；
 * · 指定了喜用五行时，名字用字须至少有一个合喜用。
 *
 * 合格之后才抽样。硬条件保证「都合格」，抽样保证「不撞车」。
 */
export function generateNames(req: NamingRequest, shuLi: ShuLiTable): {
  candidates: NameCandidate[];
  /** 合格集总量——这个数才说明「可选范围有多大」 */
  qualifiedCount: number;
  /** 本批所用种子，回传便于复现 */
  seed: number;
  /**
   * 未经适名字表过滤。**为 true 时候选不可直接展示给用户**——
   * 里头会混进「合法但荒唐」的字。调用方必须检查这个标记。
   */
  unfiltered: boolean;
} {
  const { surname, givenLength, xiYong, fixedChar, fixedPosition, excludeChars = "", limit = 60 } = req;
  const surStrokes = [...surname].map((c) => strokeOfOrNull(c));
  if (surStrokes.some((s) => s === null)) {
    throw new Error(`姓「${surname}」中有字不在康熙笔画表内，无法起名`);
  }

  const banned = new Set([...excludeChars, ...surname]); // 名不与姓同字
  const allow = req.allowChars ? new Set(req.allowChars) : null;
  const pool = pickNamingChars(xiYong ? { wuXing: xiYong } : {})
    .filter((c) => !banned.has(c.char))
    .filter((c) => !allow || allow.has(c.char));
  const fixed = fixedChar ? namingCharOf(fixedChar) : null;
  if (fixedChar && !fixed) throw new Error(`指定字「${fixedChar}」不在规范汉字表内`);

  /** 组装待评组合 */
  const combos: NamingChar[][] = [];
  if (givenLength === 1) {
    if (fixed) combos.push([fixed]);
    else for (const c of pool) combos.push([c]);
  } else if (fixed && fixedPosition === "first") {
    for (const b of pool) if (b.char !== fixed.char) combos.push([fixed, b]);
  } else if (fixed && fixedPosition === "last") {
    for (const a of pool) if (a.char !== fixed.char) combos.push([a, fixed]);
  } else if (fixed) {
    for (const b of pool) if (b.char !== fixed.char) { combos.push([fixed, b]); combos.push([b, fixed]); }
  } else {
    for (const a of pool) for (const b of pool) if (a.char !== b.char) combos.push([a, b]);
  }

  const xiYongSet = xiYong ? new Set(xiYong) : null;
  const qualified: NameCandidate[] = [];

  for (const chars of combos) {
    const ge = calcWuGe({
      surnameStrokes: surStrokes as number[],
      givenStrokes: chars.map((c) => c.stroke),
    });
    const geJiXiong = {
      tianGe: shuLi(ge.tianGe), renGe: shuLi(ge.renGe), diGe: shuLi(ge.diGe),
      waiGe: shuLi(ge.waiGe), zongGe: shuLi(ge.zongGe),
    } as Record<keyof WuGeNumbers, ShuLiJiXiong>;

    // 硬条件一：主运（人格）、前运（地格）、后运（总格）不得犯凶
    if (["凶", "大凶"].includes(geJiXiong.renGe)) continue;
    if (["凶", "大凶"].includes(geJiXiong.diGe)) continue;
    if (["凶", "大凶"].includes(geJiXiong.zongGe)) continue;

    const sc = calcSanCai(ge);
    const scJi = sanCaiJiXiong(sc.tian, sc.ren, sc.di);
    // 硬条件二：三才不得犯凶
    if (scJi === "凶") continue;

    // 硬条件三：给了喜用五行，名中须至少一字合
    if (xiYongSet && !chars.some((c) => xiYongSet.has(c.wuXing))) continue;

    /**
     * 🔴 2026-09-19 **天格不计入评分**（决策人经前端窗口授权拍板）。
     *
     * 理由有三，第一条是决定性的：
     * ① **天格只由姓氏决定，同一个姓的全部候选名天格完全相同。**
     *    计入等于给所有候选加同一个常数——排序丝毫不变，只稀释其余各格的区分度。
     *    而评分的唯一作用就是在候选之间做区分。
     * ② 某姓天格若恰为凶数，该姓所有用户分数被整体拉低，
     *    而这是用户**无法改变也无从改善**的。给一个「你姓不好」的暗示既无用也不友善。
     * ③ 五格体系中天格历来「只作参考，不主吉凶」。
     *
     * 天格仍须**计算并展示**——三才依赖天格五行，用户也期望看到完整五格表。
     * 报告里须带一句「天格由姓氏决定，不计入评分」，
     * 否则用户会疑惑天格为凶而总分不低。这句说明是必要成本。
     *
     * 原先分给天格的 0.05 权重并入人格（主运，解释力最强）。
     */
    const shuLiScore = (JI_SCORE[geJiXiong.renGe] * 0.45 + JI_SCORE[geJiXiong.diGe] * 0.25
      + JI_SCORE[geJiXiong.zongGe] * 0.25
      + JI_SCORE[geJiXiong.waiGe] * 0.05);
    const sanCaiScore = scJi === "吉" ? 100 : 70;
    const wuXingScore = xiYongSet
      ? (chars.filter((c) => xiYongSet.has(c.wuXing)).length / chars.length) * 100
      : 75;
    const tScore = toneScore(chars.map((c) => c.tone));

    qualified.push({
      given: chars.map((c) => c.char).join(""),
      chars,
      wuGe: ge,
      geJiXiong,
      sanCai: { ...sc, jiXiong: scJi },
      score: Math.round(shuLiScore * 0.4 + sanCaiScore * 0.25 + wuXingScore * 0.2 + tScore * 0.15),
      detail: { shuLi: Math.round(shuLiScore), sanCai: sanCaiScore, wuXing: Math.round(wuXingScore), tone: tScore },
    });
  }

  /**
   * 抽样而非取 argmax。
   *
   * 先按分数分层（只保留合格集里分数较高的一段），再在层内按种子洗牌抽取——
   * 既不至于给出明显更差的名字，也不会所有人都拿到同一批。
   */
  const seed = req.seed ?? hashSeed(`${surname}|${givenLength}|${(xiYong ?? []).join("")}|${fixedChar ?? ""}`);
  const rng = makeRng(seed);
  qualified.sort((a, b) => b.score - a.score);
  // 取分数前 40% 作抽样层（至少 limit 个，不足则全取）
  const layerSize = Math.max(limit, Math.ceil(qualified.length * 0.4));
  const layer = qualified.slice(0, layerSize);
  for (let i = layer.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [layer[i], layer[j]] = [layer[j], layer[i]];
  }
  return { candidates: layer.slice(0, limit), qualifiedCount: qualified.length, seed, unfiltered: !allow };
}
