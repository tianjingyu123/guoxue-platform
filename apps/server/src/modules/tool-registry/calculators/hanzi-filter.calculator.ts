// ── 汉字筛选计算引擎 ──
// 数据来源：《康熙字典》《说文解字》
// 起名用字多维度筛选

import type { HanZiFilterInput, HanZiFilterResult, FilteredChar } from "@guoxue/shared";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

// 常用汉字库（姓名学常用字3500+中精选）
interface CharEntry {
  char: string;
  kangXiStroke: number;
  pinyin: string;
  wuXing: string;
  meaning: string;
  radical: string;
  frequency: "高" | "中" | "低";
  genderHint: "男" | "女" | "通用";
  nameComment: string;
  zodiacFit: Record<string, "宜" | "忌" | "平">;
}

const CHAR_DB: CharEntry[] = [
  { char: "宇", kangXiStroke: 6, pinyin: "yǔ", wuXing: "土", meaning: "宇宙，风度", radical: "宀", frequency: "高", genderHint: "通用", nameComment: "气宇轩昂，胸怀宽广", zodiacFit: { "鼠":"宜","牛":"平","虎":"宜","兔":"平","龙":"宜","蛇":"宜","马":"平","羊":"平","猴":"宜","鸡":"宜","狗":"平","猪":"平" } },
  { char: "轩", kangXiStroke: 10, pinyin: "xuān", wuXing: "土", meaning: "高大，气度", radical: "车", frequency: "高", genderHint: "男", nameComment: "气宇轩昂，器宇不凡", zodiacFit: { "鼠":"宜","牛":"宜","虎":"宜","兔":"平","龙":"宜","蛇":"平","马":"宜","羊":"平","猴":"宜","鸡":"平","狗":"宜","猪":"平" } },
  { char: "晨", kangXiStroke: 11, pinyin: "chén", wuXing: "火", meaning: "清晨，希望", radical: "日", frequency: "高", genderHint: "通用", nameComment: "如日初升，朝气蓬勃", zodiacFit: { "鼠":"宜","牛":"平","虎":"宜","兔":"宜","龙":"宜","蛇":"宜","马":"宜","羊":"平","猴":"平","鸡":"平","狗":"平","猪":"平" } },
  { char: "铭", kangXiStroke: 14, pinyin: "míng", wuXing: "金", meaning: "铭记，卓越", radical: "钅", frequency: "高", genderHint: "男", nameComment: "铭记于心，功成名就", zodiacFit: { "鼠":"平","牛":"宜","虎":"平","兔":"平","龙":"宜","蛇":"宜","马":"平","羊":"平","猴":"宜","鸡":"宜","狗":"平","猪":"平" } },
  { char: "琳", kangXiStroke: 13, pinyin: "lín", wuXing: "木", meaning: "美玉", radical: "王", frequency: "高", genderHint: "女", nameComment: "琳琅满目，美玉无瑕", zodiacFit: { "鼠":"平","牛":"平","虎":"宜","兔":"宜","龙":"平","蛇":"平","马":"宜","羊":"平","猴":"平","鸡":"平","狗":"平","猪":"平" } },
  { char: "涵", kangXiStroke: 12, pinyin: "hán", wuXing: "水", meaning: "包容，涵养", radical: "氵", frequency: "高", genderHint: "通用", nameComment: "海涵地负，内蕴深厚", zodiacFit: { "鼠":"宜","牛":"平","虎":"宜","兔":"宜","龙":"宜","蛇":"平","马":"平","羊":"平","猴":"宜","鸡":"平","狗":"平","猪":"宜" } },
  { char: "子", kangXiStroke: 3, pinyin: "zǐ", wuXing: "水", meaning: "君子，种子", radical: "子", frequency: "高", genderHint: "通用", nameComment: "才子佳人，温文尔雅", zodiacFit: { "鼠":"宜","牛":"宜","虎":"平","兔":"平","龙":"宜","蛇":"宜","马":"平","羊":"平","猴":"宜","鸡":"平","狗":"平","猪":"宜" } },
  { char: "皓", kangXiStroke: 12, pinyin: "hào", wuXing: "木", meaning: "洁白，明亮", radical: "白", frequency: "中", genderHint: "男", nameComment: "皓月当空，光明磊落", zodiacFit: { "鼠":"平","牛":"平","虎":"宜","兔":"宜","龙":"平","蛇":"平","马":"宜","羊":"平","猴":"平","鸡":"平","狗":"宜","猪":"平" } },
  { char: "泽", kangXiStroke: 17, pinyin: "zé", wuXing: "水", meaning: "恩泽，润泽", radical: "氵", frequency: "高", genderHint: "男", nameComment: "恩泽四方，德被苍生", zodiacFit: { "鼠":"宜","牛":"宜","虎":"宜","兔":"宜","龙":"宜","蛇":"平","马":"宜","羊":"平","猴":"宜","鸡":"宜","狗":"平","猪":"宜" } },
  { char: "雅", kangXiStroke: 12, pinyin: "yǎ", wuXing: "木", meaning: "高雅，文雅", radical: "隹", frequency: "高", genderHint: "女", nameComment: "温文尔雅，气质高雅", zodiacFit: { "鼠":"平","牛":"宜","虎":"宜","兔":"宜","龙":"平","蛇":"宜","马":"宜","羊":"宜","猴":"宜","鸡":"宜","狗":"宜","猪":"平" } },
  { char: "思", kangXiStroke: 9, pinyin: "sī", wuXing: "金", meaning: "思考，思念", radical: "心", frequency: "高", genderHint: "通用", nameComment: "思如泉涌，才思敏捷", zodiacFit: { "鼠":"宜","牛":"宜","虎":"平","兔":"平","龙":"宜","蛇":"平","马":"平","羊":"平","猴":"宜","鸡":"平","狗":"宜","猪":"平" } },
  { char: "雨", kangXiStroke: 8, pinyin: "yǔ", wuXing: "水", meaning: "雨水，恩泽", radical: "雨", frequency: "中", genderHint: "通用", nameComment: "春风化雨，润物无声", zodiacFit: { "鼠":"宜","牛":"平","虎":"宜","兔":"宜","龙":"宜","蛇":"平","马":"平","羊":"平","猴":"宜","鸡":"平","狗":"平","猪":"宜" } },
  { char: "嘉", kangXiStroke: 14, pinyin: "jiā", wuXing: "木", meaning: "美好，赞许", radical: "口", frequency: "高", genderHint: "通用", nameComment: "嘉言懿行，品性优良", zodiacFit: { "鼠":"平","牛":"宜","虎":"宜","兔":"宜","龙":"宜","蛇":"宜","马":"宜","羊":"宜","猴":"宜","鸡":"宜","狗":"宜","猪":"平" } },
  { char: "然", kangXiStroke: 12, pinyin: "rán", wuXing: "金", meaning: "自然，超然", radical: "灬", frequency: "中", genderHint: "通用", nameComment: "道法自然，超然物外", zodiacFit: { "鼠":"平","牛":"平","虎":"宜","兔":"宜","龙":"平","蛇":"平","马":"宜","羊":"平","猴":"平","鸡":"平","狗":"宜","猪":"平" } },
  { char: "博", kangXiStroke: 12, pinyin: "bó", wuXing: "水", meaning: "广博，渊博", radical: "十", frequency: "高", genderHint: "男", nameComment: "博学多才，胸怀广阔", zodiacFit: { "鼠":"宜","牛":"宜","虎":"平","兔":"宜","龙":"宜","蛇":"平","马":"宜","羊":"平","猴":"宜","鸡":"平","狗":"宜","猪":"宜" } },
  { char: "文", kangXiStroke: 4, pinyin: "wén", wuXing: "水", meaning: "文采，文化", radical: "文", frequency: "高", genderHint: "通用", nameComment: "文采斐然，才华横溢", zodiacFit: { "鼠":"宜","牛":"宜","虎":"宜","兔":"宜","龙":"宜","蛇":"宜","马":"宜","羊":"宜","猴":"宜","鸡":"宜","狗":"宜","猪":"宜" } },
  { char: "悦", kangXiStroke: 11, pinyin: "yuè", wuXing: "金", meaning: "愉悦，欢喜", radical: "心", frequency: "中", genderHint: "女", nameComment: "赏心悦目，喜乐安康", zodiacFit: { "鼠":"平","牛":"宜","虎":"宜","兔":"宜","龙":"平","蛇":"宜","马":"宜","羊":"宜","猴":"宜","鸡":"宜","狗":"宜","猪":"平" } },
  { char: "宁", kangXiStroke: 14, pinyin: "níng", wuXing: "火", meaning: "安宁，宁静", radical: "宀", frequency: "高", genderHint: "通用", nameComment: "宁静致远，淡泊明志", zodiacFit: { "鼠":"宜","牛":"平","虎":"宜","兔":"宜","龙":"宜","蛇":"平","马":"平","羊":"平","猴":"宜","鸡":"平","狗":"宜","猪":"平" } },
  { char: "志", kangXiStroke: 7, pinyin: "zhì", wuXing: "火", meaning: "志向，意志", radical: "心", frequency: "高", genderHint: "男", nameComment: "志向远大，意志坚定", zodiacFit: { "鼠":"平","牛":"宜","虎":"宜","兔":"平","龙":"宜","蛇":"宜","马":"宜","羊":"平","猴":"宜","鸡":"平","狗":"宜","猪":"平" } },
  { char: "若", kangXiStroke: 11, pinyin: "ruò", wuXing: "木", meaning: "好像，如若", radical: "艹", frequency: "中", genderHint: "女", nameComment: "上善若水，虚怀若谷", zodiacFit: { "鼠":"平","牛":"宜","虎":"宜","兔":"宜","龙":"平","蛇":"宜","马":"宜","羊":"宜","猴":"宜","鸡":"宜","狗":"宜","猪":"平" } },
  { char: "琪", kangXiStroke: 13, pinyin: "qí", wuXing: "木", meaning: "美玉", radical: "王", frequency: "中", genderHint: "女", nameComment: "琪花瑶草，珍贵美好", zodiacFit: { "鼠":"平","牛":"平","虎":"宜","兔":"宜","龙":"平","蛇":"平","马":"宜","羊":"平","猴":"平","鸡":"平","狗":"平","猪":"平" } },
  { char: "天", kangXiStroke: 4, pinyin: "tiān", wuXing: "火", meaning: "天空，天然", radical: "大", frequency: "高", genderHint: "男", nameComment: "天行健，君子以自强不息", zodiacFit: { "鼠":"宜","牛":"宜","虎":"宜","兔":"平","龙":"宜","蛇":"宜","马":"宜","羊":"平","猴":"宜","鸡":"平","狗":"宜","猪":"平" } },
  { char: "睿", kangXiStroke: 14, pinyin: "ruì", wuXing: "金", meaning: "睿智，智慧", radical: "目", frequency: "中", genderHint: "通用", nameComment: "聪明睿智，洞察事理", zodiacFit: { "鼠":"宜","牛":"宜","虎":"宜","兔":"宜","龙":"宜","蛇":"宜","马":"宜","羊":"宜","猴":"宜","鸡":"宜","狗":"宜","猪":"宜" } },
  { char: "雪", kangXiStroke: 11, pinyin: "xuě", wuXing: "水", meaning: "白雪，纯洁", radical: "雨", frequency: "中", genderHint: "女", nameComment: "冰雪聪明，洁白无瑕", zodiacFit: { "鼠":"宜","牛":"平","虎":"平","兔":"宜","龙":"宜","蛇":"平","马":"平","羊":"平","猴":"宜","鸡":"平","狗":"宜","猪":"宜" } },
  { char: "帆", kangXiStroke: 6, pinyin: "fān", wuXing: "水", meaning: "风帆，远航", radical: "巾", frequency: "中", genderHint: "通用", nameComment: "一帆风顺，扬帆远航", zodiacFit: { "鼠":"宜","牛":"平","虎":"宜","兔":"宜","龙":"宜","蛇":"平","马":"宜","羊":"平","猴":"宜","鸡":"平","狗":"平","猪":"宜" } },
  { char: "瑶", kangXiStroke: 15, pinyin: "yáo", wuXing: "火", meaning: "美玉，瑶池", radical: "王", frequency: "中", genderHint: "女", nameComment: "瑶池仙子，美玉无瑕", zodiacFit: { "鼠":"平","牛":"宜","虎":"宜","兔":"宜","龙":"平","蛇":"宜","马":"宜","羊":"宜","猴":"宜","鸡":"宜","狗":"宜","猪":"平" } },
  { char: "彦", kangXiStroke: 9, pinyin: "yàn", wuXing: "木", meaning: "才德出众", radical: "彡", frequency: "中", genderHint: "男", nameComment: "俊彦之士，才德双全", zodiacFit: { "鼠":"平","牛":"平","虎":"宜","兔":"宜","龙":"平","蛇":"平","马":"宜","羊":"平","猴":"平","鸡":"平","狗":"宜","猪":"平" } },
  { char: "诗", kangXiStroke: 13, pinyin: "shī", wuXing: "金", meaning: "诗歌，诗意", radical: "讠", frequency: "中", genderHint: "女", nameComment: "诗情画意，温婉动人", zodiacFit: { "鼠":"平","牛":"宜","虎":"宜","兔":"宜","龙":"平","蛇":"宜","马":"宜","羊":"宜","猴":"宜","鸡":"宜","狗":"宜","猪":"平" } },
  { char: "鸿", kangXiStroke: 17, pinyin: "hóng", wuXing: "水", meaning: "鸿雁，宏大", radical: "鸟", frequency: "中", genderHint: "男", nameComment: "鸿运当头，志向远大", zodiacFit: { "鼠":"宜","牛":"宜","虎":"宜","兔":"宜","龙":"宜","蛇":"平","马":"宜","羊":"平","猴":"宜","鸡":"平","狗":"平","猪":"宜" } },
  { char: "晴", kangXiStroke: 12, pinyin: "qíng", wuXing: "火", meaning: "晴朗，阳光", radical: "日", frequency: "中", genderHint: "女", nameComment: "晴空万里，阳光灿烂", zodiacFit: { "鼠":"宜","牛":"平","虎":"宜","兔":"宜","龙":"宜","蛇":"宜","马":"宜","羊":"平","猴":"平","鸡":"平","狗":"宜","猪":"平" } },
];

function matchFilter(char: CharEntry, conditions: Record<string, unknown>): boolean {
  if (conditions.wuXing && Array.isArray(conditions.wuXing) && (conditions.wuXing as string[]).length > 0) {
    if (!(conditions.wuXing as string[]).includes(char.wuXing)) return false;
  }
  if (typeof conditions.stroke === "number" && char.kangXiStroke !== conditions.stroke) return false;
  if (conditions.strokeRange && typeof conditions.strokeRange === "object") {
    const r = conditions.strokeRange as { min: number; max: number };
    if (char.kangXiStroke < r.min || char.kangXiStroke > r.max) return false;
  }
  if (conditions.radical && Array.isArray(conditions.radical) && (conditions.radical as string[]).length > 0) {
    if (!(conditions.radical as string[]).includes(char.radical)) return false;
  }
  if (conditions.tone && Array.isArray(conditions.tone) && (conditions.tone as number[]).length > 0) {
    // 简化声调判断：拼音首字母+韵母粗略推断
    const toneMap: Record<string, number> = { "ā":1,"á":2,"ǎ":3,"à":4,"ē":1,"é":2,"ě":3,"è":4,"ī":1,"í":2,"ǐ":3,"ì":4,"ō":1,"ó":2,"ǒ":3,"ò":4,"ū":1,"ú":2,"ǔ":3,"ù":4 };
    const hasTone = Object.entries(toneMap).some(([vowel, t]) =>
      char.pinyin.includes(vowel) && (conditions.tone as number[]).includes(t)
    );
    if (!hasTone && (conditions.tone as number[]).length > 0) return false;
  }
  if (typeof conditions.pinyinInitial === "string") {
    if (!char.pinyin.startsWith(conditions.pinyinInitial as string)) return false;
  }
  if (conditions.pinyinInitial && Array.isArray(conditions.pinyinInitial) && (conditions.pinyinInitial as string[]).length > 0) {
    if (!(conditions.pinyinInitial as string[]).some(p => char.pinyin.startsWith(p))) return false;
  }
  if (conditions.commonOnly && char.frequency !== "高") return false;
  if (conditions.nameOnly && char.nameComment.length < 5) return false;
  if (typeof conditions.meaningKeyword === "string") {
    if (!char.meaning.includes(conditions.meaningKeyword as string) && !char.nameComment.includes(conditions.meaningKeyword as string)) return false;
  }
  if (conditions.zodiac && typeof conditions.zodiac === "string") {
    const fit = char.zodiacFit[conditions.zodiac as string];
    if (fit === "忌") return false;
  }
  if (conditions.excludeChars && Array.isArray(conditions.excludeChars)) {
    if ((conditions.excludeChars as string[]).includes(char.char)) return false;
  }
  return true;
}

export function calculateHanZiFilter(input: Record<string, unknown>): HanZiFilterResult {
  const { conditions, sortBy, page, pageSize } = input as unknown as HanZiFilterInput;
  if (!conditions) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "请提供筛选条件");

  const cond = conditions as unknown as Record<string, unknown>;
  const filtered = CHAR_DB.filter(c => matchFilter(c, cond));

  if (sortBy === "stroke") filtered.sort((a, b) => a.kangXiStroke - b.kangXiStroke);
  else if (sortBy === "pinyin") filtered.sort((a, b) => a.pinyin.localeCompare(b.pinyin));
  else if (sortBy === "wuxing") filtered.sort((a, b) => a.wuXing.localeCompare(b.wuXing));

  const total = filtered.length;
  const pg = page || 1;
  const ps = pageSize || 20;
  const totalPages = Math.ceil(total / ps);
  const start = (pg - 1) * ps;
  const chars: FilteredChar[] = filtered.slice(start, start + ps).map(c => ({
    char: c.char,
    kangXiStroke: c.kangXiStroke,
    pinyin: c.pinyin,
    wuXing: c.wuXing,
    meaning: c.meaning,
    radical: c.radical,
    frequency: c.frequency,
    genderHint: c.genderHint,
    nameComment: c.nameComment,
    zodiacFit: conditions.zodiac ? c.zodiacFit[conditions.zodiac] || "平" : "平",
  }));

  const wuXingDist: Record<string, number> = {};
  const strokeDist: Record<number, number> = {};
  for (const c of filtered) {
    wuXingDist[c.wuXing] = (wuXingDist[c.wuXing] || 0) + 1;
    strokeDist[c.kangXiStroke] = (strokeDist[c.kangXiStroke] || 0) + 1;
  }

  return {
    input: { conditions, sortBy, page, pageSize },
    chars, total,
    pagination: { page: pg, pageSize: ps, totalPages },
    stats: { wuXingDist, strokeDist },
  };
}
