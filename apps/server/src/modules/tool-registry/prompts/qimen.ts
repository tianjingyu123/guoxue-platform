// ── 奇门遁甲分类 Prompt Builders ──

import type { QimenYangInput, QimenResult } from "@guoxue/shared";

/** 阳盘奇门 AI 分析 */
export function buildQimenYangPrompt(input: QimenYangInput, result: QimenResult): string {
  const safeResult = (result ?? {}) as Partial<QimenResult>;
  const gongLines = (Array.isArray(safeResult.gongs) ? safeResult.gongs : []).map((g) => {
    const parts: string[] = [];
    if (g.star) parts.push(`星：${g.star}`);
    if (g.men) parts.push(`门：${g.men}`);
    if (g.shen) parts.push(`神：${g.shen}`);
    if (g.tianPan) parts.push(`天盘：${g.tianPan}`);
    if (g.diPan) parts.push(`地盘：${g.diPan}`);
    const tags: string[] = [];
    if (g.kongWang) tags.push("空亡");
    if (g.maXing) tags.push("马星");
    if (g.isRuMu) tags.push("入墓");
    if (g.isJiXing) tags.push("击刑");
    if (g.isMenPo) tags.push("门破");
    const tagStr = tags.length ? ` [${tags.join("、")}]` : "";
    return `[${g.name}] ${parts.join(" | ")}${tagStr}`;
  });
  const rawInput = (input ?? {}) as QimenYangInput & { matter?: string; question?: string; panMethod?: string; startMethod?: string };
  const matter = rawInput.matter || rawInput.question || "未填写（按盘面作通用分析）";

  return `你是精通奇门遁甲的资深专家，请根据以下阳盘奇门排盘数据进行详细分析。

## 排盘参数
- 所问事项：${matter}
- 排盘方法：${rawInput.method ?? rawInput.panMethod ?? "转盘"}
- 起局方式：${rawInput.qiJuMethod ?? rawInput.startMethod ?? "拆补"}
- 排盘时间：${rawInput.datetime ?? "当前时间"}

## 局数信息
- 阴阳遁：${safeResult.dunType ?? "未知"}
- 局数：${safeResult.juNumber ?? "未知"}局
- 节气：${safeResult.jieQi ?? "未知"}
- 用事时辰：${safeResult.yongShi ?? "未知"}
- 值符：${safeResult.zhiFu ?? "未知"}
- 值使门：${safeResult.zhiShiMen ?? "未知"}

## 九宫盘
${gongLines.join("\n") || "暂无九宫数据"}

## 地盘八神
${Array.isArray(safeResult.dipanBashen) ? safeResult.dipanBashen.join("、") : "暂无"}

---
请从以下5个方面进行分析：大局分析/值符值使/用神分析/应期判断/行动建议。
要求：专业严谨，有理有据，给出切实可行的行动建议。`;
}

/** 阳盘命理奇门 AI 分析 */
export function buildQimenYangMingLiPrompt(input: QimenYangInput, result: QimenResult): string {
  const safeResult = (result ?? {}) as Partial<QimenResult> & { mingli?: any; mingLiInfo?: any };
  const gongLines = (Array.isArray(safeResult.gongs) ? safeResult.gongs : []).map((g) => {
    const parts: string[] = [];
    if (g.star) parts.push(`星：${g.star}`);
    if (g.men) parts.push(`门：${g.men}`);
    if (g.shen) parts.push(`神：${g.shen}`);
    const tags: string[] = [];
    if (g.kongWang) tags.push("空亡");
    if (g.maXing) tags.push("马星");
    const tagStr = tags.length ? ` [${tags.join("、")}]` : "";
    return `[${g.name}] ${parts.join(" | ")}${tagStr}`;
  });

  const rawInput = (input ?? {}) as QimenYangInput & {
    birthTime?: string; birthplace?: string; place?: string; gender?: string;
  };
  // 兼容注册中心旧结构 mingLiInfo 与当前阳盘页真实返回字段 mingli。
  const mingLiInfo = safeResult.mingli ?? safeResult.mingLiInfo ?? {};
  const siZhu = mingLiInfo.siZhu;
  const pillar = (p: any) => p?.gan && p?.zhi ? `${p.gan}${p.zhi}` : "—";
  const siZhuLine = siZhu
    ? `${pillar(siZhu.nian)} ${pillar(siZhu.yue)} ${pillar(siZhu.ri)} ${pillar(siZhu.shi)}`
    : "暂无";
  const daYunLine = Array.isArray(mingLiInfo.daYun) && mingLiInfo.daYun.length
    ? mingLiInfo.daYun.slice(0, 8).map((item: any) =>
      `${item.gan ?? ""}${item.zhi ?? ""}（${item.startAge ?? "?"}-${item.endAge ?? "?"}岁）`,
    ).join("、")
    : "暂无";

  return `你是精通奇门命理的资深专家，请根据以下阳盘命理奇门排盘进行命理分析。

## 出生信息
- 出生时间：${rawInput.birthTime ?? rawInput.datetime ?? "-"}
- 出生地点：${rawInput.birthplace ?? rawInput.place ?? "未知"}
- 性别：${rawInput.gender ?? "-"}
- 四柱：${siZhuLine}

## 命理盘局
- 阴阳遁：${safeResult.dunType ?? "未知"}
- 局数：${safeResult.juNumber ?? "未知"}局
- 值符：${safeResult.zhiFu ?? "未知"}
- 值使门：${safeResult.zhiShiMen ?? "未知"}
- 起运：${mingLiInfo.qiYun?.desc ?? (mingLiInfo.qiYun?.startAge != null ? `${mingLiInfo.qiYun.startAge}岁` : "暂无")}
- 大运：${daYunLine}

## 九宫盘
${gongLines.join("\n") || "暂无九宫数据"}

---
请从以下4个方面进行分析：命宫解读/事业财运/婚姻感情/大运走势。
要求：专业但不晦涩，给出具体可操作的建议。`;
}

/** 阴盘奇门 AI 分析 */
export function buildQimenYinPrompt(_input: any, result: any): string {
  const gongLines = result.gongs?.map((g: any) => {
    const parts: string[] = [];
    if (g.star) parts.push(`星：${g.star}`);
    if (g.men) parts.push(`门：${g.men}`);
    if (g.shen) parts.push(`神：${g.shen}`);
    if (g.tianPan) parts.push(`天盘：${g.tianPan}`);
    if (g.diPan) parts.push(`地盘：${g.diPan}`);
    const tags: string[] = [];
    if (g.kongWang) tags.push("空亡");
    if (g.anGan) tags.push(`暗干：${g.anGan}`);
    const tagStr = tags.length ? ` [${tags.join("、")}]` : "";
    return `[${g.name}] ${parts.join(" | ")}${tagStr}`;
  }).join("\n") ?? "";

  return `你是精通王凤麟阴盘奇门遁甲的资深专家，请根据以下排盘数据进行详细分析。

## 排盘信息
- 排盘类型：${result.input?.panType ?? "时盘"}
- 排盘时间：${result.input?.datetime ?? "-"}
- 阴阳遁：${result.dunType}
- 局数：${result.juNumber}局
- 值符：${result.zhiFu}
- 值使门：${result.zhiShiMen}

## 九宫盘
${gongLines}

## 天门地户
${result.tianMenDiHu ? `天门：${result.tianMenDiHu.tianMen ?? "-"} | 地户：${result.tianMenDiHu.diHu ?? "-"}` : "暂无"}

## 移星换斗参考
${result.yiXingHuanDou ? result.yiXingHuanDou.map((y: any) => `[${y.gong}] ${y.desc}`).join("\n") : "暂无"}

---
请从以下5个方面进行分析：大局判断/值符值使/用神落宫/移星换斗化解建议/应期判断。
要求：阴盘视角，强调象意解读和化解方案，给出可操作的调整建议。`;
}

/** 阴盘命理奇门 AI 分析 */
export function buildQimenYinMingLiPrompt(_input: any, result: any): string {
  const gongLines = result.gongs?.map((g: any) => {
    const parts: string[] = [];
    if (g.star) parts.push(`星：${g.star}`);
    if (g.men) parts.push(`门：${g.men}`);
    if (g.shen) parts.push(`神：${g.shen}`);
    return `[${g.name}] ${parts.join(" | ")}`;
  }).join("\n") ?? "";

  return `你是精通阴盘命理奇门的资深专家，请根据以下命理排盘进行分析。

## 出生信息
- 出生时间：${(result.input as any)?.birthTime ?? "-"}
- 性别：${(result.input as any)?.gender ?? "-"}
- 命宫：${result.mingGong ?? "-"}
- 身宫：${result.shenGong ?? "-"}

## 九宫盘
${gongLines}

## 大运流年
${result.liuNian?.map((l: any) => `${l.year}年：${l.gong}宫 ${l.desc}`).join("\n") ?? "暂无"}

---
请从命宫解读/事业财运/婚姻感情/大运走势/化解建议等方面进行分析。`;
}

/** 山向奇门 AI 分析 */
export function buildShanXiangQimenPrompt(_input: any, result: any): string {
  return `你是精通山向奇门的资深风水专家，请根据以下排盘进行分析。

## 山向信息
- 坐山：${result.input?.zuoShan ?? "-"}
- 朝向：${result.input?.xiang ?? "-"}
- 度数：${result.input?.duShu ?? "-"}

## 奇门盘
${result.gongs?.map((g: any) => `[${g.name}] ${g.star ?? ""} ${g.men ?? ""} ${g.shen ?? ""} ${g.tianPan ?? ""}|${g.diPan ?? ""}`).join("\n") ?? "暂无"}

## 综合断语
${result.duanYu ?? "暂无"}

---
请从山向定局/奇门克应/风水建议/择日参考等方面进行专业分析。`;
}

/** 奇门穿壬 AI 分析 */
export function buildQimenChuanRenPrompt(_input: any, result: any): string {
  const qmGongLines = result.qimenGongs?.map((g: any) =>
    `[${g.name}] ${g.star ?? ""} | ${g.men ?? ""} | ${g.shen ?? ""} | ${g.tianPan ?? ""}/${g.diPan ?? ""}`
  ).join("\n") ?? "";

  const lrLines = result.liurenKe?.slice(0, 4).map((k: any) =>
    `第${k.index}课：${k.description ?? k.zhi ?? "-"}`
  ).join("\n") ?? "";

  return `你是精通奇门穿壬（奇门六壬双盘穿针）的资深专家。奇门穿壬以内层奇门九宫+外层六壬四课三传双层嵌套，请根据以下双盘数据进行分析。

## 基本信息
- 排盘时间：${result.input?.datetime ?? "-"}
- 节气：${result.jieQi ?? "-"}

## 奇门盘（内层）
${qmGongLines}

## 六壬盘（外层）
- 日柱：${result.riGanZhi ?? "-"}
- 月将：${result.yueJiang ?? "-"}
${lrLines}
- 三传：${result.sanChuan?.map((s: any) => s.zhi + (s.dunGan ? `(${s.dunGan})` : "")).join(" → ") ?? "暂无"}

---
请从奇门克应/六壬课体/穿针要点/综合判断/行动建议等方面进行双层综合分析。
要求：突出"穿"的核心逻辑——奇门星门宫与六壬四课三传的对应关系。`;
}
