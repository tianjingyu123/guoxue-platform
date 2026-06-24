/** 八字结果页示例数据（从原型 result/page.tsx 1:1 迁移） */
import { GAN_SHI_SHEN } from './bazi-constants'
import { apiGet, useMock } from '@/utils/request'

const _mockBaziData = {
  name: '未知', gender: '男', zodiac: '猪', qianKun: '乾造', birthYear: 1983,
  solarDate: '1983年6月18日 14时31分', lunarDate: '五月初八',
  realSolarTime: '1983年06月18日 14时13分（北京 房山区）',
  jieQi: '芒种后12天0小时，夏至前3天17小时',
  siZhu: {
    year: { gan: '癸', zhi: '亥', shiShen: '杀', cangGan: [{ gan: '壬', shen: '官' }, { gan: '甲', shen: '印' }], naYin: '大海水', diShi: '胎', ziZuo: '帝旺', kongWang: '子丑' },
    month: { gan: '戊', zhi: '午', shiShen: '伤', cangGan: [{ gan: '丁', shen: '比' }, { gan: '己', shen: '食' }], naYin: '天上火', diShi: '临官', ziZuo: '帝旺', kongWang: '子丑' },
    day: { gan: '丁', zhi: '丑', shiShen: '日元', cangGan: [{ gan: '己', shen: '食' }, { gan: '癸', shen: '杀' }, { gan: '辛', shen: '才' }], naYin: '涧下水', diShi: '墓', ziZuo: '墓', kongWang: '申酉' },
    hour: { gan: '丁', zhi: '未', shiShen: '比', cangGan: [{ gan: '己', shen: '食' }, { gan: '丁', shen: '比' }, { gan: '乙', shen: '枭' }], naYin: '天河水', diShi: '冠带', ziZuo: '冠带', kongWang: '寅卯' },
  },
  shenSha: {
    year: ['驿马', '天德贵人', '禄神', '词馆'],
    month: ['禄神', '词馆', '阴差阳错'],
    day: ['阴差阳错', '华盖'],
    hour: ['华盖', '红艳', '天德贵人'],
  },
  taiYuan: { gan: '己', zhi: '酉', naYin: '大驿土' },
  mingGong: { gan: '丙', zhi: '辰', naYin: '沙中土' },
  shenGong: { gan: '甲', zhi: '寅', naYin: '大溪水' },
  qiYun: '出生后3年11个月29日起大运，每逢丁年6月16日前后交运。',
  daYun: [
    { year: 1983, gan: '戊', zhi: '午', shiShen: '伤', shiShenZhi: '劫', age: 0 },
    { year: 1987, gan: '丁', zhi: '巳', shiShen: '比', shiShenZhi: '枭', age: 4 },
    { year: 1997, gan: '丙', zhi: '辰', shiShen: '劫', shiShenZhi: '食', age: 14 },
    { year: 2007, gan: '乙', zhi: '卯', shiShen: '枭', shiShenZhi: '枭', age: 24 },
    { year: 2017, gan: '甲', zhi: '寅', shiShen: '印', shiShenZhi: '印', age: 34, active: true },
    { year: 2027, gan: '癸', zhi: '丑', shiShen: '杀', shiShenZhi: '食', age: 44 },
    { year: 2037, gan: '壬', zhi: '子', shiShen: '官', shiShenZhi: '官', age: 54 },
    { year: 2047, gan: '辛', zhi: '亥', shiShen: '才', shiShenZhi: '官', age: 64 },
    { year: 2057, gan: '庚', zhi: '戌', shiShen: '财', shiShenZhi: '伤', age: 74 },
    { year: 2067, gan: '己', zhi: '酉', shiShen: '食', shiShenZhi: '才', age: 84 },
  ],
  liuNian: [
    { year: 2018, gan: '戊', zhi: '戌', shiShen: '伤', shiShenZhi: '伤', age: 36 },
    { year: 2019, gan: '己', zhi: '亥', shiShen: '食', shiShenZhi: '官', age: 37 },
    { year: 2020, gan: '庚', zhi: '子', shiShen: '财', shiShenZhi: '官', age: 38 },
    { year: 2021, gan: '辛', zhi: '丑', shiShen: '才', shiShenZhi: '食', age: 39 },
    { year: 2022, gan: '壬', zhi: '寅', shiShen: '官', shiShenZhi: '印', age: 40 },
    { year: 2023, gan: '癸', zhi: '卯', shiShen: '杀', shiShenZhi: '枭', age: 41 },
    { year: 2024, gan: '甲', zhi: '辰', shiShen: '印', shiShenZhi: '食', age: 42 },
    { year: 2025, gan: '乙', zhi: '巳', shiShen: '枭', shiShenZhi: '枭', age: 43 },
    { year: 2026, gan: '丙', zhi: '午', shiShen: '劫', shiShenZhi: '劫', age: 44, active: true },
    { year: 2027, gan: '丁', zhi: '未', shiShen: '比', shiShenZhi: '食', age: 45 },
  ],
  relations: {
    tianGan: ['丙辛合', '戊癸合化火'],
    diZhi: ['亥卯未三合', '巳午未三会', '丑未冲', '午午刑', '寅巳害'],
    zhengZhu: ['己亥冲', '寅亥合', '午丑害'],
  },
  wuxingState: { 木: '旺', 火: '相', 土: '休', 金: '囚', 水: '死' } as Record<string, string>,
}

export const classics = [
  { id: 'qiong', name: '穷通宝鉴' },
  { id: 'di', name: '滴天髓' },
  { id: 'san', name: '三命通会' },
  { id: 'bazi', name: '八字提要' },
]

const _mockClassicsContent: Record<string, { title: string; original: string; translation: string }> = {
  qiong: {
    title: '论丁生午月',
    original: '五月丁火建禄，正值火旺之时，火当令而旺，以金水为用神为宜。用壬不可少甲，最为紧要。丙丁并透，又加支中火多，无壬水制之，其人必操屠宰业。用壬者，金妻水子。若得庚辛壬三者齐透，科甲功名。',
    translation: '五月丁火处于建禄之位，正值火势最旺的时候，火在当令之时非常旺盛，应该以金水作为用神。使用壬水时不能缺少甲木的配合，这是最关键的要点。如果丙丁都透出天干，再加上地支火多，没有壬水来制约，此人必定从事屠宰行业。用壬水为用神的，娶金命之妻、生水命之子。若庚辛壬三者都透出天干，可得科举功名。',
  },
  di: {
    title: '论丁火',
    original: '丁火柔中，内性昭融。抱乙而孝，合壬而忠。旺而不烈，衰而不穷。如有嫡母，可秋可冬。',
    translation: '丁火属阴，性质柔和而内在光明通达。与乙木相依是慈孝之象，与壬水相合是忠义之征。丁火旺盛时不会过于猛烈，衰弱时也不会走投无路。如果命中有甲木正印来生助，即使在秋冬失令之时也能自立。丁火犹如灯烛之光，虽小而能照亮四方。',
  },
  san: {
    title: '丁丑日柱论',
    original: '丁丑坐墓库，为金神格局。丁火坐丑中己土食神、辛金偏财、癸水七杀。若身旺能任财杀，主富贵。丁火日主坐墓地，逢冲则发。丑中暗藏三奇：己辛癸，食神生偏财，偏财引七杀，一路顺生有情。',
    translation: '丁丑日柱是丁火坐在墓库之上，属于金神格局。丑土中暗藏己土（食神）、辛金（偏财）、癸水（七杀）。如果日主身旺能够承担财杀，主人富贵。丁火日主坐在墓地，遇到冲击就会发达。丑土中暗藏食神、偏财、七杀三种元素，食神生偏财、偏财引七杀，形成一路顺生的有情组合。',
  },
  bazi: {
    title: '五月提要（午月）',
    original: '午月丁火建禄，火势炎上。宜壬水高透以制火，庚金佐之发水源。甲木不可少，引丁成文明之象。午月火旺土燥，金水为调候急需。若壬甲两透，定主科甲。壬透甲藏，亦可功名。无壬用癸，格局稍次。',
    translation: '午月丁火正当建禄之时，火势极为旺盛向上。适宜壬水在天干高透来制约火势，庚金辅助壬水以发其源头。甲木不可缺少，引导丁火成为文明之象。午月火旺土燥，金水是调候的急切需要。如果壬水和甲木都透出天干，必定主科举功名。壬水透出而甲木暗藏在地支，也可以取得功名。没有壬水而用癸水代替，格局稍差一些。',
  },
}

export const baziApi = {
  /** 八字排盘结果 */
  async calculate(input: { name?: string; gender: string; year: number; month: number; day: number; hour: number; minute?: number; place?: string }) {
    if (true) return _mockBaziData
    try {
      const params = new URLSearchParams({
        year: String(input.year), month: String(input.month), day: String(input.day),
        hour: String(input.hour), minute: String(input.minute ?? 0),
        gender: input.gender
      }).toString()
      return await apiGet<any>('/paipan/bazi/calculate?' + params)
    }
    catch { return _mockBaziData }
  },

  /** 古籍参考内容 */
  async classicsRef(bookId: string) {
    if (true) return _mockClassicsContent[bookId] || null
    try {
      const data = await apiGet<any>(`/paipan/bazi/classics/${bookId}`)
      return data || _mockClassicsContent[bookId] || null
    } catch { return _mockClassicsContent[bookId] || null }
  },

  /** 保存排盘记录 */
  async save(input: any) {
    if (true) return { id: 'mock-bazi-id' }
    try { return await apiGet<any>('/paipan/bazi/save') }
    catch { return { id: 'mock-bazi-id' } }
  },
}
