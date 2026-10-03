/**
 * 梅花易数报告术语表（2026-09-18）
 *
 * 此前梅花报告借用八字词表，实测命中 0 条——正文里一个词都点不开。
 * 梅花自成一套语言：体用、互变、类象、外应，与八字、六爻都不相通。
 *
 * 内容为易数通识（概念与规则，不受著作权保护），由平台自行撰写，不摘录他人表达。
 */

import type { GlossaryTerm } from "./bazi-glossary";

export const MEIHUA_GLOSSARY: GlossaryTerm[] = [
  // ── 体用 ──
  { term: "体卦", group: "基础", brief: "代表求测人自己的那一卦。", detail: "不动的那一卦为体；体卦所属五行是断生克的起点。", alias: ["体"] },
  { term: "用卦", group: "基础", brief: "代表所占之事的那一卦。", detail: "含动爻的那一卦为用；用卦的类象说明这件事长什么样、涉及什么人物器物。", alias: ["用"] },
  { term: "体用", group: "基础", brief: "梅花断吉凶的总纲：体为我、用为事，两者五行生克定成败。", detail: "用生体最吉、体克用次吉、比和平顺、体生用耗力、用克体最忌。", alias: ["体用关系"] },
  { term: "体用比和", group: "关系", brief: "体用同属一行，两相和同。", detail: "主事情平顺无大起落；吉凶不显时更要看变卦定终局。", alias: ["比和"] },

  // ── 卦的构成 ──
  { term: "本卦", group: "基础", brief: "起卦得到的原始之卦，代表事情当下的样子。", detail: "全篇论断从本卦的体用生克开始。" },
  { term: "互卦", group: "基础", brief: "取本卦二三四爻为下卦、三四五爻为上卦组成的卦。", detail: "互卦看事情的中间过程：从开头到结局之间会经过什么。" },
  { term: "变卦", group: "基础", brief: "本卦动爻变动后得到的卦，代表事情的结局。", detail: "变卦生体则终局有利，变卦克体则终局不利；断辞的落点常在这里。", alias: ["之卦"] },
  { term: "动爻", group: "关系", brief: "起卦时算出的那一爻，是卦中发生变化的地方。", detail: "动爻定体用：含动爻的为用卦，另一卦为体卦。" },
  { term: "八卦", group: "基础", brief: "乾、坤、震、巽、坎、离、艮、兑，各有五行与象。", detail: "乾兑属金、震巽属木、坎属水、离属火、坤艮属土；论生克按此，取象按各卦之象。" },

  // ── 取象 ──
  { term: "类象", group: "格局", brief: "八卦所代表的人、物、事、方位与时序。", detail: "如乾为天为父为首领为圆物，坎为水为险为盗；断辞要把类象落到所问的具体事上，不能只报卦名。", alias: ["取象", "卦象"] },
  { term: "卦气", group: "旺衰", brief: "卦在当下时令是否得气。", detail: "如震巽木旺于春、离火旺于夏；卦气旺则其象显，卦气衰则其象弱。" },
  { term: "外应", group: "关系", brief: "起卦当时身边出现的声音、景象、人事。", detail: "梅花重外应：卦象与外应相合时，断辞可以更具体；这是梅花与其他术数最不同的一处。" },
  { term: "先天卦", group: "基础", brief: "按数起卦（年月日时、字数、物数）得到的卦。", detail: "与后天卦相对，是最常用的起卦法。" },
  { term: "后天卦", group: "基础", brief: "按眼前所见之物取象起卦。", detail: "见物起卦、遇事起卦，重在当下的感应与外应配合。" },

  // ── 生克 ──
  { term: "用生体", group: "关系", brief: "所占之事反过来滋养自己。", detail: "主有人相助、事来就我，为梅花第一等吉象。" },
  { term: "体克用", group: "关系", brief: "自己有力量制约所占之事。", detail: "主事在掌握、谋为可成，只是要自己出力。" },
  { term: "体生用", group: "关系", brief: "自身之力外泄于所占之事。", detail: "主出钱出力操心而回报不彰，是「做得成但划不来」。" },
  { term: "用克体", group: "关系", brief: "所占之事反过来伤我。", detail: "主阻力大、宜守不宜进；要看互变有无救应，不可断为灾祸。" },
  { term: "五行生克", group: "关系", brief: "金生水、水生木、木生火、火生土、土生金；金克木、木克土、土克水、水克火、火克金。", detail: "梅花全部论断都建立在这套关系上，先认卦的五行，再看谁生谁克。" },

  // ── 应期 ──
  { term: "应期", group: "运程", brief: "事情应验的时间。", detail: "梅花常取卦数、卦气所值之时序（如震巽应春、离应夏）推断，给区间不给确定日期。" },
];

const TERM_INDEX: { key: string; term: GlossaryTerm }[] = MEIHUA_GLOSSARY.flatMap((t) => [
  { key: t.term, term: t },
  ...(t.alias ?? []).map((a) => ({ key: a, term: t })),
]).sort((a, b) => b.key.length - a.key.length);

export function extractMeihuaGlossary(texts: string[]): GlossaryTerm[] {
  const joined = texts.filter(Boolean).join("\n");
  if (!joined) return [];
  const hit = new Map<string, GlossaryTerm>();
  for (const { key, term } of TERM_INDEX) {
    if (hit.has(term.term)) continue;
    if (key.length < 2) continue;
    if (joined.includes(key)) hit.set(term.term, term);
  }
  return [...hit.values()].sort((a, b) => b.term.length - a.term.length);
}
