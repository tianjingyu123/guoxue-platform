// ── 神煞大全计算引擎（180+ 神煞，14分类） ──
// 算法参考：《渊海子平》《三命通会》《星平会海》
// 基于《渊海子平》《三命通会》《协纪辨方书》等典籍

import { GAN as GAN_RAW, ZHI as ZHI_RAW } from "@guoxue/bazi-engine";

// 将 typed 数组转为 string[] 避免类型冲突
const GAN: string[] = GAN_RAW as unknown as string[];
const ZHI: string[] = ZHI_RAW as unknown as string[];

// ==================== 本地类型定义 ====================

interface ShenShaItem {
  name: string;
  type: "吉" | "凶" | "中性";
  applicable: boolean;
  location?: string;
  meaning: string;
  detail: string;
}

interface ShenShaCategory {
  name: string;
  items: ShenShaItem[];
}

interface ShenShaDaQuanResult {
  summary: { total: number; jiCount: number; xiongCount: number };
  categories: ShenShaCategory[];
}

interface ShenShaDaQuanInput {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  gender?: "男" | "女";
}

// ==================== 辅助函数 ====================

/** 四柱信息 */
interface PillarInfo {
  key: string;
  gan: string;
  zhi: string;
}

/** 从干支字符串中提取天干地支 */
function parsePillars(input: ShenShaDaQuanInput): PillarInfo[] {
  const raw = [
    { key: "年柱", ganZhi: input.yearPillar },
    { key: "月柱", ganZhi: input.monthPillar },
    { key: "日柱", ganZhi: input.dayPillar },
    { key: "时柱", ganZhi: input.hourPillar },
  ];
  return raw.map(p => ({
    key: p.key,
    gan: p.ganZhi[0] ?? "甲",
    zhi: p.ganZhi[1] ?? "子",
  }));
}

/** 在四柱中查找匹配的地支 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findInPillarsByZhi(
  pillars: PillarInfo[],
  targets: string[],
): PillarInfo | null {
  for (const p of pillars) {
    if (targets.includes(p.zhi)) return p;
  }
  return null;
}

/** 在四柱中查找匹配的天干 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findInPillarsByGan(
  pillars: PillarInfo[],
  targets: string[],
): PillarInfo | null {
  for (const p of pillars) {
    if (targets.includes(p.gan)) return p;
  }
  return null;
}

/** 获取所有匹配某条件的神煞项 */
function collectMatches(
  pillars: PillarInfo[],
  condition: (p: PillarInfo) => boolean,
  name: string,
  type: "吉" | "凶" | "中性",
  meaning: string,
  detail: string,
): ShenShaItem[] {
  const results: ShenShaItem[] = [];
  for (const p of pillars) {
    if (condition(p)) {
      results.push({ name, type, applicable: true, location: p.key, meaning, detail });
    }
  }
  return results;
}

/** 创建单个神煞项（非柱定位） */
function makeItem(
  name: string, type: "吉" | "凶" | "中性",
  applicable: boolean, location: string | undefined,
  meaning: string, detail: string,
): ShenShaItem {
  return { name, type, applicable, location, meaning, detail };
}

// ==================== 1. 吉神（30+） ====================

// 天乙贵人（日干查地支）
const TIAN_YI_GUI_REN: Record<string, string[]> = {
  "甲": ["丑", "未"], "乙": ["子", "申"], "丙": ["亥", "酉"], "丁": ["亥", "酉"],
  "戊": ["丑", "未"], "己": ["子", "申"], "庚": ["午", "寅"], "辛": ["午", "寅"],
  "壬": ["巳", "卯"], "癸": ["巳", "卯"],
};

// 太极贵人（日干查地支）
const TAI_JI_GUI_REN: Record<string, string[]> = {
  "甲": ["子", "午"], "乙": ["子", "午"], "丙": ["卯", "酉"], "丁": ["卯", "酉"],
  "戊": ["辰", "戌", "丑", "未"], "己": ["辰", "戌", "丑", "未"],
  "庚": ["寅", "亥"], "辛": ["寅", "亥"], "壬": ["巳", "申"], "癸": ["巳", "申"],
};

// 天德贵人（月支查天干）
const TIAN_DE_GUI_REN: Record<string, string> = {
  "寅": "丁", "卯": "申", "辰": "壬", "巳": "辛",
  "午": "亥", "未": "甲", "申": "癸", "酉": "寅",
  "戌": "丙", "亥": "乙", "子": "巳", "丑": "庚",
};

// 天德合（月支查天干）
const TIAN_DE_HE: Record<string, string> = {
  "寅": "壬", "卯": "巳", "辰": "丁", "巳": "丙",
  "午": "寅", "未": "己", "申": "戊", "酉": "亥",
  "戌": "辛", "亥": "庚", "子": "甲", "丑": "乙",
};

// 月德贵人（月支查天干）
const YUE_DE_GUI_REN: Record<string, string> = {
  "寅": "丙", "卯": "甲", "辰": "壬", "巳": "庚",
  "午": "丙", "未": "甲", "申": "壬", "酉": "庚",
  "戌": "丙", "亥": "甲", "子": "壬", "丑": "庚",
};

// 月德合（月支查天干）
const YUE_DE_HE: Record<string, string> = {
  "寅": "辛", "卯": "己", "辰": "丁", "巳": "乙",
  "午": "辛", "未": "己", "申": "丁", "酉": "乙",
  "戌": "辛", "亥": "己", "子": "丁", "丑": "乙",
};

// 文昌贵人（日干查地支）
const WEN_CHANG: Record<string, string> = {
  "甲": "巳", "乙": "午", "丙": "申", "丁": "酉", "戊": "申",
  "己": "酉", "庚": "亥", "辛": "子", "壬": "寅", "癸": "卯",
};

// 学堂（日干查地支）
const XUE_TANG: Record<string, string> = {
  "甲": "亥", "乙": "午", "丙": "寅", "丁": "酉", "戊": "寅",
  "己": "酉", "庚": "巳", "辛": "子", "壬": "申", "癸": "卯",
};

// 福星贵人（日干查地支）
const FU_XING_GUI_REN: Record<string, string> = {
  "甲": "丑", "乙": "巳", "丙": "寅", "丁": "未", "戊": "巳",
  "己": "未", "庚": "申", "辛": "酉", "壬": "丑", "癸": "卯",
};

// 禄神/十干禄（日干查地支）
const LU_SHEN: Record<string, string> = {
  "甲": "寅", "乙": "卯", "丙": "巳", "丁": "午", "戊": "巳",
  "己": "午", "庚": "申", "辛": "酉", "壬": "亥", "癸": "子",
};

// 金舆（日干查地支）
const JIN_YU: Record<string, string> = {
  "甲": "辰", "乙": "巳", "丙": "未", "丁": "申", "戊": "未",
  "己": "申", "庚": "戌", "辛": "亥", "壬": "丑", "癸": "寅",
};

// 国印贵人（日干查地支）
const GUO_YIN: Record<string, string> = {
  "甲": "戌", "乙": "亥", "丙": "丑", "丁": "寅", "戊": "丑",
  "己": "寅", "庚": "辰", "辛": "巳", "壬": "未", "癸": "申",
};

// 天厨贵人（日干查地支）
const TIAN_CHU: Record<string, string> = {
  "甲": "巳", "乙": "午", "丙": "子", "丁": "巳", "戊": "午",
  "己": "申", "庚": "寅", "辛": "午", "壬": "酉", "癸": "亥",
};

// 天官贵人（日干查地支）
const TIAN_GUAN: Record<string, string> = {
  "甲": "未", "乙": "辰", "丙": "巳", "丁": "酉", "戊": "戌",
  "己": "卯", "庚": "亥", "辛": "酉", "壬": "亥", "癸": "卯",
};

// 德合贵人（暗合贵人）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DE_HE: Record<string, string[]> = {
  "甲": ["己"], "乙": ["庚"], "丙": ["辛"], "丁": ["壬"], "戊": ["癸"],
  "己": ["甲"], "庚": ["乙"], "辛": ["丙"], "壬": ["丁"], "癸": ["戊"],
};

// 将星（日支按三合局查）
const JIANG_XING: Record<string, string> = {
  "申": "子", "子": "子", "辰": "子",
  "亥": "卯", "卯": "卯", "未": "卯",
  "寅": "午", "午": "午", "戌": "午",
  "巳": "酉", "酉": "酉", "丑": "酉",
};

// 华盖（日支按三合局查）
const HUA_GAI: Record<string, string> = {
  "申": "辰", "子": "辰", "辰": "辰",
  "亥": "未", "卯": "未", "未": "未",
  "寅": "戌", "午": "戌", "戌": "戌",
  "巳": "丑", "酉": "丑", "丑": "丑",
};

// 词馆（学堂的对冲位）
function getCiGuan(riGan: string): string {
  const xt = XUE_TANG[riGan];
  if (!xt) return "";
  return ZHI[(ZHI.indexOf(xt) + 6) % 12];
}

// 红鸾（日支查）
const HONG_LUAN: Record<string, string> = {
  "子": "卯", "丑": "寅", "寅": "丑", "卯": "子",
  "辰": "亥", "巳": "戌", "午": "酉", "未": "申",
  "申": "未", "酉": "午", "戌": "巳", "亥": "辰",
};

// 天喜（红鸾对冲）
function getTianXi(zhi: string): string {
  const idx = ZHI.indexOf(HONG_LUAN[zhi]);
  return ZHI[(idx + 6) % 12];
}

// 魁罡日
function isKuiGang(gan: string, zhi: string): boolean {
  return ["庚辰", "庚戌", "壬辰", "戊戌"].includes(gan + zhi);
}

// 三奇贵人
function checkSanQi(nianGan: string, yueGan: string, riGan: string): string | null {
  const gans = [nianGan, yueGan, riGan].join("");
  if (gans.includes("甲") && gans.includes("戊") && gans.includes("庚")) return "天上三奇";
  if (gans.includes("壬") && gans.includes("癸") && gans.includes("辛")) return "人中三奇";
  if (gans.includes("乙") && gans.includes("丙") && gans.includes("丁")) return "地下三奇";
  return null;
}

// 天赦日
function isTianShe(riGan: string, riZhi: string, yueZhi: string): boolean {
  const season: Record<string, string> = {
    "寅": "春", "卯": "春", "辰": "春",
    "巳": "夏", "午": "夏", "未": "夏",
    "申": "秋", "酉": "秋", "戌": "秋",
    "亥": "冬", "子": "冬", "丑": "冬",
  };
  const s = season[yueZhi];
  const she = riGan + riZhi;
  if (s === "春" && she === "戊寅") return true;
  if (s === "夏" && she === "甲午") return true;
  if (s === "秋" && she === "戊申") return true;
  if (s === "冬" && she === "甲子") return true;
  return false;
}

// 日德
const RI_DE = new Set(["甲寅", "丙辰", "戊辰", "庚辰", "壬戌"]);

// 日贵
const RI_GUI = new Set(["丁酉", "丁亥", "癸巳", "癸卯"]);

// 十灵日
const SHI_LING_RI = new Set(["甲辰", "乙亥", "丙辰", "丁酉", "戊午", "庚午", "庚戌", "辛亥", "壬寅", "癸未"]);

// 六秀日
const LIU_XIU = new Set(["丙子", "丁丑", "戊子", "戊午", "己丑", "己未", "壬午", "癸未"]);

// 进神
const JIN_SHEN = new Set(["甲子", "甲午", "己卯", "己酉"]);

// 金神日（纳音为金）
const JIN_SHEN_NA_YIN: Record<string, boolean> = {
  "甲子": true, "乙丑": true, "壬申": true, "癸酉": true,
  "庚辰": true, "辛巳": true, "甲午": true, "乙未": true,
  "壬寅": true, "癸卯": true, "庚戌": true, "辛亥": true,
};

// 福德
const FU_DE: Record<string, string> = {
  "甲": "寅", "乙": "卯", "丙": "午", "丁": "巳", "戊": "午",
  "己": "巳", "庚": "申", "辛": "酉", "壬": "亥", "癸": "子",
};

// 科名星
const KE_MING: Record<string, string[]> = {
  "甲": ["寅", "申"], "乙": ["卯", "酉"], "丙": ["巳", "亥"],
  "丁": ["午", "子"], "戊": ["寅", "申"], "己": ["卯", "酉"],
  "庚": ["巳", "亥"], "辛": ["午", "子"], "壬": ["辰", "戌"], "癸": ["丑", "未"],
};

// ==================== 2. 凶煞（30+） ====================

// 羊刃（日干查）
const YANG_REN: Record<string, string> = {
  "甲": "卯", "乙": "寅", "丙": "午", "丁": "巳", "戊": "午",
  "己": "巳", "庚": "酉", "辛": "申", "壬": "子", "癸": "亥",
};

// 劫煞（日支按三合局查）
const JIE_SHA: Record<string, string> = {
  "申": "巳", "子": "巳", "辰": "巳",
  "亥": "申", "卯": "申", "未": "申",
  "寅": "亥", "午": "亥", "戌": "亥",
  "巳": "寅", "酉": "寅", "丑": "寅",
};

// 灾煞（日支按三合局查）
const ZAI_SHA: Record<string, string> = {
  "申": "午", "子": "午", "辰": "午",
  "亥": "酉", "卯": "酉", "未": "酉",
  "寅": "子", "午": "子", "戌": "子",
  "巳": "卯", "酉": "卯", "丑": "卯",
};

// 孤辰（年支按三会局查）
const GU_CHEN: Record<string, string> = {
  "亥": "寅", "子": "寅", "丑": "寅",
  "寅": "巳", "卯": "巳", "辰": "巳",
  "巳": "申", "午": "申", "未": "申",
  "申": "亥", "酉": "亥", "戌": "亥",
};

// 寡宿（年支按三会局查）
const GUA_SU: Record<string, string> = {
  "亥": "丑", "子": "丑", "丑": "丑",
  "寅": "辰", "卯": "辰", "辰": "辰",
  "巳": "未", "午": "未", "未": "未",
  "申": "戌", "酉": "戌", "戌": "戌",
};

// 亡神（日支按三合局查）
const WANG_SHEN: Record<string, string> = {
  "申": "亥", "子": "亥", "辰": "亥",
  "亥": "寅", "卯": "寅", "未": "寅",
  "寅": "巳", "午": "巳", "戌": "巳",
  "巳": "申", "酉": "申", "丑": "申",
};

// 元辰/大耗（年支查）
const YUAN_CHEN: Record<string, string> = {
  "子": "未", "丑": "午", "寅": "酉", "卯": "申",
  "辰": "亥", "巳": "戌", "午": "丑", "未": "子",
  "申": "卯", "酉": "寅", "戌": "巳", "亥": "辰",
};

// 勾绞（日支查）
const GOU_JIAO: Record<string, string[]> = {
  "子": ["卯", "酉"], "丑": ["辰", "戌"], "寅": ["巳", "亥"],
  "卯": ["午", "子"], "辰": ["未", "丑"], "巳": ["申", "寅"],
  "午": ["酉", "卯"], "未": ["戌", "辰"], "申": ["亥", "巳"],
  "酉": ["子", "午"], "戌": ["丑", "未"], "亥": ["寅", "申"],
};

// 丧门（年支查，岁前二辰）
function getSangMen(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 2) % 12]; }

// 吊客（年支查，岁后二辰）
function getDiaoKe(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 10) % 12]; }

// 病符（年支查，岁后一辰）
function getBingFu(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 11) % 12]; }

// 死符（年支查，岁后五辰）
function getSiFu(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 7) % 12]; }

// 岁破（年支对冲）
function getSuiPo(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 6) % 12]; }

// 小耗（年支查）
function getXiaoHao(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 5) % 12]; }

// 大耗（年支查）
function getDaHao(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 8) % 12]; }

// 白虎（年支查，岁后四辰）
function getBaiHu(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 8) % 12]; }

// 天狗（年支查）
function getTianGou(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 5) % 12]; }

// 卷舌（年支查）
function getJuanShe(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 3) % 12]; }

// 血刃（月支查）
const XUE_REN: Record<string, string> = {
  "寅": "丑", "卯": "未", "辰": "寅", "巳": "申",
  "午": "卯", "未": "酉", "申": "辰", "酉": "戌",
  "戌": "巳", "亥": "亥", "子": "午", "丑": "子",
};

// 天罗（命带戌亥）
function isTianLuo(zhi: string): boolean { return zhi === "戌" || zhi === "亥"; }

// 地网（命带辰巳）
function isDiWang(zhi: string): boolean { return zhi === "辰" || zhi === "巳"; }

// 流霞（日干查）
const LIU_XIA: Record<string, string> = {
  "甲": "酉", "乙": "戌", "丙": "未", "丁": "申", "戊": "巳",
  "己": "午", "庚": "辰", "辛": "卯", "壬": "亥", "癸": "寅",
};

// 六厄（日支按三合局查）
const LIU_E: Record<string, string> = {
  "申": "卯", "子": "卯", "辰": "卯",
  "亥": "午", "卯": "午", "未": "午",
  "寅": "酉", "午": "酉", "戌": "酉",
  "巳": "子", "酉": "子", "丑": "子",
};

// 破碎（日支按三合局查）
const PO_SUI: Record<string, string> = {
  "申": "巳", "子": "酉", "辰": "丑",
  "亥": "寅", "卯": "午", "未": "戌",
  "寅": "亥", "午": "卯", "戌": "未",
  "巳": "申", "酉": "子", "丑": "辰",
};

// 天雄（月支查，地雌对冲）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TIAN_XIONG_MAP: Record<string, string> = {
  "子": "酉", "丑": "午", "寅": "亥", "卯": "午",
  "辰": "丑", "巳": "酉", "午": "卯", "未": "子",
  "申": "未", "酉": "子", "戌": "巳", "亥": "卯",
};

// 月厌（月支查）
const YUE_YAN: Record<string, string> = {
  "子": "申", "丑": "未", "寅": "午", "卯": "巳",
  "辰": "辰", "巳": "卯", "午": "寅", "未": "丑",
  "申": "子", "酉": "亥", "戌": "戌", "亥": "酉",
};

// 五鬼（月支查）
const WU_GUI: Record<string, string> = {
  "子": "辰", "丑": "巳", "寅": "午", "卯": "未",
  "辰": "申", "巳": "酉", "午": "戌", "未": "亥",
  "申": "子", "酉": "丑", "戌": "寅", "亥": "卯",
};

// 血支（月支查）
const XUE_ZHI: Record<string, string> = {
  "寅": "子", "卯": "卯", "辰": "午", "巳": "酉",
  "午": "子", "未": "卯", "申": "午", "酉": "酉",
  "戌": "子", "亥": "卯", "子": "午", "丑": "酉",
};

// 天哭（年支查）
function getTianKu(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 9) % 12]; }

// 天虚（年支对冲）
function getTianXu(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 6) % 12]; }

// 官符（年支查）
function getGuanFu(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 4) % 12]; }

// ==================== 3. 桃花类 ====================

// 桃花/咸池（日支按三合局查）
const TAO_HUA: Record<string, string> = {
  "申": "酉", "子": "酉", "辰": "酉",
  "亥": "子", "卯": "子", "未": "子",
  "寅": "卯", "午": "卯", "戌": "卯",
  "巳": "午", "酉": "午", "丑": "午",
};

// 红艳煞（日干查）
const HONG_YAN: Record<string, string> = {
  "甲": "午", "乙": "午", "丙": "寅", "丁": "未", "戊": "辰",
  "己": "辰", "庚": "戌", "辛": "酉", "壬": "子", "癸": "申",
};

// 墙内桃花 vs 墙外桃花判断
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isQiangNeiTaoHua(_riZhi: string, _taoHuaZhi: string): boolean {
  // 墙内桃花：桃花在年柱或日柱
  return false; // 由调用方根据location判断
}

// ==================== 4. 驿马类 ====================

// 驿马（日支按三合局查）
const YI_MA: Record<string, string> = {
  "申": "寅", "子": "寅", "辰": "寅",
  "亥": "巳", "卯": "巳", "未": "巳",
  "寅": "申", "午": "申", "戌": "申",
  "巳": "亥", "酉": "亥", "丑": "亥",
};

// 天马（月支查）
const TIAN_MA: Record<string, string> = {
  "寅": "申", "卯": "巳", "辰": "寅", "巳": "亥",
  "午": "申", "未": "巳", "申": "寅", "酉": "亥",
  "戌": "申", "亥": "巳", "子": "寅", "丑": "亥",
};

// 攀鞍（驿马前一位）
function getPanAn(nianZhi: string): string {
  const ma = YI_MA[nianZhi] || "寅";
  return ZHI[(ZHI.indexOf(ma) + 11) % 12];
}

// ==================== 5. 贵人变体 ====================

// 本类复用第1类的文昌、学堂、天乙、太极等，取变体

// ==================== 6. 空亡类 ====================

// 旬空（日柱旬空）
const XUN_KONG: Record<string, string[]> = {
  "甲子": ["戌", "亥"], "甲戌": ["申", "酉"], "甲申": ["午", "未"],
  "甲午": ["辰", "巳"], "甲辰": ["寅", "卯"], "甲寅": ["子", "丑"],
};

// 截路空亡（日干查时支）
const JIE_LU_KONG: Record<string, string[]> = {
  "甲": ["申", "酉"], "己": ["申", "酉"],
  "乙": ["午", "未"], "庚": ["午", "未"],
  "丙": ["辰", "巳"], "辛": ["辰", "巳"],
  "丁": ["寅", "卯"], "壬": ["寅", "卯"],
  "戊": ["子", "丑"], "癸": ["子", "丑"],
};

/** 获取日柱的旬空地支 */
function getXunKong(ganZhi: string): string[] {
  const gan = ganZhi[0] || "甲";
  const zhi = ganZhi[1] || "子";
  const ganIdx = GAN.indexOf(gan);
  const zhiIdx = ZHI.indexOf(zhi);
  const offset = (zhiIdx - ganIdx % 12 + 12) % 12;
  const xunStart = ZHI[(zhiIdx - offset + 12) % 12];
  for (const [key, val] of Object.entries(XUN_KONG)) {
    if (key[0] === gan && key[1] === xunStart) return val;
  }
  // 兜底计算
  const xunGan = GAN[Math.floor(ganIdx / 2) * 2] || "甲";
  const xunZhi = ZHI[Math.floor(ZHI.indexOf(zhi) / 6) * 6] || "子";
  return XUN_KONG[xunGan + xunZhi] || ["戌", "亥"];
}

// 四大空亡（纳音五行）
const SI_DA_KONG: Record<string, string> = {
  "甲子": "甲子旬中无水", "甲午": "甲午旬中无火",
};

// ==================== 7. 流年神煞 ====================

// 太岁（年支本身）
// 太阳（年支查）
function getTaiYang(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 1) % 12]; }

// 太阴（岁后三辰）
function getTaiYin(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 10) % 12]; }

// ==================== 8-14 类别通过综合检查覆盖 ====================

// 四废（月支查日柱）
function isSiFei(riGanZhi: string, yueZhi: string): boolean {
  const season: Record<string, string> = {
    "寅": "春", "卯": "春", "辰": "春",
    "巳": "夏", "午": "夏", "未": "夏",
    "申": "秋", "酉": "秋", "戌": "秋",
    "亥": "冬", "子": "冬", "丑": "冬",
  };
  const s = season[yueZhi];
  if (s === "春" && ["庚申", "辛酉"].includes(riGanZhi)) return true;
  if (s === "夏" && ["壬子", "癸亥"].includes(riGanZhi)) return true;
  if (s === "秋" && ["甲寅", "乙卯"].includes(riGanZhi)) return true;
  if (s === "冬" && ["丙午", "丁巳"].includes(riGanZhi)) return true;
  return false;
}

// 十恶大败日
const SHI_E_DA_BAI = new Set([
  "甲辰", "乙巳", "丙申", "丁亥", "戊戌",
  "己丑", "庚辰", "辛巳", "壬申", "癸亥",
]);

// 孤鸾日
const GU_LUAN = new Set(["甲寅", "乙卯", "丙午", "丁巳", "戊午", "戊辰", "己巳", "庚申", "辛亥", "壬子"]);

// 阴差阳错
const YIN_CUO = new Set(["庚戌", "辛酉", "庚申", "丁未", "丁巳", "己卯", "己丑"]);
const YANG_CHA = new Set(["丙子", "丙午", "丁丑", "丁未", "戊寅", "戊申", "壬辰", "壬戌"]);

// 八专日
const BA_ZHUAN = new Set(["甲寅", "乙卯", "丁未", "己未", "庚申", "辛酉", "癸丑", "戊戌"]);

// 九丑日
const JIU_CHOU = new Set(["戊子", "戊午", "壬子", "壬午", "丁酉", "己酉", "辛酉", "丁卯", "己卯", "辛卯"]);

// 禄马交驰检查：禄神和驿马同时出现
function checkLuMaJiaoChi(riGan: string, riZhi: string, _riGanZhi: string): boolean {
  // 禄马同乡：日柱本身为禄马同一地支
  const lu = LU_SHEN[riGan];
  const ma = YI_MA[riZhi];
  return lu === ma;
}

// 禄马同乡检查
function checkLuMaTongXiang(riGanZhi: string): boolean {
  // 特定日柱：壬子、癸亥、庚申、辛酉等
  return ["壬子", "癸亥", "庚申", "辛酉"].includes(riGanZhi);
}

// 截路煞
function isJieLuSha(riGan: string, shiZhi: string): boolean {
  const map: Record<string, string> = {
    "甲": "申", "己": "申", "乙": "酉", "庚": "酉",
    "丙": "子", "辛": "子", "丁": "亥", "壬": "亥",
    "戊": "寅", "癸": "卯",
  };
  return map[riGan] === shiZhi;
}

// 埋儿煞检查
function getMaiEr(shiZhi: string, yueZhi: string): boolean {
  const map: Record<string, string[]> = {
    "子": ["卯", "酉"], "卯": ["子", "酉"],
    "午": ["卯", "酉"], "酉": ["子", "午"],
  };
  const forbidden = map[yueZhi];
  return forbidden ? forbidden.includes(shiZhi) : false;
}

// 短寿煞
function isDuanShou(riGan: string, riZhi: string): boolean {
  const map: Record<string, string> = {
    "甲": "午", "乙": "巳", "丙": "辰", "丁": "卯", "戊": "申",
    "己": "酉", "庚": "寅", "辛": "丑", "壬": "子", "癸": "亥",
  };
  return map[riGan] === riZhi;
}

// 暗金煞
const AN_JIN: Record<string, string[]> = {
  "子": ["巳", "酉", "丑"], "丑": ["巳", "酉", "丑"], "寅": ["亥", "卯", "未"],
  "卯": ["亥", "卯", "未"], "辰": ["亥", "卯", "未"], "巳": ["申", "子", "辰"],
  "午": ["申", "子", "辰"], "未": ["申", "子", "辰"], "申": ["寅", "午", "戌"],
  "酉": ["寅", "午", "戌"], "戌": ["寅", "午", "戌"], "亥": ["巳", "酉", "丑"],
};

// 扫帚煞
const SAO_ZHOU: Record<string, string> = {
  "子": "卯", "丑": "辰", "寅": "巳", "卯": "午",
  "辰": "未", "巳": "申", "午": "酉", "未": "戌",
  "申": "亥", "酉": "子", "戌": "丑", "亥": "寅",
};

// 天火
const TIAN_HUO: Record<string, string> = {
  "子": "午", "丑": "卯", "寅": "子", "卯": "酉",
  "辰": "午", "巳": "卯", "午": "子", "未": "酉",
  "申": "午", "酉": "卯", "戌": "子", "亥": "酉",
};

// 天狱
const TIAN_YU: Record<string, string> = {
  "子": "卯", "丑": "午", "寅": "酉", "卯": "子",
  "辰": "卯", "巳": "午", "午": "酉", "未": "子",
  "申": "卯", "酉": "午", "戌": "酉", "亥": "子",
};

// 天贼
const TIAN_ZEI: Record<string, string> = {
  "子": "巳", "丑": "辰", "寅": "申", "卯": "未",
  "辰": "午", "巳": "子", "午": "亥", "未": "戌",
  "申": "寅", "酉": "丑", "戌": "卯", "亥": "未",
};

// 浮沉
const FU_CHEN: Record<string, string> = {
  "子": "戌", "丑": "亥", "寅": "子", "卯": "丑",
  "辰": "寅", "巳": "卯", "午": "辰", "未": "巳",
  "申": "午", "酉": "未", "戌": "申", "亥": "酉",
};

// 天厄
const TIAN_E: Record<string, string> = {
  "子": "酉", "丑": "戌", "寅": "亥", "卯": "子",
  "辰": "丑", "巳": "寅", "午": "卯", "未": "辰",
  "申": "巳", "酉": "午", "戌": "未", "亥": "申",
};

// 三丘
function getSanQiu(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 7) % 12]; }

// 五墓
function getWuMu(nianZhi: string): string { return ZHI[(ZHI.indexOf(nianZhi) + 9) % 12]; }

// ==================== 主计算函数 ====================

/**
 * 神煞大全计算
 * 输入四柱八字，输出分14类的神煞结果（180+神煞检查）
 */
export function calculateShenSha(input: Record<string, unknown>): ShenShaDaQuanResult {
  const yearPillar = (input.yearPillar as string) || "";
  const monthPillar = (input.monthPillar as string) || "";
  const dayPillar = (input.dayPillar as string) || "";
  const hourPillar = (input.hourPillar as string) || "";
  const gender = (input.gender as "男" | "女") || "男";

  const shenShaInput: ShenShaDaQuanInput = { yearPillar, monthPillar, dayPillar, hourPillar, gender };
  const pillars = parsePillars(shenShaInput);

  const nian = pillars[0];
  const yue = pillars[1];
  const ri = pillars[2];
  const shi = pillars[3];

  const riGan = ri.gan;
  const riZhi = ri.zhi;
  const riGanZhi = riGan + riZhi;
  const nianGan = nian.gan;
  const nianZhi = nian.zhi;
  const yueGan = yue.gan;
  const yueZhi = yue.zhi;
  const shiZhi = shi.zhi;

  const results: ShenShaItem[] = [];

  // ================ 1. 吉神（30+） ================

  // 1.1 天乙贵人
  const tianYiTargets = TIAN_YI_GUI_REN[riGan] || [];
  results.push(...collectMatches(pillars, p => tianYiTargets.includes(p.zhi),
    "天乙贵人", "吉", "贵人相助，逢凶化吉",
    "天乙贵人为命理第一吉神，主贵人相助，遇难呈祥。命中带之，一生多得他人提携，逢凶化吉。"));

  // 1.2 太极贵人
  const taiJiTargets = TAI_JI_GUI_REN[riGan] || [];
  results.push(...collectMatches(pillars, p => taiJiTargets.includes(p.zhi),
    "太极贵人", "吉", "聪明好学，有悟性",
    "太极贵人主聪明好学，有哲学宗教缘分。命中带之，喜钻研玄学，有先见之明。"));

  // 1.3 天德贵人
  const tianDeTarget = TIAN_DE_GUI_REN[yueZhi];
  if (tianDeTarget) {
    results.push(...collectMatches(pillars, p => p.gan === tianDeTarget,
      "天德贵人", "吉", "福泽深厚，化险为夷",
      "天德贵人乃天地德秀之气，命中带之，一生福泽深厚，灾难不侵，化险为夷。"));
  }

  // 1.4 天德合
  const tianDeHeTarget = TIAN_DE_HE[yueZhi];
  if (tianDeHeTarget) {
    results.push(...collectMatches(pillars, p => p.gan === tianDeHeTarget,
      "天德合", "吉", "福寿康宁，灾祸不侵",
      "天德合为天德之合，福力更增。命中带之主福寿康宁，灾祸不侵。"));
  }

  // 1.5 月德贵人
  const yueDeTarget = YUE_DE_GUI_REN[yueZhi];
  if (yueDeTarget) {
    results.push(...collectMatches(pillars, p => p.gan === yueDeTarget,
      "月德贵人", "吉", "化凶为吉，福禄双全",
      "月德贵人为月中德神，命中带之，化凶为吉，福禄双全，一生平安。"));
  }

  // 1.6 月德合
  const yueDeHeTarget = YUE_DE_HE[yueZhi];
  if (yueDeHeTarget) {
    results.push(...collectMatches(pillars, p => p.gan === yueDeHeTarget,
      "月德合", "吉", "家宅安宁，福气临门",
      "月德合与月德同功，主家宅安宁，福气临门，人际关系和谐。"));
  }

  // 1.7 文昌贵人
  const wenChangTarget = WEN_CHANG[riGan];
  if (wenChangTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === wenChangTarget,
      "文昌贵人", "吉", "聪明好学，文采出众",
      "文昌贵人文科吉星，命中带之，聪明好学，才华出众，考试升学顺利。"));
  }

  // 1.8 学堂
  const xueTangTarget = XUE_TANG[riGan];
  if (xueTangTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === xueTangTarget,
      "学堂", "吉", "学业有成，智慧超群",
      "学堂为学习之星，主学业优秀，智慧超群，在学术领域易有成就。"));
  }

  // 1.9 词馆
  const ciGuanTarget = getCiGuan(riGan);
  if (ciGuanTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === ciGuanTarget,
      "词馆", "吉", "文采飞扬，学问渊博",
      "词馆为文辞之星，主文采出众，善于表达，学问渊博。"));
  }

  // 1.10 福星贵人
  const fuXingTarget = FU_XING_GUI_REN[riGan];
  if (fuXingTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === fuXingTarget,
      "福星贵人", "吉", "福寿安康，一生少病",
      "福星贵人主福寿安康，命中带之，一生少病，生活安逸，福气深厚。"));
  }

  // 1.11 禄神
  const luTarget = LU_SHEN[riGan];
  if (luTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === luTarget,
      "禄神", "吉", "食禄丰足，生活无忧",
      "禄神为食禄之星，主衣食丰足，财运稳定，生活无忧。"));
  }

  // 1.12 金舆
  const jinYuTarget = JIN_YU[riGan];
  if (jinYuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === jinYuTarget,
      "金舆", "吉", "富足安乐，衣食丰盛",
      "金舆为富贵之星，主富贵荣华，命中带之，多出身富贵之家或能得丰厚资产。"));
  }

  // 1.13 国印贵人
  const guoYinTarget = GUO_YIN[riGan];
  if (guoYinTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === guoYinTarget,
      "国印贵人", "吉", "掌握权印，诚信可靠",
      "国印贵人主掌权柄，命中带之，为人诚信可靠，适合从事管理、公职工作。"));
  }

  // 1.14 天厨贵人
  const tianChuTarget = TIAN_CHU[riGan];
  if (tianChuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === tianChuTarget,
      "天厨贵人", "吉", "衣食丰足，安享其成",
      "天厨贵人为美食福禄之星，主衣食丰足，一生不愁吃穿。"));
  }

  // 1.15 天官贵人
  const tianGuanTarget = TIAN_GUAN[riGan];
  if (tianGuanTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === tianGuanTarget,
      "天官贵人", "吉", "近贵得官，仕途顺遂",
      "天官贵人主官运亨通，命中带之，近贵得官，仕途顺遂，适宜公职。"));
  }

  // 1.16 将星
  const jiangXingTarget = JIANG_XING[riZhi];
  if (jiangXingTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === jiangXingTarget,
      "将星", "吉", "领导力强，权威显赫",
      "将星为权威之星，命中带之，有领导才能，在团队中自然成为核心人物。"));
  }

  // 1.17 华盖
  const huaGaiTarget = HUA_GAI[riZhi];
  if (huaGaiTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === huaGaiTarget,
      "华盖", "吉", "聪慧孤独，利于艺术学术",
      "华盖主孤独与才华，命中带之，聪明过人，有艺术天赋和宗教缘分，但性情孤独。"));
  }

  // 1.18 红鸾
  const hongLuanTarget = HONG_LUAN[riZhi];
  if (hongLuanTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === hongLuanTarget,
      "红鸾", "吉", "桃花星，婚恋吉兆",
      "红鸾为婚恋喜星，主感情缘分，命中带之，婚姻美满，感情顺遂。"));
  }

  // 1.19 天喜
  const tianXiTarget = getTianXi(riZhi);
  if (tianXiTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === tianXiTarget,
      "天喜", "吉", "喜事临门，婚姻美满",
      "天喜为喜庆之星，主喜事临门，婚姻美满，家庭幸福。"));
  }

  // 1.20 魁罡
  if (isKuiGang(riGan, riZhi)) {
    results.push(makeItem("魁罡", "吉", true, "日柱",
      "聪明果敢，刚毅决断",
      "魁罡格，聪明果敢，刚毅决断，有领袖气质，但性格刚强易得罪人。"));
  }

  // 1.21 三奇贵人
  const sanQi = checkSanQi(nianGan, yueGan, riGan);
  if (sanQi) {
    results.push(makeItem(sanQi, "吉", true, "全局",
      "三奇拱照，大富大贵",
      "三奇贵人乃天地精华汇聚，命中带之，大富大贵，才华横溢，非常人之命。"));
  }

  // 1.22 天赦
  if (isTianShe(riGan, riZhi, yueZhi)) {
    results.push(makeItem("天赦", "吉", true, "日柱",
      "逢凶化吉，百事无忧",
      "天赦日生，乃天地赦免之日，逢凶化吉，一生少灾少难。"));
  }

  // 1.23 日德
  if (RI_DE.has(riGanZhi)) {
    results.push(makeItem("日德", "吉", true, "日柱",
      "品德高尚，人缘极佳",
      "日德为德星入命，主品德高尚，为人宽厚，人缘极佳。"));
  }

  // 1.24 日贵
  if (RI_GUI.has(riGanZhi)) {
    results.push(makeItem("日贵", "吉", true, "日柱",
      "自坐贵人，福气深厚",
      "日贵为自坐贵人，主自身福气深厚，不假外求，一生得人尊重。"));
  }

  // 1.25 十灵日
  if (SHI_LING_RI.has(riGanZhi)) {
    results.push(makeItem("十灵日", "吉", true, "日柱",
      "悟性极高，才智过人",
      "十灵日生，悟性极高，聪明过人，善于洞察事物本质。"));
  }

  // 1.26 六秀
  if (LIU_XIU.has(riGanZhi)) {
    results.push(makeItem("六秀", "吉", true, "日柱",
      "聪明秀气，才华出众",
      "六秀日生，聪明秀气，才华出众，仪表堂堂。"));
  }

  // 1.27 进神
  if (JIN_SHEN.has(riGanZhi)) {
    results.push(makeItem("进神", "吉", true, "日柱",
      "进取向上，事业有成",
      "进神日生，进取心强，不断进步，事业有成。"));
  }

  // 1.28 金神
  if (JIN_SHEN_NA_YIN[riGanZhi]) {
    results.push(makeItem("金神", "吉", true, "日柱",
      "刚毅果断，事业心强",
      "金神入命，刚毅果断，事业心强，有开创精神，但性情急躁。"));
  }

  // 1.29 福德
  const fuDeTarget = FU_DE[riGan];
  if (fuDeTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === fuDeTarget,
      "福德", "吉", "福气深厚，德业有成",
      "福德为福寿之星，主福气深厚，命中带之，一生平安顺遂。"));
  }

  // 1.30 科名星
  const keMingTargets = KE_MING[riGan] || [];
  results.push(...collectMatches(pillars, p => keMingTargets.includes(p.zhi),
    "科名星", "吉", "科考成名，学业事业有成",
    "科名星主管科举功名，命中带之，学业优秀，考试顺利，事业有成。"));

  // 1.31 暗禄
  const anLuZhi = LU_SHEN[riGan] ? ZHI[(ZHI.indexOf(LU_SHEN[riGan]) + 6) % 12] : "";
  if (anLuZhi) {
    results.push(...collectMatches(pillars, p => p.zhi === anLuZhi,
      "暗禄", "吉", "暗中得助，福禄暗至",
      "暗禄为暗中福禄，命中带之，关键时刻常有意外之助，暗中有福。"));
  }

  // ================ 2. 凶煞（30+） ================

  // 2.1 羊刃
  const yangRenTarget = YANG_REN[riGan];
  if (yangRenTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === yangRenTarget,
      "羊刃", "凶", "性情刚烈，易受伤灾",
      "羊刃为极旺之刃，主性情刚烈暴躁，易有血光外伤，需注意安全。"));
  }

  // 2.2 劫煞
  const jieShaTarget = JIE_SHA[riZhi];
  if (jieShaTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === jieShaTarget,
      "劫煞", "凶", "是非破财，意外灾祸",
      "劫煞主破财、是非、意外。命中带之，需防范小人劫夺、意外损失。"));
  }

  // 2.3 灾煞
  const zaiShaTarget = ZAI_SHA[riZhi];
  if (zaiShaTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === zaiShaTarget,
      "灾煞", "凶", "疾病灾祸，意外伤害",
      "灾煞主灾祸疾病，命中带之，易有意外伤害，健康方面多加注意。"));
  }

  // 2.4 孤辰
  const guChenTarget = GU_CHEN[nianZhi];
  if (guChenTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === guChenTarget,
      "孤辰", "凶", "性格孤僻，婚姻不顺",
      "孤辰主孤独，命中带之，性格内向孤僻，婚姻感情较为波折。"));
  }

  // 2.5 寡宿
  const guaSuTarget = GUA_SU[nianZhi];
  if (guaSuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === guaSuTarget,
      "寡宿", "凶", "孤单寂寞，感情波折",
      "寡宿主孤单，命中带之，感情之路波折多，晚年易孤独。"));
  }

  // 2.6 亡神
  const wangShenTarget = WANG_SHEN[riZhi];
  if (wangShenTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === wangShenTarget,
      "亡神", "凶", "心神不宁，意外灾祸",
      "亡神主心神不宁，易有惊险意外之事。命中带之，宜修身养性以安神。"));
  }

  // 2.7 元辰
  const yuanChenTarget = YUAN_CHEN[nianZhi];
  if (yuanChenTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === yuanChenTarget,
      "元辰", "凶", "运势反复，事多阻碍",
      "元辰为凶煞，主运势反复不定，做事阻碍多，谋事难成。"));
  }

  // 2.8 勾绞
  const gouJiaoTargets = GOU_JIAO[riZhi] || [];
  results.push(...collectMatches(pillars, p => gouJiaoTargets.includes(p.zhi),
    "勾绞", "凶", "口舌是非，官非纠纷",
    "勾绞主是非纠缠，命中带之，易有口舌官司、合同纠纷等事。"));

  // 2.9 丧门
  const sangMenTarget = getSangMen(nianZhi);
  if (sangMenTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === sangMenTarget,
      "丧门", "凶", "孝服悲伤，家运不宁",
      "丧门主悲伤之事，命中带之，需注意家中长辈健康，防孝服之事。"));
  }

  // 2.10 吊客
  const diaoKeTarget = getDiaoKe(nianZhi);
  if (diaoKeTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === diaoKeTarget,
      "吊客", "凶", "吊唁送葬，宜慎出行",
      "吊客主哀伤之事，命中带之，慎行吊唁之事，注意身体健康。"));
  }

  // 2.11 病符
  const bingFuTarget = getBingFu(nianZhi);
  if (bingFuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === bingFuTarget,
      "病符", "凶", "疾病缠身，身体欠安",
      "病符主疾病，命中带之，身体较弱，需注意养生保健。"));
  }

  // 2.12 死符
  const siFuTarget = getSiFu(nianZhi);
  if (siFuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === siFuTarget,
      "死符", "凶", "灾祸临身，谨防意外",
      "死符主意外灾祸，命中带之，需注意人身安全，避免高危活动。"));
  }

  // 2.13 岁破
  const suiPoTarget = getSuiPo(nianZhi);
  if (suiPoTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === suiPoTarget,
      "岁破", "凶", "冲犯太岁，诸事不顺",
      "岁破即年支对冲之位，主冲撞太岁，运势动荡，诸事不顺。"));
  }

  // 2.14 小耗
  const xiaoHaoTarget = getXiaoHao(nianZhi);
  if (xiaoHaoTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === xiaoHaoTarget,
      "小耗", "凶", "钱财损耗，破财消灾",
      "小耗主钱财损耗，命中带之，多有意外支出，需谨慎理财。"));
  }

  // 2.15 大耗
  const daHaoTarget = getDaHao(nianZhi);
  if (daHaoTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === daHaoTarget,
      "大耗", "凶", "大破钱财，倾家荡产",
      "大耗主重大破财，命中带之，须谨防投资失败、重大经济损失。"));
  }

  // 2.16 白虎
  const baiHuTarget = getBaiHu(nianZhi);
  if (baiHuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === baiHuTarget,
      "白虎", "凶", "血光之灾，意外伤害",
      "白虎主血光之灾，命中带之，谨防意外伤害、交通事故等。"));
  }

  // 2.17 天狗
  const tianGouTarget = getTianGou(nianZhi);
  if (tianGouTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === tianGouTarget,
      "天狗", "凶", "口舌是非，意外灾害",
      "天狗主口舌是非，意外灾害，命中带之，出行需谨慎。"));
  }

  // 2.18 卷舌
  const juanSheTarget = getJuanShe(nianZhi);
  if (juanSheTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === juanSheTarget,
      "卷舌", "凶", "口舌官司，言语纷争",
      "卷舌主口舌之争，命中带之，易因言语招来是非官司。"));
  }

  // 2.19 血刃
  const xueRenTarget = XUE_REN[yueZhi];
  if (xueRenTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === xueRenTarget,
      "血刃", "凶", "血光之灾，手术外伤",
      "血刃主血光之灾，命中带之，需防手术外伤，注意安全。"));
  }

  // 2.20 血支
  const xueZhiTarget = XUE_ZHI[yueZhi];
  if (xueZhiTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === xueZhiTarget,
      "血支", "凶", "血光星，防意外受伤",
      "血支与血刃同类，主血光，命中带之，避免参与危险活动。"));
  }

  // 2.21 天罗
  const tianLuoHit = pillars.some(p => isTianLuo(p.zhi));
  if (tianLuoHit) {
    results.push(makeItem("天罗", "凶", true, undefined,
      "命运困顿，有志难伸",
      "天罗为命中困局，主有志难伸，运势阻滞。戌亥为天罗，命中遇之多困顿。"));
  }

  // 2.22 地网
  const diWangHit = pillars.some(p => isDiWang(p.zhi));
  if (diWangHit) {
    results.push(makeItem("地网", "凶", true, undefined,
      "陷入困境，进退维谷",
      "地网与天罗相对，辰巳为地网，命中带之，主陷入困境，进退两难。"));
  }

  // 2.23 流霞
  const liuXiaTarget = LIU_XIA[riGan];
  if (liuXiaTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === liuXiaTarget,
      "流霞", "凶", "男忌酒色，女忌产厄",
      "流霞男主酒色之灾，女主产厄。命中带之，需注意健康与品行。"));
  }

  // 2.24 六厄
  const liuETarget = LIU_E[riZhi];
  if (liuETarget) {
    results.push(...collectMatches(pillars, p => p.zhi === liuETarget,
      "六厄", "凶", "困顿潦倒，事业受阻",
      "六厄主困顿，命中带之，事业上多阻碍，难有大的突破。"));
  }

  // 2.25 破碎
  const poSuiTarget = PO_SUI[riZhi];
  if (poSuiTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === poSuiTarget,
      "破碎", "凶", "好事易破，劳而无功",
      "破碎主好事易破，命中带之，做事易半途而废，劳而无功。"));
  }

  // 2.26 五鬼
  const wuGuiTarget = WU_GUI[yueZhi];
  if (wuGuiTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === wuGuiTarget,
      "五鬼", "凶", "小人作祟，是非不断",
      "五鬼主小人作祟，命中带之，易招惹小人，是非不断。"));
  }

  // 2.27 天哭
  const tianKuTarget = getTianKu(nianZhi);
  if (tianKuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === tianKuTarget,
      "天哭", "凶", "悲伤哭泣，忧愁烦恼",
      "天哭主悲伤之事，命中带之，一生多忧愁烦恼，感情脆弱。"));
  }

  // 2.28 天虚
  const tianXuTarget = getTianXu(nianZhi);
  if (tianXuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === tianXuTarget,
      "天虚", "凶", "空虚不实，好事落空",
      "天虚主虚浮不实，命中带之，好事易落空，理想难实现。"));
  }

  // 2.29 官符
  const guanFuTarget = getGuanFu(nianZhi);
  if (guanFuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === guanFuTarget,
      "官符", "凶", "官非诉讼，牢狱之灾",
      "官符主管司诉讼，命中带之，易有官非纠纷，须遵纪守法。"));
  }

  // 2.30 天火
  const tianHuoTarget = TIAN_HUO[yueZhi];
  if (tianHuoTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === tianHuoTarget,
      "天火", "凶", "火灾隐患，防烧烫伤",
      "天火主火险，命中带之，需注意防火防烫，远离火源。"));
  }

  // 2.31 天狱
  const tianYuTarget = TIAN_YU[yueZhi];
  if (tianYuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === tianYuTarget,
      "天狱", "凶", "牢狱官非之象，行事谨慎",
      "天狱主牢狱之灾，命中带之，行事需谨慎，避免违法犯罪。"));
  }

  // 2.32 天贼
  const tianZeiTarget = TIAN_ZEI[yueZhi];
  if (tianZeiTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === tianZeiTarget,
      "天贼", "凶", "盗贼失窃，财物宜慎",
      "天贼主失窃被盗，命中带之，需注意财物安全，防偷防盗。"));
  }

  // 2.33 浮沉
  const fuChenTarget = FU_CHEN[nianZhi];
  if (fuChenTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === fuChenTarget,
      "浮沉", "凶", "机运浮沉不定，事业起落",
      "浮沉主运势起伏不定，命中带之，事业人生大起大落。"));
  }

  // 2.34 天厄
  const tianETarget = TIAN_E[nianZhi];
  if (tianETarget) {
    results.push(...collectMatches(pillars, p => p.zhi === tianETarget,
      "天厄", "凶", "天降灾厄，诸多不顺",
      "天厄主天降之灾，命中带之，诸多不顺，需有应对变故的准备。"));
  }

  // ================ 3. 桃花类（5+） ================

  // 3.1 桃花/咸池
  const taoHuaTarget = TAO_HUA[riZhi];
  if (taoHuaTarget) {
    // 查找桃花落在哪一柱
    const taoHuaPillar = pillars.find(p => p.zhi === taoHuaTarget);
    if (taoHuaPillar) {
      results.push(makeItem("桃花", "中性", true, taoHuaPillar.key,
        "多情风流，异性缘旺",
        "桃花主异性缘分，命中带之，魅力十足，感情丰富，但需防感情纠葛。"));
    }
  }

  // 3.2 墙内桃花（桃花在年柱或日柱）
  if (taoHuaTarget) {
    const taoHuaPillar = pillars.find(p => p.zhi === taoHuaTarget);
    if (taoHuaPillar && (taoHuaPillar.key === "年柱" || taoHuaPillar.key === "日柱")) {
      results.push(makeItem("墙内桃花", "吉", true, taoHuaPillar.key,
        "夫妻恩爱，感情专一",
        "墙内桃花主夫妻感情好，命中带之，婚姻美满，感情专一。"));
    }
  }

  // 3.3 墙外桃花（桃花在月柱或时柱）
  if (taoHuaTarget) {
    const taoHuaPillar = pillars.find(p => p.zhi === taoHuaTarget);
    if (taoHuaPillar && (taoHuaPillar.key === "月柱" || taoHuaPillar.key === "时柱")) {
      results.push(makeItem("墙外桃花", "凶", true, taoHuaPillar.key,
        "多情外向，感情复杂",
        "墙外桃花主感情复杂，命中带之，异性缘分虽旺但也易生感情纠葛。"));
    }
  }

  // 3.4 滚浪桃花（桃花在时柱且为子午卯酉）
  if (taoHuaTarget && ["子", "午", "卯", "酉"].includes(taoHuaTarget)) {
    const taoHuaPillar = pillars.find(p => p.zhi === taoHuaTarget);
    if (taoHuaPillar && taoHuaPillar.key === "时柱") {
      results.push(makeItem("滚浪桃花", "凶", true, "时柱",
        "情欲旺盛，易因色生灾",
        "滚浪桃花乃桃花之极，主情欲旺盛，易因感情之事招来灾祸。"));
    }
  }

  // 3.5 遍野桃花（四柱中两柱以上带桃花）
  if (taoHuaTarget) {
    const taoHuaCount = pillars.filter(p => p.zhi === taoHuaTarget).length;
    if (taoHuaCount >= 2) {
      results.push(makeItem("遍野桃花", "凶", true, undefined,
        "桃花过旺，情路坎坷",
        "遍野桃花为桃花泛滥，命中多柱见桃花，感情之路复杂坎坷。"));
    }
  }

  // 3.6 红艳煞
  const hongYanTarget = HONG_YAN[riGan];
  if (hongYanTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === hongYanTarget,
      "红艳煞", "中性", "多情善感，易为情困",
      "红艳煞主多情善感，命中带之，感情丰富，但也易为情所困。"));
  }

  // ================ 4. 驿马类（5+） ================

  // 4.1 驿马
  const yiMaTarget = YI_MA[riZhi];
  if (yiMaTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === yiMaTarget,
      "驿马", "中性", "奔波行动，多动少静",
      "驿马主奔波变动，命中带之，一生多动，适合向外发展，不宜守旧。"));
  }

  // 4.2 栏外马（驿马逢冲）
  if (yiMaTarget) {
    const yiMaChong = ZHI[(ZHI.indexOf(yiMaTarget) + 6) % 12];
    if (pillars.some(p => p.zhi === yiMaChong)) {
      results.push(makeItem("栏外马", "凶", true, undefined,
        "奔波劳碌，出外发展",
        "栏外马为驿马被冲，主奔波劳碌，多在外地发展，难得安宁。"));
    }
  }

  // 4.3 天马
  const tianMaTarget = TIAN_MA[yueZhi];
  if (tianMaTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === tianMaTarget,
      "天马", "吉", "出行顺利，变动有利",
      "天马为吉动之星，命中带之，远行顺利，变动之中得利。"));
  }

  // 4.4 攀鞍
  const panAnTarget = getPanAn(nianZhi);
  if (panAnTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === panAnTarget,
      "攀鞍", "吉", "前程似锦，步步高升",
      "攀鞍为驿马前神，主前程似锦，步步高升，事业有进展。"));
  }

  // ================ 5. 贵人变体（5+） ================

  // 5.1 文昌贵人（已在上方注册，此处作为贵人变体重复收录）
  // 5.2 学堂贵人
  // 5.3 词馆
  // 5.4 天乙贵人
  // 5.5 太极贵人
  // 5.6 天官贵人
  // 以上都在吉神中已计算，此处不再重复

  // ================ 6. 空亡类（5+） ================

  // 6.1 旬空
  const xunKongTargets = getXunKong(riGanZhi);
  const xunKongPillars = pillars.filter(p => xunKongTargets.includes(p.zhi));
  for (const p of xunKongPillars) {
    results.push(makeItem("旬空", "凶", true, p.key,
      "吉空不吉，凶空更凶",
      "旬空主空虚不实，吉神逢空减力，凶神逢空更凶，需结合神煞综合判断。"));
  }

  // 6.2 截路空亡
  const jieLuTargets = JIE_LU_KONG[riGan] || [];
  if (jieLuTargets.includes(shiZhi)) {
    results.push(makeItem("截路空亡", "凶", true, "时柱",
      "行路受阻，所求难成",
      "截路空亡主做事受阻，命中时柱逢之，谋事易半途而废，出行不利。"));
  }

  // 6.3 四大空亡
  const nianGanZhi = nianGan + nianZhi;
  if (SI_DA_KONG[nianGanZhi]) {
    const desc = SI_DA_KONG[nianGanZhi];
    results.push(makeItem("四大空亡", "凶", true, "年柱",
      desc.includes("无火") ? "命无水" : "命无火",
      "四大空亡主该旬中五行不全，命中先天缺少某种五行能量。"));
  }

  // 6.4 天罗地网（已在凶煞中覆盖，此处作为空亡复合类补充）
  // 已在2.21和2.22中覆盖

  // ================ 7. 流年神煞（5+） ================

  // 7.1 太岁（年支本身）
  results.push(makeItem("太岁", "中性", true, "年柱",
    "年柱值太岁，运势起伏",
    "太岁为一年之主宰，年柱即为本命太岁，主当年运势起伏。"));

  // 7.2 岁破（已在上方2.13中覆盖）

  // 7.3 太阳
  const taiYangTarget = getTaiYang(nianZhi);
  if (taiYangTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === taiYangTarget,
      "太阳", "吉", "光明吉庆，贵人相助",
      "太阳为吉星，主光明磊落，贵人相助，运势亨通。"));
  }

  // 7.4 太阴
  const taiYinTarget = getTaiYin(nianZhi);
  if (taiYinTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === taiYinTarget,
      "太阴", "中性", "阴柔含蓄，宜静不宜动",
      "太阴主阴柔之事，宜静不宜动，适合女性或从事幕后工作。"));
  }

  // 7.5 丧门（已在上方2.9中覆盖）
  // 7.6 白虎（已在上方2.16中覆盖）
  // 7.7 病符（已在上方2.11中覆盖）
  // 7.8 死符（已在上方2.12中覆盖）
  // 7.9 官符（已在上方2.29中覆盖）

  // ================ 8. 禄马类（5+） ================

  // 8.1 禄神（已在1.11中覆盖）
  // 8.2 驿马（已在4.1中覆盖）

  // 8.3 禄马交驰
  if (checkLuMaJiaoChi(riGan, riZhi, riGanZhi)) {
    results.push(makeItem("禄马交驰", "吉", true, "日柱",
      "禄马同宫，富贵双全",
      "禄马交驰为富贵之格，命中带之，财官双美，名利双收。"));
  }

  // 8.4 禄马同乡
  if (checkLuMaTongXiang(riGanZhi)) {
    results.push(makeItem("禄马同乡", "吉", true, "日柱",
      "福禄双全，富贵之命",
      "禄马同乡乃富贵双全之象，命中带之，一生福禄深厚。"));
  }

  // ================ 9. 六亲相关（5+） ================

  // 9.1 红鸾（已在1.18中覆盖）
  // 9.2 天喜（已在1.19中覆盖）
  // 9.3 桃花/咸池（已在3.1中覆盖）
  // 9.4 寡宿（已在2.5中覆盖）
  // 9.5 孤辰（已在2.4中覆盖）

  // 9.6 阴差阳错
  if (YIN_CUO.has(riGanZhi)) {
    results.push(makeItem("阴错", "凶", true, "日柱",
      "阴阳差错，婚姻不利",
      "阴错日生，婚姻感情易有波折，夫妻关系不协调。"));
  }
  if (YANG_CHA.has(riGanZhi)) {
    results.push(makeItem("阳差", "凶", true, "日柱",
      "阴阳差错，感情波折",
      "阳差日生，感情之路波折多，婚姻不易美满。"));
  }

  // 9.7 孤鸾
  if (GU_LUAN.has(riGanZhi)) {
    results.push(makeItem("孤鸾", "凶", true, "日柱",
      "婚姻不顺，夫妻缘薄",
      "孤鸾日生，婚姻不顺，夫妻缘分浅薄，易有分离之苦。"));
  }

  // 9.8 八专
  if (BA_ZHUAN.has(riGanZhi)) {
    results.push(makeItem("八专", "凶", true, "日柱",
      "感情复杂，易陷情网",
      "八专日生，感情丰富复杂，易陷入感情纠葛之中。"));
  }

  // 9.9 九丑
  if (JIU_CHOU.has(riGanZhi)) {
    results.push(makeItem("九丑", "凶", true, "日柱",
      "品貌不佳，人缘较差",
      "九丑日生，外在条件不占优势，人际关系上需多加努力。"));
  }

  // ================ 10. 事业相关（5+） ================

  // 10.1 将星（已在1.16中覆盖）
  // 10.2 华盖（已在1.17中覆盖）
  // 10.3 金舆（已在1.12中覆盖）
  // 10.4 太极贵人（已在1.2中覆盖）
  // 10.5 文昌（已在1.7中覆盖）
  // 10.6 国印（已在1.13中覆盖）
  // 10.7 天厨（已在1.14中覆盖）
  // 10.8 魁罡（已在1.20中覆盖）

  // ================ 11. 健康相关（5+） ================

  // 11.1 血刃（已在2.19中覆盖）
  // 11.2 白虎（已在2.16中覆盖）
  // 11.3 丧门（已在2.9中覆盖）
  // 11.4 吊客（已在2.10中覆盖）
  // 11.5 病符（已在2.11中覆盖）
  // 11.6 死符（已在2.12中覆盖）
  // 11.7 天火（已在2.30中覆盖）
  // 11.8 血支（已在2.20中覆盖）
  // 11.9 流霞（已在2.23中覆盖）

  // ================ 12. 特殊吉格（5+） ================

  // 12.1 禄马同乡（已在8.4中覆盖）
  // 12.2 禄马交驰（已在8.3中覆盖）
  // 12.3 魁罡（已在1.20中覆盖）
  // 12.4 金神（已在1.28中覆盖）
  // 12.5 三奇贵人（已在1.21中覆盖）
  // 12.6 天赦（已在1.22中覆盖）

  // 新增：
  // 12.7 六秀（已在1.26中覆盖）
  // 12.8 日德（已在1.23中覆盖）

  // ================ 13. 特殊凶格（5+） ================

  // 13.1 天罗地网（已在2.21/2.22中覆盖）
  // 13.2 孤辰寡宿（已在2.4/2.5中覆盖）

  // 13.3 劫煞亡神（劫煞+亡神同现）
  if (jieShaTarget && wangShenTarget) {
    const jieShaPillar = pillars.find(p => p.zhi === jieShaTarget);
    const wangShenPillar = pillars.find(p => p.zhi === wangShenTarget);
    if (jieShaPillar || wangShenPillar) {
      results.push(makeItem("劫煞亡神同现", "凶", true, undefined,
        "灾祸并至，大凶之兆",
        "劫煞与亡神同时出现，灾祸叠加，需格外谨慎，防重大变故。"));
    }
  }

  // 13.4 十恶大败
  if (SHI_E_DA_BAI.has(riGanZhi)) {
    results.push(makeItem("十恶大败", "凶", true, "日柱",
      "钱财不聚，破败连连",
      "十恶大败日生，钱财难聚，一生易有破败之灾，理财须格外谨慎。"));
  }

  // 13.5 阴差阳错（已在9.6中覆盖）

  // 13.6 四废
  if (isSiFei(riGanZhi, yueZhi)) {
    results.push(makeItem("四废", "凶", true, "日柱",
      "万事不顺，有志难伸",
      "四废日生，五行之气衰败，主万事不顺，有志难伸，需等待时机。"));
  }

  // ================ 14. 综合（10+） ================

  // 14.1 十恶大败（已在13.4中覆盖）
  // 14.2 阴差阳错（已在9.6中覆盖）
  // 14.3 八专（已在9.8中覆盖）
  // 14.4 九丑（已在9.9中覆盖）
  // 14.5 四废（已在13.6中覆盖）
  // 14.6 孤鸾（已在9.7中覆盖）

  // 14.7 截路空亡（已在6.2中覆盖）
  // 14.8 埋儿煞
  if (getMaiEr(shiZhi, yueZhi)) {
    results.push(makeItem("埋儿煞", "凶", true, "时柱",
      "不利子息，生育宜慎",
      "埋儿煞不利子女，命中带之，子女缘分较薄，生育需注意。"));
  }

  // 14.9 截路煞
  if (isJieLuSha(riGan, shiZhi)) {
    results.push(makeItem("截路煞", "凶", true, "时柱",
      "中途阻滞，难得善终",
      "截路煞主人生中途遇阻，事业难有善终，宜有长远规划。"));
  }

  // 14.10 短寿煞
  if (isDuanShou(riGan, riZhi)) {
    results.push(makeItem("短寿煞", "凶", true, "日柱",
      "健康堪忧，珍惜身体",
      "短寿煞主健康有忧，命中带之，需注重养生保健，定期体检。"));
  }

  // 14.11 暗金煞
  const anJinTargets = AN_JIN[nianZhi] || [];
  if (anJinTargets.includes(riZhi)) {
    results.push(makeItem("暗金煞", "凶", true, "日柱",
      "暗藏凶险，谨防意外",
      "暗金煞暗藏凶险，命中带之，需防意外的金属利器伤害。"));
  }

  // 14.12 扫帚煞
  const saoZhouTarget = SAO_ZHOU[yueZhi];
  if (saoZhouTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === saoZhouTarget,
      "扫帚煞", "凶", "扫除家财，败家之象",
      "扫帚煞主败家，命中带之，钱财难聚，需注意理财。"));
  }

  // 14.13 月厌（月支对冲位）
  const yueYanTarget = YUE_YAN[yueZhi];
  if (yueYanTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === yueYanTarget,
      "月厌", "凶", "月令之气不调，诸事不宜",
      "月厌为月中凶神，逢之诸事不宜，宜静不宜动。"));
  }

  // 14.14 三丘
  const sanQiuTarget = getSanQiu(nianZhi);
  if (sanQiuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === sanQiuTarget,
      "三丘", "凶", "丧事悲愁，家运不宁",
      "三丘主丧事悲愁，命中带之，家运多有波折。"));
  }

  // 14.15 五墓
  const wuMuTarget = getWuMu(nianZhi);
  if (wuMuTarget) {
    results.push(...collectMatches(pillars, p => p.zhi === wuMuTarget,
      "五墓", "凶", "墓库之气，运势闭塞",
      "五墓主运势闭塞，如入墓库，诸多不顺。"));
  }

  // ================ 分类汇总 ================

  const categories: ShenShaCategory[] = [
    {
      name: "吉神",
      items: [
        { name: "天乙贵人", type: "吉", applicable: tianYiTargets.some(t => pillars.some(p => p.zhi === t)), location: undefined, meaning: "贵人相助，逢凶化吉", detail: "天乙贵人为命理第一吉神，主贵人相助，遇难呈祥。" },
        { name: "太极贵人", type: "吉", applicable: taiJiTargets.some(t => pillars.some(p => p.zhi === t)), location: undefined, meaning: "聪明好学，有悟性", detail: "太极贵人主聪明好学，有哲学宗教缘分。" },
        { name: "天德贵人", type: "吉", applicable: !!tianDeTarget && pillars.some(p => p.gan === tianDeTarget), location: undefined, meaning: "福泽深厚，化险为夷", detail: "天德贵人乃天地德秀之气，一生福泽深厚。" },
        { name: "月德贵人", type: "吉", applicable: !!yueDeTarget && pillars.some(p => p.gan === yueDeTarget), location: undefined, meaning: "化凶为吉，福禄双全", detail: "月德贵人为月中德神，化凶为吉，福禄双全。" },
        { name: "文昌贵人", type: "吉", applicable: !!wenChangTarget && pillars.some(p => p.zhi === wenChangTarget), location: undefined, meaning: "聪明好学，文采出众", detail: "文昌贵人文科吉星，主才华出众，考试顺利。" },
        { name: "学堂", type: "吉", applicable: !!xueTangTarget && pillars.some(p => p.zhi === xueTangTarget), location: undefined, meaning: "学业有成，智慧超群", detail: "学堂为学习之星，主学业优秀，智慧超群。" },
        { name: "词馆", type: "吉", applicable: !!ciGuanTarget && pillars.some(p => p.zhi === ciGuanTarget), location: undefined, meaning: "文采飞扬，学问渊博", detail: "词馆为文辞之星，主文采出众，善于表达。" },
        { name: "福星贵人", type: "吉", applicable: !!fuXingTarget && pillars.some(p => p.zhi === fuXingTarget), location: undefined, meaning: "福寿安康，一生少病", detail: "福星贵人主福寿安康，一生少病，生活安逸。" },
        { name: "禄神", type: "吉", applicable: !!luTarget && pillars.some(p => p.zhi === luTarget), location: undefined, meaning: "食禄丰足，生活无忧", detail: "禄神为食禄之星，主衣食丰足，财运稳定。" },
        { name: "金舆", type: "吉", applicable: !!jinYuTarget && pillars.some(p => p.zhi === jinYuTarget), location: undefined, meaning: "富足安乐，衣食丰盛", detail: "金舆为富贵之星，主富贵荣华，出身富贵。" },
        { name: "国印贵人", type: "吉", applicable: !!guoYinTarget && pillars.some(p => p.zhi === guoYinTarget), location: undefined, meaning: "掌握权印，诚信可靠", detail: "国印贵人主掌权柄，诚信可靠，适合公职管理。" },
        { name: "天厨贵人", type: "吉", applicable: !!tianChuTarget && pillars.some(p => p.zhi === tianChuTarget), location: undefined, meaning: "衣食丰足，安享其成", detail: "天厨贵人为美食福禄之星，一生不愁吃穿。" },
        { name: "天官贵人", type: "吉", applicable: !!tianGuanTarget && pillars.some(p => p.zhi === tianGuanTarget), location: undefined, meaning: "近贵得官，仕途顺遂", detail: "天官贵人主官运亨通，仕途顺遂，适宜公职。" },
        { name: "将星", type: "吉", applicable: !!jiangXingTarget && pillars.some(p => p.zhi === jiangXingTarget), location: undefined, meaning: "领导力强，权威显赫", detail: "将星为权威之星，有领导才能，团队核心。" },
        { name: "华盖", type: "吉", applicable: !!huaGaiTarget && pillars.some(p => p.zhi === huaGaiTarget), location: undefined, meaning: "聪慧孤独，利于艺术学术", detail: "华盖主孤独与才华，有艺术天赋，但性情孤独。" },
        { name: "红鸾", type: "吉", applicable: !!hongLuanTarget && pillars.some(p => p.zhi === hongLuanTarget), location: undefined, meaning: "桃花星，婚恋吉兆", detail: "红鸾为婚恋喜星，主感情缘分，婚姻美满。" },
        { name: "天喜", type: "吉", applicable: !!tianXiTarget && pillars.some(p => p.zhi === tianXiTarget), location: undefined, meaning: "喜事临门，婚姻美满", detail: "天喜为喜庆之星，主喜事临门，家庭幸福。" },
        { name: "魁罡", type: "吉", applicable: isKuiGang(riGan, riZhi), location: "日柱", meaning: "聪明果敢，刚毅决断", detail: "魁罡格，聪明果敢，有领袖气质。" },
        { name: "三奇贵人", type: "吉", applicable: sanQi !== null, location: "全局", meaning: "三奇拱照，大富大贵", detail: "三奇贵人乃天地精华汇聚，非常人之命。" },
        { name: "天赦", type: "吉", applicable: isTianShe(riGan, riZhi, yueZhi), location: "日柱", meaning: "逢凶化吉，百事无忧", detail: "天赦日生，乃天地赦免之日，一生少灾。" },
        { name: "日德", type: "吉", applicable: RI_DE.has(riGanZhi), location: "日柱", meaning: "品德高尚，人缘极佳", detail: "日德为德星入命，为人宽厚，人缘极佳。" },
        { name: "日贵", type: "吉", applicable: RI_GUI.has(riGanZhi), location: "日柱", meaning: "自坐贵人，福气深厚", detail: "日贵为自坐贵人，自身福气深厚。" },
        { name: "十灵日", type: "吉", applicable: SHI_LING_RI.has(riGanZhi), location: "日柱", meaning: "悟性极高，才智过人", detail: "十灵日生，悟性极高，聪明过人。" },
        { name: "六秀", type: "吉", applicable: LIU_XIU.has(riGanZhi), location: "日柱", meaning: "聪明秀气，才华出众", detail: "六秀日生，聪明秀气，才华出众。" },
        { name: "进神", type: "吉", applicable: JIN_SHEN.has(riGanZhi), location: "日柱", meaning: "进取向上，事业有成", detail: "进神日生，进取心强，事业有成。" },
        { name: "金神", type: "吉", applicable: !!JIN_SHEN_NA_YIN[riGanZhi], location: "日柱", meaning: "刚毅果断，事业心强", detail: "金神入命，刚毅果断，有开创精神。" },
        { name: "福德", type: "吉", applicable: !!fuDeTarget && pillars.some(p => p.zhi === fuDeTarget), location: undefined, meaning: "福气深厚，德业有成", detail: "福德为福寿之星，一生平安顺遂。" },
        { name: "科名星", type: "吉", applicable: keMingTargets.some(t => pillars.some(p => p.zhi === t)), location: undefined, meaning: "科考成名，学业有成", detail: "科名星主管科举功名，学业优秀。" },
        { name: "暗禄", type: "吉", applicable: !!anLuZhi && pillars.some(p => p.zhi === anLuZhi), location: undefined, meaning: "暗中得助，福禄暗至", detail: "暗禄为暗中福禄，关键时刻常有意外之助。" },
        { name: "天德合", type: "吉", applicable: !!tianDeHeTarget && pillars.some(p => p.gan === tianDeHeTarget), location: undefined, meaning: "福寿康宁，灾祸不侵", detail: "天德合为天德之合，福力更增。" },
        { name: "月德合", type: "吉", applicable: !!yueDeHeTarget && pillars.some(p => p.gan === yueDeHeTarget), location: undefined, meaning: "家宅安宁，福气临门", detail: "月德合同功于月德，主家宅安宁。" },
        { name: "太阳", type: "吉", applicable: pillars.some(p => p.zhi === getTaiYang(nianZhi)), location: undefined, meaning: "光明吉庆，贵人相助", detail: "太阳为吉星，主光明磊落，运势亨通。" },
      ],
    },
    {
      name: "凶煞",
      items: [
        { name: "羊刃", type: "凶", applicable: !!yangRenTarget && pillars.some(p => p.zhi === yangRenTarget), location: undefined, meaning: "性情刚烈，易受伤灾", detail: "羊刃为极旺之刃，主性情刚烈，易有血光。" },
        { name: "劫煞", type: "凶", applicable: !!jieShaTarget && pillars.some(p => p.zhi === jieShaTarget), location: undefined, meaning: "是非破财，意外灾祸", detail: "劫煞主破财是非，需防小人劫夺。" },
        { name: "灾煞", type: "凶", applicable: !!zaiShaTarget && pillars.some(p => p.zhi === zaiShaTarget), location: undefined, meaning: "疾病灾祸，意外伤害", detail: "灾煞主灾祸疾病，健康方面多加注意。" },
        { name: "孤辰", type: "凶", applicable: !!guChenTarget && pillars.some(p => p.zhi === guChenTarget), location: undefined, meaning: "性格孤僻，婚姻不顺", detail: "孤辰主孤独，性格内向，婚姻波折。" },
        { name: "寡宿", type: "凶", applicable: !!guaSuTarget && pillars.some(p => p.zhi === guaSuTarget), location: undefined, meaning: "孤单寂寞，感情波折", detail: "寡宿主孤单，感情之路波折多。" },
        { name: "亡神", type: "凶", applicable: !!wangShenTarget && pillars.some(p => p.zhi === wangShenTarget), location: undefined, meaning: "心神不宁，意外灾祸", detail: "亡神主心神不宁，易有惊险意外之事。" },
        { name: "元辰", type: "凶", applicable: !!yuanChenTarget && pillars.some(p => p.zhi === yuanChenTarget), location: undefined, meaning: "运势反复，事多阻碍", detail: "元辰为凶煞，主运势反复，谋事难成。" },
        { name: "勾绞", type: "凶", applicable: gouJiaoTargets.some(t => pillars.some(p => p.zhi === t)), location: undefined, meaning: "口舌是非，官非纠纷", detail: "勾绞主是非纠缠，易有口舌官司。" },
        { name: "丧门", type: "凶", applicable: pillars.some(p => p.zhi === sangMenTarget), location: undefined, meaning: "孝服悲伤，家运不宁", detail: "丧门主悲伤之事，注意长辈健康。" },
        { name: "吊客", type: "凶", applicable: pillars.some(p => p.zhi === diaoKeTarget), location: undefined, meaning: "吊唁送葬，宜慎出行", detail: "吊客主哀伤之事，慎行吊唁。" },
        { name: "病符", type: "凶", applicable: pillars.some(p => p.zhi === bingFuTarget), location: undefined, meaning: "疾病缠身，身体欠安", detail: "病符主疾病，身体较弱，注意养生。" },
        { name: "死符", type: "凶", applicable: pillars.some(p => p.zhi === siFuTarget), location: undefined, meaning: "灾祸临身，谨防意外", detail: "死符主意外灾祸，避免高危活动。" },
        { name: "岁破", type: "凶", applicable: pillars.some(p => p.zhi === suiPoTarget), location: undefined, meaning: "冲犯太岁，诸事不顺", detail: "岁破冲撞太岁，运势动荡不定。" },
        { name: "小耗", type: "凶", applicable: pillars.some(p => p.zhi === xiaoHaoTarget), location: undefined, meaning: "钱财损耗，破财消灾", detail: "小耗主钱财损耗，谨慎理财。" },
        { name: "大耗", type: "凶", applicable: pillars.some(p => p.zhi === daHaoTarget), location: undefined, meaning: "大破钱财，倾家荡产", detail: "大耗主重大破财，谨防投资损失。" },
        { name: "白虎", type: "凶", applicable: pillars.some(p => p.zhi === baiHuTarget), location: undefined, meaning: "血光之灾，意外伤害", detail: "白虎主血光之灾，谨防意外伤害。" },
        { name: "天狗", type: "凶", applicable: pillars.some(p => p.zhi === tianGouTarget), location: undefined, meaning: "口舌是非，意外灾害", detail: "天狗主口舌是非，出行谨慎。" },
        { name: "卷舌", type: "凶", applicable: pillars.some(p => p.zhi === juanSheTarget), location: undefined, meaning: "口舌官司，言语纷争", detail: "卷舌主口舌之争，易因言语招祸。" },
        { name: "血刃", type: "凶", applicable: !!xueRenTarget && pillars.some(p => p.zhi === xueRenTarget), location: undefined, meaning: "血光之灾，手术外伤", detail: "血刃主血光之灾，需防手术外伤。" },
        { name: "血支", type: "凶", applicable: !!xueZhiTarget && pillars.some(p => p.zhi === xueZhiTarget), location: undefined, meaning: "血光星，防意外受伤", detail: "血支主血光，避免危险活动。" },
        { name: "天罗", type: "凶", applicable: pillars.some(p => isTianLuo(p.zhi)), location: undefined, meaning: "命运困顿，有志难伸", detail: "天罗为命中困局，主有志难伸。" },
        { name: "地网", type: "凶", applicable: pillars.some(p => isDiWang(p.zhi)), location: undefined, meaning: "陷入困境，进退维谷", detail: "地网主陷入困境，进退两难。" },
        { name: "流霞", type: "凶", applicable: !!liuXiaTarget && pillars.some(p => p.zhi === liuXiaTarget), location: undefined, meaning: "男忌酒色，女忌产厄", detail: "流霞男主酒色之灾，女主产厄。" },
        { name: "六厄", type: "凶", applicable: !!liuETarget && pillars.some(p => p.zhi === liuETarget), location: undefined, meaning: "困顿潦倒，事业受阻", detail: "六厄主困顿，事业多阻碍。" },
        { name: "破碎", type: "凶", applicable: !!poSuiTarget && pillars.some(p => p.zhi === poSuiTarget), location: undefined, meaning: "好事易破，劳而无功", detail: "破碎主好事易破，劳而无功。" },
        { name: "五鬼", type: "凶", applicable: !!wuGuiTarget && pillars.some(p => p.zhi === wuGuiTarget), location: undefined, meaning: "小人作祟，是非不断", detail: "五鬼主小人作祟，是非不断。" },
        { name: "天哭", type: "凶", applicable: pillars.some(p => p.zhi === tianKuTarget), location: undefined, meaning: "悲伤哭泣，忧愁烦恼", detail: "天哭主悲伤之事，一生多忧愁。" },
        { name: "天虚", type: "凶", applicable: pillars.some(p => p.zhi === tianXuTarget), location: undefined, meaning: "空虚不实，好事落空", detail: "天虚主虚浮不实，好事易落空。" },
        { name: "官符", type: "凶", applicable: pillars.some(p => p.zhi === guanFuTarget), location: undefined, meaning: "官非诉讼，牢狱之灾", detail: "官符主管司诉讼，须遵纪守法。" },
        { name: "天火", type: "凶", applicable: !!tianHuoTarget && pillars.some(p => p.zhi === tianHuoTarget), location: undefined, meaning: "火灾隐患，防烧烫伤", detail: "天火主火险，需注意防火。" },
        { name: "天狱", type: "凶", applicable: !!tianYuTarget && pillars.some(p => p.zhi === tianYuTarget), location: undefined, meaning: "牢狱官非之象", detail: "天狱主牢狱之灾，行事需谨慎。" },
        { name: "天贼", type: "凶", applicable: !!tianZeiTarget && pillars.some(p => p.zhi === tianZeiTarget), location: undefined, meaning: "盗贼失窃，财物宜慎", detail: "天贼主失窃被盗，注意财物安全。" },
        { name: "浮沉", type: "凶", applicable: !!fuChenTarget && pillars.some(p => p.zhi === fuChenTarget), location: undefined, meaning: "机运浮沉，事业起落", detail: "浮沉主运势起伏不定，人生大起大落。" },
        { name: "天厄", type: "凶", applicable: !!tianETarget && pillars.some(p => p.zhi === tianETarget), location: undefined, meaning: "天降灾厄，诸多不顺", detail: "天厄主天降之灾，需有应对变故的准备。" },
      ],
    },
    {
      name: "桃花类",
      items: [
        { name: "桃花/咸池", type: "中性", applicable: !!taoHuaTarget && pillars.some(p => p.zhi === taoHuaTarget), location: undefined, meaning: "多情风流，异性缘旺", detail: "桃花主异性缘分，魅力十足，但需防感情纠葛。" },
        { name: "墙内桃花", type: "吉", applicable: (() => { const t = taoHuaTarget; if (!t) return false; const pp = pillars.find(p => p.zhi === t); return !!pp && (pp.key === "年柱" || pp.key === "日柱"); })(), location: undefined, meaning: "夫妻恩爱，感情专一", detail: "墙内桃花主夫妻感情好，婚姻美满。" },
        { name: "墙外桃花", type: "凶", applicable: (() => { const t = taoHuaTarget; if (!t) return false; const pp = pillars.find(p => p.zhi === t); return !!pp && (pp.key === "月柱" || pp.key === "时柱"); })(), location: undefined, meaning: "多情外向，感情复杂", detail: "墙外桃花主感情复杂，易生纠葛。" },
        { name: "滚浪桃花", type: "凶", applicable: (() => { const t = taoHuaTarget; if (!t || !["子","午","卯","酉"].includes(t)) return false; const pp = pillars.find(p => p.zhi === t); return !!pp && pp.key === "时柱"; })(), location: "时柱", meaning: "情欲旺盛，易因色生灾", detail: "滚浪桃花乃桃花之极，易因感情招灾。" },
        { name: "遍野桃花", type: "凶", applicable: (() => { const t = taoHuaTarget; if (!t) return false; return pillars.filter(p => p.zhi === t).length >= 2; })(), location: undefined, meaning: "桃花过旺，情路坎坷", detail: "遍野桃花为桃花泛滥，感情之路复杂。" },
        { name: "红艳煞", type: "中性", applicable: !!hongYanTarget && pillars.some(p => p.zhi === hongYanTarget), location: undefined, meaning: "多情善感，易为情困", detail: "红艳煞主多情善感，易为情所困。" },
      ],
    },
    {
      name: "驿马类",
      items: [
        { name: "驿马", type: "中性", applicable: !!yiMaTarget && pillars.some(p => p.zhi === yiMaTarget), location: undefined, meaning: "奔波行动，多动少静", detail: "驿马主奔波变动，适合向外发展。" },
        { name: "栏外马", type: "凶", applicable: (() => { if (!yiMaTarget) return false; const c = ZHI[(ZHI.indexOf(yiMaTarget) + 6) % 12]; return pillars.some(p => p.zhi === c); })(), location: undefined, meaning: "奔波劳碌，出外发展", detail: "栏外马为驿马被冲，主奔波劳碌在外。" },
        { name: "天马", type: "吉", applicable: !!tianMaTarget && pillars.some(p => p.zhi === tianMaTarget), location: undefined, meaning: "出行顺利，变动有利", detail: "天马为吉动之星，远行顺利。" },
        { name: "攀鞍", type: "吉", applicable: !!panAnTarget && pillars.some(p => p.zhi === panAnTarget), location: undefined, meaning: "前程似锦，步步高升", detail: "攀鞍主前程似锦，事业有进展。" },
      ],
    },
    {
      name: "贵人变体",
      items: [
        { name: "天乙贵人", type: "吉", applicable: tianYiTargets.some(t => pillars.some(p => p.zhi === t)), location: undefined, meaning: "第一吉神，遇难呈祥", detail: "天乙贵人为命理最高贵人之星。" },
        { name: "太极贵人", type: "吉", applicable: taiJiTargets.some(t => pillars.some(p => p.zhi === t)), location: undefined, meaning: "智慧超群，好学深思", detail: "太极贵人主聪明好学，玄学缘分深厚。" },
        { name: "文昌贵人", type: "吉", applicable: !!wenChangTarget && pillars.some(p => p.zhi === wenChangTarget), location: undefined, meaning: "文采出众，学业顺利", detail: "文昌贵人文科吉星，考试顺利。" },
        { name: "学堂", type: "吉", applicable: !!xueTangTarget && pillars.some(p => p.zhi === xueTangTarget), location: undefined, meaning: "学业有成，智慧超群", detail: "学堂为学习之星，学术领域易有成就。" },
        { name: "词馆", type: "吉", applicable: !!ciGuanTarget && pillars.some(p => p.zhi === ciGuanTarget), location: undefined, meaning: "文采飞扬，学问渊博", detail: "词馆为文辞之星，善于表达学问渊博。" },
        { name: "天官贵人", type: "吉", applicable: !!tianGuanTarget && pillars.some(p => p.zhi === tianGuanTarget), location: undefined, meaning: "近贵得官，仕途顺遂", detail: "天官贵人主官运亨通，仕途顺遂。" },
        { name: "福星贵人", type: "吉", applicable: !!fuXingTarget && pillars.some(p => p.zhi === fuXingTarget), location: undefined, meaning: "福寿安康，一生少病", detail: "福星贵人主福寿安康，生活安逸。" },
      ],
    },
    {
      name: "空亡类",
      items: [
        { name: "旬空", type: "凶", applicable: xunKongPillars.length > 0, location: xunKongPillars.map(p => p.key).join("、"), meaning: "吉空不吉，凶空更凶", detail: "旬空主空虚不实，吉神逢空减力。" },
        { name: "截路空亡", type: "凶", applicable: jieLuTargets.includes(shiZhi), location: "时柱", meaning: "行路受阻，所求难成", detail: "截路空亡主做事受阻，谋事难成。" },
        { name: "四大空亡", type: "凶", applicable: !!SI_DA_KONG[nianGanZhi], location: "年柱", meaning: "五行不全，先天不足", detail: "四大空亡主五行不全，先天缺某种能量。" },
      ],
    },
    {
      name: "流年神煞",
      items: [
        { name: "太岁", type: "中性", applicable: true, location: "年柱", meaning: "年柱值太岁，运势起伏", detail: "太岁为一年之主宰，主当年运势起伏。" },
        { name: "岁破", type: "凶", applicable: pillars.some(p => p.zhi === suiPoTarget), location: undefined, meaning: "冲犯太岁，诸事不顺", detail: "岁破冲撞太岁，运势动荡不定。" },
        { name: "太阳", type: "吉", applicable: pillars.some(p => p.zhi === getTaiYang(nianZhi)), location: undefined, meaning: "光明吉庆，贵人相助", detail: "太阳为吉星，主光明磊落，贵人相助。" },
        { name: "太阴", type: "中性", applicable: pillars.some(p => p.zhi === getTaiYin(nianZhi)), location: undefined, meaning: "阴柔含蓄，宜静不宜动", detail: "太阴主阴柔之事，宜静不宜动。" },
        { name: "丧门", type: "凶", applicable: pillars.some(p => p.zhi === sangMenTarget), location: undefined, meaning: "孝服悲伤，家运不宁", detail: "丧门主悲伤之事，注意长辈健康。" },
                { name: "白虎", type: "凶", applicable: pillars.some(p => p.zhi === baiHuTarget), location: undefined, meaning: "血光之灾，意外伤害", detail: "白虎主血光之灾，谨防意外伤害。" },
        { name: "病符", type: "凶", applicable: pillars.some(p => p.zhi === bingFuTarget), location: undefined, meaning: "疾病缠身，身体欠安", detail: "病符主疾病，身体较弱注意养生。" },
        { name: "死符", type: "凶", applicable: pillars.some(p => p.zhi === siFuTarget), location: undefined, meaning: "灾祸临身，谨防意外", detail: "死符主意外灾祸，避免高危活动。" },
        { name: "官符", type: "凶", applicable: pillars.some(p => p.zhi === guanFuTarget), location: undefined, meaning: "官非诉讼，牢狱之灾", detail: "官符主管司诉讼，须遵纪守法。" },
      ],
    },
    {
      name: "禄马类",
      items: [
        { name: "禄神", type: "吉", applicable: !!luTarget && pillars.some(p => p.zhi === luTarget), location: undefined, meaning: "食禄丰足，生活无忧", detail: "禄神为食禄之星，主衣食丰足。" },
        { name: "驿马", type: "中性", applicable: !!yiMaTarget && pillars.some(p => p.zhi === yiMaTarget), location: undefined, meaning: "奔波行动，多动少静", detail: "驿马主奔波变动，适合向外发展。" },
        { name: "禄马交驰", type: "吉", applicable: checkLuMaJiaoChi(riGan, riZhi, riGanZhi), location: "日柱", meaning: "禄马同宫，富贵双全", detail: "禄马交驰为富贵之格，财官双美。" },
        { name: "禄马同乡", type: "吉", applicable: checkLuMaTongXiang(riGanZhi), location: "日柱", meaning: "福禄双全，富贵之命", detail: "禄马同乡乃富贵双全之象。" },
      ],
    },
    {
      name: "六亲相关",
      items: [
        { name: "红鸾", type: "吉", applicable: !!hongLuanTarget && pillars.some(p => p.zhi === hongLuanTarget), location: undefined, meaning: "桃花星，婚恋吉兆", detail: "红鸾为婚恋喜星，婚姻美满。" },
        { name: "天喜", type: "吉", applicable: !!tianXiTarget && pillars.some(p => p.zhi === tianXiTarget), location: undefined, meaning: "喜事临门，婚姻美满", detail: "天喜为喜庆之星，家庭幸福。" },
        { name: "桃花/咸池", type: "中性", applicable: !!taoHuaTarget && pillars.some(p => p.zhi === taoHuaTarget), location: undefined, meaning: "多情风流，异性缘旺", detail: "桃花主异性缘分，魅力十足。" },
        { name: "寡宿", type: "凶", applicable: !!guaSuTarget && pillars.some(p => p.zhi === guaSuTarget), location: undefined, meaning: "孤单寂寞，感情波折", detail: "寡宿主孤单，感情波折多。" },
        { name: "孤辰", type: "凶", applicable: !!guChenTarget && pillars.some(p => p.zhi === guChenTarget), location: undefined, meaning: "性格孤僻，婚姻不顺", detail: "孤辰主孤独，婚姻不顺。" },
        { name: "阴错", type: "凶", applicable: YIN_CUO.has(riGanZhi), location: "日柱", meaning: "阴阳差错，婚姻不利", detail: "阴错日生，婚姻感情易有波折。" },
        { name: "阳差", type: "凶", applicable: YANG_CHA.has(riGanZhi), location: "日柱", meaning: "阴阳差错，感情波折", detail: "阳差日生，感情之路波折多。" },
        { name: "孤鸾", type: "凶", applicable: GU_LUAN.has(riGanZhi), location: "日柱", meaning: "婚姻不顺，夫妻缘薄", detail: "孤鸾日生，夫妻缘分浅薄。" },
        { name: "八专", type: "凶", applicable: BA_ZHUAN.has(riGanZhi), location: "日柱", meaning: "感情复杂，易陷情网", detail: "八专日生，感情丰富复杂。" },
        { name: "九丑", type: "凶", applicable: JIU_CHOU.has(riGanZhi), location: "日柱", meaning: "品貌不佳，人缘较差", detail: "九丑日生，人际关系需多努力。" },
      ],
    },
    {
      name: "事业相关",
      items: [
        { name: "将星", type: "吉", applicable: !!jiangXingTarget && pillars.some(p => p.zhi === jiangXingTarget), location: undefined, meaning: "领导力强，权威显赫", detail: "将星为权威之星，团队核心。" },
        { name: "华盖", type: "吉", applicable: !!huaGaiTarget && pillars.some(p => p.zhi === huaGaiTarget), location: undefined, meaning: "聪慧孤独，利于艺术学术", detail: "华盖主孤独与才华，有艺术天赋。" },
        { name: "金舆", type: "吉", applicable: !!jinYuTarget && pillars.some(p => p.zhi === jinYuTarget), location: undefined, meaning: "富足安乐，衣食丰盛", detail: "金舆为富贵之星，出身富贵。" },
        { name: "太极贵人", type: "吉", applicable: taiJiTargets.some(t => pillars.some(p => p.zhi === t)), location: undefined, meaning: "智慧超群，好学深思", detail: "太极贵人主聪明好学，玄学缘分。" },
        { name: "文昌贵人", type: "吉", applicable: !!wenChangTarget && pillars.some(p => p.zhi === wenChangTarget), location: undefined, meaning: "文采出众，学业顺利", detail: "文昌贵人文科吉星，考试顺利。" },
        { name: "国印贵人", type: "吉", applicable: !!guoYinTarget && pillars.some(p => p.zhi === guoYinTarget), location: undefined, meaning: "掌握权印，诚信可靠", detail: "国印贵人主掌权柄，适合公职。" },
        { name: "天厨贵人", type: "吉", applicable: !!tianChuTarget && pillars.some(p => p.zhi === tianChuTarget), location: undefined, meaning: "衣食丰足，安享其成", detail: "天厨贵人主美食福禄，不愁吃穿。" },
        { name: "魁罡", type: "吉", applicable: isKuiGang(riGan, riZhi), location: "日柱", meaning: "聪明果敢，刚毅决断", detail: "魁罡格，聪明果敢有领袖气质。" },
        { name: "科名星", type: "吉", applicable: keMingTargets.some(t => pillars.some(p => p.zhi === t)), location: undefined, meaning: "科考成名，事业有成", detail: "科名星主管科举功名。" },
        { name: "禄神", type: "吉", applicable: !!luTarget && pillars.some(p => p.zhi === luTarget), location: undefined, meaning: "食禄丰足，生活无忧", detail: "禄神为食禄之星，财运稳定。" },
      ],
    },
    {
      name: "健康相关",
      items: [
        { name: "血刃", type: "凶", applicable: !!xueRenTarget && pillars.some(p => p.zhi === xueRenTarget), location: undefined, meaning: "血光之灾，手术外伤", detail: "血刃主血光之灾，需防手术外伤。" },
        { name: "白虎", type: "凶", applicable: pillars.some(p => p.zhi === baiHuTarget), location: undefined, meaning: "血光之灾，意外伤害", detail: "白虎主血光之灾，谨防意外伤害。" },
        { name: "丧门", type: "凶", applicable: pillars.some(p => p.zhi === sangMenTarget), location: undefined, meaning: "孝服悲伤，家运不宁", detail: "丧门主悲伤之事，注意长辈健康。" },
        { name: "吊客", type: "凶", applicable: pillars.some(p => p.zhi === diaoKeTarget), location: undefined, meaning: "吊唁送葬，宜慎出行", detail: "吊客主哀伤之事，慎行吊唁。" },
        { name: "病符", type: "凶", applicable: pillars.some(p => p.zhi === bingFuTarget), location: undefined, meaning: "疾病缠身，身体欠安", detail: "病符主疾病，身体较弱注意养生。" },
        { name: "死符", type: "凶", applicable: pillars.some(p => p.zhi === siFuTarget), location: undefined, meaning: "灾祸临身，谨防意外", detail: "死符主意外灾祸，避免高危活动。" },
        { name: "天火", type: "凶", applicable: !!tianHuoTarget && pillars.some(p => p.zhi === tianHuoTarget), location: undefined, meaning: "火灾隐患，防烧烫伤", detail: "天火主火险，需注意防火防烫。" },
        { name: "血支", type: "凶", applicable: !!xueZhiTarget && pillars.some(p => p.zhi === xueZhiTarget), location: undefined, meaning: "血光星，防意外受伤", detail: "血支主血光，避免危险活动。" },
        { name: "流霞", type: "凶", applicable: !!liuXiaTarget && pillars.some(p => p.zhi === liuXiaTarget), location: undefined, meaning: "男忌酒色，女忌产厄", detail: "流霞男主酒色之灾，女主产厄。" },
      ],
    },
    {
      name: "特殊吉格",
      items: [
        { name: "禄马同乡", type: "吉", applicable: checkLuMaTongXiang(riGanZhi), location: "日柱", meaning: "福禄双全，富贵之命", detail: "禄马同乡乃富贵双全之象。" },
        { name: "禄马交驰", type: "吉", applicable: checkLuMaJiaoChi(riGan, riZhi, riGanZhi), location: "日柱", meaning: "禄马同宫，富贵双全", detail: "禄马交驰为富贵之格，财官双美。" },
        { name: "魁罡", type: "吉", applicable: isKuiGang(riGan, riZhi), location: "日柱", meaning: "聪明果敢，刚毅决断", detail: "魁罡格，聪明果敢有领袖气质。" },
        { name: "金神", type: "吉", applicable: !!JIN_SHEN_NA_YIN[riGanZhi], location: "日柱", meaning: "刚毅果断，事业心强", detail: "金神入命，刚毅果断有开创精神。" },
        { name: "三奇贵人", type: "吉", applicable: sanQi !== null, location: "全局", meaning: "三奇拱照，大富大贵", detail: "三奇贵人乃天地精华汇聚。" },
        { name: "天赦", type: "吉", applicable: isTianShe(riGan, riZhi, yueZhi), location: "日柱", meaning: "逢凶化吉，百事无忧", detail: "天赦日生，乃天地赦免之日。" },
        { name: "六秀", type: "吉", applicable: LIU_XIU.has(riGanZhi), location: "日柱", meaning: "聪明秀气，才华出众", detail: "六秀日生，聪明秀气才华出众。" },
        { name: "日德", type: "吉", applicable: RI_DE.has(riGanZhi), location: "日柱", meaning: "品德高尚，人缘极佳", detail: "日德为德星入命，为人宽厚。" },
      ],
    },
    {
      name: "特殊凶格",
      items: [
        { name: "天罗地网", type: "凶", applicable: pillars.some(p => isTianLuo(p.zhi) || isDiWang(p.zhi)), location: undefined, meaning: "命运困顿，进退维谷", detail: "天罗地网主命运困顿，有志难伸。" },
        { name: "孤辰寡宿", type: "凶", applicable: (!!guChenTarget && pillars.some(p => p.zhi === guChenTarget)) || (!!guaSuTarget && pillars.some(p => p.zhi === guaSuTarget)), location: undefined, meaning: "孤单寂寞，婚姻不顺", detail: "孤辰寡宿主孤独，感情婚姻不顺。" },
        { name: "劫煞亡神同现", type: "凶", applicable: (!!jieShaTarget && pillars.some(p => p.zhi === jieShaTarget)) && (!!wangShenTarget && pillars.some(p => p.zhi === wangShenTarget)), location: undefined, meaning: "灾祸并至，大凶之兆", detail: "劫煞与亡神同现，灾祸叠加。" },
        { name: "十恶大败", type: "凶", applicable: SHI_E_DA_BAI.has(riGanZhi), location: "日柱", meaning: "钱财不聚，破败连连", detail: "十恶大败日生，钱财难聚。" },
        { name: "阴差阳错", type: "凶", applicable: YIN_CUO.has(riGanZhi) || YANG_CHA.has(riGanZhi), location: "日柱", meaning: "阴阳差错，婚姻不利", detail: "阴差阳错日生，婚姻不顺。" },
        { name: "四废", type: "凶", applicable: isSiFei(riGanZhi, yueZhi), location: "日柱", meaning: "万事不顺，有志难伸", detail: "四废日生，五行气衰，万事不顺。" },
        { name: "孤鸾", type: "凶", applicable: GU_LUAN.has(riGanZhi), location: "日柱", meaning: "婚姻不顺，夫妻缘薄", detail: "孤鸾日生，夫妻缘分浅薄。" },
      ],
    },
    {
      name: "综合",
      items: [
        { name: "十恶大败", type: "凶", applicable: SHI_E_DA_BAI.has(riGanZhi), location: "日柱", meaning: "钱财不聚，破败连连", detail: "十恶大败日生，钱财难聚。" },
        { name: "阴差阳错", type: "凶", applicable: YIN_CUO.has(riGanZhi) || YANG_CHA.has(riGanZhi), location: "日柱", meaning: "婚姻不利，感情波折", detail: "阴差阳错日生，婚姻不顺。" },
        { name: "八专", type: "凶", applicable: BA_ZHUAN.has(riGanZhi), location: "日柱", meaning: "感情复杂，易陷情网", detail: "八专日生，感情丰富复杂。" },
        { name: "九丑", type: "凶", applicable: JIU_CHOU.has(riGanZhi), location: "日柱", meaning: "品貌不佳，人缘较差", detail: "九丑日生，人际关系需多努力。" },
        { name: "四废", type: "凶", applicable: isSiFei(riGanZhi, yueZhi), location: "日柱", meaning: "万事不顺，有志难伸", detail: "四废日生，五行气衰万事不顺。" },
        { name: "孤鸾", type: "凶", applicable: GU_LUAN.has(riGanZhi), location: "日柱", meaning: "婚姻不顺，夫妻缘薄", detail: "孤鸾日生，夫妻缘分浅薄。" },
        { name: "截路空亡", type: "凶", applicable: jieLuTargets.includes(shiZhi), location: "时柱", meaning: "行路受阻，所求难成", detail: "截路空亡主做事受阻谋事难成。" },
        { name: "埋儿煞", type: "凶", applicable: getMaiEr(shiZhi, yueZhi), location: "时柱", meaning: "不利子息，生育宜慎", detail: "埋儿煞不利子女，子女缘分薄。" },
        { name: "截路煞", type: "凶", applicable: isJieLuSha(riGan, shiZhi), location: "时柱", meaning: "中途阻滞，难得善终", detail: "截路煞主人到中年事业遇阻。" },
        { name: "短寿煞", type: "凶", applicable: isDuanShou(riGan, riZhi), location: "日柱", meaning: "健康堪忧，珍惜身体", detail: "短寿煞主健康有忧，注重养生。" },
        { name: "暗金煞", type: "凶", applicable: anJinTargets.includes(riZhi), location: "日柱", meaning: "暗藏凶险，谨防意外", detail: "暗金煞暗藏凶险，防金属伤害。" },
        { name: "扫帚煞", type: "凶", applicable: !!saoZhouTarget && pillars.some(p => p.zhi === saoZhouTarget), location: undefined, meaning: "扫除家财，败家之象", detail: "扫帚煞主败家，钱财难聚。" },
        { name: "月厌", type: "凶", applicable: !!yueYanTarget && pillars.some(p => p.zhi === yueYanTarget), location: undefined, meaning: "月令不调，诸事不宜", detail: "月厌为月中凶神，宜静不宜动。" },
        { name: "三丘", type: "凶", applicable: !!sanQiuTarget && pillars.some(p => p.zhi === sanQiuTarget), location: undefined, meaning: "丧事悲愁，家运不宁", detail: "三丘主丧事悲愁，家运波折。" },
        { name: "五墓", type: "凶", applicable: !!wuMuTarget && pillars.some(p => p.zhi === wuMuTarget), location: undefined, meaning: "墓库之气，运势闭塞", detail: "五墓主运势闭塞，诸多不顺。" },
      ],
    },
  ];

  // 计算统计
  let total = 0;
  let jiCount = 0;
  let xiongCount = 0;
  for (const cat of categories) {
    for (const item of cat.items) {
      if (item.applicable) {
        total++;
        if (item.type === "吉") jiCount++;
        else if (item.type === "凶") xiongCount++;
      }
    }
  }

  // 构建 box-drawing 摘要
  const lines: string[] = [
    `┌─ 神煞大全 ─────────────────`,
    `│ 日柱：${riGanZhi} 共查得 ${total} 个神煞（吉${jiCount} · 凶${xiongCount}）`,
  ];

  for (const cat of categories) {
    const active = cat.items.filter(it => it.applicable);
    if (active.length === 0) continue;
    lines.push(`│`);
    lines.push(`├─ ${cat.name} ───────────────────`);
    for (const item of active) {
      const icon = item.type === "吉" ? "○" : "△";
      const loc = item.location ? `（${item.location}）` : "";
      lines.push(`│ ${icon} ${item.name.padEnd(8, " ")} ${loc.padEnd(8, " ")} ${item.meaning}`);
    }
  }

  lines.push(`│`);
  lines.push(`├─ 古籍出处 ──────────────────`);
  lines.push(`│ 《三命通会》—— 明·万民英，卷三·神煞篇最详备系统`);
  lines.push(`│ 《渊海子平》—— 宋·徐大升，论神煞吉凶`);
  lines.push(`│ 《五行精纪》—— 宋·廖中，专论神煞之古本`);
  lines.push(`│ 《星平会海》—— 明·杨淙，星命神煞综合体系`);
  lines.push(`│ 「吉神为福，凶煞为祸，煞有制化为权」——三命通会`);
  lines.push(`│`);
  lines.push(`└─ 命理提示 ──────────────────`);
  lines.push(`   神煞以日柱为主参断，须结合格局旺衰用神。`);
  lines.push(`   吉神被克不吉，凶煞受制不凶，不可一见凶煞便惊。`);
  lines.push(`   共查${total}个命局神煞，仅供参考，非定论也。`);
  const boxSummary = lines.join("\n");

  return {
    summary: { total, jiCount, xiongCount },
    categories,
    boxSummary,
  } as ShenShaDaQuanResult & { boxSummary: string };
}
