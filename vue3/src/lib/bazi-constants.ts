// ─── 八字公共常量 ───（从原型 lib/bazi-constants.ts 1:1 迁移，基于日主丁火的十神映射）

export const GANS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'] as const
export const ZHIS = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const

// 天干十神映射（以丁火为日主）
export const GAN_SHI_SHEN: Record<string, string> = {
  甲: '印', 乙: '枭', 丙: '劫', 丁: '比',
  戊: '伤', 己: '食', 庚: '财', 辛: '才',
  壬: '官', 癸: '杀',
}

// 地支十神映射（以丁火为日主，取本气）
export const ZHI_SHI_SHEN: Record<string, string> = {
  子: '官', 丑: '食', 寅: '印', 卯: '枭',
  辰: '食', 巳: '枭', 午: '劫', 未: '食',
  申: '财', 酉: '才', 戌: '伤', 亥: '官',
}

// 地支藏干映射（本气、中气、余气）
export const ZHI_CANG_GAN: Record<string, { gan: string; shen: string }[]> = {
  子: [{ gan: '癸', shen: GAN_SHI_SHEN['癸'] }],
  丑: [{ gan: '己', shen: GAN_SHI_SHEN['己'] }, { gan: '癸', shen: GAN_SHI_SHEN['癸'] }, { gan: '辛', shen: GAN_SHI_SHEN['辛'] }],
  寅: [{ gan: '甲', shen: GAN_SHI_SHEN['甲'] }, { gan: '丙', shen: GAN_SHI_SHEN['丙'] }, { gan: '戊', shen: GAN_SHI_SHEN['戊'] }],
  卯: [{ gan: '乙', shen: GAN_SHI_SHEN['乙'] }],
  辰: [{ gan: '戊', shen: GAN_SHI_SHEN['戊'] }, { gan: '乙', shen: GAN_SHI_SHEN['乙'] }, { gan: '癸', shen: GAN_SHI_SHEN['癸'] }],
  巳: [{ gan: '丙', shen: GAN_SHI_SHEN['丙'] }, { gan: '庚', shen: GAN_SHI_SHEN['庚'] }, { gan: '戊', shen: GAN_SHI_SHEN['戊'] }],
  午: [{ gan: '丁', shen: GAN_SHI_SHEN['丁'] }, { gan: '己', shen: GAN_SHI_SHEN['己'] }],
  未: [{ gan: '己', shen: GAN_SHI_SHEN['己'] }, { gan: '丁', shen: GAN_SHI_SHEN['丁'] }, { gan: '乙', shen: GAN_SHI_SHEN['乙'] }],
  申: [{ gan: '庚', shen: GAN_SHI_SHEN['庚'] }, { gan: '壬', shen: GAN_SHI_SHEN['壬'] }, { gan: '戊', shen: GAN_SHI_SHEN['戊'] }],
  酉: [{ gan: '辛', shen: GAN_SHI_SHEN['辛'] }],
  戌: [{ gan: '戊', shen: GAN_SHI_SHEN['戊'] }, { gan: '辛', shen: GAN_SHI_SHEN['辛'] }, { gan: '丁', shen: GAN_SHI_SHEN['丁'] }],
  亥: [{ gan: '壬', shen: GAN_SHI_SHEN['壬'] }, { gan: '甲', shen: GAN_SHI_SHEN['甲'] }],
}

// 五行颜色类名映射（指向 wuxing 令牌, 用于 :class 绑定）
export const wuxingColorClass: Record<string, string> = {
  甲: 'wx-wood', 乙: 'wx-wood', 丙: 'wx-fire', 丁: 'wx-fire',
  戊: 'wx-earth', 己: 'wx-earth', 庚: 'wx-metal', 辛: 'wx-metal',
  壬: 'wx-water', 癸: 'wx-water',
  子: 'wx-water', 丑: 'wx-earth', 寅: 'wx-wood', 卯: 'wx-wood',
  辰: 'wx-earth', 巳: 'wx-fire', 午: 'wx-fire', 未: 'wx-earth',
  申: 'wx-metal', 酉: 'wx-metal', 戌: 'wx-earth', 亥: 'wx-water',
}
// 五行(木火土金水)背景+文字类名
export const wuxingBgClass: Record<string, string> = {
  木: 'wxb-wood', 火: 'wxb-fire', 土: 'wxb-earth', 金: 'wxb-metal', 水: 'wxb-water',
}

// 根据年份计算天干地支
export function getGanZhi(year: number) {
  const gan = GANS[(year - 4) % 10]
  const zhi = ZHIS[(year - 4) % 12]
  return { gan, zhi }
}

// 生成指定年份范围的流年数据
export function generateLiuNian(startYear: number, count: number, birthYear: number) {
  return Array.from({ length: count }, (_, i) => {
    const year = startYear + i
    const { gan, zhi } = getGanZhi(year)
    const currentYear = new Date().getFullYear()
    return {
      year, gan, zhi,
      shiShen: GAN_SHI_SHEN[gan],
      shiShenZhi: ZHI_SHI_SHEN[zhi],
      age: year - birthYear,
      active: year === currentYear,
    }
  })
}
