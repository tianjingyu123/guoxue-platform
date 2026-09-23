/**
 * 起名字库底池（2026-09-19 新建）
 *
 * ══ 为什么要建这一层 ══
 *
 * 决策人 2026-09-19：「你库里就那么几个字几个名字的话没有任何价值，
 * 一定要够多还要适合。」
 *
 * 原前端 `qiming-engine.ts` 的 `CHAR_POOL` 只有 **159 字**，
 * 按风格与喜用五行过滤后有效字池仅剩 **9–26 个**，双名组合 72–650 种，
 * 却要输出 60 个候选——`auspicious` 风格几乎把所有能组的都倒出来了。
 *
 * 更要命的是**打分完全确定性**：同姓 + 同八字 + 同风格恒得同一批 60 个名字。
 * 6M 用户规模下，这个工具本身就是重名制造机。
 *
 * ══ 底池取《通用规范汉字表》一级字表 ══
 *
 * 不是随便找一份「起名常用字」——取的是**国家标准**：
 * 《通用规范汉字表》（教育部、国家语委，2013 年 6 月 5 日颁布）共收字 8105，
 * 分三级：一级 3500（常用字集）、二级 3000、三级 1605（姓氏人名、地名、
 * 科技术语及中小学文言文用字中未入一二级者）。
 *
 * **起名池取一级＋二级，合 6500 字。**
 *
 * 最初我只打算取一级 3500（常用、好认好打）。拿 27 个当下热门起名字一验，
 * **12 个落在二级**——梓、萱、睿、瑶、芷、懿、彦、昀、珩、玥、绾、黛，
 * 「梓涵」这种最常见的名字首字就在二级。只取一级会把这批全漏掉，
 * 而它们恰恰是用户想要的。是数据推翻了我最初的取舍。
 *
 * （那 27 个字**无一落在规范表之外**，说明市面上的热门名用字确实都在规范内，
 * 一二级合起来足够覆盖，不需要放宽到表外。）
 *
 * **三级 1605 不入起名池**——多是生僻字，取了名字别人不认识、
 * 输入法打不出、证件系统可能变方框，实际是给用户添麻烦。
 * 但它仍收在本模块里供**校验**用：判断用户自己输入的字是否为规范汉字。
 *
 * ══ 已核验 ══
 *
 * 三级字表字数与国标逐级吻合（3500 / 3000 / 1605）。
 * 一级 3500 字**全部**能在康熙笔画表与拼音表中查到，零缺失——
 * 意味着每个字的笔画、五行、部首、声调都齐备，可直接进评分。
 *
 * ══ 目前缺的（不假装有）══
 *
 * · **字义**：没有释义数据，所以「这个字适合不适合用在名字里」还判不了。
 *   贬义字（如"丧""毒""劣"）就在一级 3500 里，不能无脑全放进候选。
 * · **多音字**：拼音表**每字只存一个读音**（长只有 chang2、乐只有 le4），
 *   多音字识别不了，音律评分对这类字会不准。
 * · **褒贬与性别倾向**：同上，缺语义层。
 *
 * 故本模块只提供**底池与查询**，不提供「宜用/忌用」判断——
 * 那一层要等语义数据到位再做，现在做只能靠我的口味，那不是数据。
 *
 * ══ 试过但不可用的数据源（负面结论，免得后来者重走）══
 *
 * **新华字典开源数据集**（`pwxcoo/chinese-xinhua` 的 `word.json`，16142 条、27MB）
 * 对本池覆盖 98%，字段有 `explanation`，看着像能解决字义问题。**实测不可用**：
 *
 * · **字义抽取率仅 50%**。释义正文是辞书体（先古籍引证，后现代义项），
 *   靠 `⒈⒉⒊` 义项标号抽取，400 字抽样只有 202 个抽得出；
 *   而且**萱、睿、彦、昀、珩、玥这些最热门的起名字一个都抽不出来**——
 *   偏偏是用户最想要的那批。抽出来的还有错位（梓抽到的是义项二）。
 * · **多音字识别不可靠**。`pinyin` 字段每字仅一读；
 *   从正文正则找注音会把**引文里的字**误当成本字读音（浩被判成 gé/gǎo/hào）；
 *   试过「同一字多条目＝多音字」这个假设，也不成立——
 *   长、乐、行、重、和、差、参、应、当、调、假这些公认多音字**全是单条目**，
 *   而 1332 个多条目字反倒都是生僻字。
 *
 * 一个 50% 错误率的字义看着像权威解释，比没有更危险，故**不采用**。
 *
 * ══ 这一层的性质：是编辑工作，不是数据工作 ══
 *
 * 起名要的不是辞书释义，是**面向起名的简明字义**
 * （「梓：梓树，落叶乔木；古以桑梓喻故乡」这种），
 * 外加褒贬与性别倾向。通用辞书里抽不出这个，因为它本来就不是为起名写的。
 * 可行路径只有三条：购买/授权专业起名字典、
 * 人工为最常用的两千字撰写、或模型生成后逐条人工复核。
 * 前两条是成本问题，第三条若不复核就是编造——这个决定要决策人来做。
 */

import guifan from "./data/guifan-hanzi.json";
import pinyinTable from "./data/pinyin-table.json";
import { strokeOfOrNull, charWuXingOf, radicalOf, type CharWuXing } from "./kangxi";

const G = guifan as { level1: string; level2: string; level3: string };
const PINYIN = pinyinTable as unknown as Record<string, string>;

/** 一级字表 3500——起名主力池 */
export const GUIFAN_LEVEL1: ReadonlySet<string> = new Set([...G.level1]);
/** 二级字表 3000——扩展备选 */
export const GUIFAN_LEVEL2: ReadonlySet<string> = new Set([...G.level2]);
/** 三级字表 1605——含姓氏人名用字，但多生僻，**不入起名池** */
export const GUIFAN_LEVEL3: ReadonlySet<string> = new Set([...G.level3]);

/** 是否为规范汉字（三级合计 8105） */
export function isGuifanHanzi(char: string): boolean {
  return GUIFAN_LEVEL1.has(char) || GUIFAN_LEVEL2.has(char) || GUIFAN_LEVEL3.has(char);
}

/** 规范汉字的级别；不在表内返回 null */
export function guifanLevel(char: string): 1 | 2 | 3 | null {
  if (GUIFAN_LEVEL1.has(char)) return 1;
  if (GUIFAN_LEVEL2.has(char)) return 2;
  if (GUIFAN_LEVEL3.has(char)) return 3;
  return null;
}

export interface NamingChar {
  char: string;
  /** 规范汉字级别 */
  level: 1 | 2 | 3;
  /** 康熙笔画 */
  stroke: number;
  /** 字形五行（依部首） */
  wuXing: CharWuXing;
  radical: string;
  /** 拼音（带声调数字，如 ming2）。**每字仅一读**，多音字取其一 */
  pinyin: string;
  /** 声调 1–4，轻声记 0 */
  tone: number;
}

const toneOf = (py: string): number => {
  const m = py.match(/([0-4])$/);
  return m ? Number(m[1]) : 0;
};

/** 取一个字的起名相关属性；数据不全（无笔画或无拼音）返回 null */
export function namingCharOf(char: string): NamingChar | null {
  const level = guifanLevel(char);
  const stroke = strokeOfOrNull(char);
  const wuXing = charWuXingOf(char);
  const pinyin = PINYIN[char];
  if (!level || stroke === null || !wuXing || !pinyin) return null;
  return { char, level, stroke, wuXing, radical: radicalOf(char) ?? "", pinyin, tone: toneOf(pinyin) };
}

/**
 * 按条件取候选字。
 *
 * @param opts.levels 允许的规范字级别，默认一级＋二级（热门起名字有近半在二级）
 * @param opts.wuXing 限定字形五行（喜用神）
 * @param opts.strokeRange 限定康熙笔画区间（配五格时用）
 */
export function pickNamingChars(opts: {
  levels?: (1 | 2 | 3)[];
  wuXing?: CharWuXing | CharWuXing[];
  strokeRange?: [number, number];
} = {}): NamingChar[] {
  const levels = new Set(opts.levels ?? [1, 2]);
  const wx = opts.wuXing ? new Set(Array.isArray(opts.wuXing) ? opts.wuXing : [opts.wuXing]) : null;
  const source = [
    ...(levels.has(1) ? G.level1 : ""),
    ...(levels.has(2) ? G.level2 : ""),
    ...(levels.has(3) ? G.level3 : ""),
  ];
  const out: NamingChar[] = [];
  for (const c of source) {
    const n = namingCharOf(c);
    if (!n) continue;
    if (wx && !wx.has(n.wuXing)) continue;
    if (opts.strokeRange && (n.stroke < opts.strokeRange[0] || n.stroke > opts.strokeRange[1])) continue;
    out.push(n);
  }
  return out;
}

/** 底池体检：供测试与运维查看覆盖情况 */
export function poolStats() {
  const byLevel = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
  const byWuXing: Record<string, number> = {};
  let missing = 0;
  for (const lv of [1, 2, 3] as const) {
    const src = lv === 1 ? G.level1 : lv === 2 ? G.level2 : G.level3;
    for (const c of src) {
      const n = namingCharOf(c);
      if (!n) { missing++; continue; }
      byLevel[lv]++;
      byWuXing[n.wuXing] = (byWuXing[n.wuXing] ?? 0) + 1;
    }
  }
  return { byLevel, byWuXing, missing };
}
