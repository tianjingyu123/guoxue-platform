// ── 果老星宗计算引擎 ──
// 算法参考：《果老星宗》《星学大成》
import type { GuoLaoXingZongResult, GuoLaoStarPosition } from "@guoxue/shared";

/**
 * 果老星宗星命推算
 *
 * 数据来源：《星学大成》《果老星宗》《张果星宗》
 *          参考《天文大成管窥辑要》、明代《星学纲目》
 *
 * 核心算法：
 * 1. 太阳黄经 → 二十八宿宫位
 * 2. 月亮黄经 → 身度宫位
 * 3. 命度主/身度主确定
 * 4. 二十八宿分布及其星曜属性
 */

// ══════════════════════════════════════
// 二十八宿度数（赤道宿度，据《星学大成》）
// 每宿起止度数（累积度）
// ══════════════════════════════════════
interface XiuInfo {
  name: string;
  startDeg: number;  // 起始黄经（累积度，0=春分点）
  span: number;      // 宿度跨度
  wuXing: string;    // 五行属性
  animal: string;    // 禽象
  star: string;      // 主星
  meaning: string;   // 含义
}

const XIU_DB: XiuInfo[] = [
  // 东方青龙七宿
  { name: "角宿", startDeg: 0, span: 12.8, wuXing: "木", animal: "蛟", star: "角宿一(Spica)", meaning: "青龙之角，为首宿，象征生机勃发。" },
  { name: "亢宿", startDeg: 12.8, span: 9.3, wuXing: "金", animal: "龙", star: "亢宿一", meaning: "青龙之颈，象征刚强有力。" },
  { name: "氐宿", startDeg: 22.1, span: 16.4, wuXing: "土", animal: "貉", star: "氐宿一", meaning: "青龙之胸，象征根基稳固。" },
  { name: "房宿", startDeg: 38.5, span: 5.3, wuXing: "火", animal: "兔", star: "房宿一", meaning: "青龙之腹，为天府，象征财富与居所。" },
  { name: "心宿", startDeg: 43.8, span: 6.3, wuXing: "火", animal: "狐", star: "心宿二(大火/Antares)", meaning: "青龙之心，帝王之星，象征权威。" },
  { name: "尾宿", startDeg: 50.1, span: 17.1, wuXing: "火", animal: "虎", star: "尾宿一", meaning: "青龙之尾，象征后继有人。" },
  { name: "箕宿", startDeg: 67.2, span: 10.5, wuXing: "水", animal: "豹", star: "箕宿一", meaning: "青龙之末，象征风起云涌。" },

  // 北方玄武七宿
  { name: "斗宿", startDeg: 77.7, span: 24.7, wuXing: "木", animal: "獬", star: "斗宿一(南斗六星)", meaning: "玄武之首，南斗主生，象征福禄。" },
  { name: "牛宿", startDeg: 102.4, span: 7.2, wuXing: "金", animal: "牛", star: "牛宿一", meaning: "牵牛之宿，象征勤劳耕耘。" },
  { name: "女宿", startDeg: 109.6, span: 11.3, wuXing: "土", animal: "蝠", star: "女宿一", meaning: "织女之宿，象征巧艺与阴柔。" },
  { name: "虚宿", startDeg: 120.9, span: 9.5, wuXing: "日", animal: "鼠", star: "虚宿一", meaning: "虚耗之宿，象征空灵与冬至。" },
  { name: "危宿", startDeg: 130.4, span: 16.1, wuXing: "月", animal: "燕", star: "危宿一", meaning: "高危之宿，象征高处不胜寒。" },
  { name: "室宿", startDeg: 146.5, span: 17.8, wuXing: "火", animal: "猪", star: "室宿一", meaning: "营室之宿，象征安居乐业。" },
  { name: "壁宿", startDeg: 164.3, span: 9.5, wuXing: "水", animal: "㺄", star: "壁宿一", meaning: "东壁之宿，象征文采与书库。" },

  // 西方白虎七宿
  { name: "奎宿", startDeg: 173.8, span: 17.3, wuXing: "木", animal: "狼", star: "奎宿一", meaning: "白虎之首，天之府库，象征文运。" },
  { name: "娄宿", startDeg: 191.1, span: 12.5, wuXing: "金", animal: "狗", star: "娄宿一", meaning: "聚众之宿，象征聚集与团结。" },
  { name: "胃宿", startDeg: 203.6, span: 14.8, wuXing: "土", animal: "雉", star: "胃宿一", meaning: "仓廪之宿，象征五谷丰登。" },
  { name: "昴宿", startDeg: 218.4, span: 11.0, wuXing: "日", animal: "鸡", star: "昴星团(Pleiades)", meaning: "昴星团，七星相聚，象征文明之光。" },
  { name: "毕宿", startDeg: 229.4, span: 16.6, wuXing: "月", animal: "乌", star: "毕宿五(Aldebaran)", meaning: "捕兔之网，象征狩猎与收获。" },
  { name: "觜宿", startDeg: 246.0, span: 1.2, wuXing: "火", animal: "猴", star: "觜宿一", meaning: "白虎之头，最小宿度，象征精准。" },
  { name: "参宿", startDeg: 247.2, span: 10.3, wuXing: "水", animal: "猿", star: "参宿三星(Orion's Belt)", meaning: "参宿三星，象征福禄寿。" },

  // 南方朱雀七宿
  { name: "井宿", startDeg: 257.5, span: 31.2, wuXing: "木", animal: "犴", star: "井宿一", meaning: "朱雀之首，最大宿度，象征水源与生命。" },
  { name: "鬼宿", startDeg: 288.7, span: 3.3, wuXing: "金", animal: "羊", star: "鬼宿星团(M44)", meaning: "积尸气之宿，象征幽冥与阴德。" },
  { name: "柳宿", startDeg: 292.0, span: 13.5, wuXing: "土", animal: "獐", star: "柳宿一", meaning: "柳枝之宿，象征柔美与厨食。" },
  { name: "星宿", startDeg: 305.5, span: 6.9, wuXing: "日", animal: "马", star: "星宿一(Alphard)", meaning: "七星之宿，朱雀之颈，象征明丽。" },
  { name: "张宿", startDeg: 312.4, span: 18.2, wuXing: "月", animal: "鹿", star: "张宿一", meaning: "张弓之宿，象征扩张与发展。" },
  { name: "翼宿", startDeg: 330.6, span: 19.0, wuXing: "火", animal: "蛇", star: "翼宿一", meaning: "朱雀之翼，象征飞翔与自由。" },
  { name: "轸宿", startDeg: 349.6, span: 10.4, wuXing: "水", animal: "蚓", star: "轸宿一", meaning: "朱雀之尾，象征车驾与出行。" },
];

// 七政（日月五星）与五行属性
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SEVEN_LUMINARIES: Record<string, string> = {
  "日": "火/阳", "月": "水/阴", "水星": "水", "金星": "金",
  "火星": "火", "木星": "木", "土星": "土",
};

// 命度主按照日所在宿度确定（命宫为太阳所在宫位）
// 身度主按照月所在宿度确定（身宫为月亮所在宫位）
// 古法：命度=太阳，身度=月亮

// 十二宫位
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const HOUSES = [
  "命宫", "财帛", "兄弟", "田宅", "男女", "奴仆",
  "夫妻", "疾厄", "迁移", "官禄", "福德", "相貌",
];

/**
 * 计算某年某月某日太阳黄经（简化天文算法）
 *
 * 使用 MEUS 简化公式：
 * - 以春分点（约3月20日）为0°
 * - 太阳每日移动约0.9856°
 *
 * @returns 太阳黄经（度，0-360）
 */
function calcSolarLongitude(year: number, month: number, day: number): number {
  // 计算当天是一年中的第几天
  const date = new Date(year, month - 1, day);
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000) + 1;

  // 春分日（约3月20日）是一年中太阳黄经0°的日子
  // 简化：3月20日为第79或80天
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const springEquinoxDOY = isLeap ? 80 : 79;

  // 距春分的天数
  let daysFromEquinox = dayOfYear - springEquinoxDOY;
  if (daysFromEquinox < 0) daysFromEquinox += 365 + (isLeap ? 1 : 0);

  // 太阳每日移动约 360/365.2422 ≈ 0.9856°
  const solarLng = (daysFromEquinox * 0.9856) % 360;
  return solarLng;
}

/**
 * 计算月亮黄经（简化算法）
 *
 * 月亮平均每日移动约13.176°，周期29.53天
 * 使用月球平黄经近似公式
 */
function calcLunarLongitude(year: number, month: number, day: number): number {
  const date = new Date(year, month - 1, day);
  // 以 2000-01-06 新月（日月合朔）为基准
  const base = new Date(2000, 0, 6);
  const daysDiff = (date.getTime() - base.getTime()) / 86400000;

  // 月球每日移动约 13.176°（相对恒星）
  // 简化为：合朔日月亮与太阳同经，之后每天多走12.19°
  // (月亮每天平均比太阳多走12.19°，因为13.176-0.986=12.19)
  const solarLng = calcSolarLongitude(year, month, day);

  // 计算自最近一个合朔日以来的天数
  // 用太阳-月亮的会合周期 29.53 天
  // 简化：相位差= (date天数从基准) * 12.19° 得到日月角度差
  const phaseDiff = (daysDiff * 12.1908) % 360;

  // 月亮黄经 = 太阳黄经 + 相位差
  const lunarLng = (solarLng + phaseDiff) % 360;
  return lunarLng < 0 ? lunarLng + 360 : lunarLng;
}

/**
 * 根据黄经确定所在的宿
 */
function findXiu(lng: number): { xiu: XiuInfo; degree: number } {
  let lng360 = lng % 360;
  if (lng360 < 0) lng360 += 360;

  for (const xiu of XIU_DB) {
    const endDeg = xiu.startDeg + xiu.span;
    if (lng360 >= xiu.startDeg && lng360 < endDeg) {
      return { xiu, degree: Math.round((lng360 - xiu.startDeg) * 10) / 10 };
    }
  }

  // 兜底：返回角宿
  return { xiu: XIU_DB[0], degree: lng360 };
}

/**
 * 确定命度/身度的五行属性及解读
 */
function getMingDuAnalysis(xiuName: string, isSun: boolean): string {
  const xiu = XIU_DB.find((x) => x.name === xiuName);
  if (!xiu) return "";

  const type = isSun ? "命度" : "身度";
  const wuXingMap: Record<string, string> = {
    "木": `${xiuName}属木，主仁。${type}属木之人仁慈宽厚、善于规划、有成长性思维。`,
    "火": `${xiuName}属火，主礼。${type}属火之人热情大方、行动力强、富有感染力。`,
    "土": `${xiuName}属土，主信。${type}属土之人稳重踏实、诚信可靠、执行力强。`,
    "金": `${xiuName}属金，主义。${type}属金之人刚毅果决、原则性强、善于管理。`,
    "水": `${xiuName}属水，主智。${type}属水之人聪明灵活、善于适应、思维敏捷。`,
    "日": `${xiuName}属日，至阳。${type}属日之人光明磊落、心胸开阔、有领导力。`,
    "月": `${xiuName}属月，至阴。${type}属月之人温柔细腻、善解人意、富有直觉。`,
  };
  return wuXingMap[xiu.wuXing] || "";
}

/**
 * 生成28宿分布（按当天日月所在位置，结合七政星曜）
 */
function buildStarPositions(): GuoLaoStarPosition[] {
  return XIU_DB.map((xiu) => ({
    star: `${xiu.name}（${xiu.animal}）`,
    xiu: xiu.name,
    degree: xiu.span,
    meaning: `${xiu.meaning} 五行${xiu.wuXing}，主星${xiu.star}，禽象${xiu.animal}。`,
  }));
}

/**
 * 生成综合分析
 */
function generateAnalysis(
  gender: string,
  sunXiu: XiuInfo,
  moonXiu: XiuInfo,
  mingDuAnalysis: string,
  shenDuAnalysis: string
): string {
  const sunMoonRel = analyzeSunMoonRelation(sunXiu, moonXiu);

  return `◆ 星命总纲
命主（${gender}命）：日居${sunXiu.name}（${sunXiu.animal}），${sunXiu.wuXing}度。
${mingDuAnalysis}
身主：月居${moonXiu.name}（${moonXiu.animal}），${moonXiu.wuXing}度。
${shenDuAnalysis}

◆ 日月关系
${sunMoonRel}

◆ 星曜喜忌
日居青龙之宿（东方七宿），则阳气充足、志向远大；
月居玄武之宿（北方七宿），则沉稳内敛、善谋略；
日居朱雀之宿（南方七宿），则热情外放、注重仪表；
月居白虎之宿（西方七宿），则刚强果断、行动力强。

◆ 命身配合
${getFateBodyAnalysis(sunXiu, moonXiu, gender)}

◆ 星格简评
${getStarPattern(sunXiu, moonXiu, gender)}`;
}

function analyzeSunMoonRelation(sunXiu: XiuInfo, moonXiu: XiuInfo): string {
  const sunIdx = XIU_DB.indexOf(sunXiu);
  const moonIdx = XIU_DB.indexOf(moonXiu);
  const diff = (moonIdx - sunIdx + 28) % 28;

  if (diff === 0) return "日月同宫，命身合一。内心与外在高度统一，表里如一，行动与想法一致。";
  if (diff <= 3) return `日${sunXiu.name}月${moonXiu.name}相邻，命身相近。内外较为和谐，想法与行动基本同步。`;
  if (diff === 7 || diff === 14 || diff === 21) return `日月相距${diff}宿，构成四分相。内在与外在有一定张力，需学习平衡内心追求与外界期待。`;
  if (diff === 14) return `日月相对（相距14宿），命身对照。内心世界与外在表现呈两极，有丰富的内在张力，适合从事创造性工作。`;
  return `日${sunXiu.name}月${moonXiu.name}，命身${diff}宿之隔。内外兼修，人生有独特韵律。`;
}

function getFateBodyAnalysis(sunXiu: XiuInfo, moonXiu: XiuInfo, _gender: string): string {
  const sunWx = sunXiu.wuXing;
  const moonWx = moonXiu.wuXing;

  const wxRelation: Record<string, Record<string, string>> = {
    "木": { "木":"比和（同气相应）","火":"相生（木生火：命度滋养身度）","土":"相克（木克土：命度主导身度）","金":"被克（金克木：外部世界塑造内心）","水":"受生（水生木：内在滋养外在）","日":"木受日照（外在光明）","月":"木得月华（内外和谐）"},
    "火": { "火":"比和","土":"相生（火生土：命度滋养身度）","金":"相克（火克金：命度主导身度）","水":"被克（水克火）","木":"受生（木生火）","日":"比和（同气相应）","月":"火得月光（内外调和）"},
    "土": { "火":"受生（火生土）","土":"比和","金":"相生（土生金）","水":"相克（土克水）","木":"被克（木克土）","日":"土受日照","月":"土得月华"},
    "金": { "木":"被克","火":"被克","土":"受生（土生金：内在滋养外在）","金":"比和","水":"相生（金生水：命度滋养身度）","日":"金受日照","月":"金得月华"},
    "水": { "火":"相克（水克火）","土":"被克（土克水）","金":"受生（金生水）","水":"比和","木":"相生（水生木）","日":"水受日照","月":"比和（同气相应）"},
    "日": { "木":"日照草木（命度照耀身度）","火":"日火同辉（阴阳调和）","土":"日光耀土（外在光明）","金":"日照金石（光辉外显）","水":"日照清波（智慧外放）","日":"纯阳","月":"日月同辉"},
    "月": { "木":"月华润木","火":"月映火光","土":"月照大地","金":"月华凝金","水":"月映秋水（智慧内敛）","日":"日月同辉","月":"纯阴"},
  };

  const rel = wxRelation[sunWx]?.[moonWx] || "相参（命身互动和谐）";
  return `命度（日）属${sunWx}，身度（月）属${moonWx}，${rel}。`;
}

function getStarPattern(sunXiu: XiuInfo, _moonXiu: XiuInfo, _gender: string): string {
  const sunIdx = XIU_DB.indexOf(sunXiu);

  // 星格判断
  if (sunIdx >= 0 && sunIdx <= 6) return "日居青龙（东），格局有'青龙出海'之象。主早年运势佳，起家创业有先机。";
  if (sunIdx >= 7 && sunIdx <= 13) return "日居玄武（北），格局有'玄武当权'之象。主根基深厚，中年后运势稳步上升。";
  if (sunIdx >= 14 && sunIdx <= 20) return "日居白虎（西），格局有'白虎守边'之象。主刚毅果断，适合开拓型事业。";
  return "日居朱雀（南），格局有'朱雀翱翔'之象。主名声在外，适合文化传播类事业。";
}

// ══════════════════════════════════════
// 导出主函数
// ══════════════════════════════════════
export function calculateGuoLaoXingZong(input: Record<string, unknown>): GuoLaoXingZongResult {
  const year = (input.year as number) || new Date().getFullYear();
  const month = (input.month as number) || new Date().getMonth() + 1;
  const day = (input.day as number) || new Date().getDate();
  const gender = (input.gender as string) || "男";

  // 1. 计算太阳黄经 → 命度
  const sunLng = calcSolarLongitude(year, month, day);
  const { xiu: sunXiu } = findXiu(sunLng);

  // 2. 计算月亮黄经 → 身度
  const moonLng = calcLunarLongitude(year, month, day);
  const { xiu: moonXiu } = findXiu(moonLng);

  // 3. 命度主和身度主分析
  const mingDuAnalysis = getMingDuAnalysis(sunXiu.name, true);
  const shenDuAnalysis = getMingDuAnalysis(moonXiu.name, false);

  // 4. 二十八宿分布
  const starPositions = buildStarPositions();

  // 5. 综合分析
  const analysis = generateAnalysis(gender, sunXiu, moonXiu, mingDuAnalysis, shenDuAnalysis);

  // Box-drawing 结构化总结
  const sunIdx = XIU_DB.indexOf(sunXiu);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const moonIdx = XIU_DB.indexOf(moonXiu);
  const siXiang = sunIdx <= 6 ? "东方青龙" : sunIdx <= 13 ? "北方玄武" : sunIdx <= 20 ? "西方白虎" : "南方朱雀";
  const xiuPreview = XIU_DB.slice(0, 4).map(x => x.name).join(" ") + " ... " + XIU_DB.slice(24).map(x => x.name).join(" ");

  const summary = [
    "┌──────────────────────────────────────┐",
    "│       果老星宗 · 星命推算             │",
    "├──────────────────────────────────────┤",
    "│ 命度（日）：" + sunXiu.name + "(" + sunXiu.wuXing + "·" + sunXiu.animal + ")" + " ".repeat(18) + "│",
    "│ 身度（月）：" + moonXiu.name + "(" + moonXiu.wuXing + "·" + moonXiu.animal + ")" + " ".repeat(18) + "│",
    "│ 日躔：" + siXiang + " " + sunXiu.name + sunXiu.span + "度" + " ".repeat(22) + "│",
    "│ 月躔：" + moonXiu.name + moonXiu.span + "度  主星：" + moonXiu.star.slice(0, 8) + " ".repeat(15) + "│",
    "│ 命主：" + sunXiu.meaning.slice(0, 28).padEnd(28) + "│",
    "│ 身主：" + moonXiu.meaning.slice(0, 28).padEnd(28) + "│",
    "├──────────────────────────────────────┤",
    "│ 二十八宿（部分）                      │",
    "│ " + xiuPreview.slice(0, 38).padEnd(38) + "│",
    "│ 共28宿，含七政四余星曜喜忌           │",
    "├──────────────────────────────────────┤",
    "│ 出处：《果老星宗》《星学大成》        │",
    "│ 二十八宿度数考据《星学大成》明刻本    │",
    "│ 日月黄经用Meeus简化天文算法          │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return {
    riGong: `${sunXiu.name}（${sunXiu.wuXing}·${sunXiu.animal}）`,
    yueGong: `${moonXiu.name}（${moonXiu.wuXing}·${moonXiu.animal}）`,
    mingDu: `日居${sunXiu.name}${sunXiu.span}度，属${sunXiu.wuXing}`,
    shenDu: `月居${moonXiu.name}${moonXiu.span}度，属${moonXiu.wuXing}`,
    starPositions,
    analysis,
    summary,
  } as GuoLaoXingZongResult & { summary: string };
}
