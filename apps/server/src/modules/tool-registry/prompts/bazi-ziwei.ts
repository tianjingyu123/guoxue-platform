// ── 八字紫微分类 Prompt Builders ──

import type { BaziInput, BaziResult } from "@guoxue/shared";

function fmtPillar(p: any) {
  return `${p.gan}${p.zhi}（${p.nayin}）`;
}

/** 八字排盘 AI 分析 prompt */
export function buildBaziPrompt(input: BaziInput, result: BaziResult): string {
  const { siZhu, qiYun, shenSha, geJu, wuXingEnergy, kongWang, shengXiao, fenXiTiShi, taiYuan, mingGong, shenGong } = result;

  const shiShenLines = [
    `年干：${siZhu.nian.ganShiShen}  年支：${siZhu.nian.zhiShiShen}`,
    `月干：${siZhu.yue.ganShiShen}  月支：${siZhu.yue.zhiShiShen}`,
    `日干：${siZhu.ri.gan}（日主）  日支：${siZhu.ri.zhiShiShen}`,
    `时干：${siZhu.shi.ganShiShen}  时支：${siZhu.shi.zhiShiShen}`,
  ];

  const daYunLines = qiYun.daYun.map((d) => `${d.ganZhi}（${d.startAge}-${d.endAge}岁）`);
  const shenShaLines = shenSha.slice(0, 15).map(
    (s) => `${s.name}（${s.pillar}，${s.type === "ji" ? "吉" : "凶"}）：${s.desc}`,
  );

  const cangGanLines = [
    `年支${siZhu.nian.zhi}藏：${siZhu.nian.cangGan.map((c: any) => `${c.gan}（${c.shiShen}）`).join("、")}`,
    `月支${siZhu.yue.zhi}藏：${siZhu.yue.cangGan.map((c: any) => `${c.gan}（${c.shiShen}）`).join("、")}`,
    `日支${siZhu.ri.zhi}藏：${siZhu.ri.cangGan.map((c: any) => `${c.gan}（${c.shiShen}）`).join("、")}`,
    `时支${siZhu.shi.zhi}藏：${siZhu.shi.cangGan.map((c: any) => `${c.gan}（${c.shiShen}）`).join("、")}`,
  ];

  const fenXiLines: string[] = [];
  if (fenXiTiShi.ganHe?.length) fenXiLines.push(`天干五合：${fenXiTiShi.ganHe.join("、")}`);
  if (fenXiTiShi.sanHe?.length) fenXiLines.push(`地支三合：${fenXiTiShi.sanHe.join("、")}`);
  if (fenXiTiShi.sanHui?.length) fenXiLines.push(`地支三会：${fenXiTiShi.sanHui.join("、")}`);
  if (fenXiTiShi.liuChong?.length) fenXiLines.push(`地支六冲：${fenXiTiShi.liuChong.join("、")}`);
  if (fenXiTiShi.liuHe?.length) fenXiLines.push(`地支六合：${fenXiTiShi.liuHe.join("、")}`);
  if (fenXiTiShi.liuHai?.length) fenXiLines.push(`地支六害：${fenXiTiShi.liuHai.join("、")}`);

  const diShiLine = siZhu.nian.diShi
    ? `地势：年柱${siZhu.nian.diShi} / 月柱${siZhu.yue.diShi} / 日柱${siZhu.ri.diShi} / 时柱${siZhu.shi.diShi}` : "";
  const ziZuoLine = siZhu.nian.ziZuo
    ? `自坐：年柱坐${siZhu.nian.ziZuo} / 月柱坐${siZhu.yue.ziZuo ?? "-"} / 日柱坐${siZhu.ri.ziZuo ?? "-"} / 时柱坐${siZhu.shi.ziZuo ?? "-"}` : "";

  return `你是精通中国传统八字命理学的资深专家，请根据以下排盘数据进行详细专业的命理分析。

## 出生信息
- 姓名：${(input as any).name || "未知"}
- 性别：${input.gender}
- 出生时间：${input.year}年${input.month}月${input.day}日 ${input.hour}时${input.minute ?? 0}分
- 生肖：${shengXiao}
${diShiLine ? `- ${diShiLine}\n` : ""}${ziZuoLine ? `- ${ziZuoLine}\n` : ""}
## 四柱八字
- 年柱：${fmtPillar(siZhu.nian)}
- 月柱：${fmtPillar(siZhu.yue)}
- 日柱：${fmtPillar(siZhu.ri)}
- 时柱：${fmtPillar(siZhu.shi)}
- 空亡：${kongWang}
- 胎元：${fmtPillar(taiYuan)}
- 命宫：${fmtPillar(mingGong)}
- 身宫：${fmtPillar(shenGong)}

## 藏干
${cangGanLines.join("\n")}

## 十神分布
${shiShenLines.join("\n")}

## 五行能量
${wuXingEnergy ? `木 ${wuXingEnergy.mu}% | 火 ${wuXingEnergy.huo}% | 土 ${wuXingEnergy.tu}% | 金 ${wuXingEnergy.jin}% | 水 ${wuXingEnergy.shui}%\n${wuXingEnergy.desc}` : "暂无"}

## 格局分析
${geJu ? `格局：${geJu.name}（${geJu.type === "zheng" ? "正格" : "变格"}）\n用神：${geJu.yongShen}  喜神：${geJu.xiShen}  忌神：${geJu.jiShen}\n描述：${geJu.desc}` : "暂无"}

## 大运走势
起运年龄：${qiYun.startAge}岁  起运时间：${qiYun.desc}
${daYunLines.join("\n")}

## 神煞
${shenShaLines.join("\n")}

## 合冲刑害
${fenXiLines.join("\n") || "无显著合冲刑害关系"}

---
请从以下8个方面详细分析：格局与用神/性格特征/事业发展/财运分析/婚姻感情/健康状况/大运走势/流年建议。
要求：语言专业严谨但不晦涩，多用生动比喻，给出切实可行的人生建议。`;
}

/** 紫微斗数 AI 分析 prompt */
export function buildZiWeiPrompt(_input: any, result: any): string {
  const gongLines = result.gongs?.map((g: any) => {
    const stars = [g.majorStar, ...(g.minorStars ?? [])].filter(Boolean).join("、");
    const tags: string[] = [];
    if (g.shenGong) tags.push("身宫");
    if (g.laiYin) tags.push(`来因宫`);
    const tagStr = tags.length ? ` [${tags.join("、")}]` : "";
    return `[${g.name}] 主星：${stars}${tagStr}\n  ${g.interpretation ?? ""}`;
  }).join("\n\n") ?? "";

  const yunLines = result.daYun?.map((y: any) =>
    `${y.lunarAge}岁起：${y.gong}宫（${y.gua}），${y.desc ?? ""}`
  ).join("\n") ?? "";

  return `你是精通紫微斗数的资深专家，请根据以下命盘进行详细分析。

## 基本信息
- 性别：${(result.input as any)?.gender ?? "-"}
- 命宫：${result.mingGong ?? "-"}
- 身宫：${result.shenGong ?? "-"}
- 五行局：${result.wuXingJu ?? "-"}
- 四化：${result.siHua ? Object.entries(result.siHua).map(([k, v]) => `${k}化${v}`).join(" / ") : "-"}
- 来因宫：${result.laiYinGong ?? "-"}

## 十二宫
${gongLines}

## 四化飞星
${result.siHuaFeiXing ?? "暂无"}

## 大运走势
${yunLines}

## 特殊格局
${result.geJu?.map((g: any) => `${g.name}：${g.desc}`).join("\n") ?? "无"}

---
请从以下6个方面分析：命宫核心性格/事业财运/婚姻感情/健康状况/大运走势/流年建议。
要求：专业深入，结合实际生活给出可操作建议。`;
}
