// ── 称骨算命计算引擎（袁天罡称骨歌） ──

import type { ChengGuResult } from "@guoxue/shared";
import { Solar } from "lunar-javascript";

// ── 年骨重表（60甲子，单位：两） ──
const YEAR_WEIGHT: Record<string, number> = {
  "甲子": 1.2, "乙丑": 0.9, "丙寅": 0.6, "丁卯": 0.7, "戊辰": 1.2,
  "己巳": 0.5, "庚午": 0.9, "辛未": 0.8, "壬申": 0.7, "癸酉": 0.8,
  "甲戌": 1.5, "乙亥": 0.9, "丙子": 1.6, "丁丑": 0.8, "戊寅": 0.8,
  "己卯": 1.9, "庚辰": 1.2, "辛巳": 0.6, "壬午": 0.8, "癸未": 0.7,
  "甲申": 0.5, "乙酉": 1.5, "丙戌": 0.6, "丁亥": 1.6, "戊子": 1.5,
  "己丑": 0.7, "庚寅": 0.9, "辛卯": 1.2, "壬辰": 1.0, "癸巳": 0.7,
  "甲午": 1.5, "乙未": 0.6, "丙申": 0.5, "丁酉": 1.4, "戊戌": 1.5,
  "己亥": 0.9, "庚子": 0.7, "辛丑": 0.7, "壬寅": 0.9, "癸卯": 1.2,
  "甲辰": 0.8, "乙巳": 0.7, "丙午": 1.3, "丁未": 0.5, "戊申": 1.4,
  "己酉": 0.5, "庚戌": 0.9, "辛亥": 1.7, "壬子": 0.5, "癸丑": 0.7,
  "甲寅": 1.2, "乙卯": 0.8, "丙辰": 0.8, "丁巳": 0.7, "戊午": 1.9,
  "己未": 0.6, "庚申": 0.8, "辛酉": 1.6, "壬戌": 1.0, "癸亥": 0.7,
};

// ── 月骨重表（农历月） ──
const MONTH_WEIGHT: Record<number, number> = {
  1: 0.6, 2: 0.7, 3: 1.8, 4: 0.9, 5: 0.5, 6: 1.6,
  7: 0.9, 8: 1.5, 9: 1.8, 10: 0.8, 11: 0.9, 12: 0.5,
};

// ── 日骨重表（农历日） ──
const DAY_WEIGHT: Record<number, number> = {
  1: 0.5, 2: 1.0, 3: 0.8, 4: 1.5, 5: 1.6, 6: 1.5,
  7: 0.8, 8: 1.6, 9: 0.8, 10: 1.6, 11: 0.9, 12: 1.7,
  13: 0.8, 14: 1.7, 15: 1.0, 16: 0.8, 17: 0.9, 18: 1.8,
  19: 0.5, 20: 1.5, 21: 1.0, 22: 0.9, 23: 0.8, 24: 0.9,
  25: 1.5, 26: 1.8, 27: 0.7, 28: 0.8, 29: 1.6, 30: 0.6,
};

// ── 时辰骨重表 ──
const HOUR_WEIGHT: Record<string, number> = {
  "子": 1.6, "丑": 0.6, "寅": 0.7, "卯": 1.0,
  "辰": 0.9, "巳": 1.6, "午": 1.0, "未": 0.8,
  "申": 0.8, "酉": 0.9, "戌": 0.6, "亥": 0.6,
};

const SHI_CHEN_NAMES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// ── 称骨歌诀（按骨重分级） ──
const POEMS: Record<string, { poem: string; interpretation: string; level: string }> = {
  "2.1": { poem: "短命非业谓大凶，平生灾难事重重。凶祸频临限逆境，终世困苦事不成。", interpretation: "此命劳碌一生，做事一世无成。", level: "下下" },
  "2.2": { poem: "身寒骨冷苦伶仃，此命推来行乞人。劳劳碌碌无度日，终年打拱过平生。", interpretation: "此命劳碌一生，终日忙碌度日。", level: "下下" },
  "2.3": { poem: "此命推来骨肉轻，求谋做事事难成。妻儿兄弟实难靠，外出他乡做善人。", interpretation: "此命六亲无靠，自立更生方可。", level: "下" },
  "2.4": { poem: "此命推来福禄无，门庭困苦总难荣。六亲骨肉皆无靠，流到他乡作老翁。", interpretation: "此命骨肉无缘，自立门户为上。", level: "下" },
  "2.5": { poem: "此命推来祖业微，门庭营度似稀奇。六亲骨肉如冰碳，一世勤劳自把持。", interpretation: "祖业微薄，需凭自力。", level: "下" },
  "2.6": { poem: "平生一路苦中求，独自营谋事不休。离祖出门宜早计，晚来衣禄自无忧。", interpretation: "早年辛苦，晚年安稳。", level: "中下" },
  "2.7": { poem: "一生做事少商量，难靠祖宗做主张。独马单枪空做去，早年晚岁总无长。", interpretation: "一生独立奋斗，少有贵人相助。", level: "中下" },
  "2.8": { poem: "一生作事似飘蓬，祖宗产业在梦中。若不过房并改姓，也当移徙二三通。", interpretation: "一生漂泊不定，适宜异地发展。", level: "中下" },
  "2.9": { poem: "初年运限未曾亨，纵有功名在后成。须过四旬方可上，移居改姓使为良。", interpretation: "早年蹉跎，四十后方才亨通。", level: "中下" },
  "3.0": { poem: "劳劳碌碌苦中求，东走西奔何日休。若能终身勤与俭，老来稍可免忧愁。", interpretation: "一生辛劳，勤俭持家可安。", level: "中" },
  "3.1": { poem: "忙忙碌碌苦中求，何日云开见日头。难得祖基家可立，中年衣食渐无忧。", interpretation: "中年后生活渐好。", level: "中" },
  "3.2": { poem: "初年运蹇事难谋，渐有财源如水流。到得中年衣食旺，那时名利一齐收。", interpretation: "早年困顿，中年后事业财运双收。", level: "中" },
  "3.3": { poem: "早年做事事难成，百计徒劳枉费心。半世自如流水去，后来运到始逢春。", interpretation: "前半生坎坷，后半生春风得意。", level: "中" },
  "3.4": { poem: "此命福气果如何，僧道门中衣禄多。离祖出家方得妙，终朝拜佛念弥陀。", interpretation: "适合清修之路，或离乡发展。", level: "中" },
  "3.5": { poem: "生平福量不周全，祖业根基觉少传。营事生涯宜守旧，时来衣食胜从前。", interpretation: "守旧经营，时来运转。", level: "中" },
  "3.6": { poem: "不须劳碌过平生，独自成家福不轻。早有福星常照命，任君行去百般成。", interpretation: "福星高照，做事顺遂。", level: "中上" },
  "3.7": { poem: "此命般般事不成，弟兄少力自孤成。虽然祖业须微有，来得明时去不明。", interpretation: "独自打拼，运程起伏。", level: "中" },
  "3.8": { poem: "一生骨肉最清高，早入黉门姓名标。待到年将三十六，蓝衫脱去换红袍。", interpretation: "才华出众，三十六后功成名就。", level: "中上" },
  "3.9": { poem: "此命终身运不通，劳劳做事尽皆空。苦心竭力成家计，到得那时在梦中。", interpretation: "劳碌之命，需防空忙。", level: "中" },
  "4.0": { poem: "平生衣禄是绵长，件件心中自主张。前面风霜多受过，后来必定享安康。", interpretation: "先苦后甜，晚年安康富足。", level: "中上" },
  "4.1": { poem: "此命推来自不同，为人能干异凡庸。中年还有逍遥福，不比前年运未通。", interpretation: "能力出众，中年后运势通达。", level: "中上" },
  "4.2": { poem: "得宽怀处且宽怀，何用双眉总不开。若使中年命运济，那时名利一齐来。", interpretation: "中年运济，名利双收。", level: "中上" },
  "4.3": { poem: "为人心性最聪明，做事轩昂近贵人。衣禄一生天数定，不须劳碌过平生。", interpretation: "聪明近贵，一生衣禄无忧。", level: "上" },
  "4.4": { poem: "来事由天莫苦求，须知福禄赖人修。当年财帛难如意，晚景欣然便不忧。", interpretation: "早年财运一般，晚景大好。", level: "上" },
  "4.5": { poem: "福中取贵格求真，明敏才华志自伸。福禄寿全家道吉，桂兰毓秀晚荣臻。", interpretation: "福禄寿三全，家道兴旺。", level: "上" },
  "4.6": { poem: "东西南北尽皆通，出姓移居更觉隆。衣禄无穷无数定，中年晚景一般同。", interpretation: "四方通达，一生衣禄丰厚。", level: "上" },
  "4.7": { poem: "此命推来旺末年，妻荣子贵自怡然。平生原有滔滔福，可有财源如水泉。", interpretation: "末年大旺，财源如泉涌。", level: "上" },
  "4.8": { poem: "幼年运道未曾亨，若是蹉跎再不兴。兄弟六亲皆无靠，一身事业晚年成。", interpretation: "晚年成就事业，大器晚成。", level: "中上" },
  "4.9": { poem: "此命推来福不轻，自成自立显门庭。从来富贵人亲近，使婢差奴过一生。", interpretation: "自立门户，富贵显达。", level: "上" },
  "5.0": { poem: "为利为名终日劳，中年福禄也多遭。老来自有称心处，梅花冻雪两相宜。", interpretation: "中晚年福禄深厚。", level: "上" },
  "5.1": { poem: "一世荣华事事通，不须劳碌自亨通。兄弟叔侄皆如意，家业成时福禄宏。", interpretation: "一世荣华，万事亨通。", level: "上上" },
  "5.2": { poem: "一世亨通事事能，不须劳思自然宁。宗族欣然心皆好，家业丰亨自称心。", interpretation: "一生顺遂，家业丰厚。", level: "上上" },
  "5.3": { poem: "此格推来气象真，兴家发达在其中。一生福禄安排定，却是人间一富翁。", interpretation: "天生富贵之命。", level: "上上" },
  "5.4": { poem: "此命推来厚且清，诗书满腹看功成。丰衣足食自然稳，正是人间有福人。", interpretation: "学有所成，丰衣足食。", level: "上上" },
  "5.5": { poem: "走马扬鞭争名利，少年做事废筹论。一朝福禄源源至，富贵荣华显六亲。", interpretation: "年少有为，富贵荣华。", level: "上上" },
  "5.6": { poem: "此格推来礼义通，一生福禄用无穷。甜酸苦辣皆尝过，滚滚财源稳且丰。", interpretation: "知礼识义，财源滚滚。", level: "上上" },
  "5.7": { poem: "福禄丰盈万事全，一生荣耀显双亲。名扬威振人钦敬，处世逢凶亦化吉。", interpretation: "名利双全，逢凶化吉。", level: "上上" },
  "5.8": { poem: "平生福禄自然来，名利兼全福寿偕。雁塔题名为贵客，紫袍金带走金阶。", interpretation: "天赐福禄，贵不可言。", level: "上上" },
  "5.9": { poem: "细推此格妙且清，必定才高礼义通。甲第之中应有分，扬鞭走马显威荣。", interpretation: "才高八斗，功名显赫。", level: "上上" },
  "6.0": { poem: "一朝金榜快题名，显祖荣宗立大功。衣食定然原裕足，田园财帛更丰盈。", interpretation: "金榜题名，衣食丰盈。", level: "上上" },
  "6.1": { poem: "不做朝中金榜客，定为世上大财翁。聪明天赋经书熟，名显高科自是荣。", interpretation: "要么入仕为官，要么成为巨富。", level: "上上" },
  "6.2": { poem: "此命生来福不穷，读书必定显亲宗。紫衣金带为卿相，富贵荣华皆可同。", interpretation: "卿相之命，富贵无极。", level: "上上" },
  "6.3": { poem: "命主为官福禄长，得来富贵定非常。名题金塔传金榜，定中高科天下扬。", interpretation: "位高权重，天下扬名。", level: "上上" },
  "6.4": { poem: "此格权威不可当，紫袍金带坐高堂。荣华富贵谁能及，积玉堆金满储仓。", interpretation: "权势滔天，积玉堆金。", level: "上上" },
  "6.5": { poem: "细推此命福不轻，安国治邦极品人。文绣雕梁政富贵，威声照耀四方闻。", interpretation: "安邦治国之大才。", level: "上上" },
  "6.6": { poem: "此格人间一福人，堆金积玉满堂春。从来富贵由天定，正笏垂绅谒圣君。", interpretation: "人间极品富贵之命。", level: "上上" },
  "6.7": { poem: "此命生来福自宏，田园家业最高隆。平生衣禄丰盈足，一世荣华万事通。", interpretation: "福寿绵长，万事通达。", level: "上上" },
  "6.8": { poem: "富贵由天莫苦求，十年兴败多少愁。生来衣禄丰盈主，一生自在享千秋。", interpretation: "天赐富贵，自在千秋。", level: "上上" },
  "6.9": { poem: "君是人间衣禄星，一生富贵众人钦。纵然福禄由天定，安享荣华过一生。", interpretation: "衣禄之星降世。", level: "上上" },
  "7.0": { poem: "此命推来福禄宏，不须愁虑苦劳工。荣华富贵兴家业，禄享千钟万事通。", interpretation: "大富大贵，禄享千钟。", level: "上上" },
  "7.1": { poem: "此命生成大不同，公侯卿相在其中。一生自有逍遥福，富贵荣华极品隆。", interpretation: "公侯卿相之命。", level: "上上" },
  "7.2": { poem: "此格世界罕有生，十代积善产此人。天上紫微来照命，统治万民乐太平。", interpretation: "帝王将相之命，世间罕有。", level: "上上" },
};

function weightToStr(w: number): string {
  const liang = Math.floor(w);
  const qian = Math.round((w - liang) * 10);
  if (qian === 0) return `${liang}两整`;
  return `${liang}两${qian}钱`;
}

function getShiChen(hour: number): string {
  const idx = Math.floor(((hour + 1) % 24) / 2);
  return SHI_CHEN_NAMES[idx];
}

export function calculateChengGu(input: Record<string, unknown>): ChengGuResult {
  const year = input.year as number;
  const month = input.month as number;
  const day = input.day as number;
  const hour = input.hour as number;
  const gender = (input.gender as string) || "男";

  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();

  const yearGanZhi = lunar.getYearInGanZhi();
  const lunarMonth = Math.abs(lunar.getMonth());
  const lunarDay = lunar.getDay();
  const shiChen = getShiChen(hour);

  const yearW = YEAR_WEIGHT[yearGanZhi] ?? 0.7;
  const monthW = MONTH_WEIGHT[lunarMonth] ?? 0.5;
  const dayW = DAY_WEIGHT[lunarDay] ?? 0.8;
  const hourW = HOUR_WEIGHT[shiChen] ?? 0.8;

  const total = Math.round((yearW + monthW + dayW + hourW) * 10) / 10;
  const totalKey = total.toFixed(1);

  const entry = POEMS[totalKey] ?? {
    poem: "此命福量需详推，综合五行方可断。",
    interpretation: "骨重偏高或偏低，需结合八字详批。",
    level: "中",
  };

  return {
    input: { year, month, day, hour, gender: gender as "男" | "女" },
    lunarInfo: {
      year: yearGanZhi,
      month: lunarMonth,
      day: lunarDay,
      shiChen: `${shiChen}时`,
    },
    bones: {
      year: { label: "年骨", ganZhi: yearGanZhi, weight: yearW, weightStr: weightToStr(yearW) },
      month: { label: "月骨", ganZhi: `${lunarMonth}月`, weight: monthW, weightStr: weightToStr(monthW) },
      day: { label: "日骨", ganZhi: `${lunarDay}日`, weight: dayW, weightStr: weightToStr(dayW) },
      hour: { label: "时骨", ganZhi: `${shiChen}时`, weight: hourW, weightStr: weightToStr(hourW) },
    },
    totalWeight: total,
    totalWeightStr: weightToStr(total),
    poem: entry.poem,
    interpretation: entry.interpretation,
    level: entry.level,
  };
}
