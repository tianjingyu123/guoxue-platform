// 八字数据转换 - API返回格式 -> 前端使用格式

// API返回的八字数据结构
export interface BaziApiResult {
  siZhu: {
    nian: { gan: string; zhi: string; naYin: string; cangGan: string[] }
    yue: { gan: string; zhi: string; naYin: string; cangGan: string[] }
    ri: { gan: string; zhi: string; naYin: string; cangGan: string[] }
    shi: { gan: string; zhi: string; naYin: string; cangGan: string[] }
  }
  geJu: {
    name: string
    type: string
    yongShen: string[]
    xiShen: string[]
    jiShen: string[]
  }
  qiYun: {
    startAge: number
    startYear: number
    direction: "顺" | "逆"
    daYun: Array<{
      gan: string
      zhi: string
      startAge: number
      endAge: number
      startYear: number
      endYear: number
      liuNian: Array<{ year: number; gan: string; zhi: string }>
    }>
  }
  shiShen: Record<string, string>
  wuXing: {
    counts: Record<string, number>
    qiang: string[]
    ruo: string[]
  }
  kongWang: string[]
  shenSha: Array<{ name: string; position: string }>
}

// 前端使用的八字数据结构
export interface BaziFrontendData {
  sizhu: {
    year: { g: string; z: string; nayin?: string; cangGan?: string[] }
    month: { g: string; z: string; nayin?: string; cangGan?: string[] }
    day: { g: string; z: string; nayin?: string; cangGan?: string[] }
    hour: { g: string; z: string; nayin?: string; cangGan?: string[] }
  }
  geju: {
    name: string
    type: string
    yongShen: string[]
    xiShen: string[]
    jiShen: string[]
  }
  qiyun: {
    startAge: number
    startYear: number
    direction: "顺" | "逆"
  }
  dayun: Array<{
    gan: string
    zhi: string
    startAge: number
    endAge: number
    startYear: number
    endYear: number
    liunian: Array<{ year: number; gan: string; zhi: string }>
  }>
  shiShen: Record<string, string>
  wuxing: {
    counts: Record<string, number>
    qiang: string[]
    ruo: string[]
  }
  kongwang: string[]
  shensha: Array<{ name: string; position: string }>
}

// 转换函数
export function transformBaziResult(apiResult: BaziApiResult): BaziFrontendData {
  return {
    sizhu: {
      year: {
        g: apiResult.siZhu.nian.gan,
        z: apiResult.siZhu.nian.zhi,
        nayin: apiResult.siZhu.nian.naYin,
        cangGan: apiResult.siZhu.nian.cangGan,
      },
      month: {
        g: apiResult.siZhu.yue.gan,
        z: apiResult.siZhu.yue.zhi,
        nayin: apiResult.siZhu.yue.naYin,
        cangGan: apiResult.siZhu.yue.cangGan,
      },
      day: {
        g: apiResult.siZhu.ri.gan,
        z: apiResult.siZhu.ri.zhi,
        nayin: apiResult.siZhu.ri.naYin,
        cangGan: apiResult.siZhu.ri.cangGan,
      },
      hour: {
        g: apiResult.siZhu.shi.gan,
        z: apiResult.siZhu.shi.zhi,
        nayin: apiResult.siZhu.shi.naYin,
        cangGan: apiResult.siZhu.shi.cangGan,
      },
    },
    geju: apiResult.geJu,
    qiyun: {
      startAge: apiResult.qiYun.startAge,
      startYear: apiResult.qiYun.startYear,
      direction: apiResult.qiYun.direction,
    },
    dayun: apiResult.qiYun.daYun.map((dy) => ({
      gan: dy.gan,
      zhi: dy.zhi,
      startAge: dy.startAge,
      endAge: dy.endAge,
      startYear: dy.startYear,
      endYear: dy.endYear,
      liunian: dy.liuNian,
    })),
    shiShen: apiResult.shiShen,
    wuxing: apiResult.wuXing,
    kongwang: apiResult.kongWang,
    shensha: apiResult.shenSha,
  }
}
