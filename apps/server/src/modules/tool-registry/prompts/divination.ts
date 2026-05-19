// ── 占卜分类 Prompt Builders ──
// 六爻/梅花/小成图/金钱课/诸葛神数/孔明神卦

import type { LiuYaoInput, LiuYaoResult, MeiHuaInput, MeiHuaResult } from "@guoxue/shared";

/** 六爻 */
export function buildLiuYaoPrompt(_input: LiuYaoInput, result: LiuYaoResult): string {
  const yaoLines = result.yaos.map((y) => {
    const dong = y.isDongYao ? "【动】" : "";
    return `第${y.position}爻${dong}：${y.naJia} ${y.liuQin} ${y.liuShou}（${y.wuXing}）${y.shiYing ? ` [${y.shiYing}]` : ""}`;
  });

  return `你是精通六爻预测的资深专家，请根据以下六爻排盘进行详细断卦分析。

## 卦象信息
- 本卦：${result.benGua.name} ${result.benGua.symbol}
- 互卦：${result.huGua?.name ?? "无"} ${result.huGua?.symbol ?? ""}
- 变卦：${result.bianGua?.name ?? "无"} ${result.bianGua?.symbol ?? ""}
- 卦宫：${result.guaGong}
- 五行：${result.wuXing}

## 六爻纳甲
${yaoLines.join("\n")}
- 世爻：第${result.shiYao}爻
- 应爻：第${result.yingYao}爻

---
请从用神取用/世应关系/动爻分析/六亲六兽/综合断语5个方面进行断卦。
要求：抓住关键爻象，断语明确不模棱两可，给出具体建议和时间窗口。`;
}

/** 梅花易数 */
export function buildMeiHuaPrompt(_input: MeiHuaInput, result: MeiHuaResult): string {
  return `你是精通梅花易数的资深专家，请根据以下梅花易数排盘进行详细断卦分析。

## 卦象信息
- 本卦：${result.benGua.name} ${result.benGua.symbol}（上${result.benGua.upper.name}下${result.benGua.lower.name}）
- 互卦：${result.huGua.name} ${result.huGua.symbol}
- 变卦：${result.bianGua.name} ${result.bianGua.symbol}
- 动爻：第${result.dongYao}爻

## 体用生克
- 体卦：${result.tiGua.name}（${result.tiGua.wuXing}）
- 用卦：${result.yongGua.name}（${result.yongGua.wuXing}）
- 体用关系：${result.tiYongRelation}

## 卦气旺衰
${result.guaQi ? Object.entries(result.guaQi).map(([k, v]) => `${k}：${v}`).join(" | ") : "暂无"}

## 策轨数
${result.ceGui ? `元策：${result.ceGui.yuanCe}  元轨：${result.ceGui.yuanGui}` : "暂无"}

## 卦辞爻辞
- 卦辞：${result.guaCi ?? "-"}
- 爻辞：${result.yaoCi ?? "-"}

---
请从体用生克/卦象解读/应期判断/综合建议4个方面进行断卦分析。
要求：断语精准，结合卦辞爻辞原典，给出实用的指导建议。`;
}

/** 小成图 */
export function buildXiaoChengTuPrompt(_input: any, result: any): string {
  const gongLines = result.gongs?.map((g: any) =>
    `[${g.pos}宫·${g.direction}] 天盘${g.tianPanGua}↑地盘${g.diPanGua} → ${g.chengGua} · ${g.heBi}/${g.wangLai}`
  ).join("\n") ?? "";

  const tuiLines = result.tuiDuan?.map((t: any) =>
    `[${t.type}] 宫${t.gong}：${t.quXiang} — ${t.duanYu}`
  ).join("\n") ?? "";

  return `你是精通霍斐然小成图的资深专家。小成图不涉五行、纯以卦象推演。请根据以下排盘分析。

## 起卦信息
- 干支：${result.basicInfo?.ganZhi ?? "-"}
- 起卦过程：${result.basicInfo?.process ?? "-"}

## 主卦信息
- 本卦：${result.mainGua?.benGua ?? "-"}
- 互卦：${result.mainGua?.huGua ?? "-"}
- 变卦：${result.mainGua?.bianGua ?? "-"}
- 动爻：${result.mainGua?.dongYao ?? "-"}
- 卦辞：${result.mainGua?.guaCi ?? "-"}

## 九宫盘
${gongLines}

## 阖辟往来
${result.heBiWangLai ? `阖（静）：${result.heBiWangLai.heGongs?.join("、") || "无"}\n辟（动）：${result.heBiWangLai.biGongs?.join("、") || "无"}\n往（出）：${result.heBiWangLai.wangGongs?.join("、") || "无"}\n来（归）：${result.heBiWangLai.laiGongs?.join("、") || "无"}\n${result.heBiWangLai.desc}` : "暂无"}

## 正推旁推
${tuiLines}

---
请从闔辟往来总论/中宫卦象/正推旁推/所问之事等方面进行分析。
要求：严守小成图方法论——不涉五行，纯以卦象推演，引用系辞传和说卦传原典。`;
}

/** 金钱课 */
export function buildJinQianKePrompt(_input: any, result: any): string {
  const yaoLines = result.yaos?.map((y: any) =>
    `${y.position}爻 ${y.symbol}${y.isDong ? " → " + (y.bianSymbol ?? "") : ""} (${y.yaoType})`
  ).join("\n") ?? "";

  return `你是精通金钱课（铜钱卦）的预测专家，请根据以下卦象分析。

## 卦象
- 本卦：${result.benGua?.name ?? "-"} ${result.benGua?.symbol ?? ""}
- 变卦：${result.bianGua?.name ?? "无变"} ${result.bianGua?.symbol ?? ""}
- 互卦：${result.huGua?.name ?? "-"}

## 六爻
${yaoLines}

## 卦辞
${result.benGua?.guaCi ?? "-"}

## 动爻爻辞
${result.dongYaoCi?.map((d: any) => `${d.position}爻：${d.yaoCi}`).join("\n") ?? "无动爻"}

## 断卦要点
- 体用关系：${result.duanGua?.tiYong ?? "-"}
- 世应关系：${result.duanGua?.shiYing ?? "-"}
- 吉凶判断：${result.duanGua?.jiXiong ?? "-"}

---
请从体用生克/动爻变化/爻辞启示/行动建议等方面进行简明分析。`;
}

/** 诸葛神数 */
export function buildZhuGePrompt(_input: any, result: any): string {
  return `你是精通诸葛神数（384签）的预测专家，请根据以下签文分析。

## 起数过程
${result.qiShuProcess ? `
- 输入：${result.qiShuProcess.raw}
- 笔画/数字：${result.qiShuProcess.strokes?.join("、")}
- 折算法：${result.qiShuProcess.processDesc}
- 最终签号：第${result.qiShuProcess.finalNumber}签` : ""}

## 签文
- 签号：第${result.qianWen?.number ?? "-"}签
- 类型：${result.qianWen?.type ?? "-"}
- 签文：${result.qianWen?.text ?? "-"}
- 白话解释：${result.qianWen?.baiHua ?? "-"}

---
请从签文解读/所问之事关联/吉凶判断/行动建议等方面进行分析。
要求：引经据典，结合签文原文，给出切实可行的指导建议。`;
}

/** 孔明神卦 */
export function buildKongMingPrompt(_input: any, result: any): string {
  return `你是精通孔明神卦（周易64卦系统）的预测专家，请根据以下卦象分析。

## 起卦过程
- 方式：${result.process?.method ?? "-"}
- 卦数：${result.process?.guaNumber ?? "-"}
- 动爻：第${result.process?.dongYao ?? "-"}爻

## 本卦
- ${result.benGua?.name ?? "-"} ${result.benGua?.symbol ?? ""}
- 卦辞：${result.benGua?.guaCi ?? "-"}
- 彖辞：${result.benGua?.tuanCi ?? "-"}
- 大象辞：${result.benGua?.daXiang ?? "-"}

## 变卦
- ${result.bianGua?.name ?? "-"} ${result.bianGua?.symbol ?? ""}

## 动爻爻辞
- ${result.dongYaoCi?.yaoName ?? "-"}：${result.dongYaoCi?.yaoCi ?? "-"}
- 小象：${result.dongYaoCi?.xiaoXiang ?? "-"}

## 解卦
${result.jieGua ? `- 大意：${result.jieGua.daYi}\n- 事业：${result.jieGua.shiYe}\n- 财运：${result.jieGua.caiYun}\n- 感情：${result.jieGua.ganQing}\n- 健康：${result.jieGua.jianKang}\n- 出行：${result.jieGua.chuXing}` : "暂无解卦内容"}

---
请从卦辞爻辞解读/大象小象分析/所问之事对应/行动建议等方面进行综合解卦。
要求：引用周易原典，解读深入浅出，给出实用的指导意见。`;
}
