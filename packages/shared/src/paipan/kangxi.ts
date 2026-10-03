/**
 * 康熙笔画查询（2026-09-19 新建）
 *
 * ══ 为什么必须单独做这一层 ══
 *
 * 五格剖象整个建立在笔画上——笔画错一画，五格、三才、八十一数理全盘皆错，
 * 而输出看着完全正常。所以笔画表的质量就是这类工具的天花板。
 *
 * 后端原有的 `xingming-data.ts` 那张表有两处致命问题：
 *
 * **① 查不到时用 Unicode 码点算笔画。**
 * ```ts
 * if (code >= 0x4e00 && code <= 0x9fff)
 *   return Math.min(24, Math.max(1, Math.ceil((code - 0x4e00) / 1200) + 3));
 * ```
 * 码点与笔画数**毫无关系**——汉字在 CJK 区的位置基本按部首与历史排序，
 * 跟笔画多少没有任何函数关系。这是把「编造」伪装成了「计算」：
 * 返回值总在 1–24 之间、看着像模像样，调用方无从察觉。
 * 实测 77 个常用姓名用字里 **28 个（36%）走的是这条兜底**，
 * 张得 7 画（康熙「張」11）、刘得 4 画（康熙「劉」15）、军得 4 画（康熙 9）。
 *
 * **② 表内存的也不全是康熙笔画。**
 * 那张表名为 `KANGXI_STROKES`，实测陈存 11（康熙「陳」16）、涛存 10（康熙「濤」18），
 * 存的是**简体笔画**。五格剖象明确要用康熙笔画，这一条不是流派分歧。
 *
 * ══ 本表来源 ══
 *
 * 取自前端 `pkg-paipan2/lib/data/kangxi-strokes.json`，**20,992 条**。
 * 抽查中国最常见的 18 个姓名用字零缺失零错误，77 个常用姓名用字全覆盖。
 * 这是第 7 次「前端对、后端错」。
 *
 * ══ 查不到怎么办：报错，不猜 ══
 *
 * `strokeOf` 查不到直接抛错。这是有意的——
 * 一个猜出来的笔画会让整副五格看着正常却全错，比拿不到结果危险得多。
 * 需要容错的调用方用 `strokeOfOrNull` 自行决定怎么降级，
 * 但**不要在这一层塞默认值**。
 */

import rawTable from "./data/kangxi-strokes.json";

export type CharWuXing = "金" | "木" | "水" | "火" | "土";

/** 每字一条：[康熙笔画, 字形五行, 部首] */
type Entry = [number, CharWuXing, string];

const TABLE = rawTable as unknown as Record<string, Entry>;

/** 表中收字数（用于自检与体检报告） */
export const KANGXI_TABLE_SIZE = Object.keys(TABLE).length;

/** 查康熙笔画。查不到抛错——**绝不猜**，理由见文件头。 */
export function strokeOf(char: string): number {
  const e = TABLE[char];
  if (!e) throw new Error(`康熙笔画表未收录「${char}」；不臆测笔画，请补表或改用其他字`);
  return e[0];
}

/** 查康熙笔画，查不到返回 null，由调用方决定降级方式 */
export function strokeOfOrNull(char: string): number | null {
  return TABLE[char]?.[0] ?? null;
}

/** 字形五行（依部首），查不到返回 null */
export function charWuXingOf(char: string): CharWuXing | null {
  return TABLE[char]?.[1] ?? null;
}

/** 部首，查不到返回 null */
export function radicalOf(char: string): string | null {
  return TABLE[char]?.[2] ?? null;
}

/** 是否收录 */
export const hasChar = (char: string): boolean => char in TABLE;

/**
 * 整串取笔画，一并报出未收录的字。
 *
 * 姓名类工具应当先调它做输入校验，把「哪个字查不到」明确告诉用户，
 * 而不是算出一副基于臆测笔画的五格。
 */
export function strokesOfName(name: string): { strokes: number[]; unknown: string[] } {
  const chars = [...name];
  const unknown = chars.filter((c) => !hasChar(c));
  return { strokes: chars.map((c) => strokeOfOrNull(c) ?? 0), unknown };
}
