// ── 手机号码分析计算引擎 ──
// 算法参考：《协纪辨方书》《八宅明镜》
// 数字能量学/八星磁场/五行/评分
// 运营商识别基于工信部号段数据库

import type { PhoneAnalysisResult, CiChangType, NumWuXing, NumberPair, PhoneWuXing } from "@guoxue/shared";
import { calcRiZhu } from "@guoxue/bazi-engine";

// ── 运营商号段数据库（工信部分配） ──
const CARRIER_PREFIXES: { prefix: string; carrier: string }[] = [
  // 中国移动
  { prefix:"134", carrier:"中国移动" },{ prefix:"135", carrier:"中国移动" },{ prefix:"136", carrier:"中国移动" },
  { prefix:"137", carrier:"中国移动" },{ prefix:"138", carrier:"中国移动" },{ prefix:"139", carrier:"中国移动" },
  { prefix:"147", carrier:"中国移动" },{ prefix:"148", carrier:"中国移动" },
  { prefix:"150", carrier:"中国移动" },{ prefix:"151", carrier:"中国移动" },{ prefix:"152", carrier:"中国移动" },
  { prefix:"157", carrier:"中国移动" },{ prefix:"158", carrier:"中国移动" },{ prefix:"159", carrier:"中国移动" },
  { prefix:"172", carrier:"中国移动" },{ prefix:"178", carrier:"中国移动" },
  { prefix:"182", carrier:"中国移动" },{ prefix:"183", carrier:"中国移动" },{ prefix:"184", carrier:"中国移动" },
  { prefix:"187", carrier:"中国移动" },{ prefix:"188", carrier:"中国移动" },
  { prefix:"195", carrier:"中国移动" },{ prefix:"197", carrier:"中国移动" },{ prefix:"198", carrier:"中国移动" },
  // 中国联通
  { prefix:"130", carrier:"中国联通" },{ prefix:"131", carrier:"中国联通" },{ prefix:"132", carrier:"中国联通" },
  { prefix:"145", carrier:"中国联通" },{ prefix:"146", carrier:"中国联通" },
  { prefix:"155", carrier:"中国联通" },{ prefix:"156", carrier:"中国联通" },
  { prefix:"166", carrier:"中国联通" },{ prefix:"167", carrier:"中国联通" },
  { prefix:"171", carrier:"中国联通" },{ prefix:"175", carrier:"中国联通" },{ prefix:"176", carrier:"中国联通" },
  { prefix:"185", carrier:"中国联通" },{ prefix:"186", carrier:"中国联通" },
  { prefix:"196", carrier:"中国联通" },
  // 中国电信
  { prefix:"133", carrier:"中国电信" },{ prefix:"149", carrier:"中国电信" },
  { prefix:"153", carrier:"中国电信" },
  { prefix:"162", carrier:"中国电信" },
  { prefix:"173", carrier:"中国电信" },{ prefix:"174", carrier:"中国电信" },{ prefix:"177", carrier:"中国电信" },
  { prefix:"180", carrier:"中国电信" },{ prefix:"181", carrier:"中国电信" },{ prefix:"189", carrier:"中国电信" },
  { prefix:"190", carrier:"中国电信" },{ prefix:"191", carrier:"中国电信" },{ prefix:"193", carrier:"中国电信" },{ prefix:"199", carrier:"中国电信" },
  // 中国广电
  { prefix:"192", carrier:"中国广电" },
  // 虚拟运营商（170/171等部分已分配给联通）
  { prefix:"170", carrier:"虚拟运营商" },
  // 物联网
  { prefix:"140", carrier:"中国移动(物联)" },{ prefix:"141", carrier:"中国电信(物联)" },
  { prefix:"144", carrier:"中国移动(物联)" },
];

// ── 八星磁场数字对定义 ──
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

const CI_CHANG_MEANING: Record<CiChangType, { meaning: string; level: number }> = {
  "天医": { meaning:"主财运佳，财运旺，利投资。", level:4 },
  "延年": { meaning:"主事业发达，领导力强，权力运佳。", level:4 },
  "生气": { meaning:"主贵人相助，人际和谐，机遇多。", level:3 },
  "伏位": { meaning:"主积蓄等待，宜守成不宜冒进。", level:1 },
  "绝命": { meaning:"主财运起伏大，投资风险高。", level:-4 },
  "五鬼": { meaning:"主变数多，易有纠纷是非。", level:-3 },
  "六煞": { meaning:"主情绪波动，感情纠葛。", level:-2 },
  "祸害": { meaning:"主口舌是非，容易有争执。", level:-2 },
};

const NUM_WU_XING: Record<string, NumWuXing> = {
  "0":"水","1":"水","2":"火","3":"火","4":"木","5":"木","6":"金","7":"金","8":"土","9":"土",
};

const JI_XIONG_MAP: Record<number, string> = {
  4:"大吉", 3:"吉", 1:"平", 0:"平",
  [-2]:"凶", [-3]:"凶", [-4]:"大凶",
};

// 五行相生相克
const WU_XING_SHENG: Record<NumWuXing, NumWuXing> = { "金":"水","水":"木","木":"火","火":"土","土":"金" };
const WU_XING_KE: Record<NumWuXing, NumWuXing> = { "金":"木","木":"土","土":"水","水":"火","火":"金" };

// ── 81数理吉凶表（标准81数理） ──
const SHU_LI_TABLE: Record<number, { jiXiong: string; desc: string }> = {
  1: { jiXiong:"大吉", desc:"太极之数，万物开泰，生发无穷，利禄亨通" },
  2: { jiXiong:"凶", desc:"两仪之数，混沌未开，进退保守，志望难达" },
  3: { jiXiong:"大吉", desc:"三才之数，天地人和，大事大业，繁荣昌隆" },
  4: { jiXiong:"凶", desc:"四象之数，待于生发，万事慎重，不具营谋" },
  5: { jiXiong:"大吉", desc:"五行之数，五行俱权，循环相生，圆通畅达" },
  6: { jiXiong:"大吉", desc:"六爻之数，发展变化，天赋美德，吉祥安泰" },
  7: { jiXiong:"大吉", desc:"七政之数，精悍严谨，天赋之力，吉星高照" },
  8: { jiXiong:"大吉", desc:"八卦之数，乾坎艮震，巽离坤兑，无穷无尽" },
  9: { jiXiong:"凶", desc:"大成之数，蕴含凶险，或成或败，难以把握" },
  10: { jiXiong:"凶", desc:"终结之数，雪暗飘零，偶或有成，回顾茫然" },
  11: { jiXiong:"大吉", desc:"万物更新，调顺发达，恢弘泽世，繁荣富贵" },
  12: { jiXiong:"凶", desc:"无理之数，发展薄弱，虽生不足，难酬志向" },
  13: { jiXiong:"大吉", desc:"才艺之数，才艺多能，智谋奇略，忍柔当事" },
  14: { jiXiong:"凶", desc:"破兆之数，家庭缘薄，孤独遭难，谋事不达" },
  15: { jiXiong:"大吉", desc:"福寿之数，福寿圆满，富贵荣誉，涵养雅量" },
  16: { jiXiong:"大吉", desc:"贵人相助，宅心仁厚，财帛丰盈，名利双收" },
  17: { jiXiong:"大吉", desc:"刚强之数，权威刚强，突破万难，能忍则成" },
  18: { jiXiong:"大吉", desc:"铁镜重磨，有志竟成，内外有运，功名显达" },
  19: { jiXiong:"凶", desc:"多难之数，风云蔽月，辛苦重来，虽有智谋亦挫折" },
  20: { jiXiong:"凶", desc:"屋下藏金，非业破运，灾难重叠，进退维谷" },
  21: { jiXiong:"大吉", desc:"明月中天，光风霁月，万物确立，官运亨通" },
  22: { jiXiong:"凶", desc:"秋草逢霜，徒劳无功，百事不如意，人生多波折" },
  23: { jiXiong:"大吉", desc:"旭日东升，壮丽壮观，权威旺盛，功名荣达" },
  24: { jiXiong:"大吉", desc:"家门余庆，金钱丰盈，白手成家，财源广进" },
  25: { jiXiong:"大吉", desc:"资性英敏，刚毅果断，才能奇特，自成大业" },
  26: { jiXiong:"凶", desc:"变怪之数，波澜重叠，英雄豪杰亦受波折" },
  27: { jiXiong:"中吉", desc:"宜静待时，一成一败，一盛一衰，惟靠谨慎" },
  28: { jiXiong:"凶", desc:"鱼临旱地，难逃厄运，此数大凶，不如更名" },
  29: { jiXiong:"大吉", desc:"智谋兼备，如龙得水，青云直上，财力归集" },
  30: { jiXiong:"中吉", desc:"吉凶相伴，一成一败，沉浮不定，需谨慎行事" },
  31: { jiXiong:"大吉", desc:"猛虎出林，智勇得志，博得名利，统领众人" },
  32: { jiXiong:"大吉", desc:"困龙得水，幸运已临，贵人相助，心想事成" },
  33: { jiXiong:"大吉", desc:"旭日升天，鸾凤相会，名闻天下，隆昌至极" },
  34: { jiXiong:"凶", desc:"破家之数，灾难不绝，非但家破，且损自身" },
  35: { jiXiong:"大吉", desc:"高楼望月，温和平静，智达通畅，文昌技艺" },
  36: { jiXiong:"凶", desc:"波澜重叠，常陷穷困，动不如静，有才无命" },
  37: { jiXiong:"大吉", desc:"权威显达，猛虎出林，热诚忠信，宜着雅量" },
  38: { jiXiong:"中吉", desc:"磨铁成针，刻意经营，此数虽有成，但需苦心志" },
  39: { jiXiong:"大吉", desc:"云开见月，富贵长寿，德泽四方，富贵荣华" },
  40: { jiXiong:"凶", desc:"退安之数，智谋胆力，冒险投机，沉浮难定" },
  41: { jiXiong:"大吉", desc:"德高望重，事事如意，能成大业，富贵双全" },
  42: { jiXiong:"中吉", desc:"寒蝉在柳，博识多能，精通世情，十艺九不成" },
  43: { jiXiong:"凶", desc:"散财破产，须防邪途，外祥内苦，灾祸频来" },
  44: { jiXiong:"凶", desc:"须眉难展，愁闷难申，事难遂愿，一生暗淡" },
  45: { jiXiong:"大吉", desc:"顺风扬帆，新生泰和，智谋经纬，万事如意" },
  46: { jiXiong:"凶", desc:"浪里淘金，须防复失，罗网系身，一生困顿" },
  47: { jiXiong:"大吉", desc:"点石成金，开花结果，权威进取，万事如意" },
  48: { jiXiong:"大吉", desc:"古松立鹤，德智兼备，鹤立鸡群，名利双收" },
  49: { jiXiong:"中吉", desc:"吉凶难分，得而复失，守成不易，辛劳半生" },
  50: { jiXiong:"中吉", desc:"小舟入海，吉凶互见，须防倾覆，万事慎重" },
  51: { jiXiong:"中吉", desc:"浮沉不定，一盛一衰，浪里行舟，须防风险" },
  52: { jiXiong:"大吉", desc:"卓识慧眼，先见之明，谋事得志，名利双全" },
  53: { jiXiong:"中吉", desc:"曲巷行路，外祥内忧，前半虽难，晚年康泰" },
  54: { jiXiong:"凶", desc:"石上栽花，多难悲运，心虽有志，奈何运途" },
  55: { jiXiong:"凶", desc:"外观隆昌，内隐祸患，克服难关，方得泰运" },
  56: { jiXiong:"凶", desc:"浪里行舟，历尽艰辛，事与愿违，万事龃龉" },
  57: { jiXiong:"大吉", desc:"日照春松，时来运转，枯木逢春，万事顺遂" },
  58: { jiXiong:"中吉", desc:"夜行遇雨，先苦后甜，宽宏大量，渡过即安" },
  59: { jiXiong:"凶", desc:"寒蝉悲风，耐心不足，时运不济，意志衰退" },
  60: { jiXiong:"凶", desc:"百事不成，方向迷茫，黑暗无光，动摇不定" },
  61: { jiXiong:"大吉", desc:"名利双收，繁荣昌盛，修心养性，富贵不傲" },
  62: { jiXiong:"凶", desc:"衰败之数，内外不合，信用难得，困难重重" },
  63: { jiXiong:"大吉", desc:"舟归平浦，万物化育，繁荣之象，专心一意" },
  64: { jiXiong:"凶", desc:"骨肉分离，非命之数，破坏力重，多灾多难" },
  65: { jiXiong:"大吉", desc:"寿比南山，事事如意，天长地久，福寿绵长" },
  66: { jiXiong:"凶", desc:"进退失据，内外不和，艰难不堪，损害惨重" },
  67: { jiXiong:"大吉", desc:"天赋通达，利路亨通，自强不息，万事如意" },
  68: { jiXiong:"大吉", desc:"智慧如海，兴家立业，脚踏实地，名利双收" },
  69: { jiXiong:"凶", desc:"坐立不安，动摇不定，常陷逆境，难得安泰" },
  70: { jiXiong:"凶", desc:"残菊逢霜，废物灭亡，愁苦不绝，惨淡经营" },
  71: { jiXiong:"中吉", desc:"石上金花，内心劳苦，贯彻始终，终得成功" },
  72: { jiXiong:"中吉", desc:"先甘后苦，甘苦相伴，万事劳心，耐之则安" },
  73: { jiXiong:"大吉", desc:"春蚕结茧，志高力微，盛衰交加，终得成就" },
  74: { jiXiong:"凶", desc:"残花经霜，秋叶落寞，智能无用，壮志难酬" },
  75: { jiXiong:"中吉", desc:"退守保身，发而未达，虽有名气，难如心意" },
  76: { jiXiong:"凶", desc:"倾覆离散，内外不合，骨肉分离，一生困顿" },
  77: { jiXiong:"中吉", desc:"乐极生悲，家庭有悦，半吉半凶，知足常乐" },
  78: { jiXiong:"中吉", desc:"福祸相依，中年渐发，晚年康泰，先苦后甜" },
  79: { jiXiong:"凶", desc:"云头望月，身疲力尽，前途黯淡，万事难成" },
  80: { jiXiong:"中吉", desc:"凶星反吉，最极之数，本应隆昌，奈何不达" },
  81: { jiXiong:"大吉", desc:"万物回春，还元复始，数理之极，富贵尊荣" },
};

/** 81数理算法（取号码后四位或全部连续数字计算） */
function calcShuLi(digits: string): { value: number; jiXiong: string; desc: string } {
  // 优先取后四位；不足则用全部
  const last4 = digits.length >= 4 ? digits.slice(-4) : digits;
  const num = parseInt(last4, 10);
  if (isNaN(num)) return { value: 0, jiXiong: "平", desc: "无法计算" };
  // 乘80÷80法
  const quotient = num / 80;
  const fractional = quotient - Math.floor(quotient);
  let shuLi = Math.round(fractional * 80);
  if (shuLi === 0) shuLi = 80; // 余0则为80
  const entry = SHU_LI_TABLE[shuLi] ?? { jiXiong: "平", desc: "普通数理" };
  return { value: shuLi, jiXiong: entry.jiXiong, desc: `${shuLi}数：${entry.desc}` };
}

/** 阴阳平衡分析 */
function calcYinYang(digits: string): { yang: number; yin: number; balance: string; score: number } {
  let yang = 0, yin = 0;
  for (const d of digits) {
    const n = parseInt(d, 10);
    if (isNaN(n)) continue;
    if (n % 2 === 1) yang++; else yin++;
  }
  const ratio = yang / (digits.length || 1);
  let balance: string;
  let score: number;
  if (ratio >= 0.45 && ratio <= 0.55) { balance = "阴阳平衡"; score = 10; }
  else if (ratio >= 0.35 && ratio <= 0.65) { balance = "略有偏颇"; score = 5; }
  else { balance = "阴阳失衡"; score = 0; }
  return { yang, yin, balance, score };
}

/** 靓号识别 */
function detectPattern(digits: string): string[] {
  const patterns: string[] = [];
  const tail = digits.slice(-4);
  // AAA
  if (/(\d)\1{2,}/.test(digits)) patterns.push("豹子号（能量集中）");
  // AABB
  if (/(\d)\1(?!\1)(\d)\2/.test(tail)) patterns.push("AABB对子（稳定和谐）");
  // ABAB
  if (/(\d)(?!\1)(\d)\1\2/.test(tail)) patterns.push("ABAB交替（灵活变通）");
  // 顺子
  if (/0123|1234|2345|3456|4567|5678|6789/.test(tail)) patterns.push("顺子递增（步步高升）");
  if (/9876|8765|7654|6543|5432|4321|3210/.test(tail)) patterns.push("顺子递减（急流勇退）");
  // 尾数
  if (digits.endsWith("8")) patterns.push("尾数8（发旺之数）");
  if (digits.endsWith("4")) patterns.push("尾数4（需注意健康）");
  return patterns;
}

// 日干五行映射
const DAY_GAN_WU_XING: Record<string, NumWuXing> = {
  "甲":"木","乙":"木","丙":"火","丁":"火",
  "戊":"土","己":"土","庚":"金","辛":"金",
  "壬":"水","癸":"水",
};

function classifyPair(pair: string): CiChangType | null {
  for (const [type, pairs] of Object.entries(CI_CHANG_PAIRS)) {
    if (pairs.includes(pair)) return type as CiChangType;
  }
  return null;
}

/** 根据前3位识别运营商 */
function detectCarrier(digits: string): string {
  // 尝试3位前缀匹配
  const prefix3 = digits.slice(0, 3);
  for (const { prefix, carrier } of CARRIER_PREFIXES) {
    if (prefix3 === prefix) return carrier;
  }
  // 回退：2位前缀匹配
  const prefix2 = digits.slice(0, 2);
  if (prefix2 === "13" || prefix2 === "15" || prefix2 === "18") return "中国移动";
  if (prefix2 === "17" || prefix2 === "16") return "中国联通";
  if (prefix2 === "19") return "中国电信";
  return "未知运营商";
}

/** 计算手机号与机主的五行匹配度（基于生日） */
function calcMatchScore(digits: string, birthday?: string): number | undefined {
  if (!birthday) return undefined;

  try {
    const d = new Date(birthday);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    const riZhu = calcRiZhu(year, month, day);
    const riGan = riZhu.gan;
    const riWx = DAY_GAN_WU_XING[riGan];
    if (!riWx) return undefined;

    // 统计号码五行分布
    const wxCount: Record<NumWuXing, number> = { "金":0,"木":0,"水":0,"火":0,"土":0 };
    for (const dg of digits) {
      const wx = NUM_WU_XING[dg] ?? "土";
      wxCount[wx]++;
    }

    // 基于五行生克计算匹配度
    // 生日干所生五行多 → 泄身，不太好
    // 克生日干五行多 → 受克，不好
    // 生生日干五行多 → 得生，好
    // 与生日干同五行多 → 比劫，一般
    // 日干所克五行多 → 财，好
    const totalDigits = digits.length || 1;
    let score = 60; // 基准分

    for (const [wx, count] of Object.entries(wxCount) as [NumWuXing, number][]) {
      const ratio = count / totalDigits;
      if (wx === WU_XING_SHENG[riWx]) {
        // 泻身（日干所生）
        score -= Math.round(ratio * 15);
      } else if (WU_XING_KE[wx] === riWx) {
        // 克日干
        score -= Math.round(ratio * 20);
      } else if (WU_XING_SHENG[wx] === riWx) {
        // 生日干（印星）
        score += Math.round(ratio * 10);
      } else if (wx === riWx) {
        // 比劫
        score += Math.round(ratio * 5);
      } else if (riWx === WU_XING_SHENG[wx]) {
        // 日干所克（财）
        score += Math.round(ratio * 12);
      }
    }

    return Math.min(100, Math.max(10, score));
  } catch {
    return undefined;
  }
}

export function calculatePhoneAnalysis(input: Record<string, unknown>): PhoneAnalysisResult {
  const phone = (input.phone as string) ?? "13888888888";
  const system = (input.system as string) ?? "all";
  const birthday = input.birthday as string | undefined;
  const gender = input.gender as "male" | "female" | undefined;

  const digits = phone.replace(/\D/g, "");
  const carrier = detectCarrier(digits);
  const tail = digits.slice(-4);

  // 数字对分析
  const pairs: NumberPair[] = [];
  for (let i = 0; i < digits.length - 1; i++) {
    const pair = digits.slice(i, i + 2);
    const ciChang = classifyPair(pair);
    if (ciChang) {
      const info = CI_CHANG_MEANING[ciChang];
      pairs.push({
        pair, ciChang,
        jiXiong: JI_XIONG_MAP[info.level] as any,
        meaning: info.meaning,
        weight: i >= digits.length - 4 ? 2 : 1,
      });
    }
  }

  // 五行分析
  const wuXingDist: Record<NumWuXing, number> = { "金":0,"木":0,"水":0,"火":0,"土":0 };
  for (const d of digits) {
    const wx = NUM_WU_XING[d] ?? "土";
    wuXingDist[wx]++;
  }
  const dominant = (Object.entries(wuXingDist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "土") as NumWuXing;
  const missing = Object.entries(wuXingDist).filter(([_, v]) => v === 0).map(([k]) => k as NumWuXing);

  // 真实匹配度计算（基于八字日干五行）
  const matchScore = calcMatchScore(digits, birthday);

  const wuXing: PhoneWuXing = {
    distribution: wuXingDist,
    dominant,
    missing,
    matchScore,
    desc: matchScore !== undefined
      ? `号码五行以${dominant}为主，${missing.length ? `缺失${missing.join("、")}，建议补益。` : "五行齐全。"}与机主八字匹配度${matchScore}分。`
      : `号码五行以${dominant}为主，${missing.length ? `缺失${missing.join("、")}，建议补益。` : "五行齐全。"}`,
  };

  // 磁场分布
  const ciChangCounts = new Map<CiChangType, { count: number; weight: number }>();
  for (const p of pairs) {
    const entry = ciChangCounts.get(p.ciChang) || { count: 0, weight: 0 };
    entry.count++;
    entry.weight += p.weight;
    ciChangCounts.set(p.ciChang, entry);
  }
  const distribution = [...ciChangCounts.entries()].map(([type, v]) => ({ type, count: v.count, weight: v.weight }));
  const main = distribution.sort((a, b) => b.weight - a.weight)[0]?.type ?? "伏位";
  const jiCount = pairs.filter(p => p.jiXiong.includes("吉")).length;
  const xiongCount = pairs.filter(p => p.jiXiong.includes("凶")).length;

  // 评分（基于八星权重）
  const calcDim = (goodTypes: CiChangType[], badTypes: CiChangType[], goodMul = 10, badMul = 5) =>
    Math.min(100, Math.max(10, 50 +
      pairs.filter(p => goodTypes.includes(p.ciChang)).length * goodMul * (pairs.filter(p => goodTypes.includes(p.ciChang) && p.weight > 1).length ? 1.5 : 1) -
      pairs.filter(p => badTypes.includes(p.ciChang)).length * badMul));

  const scores = {
    career: calcDim(["延年","生气"], ["祸害","五鬼"], 10, 5),
    wealth: calcDim(["天医"], ["绝命"], 8, 5),
    love: calcDim(["天医","伏位"], ["六煞"], 5, 5),
    health: calcDim(["生气","延年"], ["绝命","五鬼"], 5, 3),
    social: calcDim(["生气"], ["祸害"], 8, 5),
  };

  // 81数理评分
  const shuLi = calcShuLi(digits);
  const shuLiScore = shuLi.jiXiong === "大吉" ? 90 : shuLi.jiXiong === "中吉" ? 65 : shuLi.jiXiong === "凶" ? 20 : 50;

  // 阴阳平衡评分
  const yinYang = calcYinYang(digits);

  // 靓号检测
  const detectedPatterns = detectPattern(digits);

  // 综合评分：八星权重60% + 81数理25% + 五行匹配15% + 阴阳加成
  const totalScore = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / 5 * 0.6 +
    shuLiScore * 0.25 +
    (matchScore ?? 50) * 0.15 +
    yinYang.score
  );

  const duanYu = `号码${phone}（${carrier}），${totalScore >= 75 ? "整体大吉" : totalScore >= 50 ? "中等偏上" : "建议更换"}。主磁场${main}，${shuLi.desc}。${wuXing.desc}${yinYang.balance}。${detectedPatterns.length ? `号码特征：${detectedPatterns.join("，")}。` : ""}`;

  const maskedPhone = phone.slice(0, 3) + "****" + phone.slice(-4);
  const summary = [
    "┌─ 手机号码分析 ────────────────────────┐",
    `│ 号码：${maskedPhone}  运营商：${carrier}`.padEnd(36) + "│",
    `│ 综合评分：${totalScore}分  主磁场：${main}`.padEnd(36) + "│",
    "├─ 五维评分 ────────────────────────────┤",
    `│ 事业${scores.career} 财富${scores.wealth} 感情${scores.love} 健康${scores.health} 人际${scores.social}`.padEnd(36) + "│",
    "├─ 五行数理 ────────────────────────────┤",
    `│ 主导：${wuXing.dominant}  缺失：${wuXing.missing.join("、") || "无"}`.padEnd(36) + "│",
    `│ 81数理：${shuLi.jiXiong}（${shuLi.desc.slice(0, 16)}）`.padEnd(36) + "│",
    `│ 阴阳：${yinYang.balance}（阳${yinYang.yang}/阴${yinYang.yin}）`.padEnd(36) + "│",
    "├─ 磁场分布 ────────────────────────────┤",
    ...(distribution.length > 0
      ? distribution.slice(0, 4).map(d => `│ ${d.type}（${d.count}对）`.padEnd(36) + "│")
      : ["│ 无明显磁场特征                      │"]),
    "├─ 出处 ────────────────────────────────┤",
    "│ 《协纪辨方书》《八宅明镜》数字能量学    │",
    "└────────────────────────────────────────┘",
  ].join("\n");

  return {
    input: { phone, system: system as any, birthday, gender },
    breakdown: { carrier, location: "中国大陆", tail },
    pairs,
    wuXing,
    ciChangSummary: { main, distribution, jiXiongRatio: `吉${jiCount}个 / 凶${xiongCount}个` },
    totalScore,
    scores,
    duanYu,
    summary,
  } as PhoneAnalysisResult & { summary: string };
}
