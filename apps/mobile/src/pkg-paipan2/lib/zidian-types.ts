/**
 * 字典 · 前端类型
 *
 * 汉字字段补全（康熙笔画/五行/结构/数理/生肖宜忌/起名用字）与选字广场筛选已迁至服务端
 * （apps/server/src/modules/paipan/engine/zidian-engine.ts），前端只经 POST /paipan/engine/zidian-* 拿结果。
 */
export interface RemoteEntry {
  char: string
  traditional: string
  pinyin: string
  explanation: string
}

export interface ZidianResult {
  char: string
  traditional: string
  pinyins: string[]
  primaryPinyin: string
  radical: string // 康熙部首（姓名学）
  radicalModern: string // 现代部首（无 zdic 时同康熙部首）
  structure: string // 汉字结构名（左右/上下/独体…）
  structureCode: string // 结构代码（L/T/S…，供筛选）
  strokesSimp: number // 简体笔画（无 zdic 时同康熙笔画）
  strokesKangxi: number // 康熙笔画（五格剖象用）
  wuxing: string // 字形五行（部首为主）
  wuxingShuli: string // 数理五行（康熙笔画尾数）
  wuyin: { yin: string; desc: string }
  shuli: { num: number; name: string; luck: string; judgment: string } // 康熙笔画对应 81 数理
  explanation: string // 新华字典释义（后端注入）
  hasExplanation: boolean // 释义是否来自词典（false=未取到，展示兜底文案）
  zodiacYi: string[] // 适宜生肖
  zodiacJi: { zodiac: string; reason: string }[] // 忌用生肖及理由
  naming: string // 姓名学综合提示
  unicode: string // 统一码 U+XXXX
  wuxingReason: string // 五行判定依据（形/音/数理）
  nameLuck: { level: string; comment: string } // 吉凶寓意综合评估
  genderFit: { fit: string; reason: string } // 适用性别
  sancaiAdvice: string // 三才搭配建议
}

export interface PlazaChar extends ZidianResult {
  meaning: string
  fit: string
  poem?: { source: string; quote: string }
}
