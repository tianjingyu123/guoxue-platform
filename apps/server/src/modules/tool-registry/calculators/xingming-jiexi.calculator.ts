// ── 姓名解析计算引擎 ──
// 五格数理/三才配置/81数理/笔画分析

import type { WuGeResult, WuGeName, ShuLiJiXiong, SanCaiWuXing, GeDetail, SanCaiConfig, StrokeDetail } from "@guoxue/shared";
import { getKangXiStroke, getWuXingByStroke, getShuLi, getShengXiaoNamingScore, getShengXiaoByYear } from "./xingming-data";
import type { ShengXiao } from "./xingming-data";

// 三才配置分析
function analyzeSanCai(tianWx: SanCaiWuXing, renWx: SanCaiWuXing, diWx: SanCaiWuXing): SanCaiConfig {
  const combo = `${tianWx}${renWx}${diWx}`;
  const wuxingOrder = ["木","火","土","金","水"];
  const tianIdx = wuxingOrder.indexOf(tianWx);
  const renIdx = wuxingOrder.indexOf(renWx);
  const diIdx = wuxingOrder.indexOf(diWx);
  const isSheng = (a: number, b: number) => (a + 1) % 5 === b;
  const isKe = (a: number, b: number) => (a + 2) % 5 === b;

  let jiXiong: ShuLiJiXiong = "吉";
  if (isKe(tianIdx, renIdx) || isKe(renIdx, diIdx)) jiXiong = "凶";
  if (isSheng(tianIdx, renIdx) && isSheng(renIdx, diIdx)) jiXiong = "大吉";

  return {
    tian: tianWx, ren: renWx, di: diWx, combo, jiXiong,
    desc: `${combo}三才配置，天${tianWx}人${renWx}地${diWx}，${jiXiong === "大吉" ? "生克有序，大吉大利。" : jiXiong === "吉" ? "配置尚可。": "宜注意调和。"}`,
    jiChuYun: isSheng(tianIdx, renIdx) ? "基础稳固，得长辈助力。" : "基础不稳，宜自我奋斗。",
    chengGongYun: isSheng(renIdx, diIdx) ? "成功运佳，努力可得回报。" : "成功运迟，需更多耐心。",
    sheJiaoYun: isSheng(tianIdx, diIdx) ? "社交运佳，人缘好。" : "社交需更加主动。",
  };
}

export function calculateXingmingJiexi(input: Record<string, unknown>): WuGeResult {
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
      simpleStroke: c.charCodeAt(0) % 15 + 1,
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

  const scoreBase = geDetails.filter(g => g.jiXiong === "大吉" || g.jiXiong === "吉").length * 15 + 25;
  const wuGeScore = Math.min(50, scoreBase);
  const sanCaiScore = sanCai.jiXiong === "大吉" ? 25 : sanCai.jiXiong === "吉" ? 18 : 10;
  const totalScore = wuGeScore + sanCaiScore + 5 + (gender ? 5 : 0);

  const duanYu = `姓名${surname}${givenName}，天格${tianGe}/人格${renGe}/地格${diGe}/总格${zongGe}/外格${waiGe}。三才配置${sanCai.combo}，${sanCai.jiXiong}。${totalScore >= 70 ? "姓名吉祥，宜使用。" : "姓名中平，可酌情调整。"}`;

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

  return {
    input: { surname, givenName, kangXiStrokes: true, gender },
    strokes,
    geDetails,
    sanCai,
    renWaiRelation: { relation: "外格生人格", desc: "人际助力大，外缘好。" },
    renDiRelation: { relation: "人格生地格", desc: "对晚辈/下属有恩。" },
    totalScore: finalScore,
    scores: finalScores,
    duanYu: finalDuanYu,
    ...(shengXiaoAnalysis ? { shengXiaoAnalysis } : {}),
  };
}
