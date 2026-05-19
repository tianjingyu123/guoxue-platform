// ── 工具字典分类 Prompt Builders ──
// 飞宫小奇门/手机号分析/万年历/康熙字典/汉字筛选

/** 飞宫小奇门 */
export function buildFeiGongQiMenPrompt(_input: any, result: any): string {
  const gongLines = result.gongs?.map((g: any) =>
    `[${g.pos}宫·${g.direction}] 星：${g.star} | 门：${g.men} | 干：${g.tianGan}/${g.diGan} | ${g.jiXiong} — ${g.comment}`
  ).join("\n") ?? "";

  return `你是精通飞宫小奇门（简化奇门）的预测专家，请根据以下排盘分析。

## 基本信息
- 局数：${result.basicInfo?.juShu ?? "-"}局（${result.basicInfo?.dunType ?? "-"}）
- 旬首：${result.basicInfo?.xunShou ?? "-"}
- 值符：${result.basicInfo?.zhiFuStar ?? "-"} / 值使：${result.basicInfo?.zhiShiMen ?? "-"}
- 时辰：${result.basicInfo?.shiGanZhi ?? "-"}

## 九宫盘
${gongLines}

## 用神
- 日干落宫：${result.yongShen?.riGanGong ?? "-"}宫（求测人）
- 时干落宫：${result.yongShen?.shiGanGong ?? "-"}宫（所测事）
- 关系：${result.yongShen?.relation ?? "-"}

## 格局
${result.geJu?.map((g: any) => `[${g.gong}宫] ${g.name}（${g.jiXiong}）：${g.desc}`).join("\n") ?? "无"}

---
请从星门组合/用神落宫/格局吉凶/日时关系/行动建议等方面进行简明分析。`;
}

/** 手机号分析 */
export function buildPhoneAnalysisPrompt(_input: any, result: any): string {
  const pairLines = result.pairs?.slice(0, 10).map((p: any) =>
    `${p.pair} → ${p.ciChang}（${p.jiXiong}）— ${p.meaning}`
  ).join("\n") ?? "";

  return `你是精通数字能量学（八星磁场）和五行八卦号码分析的资深专家，请根据以下号码分析进行解读。

## 号码信息
${result.breakdown ? `- 段号：${result.breakdown.carrier}\n- 归属地：${result.breakdown.location}\n- 尾号：${result.breakdown.tail}` : ""}

## 数字对磁场
${pairLines}

## 五行分析
${result.wuXing ? `${result.wuXing.desc}
- 主导五行：${result.wuXing.dominant}
- 缺失五行：${result.wuXing.missing?.join("、") || "无"}
${result.wuXing.matchScore ? `- 与机主八字匹配度：${result.wuXing.matchScore}%` : ""}` : "暂无"}

## 磁场总评
${result.ciChangSummary ? `- 主磁场：${result.ciChangSummary.main}\n- 分布：${result.ciChangSummary.distribution?.map((d: any) => `${d.type}(${d.count}组)`).join("、")}\n- 吉凶比：${result.ciChangSummary.jiXiongRatio}` : "暂无"}

## 评分：${result.totalScore ?? "-"}/100
- 事业：${result.scores?.career ?? "-"} | 财运：${result.scores?.wealth ?? "-"} | 感情：${result.scores?.love ?? "-"} | 健康：${result.scores?.health ?? "-"} | 人际：${result.scores?.social ?? "-"}

---
请从八星磁场/五行补益/号码结构/各维度运势影响/选号建议等方面进行专业分析。`;
}

/** 万年历 */
export function buildWanNianLiPrompt(_input: any, result: any): string {
  const dayDetail = result.days?.[0];
  const dayInfo = dayDetail ? `
## 当日详情
- 公历：${dayDetail.solarDate} 星期${dayDetail.weekDay}
- 农历：${dayDetail.lunarDate}${dayDetail.isLeap ? "（闰月）" : ""}
- 干支：年${dayDetail.nianGanZhi} 月${dayDetail.yueGanZhi} 日${dayDetail.riGanZhi}
- 纳音：${dayDetail.naYin}
- 建除：${dayDetail.jianChu}
- 二十八宿：${dayDetail.erShiBaXiu}
- 彭祖百忌：${dayDetail.pengZu}
- 冲煞：${dayDetail.chongSha} | 岁煞：${dayDetail.suiSha}

## 黄历宜忌
- 宜：${dayDetail.yi?.join("、") || "无"}
- 忌：${dayDetail.ji?.join("、") || "无"}

## 吉神凶煞
- 吉神：${dayDetail.jiShen?.join("、") || "无"}
- 凶煞：${dayDetail.xiongSha?.join("、") || "无"}` : "";

  const zeJiInfo = result.zeJi ? `
## 择吉结果
${result.zeJi.jiDays?.map((d: any) => `${d.date}（评分${d.score}）：${d.reasons?.join("；")}`).join("\n") ?? ""}

## 各方法分析
${result.zeJi.methodAnalysis?.map((m: any) => `${m.method}：${m.result}`).join("\n") ?? ""}

## 综合择吉建议
${result.zeJi.suggestion ?? ""}` : "";

  return `你是精通黄历择吉和万年历的资深专家，请根据以下日历信息进行分析和择吉指导。

${dayInfo}
${zeJiInfo}

## 本月节气
${result.jieQiList?.map((j: any) => `${j.name}：${j.date} ${j.time}`).join("\n") ?? "暂无"}

## 月相
${result.moonPhases?.map((m: any) => `${m.date} ${m.phase}`).join("\n") ?? "暂无"}

---
请从黄历宜忌/建除值日/二十八宿/神煞吉凶/时辰选择/择吉建议等方面进行分析，给出来自多种择吉方法的综合判断。`;
}

/** 康熙字典 */
export function buildKangXiPrompt(_input: any, result: any): string {
  const charLines = result.chars?.slice(0, 10).map((c: any) =>
    `「${c.char}」康熙${c.kangXiStroke}画 / 简体${c.simpleStroke}画 | 部首${c.radical} | 五行${c.wuXing} | 拼音：${c.pinyin?.join("、") || "-"}
    字义：${c.meaning}
    姓名学：${c.nameMeaning}
    ${c.isNameRecommended ? "【姓名推荐字】" : ""}`
  ).join("\n\n") ?? "";

  return `你是精通汉字学和姓名学的文字专家，请根据以下汉字查询结果进行分析。

## 查询结果（共${result.total ?? 0}字，显示前10字）
${charLines}

## 统计信息
${result.stats?.map((s: any) => `五行${s.wuXing}：${s.count}字（笔画${s.strokeRange}）`).join("\n") ?? "暂无"}

---
请从字义源流/五行属性/姓名学适用性/音韵搭配等方面进行分析，给出起名选字建议。`;
}

/** 汉字筛选 */
export function buildHanZiFilterPrompt(_input: any, result: any): string {
  const charList = result.chars?.slice(0, 15).map((c: any) =>
    `「${c.char}」${c.kangXiStroke}画·五行${c.wuXing} | 拼音${c.pinyin} | ${c.meaning} | ${c.nameComment ?? ""} ${c.zodiacFit ? `生肖${c.zodiacFit}` : ""}`
  ).join("\n") ?? "";

  return `你是精通起名选字和汉字学的资深专家，请根据以下筛选结果进行推荐和分析。

## 筛选条件
${result.input?.conditions ? JSON.stringify(result.input.conditions, null, 2) : "未指定筛选条件"}

## 筛选结果（共${result.total ?? 0}字，显示前15字）
${charList}

## 统计
${result.stats ? `五行分布：${JSON.stringify(result.stats.wuXingDist)}` : ""}

---
请从筛选条件匹配度/五行搭配/生肖适配/音韵协调/起名实用性等方面进行分析，推荐最优选字组合。`;
}
