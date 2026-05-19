// ── 星命分类 Prompt Builders ──
// 太乙神数/七政四余/五运六气

/** 太乙神数 */
export function buildTaiYiPrompt(_input: any, result: any): string {
  return `你是精通太乙神数（三式之首）的资深专家，请根据以下太乙排盘进行分析。

## 基本信息
- 太乙式：${result.basicInfo?.shiType ?? "-"}
- 干支：${result.basicInfo?.ganZhi ?? "-"}
- 遁法：${result.basicInfo?.dunType ?? "-"}
- 节气：${result.basicInfo?.jieQi ?? "-"}

## 积年计算
- 上元积年：${result.jiNianCalc?.jiNian ?? "-"}
- 五元六纪：${result.jiNianCalc?.wuYuanLiuJi ?? "-"}
- 纪名：${result.jiNianCalc?.jiName ?? "-"}
- 太乙数：${result.jiNianCalc?.taiYiShu ?? "-"}

## 十六神盘
- 太乙在${result.shiLiuShenPan?.taiYiGong ?? "-"}宫
- 文昌在${result.shiLiuShenPan?.wenChangGong ?? "-"}宫
- 始击在${result.shiLiuShenPan?.shiJiGong ?? "-"}宫

## 三算
${result.sanSuan ? `
- 主算：${result.sanSuan.zhuSuan?.value ?? "-"}（${result.sanSuan.zhuSuan?.wuXing ?? "-"}）${result.sanSuan.zhuSuan?.desc ?? ""}
- 客算：${result.sanSuan.keSuan?.value ?? "-"}（${result.sanSuan.keSuan?.wuXing ?? "-"}）${result.sanSuan.keSuan?.desc ?? ""}
- 定算：${result.sanSuan.dingSuan?.value ?? "-"}（${result.sanSuan.dingSuan?.wuXing ?? "-"}）${result.sanSuan.dingSuan?.desc ?? ""}
- 胜负：${result.sanSuan.shengFu ?? "-"}（${result.sanSuan.zhuKeRelation ?? "-"}）` : "暂无"}

## 格局
${result.geJu?.filter((g: any) => g.active).map((g: any) => `${g.name}（${g.jiXiong}）：${g.desc}`).join("\n") ?? "无"}

---
请从五元六纪/太乙行宫/十六神格局/主客三算/吉凶趋势等方面进行专业分析。
要求：结合《太乙金镜式经》等古法，分析国家社会运势和个人命运趋势。`;
}

/** 七政四余 */
export function buildQiZhengPrompt(_input: any, result: any): string {
  const starLines = result.starPositions?.map((s: any) =>
    `${s.star}：${s.gong}宫 ${s.xiu}${s.xiuDu}度 | ${s.state} | ${s.direction}`
  ).join("\n") ?? "";

  const gongLines = result.gongs?.map((g: any) =>
    `[${g.name}] 主${g.ruler} | 入宫星：${g.stars?.join("、") || "无"} | ${g.renShi ?? ""}`
  ).join("\n") ?? "";

  const daXianLines = result.daXian?.slice(0, 6).map((d: any) =>
    `${d.startAge}-${d.endAge}岁：${d.gong}宫 ${d.stars?.join("、")} — ${d.desc}`
  ).join("\n") ?? "";

  return `你是精通七政四余星命学（果老星宗/洞微大限）的资深专家，请根据以下星盘进行详细命理分析。

## 基本信息
- 命宫：${result.basicInfo?.mingGong ?? "-"}
- 身宫：${result.basicInfo?.shenGong ?? "-"}
- 命主星：${result.basicInfo?.mingZhu ?? "-"}
- 身主星：${result.basicInfo?.shenZhu ?? "-"}
- 体系：${result.basicInfo?.system ?? "-"}

## 十一曜位置
${starLines}

## 十二宫
${gongLines}

## 星曜相位
${result.aspects?.map((a: any) => `${a.star1}${a.type}${a.star2}（${a.degree}°）— ${a.desc}`).join("\n") ?? "无特殊相位"}

## 大限
${daXianLines}

## 格局
${result.geJu?.map((g: any) => `${g.name} — ${g.desc}`).join("\n") ?? "无"}

---
请从命宫身宫/星曜庙旺落陷/相位关系/大限走势/格局评断等方面进行专业分析。
要求：结合果老星宗原典，给出具体的行运建议。`;
}

/** 五运六气 */
export function buildWuYunLiuQiPrompt(_input: any, result: any): string {
  const bingHouLines = result.bingHou?.map((b: any) =>
    `【${b.step}】${b.zhuQi}/${b.keQi}\n气候：${b.qiHou}\n易发病：${b.yiFaBing?.join("、")}\n养生：${b.yangSheng}\n用药方向：${b.yongYao}`
  ).join("\n\n") ?? "";

  return `你是精通五运六气与中医养生的资深专家，请根据以下运气格局进行详细分析。

## 基本信息
- 年干支：${result.basicInfo?.nianGanZhi ?? "-"}（${result.basicInfo?.year ?? "-"}年）
- 天干：${result.basicInfo?.tianGan ?? "-"}
- 地支：${result.basicInfo?.diZhi ?? "-"}

## 大运
- 天干化运：${result.daYun?.tianGanHuaYun ?? "-"}
- 岁运状态：${result.daYun?.yunState ?? "-"}（${result.daYun?.suiYun ?? ""}）
- 主运五步：${result.daYun?.zhuYun?.join(" → ") ?? "-"}
- 客运五步：${result.daYun?.keYun?.join(" → ") ?? "-"}

## 六气
- 司天：${result.liuQi?.siTian ?? "-"}
- 在泉：${result.liuQi?.zaiQuan ?? "-"}

## 运气同化
${result.tongHua ? `${result.tongHua.type}：${result.tongHua.desc}（${result.tongHua.active ? "成立" : "不成立"}）` : "无"}

## 运气关系
${result.yunQiRelation ? `${result.yunQiRelation.relation}（${result.yunQiRelation.shunNi}）— ${result.yunQiRelation.desc}` : "暂无"}

## 郁发
${result.yuFa ? `${result.yuFa.hasYuFa ? "有郁发：" + result.yuFa.desc : "无郁发"}` : "暂无"}

## 各气步病候养生
${bingHouLines}

---
请从运气格局/司天在泉/气候病候/运气同化/郁发/养生建议等方面进行专业分析。
要求：结合《黄帝内经》运气七篇大论，给出针对当前气步的实用养生指导。`;
}
