// ─── 八字展示辅助：结果类型 + 城市经纬度 + 农历文本 ───
// 2026-09-21 第 4 步：八字组装已迁服务端 apps/server/src/modules/paipan/engine/bazi-engine.ts，
// 前端只留页面仍要用的纯展示项。以下各段与服务端副本逐字一致，由 test/paipan-engine-copies.spec.ts 守。
// 🔴 不要在此重新加入排盘计算——算法只在服务端。

export interface PillarView {
  gan: string
  zhi: string
  shiShen: string
  cangGan: { gan: string; shen: string }[]
  naYin: string
  diShi: string
  ziZuo: string
  kongWang: string
}

export interface BaziData {
  name: string
  gender: string
  zodiac: string
  qianKun: string
  birthYear: number
  solarDate: string
  lunarDate: string
  realSolarTime: string
  jieQi: string
  siZhu: { year: PillarView; month: PillarView; day: PillarView; hour: PillarView }
  shenSha: { year: string[]; month: string[]; day: string[]; hour: string[] }
  taiYuan: { gan: string; zhi: string; naYin: string }
  mingGong: { gan: string; zhi: string; naYin: string }
  shenGong: { gan: string; zhi: string; naYin: string }
  qiYun: string
  daYun: { year: number; gan: string; zhi: string; shiShen: string; shiShenZhi: string; age: number; active?: boolean }[]
  liuNian: { year: number; gan: string; zhi: string; shiShen: string; shiShenZhi: string; age: number; active?: boolean }[]
  relations: { tianGan: string[]; diZhi: string[] }
  wuxingState: Record<string, string>
  wuxingPower: Record<string, number>
  yongJi: { yongShen: string; xiShen: string; jiShen: string; tiaoHou: string; note: string }
}


// 主要城市经度（真太阳时修正用）
const CITY_LNG: Record<string, number> = {
  北京: 116.4, 上海: 121.47, 广州: 113.26, 深圳: 114.06, 杭州: 120.16, 南京: 118.78,
  成都: 104.07, 重庆: 106.55, 武汉: 114.3, 西安: 108.94, 天津: 117.2, 苏州: 120.58,
  郑州: 113.63, 长沙: 112.94, 沈阳: 123.43, 青岛: 120.38, 大连: 121.61, 厦门: 118.09,
  福州: 119.3, 昆明: 102.83, 兰州: 103.83, 乌鲁木齐: 87.62, 拉萨: 91.11, 哈尔滨: 126.63,
  长春: 125.32, 石家庄: 114.51, 太原: 112.55, 合肥: 117.28, 南昌: 115.89, 贵阳: 106.63,
  南宁: 108.37, 海口: 110.32, 银川: 106.28, 西宁: 101.78, 呼和浩特: 111.75,
}

// 主要城市纬度（与 CITY_LNG 同一份城市清单；七政四余需纬度算命宫与日月出没）
const CITY_LAT: Record<string, number> = {
  北京: 39.9, 上海: 31.23, 广州: 23.13, 深圳: 22.54, 杭州: 30.27, 南京: 32.06,
  成都: 30.57, 重庆: 29.56, 武汉: 30.59, 西安: 34.34, 天津: 39.13, 苏州: 31.3,
  郑州: 34.75, 长沙: 28.23, 沈阳: 41.8, 青岛: 36.07, 大连: 38.91, 厦门: 24.48,
  福州: 26.07, 昆明: 25.04, 兰州: 36.06, 乌鲁木齐: 43.83, 拉萨: 29.65, 哈尔滨: 45.8,
  长春: 43.82, 石家庄: 38.04, 太原: 37.87, 合肥: 31.86, 南昌: 28.68, 贵阳: 26.65,
  南宁: 22.82, 海口: 20.04, 银川: 38.49, 西宁: 36.62, 呼和浩特: 40.84,
}

/** 城市经度查询（查不到返回 undefined，其他排盘引擎复用） */
export function cityLongitude(city?: string | null): number | undefined {
  return city ? CITY_LNG[city] : undefined
}

/** 城市纬度查询（查不到返回 undefined；七政四余排盘用） */
export function cityLatitude(city?: string | null): number | undefined {
  return city ? CITY_LAT[city] : undefined
}

export function lunarText(y: number, m: number, d: number): string {
  try {
    const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { month: "long", day: "numeric" }).formatToParts(new Date(y, m - 1, d))
    const mm = parts.find((p) => p.type === "month")?.value || ""
    const dd = Number(parts.find((p) => p.type === "day")?.value || "1")
    const CN_DAY = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"]
    return `${mm}${CN_DAY[dd] || dd}`
  } catch {
    return ""
  }
}
