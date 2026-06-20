// ── 从格专论计算引擎 ──
// 八字从格/专旺格/化气格深度分析
// 算法参考：《子平真诠》《滴天髓》《渊海子平·格局》
// 从格分类：从强/从旺/从儿/从财/从杀/化气，各配喜忌用神

import type { CongGeZhuanLunInput, CongGeZhuanLunResult } from "@guoxue/shared";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

const WX_REL: Record<string, Record<string, string>> = {
  "木": { "木":"比和","火":"生","土":"克","金":"被克","水":"被生" },
  "火": { "木":"被生","火":"比和","土":"生","金":"克","水":"被克" },
  "土": { "木":"被克","火":"被生","土":"比和","金":"生","水":"克" },
  "金": { "木":"克","火":"被克","土":"被生","金":"比和","水":"生" },
  "水": { "木":"生","火":"克","土":"被克","金":"被生","水":"比和" },
};

const GAN_WX: Record<string, string> = {
  "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土",
  "庚":"金","辛":"金","壬":"水","癸":"水",
};
const ZHI_WX: Record<string, string> = {
  "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火",
  "午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水",
};

function getWxScore(pillar: string): Record<string, number> {
  const score: Record<string, number> = { "木":0,"火":0,"土":0,"金":0,"水":0 };
  const gan = pillar[0];
  const zhi = pillar[1];
  if (gan && GAN_WX[gan]) score[GAN_WX[gan]] += 3;
  if (zhi && ZHI_WX[zhi]) score[ZHI_WX[zhi]] += 2;
  return score;
}

export function calculateCongGeZhuanLun(input: Record<string, unknown>): CongGeZhuanLunResult {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { gender, yearPillar, monthPillar, dayPillar, hourPillar } = input as unknown as CongGeZhuanLunInput;
  if (!dayPillar) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "日柱不能为空");

  const dayGan = dayPillar[0];
  const dayZhi = dayPillar[1];
  const dayWx = GAN_WX[dayGan] || "土";

  // 月令地支对应季节五行
  const monthZhi = (monthPillar || "子")[1];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const monthZhiWx = ZHI_WX[monthZhi] || "水";
  const monthZhiSeason: Record<string, string> = {
    "寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土",
    "申":"金","酉":"金","戌":"土","亥":"水","子":"水","丑":"土",
  };

  // 统计四柱五行能量
  const scores = ["yearPillar","monthPillar","dayPillar","hourPillar"]
    .map(p => getWxScore(input[p as keyof typeof input] as string || "甲子"))
    .reduce((a, b) => {
      for (const k of Object.keys(a)) a[k] += b[k];
      return a;
    }, { "木":0,"火":0,"土":0,"金":0,"水":0 });

  const dayScore = scores[dayWx] || 0;
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const dayRatio = totalScore > 0 ? dayScore / totalScore : 0;

  // 月令是否为日主相同五行
  const monthWx = monthZhiSeason[monthZhi] || "土";
  const daySameWx = dayWx === monthWx;

  // 生助日主的五行
  const shengWo = Object.entries(WX_REL).find(([, rel]) => rel[dayWx] === "被生")?.[0] || "";
  const biWo = dayWx;

  // 克泄日主的五行
  const keWo = Object.entries(WX_REL).find(([, rel]) => rel[dayWx] === "被克")?.[0] || "";
  const xieWo = Object.entries(WX_REL).find(([, rel]) => rel[dayWx] === "生")?.[0] || "";
  const haoWo = Object.entries(WX_REL).find(([, rel]) => rel[dayWx] === "克")?.[0] || "";

  const shengZhuScore = (scores[shengWo] || 0) + (scores[biWo] || 0);
  const keXieScore = (scores[keWo] || 0) + (scores[xieWo] || 0) + (scores[haoWo] || 0);

  // 格局判断
  const conditions: CongGeZhuanLunResult["conditions"] = [];
  let geType: CongGeZhuanLunResult["geType"] = "正格";
  let geName = "";
  let isTrueCong = false;

  // 条件1：日主是否得令
  const deLing = daySameWx;
  conditions.push({ name: "日主得月令", satisfied: deLing, description: deLing ? `日主${dayGan}(${dayWx})生于${monthWx}月，得月令之气` : `日主${dayGan}(${dayWx})生于${monthWx}月，月令不同` });

  // 条件2：原局生助力量
  const shengZhuStrong = shengZhuScore > keXieScore * 1.5;
  conditions.push({ name: "生助力量充足", satisfied: shengZhuStrong, description: `生助(${shengZhuScore}) vs 克泄(${keXieScore})` });

  // 条件3：日主占比
  const dayDominant = dayRatio > 0.4;
  conditions.push({ name: "日主五行主导", satisfied: dayDominant, description: `日主五行占比${(dayRatio*100).toFixed(0)}%` });

  // 判断格局
  if (deLing && shengZhuStrong && dayDominant) {
    // 专旺格：日主极旺，全盘生助
    const wxNames: Record<string, string> = { "木":"曲直格","火":"炎上格","土":"稼穑格","金":"从革格","水":"润下格" };
    geType = "从强格";
    geName = wxNames[dayWx] || "从强格";
    isTrueCong = true;
  } else if (!deLing && keXieScore > shengZhuScore * 2) {
    // 从弱格：日主极弱，全盘克泄
// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const congRuo: Record<string, string> = { "木":"从势格","火":"从官格","土":"从财格","金":"从儿格","水":"从势格" };
    geType = "从旺格";
    geName = `从${xieWo === "木" ? "儿" : haoWo === "火" ? "财" : keWo === "金" ? "杀" : "势"}格`;
    isTrueCong = true;
  } else if (keXieScore > shengZhuScore * 1.2 && keXieScore < shengZhuScore * 2) {
    geType = "假从格";
    geName = `假从${keWo}格`;
    isTrueCong = false;
  } else {
    geType = "正格";
    geName = `正格（${dayWx}日主${deLing ? "旺" : "弱"}）`;
  }

  const poGeConditions: string[] = [
    `原局有根（${dayZhi}不为空）则从格不真`,
    `大运逢${shengWo}、${biWo}运时破格`,
    `${keWo}、${xieWo}被合化则格破`,
  ];

  const xiShen = isTrueCong
    ? (geType === "从强格" ? [shengWo, biWo] : [keWo, xieWo, haoWo])
    : [shengWo, biWo];
  const jiShen = isTrueCong
    ? (geType === "从强格" ? [keWo, xieWo, haoWo] : [shengWo, biWo])
    : [keWo, xieWo, haoWo];

  const yunXi = [...xiShen].filter(Boolean);
  const yunJi = [...jiShen].filter(Boolean);

  const detail = isTrueCong
    ? `${geName}，真从之格。"从"者，弃命从势也。${geType === "从强格" ? "日主极旺，顺其旺势，不可逆之" : "日主极弱，弃命从势，顺势而为"}。大运喜${yunXi.join("/")}，忌${yunJi.join("/")}。`
    : `${geName}，假从或正格。格局不够纯粹，行运起伏较大。大运喜${yunXi.join("/")}，忌${yunJi.join("/")}。`;

  const analysis = [
    `日主${dayGan}(${dayWx})，四柱五行：木${scores["木"]}/火${scores["火"]}/土${scores["土"]}/金${scores["金"]}/水${scores["水"]}。`,
    `月令${monthWx}(${monthZhi})，${deLing ? "得" : "失"}月令之气。`,
    `${geName}，${isTrueCong ? "真从格" : "假从格或正格"}。`,
    `喜用：${xiShen.filter(Boolean).join("/")}；忌：${jiShen.filter(Boolean).join("/")}。`,
    detail,
  ].join("");

  // 结构化 box-drawing 摘要
  const condLines = conditions.map(c =>
    `│ ${c.satisfied ? "✓" : "✗"} ${c.name.padEnd(14, " ")} ${c.description}`
  ).join("\n");

  const summary = [
    `┌─ 从格专论 ─────────────────`,
    `│ 日主：${dayGan}（${dayWx}） 性别：${gender} 月令：${monthWx}（${monthZhi}）`,
    `│ 四柱五行：木${scores["木"]}/火${scores["火"]}/土${scores["土"]}/金${scores["金"]}/水${scores["水"]}`,
    `│ 日主占比：${(dayRatio*100).toFixed(0)}% 生助值${shengZhuScore} vs 克泄值${keXieScore}`,
    ``,
    `├─ 格局诊断 ─────────────────`,
    `│ 格局：${geName}（${geType}）`,
    `│ 真从：${isTrueCong ? "是 — 弃命从势，格局纯粹" : "否 — 格局不纯，行运起伏较大"}`,
    ``,
    `├─ 条件判断 ─────────────────`,
    condLines,
    ``,
    `├─ 喜忌用神 ─────────────────`,
    `│ 喜用：${xiShen.filter(Boolean).join("、") || "无"} —${geType === "从强格" ? "顺其旺势，不宜逆" : "顺势而为，不宜抗"}`,
    `│ 忌神：${jiShen.filter(Boolean).join("、") || "无"} —${geType === "从强格" ? "逆势则破格招灾" : "帮扶日主反为不美"}`,
    `│ 大运喜：${yunXi.join("、") || "无"}  大运忌：${yunJi.join("、") || "无"}`,
    ``,
    `├─ 破格条件 ─────────────────`,
    ...poGeConditions.map(c => `│ ☠ ${c}`),
    ``,
    `├─ 古籍出处 ─────────────────`,
    `│ 《滴天髓》—— 「从得真者只论从，从神又有吉和凶」`,
    `│ 《子平真诠》—— 清·沈孝瞻，格局论命集大成`,
    `│ 《渊海子平·格局》—— 格局论命奠基之作`,
    `│ 从格核心：「从」者非弱也，乃弃命从势，顺势而为。`,
    ``,
    `└─ 命理提示 ─────────────────`,
    `   ${isTrueCong ? `${geName}真从，大运顺势则大吉大利。` : `假从不纯，行运起伏。`}`,
    `   从格最忌破格——大运逢${yunJi.join("/")}时须保守行事。`,
    `   从格之人通常大起大落，成则大富大贵败则一败涂地。`,
  ].join("\n");

  return {
    dayMaster: dayGan,
    dayWx,
    geType,
    geName,
    conditions,
    xiShen: xiShen.filter(Boolean),
    jiShen: jiShen.filter(Boolean),
    yunXi,
    yunJi,
    isTrueCong,
    poGeConditions,
    detail,
    analysis,
    summary,
  } as CongGeZhuanLunResult & { summary: string };
}
