// ── 达摩一掌经计算引擎 ──
// 算法溯源：唐·一行禅师《达摩一掌经》，十二宫配六道轮回体系
// 核心规则：计数走十二地支（非直接走六道），年上起月→月上起日→日上起时，男顺女逆
// 参考：知乎《自学一掌经测算详细方法》、360doc《达摩一掌经看命论命推命》

import { Solar } from "lunar-javascript";

const DAO_NAMES = ["佛道", "仙道", "人道", "阿修罗道", "鬼道", "畜生道"] as const;
export type LiuDao = typeof DAO_NAMES[number];
const SHI_CHEN = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 十二宫名（地支→宫名，源自一行禅师古本）
const GONG_MING: Record<string, string> = {
  "子": "天贵", "丑": "天厄", "寅": "天权", "卯": "天破",
  "辰": "天奸", "巳": "天文", "午": "天福", "未": "天驿",
  "申": "天孤", "酉": "天刃", "戌": "天艺", "亥": "天寿",
};

// 地支→六道索引（古本：子午=佛 丑未=鬼 寅申=人 卯酉=畜 辰戌=修罗 巳亥=仙）
const ZHI_TO_DAO: Record<string, number> = {
  "子": 0, "丑": 4, "寅": 2, "卯": 5, "辰": 3, "巳": 1,
  "午": 0, "未": 4, "申": 2, "酉": 5, "戌": 3, "亥": 1,
};

interface DaoDetail {
  name: LiuDao;
  gongName?: string;
  element: string;
  nature: string;
  desc: string;
}

interface YiZhangJingResult {
  input: { year: number; month: number; day: number; hour: number; gender: "男" | "女" };
  lunarInfo: { year: string; month: number; day: number; shiChen: string };
  yearDao: DaoDetail;
  monthDao: DaoDetail;
  dayDao: DaoDetail;
  hourDao: DaoDetail;
  finalDao: DaoDetail;
  combination: string;
  fortune: { career: string; wealth: string; love: string; health: string; personality: string };
  pastLife: { year: string; month: string; day: string; hour: string };
  summary: string;
}

const DAO_DETAILS: Record<LiuDao, { element: string; nature: string; desc: string }> = {
  "佛道": { element: "空", nature: "慈悲智慧", desc: "心性圆融，慧根深厚，一生得贵人扶助。" },
  "仙道": { element: "灵", nature: "清雅超脱", desc: "天资聪颖，心性高洁，适合文艺学术修行。" },
  "人道": { element: "和", nature: "中正平和", desc: "性情平和，人缘极好，一生安稳幸福。" },
  "阿修罗道": { element: "刚", nature: "刚强好胜", desc: "性格刚烈，争强好胜，事业心强但易生口舌。" },
  "鬼道": { element: "阴", nature: "敏感多疑", desc: "心思细腻，感知力强，一生多忧虑需修心。" },
  "畜生道": { element: "浊", nature: "朴实憨厚", desc: "性情朴实，重义轻利，一生劳碌但有福报。" },
};

const FORTUNE: Record<LiuDao, { career: string; wealth: string; love: string; health: string; personality: string }> = {
  "佛道": {
    career: "适合教育、文化、慈善、医疗等利他行业，成就非凡。",
    wealth: "财运稳健，不求自来，中晚年积累丰厚。",
    love: "姻缘和美，配偶贤良，家庭幸福。",
    health: "身体健康，心态平和寿命长。",
    personality: "慈悲为怀，智慧通达，包容心强，人缘极佳。",
  },
  "仙道": {
    career: "适合艺术、学术、创意、技术类工作，独树一帜。",
    wealth: "财运时好时淡，不执着于物质反而有意外之财。",
    love: "追求精神契合，晚婚为佳，伴侣需有内涵。",
    health: "体质偏清瘦，注意养生，少熬夜多静养。",
    personality: "超凡脱俗，思维独特，有艺术天赋，不随波逐流。",
  },
  "人道": {
    career: "各行各业均可发展，贵在坚持，中年后事业稳固。",
    wealth: "财运平稳，勤劳致富，不会大起大落。",
    love: "姻缘正常，婚姻稳定，夫妻互相扶持。",
    health: "身体中等，注意饮食规律和适度运动。",
    personality: "为人中正，不偏不倚，与人为善，处事圆滑。",
  },
  "阿修罗道": {
    career: "适合竞争性强的行业如商业、法律、体育，成就高但辛苦。",
    wealth: "财运起伏大，有大赚大赔之势，宜稳健理财。",
    love: "感情强烈，易有波折，需学会让步包容。",
    health: "肝火旺盛，注意情绪管理和心血管健康。",
    personality: "争强好胜，魄力十足，领导力强，但易得罪人。",
  },
  "鬼道": {
    career: "适合幕后工作如策划、研究、心理咨询，需避免高压环境。",
    wealth: "财运不稳，容易漏财，需谨慎理财。",
    love: "多愁善感，容易受伤，需找到情绪稳定的伴侣。",
    health: "体质偏弱，注意睡眠和心理健康，多晒太阳。",
    personality: "内心敏感，洞察力强，想象力丰富，但容易多虑。",
  },
  "畜生道": {
    career: "适合体力劳动或务实型工作，踏实肯干终有回报。",
    wealth: "财运靠勤劳积累，年轻辛苦中年后渐好。",
    love: "重情重义，对伴侣忠诚，婚姻稳固。",
    health: "体格强健，但容易过度劳累，注意休息。",
    personality: "朴实忠厚，勤劳踏实，不善言辞但行动力强。",
  },
};

// 按十二地支顺数（男）：从 startZhi 走 count 步，返回到达的地支
function shunZhi(startZhi: string, count: number): string {
  const startIdx = SHI_CHEN.indexOf(startZhi);
  const targetIdx = ((startIdx + count - 1) % 12 + 12) % 12;
  return SHI_CHEN[targetIdx];
}

// 按十二地支逆数（女）：从 startZhi 往回走 count 步，返回到达的地支
function niZhi(startZhi: string, count: number): string {
  const startIdx = SHI_CHEN.indexOf(startZhi);
  const targetIdx = ((startIdx - count + 1) % 12 + 12) % 12;
  return SHI_CHEN[targetIdx];
}

function daoFromZhi(zhi: string): number {
  return ZHI_TO_DAO[zhi] ?? 0;
}

function buildDaoDetail(idx: number, zhi?: string): DaoDetail {
  const name = DAO_NAMES[idx];
  const gongName = zhi ? GONG_MING[zhi] : undefined;
  return { name, gongName, ...DAO_DETAILS[name] };
}

function getShiChenIdx(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}

export function calculateYiZhangJing(input: Record<string, unknown>): YiZhangJingResult {
  const year = input.year as number;
  const month = input.month as number;
  const day = input.day as number;
  const hour = input.hour as number;
  const gender = (input.gender as "男" | "女") || "男";

  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();

  const yearZhi = lunar.getYearZhi();
  const lunarMonth = Math.abs(lunar.getMonth());
  const lunarDay = lunar.getDay();
  const shiChenIdx = getShiChenIdx(hour);
  const shiChen = SHI_CHEN[shiChenIdx];
  const shiChenNum = shiChenIdx + 1; // 时辰计数从1开始：子=1…亥=12

  const count = gender === "男" ? shunZhi : niZhi;

  // 年道：年支直接映射六道
  const yearDaoIdx = daoFromZhi(yearZhi);

  // 月道：从年支起顺/逆数月份，得地支→六道
  const monthZhi = count(yearZhi, lunarMonth);
  const monthDaoIdx = daoFromZhi(monthZhi);

  // 日道：从月支起顺/逆数日数，得地支→六道
  const dayZhi = count(monthZhi, lunarDay);
  const dayDaoIdx = daoFromZhi(dayZhi);

  // 时道：从日支起顺/逆数时辰数，得地支→六道
  const hourZhi = count(dayZhi, shiChenNum);
  const hourDaoIdx = daoFromZhi(hourZhi);

  const finalDao = buildDaoDetail(hourDaoIdx, hourZhi);
  const combination = `${DAO_NAMES[yearDaoIdx]}·${DAO_NAMES[monthDaoIdx]}·${DAO_NAMES[dayDaoIdx]}·${DAO_NAMES[hourDaoIdx]}`;

  return {
    input: { year, month, day, hour, gender },
    lunarInfo: {
      year: lunar.getYearInGanZhi(),
      month: lunarMonth,
      day: lunarDay,
      shiChen: `${shiChen}时`,
    },
    yearDao: buildDaoDetail(yearDaoIdx, yearZhi),
    monthDao: buildDaoDetail(monthDaoIdx, monthZhi),
    dayDao: buildDaoDetail(dayDaoIdx, dayZhi),
    hourDao: buildDaoDetail(hourDaoIdx, hourZhi),
    finalDao,
    combination,
    fortune: FORTUNE[finalDao.name],
    pastLife: {
      year: `前四世（祖业根基）`,
      month: `前三世（兄弟缘份）`,
      day: `前二世（夫妻因果）`,
      hour: `前一世（自身福报，影响最大）`,
    },
    summary: `命属${finalDao.name}(${finalDao.element})，${gender === "男" ? "顺数" : "逆数"}推演，落${hourZhi}(${GONG_MING[hourZhi]}宫)。${finalDao.desc}四柱六道：${combination}。`,
  };
}
