// ── 七政四余星盘计算引擎 ──
// 算法参考：《果老星宗》《星学大成》
import type { QiZhengSiYuResult, PlanetPosition } from "@guoxue/shared";

/**
 * 七政四余星盘
 *
 * 七政：日、月、水星、金星、火星、木星、土星
 * 四余：紫气、月孛、罗睺、计都（月球轨道的四个特殊点）
 *
 * 算法参考：《星学大成》《果老星宗》
 */

// 二十八宿（复用果老星宗中的宿度数据）
const XIU_LIST = [
  { name: "角宿", startDeg: 0, span: 12.8, wuXing: "木" },
  { name: "亢宿", startDeg: 12.8, span: 9.3, wuXing: "金" },
  { name: "氐宿", startDeg: 22.1, span: 16.4, wuXing: "土" },
  { name: "房宿", startDeg: 38.5, span: 5.3, wuXing: "火" },
  { name: "心宿", startDeg: 43.8, span: 6.3, wuXing: "火" },
  { name: "尾宿", startDeg: 50.1, span: 17.1, wuXing: "火" },
  { name: "箕宿", startDeg: 67.2, span: 10.5, wuXing: "水" },
  { name: "斗宿", startDeg: 77.7, span: 24.7, wuXing: "木" },
  { name: "牛宿", startDeg: 102.4, span: 7.2, wuXing: "金" },
  { name: "女宿", startDeg: 109.6, span: 11.3, wuXing: "土" },
  { name: "虚宿", startDeg: 120.9, span: 9.5, wuXing: "火" },
  { name: "危宿", startDeg: 130.4, span: 16.1, wuXing: "水" },
  { name: "室宿", startDeg: 146.5, span: 17.8, wuXing: "火" },
  { name: "壁宿", startDeg: 164.3, span: 9.5, wuXing: "水" },
  { name: "奎宿", startDeg: 173.8, span: 17.3, wuXing: "木" },
  { name: "娄宿", startDeg: 191.1, span: 12.5, wuXing: "金" },
  { name: "胃宿", startDeg: 203.6, span: 14.8, wuXing: "土" },
  { name: "昴宿", startDeg: 218.4, span: 11.0, wuXing: "火" },
  { name: "毕宿", startDeg: 229.4, span: 16.6, wuXing: "水" },
  { name: "觜宿", startDeg: 246.0, span: 1.2, wuXing: "火" },
  { name: "参宿", startDeg: 247.2, span: 10.3, wuXing: "水" },
  { name: "井宿", startDeg: 257.5, span: 31.2, wuXing: "木" },
  { name: "鬼宿", startDeg: 288.7, span: 3.3, wuXing: "金" },
  { name: "柳宿", startDeg: 292.0, span: 13.5, wuXing: "土" },
  { name: "星宿", startDeg: 305.5, span: 6.9, wuXing: "火" },
  { name: "张宿", startDeg: 312.4, span: 18.2, wuXing: "水" },
  { name: "翼宿", startDeg: 330.6, span: 19.0, wuXing: "火" },
  { name: "轸宿", startDeg: 349.6, span: 10.4, wuXing: "水" },
];

// 十二宫
const TWELVE_HOUSES = ["命宫","财帛","兄弟","田宅","男女","奴仆","夫妻","疾厄","迁移","官禄","福德","相貌"];

// 太阳黄经简化计算
function calcSolarLng(year: number, month: number, day: number): number {
  const date = new Date(year, month - 1, day);
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const equinoxDay = isLeap ? 80 : 79;
  let daysFromEquinox = dayOfYear - equinoxDay;
  if (daysFromEquinox < 0) daysFromEquinox += 365 + (isLeap ? 1 : 0);
  return (daysFromEquinox * 0.9856) % 360;
}

// 行星平黄经简化（相对于太阳的位置偏移量）
// 各行星的近似偏移率（每天度差）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PLANET_OFFSETS: Record<string, { rate: number; baseOffset: number }> = {
  "月亮": { rate: 12.1908, baseOffset: 0 },
  "水星": { rate: 0.385, baseOffset: 20 },
  "金星": { rate: 0.155, baseOffset: 45 },
  "火星": { rate: 0.524, baseOffset: 120 },
  "木星": { rate: 0.083, baseOffset: 200 },
  "土星": { rate: 0.034, baseOffset: 280 },
};

// 四余位置（基于月交点等）
// 罗睺：月球升交点，逆行约18.6年一周
// 计都：月球降交点，与罗睺相对
// 紫气：月球近地点，约8.85年一周
// 月孛：月球远地点，与紫气相对
function calcFourRemainders(solarLng: number, daysFromJ2000: number): PlanetPosition[] {
  // 罗睺（升交点）逆行，周期6793.5天
  const luoHouLng = (360 - (daysFromJ2000 * 360 / 6793.5) % 360 + 180) % 360;
  const jiDuLng = (luoHouLng + 180) % 360;

  // 紫气（近地点）周期3232天
  const ziQiLng = ((daysFromJ2000 * 360 / 3232) % 360 + 90) % 360;
  const yueBoLng = (ziQiLng + 180) % 360;

  return [
    buildRemainder("紫气", ziQiLng, "紫气为木之余气，主仁慈延长、学问深远。利文化教育/科研学术。"),
    buildRemainder("月孛", yueBoLng, "月孛为水之余气，主暗昧隐匿、内心波澜。利内省修行/隐秘事业。"),
    buildRemainder("罗睺", luoHouLng, "罗睺为火之余气，主急躁冲动、勇猛激进。利开拓创业/竞争取胜。"),
    buildRemainder("计都", jiDuLng, "计都为土之余气，主迟缓厚重、沉着冷静。利长期规划/基础建设。"),
  ];
}

function buildRemainder(name: string, lng: number, meaning: string): PlanetPosition {
  const { xiu, degree } = findXiu(lng);
  const house = TWELVE_HOUSES[Math.floor(lng / 30) % 12];
  return { planet: name, xiu: xiu.name, degree, house, meaning };
}

function findXiu(lng: number): { xiu: typeof XIU_LIST[0]; degree: number } {
  let lng360 = lng % 360;
  if (lng360 < 0) lng360 += 360;
  for (const x of XIU_LIST) {
    const end = x.startDeg + x.span;
    if (lng360 >= x.startDeg && lng360 < end) {
      return { xiu: x, degree: Math.round((lng360 - x.startDeg) * 10) / 10 };
    }
  }
  return { xiu: XIU_LIST[0], degree: lng360 };
}

function buildPlanetPos(planet: string, lng: number, meaning: string): PlanetPosition {
  const { xiu, degree } = findXiu(lng);
  const house = TWELVE_HOUSES[Math.floor(lng / 30) % 12];
  return { planet, xiu: xiu.name, degree, house, meaning };
}

// 七政庙旺落陷表（基于《果老星宗》）
// 每个行星在特定宿度上为庙（最旺）/旺（次旺）/落（陷）/陷（最弱）
interface DignityInfo { state: string; desc: string; }
function getPlanetDignity(planet: string, xiuName: string): DignityInfo {
  const dignityMap: Record<string, Record<string, DignityInfo>> = {
    "太阳": {
      "昴宿": { state: "庙", desc: "日居昴日鸡，光芒万丈，权威赫赫。利领导管理、从政仕途。" },
      "星宿": { state: "旺", desc: "日居星日马，正值中午，事业如日中天。" },
      "虚宿": { state: "陷", desc: "日落虚日鼠，鼠穴暗无天日，权威受阻。宜隐忍待机。" },
    },
    "月亮": {
      "危宿": { state: "庙", desc: "月居危月燕，燕巢安稳，情感满足。利家庭、女性事业。" },
      "张宿": { state: "旺", desc: "月居张月鹿，鹿跃光辉，情绪愉悦灵感充沛。" },
      "毕宿": { state: "陷", desc: "月落毕月乌，昏月不明，情绪波动。不宜感情重大决策。" },
    },
    "水星": {
      "箕宿": { state: "庙", desc: "水居箕水豹，豹得水则灵，思维敏捷口才出众。利学业考试。" },
      "翼宿": { state: "旺", desc: "水居翼火蛇，水火既济，才思如泉涌。" },
      "柳宿": { state: "陷", desc: "水土交战，思虑过多而优柔寡断。" },
    },
    "金星": {
      "亢宿": { state: "庙", desc: "金居亢金龙，金龙聚气，财运亨通。利求财、艺术创作。" },
      "牛宿": { state: "旺", desc: "金居牛金牛，金牛得位，财富积累稳健。" },
      "心宿": { state: "陷", desc: "金居心月狐，被火克制，财运起伏大。不宜大额投资。" },
    },
    "火星": {
      "尾宿": { state: "庙", desc: "火居尾火虎，虎得火助，行动力爆发。利竞争、开拓、运动。" },
      "觜宿": { state: "旺", desc: "火居觜火猴，火得风助，魄力十足。" },
      "井宿": { state: "陷", desc: "火居井木犴，木生火过旺，冲动易怒。宜冷静克制。" },
    },
    "木星": {
      "角宿": { state: "庙", desc: "木居角木蛟，蛟龙得水，事业扩张顺利。利教育、出版、慈善。" },
      "奎宿": { state: "旺", desc: "木居奎木狼，狼得木而安，广结善缘。" },
      "斗宿": { state: "陷", desc: "木居斗木獬，木气过散，计划难集中。宜收缩聚焦。" },
    },
    "土星": {
      "氐宿": { state: "庙", desc: "土居氐土貉，土得正位，根基扎实。利地产、农业、基础建设。" },
      "胃宿": { state: "旺", desc: "土居胃土雉，厚重安稳，积少成多。" },
      "昂宿": { state: "陷", desc: "土怯火旺之乡，根基不稳。不宜投资不动产。" },
    },
  };
  return dignityMap[planet]?.[xiuName] || { state: "平", desc: `${planet}居${xiuName}，中和平常，随大运流转而定吉凶。` };
}

// 检查行星之间是否形成关键相位（同宫为合，对冲为冲，三分位为拱）
function getAspects(planets: PlanetPosition[]): string[] {
  const aspects: string[] = [];
  // eslint-disable-next-line no-unused-labels
  pairs: for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const h1 = planets[i].house;
      const h2 = planets[j].house;
      if (h1 === h2) {
        aspects.push(`${planets[i].planet}与${planets[j].planet}同宫（${h1}），互为增强。`);
        continue;
      }
      const idx1 = TWELVE_HOUSES.indexOf(h1);
      const idx2 = TWELVE_HOUSES.indexOf(h2);
      const diff = Math.abs(idx1 - idx2);
      if (diff === 6) {
        aspects.push(`${planets[i].planet}与${planets[j].planet}对冲（${h1}↔${h2}），主冲突需调和。`);
      } else if (diff === 4 || diff === 8) {
        aspects.push(`${planets[i].planet}与${planets[j].planet}三合拱照（${h1}↔${h2}），和谐相助。`);
      }
    }
  }
  return aspects;
}

export function calculateQiZhengSiYu(input: Record<string, unknown>): QiZhengSiYuResult {
  const year = (input.year as number) || new Date().getFullYear();
  const month = (input.month as number) || new Date().getMonth() + 1;
  const day = (input.day as number) || new Date().getDate();
  const hour = (input.hour as number) || 12;

  // 太阳黄经
  const sunLng = calcSolarLng(year, month, day);

  // 从J2000.0起的天数
  const date = new Date(year, month - 1, day, hour);
  const j2000 = new Date(2000, 0, 1, 12);
  const daysFromJ2000 = (date.getTime() - j2000.getTime()) / 86400000;

  // 七政（每颗行星计算庙旺落陷并附加详细说明）
  const planetData = [
    { name: "太阳", lng: sunLng, meaning: "日为君，主光明磊落/权威领导。命主人生方向。" },
    { name: "月亮", lng: (sunLng + (daysFromJ2000 * 12.1908 % 360) + 360) % 360, meaning: "月为后，主情感内心/家庭母性。命主情绪感知。" },
    { name: "水星", lng: (sunLng + (daysFromJ2000 * 0.385 + 20) % 360 + 360) % 360, meaning: "水星主智，利思维/沟通/商业。智力聪慧与否在于此。" },
    { name: "金星", lng: (sunLng + (daysFromJ2000 * 0.155 + 45) % 360 + 360) % 360, meaning: "金星主义，利感情/审美/财富。感情美满与否看金星。" },
    { name: "火星", lng: (sunLng + (daysFromJ2000 * 0.524 + 120) % 360 + 360) % 360, meaning: "火星主勇，利竞争/开拓/行动。魄力勇气星。" },
    { name: "木星", lng: (sunLng + (daysFromJ2000 * 0.083 + 200) % 360 + 360) % 360, meaning: "木星主仁，利教育/慈善/扩张。吉星第一。" },
    { name: "土星", lng: (sunLng + (daysFromJ2000 * 0.034 + 280) % 360 + 360) % 360, meaning: "土星主信，利基础/农业/地产。沉稳厚重星。" },
  ];

  const sevenStars: PlanetPosition[] = planetData.map((p) => {
    const pos = buildPlanetPos(p.name, p.lng, p.meaning);
    const dig = getPlanetDignity(p.name, pos.xiu);
    return {
      ...pos,
      meaning: `${p.meaning} 【${dig.state}】${dig.desc}`,
    };
  });

  // 四余
  const fourRemainders = calcFourRemainders(sunLng, daysFromJ2000);

  // 命宫：太阳所在宫位
  const mingHouseIdx = Math.floor(sunLng / 30) % 12;
  const mingGong = TWELVE_HOUSES[mingHouseIdx];

  // 身宫：月亮所在宫位（《果老星宗》以身为后天之命）
  const moonLng = planetData[1].lng;
  const shenHouseIdx = Math.floor(moonLng / 30) % 12;
  const shenGong = TWELVE_HOUSES[shenHouseIdx];

  // 命度 = 太阳宿度
  const { xiu: sunXiu } = findXiu(sunLng);
  const { xiu: moonXiu } = findXiu(moonLng);

  // 十二宫分布
  const houses = TWELVE_HOUSES.map((h, i) => {
    const offset = (i - mingHouseIdx + 12) % 12;
    return `${h}（${TWELVE_HOUSES[offset]}方）`;
  });

  // 行星相位分析
  const aspects = getAspects(sevenStars);

  // 综合格局判断
  const dignityStates = sevenStars.map(s => {
    const m = s.meaning;
    if (m.includes("【庙】")) return "庙";
    if (m.includes("【旺】")) return "旺";
    if (m.includes("【陷】")) return "陷";
    return "平";
  });
  const miaoCount = dignityStates.filter(d => d === "庙" || d === "旺").length;
  const xianCount = dignityStates.filter(d => d === "陷").length;

  let patternJudgment = "";
  if (miaoCount >= 4) {
    patternJudgment = "群星聚旺，格局宏大。命主天资卓越，若后天行运配合得当，可成大器。然须防骄矜之气。";
  } else if (xianCount >= 4) {
    patternJudgment = "群星落陷，格局多艰。命主一生多磨砺，但逆境中成长往往更为深刻。宜守不宜攻，稳扎稳打。";
  } else if (mingGong === shenGong) {
    patternJudgment = "命身同宫，表里如一。内外一致，为人真诚直率。吉则内外皆美，凶则表里俱困。";
  } else {
    patternJudgment = `庙旺${miaoCount}星·落陷${xianCount}星。格局有起伏，需结合大运流年详判。`;
  }

  // 分析文本
  const analysis = `七政四余星盘
命宫：${mingGong} | 命度：${sunXiu.name}（${sunXiu.wuXing}度）
身宫：${shenGong} | 身度：${moonXiu.name}（${moonXiu.wuXing}度）
日居${sevenStars[0].xiu}，月居${sevenStars[1].xiu}。
【格局】${patternJudgment}
【相位】${aspects.length > 0 ? aspects.slice(0, 5).join("；") : "无特殊紧张相位，星盘平静。大运流年可激活。"}
七政分布${new Set(sevenStars.map(s => s.xiu)).size}宿，四余辅助星盘完成。庙旺落陷和各行星度主关系为判断富贵贫贱的核心依据，详见各行星【】标注。`;

  const summary = [
    "┌─ 七政四余星盘 ─────────────────────┐",
    `│ 命宫：${mingGong}  命度：${sunXiu.name}（${sunXiu.wuXing}）`.padEnd(36) + "│",
    `│ 身宫：${shenGong}  身度：${moonXiu.name}（${moonXiu.wuXing}）`.padEnd(36) + "│",
    "├─ 七政 ─────────────────────────────┤",
    ...sevenStars.slice(0, 7).map(s => `│ ${s.planet}：${s.xiu}（${s.house}宫）`.padEnd(36) + "│"),
    "├─ 四余 ─────────────────────────────┤",
    ...fourRemainders.map(r => `│ ${r.planet}：${r.xiu}（${r.house}宫）`.padEnd(36) + "│"),
    `│ 七政分布${new Set(sevenStars.map(s => s.xiu)).size}宿`.padEnd(36) + "│",
    "├─ 出处 ─────────────────────────────┤",
    "│ 《果老星宗》《星学大成》            │",
    "└────────────────────────────────────┘",
  ].join("\n");

  return {
    mingGong,
    mingDu: `${sunXiu.name}${sunXiu.span}度·${sunXiu.wuXing}`,
    sevenStars,
    fourRemainders,
    houses,
    analysis,
    summary,
  } as QiZhengSiYuResult & { summary: string };
}
