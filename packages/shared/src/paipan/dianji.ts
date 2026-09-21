/**
 * 典籍用字：字频、出处、适名字表（2026-09-19 新建）
 *
 * ══ 解决的是「适名字表从哪来」这个阻塞项 ══
 *
 * `naming-engine.ts` 头部记着：机制跑通了但输出不可用——
 * 6489 个规范字里有几千个「合法但荒唐」的字（匾毯驭跞觇楮），
 * 光靠笔画/五行/声调筛不掉，部首过滤也只能滤掉 17% 且误杀好字。
 *
 * 本模块换了个思路：**不去找「起名宜用字表」，而是统计古典诗文的实际用字**。
 *
 * 理由是这个信号同时满足两件事：
 * · **雅驯**——在楚辞唐诗宋词里反复出现的字，本来就是历代文人选过一遍的；
 * · **顺带解决出处**——每个字都能附一句真实诗文，这本就是产品要的字段。
 *
 * 语料：`chinese-poetry` 开源库的楚辞全本 ＋ 唐诗两万首 ＋ 宋词两万首，
 * 合 40,076 篇、297 万字，出现过的汉字 9,556 个，
 * 其中 **5,305 个落在起名池内**。
 *
 * ══ 信号强度（实测，非估计）══
 *
 * | 类别 | 频次 |
 * |---|---|
 * | 热门起名字 | 子5366 然3009 若1703 瑶876 宇816 晨654 浩575 嘉517 轩289 涵135 睿121 萱112 梓49 |
 * | 先前生成的怪名用字 | 匾0 跞0 跆0 靰0 蛞0 棰2 毯3 靸5 绒5 筲6 觇7 楮10 |
 *
 * 怪字几乎全在 10 次以下，区分度很清楚。
 *
 * ══ 但它不是充分条件，两点必须说明 ══
 *
 * 1. **有现代起名常用字在典籍里频次为零**——实测「昀」「玥」在楚辞唐诗宋词中
 *    一次都没出现过。它们是现代起名字，不能因为古人没用过就排除。
 *    故本模块只提供**分层**，不提供「唯一正确的适名字表」。
 * 2. **高频不等于宜名**——唯820、胜938、驭113 频次都不低，
 *    但用在名字里是否合适仍需人看。频次筛掉的是「显然不能用的」，
 *    不保证剩下的「都能用」。
 *
 * 故层级命名用的是「常见于典籍／见于典籍／罕见」这种**描述事实**的说法，
 * 而不是「宜用／忌用」这种**下判断**的说法——后者我没有依据这么说。
 */

import rawFreq from "./data/dianji-freq.json";
import rawBigram from "./data/dianji-bigram.json";
import rawShiCi from "./data/dianji-bigram-shici.json";

/** 每字一条：[在语料中出现次数, 代表诗句, 出处] */
type Entry = [number, string, string];
const TABLE = rawFreq as unknown as Record<string, Entry>;

export interface DianjiCitation {
  /** 语料中出现次数（楚辞全本＋唐诗两万＋宋词两万，共 40076 篇） */
  freq: number;
  /** 代表诗句 */
  quote: string;
  /** 出处（体裁·作者《篇名》） */
  source: string;
}

/** 典籍用字总数 */
export const DIANJI_SIZE = Object.keys(TABLE).length;

/** 查一个字的典籍频次与出处；语料中未出现返回 null */
export function dianjiOf(char: string): DianjiCitation | null {
  const e = TABLE[char];
  return e ? { freq: e[0], quote: e[1], source: e[2] } : null;
}

/** 典籍频次；未出现记 0 */
export const dianjiFreq = (char: string): number => TABLE[char]?.[0] ?? 0;

/**
 * 用字层级。
 *
 * **描述事实，不下判断**——说的是「这个字在典籍里多不多见」，
 * 不是「这个字适不适合起名」。后者需要语义数据，本模块给不出。
 */
export type DianjiTier = "常见" | "见于典籍" | "罕见" | "未见";

export function dianjiTier(char: string): DianjiTier {
  const n = dianjiFreq(char);
  if (n >= 100) return "常见";
  if (n >= 20) return "见于典籍";
  if (n >= 1) return "罕见";
  return "未见";
}

/**
 * 取典籍用字表，供 `generateNames` 的 `allowChars` 使用。
 *
 * @param minFreq 最低频次。20 约 3533 字、100 约 2126 字、300 约 1215 字。
 * @param extra 额外补入的字——用来补「现代起名常用但典籍未见」的那批（如昀、玥）。
 *              这个口子是必要的：不开的话会把用户真正想要的字挡在外面。
 */
export function dianjiCharSet(minFreq = 20, extra: Iterable<string> = ""): Set<string> {
  const s = new Set<string>();
  for (const [c, e] of Object.entries(TABLE)) if (e[0] >= minFreq) s.add(c);
  for (const c of extra) s.add(c);
  return s;
}

/** 分层统计，供体检与运维查看 */
export function dianjiStats(): Record<DianjiTier, number> {
  const out: Record<DianjiTier, number> = { 常见: 0, 见于典籍: 0, 罕见: 0, 未见: 0 };
  for (const e of Object.values(TABLE)) {
    const n = e[0];
    out[n >= 100 ? "常见" : n >= 20 ? "见于典籍" : "罕见"]++;
  }
  return out;
}

// ─────────────────── 典籍二字组合 ───────────────────

/**
 * 从诗文里直接取现成的二字组合，而不是拿单字去组。
 *
 * ══ 为什么改这个思路 ══
 *
 * 单字组合这条路走到「典籍字频」已是第三次撞墙：
 * ① 部首过滤——只滤掉怪字的 17%，还误杀成、北、号、汇；
 * ② 新华字典字义——抽取率 50%，热门起名字一个都抽不出；
 * ③ 典籍字频——能滤掉荒唐字（匾毯跞觇），**但滤不掉贬义字**。
 *    痛、迫、掠、偷、短、荒、绝、猜在诗里都是高频词，
 *    于是仍会组出「张棠痛」「张棘迫」「张禽掠」「张二偷」。
 *
 * 症结在于：**贬义判断是语义问题，从字频里推不出来。**
 *
 * 换个角度就通了——**诗词取名的真实做法不是组合单字，是从诗文里取现成的词**。
 * 「芳华」「怀瑾」「清晏」之所以像名字，因为它们本就是词，
 * 而词是否雅驯已经由历代文人在写诗时筛过一遍了。
 *
 * ══ 数据 ══
 *
 * 自同一语料（楚辞全本＋唐诗两万＋宋词两万，40076 篇）抽二字相邻组合，
 * 取出现 **≥20 次**、双字均在起名池、非叠字者，得 **9,361 个**，各带一句出处。
 *
 * 高频段质量很高——前三十位是：
 * 千里 东风 何处 相思 明月 人间 江南 故人 风流 春风 流水 梅花 相逢 西风
 * 芳草 归来 天涯 平生 一笑 青山 少年 万里……
 *
 * ══ 仍须人工把关的部分 ══
 *
 * 尾部混杂两类：
 * · **跨词边界的碎片**——「遽成千古」切出「成千」、「忽相导引」切出「忽相」，
 *   这类不是词，只是相邻两字；
 * · **贬义词**——深恨、痴绝、夷狄 也确实在诗里高频出现。
 *
 * 所以本表是**候选池**不是**成品名库**：它把「显然不能用的」降到了很低的比例，
 * 但仍需人过一遍。相比单字组合那条路（几乎每条都要改），这里是可以人工审的量级。
 */
type BigramEntry = [number, string, string];
const BIGRAM = rawBigram as unknown as Record<string, BigramEntry>;

export const DIANJI_BIGRAM_SIZE = Object.keys(BIGRAM).length;

export interface DianjiPhrase {
  /** 二字组合 */
  word: string;
  /** 在语料中相邻出现的次数 */
  freq: number;
  quote: string;
  source: string;
}

/** 查一个二字组合是否见于典籍 */
export function dianjiPhraseOf(word: string): DianjiPhrase | null {
  const e = BIGRAM[word];
  return e ? { word, freq: e[0], quote: e[1], source: e[2] } : null;
}

/**
 * 取典籍二字组合作候选名。
 *
 * @param minFreq 最低出现次数（表内已筛 ≥20）
 * @param filter 额外过滤，用于接入人工审定的宜/忌名单
 */
export function dianjiPhrases(minFreq = 20, filter?: (p: DianjiPhrase) => boolean): DianjiPhrase[] {
  const out: DianjiPhrase[] = [];
  for (const [w, e] of Object.entries(BIGRAM)) {
    if (e[0] < minFreq) continue;
    const p = { word: w, freq: e[0], quote: e[1], source: e[2] };
    if (filter && !filter(p)) continue;
    out.push(p);
  }
  return out.sort((a, b) => b.freq - a.freq);
}

/**
 * 实词性组合：从 9361 条里滤掉含文言虚词者，余 **7,710 条**。
 *
 * ══ 为什么要这一层：频次与适名度在高频段是反相关的 ══
 *
 * 先前试过「按频次＋是否为词典词」排序，结果**排反了**：
 * 榜首是 何处、今日、如今、何事、如此、不如、不堪、惟有——全是虚词，
 * 而被排到末尾的 菡萏、婉娩、晴岚、豆蔻、缤纷、徜徉 恰恰是最好的名料。
 *
 * 原因是这类虚词在诗里出现得最多、也确实是词典收录的词，两项信号都给满分。
 * **「常见」和「适合入名」在高频段是两回事。**
 *
 * 真正的区分是**虚词 vs 实词**，而文言虚词是可枚举的闭集，
 * 不需要语义数据也不需要我的口味。
 *
 * ══ 第一版虚词表过宽，已收窄 ══
 *
 * 初版把方位词（东西南北）、数词（千万一二）、程度词（明相少）也算进虚词，
 * 结果把**千里、东风、明月、相思、江南、少年**这些最好的名料全滤掉了。
 * 现在只收无争议的核心虚词（之乎者也、何谁孰安、不无非否、又复却便……）。
 *
 * 收窄后实测：被滤掉的高频全是虚词（何处、不知、不可、何事、如何、如此、
 * 不如、无人、不得、不是、惟有），好名料全部保留。
 *
 * ══ 仍然是候选池，不是成品 ══
 *
 * 随机抽样里仍有 许大、断江、堪愁、难禁、障泥、通籍 这类不宜入名的，
 * 因为「宜不宜」最终是语义与审美问题。
 * 但相比最初 44 万种单字组合几乎每条都要改，
 * 7,710 条里坏的是少数——**这是一个人几天能审完的量级**。
 *
 * 这一层的价值是把人工量降了两个数量级，不是替代人工。
 */
const SHI_CI: ReadonlySet<string> = new Set(rawShiCi as unknown as string[]);

export const DIANJI_SHICI_SIZE = SHI_CI.size;

/** 该二字组合是否为实词性（不含文言虚词） */
export const isShiCiPhrase = (word: string): boolean => SHI_CI.has(word);

/**
 * 取实词性的典籍二字组合，按频次降序。
 *
 * @param minFreq 最低出现次数
 * @param filter 额外过滤，用于接入人工审定的宜/忌名单
 */
export function dianjiShiCiPhrases(minFreq = 20, filter?: (p: DianjiPhrase) => boolean): DianjiPhrase[] {
  return dianjiPhrases(minFreq, (p) => SHI_CI.has(p.word) && (!filter || filter(p)));
}
