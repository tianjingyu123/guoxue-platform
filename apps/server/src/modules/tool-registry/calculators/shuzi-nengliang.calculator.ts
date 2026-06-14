// ── 数字能量扩展计算引擎 ──
// 车牌号/门牌号/银行卡号吉凶分析
//
// 理论来源：
//   八星磁场 — 基于《数字能量学》手机号码预测体系，源自中国传统河图洛书数理
//   81数理 — 基于《周易》八十一数理吉凶，参考日本熊崎健翁五格剖象法
//   五行 — 基于《尚书·洪范》五行配数

import type { ShuZiNengLiangResult, NumberType, NumberPair, CiChangType } from "@guoxue/shared";

// ══ 八星磁场 ══
// 数字两两组合对应八种能量场，源自河图洛书数字排列规律
const CI_CHANG_PAIRS: Record<CiChangType, string[]> = {
  "天医": ["13","31","68","86","49","94","27","72"],
  "延年": ["19","91","78","87","34","43","26","62"],
  "生气": ["14","41","67","76","39","93","28","82"],
  "伏位": ["11","22","33","44","66","77","88","99"],
  "绝命": ["12","21","69","96","48","84","37","73"],
  "五鬼": ["18","81","79","97","36","63","24","42"],
  "六煞": ["16","61","47","74","38","83","29","92"],
  "祸害": ["17","71","89","98","46","64","23","32"],
};

const CI_CHANG_DESC: Record<CiChangType, { meaning: string; level: number; wuxing: string }> = {
  "天医": { meaning: "主财运旺，利投资理财，正偏财皆有收获", level: 4, wuxing: "土" },
  "延年": { meaning: "主事业发达，领导力强，利职场晋升", level: 4, wuxing: "金" },
  "生气": { meaning: "主贵人相助，人际和谐，诸事顺遂", level: 3, wuxing: "木" },
  "伏位": { meaning: "主积蓄等待，稳中求进，宜守不宜攻", level: 1, wuxing: "木" },
  "绝命": { meaning: "主财运起伏大，投资风险高，易大起大落", level: -4, wuxing: "金" },
  "五鬼": { meaning: "主变数多，易有纠纷破财，最不稳定", level: -3, wuxing: "火" },
  "六煞": { meaning: "主情绪波动，感情纠葛，人际关系复杂", level: -2, wuxing: "水" },
  "祸害": { meaning: "主口舌是非，易有争执，小人暗算", level: -2, wuxing: "土" },
};

// ══ 81数理吉凶表（完整版） ══
// 参考《周易》八十一数理，结合日本熊崎健翁五格剖象法
// 0→80（计算值80归入此），1-81完全覆盖
const SHU_LI_TABLE: Record<number, { jiXiong: string; desc: string; wuxing: string }> = {
  // ── 大吉数（1-81）──
  1:  { jiXiong: "大吉", desc: "太极之数，万物开泰，生发无穷，利禄亨通", wuxing: "木" },
  3:  { jiXiong: "大吉", desc: "三才之数，天地人和，大事大业，繁荣昌隆", wuxing: "火" },
  5:  { jiXiong: "大吉", desc: "五行之数，循环相生，圆通畅达，福祉无穷", wuxing: "土" },
  6:  { jiXiong: "大吉", desc: "六爻之数，发展变化，天赋美德，吉祥安泰", wuxing: "土" },
  7:  { jiXiong: "大吉", desc: "七政之数，精悍严谨，天赋之力，吉星高照", wuxing: "金" },
  8:  { jiXiong: "大吉", desc: "八卦之数，乾坎艮震，巽离坤兑，无穷无尽", wuxing: "金" },
  11: { jiXiong: "大吉", desc: "万物更新，调顺发达，稳健着实，繁荣富贵", wuxing: "木" },
  13: { jiXiong: "大吉", desc: "才艺多能，智谋奇略，忍柔当事，鸣奏大功", wuxing: "火" },
  15: { jiXiong: "大吉", desc: "福寿圆满，富贵荣誉，涵养雅量，德高望重", wuxing: "土" },
  16: { jiXiong: "大吉", desc: "贵人相助，财帛丰盈，名利双收，盟主四方", wuxing: "土" },
  17: { jiXiong: "大吉", desc: "权威刚强，突破万难，如能忍柔，必成大业", wuxing: "金" },
  18: { jiXiong: "大吉", desc: "有志竟成，内外有运，功名显达，百事亨通", wuxing: "金" },
  21: { jiXiong: "大吉", desc: "光风霁月，万物确立，官运亨通，大博名利", wuxing: "木" },
  23: { jiXiong: "大吉", desc: "旭日东升，壮丽壮观，权威旺盛，功名荣达", wuxing: "火" },
  24: { jiXiong: "大吉", desc: "家门余庆，金钱丰盈，白手成家，财源广进", wuxing: "火" },
  25: { jiXiong: "大吉", desc: "资性英敏，刚毅果断，自成大业，富贵长久", wuxing: "土" },
  29: { jiXiong: "大吉", desc: "如龙得水，智谋奋进，青云直上，奏功受福", wuxing: "水" },
  31: { jiXiong: "大吉", desc: "智勇得志，博得名利，统领众人，繁荣富贵", wuxing: "木" },
  32: { jiXiong: "大吉", desc: "幸运已临，贵人相助，如龙升天，家门昌隆", wuxing: "木" },
  33: { jiXiong: "大吉", desc: "旭日升天，鸾凤相会，名闻天下，隆昌至极", wuxing: "火" },
  35: { jiXiong: "大吉", desc: "温和平静，智达通畅，文昌技艺，奏功洋洋", wuxing: "土" },
  37: { jiXiong: "大吉", desc: "权威显达，热诚忠信，宜着雅量，终身荣富", wuxing: "金" },
  39: { jiXiong: "大吉", desc: "富贵长寿，德泽四方，云开见日，光明坦途", wuxing: "水" },
  41: { jiXiong: "大吉", desc: "德高望重，事事如意，富贵双全，能成大业", wuxing: "木" },
  45: { jiXiong: "大吉", desc: "顺风扬帆，新生泰和，万事如意，繁荣至极", wuxing: "土" },
  47: { jiXiong: "大吉", desc: "点石成金，开花结果，权威进取，名利俱全", wuxing: "金" },
  48: { jiXiong: "大吉", desc: "德智兼备，鹤立鸡群，名利双收，繁荣富贵", wuxing: "金" },
  52: { jiXiong: "大吉", desc: "卓识慧眼，先见之明，名利双全，富甲一方", wuxing: "木" },
  57: { jiXiong: "大吉", desc: "枯木逢春，寒尽暖来，万事顺遂，时来运转", wuxing: "木" },
  61: { jiXiong: "大吉", desc: "名利双收，繁荣昌盛，修心养性，福寿绵长", wuxing: "木" },
  63: { jiXiong: "大吉", desc: "万物化育，繁荣之象，专心一意，始能成功", wuxing: "火" },
  65: { jiXiong: "大吉", desc: "福寿绵长，事事如意，把握时机，家运昌隆", wuxing: "土" },
  67: { jiXiong: "大吉", desc: "天赋通达，利路亨通，和气致祥，万事如意", wuxing: "金" },
  68: { jiXiong: "大吉", desc: "智慧如海，思虑周详，名利双收，繁荣不失", wuxing: "金" },
  73: { jiXiong: "大吉", desc: "盛衰交加，志高力微，历经磨难，终得成就", wuxing: "火" },
  81: { jiXiong: "大吉", desc: "万物回春，最极之数，还本归元，富贵尊荣", wuxing: "木" },

  // ── 次吉数 ──
  2:  { jiXiong: "次吉", desc: "混沌未开，进退保守，志望难达，宜守不宜进", wuxing: "木" },
  4:  { jiXiong: "次吉", desc: "四象之数，万物枯荣，宜待时机，慎重行事", wuxing: "火" },
  9:  { jiXiong: "次吉", desc: "大成之数，蕴涵凶险，有成有败，需谨慎把握", wuxing: "水" },
  10: { jiXiong: "次吉", desc: "万物终局，黑暗无光，宜待时机，破釜沉舟", wuxing: "水" },
  12: { jiXiong: "次吉", desc: "意志薄弱，家庭寂寞，宜行善积德，以待时机", wuxing: "木" },
  14: { jiXiong: "次吉", desc: "沦落天涯，先苦后甜，忍辱负重，终成大事", wuxing: "火" },
  19: { jiXiong: "次吉", desc: "风云蔽月，辛苦重来，虽有智谋，挫折难免", wuxing: "水" },
  20: { jiXiong: "次吉", desc: "非业破运，灾难重重，进退维谷，万事难成", wuxing: "水" },
  22: { jiXiong: "次吉", desc: "秋草逢霜，怀才不遇，忧愁怨苦，事不如意", wuxing: "木" },
  26: { jiXiong: "次吉", desc: "变怪异数，波澜重叠，英雄豪杰，必争必斗", wuxing: "土" },
  27: { jiXiong: "次吉", desc: "自我增长，半吉半凶，宜多谨慎，修身养性", wuxing: "金" },
  28: { jiXiong: "次吉", desc: "祸乱别离，豪杰命数，波澜万丈，终成大业", wuxing: "金" },
  30: { jiXiong: "次吉", desc: "绝处逢生，吉凶难料，如能谨慎，可保平安", wuxing: "水" },
  38: { jiXiong: "次吉", desc: "磨铁成针，意志薄弱，刻意经营，始有成就", wuxing: "金" },
  40: { jiXiong: "次吉", desc: "智谋胆力，冒险投机，沉浮不定，退守保平安", wuxing: "水" },
  42: { jiXiong: "次吉", desc: "寒花遇霜，博识多才，十艺九不成，宜专一", wuxing: "木" },
  43: { jiXiong: "次吉", desc: "散财破产，须防邪途，雨夜之花，外祥内苦", wuxing: "火" },
  44: { jiXiong: "次吉", desc: "愁眉难展，乱丝无头，事不遂心，宜行善改运", wuxing: "火" },
  46: { jiXiong: "次吉", desc: "载宝沉舟，浪里淘金，大难历尽，方成大功", wuxing: "土" },
  49: { jiXiong: "次吉", desc: "吉凶互见，一成一败，凶中带吉，需防不测", wuxing: "水" },
  50: { jiXiong: "次吉", desc: "一成一败，先得后失，昙花一现，谨慎守成", wuxing: "水" },
  51: { jiXiong: "次吉", desc: "盛衰交加，先得后失，宜守不宜攻，静待时机", wuxing: "木" },
  53: { jiXiong: "次吉", desc: "内忧外患，先凶后吉，艰难困苦，终有出头", wuxing: "木" },
  55: { jiXiong: "次吉", desc: "外美内苦，忠厚平实，立志奋发，必有所成", wuxing: "土" },
  58: { jiXiong: "次吉", desc: "先苦后甜，宽宏大量，历经磨难，终成大业", wuxing: "水" },
  59: { jiXiong: "次吉", desc: "寒蝉悲风，时运不济，宜耐心等待，不可冒进", wuxing: "水" },
  60: { jiXiong: "次吉", desc: "黑暗无光，心迷意乱，出尔反尔，难定方针", wuxing: "水" },
  62: { jiXiong: "次吉", desc: "根基不固，多灾多难，如能谨慎，可保安泰", wuxing: "木" },
  64: { jiXiong: "次吉", desc: "骨肉分离，孤独悲愁，宜广结善缘，消灾解难", wuxing: "火" },
  66: { jiXiong: "次吉", desc: "进退失据，内外不和，信用缺乏，宜退守修德", wuxing: "土" },
  69: { jiXiong: "次吉", desc: "动摇不安，常陷逆境，不得时运，需耐心等待", wuxing: "金" },
  70: { jiXiong: "次吉", desc: "残菊逢霜，寂寞无依，宜行善积德，庆来晚景", wuxing: "水" },
  71: { jiXiong: "次吉", desc: "石上栽花，劳而无功，心高命薄，宜安心守分", wuxing: "金" },
  72: { jiXiong: "次吉", desc: "先甘后苦，万难忍受，虽可成功，终难持久", wuxing: "金" },
  74: { jiXiong: "次吉", desc: "残花经霜，秋叶落寞，宜修身养性，以保安泰", wuxing: "火" },
  75: { jiXiong: "次吉", desc: "守则可安，进则会凶，宜守不宜攻，以静制动", wuxing: "土" },
  76: { jiXiong: "次吉", desc: "倾覆离散，虽劳无功，宜谨慎行事，以防不测", wuxing: "土" },
  77: { jiXiong: "次吉", desc: "半吉半凶，先甘后苦，如能谨慎，可保安康", wuxing: "金" },
  78: { jiXiong: "次吉", desc: "先荣后枯，智能兼备，缺进取心，晚景凄凉", wuxing: "金" },
  79: { jiXiong: "次吉", desc: "云头望月，身疲力尽，宜守不宜进，怡然养性", wuxing: "水" },
  80: { jiXiong: "次吉", desc: "终局之数，万事归零，需从头再来，重新出发", wuxing: "水" },

  // ── 凶数 ──
  34: { jiXiong: "凶", desc: "破家亡身，凶煞最强，宜多行善事，避之大凶", wuxing: "火" },
  36: { jiXiong: "凶", desc: "风浪不静，波澜重叠，侠义肝胆，杀身成仁", wuxing: "土" },
  54: { jiXiong: "凶", desc: "多难多灾，艰难困苦，宜行善积德，祈望平安", wuxing: "火" },
  56: { jiXiong: "凶", desc: "事与愿违，终难成功，历尽苦难，宜修身养性", wuxing: "土" },
};

// 五行缺失/过旺时的建议
const WUXING_ADVICE: Record<string, string> = {
  "木": "木主仁，宜养绿植、穿戴绿色，居东方位旺运",
  "火": "火主礼，宜多读书明理、穿戴红色，居南方位旺运",
  "土": "土主信，宜诚信待人、穿戴黄色，居中土之位旺运",
  "金": "金主义，宜果断刚毅、穿戴白色，居西方位旺运",
  "水": "水主智，宜灵活变通、穿戴黑色，居北方位旺运",
};

function getShuLi(digits: string): { value: number; jiXiong: string; desc: string; wuxing: string } {
  const num = parseInt(digits.slice(-4), 10);
  if (isNaN(num)) return { value: 0, jiXiong: "平", desc: "无法计算", wuxing: "未知" };
  let s = Math.round((num / 80 - Math.floor(num / 80)) * 80);
  if (s === 0) s = 80;
  const e = SHU_LI_TABLE[s];
  if (e) return { value: s, jiXiong: e.jiXiong, desc: `${s}数：${e.desc}`, wuxing: e.wuxing };
  return { value: s, jiXiong: "平", desc: `${s}数：平稳数理，中规中矩`, wuxing: "未知" };
}

function getCiChangType(pair: string): CiChangType | null {
  for (const [type, pairs] of Object.entries(CI_CHANG_PAIRS)) {
    if (pairs.includes(pair)) return type as CiChangType;
  }
  return null;
}

function analyzePairs(digits: string): NumberPair[] {
  const pairs: NumberPair[] = [];
  for (let i = 0; i < digits.length - 1; i++) {
    const pair = digits.slice(i, i + 2);
    const ct = getCiChangType(pair);
    if (ct) {
      const info = CI_CHANG_DESC[ct];
      // 修复：权重衰减公式，最小值限制为0.05，防止长数字溢出为负数
      const weight = Math.max(0.05, 1 - i * 0.05);
      pairs.push({
        pair,
        ciChang: ct,
        jiXiong: info.level > 0 ? "吉" : info.level < 0 ? "凶" : "平",
        meaning: info.meaning,
        weight,
      });
    }
  }
  return pairs;
}

const TYPE_NAMES: Record<NumberType, string> = {
  license_plate: "车牌号",
  house_number: "门牌号",
  bank_card: "银行卡号",
};

function normalizeNumber(input: string, type: NumberType): string {
  let digits = input.replace(/[^0-9]/g, "");
  if (type === "license_plate") {
    const m = input.match(/[0-9]+/g);
    if (m) digits = m.join("");
  }
  if (type === "bank_card" && digits.length > 8) digits = digits.slice(-8);
  return digits;
}

// 统计五行分布
function analyzeWuxing(pairs: NumberPair[], shuLi: { wuxing: string }): {
  distribution: Record<string, number>;
  dominant: string;
  dominantWx: string;
} {
  const distribution: Record<string, number> = {};
  for (const p of pairs) {
    const wx = CI_CHANG_DESC[p.ciChang]?.wuxing;
    if (wx) distribution[wx] = (distribution[wx] || 0) + 1;
  }
  if (shuLi.wuxing !== "未知") {
    distribution[shuLi.wuxing] = (distribution[shuLi.wuxing] || 0) + 1;
  }
  let dominantWx = "未知";
  let maxCount = 0;
  for (const [wx, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      dominantWx = wx;
    }
  }
  const dominant = dominantWx !== "未知"
    ? `号码五行以${dominantWx}为主导，${WUXING_ADVICE[dominantWx] || ""}`
    : "五行均衡，兼容并蓄";
  return { distribution, dominant, dominantWx };
}

export function calculateShuZiNengLiang(input: Record<string, unknown>): ShuZiNengLiangResult {
  const type = (input.type as NumberType) ?? "license_plate";
  const number = (input.number as string) ?? "";
  const digits = normalizeNumber(number, type);
  const pairs = analyzePairs(digits);
  const shuLi = getShuLi(digits);

  const goodCount = pairs.filter(p => CI_CHANG_DESC[p.ciChang].level > 0).length;
  const badCount = pairs.filter(p => CI_CHANG_DESC[p.ciChang].level < 0).length;
  const main = pairs.length > 0
    ? pairs.reduce((a, b) => a.weight > b.weight ? a : b).ciChang
    : "伏位";

  // 总分 = 基准50 + 磁场得分 + 数理加成
  const totalScore = Math.min(100, Math.max(10,
    50 + goodCount * 8 - badCount * 10 + (shuLi.jiXiong === "大吉" ? 15 : shuLi.jiXiong === "凶" ? -15 : shuLi.jiXiong === "次吉" ? 5 : 0)
  ));

  // 分类评分：不同磁场对不同维度的影响权重不同
  const baseScores = { career: 50, wealth: 50, love: 50, health: 50, social: 50 };
  for (const p of pairs) {
    const lv = CI_CHANG_DESC[p.ciChang].level;
    const adj = lv * 6 * p.weight; // 加入位置权重衰减
    // 延年/生气 主要影响事业和社会
    baseScores.career += (p.ciChang === "延年" || p.ciChang === "生气") ? adj : adj * 0.3;
    // 天医 主要影响财富
    baseScores.wealth += (p.ciChang === "天医") ? adj : adj * 0.3;
    // 六煞/生气 主要影响感情
    baseScores.love += (p.ciChang === "六煞" || p.ciChang === "生气") ? adj : adj * 0.3;
    // 天医/伏位 主要影响健康
    baseScores.health += (p.ciChang === "天医" || p.ciChang === "伏位") ? adj : adj * 0.3;
    // 生气/延年 主要影响人际关系
    baseScores.social += (p.ciChang === "生气" || p.ciChang === "延年") ? adj : adj * 0.3;
  }
  const scores = Object.fromEntries(
    Object.entries(baseScores).map(([k, v]) => [k, Math.min(100, Math.max(10, Math.round(v)))])
  ) as unknown as ShuZiNengLiangResult["scores"];

  // 五行分析
  const wuxing = analyzeWuxing(pairs, shuLi);

  // 断语生成
  const scoreLabel = totalScore >= 85 ? "上佳" : totalScore >= 70 ? "良好" : totalScore >= 55 ? "中等" : totalScore >= 40 ? "偏低" : "较差";
  const duanYu = [
    `${TYPE_NAMES[type]}${number}（归一化：${digits}），能量评定${scoreLabel}（${totalScore}分）。`,
    `主磁场为「${main}」：${CI_CHANG_DESC[main].meaning}`,
    `81数理：${shuLi.desc}。`,
    wuxing.dominant,
    `${goodCount > badCount ? "吉祥磁场居多，整体向好。" : badCount > goodCount ? "凶星偏多，建议调整号码。" : "吉凶参半，平稳中求进。"}`,
  ].join("");

  // 建议生成
  const advice: string[] = [];
  if (badCount > goodCount) {
    advice.push("建议更换号码，优先选择天医/延年/生气磁场组合（如13/19/14等数字对）");
  }
  if (shuLi.jiXiong === "凶") {
    advice.push("数理大凶，建议更换尾号，选用大吉数理（如1/3/5/6/7/8/11/13/15/16等）");
  } else if (shuLi.jiXiong === "次吉") {
    advice.push("数理偏弱，可考虑在尾号后追加吉利数字改善（如加6、8）");
  }
  if (totalScore >= 80) {
    advice.push("号码能量良好，保持稳定使用，不建议频繁更换");
  }
  if (pairs.length === 0) {
    advice.push("数字位数过少，建议使用至少2位以上数字进行分析");
  }
  // 五行建议
  if (wuxing.dominantWx !== "未知") {
    advice.push(`五行建议：${WUXING_ADVICE[wuxing.dominantWx] || ""}`);
  }
  if (advice.length === 0) {
    advice.push("号码中规中矩，保持平常心即可，可在重要场合搭配吉利数字使用");
  }

  return {
    input: { type, number },
    meta: { typeName: TYPE_NAMES[type], normalizedNumber: digits, digitCount: digits.length },
    pairs,
    shuLi,
    ciChangSummary: {
      main,
      goodCount,
      badCount,
      desc: `吉星${goodCount}个，凶星${badCount}个${pairs.length > 0 ? `，首对磁场「${pairs[0].ciChang}」` : ""}`,
    },
    totalScore,
    scores,
    duanYu,
    advice,
  };
}
