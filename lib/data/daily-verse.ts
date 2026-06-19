/**
 * 今日小语数据（峰值时刻 2.1）
 * 古诗词/传统文化名句 + 节气，每日轮换。迁移时可替换为诗词库接口。
 */

export interface DailyVerse {
  text: string
  source: string
  /** 当日节气或节日，可空 */
  solarTerm?: string
}

const VERSES: DailyVerse[] = [
  { text: "天行健，君子以自强不息", source: "《周易·乾卦》" },
  { text: "上善若水，水善利万物而不争", source: "《道德经》" },
  { text: "学而时习之，不亦说乎", source: "《论语·学而》" },
  { text: "博学之，审问之，慎思之，明辨之，笃行之", source: "《中庸》" },
  { text: "工欲善其事，必先利其器", source: "《论语·卫灵公》" },
  { text: "千里之行，始于足下", source: "《道德经》" },
  { text: "知人者智，自知者明", source: "《道德经》" },
]

const SOLAR_TERMS = [
  "立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
  "立夏", "小满", "芒种", "夏至", "小暑", "大暑",
  "立秋", "处暑", "白露", "秋分", "寒露", "霜降",
  "立冬", "小雪", "大雪", "冬至", "小寒", "大寒",
]

// 按当天日期稳定取一条（同一天结果一致）
export function getTodayVerse(date = new Date()): DailyVerse {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  )
  const verse = VERSES[dayOfYear % VERSES.length]
  // 粗略估算节气（每约15天一个），仅作展示
  const termIndex = Math.floor(((date.getMonth() * 31 + date.getDate()) / 366) * 24) % 24
  return { ...verse, solarTerm: `今日${SOLAR_TERMS[termIndex]}` }
}
