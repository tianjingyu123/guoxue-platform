// ── 姓名解析计算引擎 ──
// 算法参考：《康熙字典》《五格剖象法》
// 五格数理/三才配置/81数理/笔画分析

import type { WuGeResult, WuGeName, ShuLiJiXiong, SanCaiWuXing, GeDetail, SanCaiConfig, StrokeDetail } from "@guoxue/shared";
import { getKangXiStroke, getWuXingByStroke, getShuLi, getShengXiaoNamingScore, getShengXiaoByYear, SAN_CAI_TABLE } from "./xingming-data";
import type { ShengXiao } from "./xingming-data";

// 三才配置分析（使用125条全表查表）
function analyzeSanCai(tianWx: SanCaiWuXing, renWx: SanCaiWuXing, diWx: SanCaiWuXing): SanCaiConfig {
  const combo = `${tianWx}${renWx}${diWx}`;
  const entry = SAN_CAI_TABLE[combo];

  if (entry) {
    return {
      tian: tianWx, ren: renWx, di: diWx, combo,
      jiXiong: entry.jiXiong as ShuLiJiXiong,
      desc: entry.desc,
      jiChuYun: entry.jiChuYun,
      chengGongYun: entry.chengGongYun,
      sheJiaoYun: entry.sheJiaoYun,
    };
  }

  return {
    tian: tianWx, ren: renWx, di: diWx, combo,
    jiXiong: "半吉",
    desc: `${combo}三才配置，需具体分析。`,
    jiChuYun: "运势中平。",
    chengGongYun: "努力可得。",
    sheJiaoYun: "待人以诚。",
  };
}

export function calculateXingmingJiexi(input: Record<string, unknown>): WuGeResult & { summary: string } {
  const surname = (input.surname as string) ?? "张";
  const givenName = (input.givenName as string) ?? "三";
  const gender = input.gender as "male" | "female" | undefined;
  const shengXiaoInput = input.shengXiao as string | undefined;
  const birthYear = input.birthYear as number | undefined;

  const allChars = [...surname, ...givenName];
  const strokes: StrokeDetail[] = allChars.map(c => {
    const kx = getKangXiStroke(c);
    return {
      char: c,
      kangXiStroke: kx,
      simpleStroke: kx,
      wuXing: getWuXingByStroke(kx) as SanCaiWuXing,
      radical: c,
    };
  });

  const surnameStrokes = strokes.slice(0, surname.length).reduce((s, x) => s + x.kangXiStroke, 0);
  const givenStrokes = strokes.slice(surname.length).reduce((s, x) => s + x.kangXiStroke, 0);

  const tianGe = surnameStrokes + 1;
  const renGe = surnameStrokes + givenStrokes;
  const diGe = givenStrokes + 1;
  const zongGe = surnameStrokes + givenStrokes;
  const waiGe = zongGe - renGe + 1;

  const geNums: Record<WuGeName, number> = { "天格": tianGe, "人格": renGe, "地格": diGe, "总格": zongGe, "外格": waiGe };
  const geDetails: GeDetail[] = (Object.entries(geNums) as [WuGeName, number][]).map(([name, num]) => {
    const shuLiNum = num > 81 ? ((num - 1) % 81) + 1 : num;
    const shuLi = getShuLi(shuLiNum) ?? {
      name: `${shuLiNum}数`,
      jiXiong: (shuLiNum % 3 === 0 ? "吉" : shuLiNum % 3 === 1 ? "平" : "凶") as string,
      meaning: `数理${shuLiNum}，因人而异。`,
      poem: `数理${shuLiNum}，详察其义。`,
      hints: { jiYe: "因人而异", jiaTing: "因人而异", jianKang: "因人而异" },
    };
    return {
      name, number: num, wuXing: getWuXingByStroke(num) as SanCaiWuXing,
      jiXiong: shuLi.jiXiong as ShuLiJiXiong,
      shuLiName: shuLi.name, meaning: shuLi.meaning, poem: shuLi.poem,
      hints: { jiYe: shuLi.hints.jiYe, jiaTing: shuLi.hints.jiaTing, jianKang: shuLi.hints.jianKang },
    };
  });

  const sanCai = analyzeSanCai(
    getWuXingByStroke(tianGe) as SanCaiWuXing,
    getWuXingByStroke(renGe) as SanCaiWuXing,
    getWuXingByStroke(diGe) as SanCaiWuXing,
  );

  // 动态计算人格与地格/外格关系（基于五行生克）
  const wuxingOrder = ["木","火","土","金","水"];
  const isSheng = (a: number, b: number) => (a + 1) % 5 === b;
  const isKe = (a: number, b: number) => (a + 2) % 5 === b;

  const renWx = getWuXingByStroke(renGe) as SanCaiWuXing;
  const diWx = getWuXingByStroke(diGe) as SanCaiWuXing;
  const waiWx = getWuXingByStroke(waiGe) as SanCaiWuXing;

  function buildRelation(fromWx: string, toWx: string, fromName: string, toName: string) {
    const fi = wuxingOrder.indexOf(fromWx);
    const ti = wuxingOrder.indexOf(toWx);
    if (isSheng(fi, ti)) return { relation: `${fromName}生${toName}`, desc: `${fromName}生${toName}，相生有情，助益明显。` };
    if (isKe(fi, ti)) return { relation: `${fromName}克${toName}`, desc: `${fromName}克${toName}，有压制之象，需多调适。` };
    if (fi === ti) return { relation: `${fromName}${toName}比和`, desc: `${fromName}与${toName}同气比和，相处和谐。` };
    if (isSheng(ti, fi)) return { relation: `${toName}生${fromName}`, desc: `${toName}生${fromName}，受其滋养生扶，福分有加。` };
    return { relation: `${toName}克${fromName}`, desc: `${toName}克${fromName}，需多谦忍，以柔克刚。` };
  }

  const renDiRelation = buildRelation(renWx, diWx, "人格", "地格");
  const renWaiRelation = buildRelation(renWx, waiWx, "人格", "外格");

  const scoreBase = geDetails.filter(g => g.jiXiong === "大吉" || g.jiXiong === "吉").length * 15 + 25;
  const wuGeScore = Math.min(50, scoreBase);
  const sanCaiScore = sanCai.jiXiong === "大吉" ? 25 : sanCai.jiXiong === "吉" ? 18 : sanCai.jiXiong === "大凶" ? 5 : 10;
  const totalScore = wuGeScore + sanCaiScore + 5 + (gender ? 5 : 0);

  const duanYu = `姓名${surname}${givenName}，天格${tianGe}/人格${renGe}/地格${diGe}/总格${zongGe}/外格${waiGe}。三才配置${sanCai.combo}(${sanCai.jiXiong})。${sanCai.desc}${totalScore >= 70 ? "姓名吉祥，宜使用。" : "姓名中平，可酌情调整。"}`;

  // 生肖姓名学分析
  let shengXiaoAnalysis: WuGeResult["shengXiaoAnalysis"];
  let finalScore = totalScore;
  const finalScores = { wuGe: wuGeScore, sanCai: sanCaiScore, ziYi: 15, yinYun: 15 };
  let finalDuanYu = duanYu;

  if (shengXiaoInput || birthYear) {
    const sx = (shengXiaoInput ?? getShengXiaoByYear(birthYear!)) as ShengXiao;
    const sxAnalysis = getShengXiaoNamingScore(surname + givenName, sx);

    shengXiaoAnalysis = {
      shengXiao: sxAnalysis.shengXiao,
      score: sxAnalysis.score,
      xiYongMatches: sxAnalysis.xiYongMatches,
      jiYongMatches: sxAnalysis.jiYongMatches,
      heHui: sxAnalysis.heHui,
      liuHe: sxAnalysis.liuHe,
      chong: sxAnalysis.chong,
      hai: sxAnalysis.hai,
      namingTips: sxAnalysis.namingTips,
      analysis: sxAnalysis.analysis,
    };

    // 生肖评分并入总分（权重15%）
    finalScore = Math.round(totalScore * 0.85 + sxAnalysis.score * 0.15);
    finalScores.ziYi = Math.round(15 + sxAnalysis.score * 0.15);
    finalDuanYu = `${duanYu} 生肖${shengXiaoAnalysis.shengXiao}适配度${sxAnalysis.score}分，${sxAnalysis.xiYongMatches.length > 0 ? `喜用字根${sxAnalysis.xiYongMatches.map(m => `${m.char}(${m.radical})`).join("、")}。` : ""}${sxAnalysis.jiYongMatches.length > 0 ? `忌用字根${sxAnalysis.jiYongMatches.map(m => `${m.char}(${m.radical})`).join("、")}。` : ""}`;
  }

  const sxStr = shengXiaoAnalysis
    ? `│ 生肖：${shengXiaoAnalysis.shengXiao}（适配${shengXiaoAnalysis.score}分）`.padEnd(36) + "│\n"
    : "";
  const sxTipStr = shengXiaoAnalysis?.xiYongMatches?.length
    ? `│ 喜用字根：${shengXiaoAnalysis.xiYongMatches.map(m => m.radical).join("、")}`.padEnd(36) + "│\n"
    : "";
  const scoreBar = "█".repeat(Math.round(finalScore / 100 * 10)) + "░".repeat(10 - Math.round(finalScore / 100 * 10));

  const summary = [
    "┌─ 姓名解析 · 五格剖象 ───────────────┐",
    `│ 姓名：${surname}${givenName}`.padEnd(36) + "│",
    `│ 笔画：${strokes.map(s => s.char + "(" + s.kangXiStroke + "画)").join("")}`.padEnd(36) + "│",
    "├─ 五格数理 ─────────────────────────┤",
    ...geDetails.map(g => `│ ${g.name}：${g.number}数（${g.wuXing}/${g.jiXiong}/${g.shuLiName || ""}）`.padEnd(36) + "│"),
    "├─ 三才配置 ─────────────────────────┤",
    `│ ${sanCai.combo}（${sanCai.jiXiong}）`.padEnd(36) + "│",
    `│ ${sanCai.desc.slice(0, 30)}`.padEnd(36) + "│",
    "├─ 综合评分 ─────────────────────────┤",
    `│ 总分：${finalScore}/100 [${scoreBar}]`.padEnd(36) + "│",
    `│ 五格${finalScores.wuGe} 三才${finalScores.sanCai} 字义${finalScores.ziYi} 音韵${finalScores.yinYun}`.padEnd(36) + "│",
    sxStr.slice(0, -1) || "",
    sxTipStr.slice(0, -1) || "",
    "├─ 出处 ─────────────────────────────┤",
    "│ 《康熙字典》《五格剖象法》          │",
    "└────────────────────────────────────┘",
  ].filter(Boolean).join("\n");

  return {
    input: { surname, givenName, kangXiStrokes: true, gender },
    strokes,
    geDetails,
    sanCai,
    renWaiRelation,
    renDiRelation,
    totalScore: finalScore,
    scores: finalScores,
    duanYu: finalDuanYu,
    summary,
    ...(shengXiaoAnalysis ? { shengXiaoAnalysis } : {}),
  } as WuGeResult & { summary: string };
}
