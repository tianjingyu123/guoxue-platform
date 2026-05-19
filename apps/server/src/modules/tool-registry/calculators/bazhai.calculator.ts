// ── 八宅风水计算引擎 ──
// 命卦计算/八宅游年星/宅命匹配/八方吉凶

import type { BaZhaiInput, BaZhaiResult, MingGua, ZhaiGua, BaFangJiXiong } from "@guoxue/shared";

const BA_GUA: { name: string; num: number; group: string; direction: string; degreeRange: string }[] = [
  { name:"坎", num:1, group:"东四宅", direction:"正北", degreeRange:"337.5°-22.5°" },
  { name:"坤", num:2, group:"西四宅", direction:"西南", degreeRange:"202.5°-247.5°" },
  { name:"震", num:3, group:"东四宅", direction:"正东", degreeRange:"67.5°-112.5°" },
  { name:"巽", num:4, group:"东四宅", direction:"东南", degreeRange:"112.5°-157.5°" },
  { name:"乾", num:6, group:"西四宅", direction:"西北", degreeRange:"292.5°-337.5°" },
  { name:"兑", num:7, group:"西四宅", direction:"正西", degreeRange:"247.5°-292.5°" },
  { name:"艮", num:8, group:"西四宅", direction:"东北", degreeRange:"22.5°-67.5°" },
  { name:"离", num:9, group:"东四宅", direction:"正南", degreeRange:"157.5°-202.5°" },
];

// 大游年歌诀（坐山 -> 八方游星，按伏/生/五/延/六/祸/天/绝顺序）
const DA_YOU_NIAN: Record<string, string[]> = {
  "坎": ["伏位","生气","五鬼","延年","六煞","祸害","天医","绝命"],
  "坤": ["伏位","天医","延年","绝命","生气","祸害","五鬼","六煞"],
  "震": ["伏位","延年","生气","祸害","六煞","绝命","五鬼","天医"],
  "巽": ["伏位","天医","生气","延年","祸害","六煞","五鬼","绝命"],
  "乾": ["伏位","生气","延年","天医","六煞","祸害","五鬼","绝命"],
  "兑": ["伏位","生气","延年","祸害","天医","五鬼","绝命","六煞"],
  "艮": ["伏位","生气","延年","祸害","天医","五鬼","绝命","六煞"],
  "离": ["伏位","六煞","天医","生气","祸害","绝命","延年","五鬼"],
};

const STAR_INFO: Record<string, { wuXing: string; jiXiong: string; yiYong: string[]; jiHui: string[]; desc: string }> = {
  "生气": { wuXing:"木", jiXiong:"大吉", yiYong:["大门","主卧","书房"], jiHui:["厕所","厨房"], desc:"主富贵双全，孝义传家，人丁兴旺，生育旺宅。" },
  "天医": { wuXing:"土", jiXiong:"中吉", yiYong:["主卧","客厅","厨房"], jiHui:["厕所"], desc:"主健康长寿，少病少灾，财运平稳，家庭和睦。" },
  "延年": { wuXing:"金", jiXiong:"中吉", yiYong:["主卧","客厅","书房"], jiHui:["厕所","杂物间"], desc:"主延年益寿，夫妻和睦，事业有成，人际关系佳。" },
  "伏位": { wuXing:"木", jiXiong:"小吉", yiYong:["主卧","书房"], jiHui:[], desc:"主平稳安宁，无大起大落，保守稳重，适合静养。" },
  "绝命": { wuXing:"金", jiXiong:"大凶", yiYong:["厕所","杂物间"], jiHui:["大门","主卧","厨房"], desc:"主绝嗣伤丁，官非口舌，意外血光，财散人亡。" },
  "五鬼": { wuXing:"火", jiXiong:"大凶", yiYong:["厕所","阳台"], jiHui:["大门","主卧","厨房"], desc:"主火灾盗贼，口舌是非，精神疾病，意外破财。" },
  "六煞": { wuXing:"水", jiXiong:"中凶", yiYong:["厕所","储物间"], jiHui:["大门","主卧"], desc:"主桃花败财，感情纠葛，淫乱口舌，家庭不睦。" },
  "祸害": { wuXing:"土", jiXiong:"小凶", yiYong:["厕所","阳台"], jiHui:["大门","主卧","厨房"], desc:"主疾病残疾，口舌官非，子孙忤逆，破败耗财。" },
};

// 八方顺序（从坐山伏位开始顺时针）
const DIR_ORDER = ["坎","艮","震","巽","离","坤","兑","乾"];

/** 计算命卦 */
function calcMingGua(birthYear: number, gender: string): MingGua {
  const lastTwo = birthYear % 100;
  let sum = Math.floor(lastTwo / 10) + (lastTwo % 10);
  while (sum > 9) sum = Math.floor(sum / 10) + (sum % 10);
  let num: number;
  const isAfter2000 = birthYear >= 2000;
  if (gender === "男") {
    num = isAfter2000 ? (9 - (sum === 9 ? 9 : sum % 9)) : (11 - sum);
    if (num > 9) num -= 9;
    if (num === 0) num = 9;
    if (num === 5) num = 2; // 5中寄坤2
  } else {
    num = isAfter2000 ? (sum + 6) : (sum + 4);
    if (num > 9) num -= 9;
    if (num === 0) num = 9;
    if (num === 5) num = 8; // 5中寄艮8
  }
  const bg = BA_GUA.find((g) => g.num === num)!;
  const groupText = num === 1 || num === 3 || num === 4 || num === 9 ? "东四命" : "西四命";
  return {
    guaName: bg.name as any, guaNum: num,
    group: groupText as any,
    calcProcess: `${birthYear}年${gender}命 → 余数${sum} → ${isAfter2000 ? (gender === "男" ? `2000+男:9-${sum%9||9}=${num}` : `2000+女:${sum}+6=${sum+6}`) : (gender === "男" ? `1900男:11-${sum}=${11-sum}` : `1900女:${sum}+4=${sum+4}`)} → 命卦${bg.name}`,
  };
}

/** 坐山转宅卦 */
function calcZhaiGua(zuoShan: string): ZhaiGua {
  const bg = BA_GUA.find((g) => g.name === zuoShan)!;
  const chaoIdx = (DIR_ORDER.indexOf(zuoShan) + 4) % 8;
  return {
    guaName: bg.name as any,
    group: bg.group as any,
    zuoShan: bg.direction,
    chaoXiang: BA_GUA[DIR_ORDER.indexOf(zuoShan) >= 0 ? chaoIdx : 0]?.direction ?? "正南",
  };
}

/** 大游年八方吉凶 */
function calcBaFang(zuoShan: string, mingGua: MingGua): BaFangJiXiong[] {
  const stars = DA_YOU_NIAN[zuoShan];
  if (!stars) return [];
  const startIdx = DIR_ORDER.indexOf(zuoShan);
  return DIR_ORDER.map((_d, i) => {
    const dirIdx = (startIdx + i) % 8;
    const dir = DIR_ORDER[dirIdx];
    const star = stars[i];
    const info = STAR_INFO[star];
    const bgEl = BA_GUA.find((b) => b.name === dir)!;
    const isMatch = mingGua.group === bgEl.group;
    const jiXiongBase = info.jiXiong;
    // 宅命相配加减
    let jiXiong = jiXiongBase;
    if (isMatch && (star === "生气" || star === "天医" || star === "延年")) jiXiong = "大吉";
    return {
      direction: dir as any, degreeRange: bgEl.degreeRange,
      star: star as any, wuXing: info.wuXing,
      jiXiong: jiXiong as any,
      yiYong: info.yiYong, jiHui: info.jiHui, desc: info.desc,
    };
  });
}

/** 宅命匹配 */
function calcZhaiMingMatch(zhaiGua: ZhaiGua, mingGua: MingGua) {
  const isMatch = (zhaiGua.group as string) === (mingGua.group as string);
  return {
    isMatch,
    score: isMatch ? 8 : 3,
    desc: isMatch
      ? `宅命相配：${mingGua.group}（命）配${zhaiGua.group}（宅），吉宅。`
      : `宅命不配：${mingGua.group}（命）不配${zhaiGua.group}（宅），需通过内部布局化解。`,
    suggestion: isMatch
      ? "宅命相配，可在最佳方位（生气/天医/延年）设置大门、主卧、厨房，以增强吉运。"
      : `宅命不配，建议将主卧设在命卦吉方（${mingGua.guaName}之生气方），厨房设在凶方压制，或通过门向调整改善。`,
  };
}

/** 主计算函数 */
export function calculateBaZhai(input: Record<string, unknown>): BaZhaiResult {
  const birthYear = (input.birthYear as number) ?? 1980;
  const gender = (input.gender as string) ?? "男";
  const zuoShan = (input.zuoShan as string) ?? "坎";

  const mingGua = calcMingGua(birthYear, gender);
  const zhaiGua = calcZhaiGua(zuoShan);
  const baFang = calcBaFang(zuoShan, mingGua);
  const zhaiMingMatch = calcZhaiMingMatch(zhaiGua, mingGua);

  // 功能区位分析
  const bestStars = ["生气","天医","延年"];
  const worstStars = ["绝命","五鬼","六煞"];
  const findBest = (except: string[] = []) => baFang.find((f) => bestStars.includes(f.star) && !except.includes(f.direction)) ?? baFang[0];
  const findWorst = (except: string[] = []) => baFang.find((f) => worstStars.includes(f.star) && !except.includes(f.direction)) ?? baFang[0];

  const menWeiFang = findBest();
  const zhuWoFang = findBest([menWeiFang.direction]);
  const chuFangFang = findWorst([menWeiFang.direction, zhuWoFang.direction]);

  const geJue = `坐${zuoShan}向${zhaiGua.chaoXiang}，${zhaiGua.group}，${mingGua.guaName}命（${mingGua.group}）${zhaiMingMatch.isMatch ? "相配" : "不配"}`;

  const duanYu = `${geJue}。大门宜开${menWeiFang.direction}方（${menWeiFang.star}），主卧设${zhuWoFang.direction}方（${zhuWoFang.star}），厨房压${chuFangFang.direction}方（${chuFangFang.star}）。${zhaiMingMatch.suggestion}`;

  return {
    input: { birthYear, gender: gender as any, zuoShan: zuoShan as any },
    mingGua, zhaiGua, zhaiMingMatch, baFang,
    menWei: { direction: menWeiFang.direction, star: menWeiFang.star, jiXiong: menWeiFang.jiXiong, suggestion: `大门最佳方位为${menWeiFang.direction}方，纳${menWeiFang.star}吉气。` },
    zhuWo: { direction: zhuWoFang.direction, star: zhuWoFang.star, jiXiong: zhuWoFang.jiXiong, suggestion: `主卧最佳方位为${zhuWoFang.direction}方，得${zhuWoFang.star}旺气。` },
    chuFang: { direction: chuFangFang.direction, star: chuFangFang.star, jiXiong: chuFangFang.jiXiong, suggestion: `厨房宜压${chuFangFang.direction}方${chuFangFang.star}凶方，以厨火压制凶气。` },
    geJue, duanYu,
  };
}
