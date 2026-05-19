// ── 奇门遁甲分类 Prompt Builders ──

import type { QimenYangInput, QimenResult } from "@guoxue/shared";

/** 阳盘奇门 AI 分析 */
export function buildQimenYangPrompt(input: QimenYangInput, result: QimenResult): string {
  const gongLines = result.gongs.map((g) => {
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

  return `你是精通奇门遁甲的资深专家，请根据以下阳盘奇门排盘数据进行详细分析。

## 排盘参数
- 排盘方法：${input.method}
- 起居方式：${input.qiJuMethod ?? "拆补"}
- 排盘时间：${input.datetime ?? "当前时间"}

## 局数信息
- 阴阳遁：${result.dunType}
- 局数：${result.juNumber}局
- 节气：${result.jieQi}
- 用事时辰：${result.yongShi}
- 值符：${result.zhiFu}
- 值使门：${result.zhiShiMen}

## 九宫盘
${gongLines.join("\n")}

## 地盘八神
${result.dipanBashen.join("、")}

---
请从以下5个方面进行分析：大局分析/值符值使/用神分析/应期判断/行动建议。
要求：专业严谨，有理有据，给出切实可行的行动建议。`;
}

/** 阳盘命理奇门 AI 分析 */
export function buildQimenYangMingLiPrompt(input: QimenYangInput, result: QimenResult): string {
  const gongLines = result.gongs.map((g) => {
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

  const mingLiInfo = (result as any).mingLiInfo;

  return `你是精通奇门命理的资深专家，请根据以下阳盘命理奇门排盘进行命理分析。

## 出生信息
- 出生时间：${(input as any).birthTime ?? "-"}
- 出生地点：${(input as any).birthplace ?? "未知"}
- 性别：${(input as any).gender ?? "-"}

## 命理盘局
- 阴阳遁：${result.dunType}
- 局数：${result.juNumber}局
${mingLiInfo ? `- 命宫：${mingLiInfo.mingGong ?? "-"}\n- 身宫：${mingLiInfo.shenGong ?? "-"}\n- 大运：${mingLiInfo.daYun ?? "-"}` : ""}

## 九宫盘
${gongLines.join("\n")}

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
