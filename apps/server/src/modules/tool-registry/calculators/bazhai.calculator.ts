// ── 八宅风水计算引擎 ──
// 算法参考：《阳宅十书》《八宅明镜》《阳宅三要》
// 命卦计算/八宅游年星/宅命匹配/八方吉凶

import type { BaZhaiResult, MingGua, ZhaiGua, BaFangJiXiong } from "@guoxue/shared";

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

interface StarDetail {
  wuXing: string; jiXiong: string; yiYong: string[]; jiHui: string[]; desc: string;
  layoutTips: { colors: string[]; materials: string[]; shapes: string[]; items: string[] };
  huaJie?: string[];
  cuiWang?: string[];
}

const STAR_INFO: Record<string, StarDetail> = {
  "生气": {
    wuXing:"木", jiXiong:"大吉",
    yiYong:["大门","主卧","书房"], jiHui:["厕所","厨房"],
    desc:"主富贵双全，孝义传家，人丁兴旺，生育旺宅。",
    layoutTips: { colors:["绿色","青色","浅蓝"], materials:["木质","棉麻","竹制"], shapes:["长条形","长方形","直条纹"], items:["富贵竹","绿萝","文昌塔","木质书架","水养植物"] },
    cuiWang:["放置高大绿色植物（如发财树、幸福树），以木气催旺生机","水养植物可水生木，倍增生气之力","宜用木质家具、绿色窗帘增强木气","可悬挂'紫气东来'或'旭日东升'字画"],
  },
  "天医": {
    wuXing:"土", jiXiong:"中吉",
    yiYong:["主卧","客厅","厨房"], jiHui:["厕所"],
    desc:"主健康长寿，少病少灾，财运平稳，家庭和睦。",
    layoutTips: { colors:["黄色","棕色","米色"], materials:["陶瓷","石材","砖瓦"], shapes:["方形","正方形","扁平方正"], items:["陶瓷花瓶","黄水晶","泰山石敢当","方形地毯","陶罐"] },
    cuiWang:["摆放陶瓷花瓶或黄水晶球，以土气稳固健康运","宜用方形家具、米色墙面增强土气","可放置天然水晶簇或玛瑙摆件","保持整洁明亮，忌阴暗潮湿"],
  },
  "延年": {
    wuXing:"金", jiXiong:"中吉",
    yiYong:["主卧","客厅","书房"], jiHui:["厕所","杂物间"],
    desc:"主延年益寿，夫妻和睦，事业有成，人际关系佳。",
    layoutTips: { colors:["白色","金色","银色"], materials:["金属","铜器","不锈钢"], shapes:["圆形","椭圆形","弧形"], items:["铜钱","金属钟表","圆形镜","金属风铃","白水晶球"] },
    cuiWang:["放置金属摆件或铜器，以金气增强贵人运","宜用白色墙面、圆形灯具增强金气","可悬挂铜铃或金属风铃于窗前","放置结婚照或全家福增进夫妻和谐"],
  },
  "伏位": {
    wuXing:"木", jiXiong:"小吉",
    yiYong:["主卧","书房"], jiHui:[],
    desc:"主平稳安宁，无大起大落，保守稳重，适合静养。",
    layoutTips: { colors:["绿色","浅绿","淡蓝"], materials:["木质","布艺","棉麻"], shapes:["长条形","平稳方正"], items:["平安符","木雕摆件","书籍","盆栽","字画"] },
    cuiWang:["保持空间整洁安静，不宜过多装饰","可放置木质书架或书桌营造安定氛围","宜挂'静'字或山水画平和心气","适合老人房或静修室使用"],
  },
  "绝命": {
    wuXing:"金", jiXiong:"大凶",
    yiYong:["厕所","杂物间"], jiHui:["大门","主卧","厨房"],
    desc:"主绝嗣伤丁，官非口舌，意外血光，财散人亡。",
    layoutTips: { colors:["避免白色/金色/银色"], materials:["避免金属/铜器"], shapes:["避免圆形/椭圆形"], items:["安忍水","黑曜石","鱼缸","葫芦","水晶球"] },
    huaJie:["放置鱼缸或水景（以水泄金气，金生水则凶气减弱）","使用黑色/深蓝色装饰（水色泄金）","悬挂天然葫芦或铜葫芦吸纳病气","放置安忍水（盐+水+铜钱）化解金煞","避免在此方摆放金属物品、钟表、刀剑"],
  },
  "五鬼": {
    wuXing:"火", jiXiong:"大凶",
    yiYong:["厕所","阳台"], jiHui:["大门","主卧","厨房"],
    desc:"主火灾盗贼，口舌是非，精神疾病，意外破财。",
    layoutTips: { colors:["避免红色/紫色/橙色"], materials:["避免电器/红色装饰"], shapes:["避免三角形/尖角"], items:["鱼缸","黑曜石","泰山石","八卦镜","安忍水","铜葫芦"] },
    huaJie:["放置鱼缸或水景（以水克火，压制五鬼火气）","使用黑色、深蓝色装饰（水色制火）","摆放泰山石敢当镇压煞气","悬挂开光八卦镜反射凶气","避免在此方设置厨房灶台或堆放电器","宜做卫生间或储物间以镇压"],
  },
  "六煞": {
    wuXing:"水", jiXiong:"中凶",
    yiYong:["厕所","储物间"], jiHui:["大门","主卧"],
    desc:"主桃花败财，感情纠葛，淫乱口舌，家庭不睦。",
    layoutTips: { colors:["避免黑色/深蓝"], materials:["避免水景/镜子/玻璃"], shapes:["避免波浪形/曲线"], items:["红色装饰","木质家具","绿色植物","五帝钱","朱砂"] },
    huaJie:["放置红色装饰（以火泄水气，水能生木→木生火而耗水）","绿色植物吸纳水气（水生木而泄水）","悬挂五帝钱或朱砂饰品镇宅","避免摆放鱼缸、水景、大面镜子","宜设杂物间或衣帽间，减少人长时间停留"],
  },
  "祸害": {
    wuXing:"土", jiXiong:"小凶",
    yiYong:["厕所","阳台"], jiHui:["大门","主卧","厨房"],
    desc:"主疾病残疾，口舌官非，子孙忤逆，破败耗财。",
    layoutTips: { colors:["避免黄色/棕色"], materials:["避免陶瓷/石材"], shapes:["避免方形"], items:["金属摆件","铜铃","白色装饰","圆形物品","水晶"] },
    huaJie:["放置金属摆件（以金泄土气，土生金则凶气泄出）","使用白色、金色装饰（金色泄土）","悬挂铜铃或金属风铃化解土煞","保持通风干燥，避免堆放重物","避免放置大型陶瓷花盆或石雕"],
  },
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
      layoutTips: info.layoutTips,
      ...(info.huaJie ? { huaJie: info.huaJie } : {}),
      ...(info.cuiWang ? { cuiWang: info.cuiWang } : {}),
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

  const menStar = STAR_INFO[menWeiFang.star];
  const zhuStar = STAR_INFO[zhuWoFang.star];
  const chuStar = STAR_INFO[chuFangFang.star];

  const menLayout = `宜${menStar.layoutTips.colors.slice(0,2).join("、")}色系，${menStar.layoutTips.materials.slice(0,2).join("、")}材质，摆放${menStar.layoutTips.items.slice(0,2).join("、")}。`;
  const zhuLayout = `宜${zhuStar.layoutTips.colors.slice(0,2).join("、")}色系，${zhuStar.layoutTips.materials.slice(0,2).join("、")}材质，摆放${zhuStar.layoutTips.items.slice(0,2).join("、")}。`;
  const chuLayout = chuStar.huaJie ? `凶方宜化解：${chuStar.huaJie.slice(0,2).join("；")}。` : "";

  const duanYu = `${geJue}。大门宜开${menWeiFang.direction}方（${menWeiFang.star}），${menLayout}主卧设${zhuWoFang.direction}方（${zhuWoFang.star}），${zhuLayout}厨房压${chuFangFang.direction}方（${chuFangFang.star}）。${chuLayout}${zhaiMingMatch.suggestion}`;

  const summary = [
    "┌─ 八宅风水 · 阳宅三要 ─────────────┐",
    `│ ${geJue}`.padEnd(36) + "│",
    `│ ${zhaiMingMatch.suggestion.slice(0, 30)}`.padEnd(36) + "│",
    "├─ 八宅九星 ─────────────────────────┤",
    ...baFang.map(f => `│ ${f.direction}方：${f.star}（${f.jiXiong}）`.padEnd(36) + "│"),
    "├─ 三要布局 ─────────────────────────┤",
    `│ 大门：${menWeiFang.direction}方（${menWeiFang.star}）`.padEnd(36) + "│",
    `│ 主卧：${zhuWoFang.direction}方（${zhuWoFang.star}）`.padEnd(36) + "│",
    `│ 厨房：${chuFangFang.direction}方（${chuFangFang.star}）`.padEnd(36) + "│",
    "├─ 出处 ─────────────────────────────┤",
    "│ 《八宅明镜》《阳宅三要》《阳宅十书》│",
    "└────────────────────────────────────┘",
  ].join("\n");

  return {
    input: { birthYear, gender: gender as any, zuoShan: zuoShan as any },
    mingGua, zhaiGua, zhaiMingMatch, baFang,
    menWei: { direction: menWeiFang.direction, star: menWeiFang.star, jiXiong: menWeiFang.jiXiong, suggestion: `大门最佳方位${menWeiFang.direction}方，纳${menWeiFang.star}吉气。${menLayout}` },
    zhuWo: { direction: zhuWoFang.direction, star: zhuWoFang.star, jiXiong: zhuWoFang.jiXiong, suggestion: `主卧最佳方位${zhuWoFang.direction}方，得${zhuWoFang.star}旺气。${zhuLayout}` },
    chuFang: { direction: chuFangFang.direction, star: chuFangFang.star, jiXiong: chuFangFang.jiXiong, suggestion: `厨房宜压${chuFangFang.direction}方${chuFangFang.star}凶方，以厨火压制凶气。${chuLayout}` },
    geJue, duanYu, summary,
  } as BaZhaiResult & { summary: string };
}
