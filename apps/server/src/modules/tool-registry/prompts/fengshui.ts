// ── 风水分类 Prompt Builders ──
// 玄空飞星/八宅风水/电子罗盘/立极尺/山向地图

/** 玄空飞星 */
export function buildXuanKongPrompt(_input: any, result: any): string {
  const gongLines = result.gongs?.map((g: any) =>
    `[${g.gongName}宫·${g.direction}] 运${g.yunStar} 山${g.shanStar} 向${g.xiangStar} ${g.pattern ? `[${g.pattern}]` : ""} ${g.comment}`
  ).join("\n") ?? "";

  const geJuLines = result.geJu?.filter((g: any) => g.active).map((g: any) => `${g.name}：${g.desc}`).join("\n") ?? "";

  return `你是精通玄空飞星风水的资深专家，请根据以下宅命盘进行详细分析。

## 基本信息
- 元运：${result.basicInfo?.yunYun ?? "-"}运（${result.basicInfo?.yunRange ?? "-"}）
- 坐山：${result.input?.shan ?? "-"}（${result.basicInfo?.shanLong ?? "-"}·${result.basicInfo?.shanYinYang ?? "-"}）
- 朝向：${result.input?.xiang ?? "-"}（${result.basicInfo?.xiangLong ?? "-"}·${result.basicInfo?.xiangYinYang ?? "-"}）
- 替卦：${result.basicInfo?.tiGuaType ?? "无"}
- 运星入中：${result.basicInfo?.yunStarCenter ?? "-"}
- 山星入中：${result.basicInfo?.shanStarCenter ?? "-"}
- 向星入中：${result.basicInfo?.xiangStarCenter ?? "-"}

## 九宫飞星盘
${gongLines}

## 格局判断
${geJuLines || "无特殊格局"}

## 旺山旺向
${result.wangShanWangXiang?.desc ?? "-"}

## 各方位建议
${result.advice?.map((a: any) => `【${a.direction}·${a.jiXiong}】${a.starCombo} — ${a.suggestion}`).join("\n") ?? ""}

---
请从宅命盘格局/山水旺衰/各宫吉凶/化解建议/流年飞星叠加等方面进行专业风水分析。
要求：结合玄空飞星三元九运理论，给出具体的风水调整方案。`;
}

/** 八宅风水 */
export function buildBaZhaiPrompt(_input: any, result: any): string {
  const baFangLines = result.baFang?.map((f: any) =>
    `[${f.direction}·${f.star}] 五行${f.wuXing} | ${f.jiXiong} | 适宜：${f.yiYong?.join("、")} | 忌讳：${f.jiHui?.join("、")}\n  ${f.desc}`
  ).join("\n") ?? "";

  return `你是精通八宅风水的资深专家，请根据以下分析进行风水指导。

## 命卦
- ${result.mingGua?.guaName ?? "-"}卦命（${result.mingGua?.guaNum ?? "-"}数·${result.mingGua?.group ?? "-"}）
- 计算过程：${result.mingGua?.calcProcess ?? "-"}

## 宅卦
- ${result.zhaiGua?.guaName ?? "-"}宅（${result.zhaiGua?.group ?? "-"}）
- 坐山：${result.zhaiGua?.zuoShan ?? "-"} | 朝向：${result.zhaiGua?.chaoXiang ?? "-"}

## 宅命配合
${result.zhaiMingMatch ? `- 是否相配：${result.zhaiMingMatch.isMatch ? "是" : "否"}\n- 评分：${result.zhaiMingMatch.score}/10\n- ${result.zhaiMingMatch.desc}\n- 建议：${result.zhaiMingMatch.suggestion}` : "暂无"}

## 八方吉凶
${baFangLines}

## 功能位分析
- 大门：${result.menWei?.direction ?? "-"}位（${result.menWei?.star ?? "-"}·${result.menWei?.jiXiong ?? "-"}）${result.menWei?.suggestion ?? ""}
- 主卧：${result.zhuWo?.direction ?? "-"}位（${result.zhuWo?.star ?? "-"}·${result.zhuWo?.jiXiong ?? "-"}）${result.zhuWo?.suggestion ?? ""}
- 厨房：${result.chuFang?.direction ?? "-"}位（${result.chuFang?.star ?? "-"}·${result.chuFang?.jiXiong ?? "-"}）${result.chuFang?.suggestion ?? ""}

## 大游年歌诀
${result.geJue ?? "-"}

---
请从命卦宅卦/宅命配合/八方吉凶布局/功能位优化/流年调整等方面进行综合分析。
要求：给出具体可操作的家具布局和颜色搭配建议。`;
}

/** 电子罗盘 */
export function buildLuoPanPrompt(_input: any, result: any): string {
  return `你是精通风水罗盘各流派应用方法的资深专家，请根据罗盘测量结果进行综合分析。

## 角度信息
- 原始角度：${result.degreeInfo?.rawDegree ?? "-"}°
- 磁偏角：${result.degreeInfo?.magneticDeclination ?? "-"}°
- 真北角度：${result.degreeInfo?.trueDegree ?? "-"}°

## 山向分析
- 坐山：${result.shanAnalysis?.zuoShan ?? "-"}（${result.shanAnalysis?.sanYuanLong ?? "-"}·${result.shanAnalysis?.yinYang ?? "-"}）
- 朝向：${result.shanAnalysis?.chaoXiang ?? "-"}
- 卦宫：${result.shanAnalysis?.guaGong ?? "-"}
${result.shanAnalysis?.jianXiang ? `- 兼向：${result.shanAnalysis.jianXiang.isJian ? `兼${result.shanAnalysis.jianXiang.jianShan} ${result.shanAnalysis.jianXiang.jianDeg}° (${result.shanAnalysis.jianXiang.canUse ? "可用" : "不可用"}) ${result.shanAnalysis.jianXiang.reason}` : "正向不兼"}` : ""}

## 纳甲
- 坐山纳甲：${result.naJia?.zuoNaJia ?? "-"}
- 向首纳甲：${result.naJia?.xiangNaJia ?? "-"}

## 三合水法
${result.sanHeShui ? `- 水口：${result.sanHeShui.shuiKou}\n- 四大局：${result.sanHeShui.siDaJu}\n- 长生水法：${result.sanHeShui.changShengShui}\n- 吉凶：${result.sanHeShui.jiXiong}` : "未做三合分析"}

## 各流派风水指导
${result.fengShuiAdvice?.map((a: any) => `【${a.school}】${a.method}\n评价：${a.evaluation}（${a.jiXiong}）\n建议：${a.suggestions?.join("；")}`).join("\n\n") ?? ""}

---
请综合以上各流派观点，从玄空/三合/八宅/三元纳气/金锁玉关等多派角度进行综合评判，给出风水指导和化解建议。`;
}

/** 立极尺 */
export function buildLiJiChiPrompt(_input: any, result: any): string {
  return `你是精通鲁班尺/丁兰尺/门公尺的资深风水专家，请根据以下尺寸分析进行指导。

## 测量结果
- 尺寸：${result.measurement?.lengthCm ?? "-"}cm
- 台寸：${result.measurement?.taiCun ?? "-"}寸
- 鲁班尺：${result.measurement?.luBanZi ?? "-"}（${result.measurement?.luBanDetail ?? "-"}）
- 丁兰尺：${result.measurement?.dingLanZi ?? "-"}（${result.measurement?.dingLanDetail ?? "-"}）
- 寸白：${result.measurement?.cunBai ?? "-"}
- 吉凶：${result.measurement?.jiXiong ?? "-"}
- 说明：${result.measurement?.desc ?? "-"}

## 推荐吉利尺寸
${result.recommended?.map((r: any) => `${r.lengthCm}cm（${r.luBanZi}）— ${r.desc}`).join("\n") ?? "暂无"}

---
请从鲁班尺吉凶/适用场景/替代尺寸推荐/注意事项等方面给出专业意见。`;
}

/** 山向地图 */
export function buildShanXiangMapPrompt(_input: any, result: any): string {
  return `你是精通风水形势派和理气派的资深专家，请根据地图风水分析进行指导。

## 坐向信息
- 坐山：${result.shanXiang?.zuoShan ?? "-"}
- 朝向：${result.shanXiang?.chaoXiang ?? "-"}
- 度数：${result.shanXiang?.degree ?? "-"}°
- 三元龙：${result.shanXiang?.sanYuanLong ?? "-"}

## 八方环境
${result.surroundings?.map((s: any) => `[${s.direction}·${s.jiXiong}] ${s.fengShuiEffect}\n环境要素：${s.elements?.map((e: any) => `${e.name}(${e.distance}m)`).join("、") || "无"}`).join("\n\n") ?? "暂无"}

## 形势分析
- 龙：${result.xingShi?.long ?? "-"}
- 砂：${result.xingShi?.sha ?? "-"}
- 水：${result.xingShi?.shui ?? "-"}
- 穴：${result.xingShi?.xue ?? "-"}
- 向：${result.xingShi?.xiang ?? "-"}

---
请从龙砂水穴向形势分析/理气派分析/各方位环境吉凶/风水调整建议等方面进行综合指导。`;
}
