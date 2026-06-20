// ── 六爻纳甲计算引擎 ──
// 算法参考：《卜筮正宗》《增删卜易》《火珠林》
// 输入卦序号 1-64，输出完整纳甲数据（纳甲干支、六亲、世应、卦身）
// 每卦六爻纳甲按上下卦各自所属八卦的纳甲规则计算，非简单复用纯卦数据

import type { LiuYaoNaJiaResult, NaJiaLine } from "@guoxue/shared";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

// ===== 常量定义 =====

/** 八宫五行 */
const GONG_WU_XING: Record<string, string> = {
  "乾宫": "金",
  "兑宫": "金",
  "离宫": "火",
  "震宫": "木",
  "巽宫": "木",
  "坎宫": "水",
  "艮宫": "土",
  "坤宫": "土",
};

/** 64 卦完整数据（序号 1-64） */
interface GuaEntry {
  number: number;
  name: string;
  symbol: string;
  upper: string;
  lower: string;
  gong: string;
  shiYao: number;
  yingYao: number;
}

const GUA_DB: GuaEntry[] = [
  // ── 1 乾宫（金）──
  { number: 1, name: "乾为天", symbol: "䷀", upper: "乾", lower: "乾", gong: "乾宫", shiYao: 6, yingYao: 3 },
  { number: 2, name: "天风姤", symbol: "䷫", upper: "乾", lower: "巽", gong: "乾宫", shiYao: 1, yingYao: 4 },
  { number: 3, name: "天山遁", symbol: "䷠", upper: "乾", lower: "艮", gong: "乾宫", shiYao: 2, yingYao: 5 },
  { number: 4, name: "天地否", symbol: "䷋", upper: "乾", lower: "坤", gong: "乾宫", shiYao: 3, yingYao: 6 },
  { number: 5, name: "风地观", symbol: "䷓", upper: "巽", lower: "坤", gong: "乾宫", shiYao: 4, yingYao: 1 },
  { number: 6, name: "山地剥", symbol: "䷖", upper: "艮", lower: "坤", gong: "乾宫", shiYao: 5, yingYao: 2 },
  { number: 7, name: "火地晋", symbol: "䷢", upper: "离", lower: "坤", gong: "乾宫", shiYao: 4, yingYao: 1 },
  { number: 8, name: "火天大有", symbol: "䷍", upper: "离", lower: "乾", gong: "乾宫", shiYao: 3, yingYao: 6 },
  // ── 2 兑宫（金）──
  { number: 9, name: "兑为泽", symbol: "䷹", upper: "兑", lower: "兑", gong: "兑宫", shiYao: 6, yingYao: 3 },
  { number: 10, name: "泽水困", symbol: "䷮", upper: "兑", lower: "坎", gong: "兑宫", shiYao: 1, yingYao: 4 },
  { number: 11, name: "泽地萃", symbol: "䷬", upper: "兑", lower: "坤", gong: "兑宫", shiYao: 2, yingYao: 5 },
  { number: 12, name: "泽山咸", symbol: "䷞", upper: "兑", lower: "艮", gong: "兑宫", shiYao: 3, yingYao: 6 },
  { number: 13, name: "水山蹇", symbol: "䷦", upper: "坎", lower: "艮", gong: "兑宫", shiYao: 4, yingYao: 1 },
  { number: 14, name: "地山谦", symbol: "䷎", upper: "坤", lower: "艮", gong: "兑宫", shiYao: 5, yingYao: 2 },
  { number: 15, name: "雷山小过", symbol: "䷽", upper: "震", lower: "艮", gong: "兑宫", shiYao: 4, yingYao: 1 },
  { number: 16, name: "雷泽归妹", symbol: "䷵", upper: "震", lower: "兑", gong: "兑宫", shiYao: 3, yingYao: 6 },
  // ── 3 离宫（火）──
  { number: 17, name: "离为火", symbol: "䷝", upper: "离", lower: "离", gong: "离宫", shiYao: 6, yingYao: 3 },
  { number: 18, name: "火山旅", symbol: "䷷", upper: "离", lower: "艮", gong: "离宫", shiYao: 1, yingYao: 4 },
  { number: 19, name: "火风鼎", symbol: "䷱", upper: "离", lower: "巽", gong: "离宫", shiYao: 2, yingYao: 5 },
  { number: 20, name: "火水未济", symbol: "䷿", upper: "离", lower: "坎", gong: "离宫", shiYao: 3, yingYao: 6 },
  { number: 21, name: "山水蒙", symbol: "䷃", upper: "艮", lower: "坎", gong: "离宫", shiYao: 4, yingYao: 1 },
  { number: 22, name: "风水涣", symbol: "䷺", upper: "巽", lower: "坎", gong: "离宫", shiYao: 5, yingYao: 2 },
  { number: 23, name: "天水讼", symbol: "䷅", upper: "乾", lower: "坎", gong: "离宫", shiYao: 4, yingYao: 1 },
  { number: 24, name: "天火同人", symbol: "䷌", upper: "乾", lower: "离", gong: "离宫", shiYao: 3, yingYao: 6 },
  // ── 4 震宫（木）──
  { number: 25, name: "震为雷", symbol: "䷲", upper: "震", lower: "震", gong: "震宫", shiYao: 6, yingYao: 3 },
  { number: 26, name: "雷地豫", symbol: "䷏", upper: "震", lower: "坤", gong: "震宫", shiYao: 1, yingYao: 4 },
  { number: 27, name: "雷水解", symbol: "䷧", upper: "震", lower: "坎", gong: "震宫", shiYao: 2, yingYao: 5 },
  { number: 28, name: "雷风恒", symbol: "䷟", upper: "震", lower: "巽", gong: "震宫", shiYao: 3, yingYao: 6 },
  { number: 29, name: "地风升", symbol: "䷭", upper: "坤", lower: "巽", gong: "震宫", shiYao: 4, yingYao: 1 },
  { number: 30, name: "水风井", symbol: "䷯", upper: "坎", lower: "巽", gong: "震宫", shiYao: 5, yingYao: 2 },
  { number: 31, name: "泽风大过", symbol: "䷛", upper: "兑", lower: "巽", gong: "震宫", shiYao: 4, yingYao: 1 },
  { number: 32, name: "泽雷随", symbol: "䷐", upper: "兑", lower: "震", gong: "震宫", shiYao: 3, yingYao: 6 },
  // ── 5 巽宫（木）──
  { number: 33, name: "巽为风", symbol: "䷸", upper: "巽", lower: "巽", gong: "巽宫", shiYao: 6, yingYao: 3 },
  { number: 34, name: "风天小畜", symbol: "䷈", upper: "巽", lower: "乾", gong: "巽宫", shiYao: 1, yingYao: 4 },
  { number: 35, name: "风火家人", symbol: "䷤", upper: "巽", lower: "离", gong: "巽宫", shiYao: 2, yingYao: 5 },
  { number: 36, name: "风雷益", symbol: "䷩", upper: "巽", lower: "震", gong: "巽宫", shiYao: 3, yingYao: 6 },
  { number: 37, name: "天雷无妄", symbol: "䷘", upper: "乾", lower: "震", gong: "巽宫", shiYao: 4, yingYao: 1 },
  { number: 38, name: "火雷噬嗑", symbol: "䷔", upper: "离", lower: "震", gong: "巽宫", shiYao: 5, yingYao: 2 },
  { number: 39, name: "山雷颐", symbol: "䷚", upper: "艮", lower: "震", gong: "巽宫", shiYao: 4, yingYao: 1 },
  { number: 40, name: "山风蛊", symbol: "䷑", upper: "艮", lower: "巽", gong: "巽宫", shiYao: 3, yingYao: 6 },
  // ── 6 坎宫（水）──
  { number: 41, name: "坎为水", symbol: "䷜", upper: "坎", lower: "坎", gong: "坎宫", shiYao: 6, yingYao: 3 },
  { number: 42, name: "水泽节", symbol: "䷻", upper: "坎", lower: "兑", gong: "坎宫", shiYao: 1, yingYao: 4 },
  { number: 43, name: "水雷屯", symbol: "䷂", upper: "坎", lower: "震", gong: "坎宫", shiYao: 2, yingYao: 5 },
  { number: 44, name: "水火既济", symbol: "䷾", upper: "坎", lower: "离", gong: "坎宫", shiYao: 3, yingYao: 6 },
  { number: 45, name: "泽火革", symbol: "䷰", upper: "兑", lower: "离", gong: "坎宫", shiYao: 4, yingYao: 1 },
  { number: 46, name: "雷火丰", symbol: "䷶", upper: "震", lower: "离", gong: "坎宫", shiYao: 5, yingYao: 2 },
  { number: 47, name: "地火明夷", symbol: "䷣", upper: "坤", lower: "离", gong: "坎宫", shiYao: 4, yingYao: 1 },
  { number: 48, name: "地水师", symbol: "䷆", upper: "坤", lower: "坎", gong: "坎宫", shiYao: 3, yingYao: 6 },
  // ── 7 艮宫（土）──
  { number: 49, name: "艮为山", symbol: "䷳", upper: "艮", lower: "艮", gong: "艮宫", shiYao: 6, yingYao: 3 },
  { number: 50, name: "山火贲", symbol: "䷕", upper: "艮", lower: "离", gong: "艮宫", shiYao: 1, yingYao: 4 },
  { number: 51, name: "山天大畜", symbol: "䷙", upper: "艮", lower: "乾", gong: "艮宫", shiYao: 2, yingYao: 5 },
  { number: 52, name: "山泽损", symbol: "䷨", upper: "艮", lower: "兑", gong: "艮宫", shiYao: 3, yingYao: 6 },
  { number: 53, name: "火泽睽", symbol: "䷥", upper: "离", lower: "兑", gong: "艮宫", shiYao: 4, yingYao: 1 },
  { number: 54, name: "天泽履", symbol: "䷉", upper: "乾", lower: "兑", gong: "艮宫", shiYao: 5, yingYao: 2 },
  { number: 55, name: "风泽中孚", symbol: "䷼", upper: "巽", lower: "兑", gong: "艮宫", shiYao: 4, yingYao: 1 },
  { number: 56, name: "风山渐", symbol: "䷴", upper: "巽", lower: "艮", gong: "艮宫", shiYao: 3, yingYao: 6 },
  // ── 8 坤宫（土）──
  { number: 57, name: "坤为地", symbol: "䷁", upper: "坤", lower: "坤", gong: "坤宫", shiYao: 6, yingYao: 3 },
  { number: 58, name: "地雷复", symbol: "䷗", upper: "坤", lower: "震", gong: "坤宫", shiYao: 1, yingYao: 4 },
  { number: 59, name: "地泽临", symbol: "䷒", upper: "坤", lower: "兑", gong: "坤宫", shiYao: 2, yingYao: 5 },
  { number: 60, name: "地天泰", symbol: "䷊", upper: "坤", lower: "乾", gong: "坤宫", shiYao: 3, yingYao: 6 },
  { number: 61, name: "雷天大壮", symbol: "䷡", upper: "震", lower: "乾", gong: "坤宫", shiYao: 4, yingYao: 1 },
  { number: 62, name: "泽天夬", symbol: "䷪", upper: "兑", lower: "乾", gong: "坤宫", shiYao: 5, yingYao: 2 },
  { number: 63, name: "水天需", symbol: "䷄", upper: "坎", lower: "乾", gong: "坤宫", shiYao: 4, yingYao: 1 },
  { number: 64, name: "水地比", symbol: "䷇", upper: "坎", lower: "坤", gong: "坤宫", shiYao: 3, yingYao: 6 },
];

/**
 * 八卦纳甲数据
 *
 * 规则：
 *   阳卦（乾震坎艮）内卦顺行，外卦隔一位顺行
 *   阴卦（坤巽离兑）内卦逆行，外卦隔一位逆行
 *
 *   乾：内纳甲(子寅辰) 外纳壬(午申戌)
 *   兑：纳丁，内巳卯丑，外亥酉未
 *   离：纳己，内卯丑亥，外酉未巳
 *   震：纳庚，内子寅辰，外午申戌
 *   巽：纳辛，内丑亥酉，外未巳卯
 *   坎：纳戊，内寅辰午，外申戌子
 *   艮：纳丙，内辰午申，外戌子寅
 *   坤：内纳乙(未巳卯) 外纳癸(丑亥酉)
 */
const TRIGRAM_NA_JIA: Record<string, { inner: string[]; outer: string[] }> = {
  "乾": { inner: ["甲子", "甲寅", "甲辰"], outer: ["壬午", "壬申", "壬戌"] },
  "兑": { inner: ["丁巳", "丁卯", "丁丑"], outer: ["丁亥", "丁酉", "丁未"] },
  "离": { inner: ["己卯", "己丑", "己亥"], outer: ["己酉", "己未", "己巳"] },
  "震": { inner: ["庚子", "庚寅", "庚辰"], outer: ["庚午", "庚申", "庚戌"] },
  "巽": { inner: ["辛丑", "辛亥", "辛酉"], outer: ["辛未", "辛巳", "辛卯"] },
  "坎": { inner: ["戊寅", "戊辰", "戊午"], outer: ["戊申", "戊戌", "戊子"] },
  "艮": { inner: ["丙辰", "丙午", "丙申"], outer: ["丙戌", "丙子", "丙寅"] },
  "坤": { inner: ["乙未", "乙巳", "乙卯"], outer: ["癸丑", "癸亥", "癸酉"] },
};

/** 地支五行 */
const ZHI_WU_XING: Record<string, string> = {
  "子": "水", "丑": "土", "寅": "木", "卯": "木",
  "辰": "土", "巳": "火", "午": "火", "未": "土",
  "申": "金", "酉": "金", "戌": "土", "亥": "水",
};

/**
 * 五行六亲关系（以卦宫五行为"我"）
 *
 *   生我 → 父母，我生 → 子孙
 *   克我 → 官鬼，我克 → 妻财
 *   同我 → 兄弟
 */
const WU_XING_REL: Record<string, Record<string, string>> = {
  "金": { "金": "兄弟", "水": "子孙", "木": "妻财", "火": "官鬼", "土": "父母" },
  "木": { "木": "兄弟", "火": "子孙", "土": "妻财", "金": "官鬼", "水": "父母" },
  "水": { "水": "兄弟", "木": "子孙", "火": "妻财", "土": "官鬼", "金": "父母" },
  "火": { "火": "兄弟", "土": "子孙", "金": "妻财", "水": "官鬼", "木": "父母" },
  "土": { "土": "兄弟", "金": "子孙", "水": "妻财", "木": "官鬼", "火": "父母" },
};

// ===== 辅助函数 =====

/** 从纳甲干支中提取地支 */
function extractZhi(naJia: string): string {
  return naJia[1] ?? "";
}

/** 根据爻位返回爻名 */
function lineName(pos: number): string {
  if (pos === 1) return "初爻";
  if (pos === 6) return "上爻";
  return ["二", "三", "四", "五"][pos - 2] + "爻";
}

/** 根据宫五行和地支获取六亲 */
function getLiuQin(gongWuXing: string, zhi: string): string {
  const zhiWuXing = ZHI_WU_XING[zhi] ?? "土";
  return WU_XING_REL[gongWuXing]?.[zhiWuXing] ?? "兄弟";
}

/**
 * 推算卦身（月卦身 / 世身）
 *
 * 阳世：子午初、丑未二、寅申三、卯酉四、辰戌五、巳亥六
 * 阴世：午子初、未丑二、申寅三、酉卯四、戌辰五、亥巳六
 *
 * 在世爻对应的分支对中寻找出现在各爻纳甲地支中的那一个，
 * 所在爻位即为卦身。
 */
function getGuaShen(
  lines: NaJiaLine[],
  shiPosition: number,
): { position: number; ganZhi: string; meaning: string } | null {
  const YANG_PAIRS: Record<number, string[]> = {
    1: ["子", "午"], 2: ["丑", "未"], 3: ["寅", "申"],
    4: ["卯", "酉"], 5: ["辰", "戌"], 6: ["巳", "亥"],
  };
  const YIN_PAIRS: Record<number, string[]> = {
    1: ["午", "子"], 2: ["未", "丑"], 3: ["申", "寅"],
    4: ["酉", "卯"], 5: ["戌", "辰"], 6: ["亥", "巳"],
  };

  const isYangShi = shiPosition % 2 === 1;
  const pairs = isYangShi ? YANG_PAIRS : YIN_PAIRS;
  const targetZhi = pairs[shiPosition];

  if (!targetZhi) return null;

  for (const line of lines) {
    const zhi = extractZhi(line.naJia);
    if (targetZhi.includes(zhi)) {
      return {
        position: line.position,
        ganZhi: line.naJia,
        meaning: `卦身为${line.naJia}，事体有归，问事有方向`,
      };
    }
  }

  // 卦身不现
  return null;
}

// ===== 主计算函数 =====

/**
 * 六爻纳甲计算
 *
 * @param input - 包含 guaNumber（1-64）的对象
 * @returns 完整纳甲结果
 * @throws 如果 guaNumber 无效则抛出错误
 */
export function calculateLiuYaoNaJia(input: Record<string, unknown>): LiuYaoNaJiaResult {
  const guaNumber = Number(input.guaNumber);
  if (!Number.isInteger(guaNumber) || guaNumber < 1 || guaNumber > 64) {
    throw new BusinessException(ErrorCode.VALIDATION_ERROR, `无效的卦序号：${String(input.guaNumber)}，须为 1-64 的整数`);
  }

  const gua = GUA_DB[guaNumber - 1];
  if (!gua) {
    throw new BusinessException(ErrorCode.VALIDATION_ERROR, `未找到卦序号 ${guaNumber} 的数据`);
  }

  const gongWuXing = GONG_WU_XING[gua.gong] ?? "土";

  // 根据上下卦各自的纳甲规则组装六爻纳甲
  const lowerNaJia = TRIGRAM_NA_JIA[gua.lower]?.inner ?? [];
  const upperNaJia = TRIGRAM_NA_JIA[gua.upper]?.outer ?? [];

  const allNaJia = [
    lowerNaJia[0], lowerNaJia[1], lowerNaJia[2],
    upperNaJia[0], upperNaJia[1], upperNaJia[2],
  ];

  const lines: NaJiaLine[] = allNaJia.map((naJia, idx) => {
    const position = idx + 1;
    const zhi = extractZhi(naJia);
    const liuQin = getLiuQin(gongWuXing, zhi);

    let shiYing: "世" | "应" | "" = "";
    if (position === gua.shiYao) shiYing = "世";
    else if (position === gua.yingYao) shiYing = "应";

    return {
      position,
      name: lineName(position),
      naJia,
      liuQin,
      shiYing,
    };
  });

  const guaShen = getGuaShen(lines, gua.shiYao);

  // 收集本卦中出现哪些六亲，去重后以顿号分隔
  const sixRelativesStr = [...new Set(lines.map((l) => l.liuQin))].join("、");

  const guaShenStr = guaShen ? `│ 卦身：${guaShen.ganZhi}（第${guaShen.position}爻）`.padEnd(36) + "│\n" : "│ 卦身：不现（伏藏）".padEnd(36) + "│\n";

  const summary = [
    "┌─ 六爻纳甲 ────────────────────────┐",
    `│ ${gua.name} ${gua.symbol}（第${gua.number}卦）`.padEnd(36) + "│",
    `│ 宫位：${gua.gong}  五行：${gongWuXing}`.padEnd(36) + "│",
    "├─ 纳甲六亲 ─────────────────────────┤",
    ...lines.map(l => `│ ${l.name}：${l.naJia}（${l.liuQin}）${l.shiYing}`.padEnd(36) + "│"),
    "├─ 信息汇总 ─────────────────────────┤",
    `│ 世爻：第${gua.shiYao}爻  应爻：第${gua.yingYao}爻`.padEnd(36) + "│",
    guaShenStr.slice(0, -1) || "",
    `│ 六亲：${sixRelativesStr}`.padEnd(36) + "│",
    "├─ 出处 ─────────────────────────────┤",
    "│ 《卜筮正宗》《增删卜易》《火珠林》  │",
    "└────────────────────────────────────┘",
  ].filter(Boolean).join("\n");

  return {
    number: gua.number,
    name: gua.name,
    symbol: gua.symbol,
    composition: { upper: gua.upper, lower: gua.lower },
    lines,
    shiYing: { shi: gua.shiYao, ying: gua.yingYao },
    guaShen,
    sixRelatives: sixRelativesStr,
    wuXing: gongWuXing,
    summary,
  } as LiuYaoNaJiaResult & { summary: string };
}
