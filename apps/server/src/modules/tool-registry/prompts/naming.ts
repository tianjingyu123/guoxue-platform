// ── 起名分类 Prompt Builders ──
// 起名工具/姓名解析（五格数理）

/** 起名工具 */
export function buildQiMingPrompt(_input: any, result: any): string {
  const candidateLines = result.candidates?.map((c: any, i: number) =>
    `${i + 1}. **${c.fullName}**（${c.givenName}） 评分：${c.totalScore}/100
   - 五格：天${c.wuGeSummary?.tianGe} 人${c.wuGeSummary?.renGe} 地${c.wuGeSummary?.diGe} 总${c.wuGeSummary?.zongGe} 外${c.wuGeSummary?.waiGe} | 三才${c.wuGeSummary?.sanCai} | ${c.wuGeSummary?.jiXiong}
   - 八字匹配：${c.baZiMatch ?? "-"}
   - 音韵：${c.phonetics?.pinyin ?? "-"}（${c.phonetics?.comment ?? "-"}）
   - 字义：${c.meaning}
   ${c.origin ? `- 出处：${c.origin}` : ""}`
  ).join("\n\n") ?? "";

  return `你是精通姓名学和八字命理的资深起名专家，请根据以下起名结果进行分析和推荐。

## 八字用神分析
- 八字：${result.baZiAnalysis?.baZi ?? "-"}
- 日主：${result.baZiAnalysis?.riZhu ?? "-"}
- 喜用神：${result.baZiAnalysis?.xiYongShen?.join("、")}
- 忌神：${result.baZiAnalysis?.jiShen?.join("、")}
- 补益五行：${result.baZiAnalysis?.buYiWuXing?.join("、")}

## 姓氏信息
${result.surnameInfo?.char ?? "-"}（康熙${result.surnameInfo?.kangXiStroke ?? "-"}画·五行${result.surnameInfo?.wuXing ?? "-"}）

## 用户选择的起名方法
${(result.input?.methods as string[])?.join("、") ?? "综合"}

## 候选名字
${candidateLines}

## 综合建议
${result.advice ?? "暂无建议"}

---
请从八字用神匹配/五格数理吉凶/音韵平仄/字义典故/生肖适配/各方法综合评判等方面进行分析。
要求：给出最终推荐排序和理由，对每个候选名字的优劣进行点评。`;
}

/** 姓名解析（五格数理） */
export function buildXingMingJieXiPrompt(_input: any, result: any): string {
  const geLines = result.geDetails?.map((g: any) =>
    `【${g.name}】数${g.number}·${g.wuXing}·${g.jiXiong}
    - 数理：${g.shuLiName}
    - 含义：${g.meaning}
    - 诗文：${g.poem}
    - 基业：${g.hints?.jiYe ?? "-"} | 家庭：${g.hints?.jiaTing ?? "-"} | 健康：${g.hints?.jianKang ?? "-"}`
  ).join("\n\n") ?? "";

  const strokeLines = result.strokes?.map((s: any) =>
    `${s.char}：康熙${s.kangXiStroke}画 / 简体${s.simpleStroke}画 | 五行${s.wuXing} | 部首${s.radical}`
  ).join("\n") ?? "";

  return `你是精通五格数理姓名学的资深专家，请根据以下姓名分析进行详细解读。

## 姓名
${result.input?.surname ?? ""}${result.input?.givenName ?? ""}

## 笔画明细
${strokeLines}

## 五格详情
${geLines}

## 三才配置
${result.sanCai ? `
- 组合：天${result.sanCai.tian}·人${result.sanCai.ren}·地${result.sanCai.di}（${result.sanCai.combo}）
- 吉凶：${result.sanCai.jiXiong}
- 暗示：${result.sanCai.desc}
- 基础运：${result.sanCai.jiChuYun}
- 成功运：${result.sanCai.chengGongYun}
- 社交运：${result.sanCai.sheJiaoYun}` : "暂无"}

## 人格关系
- 人→外：${result.renWaiRelation?.relation ?? "-"} — ${result.renWaiRelation?.desc ?? "-"}
- 人→地：${result.renDiRelation?.relation ?? "-"} — ${result.renDiRelation?.desc ?? "-"}

## 总评分：${result.totalScore ?? "-"}/100
- 五格数理：${result.scores?.wuGe ?? "-"}分
- 三才配置：${result.scores?.sanCai ?? "-"}分
- 字义：${result.scores?.ziYi ?? "-"}分
- 音韵：${result.scores?.yinYun ?? "-"}分

---
请从五格吉凶/三才配置/81数理解读/人格关系/名字优劣/改名建议等方面进行综合分析。
要求：结合81数理原典诗文，给出客观全面的评价和实用建议。`;
}
