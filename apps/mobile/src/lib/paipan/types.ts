// 易经工具集合 · 共享类型定义
// 纯 UI 类型，便于后续迁移 Vue3 + UniApp 时保持数据结构一致

/** 吉凶三态 */
export type LuckLevel = "good" | "bad" | "neutral"

/** 五行 */
export type WuXing = "wood" | "fire" | "earth" | "metal" | "water"

/** 干支柱数据（年/月/日/时通用） */
export interface GanZhiPillar {
  /** 柱位标签，如 "年柱" "日柱" "时柱" */
  label: string
  /** 天干，如 "甲" */
  gan: string
  /** 天干五行 */
  ganWuxing: WuXing
  /** 地支，如 "子" */
  zhi: string
  /** 地支五行 */
  zhiWuxing: WuXing
  /** 天干十神，可选，如 "正官" */
  ganShiShen?: string
  /** 地支藏干，可选 */
  cangGan?: string[]
  /** 纳音，可选 */
  naYin?: string
}

/** 五行占比 */
export interface WuXingRatio {
  wuxing: WuXing
  /** 数量或百分比 */
  value: number
  /** 显示标签，可选 */
  label?: string
}

/** 时辰吉凶项 */
export interface HourLuck {
  /** 时辰，如 "子时" */
  name: string
  /** 时间范围，如 "23:00-01:00" */
  range: string
  /** 时辰干支，可选 */
  ganzhi?: string
  luck: LuckLevel
  /** 简述，如 "宜出行" */
  note?: string
  /** 是否当前时辰 */
  current?: boolean
}

/** 方位项（八方 + 中宫） */
export interface DirectionItem {
  /** 方位名，如 "正东" "东南" */
  name: string
  /** 八卦/角度定位键：N/NE/E/SE/S/SW/W/NW */
  key: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW"
  luck: LuckLevel
  /** 用途标签，如 "喜神" "财神" "贵人" */
  tag?: string
}

/** 宜忌项 */
export interface YiJiItem {
  text: string
  /** 说明，可选 */
  detail?: string
}

/** 老黄历详情表格行（值神/五行/冲煞/神煞…） */
export interface AlmanacRow {
  /** 栏目名，如 "值神" "二十八星宿" */
  label: string
  /** 内容，如 "天德(黄道日)" */
  value: string
  /** 是否吉/凶着色，可选 */
  tone?: LuckLevel
  /** 跨列显示（如彭祖百忌占整行），可选 */
  wide?: boolean
}

/** 九宫飞星 · 单宫 */
export interface FlyingStar {
  /** 宫位名，如 "巽宫" "中宫" */
  palace: string
  /** 方位，如 "东南" "正南" */
  direction: string
  /** 九宫格定位键 */
  key: "SE" | "S" | "SW" | "E" | "CENTER" | "W" | "NE" | "N" | "NW"
  /** 星曜全名，如 "七赤破军星" */
  star: string
  /** 星序数字 1-9 */
  num: number
  /** 星曜五行 */
  wuxing: WuXing
  /** 位名，如 "破财位" "文昌位" "五黄煞" */
  positionName: string
  /** 关键词，如 ["官非","破财","贼劫"] */
  keywords: string[]
  luck: LuckLevel
}

/** 时辰民俗征兆（玉匣记：眼跳/耳热…） */
export interface HourOmen {
  /** 征兆名，如 "眼跳" "耳热" */
  name: string
  /** 释义，如 "左主客至右主官非" */
  meaning: string
}

/** 五方位吉神（喜神/福神/财神/阳贵/阴贵） */
export interface AuspiciousGod {
  /** 神名，如 "喜神" */
  name: string
  /** 方位，如 "正南" */
  direction: string
  /** 八方定位键，可选（用于罗盘） */
  key?: DirectionItem["key"]
}

/** 倒计时项（节假日 / 节气通用） */
export interface CountdownItem {
  /** 名称，如 "中秋节" "小暑" */
  name: string
  /** 日期文案，如 "2026年09月25日 周五" */
  dateLabel: string
  /** 距今天数：负=已过，0=今天，正=未来 */
  deltaDays: number
  /** 角标，如 "3天假"，可选 */
  badge?: string
  /** 图标名（用 lucide key），可选 */
  icon?: "moon" | "sun" | "flag" | "sprout" | "flame" | "gift"
}

/** 历史上的今天 · 事件 */
export interface HistoryEvent {
  /** 年份，如 "1997" */
  year: string
  /** 事件描述 */
  text: string
}

/** 白话文宜忌解释 */
export interface VernacularYiJi {
  type: "yi" | "ji"
  /** 术语，如 "嫁娶" */
  term: string
  /** 大白话解释 */
  plain: string
}

/** 五行穿衣 · 吉色建议 */
export interface WuxingDress {
  /** 吉利等级，如 "大吉" "次吉" "平" */
  level: string
  /** 颜色名，如 "白色系" */
  color: string
  /** 色值 token 名（映射到 wuxing 色），可选 */
  wuxing: WuXing
  luck: LuckLevel
  /** 说明，如 "利事业财运"，可选 */
  note?: string
}
