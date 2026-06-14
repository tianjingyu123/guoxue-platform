// ── 五行穿衣指南计算引擎 ──
// 根据每日干支推算当日五行配色，参考《协纪辨方书》五行生克
// 算法参考：《渊海子平》《三命通会》《协纪辨方书·五行配色》

import type { WuXingChuanYiInput, WuXingChuanYiResult } from "@guoxue/shared";
import { GAN, ZHI, NA_YIN } from "@guoxue/bazi-engine";

const GAN_LIST = GAN as unknown as string[];
const ZHI_LIST = ZHI as unknown as string[];

// 五行→天干
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WX_GANS: Record<string, string[]> = {
  "木": ["甲", "乙"], "火": ["丙", "丁"], "土": ["戊", "己"],
  "金": ["庚", "辛"], "水": ["壬", "癸"],
};

// 五行→地支
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WX_ZHIS: Record<string, string[]> = {
  "木": ["寅", "卯"], "火": ["巳", "午"], "土": ["辰", "戌", "丑", "未"],
  "金": ["申", "酉"], "水": ["亥", "子"],
};

// 天干五行
const GAN_WX: Record<string, string> = {
  "甲": "木", "乙": "木", "丙": "火", "丁": "火",
  "戊": "土", "己": "土", "庚": "金", "辛": "金",
  "壬": "水", "癸": "水",
};

// 地支五行
const ZHI_WX: Record<string, string> = {
  "寅": "木", "卯": "木", "巳": "火", "午": "火",
  "申": "金", "酉": "金", "亥": "水", "子": "水",
  "辰": "土", "戌": "土", "丑": "土", "未": "土",
};

// 五行时辰对应（每五行对应的当令时辰）
const WX_HOURS: Record<string, { name: string; hours: string; desc: string }[]> = {
  "木": [{ name: "寅卯时", hours: "03:00-07:00", desc: "木气当令，万物生发，宜做重要决策" }],
  "火": [{ name: "巳午时", hours: "09:00-13:00", desc: "火气正旺，热情高涨，宜社交谈判" }],
  "土": [{ name: "辰戌丑未时", hours: "07-09/19-21/01-03/13-15", desc: "土气稳重，宜签约奠基" }],
  "金": [{ name: "申酉时", hours: "15:00-19:00", desc: "金气肃杀，宜财务核算" }],
  "水": [{ name: "亥子时", hours: "21:00-01:00", desc: "水气深沉，宜策划谋略" }],
};

// 五行生克
const SHENG: Record<string, string> = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
const KE: Record<string, string> = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };
const BEI_SHENG: Record<string, string> = { "火": "木", "土": "火", "金": "土", "水": "金", "木": "水" };

// ── 五行颜色与配饰完整映射 ──
// 来源：《协纪辨方书·五行配色》《中国传统色彩大观》
interface WuXingStyle {
  colorName: string;          // 色系名称
  hex: string[];              // 六色渐变
  meaning: string;            // 五行色彩含义
  fabrics: string[];          // 推荐材质
  accessories: string[];      // 推荐配饰
  avoidItems: string[];       // 避忌配饰
  stones: string[];           // 推荐宝石/水晶
  famousQuote: string;        // 古籍引用
}

const WX_STYLES: Record<string, WuXingStyle> = {
  "木": {
    colorName: "青/绿色系",
    hex: ["#4CAF50", "#8BC34A", "#009688", "#2E7D32", "#66BB6A", "#A5D6A7"],
    meaning: "木主仁德，青色象征生机与成长。穿青色如春木勃发，生发向上，助文昌运和人缘。适合教育培训、面试求职、初次见面。",
    fabrics: ["纯棉", "亚麻", "棉麻混纺", "天然纤维", "竹纤维"],
    accessories: ["木质手串/佛珠", "绿色翡翠/祖母绿饰品", "竹子/藤编包", "绿色丝巾/领带", "植物造型胸针"],
    avoidItems: ["过多金饰（金克木）", "白色主调的配件"],
    stones: ["祖母绿", "绿幽灵水晶", "孔雀石", "翡翠", "绿松石"],
    famousQuote: "《尚书·洪范》：木曰曲直，其色青。",
  },
  "火": {
    colorName: "红/紫色系",
    hex: ["#F44336", "#E91E63", "#9C27B0", "#C62828", "#FF5722", "#FFCDD2"],
    meaning: "火主礼德，红色象征热情与光明。穿红色如艳阳高照，气场强大，助社交运和人缘。适合谈判、演讲、约会、竞标。",
    fabrics: ["丝绸", "绸缎", "丝绒", "腈纶混纺", "亮面织物"],
    accessories: ["红玛瑙/红玉髓饰品", "红色包包/高跟鞋", "玫瑰金首饰", "红色手表带", "火型/三角形耳环"],
    avoidItems: ["黑色主导配件（水克火）", "大块水晶吊坠"],
    stones: ["红宝石", "红玛瑙", "石榴石", "红碧玺", "红珊瑚"],
    famousQuote: "《尚书·洪范》：火曰炎上，其色赤。",
  },
  "土": {
    colorName: "黄/棕色系",
    hex: ["#FF9800", "#FFC107", "#795548", "#E65100", "#FFB74D", "#BCAAA4"],
    meaning: "土主信德，黄色象征稳重与包容。穿黄色如厚土载物，心定神安，助财运和事业稳定。适合签约、投资、置业、奠基。",
    fabrics: ["棉麻", "毛呢", "羊绒", "粗花呢", "麂皮"],
    accessories: ["黄水晶/蜜蜡饰品", "棕色皮带/皮包", "金色手表", "陶土/陶瓷饰品", "方形图案配饰"],
    avoidItems: ["绿色主导配件（木克土）", "过多流苏装饰"],
    stones: ["黄水晶", "蜜蜡", "金发晶", "虎眼石", "琥珀"],
    famousQuote: "《尚书·洪范》：土爰稼穑，其色黄。",
  },
  "金": {
    colorName: "白/金色系",
    hex: ["#FFFFFF", "#CFD8DC", "#9E9E9E", "#B0BEC5", "#ECEFF1", "#F5F5F5"],
    meaning: "金主义德，白色象征纯洁与锐利。穿白色如宝剑出鞘，思维清晰果断，助决断力和执行力。适合法律事务、精密工作、正式场合。",
    fabrics: ["丝绸", "雪纺", "金属光泽面料", "缎面", "精纺羊毛"],
    accessories: ["白金/银饰", "珍珠项链/耳环", "水晶发饰", "金属腕表", "钻石/锆石饰品"],
    avoidItems: ["红色主导配件（火克金）", "过多木质装饰"],
    stones: ["钻石", "白水晶", "珍珠", "月光石", "白金"],
    famousQuote: "《尚书·洪范》：金曰从革，其色白。",
  },
  "水": {
    colorName: "黑/蓝色系",
    hex: ["#212121", "#1976D2", "#0D47A1", "#37474F", "#90CAF9", "#BBDEFB"],
    meaning: "水主智德，黑色象征深沉与智慧。穿黑色如深渊纳川，内敛有谋略，助思考力和财运。适合学习、策划、研究、商务谈判。",
    fabrics: ["丝绸", "蕾丝", "针织", "皮革", "光泽感面料"],
    accessories: ["黑曜石/蓝宝石饰品", "黑色手提包", "银质腰带扣", "波光纹理领巾", "圆形/弧形设计配饰"],
    avoidItems: ["黄色主导配件（土克水）", "过多方形元素"],
    stones: ["黑曜石", "蓝宝石", "海蓝宝", "黑碧玺", "墨翠"],
    famousQuote: "《尚书·洪范》：水曰润下，其色黑。",
  },
};

// 日干支计算（简化：按2024-01-01为基准）
function getDayGanZhi(dateStr: string): { gan: string; zhi: string; ganZhi: string } {
  const base = new Date("2024-01-01");
  const target = new Date(dateStr);
  const diffDays = Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  const ganIdx = ((diffDays % 10) + 10) % 10;
  const zhiIdx = ((diffDays % 12) + 12) % 12;
  const gan = GAN_LIST[ganIdx];
  const zhi = ZHI_LIST[zhiIdx];
  return { gan, zhi, ganZhi: gan + zhi };
}

export function calculateWuXingChuanYi(input: Record<string, unknown>): WuXingChuanYiResult {
  const { date } = input as unknown as WuXingChuanYiInput;
  const day = getDayGanZhi(date);
  const ganWx = GAN_WX[day.gan];
  const zhiWx = ZHI_WX[day.zhi];
  const dayWx = ganWx;
  const naYinKey = day.ganZhi;
  const naYin = (NA_YIN as Record<string, string>)[naYinKey] || "未知";

  const shengWo = BEI_SHENG[dayWx];
  const woSheng = SHENG[dayWx];
  const woKe = KE[dayWx];
  const keWo = Object.entries(KE).find(([, v]) => v === dayWx)?.[0] || "木";

  const dayStyle = WX_STYLES[dayWx];
  const shengStyle = WX_STYLES[shengWo];
  const wokStyle = WX_STYLES[woKe];
  const keStyle = WX_STYLES[keWo];

  // 五行配色规则（五行生克穿法）
  const colors = [
    {
      element: dayWx,
      level: "大吉" as const,
      colors: dayStyle?.hex || [],
      description: [
        `【比和旺运】今日五行属${dayWx}，穿${dayStyle?.colorName || dayWx + "色"}为同气相求最强旺运。${dayStyle?.meaning || ""}`,
        `材质：${dayStyle?.fabrics.slice(0, 3).join("、")}。`,
        `配饰：${dayStyle?.accessories.slice(0, 3).join("、")}为宜。`,
        `宝石：${dayStyle?.stones.slice(0, 3).join("、")}加持气场。`,
        `${dayStyle?.famousQuote || ""}`,
      ].join(" "),
    },
    {
      element: shengWo,
      level: "吉" as const,
      colors: shengStyle?.hex || [],
      description: [
        `【生入为吉】${shengWo}生${dayWx}，穿${shengStyle?.colorName || shengWo + "色"}生旺今日气场，贵人运旺、诸事顺遂。`,
        `材质：${shengStyle?.fabrics.slice(0, 2).join("、")}。`,
        `配饰：${shengStyle?.accessories.slice(0, 2).join("、")}。`,
        `宝石推荐：${shengStyle?.stones.slice(0, 2).join("、")}。`,
        `${shengStyle?.famousQuote || ""}`,
      ].join(" "),
    },
    {
      element: woSheng,
      level: "小吉" as const,
      colors: WX_STYLES[woSheng]?.hex || [],
      description: `【泄气可用】${dayWx}生${woSheng}为泄气，穿${WX_STYLES[woSheng]?.colorName || woSheng + "色"}消耗自身能量。可穿但不推荐做主色，宜做点缀小面积使用。适合作内搭或配饰颜色。`,
    },
    {
      element: keWo,
      level: "忌" as const,
      colors: keStyle?.hex || [],
      description: [
        `【克身避忌】${keWo}克${dayWx}，穿${keStyle?.colorName || keWo + "色"}与今日气场相冲，易感疲惫不顺。建议避免大面积穿着，若必须穿着可用${dayStyle?.colorName || dayWx + "色"}内搭或${shengStyle?.colorName || shengWo + "色"}配饰化解。`,
        `化解法：佩戴${dayStyle?.stones[0] || dayWx + "石"}或握${dayStyle?.accessories[0] || "同色系配饰"}。`,
      ].join(" "),
    },
  ];

  // ── 当日吉时 ──
  const dayHours = WX_HOURS[dayWx] || [];
  const shengHours = WX_HOURS[shengWo] || [];
  const luckyHours = [...dayHours, ...shengHours];

  // ── 明日干支预览 ──
  const targetDate = new Date(date);
  targetDate.setDate(targetDate.getDate() + 1);
  const tomorrowStr = targetDate.toISOString().split("T")[0];
  const tomorrow = getDayGanZhi(tomorrowStr);
  const tomorrowWx = GAN_WX[tomorrow.gan];
  const tomorrowStyle = WX_STYLES[tomorrowWx];

  // ── 综合穿搭建议 ──
  const suggestion = [
    `【今日穿搭】${day.ganZhi}日（纳音${naYin}），天干${day.gan}属${ganWx}，地支${day.zhi}属${zhiWx}。`,
    ``,
    `┌─ 大吉首选：${dayStyle?.colorName || dayWx + "色系"} — ${dayStyle?.hex ? dayStyle.hex.slice(0, 3).map(_h => "■").join("") : ""}`,
    `│  ${dayStyle?.meaning?.substring(0, 60) || ""}`,
    `│  外衣主色：${dayStyle?.colorName || dayWx} 上衣、外套、裙裤`,
    `│  内搭配色：${shengStyle?.colorName || shengWo} 衬衫、打底、T恤`,
    `│  配饰点晴：${dayStyle?.accessories[0] || ""} 提亮整体运势`,
    `│  鞋包建议：${dayStyle?.colorName?.split("/")[0] || dayWx + "色"}鞋 + ${shengStyle?.colorName?.split("/")[0] || shengWo + "色"}包`,
    `│`,
    `├─ 次吉之选：${shengStyle?.colorName || shengWo + "色系"} — ${shengStyle?.hex ? shengStyle.hex.slice(0, 3).map(_h => "■").join("") : ""}`,
    `│  ${shengStyle?.meaning?.substring(0, 60) || ""}`,
    `│`,
    `├─ 财运配饰：${wokStyle?.colorName || woKe + "色系"} — 我克者为财，${woKe}色作为配饰可招财`,
    `│  推荐${wokStyle?.accessories.slice(0, 2).join("、")}或${wokStyle?.stones[0] || woKe + "石"}。`,
    `│`,
    `├─ 避忌之色：${keStyle?.colorName || keWo + "色系"} — ${keWo}克${dayWx}，避免大面积穿着`,
    `│  若无法避免，内搭${dayStyle?.colorName || dayWx + "色"}打底化解。`,
    `│`,
    `${luckyHours.length > 0 ? `├─ 今日吉时：${luckyHours.map(h => h.name + "(" + h.hours + ")").join("、")}` : ""}`,
    `│  ${luckyHours.length > 0 ? "重要活动安排在此时段事半功倍。" : ""}`,
    `│`,
    `└─ 【明日预告】${tomorrow.ganZhi}日（${tomorrowWx}行），宜穿${tomorrowStyle?.colorName || tomorrowWx + "色系"}`,
    ``,
    `《协纪辨方书》云："五行配色，顺之者昌。衣饰有方，吉无不利。"`,
  ].filter(Boolean).join("\n");

  return {
    date,
    dayGanZhi: day.ganZhi,
    dayWuXing: dayWx,
    naYin,
    colors,
    suggestion,
  };
}
