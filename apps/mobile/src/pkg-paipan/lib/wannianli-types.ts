// 万年历 · 数据结构类型（自 V0 lib/yijing/mock/wannianli.ts 提取，去除 mock 数据）
import type { GanZhiPillar, YiJiItem, WuXingRatio, HourLuck, DirectionItem, FlyingStar } from "@/lib/paipan/types"

/** 万年历 · 日视图数据 */
export interface DayData {
  solarDate: string // 公历
  solarYearLabel: string // 公历年，如 "2026"
  solarMonthLabel: string // 公历月，如 "七月 JULY"
  solarDayNum: string // 公历日大字，如 "2"
  weekday: string
  lunarYear: string // 农历年（干支+生肖）
  lunarDate: string // 农历月日
  ganZhiLine: string // 干支纪年整行，如 "岁次 丙午年 甲午月 戊子日"
  jiRi?: string // 距节气/节日提示
  solarTerm?: string // 当日或临近节气
  festival?: string // 节日
  pillars: GanZhiPillar[] // 年月日时四柱
  yi: YiJiItem[]
  ji: YiJiItem[]
  chongSha: string // 冲煞
  zhiShen: string // 值神
  wuxing: WuXingRatio[]
  jiShen: string // 吉神宜趋
  xiongShen: string // 凶神宜忌
  // 专业扩展
  hours: HourLuck[]
  directions: DirectionItem[]
  ershiba: string // 二十八星宿
  kongWang: string // 空亡
  taiShen: string // 胎神占方
  pengZu: string[] // 彭祖百忌
  jianChu: string // 建除十二神
  jiuXing: string // 九星
}

/** 九宫飞星盘（流年/流月/流日/流时） */
export interface FlyingStarChart {
  key: "year" | "month" | "day" | "hour"
  label: string // 流年/流月/流日/流时
  centerInfo: string // 中宫信息，如 "八白-左辅星(土)"
  stars: FlyingStar[]
}
