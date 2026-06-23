// 奇门数据转换 - API返回格式 -> 前端使用格式

// API返回的奇门数据结构
export interface QimenApiResult {
  juNumber: number // 局数 1-9
  juType: "阳遁" | "阴遁"
  zhiFu: string // 值符
  zhiShiMen: string // 值使门
  xunShou: string // 旬首
  kongWang: string[] // 空亡
  maXing: number // 马星落宫
  jieQi: {
    current: string
    next: string
    currentDate: string
    nextDate: string
  }
  siZhu: {
    nian: { gan: string; zhi: string }
    yue: { gan: string; zhi: string }
    ri: { gan: string; zhi: string }
    shi: { gan: string; zhi: string }
  }
  gongs: Array<{
    position: number // 宫位 1-9
    star: string // 九星
    men: string // 八门
    shen: string // 八神
    diPan: string // 地盘干
    tianPan: string // 天盘干
    anGan: string // 暗干
    diPanShen?: string // 地盘九神
    changSheng?: { tian: string; an: string } // 长生状态
    isZhiFu: boolean // 是否值符落宫
    isZhiShi: boolean // 是否值使落宫
    isRuMu: boolean // 是否入墓
    isJiXing: boolean // 是否击刑
    isMenPo: boolean // 是否门迫
  }>
}

// 前端使用的奇门数据结构
export interface QimenFrontendData {
  ju: { isYang: boolean; num: number }
  zhifu: string
  zhishi: string
  xunShou: string
  kongwang: Array<{ zhi: string; gong: number[] }>
  maXing: string // 地支
  jieqi: {
    current: string
    next: string
    currentDate: string
    nextDate: string
  }
  sizhu: {
    year: { g: string; z: string }
    month: { g: string; z: string }
    day: { g: string; z: string }
    hour: { g: string; z: string }
  }
  palaces: Record<
    number,
    {
      bashen: string
      jiuxing: string
      bamen: string
      tianGan: string
      diGan: string
      anGan: string
      dipanShen?: string
      changsheng: { tian: string; an: string }
      isZhifu: boolean
      isZhishi: boolean
      isRuMu: boolean
      isJiXing: boolean
      isMenPo: boolean
    }
  >
}

// 地支数组
const DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

// 转换函数
export function transformQimenResult(apiResult: QimenApiResult): QimenFrontendData {
  // 转换九宫数据
  const palaces: QimenFrontendData["palaces"] = {}
  for (const gong of apiResult.gongs) {
    palaces[gong.position] = {
      bashen: gong.shen,
      jiuxing: gong.star,
      bamen: gong.men,
      tianGan: gong.tianPan,
      diGan: gong.diPan,
      anGan: gong.anGan,
      dipanShen: gong.diPanShen,
      changsheng: gong.changSheng || { tian: "", an: "" },
      isZhifu: gong.isZhiFu,
      isZhishi: gong.isZhiShi,
      isRuMu: gong.isRuMu,
      isJiXing: gong.isJiXing,
      isMenPo: gong.isMenPo,
    }
  }

  // 转换空亡为前端格式（地支 -> 宫位映射）
  const kongwangMap: Record<string, number[]> = {}
  for (const zhi of apiResult.kongWang) {
    if (!kongwangMap[zhi]) {
      kongwangMap[zhi] = []
    }
    // 根据地支找到对应宫位（简化处理，实际需要根据盘面计算）
    const zhiIndex = DIZHI.indexOf(zhi)
    if (zhiIndex !== -1) {
      kongwangMap[zhi].push((zhiIndex % 9) + 1)
    }
  }
  const kongwang = Object.entries(kongwangMap).map(([zhi, gong]) => ({ zhi, gong }))

  return {
    ju: {
      isYang: apiResult.juType === "阳遁",
      num: apiResult.juNumber,
    },
    zhifu: apiResult.zhiFu,
    zhishi: apiResult.zhiShiMen,
    xunShou: apiResult.xunShou,
    kongwang,
    maXing: DIZHI[apiResult.maXing - 1] || "午",
    jieqi: apiResult.jieQi,
    sizhu: {
      year: { g: apiResult.siZhu.nian.gan, z: apiResult.siZhu.nian.zhi },
      month: { g: apiResult.siZhu.yue.gan, z: apiResult.siZhu.yue.zhi },
      day: { g: apiResult.siZhu.ri.gan, z: apiResult.siZhu.ri.zhi },
      hour: { g: apiResult.siZhu.shi.gan, z: apiResult.siZhu.shi.zhi },
    },
    palaces,
  }
}
