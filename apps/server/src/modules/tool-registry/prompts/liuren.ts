// ── 六壬神课分类 Prompt Builders ──
// 大六壬/小六壬/金口诀

/** 大六壬 */
export function buildDaLiuRenPrompt(_input: any, result: any): string {
  const siKeLines = result.siKe?.map((k: any) =>
    `第${k.index}课：${k.xiaGan}${k.xiaZhi}上神${k.shangZhi}（${k.description}）`
  ).join("\n") ?? "";

  const sanChuan = result.sanChuan;
  const chuanLines = sanChuan ? [
    `初传：${sanChuan.chu.zhi}${sanChuan.chu.dunGan ? `（${sanChuan.chu.dunGan}）` : ""} ${sanChuan.chu.liuQin ?? ""} ${sanChuan.chu.tianJiang ?? ""} — ${sanChuan.chu.description}`,
    `中传：${sanChuan.zhong.zhi}${sanChuan.zhong.dunGan ? `（${sanChuan.zhong.dunGan}）` : ""} ${sanChuan.zhong.liuQin ?? ""} ${sanChuan.zhong.tianJiang ?? ""} — ${sanChuan.zhong.description}`,
    `末传：${sanChuan.mo.zhi}${sanChuan.mo.dunGan ? `（${sanChuan.mo.dunGan}）` : ""} ${sanChuan.mo.liuQin ?? ""} ${sanChuan.mo.tianJiang ?? ""} — ${sanChuan.mo.description}`,
  ] : [];

  const keJingLines = result.keJing?.map((k: any) => `${k.name}：${k.summary}`).join("\n") ?? "";
  const biFaFuLines = result.keJing?.flatMap((k: any) => k.biFaFu ?? []).join("\n") ?? "";

  return `你是精通大六壬神课的资深专家，请根据以下排盘数据进行详细断课分析。

## 基本信息
- 占时：${result.zhanShi ?? "-"}
- 月将：${result.yueJiang ?? "-"}（${result.yueJiangZhi ?? "-"}）
- 昼夜：${result.dayNight ?? "-"}
- 日柱：${result.riGanZhi ?? "-"}
- 节气：${result.jieQi ?? "-"}

## 四课
${siKeLines}

## 三传（宗门：${result.zongMen ?? "-"}）
${chuanLines.join("\n")}
- 宗门说明：${result.zongMenDesc ?? "-"}

## 课经
${keJingLines}
${biFaFuLines ? `\n毕法赋：\n${biFaFuLines}` : ""}

## 神煞
${result.shenSha?.map((s: any) => `${s.name}（落${s.zhi}宫，${s.type === "ji" ? "吉" : "凶"}）：${s.description}`).join("\n") ?? "无"}

## 空亡
${result.kongWang?.join("、") ?? "-"}

## 年命行年
- 年命：${result.nianMing?.ganZhi ?? "-"}（落${result.nianMing?.gongWei ?? "-"}宫）
- 行年：${result.xingNian?.ganZhi ?? "-"}（落${result.xingNian?.gongWei ?? "-"}宫）

---
请从课体分析/三传解读/四课关系/天将神煞/年命行年/毕法赋引用6个方面进行断课。
要求：引用毕法赋原文，断语有理有据，给出具体应期和行动建议。`;
}

/** 小六壬 */
export function buildXiaoLiuRenPrompt(_input: any, result: any): string {
  const stepLines = result.steps?.map((s: any) =>
    `第${s.step}步「${s.label}」：从${s.from}起，数${s.count}位，落${s.to}（${s.desc}）`
  ).join("\n") ?? "";

  const fp = result.finalPosition;
  const fpInfo = fp ? `
## 最终落位：${fp.name}（${fp.jiXiong}）
- 五行：${fp.wuXing} | 方位：${fp.direction} | 数字：${fp.numbers}
- 核心断语：${fp.duanYu}
- 寻人：${fp.xiangYi?.xunRen ?? "-"}
- 失物：${fp.xiangYi?.shiWu ?? "-"}
- 出行：${fp.xiangYi?.chuXing ?? "-"}
- 婚姻：${fp.xiangYi?.hunYin ?? "-"}
- 求财：${fp.xiangYi?.qiuCai ?? "-"}
- 健康：${fp.xiangYi?.jianKang ?? "-"}` : "";

  return `你是精通小六壬掌诀推算的资深专家，请根据以下排盘数据进行详细解读。

## 排盘信息
- 农历时间：${result.lunarTime?.year ?? "-"}年${result.lunarTime?.monthName ?? "-"}${result.lunarTime?.day ?? "-"}日 ${result.lunarTime?.shiChen ?? "-"}
- 排盘类型：${result.input?.type ?? "-"}
- 起课方式：${result.input?.method ?? "-"}

## 推算过程
${stepLines}
${fpInfo}

## 六宫全貌
${result.zhangJue?.map((p: any) => `[${p.name}] ${p.wuXing} | ${p.direction} | ${p.jiXiong} | ${p.duanYu}`).join("\n") ?? ""}

---
请从落宫解读/全盘分析/行动建议3个方面进行详细解读。
要求：语言通俗易懂，断语明确不模棱两可，给出具体可操作的建议。`;
}

/** 金口诀 */
export function buildJinKouJuePrompt(_input: any, result: any): string {
  const sk = result.siWeiKe;
  const siWeiLines = sk ? [
    `人元（天干）：${sk.renYuan.gan}（${sk.renYuan.naYin}）— ${sk.renYuan.relation}`,
    `贵神（天将）：${sk.guiShen.name} ${sk.guiShen.ganZhi}（${sk.guiShen.wuXing}·${sk.guiShen.naYin}）`,
    `月将　　　　　：${sk.yueJiang.name} ${sk.yueJiang.ganZhi}（${sk.yueJiang.wuXing}·${sk.yueJiang.naYin}）`,
    `地分（地支）：${sk.diFen.zhi}（${sk.diFen.wuXing}·${sk.diFen.direction}·${sk.diFen.sanHe}）`,
  ] : [];

  const wuDongLines = result.wuDong?.map((w: any) =>
    `[${w.name}] ${w.layers.join("→")}：${w.desc}。${w.duanYu}`
  ).join("\n") ?? "";

  const sanDongLines = result.sanDong?.map((s: any) =>
    `[${s.name}] ${s.layers.join("→")}：${s.desc}。${s.duanYu}`
  ).join("\n") ?? "";

  const shengKeLines = result.shengKeTable ? [
    `干→方：${result.shengKeTable.ganFang}`,
    `干→神：${result.shengKeTable.ganShen}`,
    `干→将：${result.shengKeTable.ganJiang}`,
    `神→方：${result.shengKeTable.shenFang}`,
    `神→将：${result.shengKeTable.shenJiang}`,
    `将→方：${result.shengKeTable.jiangFang}`,
  ] : [];

  return `你是精通金口诀（大六壬简化·四位直断法）的资深专家，请根据以下四位课进行详细断课分析。

## 基本信息
- 占时：${result.basicInfo?.zhanShi ?? "-"}
- 月将：${result.basicInfo?.yueJiang ?? "-"}
- 日柱：${result.basicInfo?.riGanZhi ?? "-"}
- 昼夜：${result.basicInfo?.dayNight ?? "-"}
- 节气：${result.basicInfo?.jieQi ?? "-"}

## 四位课
${siWeiLines.join("\n")}

## 用爻
${result.yongYao ? `- 用爻：${result.yongYao.label}（五行${result.yongYao.wuXing}，${result.yongYao.wangShuai}）\n- ${result.yongYao.desc}` : "暂无"}

## 五动
${wuDongLines || "无"}
## 三动
${sanDongLines || "无"}
## 四位生克总表
${shengKeLines.join("\n")}
## 神煞
${result.shenSha?.map((s: any) => `${s.name}（落${s.layer}，${s.type === "ji" ? "吉" : "凶"}）：${s.description}`).join("\n") ?? "无"}
## 空亡
${result.kongWang?.join("、") ?? "-"}
## 干元关系
${result.ganYuan ? `干神合：${result.ganYuan.ganShenHe ?? "无"}\n干方合：${result.ganYuan.ganFangHe ?? "无"}` : ""}

---
请从四位格局/用爻解读/五动三动/综合断语4个方面进行断课分析。
要求：语言精炼，断语明确，一针见血。金口诀以简练著称，切忌长篇大论。`;
}
