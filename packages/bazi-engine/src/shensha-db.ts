/**
 * 神煞大全模块（~180+ 神煞）
 * 包含：吉神、凶煞、小儿关煞、流年神煞等
 * 基于《渊海子平》《三命通会》《协纪辨方书》+ 问真八字竞品分析
 */
import type { Gan, Zhi, SiZhu, ShenShaItem } from './types'
import { ZHI, GAN } from './constants'

// ==================== 辅助函数 ====================

/** 在四柱中查找匹配的神煞并记录 */
function findInPillars(
  pillars: { key: string; gan: Gan; zhi: Zhi }[],
  predicate: (p: { key: string; gan: Gan; zhi: Zhi }) => boolean,
  name: string, type: 'ji' | 'xiong', desc: string, results: ShenShaItem[]
) {
  for (const p of pillars) {
    if (predicate(p)) {
      results.push({ name, type, desc, pillar: p.key })
    }
  }
}

// ==================== 吉神（~90个） ====================

/** 1. 天乙贵人（日干/年干查） */
const TIAN_YI_GUI_REN: Record<Gan, Zhi[]> = {
  '甲': ['丑','未'], '乙': ['子','申'], '丙': ['亥','酉'], '丁': ['亥','酉'],
  '戊': ['丑','未'], '己': ['子','申'], '庚': ['午','寅'], '辛': ['午','寅'],
  '壬': ['巳','卯'], '癸': ['巳','卯'],
}

/** 2. 太极贵人（日干查） */
const TAI_JI_GUI_REN: Record<Gan, Zhi[]> = {
  '甲': ['子','午'], '乙': ['子','午'], '丙': ['卯','酉'], '丁': ['卯','酉'],
  '戊': ['辰','戌','丑','未'], '己': ['辰','戌','丑','未'],
  '庚': ['寅','亥'], '辛': ['寅','亥'], '壬': ['巳','申'], '癸': ['巳','申'],
}

/** 3. 天德贵人（月支查） */
const TIAN_DE_GUI_REN: Record<Zhi, string> = {
  '寅': '丁','卯': '申','辰': '壬','巳': '辛','午': '亥','未': '甲',
  '申': '癸','酉': '寅','戌': '丙','亥': '乙','子': '巳','丑': '庚',
}

/** 4. 天德合（天德所在天干的五合干） */
const TIAN_DE_HE: Record<Zhi, string> = {
  '寅': '壬','卯': '巳','辰': '丁','巳': '丙','午': '寅','未': '己',
  '申': '戊','酉': '亥','戌': '辛','亥': '庚','子': '甲','丑': '乙',
}

/** 5. 月德贵人（月支查） */
const YUE_DE_GUI_REN: Record<Zhi, Gan> = {
  '寅': '丙','卯': '甲','辰': '壬','巳': '庚','午': '丙','未': '甲',
  '申': '壬','酉': '庚','戌': '丙','亥': '甲','子': '壬','丑': '庚',
}

/** 6. 月德合（月德所在天干的五合干） */
const YUE_DE_HE: Record<Zhi, Gan> = {
  '寅': '辛','卯': '己','辰': '丁','巳': '乙','午': '辛','未': '己',
  '申': '丁','酉': '乙','戌': '辛','亥': '己','子': '丁','丑': '乙',
}

/** 7. 文昌贵人（日干查） */
const WEN_CHANG: Record<Gan, Zhi> = {
  '甲': '巳','乙': '午','丙': '申','丁': '酉','戊': '申',
  '己': '酉','庚': '亥','辛': '子','壬': '寅','癸': '卯',
}

/** 8. 学堂（日干查，与文昌对照） */
const XUE_TANG: Record<Gan, Zhi> = {
  '甲': '亥','乙': '午','丙': '寅','丁': '酉','戊': '寅',
  '己': '酉','庚': '巳','辛': '子','壬': '申','癸': '卯',
}

/** 9. 词馆（日干查，学堂的对宫） */
function getCiGuan(riGan: Gan): Zhi | null {
  const xt = XUE_TANG[riGan]
  if (!xt) return null
  return ZHI[(ZHI.indexOf(xt) + 6) % 12]
}

/** 10. 福星贵人（日干查） */
const FU_XING_GUI_REN: Record<Gan, Zhi> = {
  '甲': '丑','乙': '巳','丙': '寅','丁': '未','戊': '巳',
  '己': '未','庚': '申','辛': '酉','壬': '丑','癸': '卯',
}

/** 11. 禄神/十干禄（日干查） */
const LU_SHEN: Record<Gan, Zhi> = {
  '甲': '寅','乙': '卯','丙': '巳','丁': '午','戊': '巳',
  '己': '午','庚': '申','辛': '酉','壬': '亥','癸': '子',
}

/** 12. 金舆（日干查） */
const JIN_YU: Record<Gan, Zhi> = {
  '甲': '辰','乙': '巳','丙': '未','丁': '申','戊': '未',
  '己': '申','庚': '戌','辛': '亥','壬': '丑','癸': '寅',
}

/** 13. 国印贵人（日干查） */
const GUO_YIN: Record<Gan, Zhi> = {
  '甲': '戌','乙': '亥','丙': '丑','丁': '寅','戊': '丑',
  '己': '寅','庚': '辰','辛': '巳','壬': '未','癸': '申',
}

/** 14. 天厨贵人（日干查） */
const TIAN_CHU: Record<Gan, Zhi> = {
  '甲': '巳','乙': '午','丙': '子','丁': '巳','戊': '午',
  '己': '申','庚': '寅','辛': '午','壬': '酉','癸': '亥',
}

/** 15. 魁罡（日柱干支查：庚辰/庚戌/壬辰/戊戌） */
function isKuiGang(riGan: Gan, riZhi: Zhi): boolean {
  const set = new Set(['庚辰','庚戌','壬辰','戊戌'])
  return set.has(riGan + riZhi)
}

/** 16. 将星（日支/年支查，按三合局） */
const JIANG_XING_MAP: Record<Zhi, Zhi> = {
  '申':'子','子':'子','辰':'子','亥':'卯','卯':'卯','未':'卯',
  '寅':'午','午':'午','戌':'午','巳':'酉','酉':'酉','丑':'酉',
}

/** 17. 华盖（日支查，按三合局） */
const HUA_GAI_MAP: Record<Zhi, Zhi> = {
  '申':'辰','子':'辰','辰':'辰','亥':'未','卯':'未','未':'未',
  '寅':'戌','午':'戌','戌':'戌','巳':'丑','酉':'丑','丑':'丑',
}

/** 18. 驿马（日支/年支查） */
const YI_MA_MAP: Record<Zhi, Zhi> = {
  '申':'寅','子':'寅','辰':'寅','亥':'巳','卯':'巳','未':'巳',
  '寅':'申','午':'申','戌':'申','巳':'亥','酉':'亥','丑':'亥',
}

/** 19. 红鸾（日支查） */
const HONG_LUAN: Record<Zhi, Zhi> = {
  '子':'卯','丑':'寅','寅':'丑','卯':'子','辰':'亥','巳':'戌',
  '午':'酉','未':'申','申':'未','酉':'午','戌':'巳','亥':'辰',
}

function getTianXi(riZhi: Zhi): Zhi {
  const idx = ZHI.indexOf(HONG_LUAN[riZhi])
  return ZHI[(idx + 6) % 12]
}

/** 20. 三奇贵人（天上三奇：甲戊庚 / 人中三奇：壬癸辛 / 地下三奇：乙丙丁） */
function getSanQi(riGan: Gan, yueGan: Gan, nianGan: Gan): string | null {
  const gans = [nianGan, yueGan, riGan].join('')
  if (gans.includes('甲') && gans.includes('戊') && gans.includes('庚')) return '天上三奇'
  if (gans.includes('壬') && gans.includes('癸') && gans.includes('辛')) return '人中三奇'
  if (gans.includes('乙') && gans.includes('丙') && gans.includes('丁')) return '地下三奇'
  return null
}

/** 21. 天赦日（日柱查：春戊寅、夏甲午、秋戊申、冬甲子） */
function getTianShe(riGan: Gan, riZhi: Zhi, yueZhi: Zhi): boolean {
  const season: Record<Zhi, string> = {
    '寅':'春','卯':'春','辰':'春',
    '巳':'夏','午':'夏','未':'夏',
    '申':'秋','酉':'秋','戌':'秋',
    '亥':'冬','子':'冬','丑':'冬',
  }
  const s = season[yueZhi]
  const she = riGan + riZhi
  return (s === '春' && she === '戊寅') || (s === '夏' && she === '甲午') ||
         (s === '秋' && she === '戊申') || (s === '冬' && she === '甲子')
}

/** 22. 十干合/六合 */
const GAN_HE_PAIRS: Record<Gan, Gan> = {
  '甲':'己','乙':'庚','丙':'辛','丁':'壬','戊':'癸',
  '己':'甲','庚':'乙','辛':'丙','壬':'丁','癸':'戊',
}

/** 23. 十灵日 */
const SHI_LING_RI = new Set(['甲辰','乙亥','丙辰','丁酉','戊午','庚午','庚戌','辛亥','壬寅','癸未'])

/** 24. 月空（月支查，天德的前三位） */
function getYueKong(yueZhi: Zhi): Gan | null {
  const de = TIAN_DE_GUI_REN[yueZhi]
  if (!de) return null
  const idx = GAN.indexOf(de as Gan)
  return idx >= 0 ? GAN[(idx + 3) % 10] : null
}

/** 25. 岁德（年干查，阳年取年干禄位，阴年取五合干禄位） */
function getSuiDe(nianGan: Gan): Zhi {
  const yang = '甲丙戊庚壬'.includes(nianGan)
  return yang ? LU_SHEN[nianGan] : LU_SHEN[GAN_HE_PAIRS[nianGan]]
}

/** 26. 攀鞍（年支查，驿马前一位） */
function getPanAn(nianZhi: Zhi): Zhi {
  const ma = YI_MA_MAP[nianZhi]
  return ZHI[(ZHI.indexOf(ma) + 11) % 12]
}

/** 27. 天马（月支查） */
const TIAN_MA: Record<Zhi, Zhi> = {
  '寅':'申','卯':'巳','辰':'寅','巳':'亥','午':'申','未':'巳',
  '申':'寅','酉':'亥','戌':'申','亥':'巳','子':'寅','丑':'亥',
}

/** 28. 金匮（黄道吉日，月支查） */
function getJinKui(yueZhi: Zhi): Zhi[] {
  const qingLongIdx = [2,1,0,11,10,9,8,7,6,5,4,3] // 寅月起青龙位
  const start = qingLongIdx[ZHI.indexOf(yueZhi)]
  return [ZHI[(start + 1) % 12]] // 金匮=青龙后一位
}

/** 29. 天乙贵人（黄道吉日，月支查） */
function getTianYiHuangDao(yueZhi: Zhi): Zhi[] {
  const qingLongIdx = [2,1,0,11,10,9,8,7,6,5,4,3]
  const start = qingLongIdx[ZHI.indexOf(yueZhi)]
  return [ZHI[(start + 4) % 12]] // 天乙=青龙后四位
}

/** 30. 玉堂（黄道吉日） */
function getYuTang(yueZhi: Zhi): Zhi[] {
  const qingLongIdx = [2,1,0,11,10,9,8,7,6,5,4,3]
  const start = qingLongIdx[ZHI.indexOf(yueZhi)]
  return [ZHI[(start + 5) % 12]]
}

/** 31. 明堂（黄道吉日） */
function getMingTang(yueZhi: Zhi): Zhi[] {
  const qingLongIdx = [2,1,0,11,10,9,8,7,6,5,4,3]
  const start = qingLongIdx[ZHI.indexOf(yueZhi)]
  return [ZHI[(start + 6) % 12]]
}

/** 32. 青龙（黄道吉日，月支查） */
function getQingLong(yueZhi: Zhi): Zhi[] {
  const qingLongIdx = [2,1,0,11,10,9,8,7,6,5,4,3]
  const start = qingLongIdx[ZHI.indexOf(yueZhi)]
  return [ZHI[start]]
}

/** 33. 鸣吠（日柱查，适用于安葬择日） */
const MING_FEI = new Set(['甲子','丙子','乙丑','丁丑','丙寅','壬寅','乙卯','丁卯',
  '甲午','丙午','乙未','丁未','壬申','甲申','癸酉','乙酉','庚午','壬午','辛未','癸未'])

/** 34. 鸣吠对（日柱查） */
const MING_FEI_DUI = new Set(['丙寅','丁卯','丙子','丁丑','甲午','乙未','壬午','癸未',
  '壬申','癸酉','甲申','乙酉','庚寅','辛卯','庚子','辛丑'])

/** 35. 六秀日 */
const LIU_XIU = new Set(['丙子','丁丑','戊子','戊午','己丑','己未','壬午','癸未'])

/** 36. 八专日 */
const BA_ZHUAN = new Set(['甲寅','乙卯','丁未','己未','庚申','辛酉','癸丑','戊戌'])

/** 37. 九丑日 */
const JIU_CHOU = new Set(['戊子','戊午','壬子','壬午','丁酉','己酉','辛酉','丁卯','己卯','辛卯'])

/** 38. 阴错阳差 */
const YIN_CUO = new Set(['庚戌','辛酉','庚申','丁未','丁巳','己卯','己丑'])
const YANG_CHA = new Set(['丙子','丙午','丁丑','丁未','戊寅','戊申','壬辰','壬戌'])

/** 39. 红艳煞（日干查） */
const HONG_YAN: Record<Gan, Zhi> = {
  '甲':'午','乙':'午','丙':'寅','丁':'未','戊':'辰',
  '己':'辰','庚':'戌','辛':'酉','壬':'子','癸':'申',
}

/** 40. 桃花/咸池（日支查，按三合局） */
const TAO_HUA: Record<Zhi, Zhi> = {
  '申':'酉','子':'酉','辰':'酉','亥':'子','卯':'子','未':'子',
  '寅':'卯','午':'卯','戌':'卯','巳':'午','酉':'午','丑':'午',
}

/** 41. 天罗（命带戌亥） */
function isTianLuo(zhi: Zhi): boolean { return zhi === '戌' || zhi === '亥' }

/** 42. 地网（命带辰巳） */
function isDiWang(zhi: Zhi): boolean { return zhi === '辰' || zhi === '巳' }

/** 43. 暗金煞 */
const AN_JIN: Record<Zhi, Zhi[]> = {
  '子': ['巳','酉','丑'], '丑': ['巳','酉','丑'], '寅': ['亥','卯','未'],
  '卯': ['亥','卯','未'], '辰': ['亥','卯','未'], '巳': ['申','子','辰'],
  '午': ['申','子','辰'], '未': ['申','子','辰'], '申': ['寅','午','戌'],
  '酉': ['寅','午','戌'], '戌': ['寅','午','戌'], '亥': ['巳','酉','丑'],
}

/** 44. 截路空亡（日干查，时辰判定） */
const JIE_LU_KONG: Record<Gan, Zhi[]> = {
  '甲': ['申','酉'], '己': ['申','酉'], '乙': ['午','未'], '庚': ['午','未'],
  '丙': ['辰','巳'], '辛': ['辰','巳'], '丁': ['寅','卯'], '壬': ['寅','卯'],
  '戊': ['子','丑'], '癸': ['子','丑'],
}

/** 45. 日贵（日柱查：丁酉/丁亥/癸巳/癸卯） */
const RI_GUI = new Set(['丁酉','丁亥','癸巳','癸卯'])

/** 47. 进神（日柱查，甲子/甲午/己卯/己酉） */
const JIN_SHEN_RI = new Set(['甲子','甲午','己卯','己酉'])

/** 48. 金神（日柱纳音查，含金则为金神） */
const JIN_SHEN_NA_YIN: Record<string, boolean> = {
  '甲子':true,'乙丑':true,'壬申':true,'癸酉':true,'庚辰':true,'辛巳':true,
  '甲午':true,'乙未':true,'壬寅':true,'癸卯':true,'庚戌':true,'辛亥':true,
}

// ==================== 凶煞（~70个） ====================

/** 49. 劫煞（日支查，按三合局） */
const JIE_SHA: Record<Zhi, Zhi> = {
  '申':'巳','子':'巳','辰':'巳','亥':'申','卯':'申','未':'申',
  '寅':'亥','午':'亥','戌':'亥','巳':'寅','酉':'寅','丑':'寅',
}

/** 50. 灾煞（日支查） */
const ZAI_SHA: Record<Zhi, Zhi> = {
  '申':'午','子':'午','辰':'午','亥':'酉','卯':'酉','未':'酉',
  '寅':'子','午':'子','戌':'子','巳':'卯','酉':'卯','丑':'卯',
}

/** 51. 羊刃（日干查） */
const YANG_REN: Record<Gan, Zhi> = {
  '甲':'卯','乙':'寅','丙':'午','丁':'巳','戊':'午',
  '己':'巳','庚':'酉','辛':'申','壬':'子','癸':'亥',
}

/** 52. 孤辰（年支查，按三会局） */
const GU_CHEN: Record<Zhi, Zhi> = {
  '亥':'寅','子':'寅','丑':'寅','寅':'巳','卯':'巳','辰':'巳',
  '巳':'申','午':'申','未':'申','申':'亥','酉':'亥','戌':'亥',
}

/** 53. 寡宿（年支查，按三会局） */
const GUA_SU: Record<Zhi, Zhi> = {
  '亥':'丑','子':'丑','丑':'丑','寅':'辰','卯':'辰','辰':'辰',
  '巳':'未','午':'未','未':'未','申':'戌','酉':'戌','戌':'戌',
}

/** 54. 亡神（日支查） */
const WANG_SHEN: Record<Zhi, Zhi> = {
  '申':'亥','子':'亥','辰':'亥','亥':'寅','卯':'寅','未':'寅',
  '寅':'巳','午':'巳','戌':'巳','巳':'申','酉':'申','丑':'申',
}

/** 55. 元辰/大耗（年支查） */
const YUAN_CHEN: Record<Zhi, Zhi> = {
  '子':'未','丑':'午','寅':'酉','卯':'申','辰':'亥','巳':'戌',
  '午':'丑','未':'子','申':'卯','酉':'寅','戌':'巳','亥':'辰',
}

/** 56. 勾绞（日支查，每支对应两个） */
const GOU_JIAO: Record<Zhi, Zhi[]> = {
  '子': ['卯','酉'],'丑': ['辰','戌'],'寅': ['巳','亥'],'卯': ['午','子'],
  '辰': ['未','丑'],'巳': ['申','寅'],'午': ['酉','卯'],'未': ['戌','辰'],
  '申': ['亥','巳'],'酉': ['子','午'],'戌': ['丑','未'],'亥': ['寅','申'],
}

/** 57. 丧门（年支查，岁前二辰） */
function getSangMen(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 2) % 12] }

/** 58. 吊客（年支查，岁后二辰） */
function getDiaoKe(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 10) % 12] }

/** 59. 病符（年支查，岁后一辰） */
function getBingFu(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 11) % 12] }

/** 60. 死符（年支查，岁后五辰） */
function getSiFu(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 7) % 12] }

/** 61. 岁破（年支查，岁冲之位） */
function getSuiPo(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 6) % 12] }

/** 62. 小耗（年支查） */
function getXiaoHao(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 5) % 12] }

/** 63. 大耗/岁破兼（年支查） */
function getDaHao(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 8) % 12] }

/** 64. 阑干（年支查） */
function getLanGan(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 3) % 12] }

/** 65. 白虎（年支查，岁后四辰） */
function getBaiHu(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 8) % 12] }

/** 66. 天狗（年支查，岁后七辰） */
function getTianGou(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 5) % 12] }

/** 67. 卷舌（年支查） */
function getJuanShe(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 3) % 12] }

/** 68. 天哭（年支查） */
function getTianKu(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 9) % 12] }

/** 69. 天虚（年支查） */
function getTianXu(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 6) % 12] }

/** 70. 官符（年支查） */
function getGuanFu(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 4) % 12] }

/** 71. 贯索（年支查） */
function getGuanSuo(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 4) % 12] }

/** 72. 黄幡（年支查） */
function getHuangFan(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 6) % 12] }

/** 73. 豹尾（年支查） */
function getBaoWei(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 10) % 12] }

/** 74. 飞廉（年支查） */
const FEI_LIAN: Record<Zhi, Zhi> = {
  '子':'申','丑':'酉','寅':'戌','卯':'巳','辰':'午','巳':'未',
  '午':'寅','未':'卯','申':'辰','酉':'亥','戌':'子','亥':'丑',
}

/** 75. 血刃（月支查） */
const XUE_REN: Record<Zhi, Zhi> = {
  '寅':'丑','卯':'未','辰':'寅','巳':'申','午':'卯','未':'酉',
  '申':'辰','酉':'戌','戌':'巳','亥':'亥','子':'午','丑':'子',
}

/** 76. 血支（月支查） */
const XUE_ZHI: Record<Zhi, Zhi> = {
  '寅':'子','卯':'卯','辰':'午','巳':'酉','午':'子','未':'卯',
  '申':'午','酉':'酉','戌':'子','亥':'卯','子':'午','丑':'酉',
}

/** 77. 披麻（年支查） */
function getPiMa(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 2) % 12] }

/** 78. 天煞（日支查，按三合局劫煞同法） */
function getTianSha(riZhi: Zhi): Zhi { return JIE_SHA[riZhi] }

/** 79. 地煞（日支查，按三合局灾煞同法） */
function getDiSha(riZhi: Zhi): Zhi { return ZAI_SHA[riZhi] }

/** 80. 指背（年支查） */
function getZhiBei(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 3) % 12] }

/** 81. 破碎/破煞（日支查，按三合局） */
const PO_SUI: Record<Zhi, Zhi> = {
  '申':'巳','子':'酉','辰':'丑','亥':'寅','卯':'午','未':'戌',
  '寅':'亥','午':'卯','戌':'未','巳':'申','酉':'子','丑':'辰',
}

/** 82. 短命煞（日柱查） */
function isDuanMing(riGan: Gan, riZhi: Zhi): boolean {
  const duan = { '甲':'午','乙':'巳','丙':'辰','丁':'卯','戊':'寅','己':'亥',
    '庚':'申','辛':'未','壬':'戌','癸':'酉' }
  return duan[riGan] === riZhi
}

/** 83. 截命煞（日柱查） */
function isJieMing(riGan: Gan, riZhi: Zhi): boolean {
  const jie: Record<Gan, Zhi> = { '甲':'申','乙':'酉','丙':'子','丁':'亥','戊':'寅',
    '己':'卯','庚':'午','辛':'巳','壬':'戌','癸':'未' }
  return jie[riGan] === riZhi
}

/** 84. 四废（月支查：春庚申辛酉、夏壬子癸亥、秋甲寅乙卯、冬丙午丁巳） */
function getSiFei(yueZhi: Zhi): string[] {
  const season: Record<Zhi, string> = {
    '寅':'春','卯':'春','辰':'春','巳':'夏','午':'夏','未':'夏',
    '申':'秋','酉':'秋','戌':'秋','亥':'冬','子':'冬','丑':'冬',
  }
  const s = season[yueZhi]
  if (s === '春') return ['庚申','辛酉']
  if (s === '夏') return ['壬子','癸亥']
  if (s === '秋') return ['甲寅','乙卯']
  return ['丙午','丁巳']
}

/** 85. 十恶大败（日柱查） */
const SHI_E_DA_BAI = new Set([
  '甲辰','乙巳','丙申','丁亥','戊戌','己丑',
  '庚辰','辛巳','壬申','癸亥',
])

/** 86. 孤鸾（日柱查） */
const GU_LUAN = new Set(['甲寅','乙卯','丙午','丁巳','戊午','戊辰','己巳','庚申','辛亥','壬子'])

/** 87. 八座（月支查，黄道神煞） */
function getBaZuo(yueZhi: Zhi): Zhi {
  const qingLongIdx = [2,1,0,11,10,9,8,7,6,5,4,3]
  const start = qingLongIdx[ZHI.indexOf(yueZhi)]
  return ZHI[(start + 3) % 12]
}

/** 88. 天刑（黄道黑道，月支查） */
function getTianXing(yueZhi: Zhi): Zhi {
  const qingLongIdx = [2,1,0,11,10,9,8,7,6,5,4,3]
  const start = qingLongIdx[ZHI.indexOf(yueZhi)]
  return ZHI[(start + 6) % 12]
}

/** 89. 朱雀（黄道黑道，月支查） */
function getZhuQue(yueZhi: Zhi): Zhi {
  const qingLongIdx = [2,1,0,11,10,9,8,7,6,5,4,3]
  const start = qingLongIdx[ZHI.indexOf(yueZhi)]
  return ZHI[(start + 8) % 12]
}

/** 90. 白虎（黄道黑道，月支查） */
function getBaiHuHeiDao(yueZhi: Zhi): Zhi {
  const qingLongIdx = [2,1,0,11,10,9,8,7,6,5,4,3]
  const start = qingLongIdx[ZHI.indexOf(yueZhi)]
  return ZHI[(start + 7) % 12]
}

/** 91. 玄武（黄道黑道，月支查） */
function getXuanWuHeiDao(yueZhi: Zhi): Zhi {
  const qingLongIdx = [2,1,0,11,10,9,8,7,6,5,4,3]
  const start = qingLongIdx[ZHI.indexOf(yueZhi)]
  return ZHI[(start + 9) % 12]
}

/** 92. 勾陈（黄道黑道，月支查） */
function getGouChenHeiDao(yueZhi: Zhi): Zhi {
  const qingLongIdx = [2,1,0,11,10,9,8,7,6,5,4,3]
  const start = qingLongIdx[ZHI.indexOf(yueZhi)]
  return ZHI[(start + 10) % 12]
}

/** 93. 天火（月支查） */
const TIAN_HUO: Record<Zhi, Zhi> = {
  '子':'午','丑':'卯','寅':'子','卯':'酉','辰':'午','巳':'卯',
  '午':'子','未':'酉','申':'午','酉':'卯','戌':'子','亥':'酉',
}

/** 94. 月厌（月支查） */
const YUE_YAN: Record<Zhi, Zhi> = {
  '子':'申','丑':'未','寅':'午','卯':'巳','辰':'辰','巳':'卯',
  '午':'寅','未':'丑','申':'子','酉':'亥','戌':'戌','亥':'酉',
}

/** 95. 月煞（月支查，月厌的对冲） */
function getYueSha(yueZhi: Zhi): Zhi {
  const yan = YUE_YAN[yueZhi]
  return ZHI[(ZHI.indexOf(yan) + 6) % 12]
}

/** 96. 天贼（月支查） */
const TIAN_ZEI: Record<Zhi, Zhi> = {
  '子':'巳','丑':'辰','寅':'申','卯':'未','辰':'午','巳':'子',
  '午':'亥','未':'戌','申':'寅','酉':'丑','戌':'卯','亥':'未',
}

/** 97. 五鬼（月支查） */
const WU_GUI: Record<Zhi, Zhi> = {
  '子':'辰','丑':'巳','寅':'午','卯':'未','辰':'申','巳':'酉',
  '午':'戌','未':'亥','申':'子','酉':'丑','戌':'寅','亥':'卯',
}

/** 98. 天罡（月支查） */
function isTianGang(riZhi: Zhi, yueZhi: Zhi): boolean {
  const map: Record<Zhi, Zhi> = {
    '寅':'辰','卯':'巳','辰':'午','巳':'未','午':'申','未':'酉',
    '申':'戌','酉':'亥','戌':'子','亥':'丑','子':'寅','丑':'卯',
  }
  return map[yueZhi] === riZhi
}

/** 99. 河魁（月支查） */
function isHeKui(riZhi: Zhi, yueZhi: Zhi): boolean {
  const map: Record<Zhi, Zhi> = {
    '寅':'戌','卯':'亥','辰':'子','巳':'丑','午':'寅','未':'卯',
    '申':'辰','酉':'巳','戌':'午','亥':'未','子':'申','丑':'酉',
  }
  return map[yueZhi] === riZhi
}

/** 100. 地雌（月支查） */
function getDiCi(yueZhi: Zhi): Zhi {
  const map: Record<Zhi, Zhi> = {
    '子':'酉','丑':'午','寅':'亥','卯':'午','辰':'丑','巳':'酉',
    '午':'卯','未':'子','申':'未','酉':'子','戌':'巳','亥':'卯',
  }
  return map[yueZhi]
}

/** 101. 天雄（月支查，地雌的对冲） */
function getTianXiong(yueZhi: Zhi): Zhi {
  const ci = getDiCi(yueZhi)
  return ZHI[(ZHI.indexOf(ci) + 6) % 12]
}

/** 102. 流霞（日干查） */
const LIU_XIA: Record<Gan, Zhi> = {
  '甲':'酉','乙':'戌','丙':'未','丁':'申','戊':'巳',
  '己':'午','庚':'辰','辛':'卯','壬':'亥','癸':'寅',
}

/** 103. 六厄（日支查，按三合局） */
const LIU_E: Record<Zhi, Zhi> = {
  '申':'卯','子':'卯','辰':'卯','亥':'午','卯':'午','未':'午',
  '寅':'酉','午':'酉','戌':'酉','巳':'子','酉':'子','丑':'子',
}

/** 104. 埋儿煞（时柱查，按月份） */
function getMaiEr(shiZhi: Zhi, yueZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '子': ['卯','酉'], '卯': ['子','酉'], '午': ['卯','酉'], '酉': ['子','午'],
  }
  const forbidden = map[yueZhi]
  return forbidden ? forbidden.includes(shiZhi) : false
}

/** 105. 短寿煞 */
function isDuanShou(riGan: Gan, riZhi: Zhi): boolean {
  const map: Record<Gan, Zhi> = {
    '甲':'午','乙':'巳','丙':'辰','丁':'卯','戊':'申','己':'酉',
    '庚':'寅','辛':'丑','壬':'子','癸':'亥',
  }
  return map[riGan] === riZhi
}

/** 106. 截路煞（日干查时支） */
function isJieLu(riGan: Gan, shiZhi: Zhi): boolean {
  const map: Record<Gan, Zhi> = {
    '甲':'申','己':'申','乙':'酉','庚':'酉','丙':'子','辛':'子',
    '丁':'亥','壬':'亥','戊':'寅','癸':'卯',
  }
  return map[riGan] === shiZhi
}

// ==================== 日柱神煞（纳音/五行相关） ====================

/** 107. 金神（日柱查，见纳音金） */
function getJinShen(riGanZhi: string): boolean { return !!JIN_SHEN_NA_YIN[riGanZhi] }

/** 108. 日德 */
const RI_DE = new Set(['甲寅','丙辰','戊辰','庚辰','壬戌'])

/** 109. 福德（日干查） */
const FU_DE: Record<Gan, Zhi> = {
  '甲':'寅','乙':'卯','丙':'午','丁':'巳','戊':'午',
  '己':'巳','庚':'申','辛':'酉','壬':'亥','癸':'子',
}

// ==================== 继续补充凶煞 ====================

/** 108. 三丘（年支查） */
function getSanQiu(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 7) % 12] }

/** 109. 五墓（年支查） */
function getWuMu(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 9) % 12] }

/** 110. 浮沉（年支查） */
const FU_CHEN: Record<Zhi, Zhi> = {
  '子':'戌','丑':'亥','寅':'子','卯':'丑','辰':'寅','巳':'卯',
  '午':'辰','未':'巳','申':'午','酉':'未','戌':'申','亥':'酉',
}

/** 111. 吞陷（年支查） */
function getTunXian(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 4) % 12] }

/** 112. 暴败（年支查） */
function getBaoBai(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 9) % 12] }

/** 113. 天厄（年支查） */
const TIAN_E: Record<Zhi, Zhi> = {
  '子':'酉','丑':'戌','寅':'亥','卯':'子','辰':'丑','巳':'寅',
  '午':'卯','未':'辰','申':'巳','酉':'午','戌':'未','亥':'申',
}

/** 114. 宅煞（年支查） */
function getZhaiSha(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 7) % 12] }

/** 115. 墓煞（年支查） */
function getMuSha(nianZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(nianZhi) + 5) % 12] }

/** 116. 扫帚煞（月支查） */
const SAO_ZHOU: Record<Zhi, Zhi> = {
  '子':'卯','丑':'辰','寅':'巳','卯':'午','辰':'未','巳':'申',
  '午':'酉','未':'戌','申':'亥','酉':'子','戌':'丑','亥':'寅',
}

/** 117. 天屠（月支查） */
function getTianTu(yueZhi: Zhi): Zhi { return ZHI[(ZHI.indexOf(yueZhi) + 8) % 12] }

/** 118. 天狱（月支查） */
const TIAN_YU: Record<Zhi, Zhi> = {
  '子':'卯','丑':'午','寅':'酉','卯':'子','辰':'卯','巳':'午',
  '午':'酉','未':'子','申':'卯','酉':'午','戌':'酉','亥':'子',
}

/** 119. 天刑煞（年支+月支复合） */
function getTianXingSha(nianZhi: Zhi, yueZhi: Zhi): boolean {
  const map: Record<Zhi, Zhi> = {
    '子':'卯','丑':'戌','寅':'巳','卯':'子','辰':'辰','巳':'申',
    '午':'午','未':'丑','申':'寅','酉':'酉','戌':'未','亥':'亥',
  }
  return map[nianZhi] === yueZhi
}

// ==================== 小儿关煞（~25个） ====================

/** 120. 四柱关（月支查时支） */
function getSiZhuGuan(yueZhi: Zhi, shiZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '寅': ['巳','申'], '卯': ['辰','戌'], '辰': ['巳','丑'], '巳': ['辰','申'],
    '午': ['巳','未'], '未': ['午','戌'], '申': ['亥','未'], '酉': ['寅','午'],
    '戌': ['卯','酉'], '亥': ['辰','子'], '子': ['巳','亥'], '丑': ['寅','巳'],
  }
  return map[yueZhi]?.includes(shiZhi) ?? false
}

/** 121. 四季关（月支查时支） */
function getSiJiGuan(yueZhi: Zhi, shiZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '寅': ['巳','亥'], '卯': ['子','午'], '辰': ['丑','未'], '巳': ['寅','申'],
    '午': ['卯','酉'], '未': ['辰','戌'], '申': ['巳','亥'], '酉': ['子','午'],
    '戌': ['丑','未'], '亥': ['寅','申'], '子': ['卯','酉'], '丑': ['辰','戌'],
  }
  return map[yueZhi]?.includes(shiZhi) ?? false
}

/** 122. 百日关（月支查时支） */
function getBaiRiGuan(yueZhi: Zhi, shiZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '寅': ['戌','亥'], '卯': ['酉','戌'], '辰': ['申','酉'], '巳': ['未','申'],
    '午': ['午','未'], '未': ['巳','午'], '申': ['辰','巳'], '酉': ['卯','辰'],
    '戌': ['寅','卯'], '亥': ['丑','寅'], '子': ['子','丑'], '丑': ['戌','亥'],
  }
  return map[yueZhi]?.includes(shiZhi) ?? false
}

/** 123. 千日关（月支查时支） */
function getQianRiGuan(yueZhi: Zhi, shiZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '子': ['巳','午'], '丑': ['午','未'], '寅': ['未','申'], '卯': ['申','酉'],
    '辰': ['酉','戌'], '巳': ['戌','亥'], '午': ['亥','子'], '未': ['子','丑'],
    '申': ['丑','寅'], '酉': ['寅','卯'], '戌': ['卯','辰'], '亥': ['辰','巳'],
  }
  return map[yueZhi]?.includes(shiZhi) ?? false
}

/** 124. 将军关（时支查） */
function isJiangJunGuan(shiZhi: Zhi): boolean {
  return ['子','午','卯','酉'].includes(shiZhi)
}

/** 125. 阎王关（月支查时支） */
function getYanWangGuan(yueZhi: Zhi, shiZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '子': ['丑','未'], '丑': ['寅','申'], '寅': ['卯','酉'], '卯': ['辰','戌'],
    '辰': ['巳','亥'], '巳': ['午','子'], '午': ['未','丑'], '未': ['申','寅'],
    '申': ['酉','卯'], '酉': ['戌','辰'], '戌': ['亥','巳'], '亥': ['子','午'],
  }
  return map[yueZhi]?.includes(shiZhi) ?? false
}

/** 126. 急脚关（月支查时支） */
function getJiJiaoGuan(yueZhi: Zhi, shiZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '子': ['亥'], '丑': ['戌'], '寅': ['酉'], '卯': ['申'],
    '辰': ['未'], '巳': ['午'], '午': ['巳'], '未': ['辰'],
    '申': ['卯'], '酉': ['寅'], '戌': ['丑'], '亥': ['子'],
  }
  return map[yueZhi]?.includes(shiZhi) ?? false
}

/** 127. 无情关（月支查时支） */
function getWuQingGuan(yueZhi: Zhi, shiZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '子': ['寅','午'], '卯': ['巳','未'], '午': ['申','戌'], '酉': ['亥','丑'],
  }
  return map[yueZhi]?.includes(shiZhi) ?? false
}

/** 128. 浴盆关（月支查时支） */
function getYuPenGuan(yueZhi: Zhi, shiZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '寅': ['辰'], '卯': ['巳'], '辰': ['午'], '巳': ['未'],
    '午': ['申'], '未': ['酉'], '申': ['戌'], '酉': ['亥'],
    '戌': ['子'], '亥': ['丑'], '子': ['寅'], '丑': ['卯'],
  }
  return map[yueZhi]?.includes(shiZhi) ?? false
}

/** 129. 深水关（时支查，寅申巳亥为深水） */
function isShenShuiGuan(shiZhi: Zhi): boolean {
  return ['寅','申','巳','亥'].includes(shiZhi)
}

/** 130. 汤火关（月支查时支） */
function getTangHuoGuan(yueZhi: Zhi, shiZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '子': ['午'], '丑': ['未'], '寅': ['申'], '卯': ['酉'],
    '辰': ['戌'], '巳': ['亥'], '午': ['子'], '未': ['丑'],
    '申': ['寅'], '酉': ['卯'], '戌': ['辰'], '亥': ['巳'],
  }
  return map[yueZhi]?.includes(shiZhi) ?? false
}

/** 131. 夜啼关（时支查） */
function isYeTiGuan(shiZhi: Zhi): boolean {
  return ['子','午','丑','未'].includes(shiZhi)
}

/** 132. 落井关（时支查，子卯午酉为落井） */
function isLuoJingGuan(shiZhi: Zhi): boolean {
  return ['子','卯','午','酉'].includes(shiZhi)
}

/** 133. 鸡飞关（时支查，辰戌丑未） */
function isJiFeiGuan(shiZhi: Zhi): boolean {
  return ['辰','戌','丑','未'].includes(shiZhi)
}

/** 134. 取命关（月支查时支） */
function getQuMingGuan(yueZhi: Zhi, shiZhi: Zhi): boolean {
  if (['寅','卯','辰'].includes(yueZhi)) return shiZhi === '午'
  if (['巳','午','未'].includes(yueZhi)) return shiZhi === '酉'
  if (['申','酉','戌'].includes(yueZhi)) return shiZhi === '子'
  return shiZhi === '卯'
}

/** 135. 白虎关（时支查，寅申卯酉辰戌丑未为白虎） */
function isBaiHuGuan(shiZhi: Zhi): boolean {
  return ['寅','申','卯','酉','辰','戌','丑','未'].includes(shiZhi)
}

/** 136. 铁蛇关（年支查时支） */
function getTieSheGuan(nianZhi: Zhi, shiZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '子': ['戌'], '丑': ['亥'], '寅': ['子'], '卯': ['丑'],
    '辰': ['寅'], '巳': ['卯'], '午': ['辰'], '未': ['巳'],
    '申': ['午'], '酉': ['未'], '戌': ['申'], '亥': ['酉'],
  }
  return map[nianZhi]?.includes(shiZhi) ?? false
}

/** 137. 断桥关（月支查时支） */
function getDuanQiaoGuan(yueZhi: Zhi, shiZhi: Zhi): boolean {
  const map: Partial<Record<Zhi, Zhi[]>> = {
    '寅': ['卯'], '卯': ['辰'], '辰': ['巳'], '巳': ['午'],
    '午': ['未'], '未': ['申'], '申': ['酉'], '酉': ['戌'],
    '戌': ['亥'], '亥': ['子'], '子': ['丑'], '丑': ['寅'],
  }
  return map[yueZhi]?.includes(shiZhi) ?? false
}

// ==================== 月支黄道吉凶补充 ====================

/** 138. 奏书（黄道吉神，月支查） */
function getZouShu(yueZhi: Zhi): Zhi {
  const start = [2,1,0,11,10,9,8,7,6,5,4,3][ZHI.indexOf(yueZhi)]
  return ZHI[(start + 11) % 12]
}

/** 139. 博士（黄道吉神，月支查） */
function getBoShi(yueZhi: Zhi): Zhi {
  const start = [2,1,0,11,10,9,8,7,6,5,4,3][ZHI.indexOf(yueZhi)]
  return ZHI[(start + 2) % 12]
}

/** 140. 天巫（月支查） */
const TIAN_WU: Record<Zhi, Zhi> = {
  '子':'辰','丑':'巳','寅':'午','卯':'未','辰':'申','巳':'酉',
  '午':'戌','未':'亥','申':'子','酉':'丑','戌':'寅','亥':'卯',
}

/** 141. 解神（月支查） */
const JIE_SHEN: Record<Zhi, Zhi> = {
  '子':'戌','丑':'酉','寅':'申','卯':'未','辰':'午','巳':'巳',
  '午':'辰','未':'卯','申':'寅','酉':'丑','戌':'子','亥':'亥',
}

/** 142. 圣心（月支查） */
const SHENG_XIN: Record<Zhi, Zhi> = {
  '子':'亥','丑':'申','寅':'巳','卯':'寅','辰':'亥','巳':'申',
  '午':'巳','未':'寅','申':'亥','酉':'申','戌':'巳','亥':'寅',
}

/** 143. 金堂（月支查） */
function getJinTang(yueZhi: Zhi): Zhi {
  const start = [2,1,0,11,10,9,8,7,6,5,4,3][ZHI.indexOf(yueZhi)]
  return ZHI[(start + 10) % 12]
}

// ==================== 日柱补充神煞 ====================

/** 144. 天官贵人（日干查） */
const TIAN_GUAN: Record<Gan, Zhi> = {
  '甲':'未','乙':'辰','丙':'巳','丁':'酉','戊':'戌',
  '己':'卯','庚':'亥','辛':'酉','壬':'亥','癸':'卯',
}

/** 145. 科名星（日干查地支） */
const KE_MING: Record<Gan, Zhi[]> = {
  '甲': ['寅','申'], '乙': ['卯','酉'], '丙': ['巳','亥'], '丁': ['午','子'],
  '戊': ['寅','申'], '己': ['卯','酉'], '庚': ['巳','亥'], '辛': ['午','子'],
  '壬': ['辰','戌'], '癸': ['丑','未'],
}

/** 146. 暗禄（日干查，禄神的五合位） */
function getAnLu(riGan: Gan): Zhi | null {
  const lu = LU_SHEN[riGan]
  if (!lu) return null
  return ZHI[(ZHI.indexOf(lu) + 6) % 12]
}

// ==================== 汇总检测（重写） ====================

export function calcAllShenSha(siZhu: SiZhu): ShenShaItem[] {
  const pillars: { key: string; gan: Gan; zhi: Zhi }[] = [
    { key: 'nian', gan: siZhu.nian.gan, zhi: siZhu.nian.zhi },
    { key: 'yue', gan: siZhu.yue.gan, zhi: siZhu.yue.zhi },
    { key: 'ri', gan: siZhu.ri.gan, zhi: siZhu.ri.zhi },
    { key: 'shi', gan: siZhu.shi.gan, zhi: siZhu.shi.zhi },
  ]

  const riGan = siZhu.ri.gan
  const riZhi = siZhu.ri.zhi
  const nianGan = siZhu.nian.gan
  const nianZhi = siZhu.nian.zhi
  const yueZhi = siZhu.yue.zhi
  const shiZhi = siZhu.shi.zhi
  const riGanZhi = riGan + riZhi

  const results: ShenShaItem[] = []

  // --- 吉神 ---

  // 天乙贵人
  const tianYiZhis = TIAN_YI_GUI_REN[riGan]
  findInPillars(pillars, p => tianYiZhis.includes(p.zhi), '天乙贵人', 'ji', '逢凶化吉，贵人相助', results)

  // 太极贵人
  const taiJiZhis = TAI_JI_GUI_REN[riGan]
  findInPillars(pillars, p => taiJiZhis.includes(p.zhi), '太极贵人', 'ji', '智慧超群，好学深思', results)

  // 天德贵人
  const tianDe = TIAN_DE_GUI_REN[yueZhi]
  findInPillars(pillars, p => p.gan === tianDe || p.zhi === tianDe, '天德贵人', 'ji', '福泽深厚，化险为夷', results)

  // 天德合
  const tianDeHe = TIAN_DE_HE[yueZhi]
  findInPillars(pillars, p => p.gan === tianDeHe || p.zhi === tianDeHe, '天德合', 'ji', '福寿康宁，灾祸不侵', results)

  // 月德贵人
  findInPillars(pillars, p => p.gan === YUE_DE_GUI_REN[yueZhi], '月德贵人', 'ji', '化凶为吉，福禄双全', results)

  // 月德合
  findInPillars(pillars, p => p.gan === YUE_DE_HE[yueZhi], '月德合', 'ji', '家宅安宁，福气临门', results)

  // 文昌贵人
  findInPillars(pillars, p => p.zhi === WEN_CHANG[riGan], '文昌贵人', 'ji', '聪明好学，文采出众', results)

  // 学堂
  findInPillars(pillars, p => p.zhi === XUE_TANG[riGan], '学堂', 'ji', '学业有成，智慧超群', results)

  // 词馆
  const ciGuan = getCiGuan(riGan)
  if (ciGuan) findInPillars(pillars, p => p.zhi === ciGuan, '词馆', 'ji', '文采飞扬，学问渊博', results)

  // 福星贵人
  findInPillars(pillars, p => p.zhi === FU_XING_GUI_REN[riGan], '福星贵人', 'ji', '福寿安康，一生少病', results)

  // 禄神
  findInPillars(pillars, p => p.zhi === LU_SHEN[riGan], '禄神', 'ji', '食禄丰足，生活无忧', results)

  // 金舆
  findInPillars(pillars, p => p.zhi === JIN_YU[riGan], '金舆', 'ji', '富足安乐，衣食丰盛', results)

  // 国印贵人
  findInPillars(pillars, p => p.zhi === GUO_YIN[riGan], '国印贵人', 'ji', '掌握权印，诚信可靠', results)

  // 将星
  findInPillars(pillars, p => p.zhi === JIANG_XING_MAP[riZhi], '将星', 'ji', '领导力强，权威显赫', results)

  // 华盖
  findInPillars(pillars, p => p.zhi === HUA_GAI_MAP[riZhi], '华盖', 'ji', '聪慧孤独，利于艺术学术', results)

  // 驿马
  findInPillars(pillars, p => p.zhi === YI_MA_MAP[riZhi], '驿马', 'ji', '奔波行动，多动少静', results)

  // 红鸾
  findInPillars(pillars, p => p.zhi === HONG_LUAN[riZhi], '红鸾', 'ji', '桃花星，婚恋吉兆', results)

  // 天喜
  findInPillars(pillars, p => p.zhi === getTianXi(riZhi), '天喜', 'ji', '喜事临门，婚姻美满', results)

  // 天厨贵人
  findInPillars(pillars, p => p.zhi === TIAN_CHU[riGan], '天厨贵人', 'ji', '衣食丰足，安享其成', results)

  // 岁德
  const suiDe = getSuiDe(nianGan)
  findInPillars(pillars, p => p.zhi === suiDe, '岁德', 'ji', '岁中德神，逢之大吉', results)

  // 青龙（黄道吉日）
  const qingLongZhi = getQingLong(yueZhi)
  findInPillars(pillars, p => qingLongZhi.includes(p.zhi), '青龙', 'ji', '黄道吉辰，百事皆宜', results)

  // 明堂
  const mingTangZhi = getMingTang(yueZhi)
  findInPillars(pillars, p => mingTangZhi.includes(p.zhi), '明堂', 'ji', '贵人明堂，万事顺遂', results)

  // 金匮
  const jinKuiZhi = getJinKui(yueZhi)
  findInPillars(pillars, p => jinKuiZhi.includes(p.zhi), '金匮', 'ji', '财富聚积，金银满屋', results)

  // 天乙黄道
  const tianYiHDZhi = getTianYiHuangDao(yueZhi)
  findInPillars(pillars, p => tianYiHDZhi.includes(p.zhi), '天乙', 'ji', '天乙贵人临，吉庆祥和', results)

  // 玉堂
  const yuTangZhi = getYuTang(yueZhi)
  findInPillars(pillars, p => yuTangZhi.includes(p.zhi), '玉堂', 'ji', '玉堂显贵，富贵荣华', results)

  // 八座
  findInPillars(pillars, p => p.zhi === getBaZuo(yueZhi), '八座', 'ji', '升迁掌权，事业有成', results)

  // 攀鞍
  findInPillars(pillars, p => p.zhi === getPanAn(nianZhi), '攀鞍', 'ji', '前程似锦，步步高升', results)

  // 天马
  findInPillars(pillars, p => p.zhi === TIAN_MA[yueZhi], '天马', 'ji', '出行顺利，变动有利', results)

  // 月空
  const yueKong = getYueKong(yueZhi)
  if (yueKong) findInPillars(pillars, p => p.gan === yueKong, '月空', 'ji', '奏书通达，宜上书献策', results)

  // 三奇贵人（全局）
  const sanQi = getSanQi(riGan, siZhu.yue.gan, nianGan)
  if (sanQi) {
    results.push({ name: sanQi, type: 'ji', desc: '三奇拱照，大富大贵之命', pillar: 'ri' })
  }

  // 天赦日
  if (getTianShe(riGan, riZhi, yueZhi)) {
    results.push({ name: '天赦', type: 'ji', desc: '天赦日生，逢凶化吉百事无忧', pillar: 'ri' })
  }

  // 魁罡
  if (isKuiGang(riGan, riZhi)) {
    results.push({ name: '魁罡', type: 'ji', desc: '聪明果敢，刚毅决断，领袖气质', pillar: 'ri' })
  }

  // 十灵日
  if (SHI_LING_RI.has(riGanZhi)) {
    results.push({ name: '十灵日', type: 'ji', desc: '悟性极高，才智过人', pillar: 'ri' })
  }

  // 六秀日
  if (LIU_XIU.has(riGanZhi)) {
    results.push({ name: '六秀', type: 'ji', desc: '聪明秀气，才华出众', pillar: 'ri' })
  }

  // 进神
  if (JIN_SHEN_RI.has(riGanZhi)) {
    results.push({ name: '进神', type: 'ji', desc: '进取向上，事业有成', pillar: 'ri' })
  }

  // 日贵
  if (RI_GUI.has(riGanZhi)) {
    results.push({ name: '日贵', type: 'ji', desc: '自坐贵人，福气深厚', pillar: 'ri' })
  }

  // 日德
  if (RI_DE.has(riGanZhi)) {
    results.push({ name: '日德', type: 'ji', desc: '品德高尚，人缘极佳', pillar: 'ri' })
  }

  // 金神
  if (getJinShen(riGanZhi)) {
    results.push({ name: '金神', type: 'ji', desc: '刚毅果断，事业心强', pillar: 'ri' })
  }

  // 鸣吠
  if (MING_FEI.has(riGanZhi)) {
    results.push({ name: '鸣吠', type: 'ji', desc: '诸事皆宜，大吉大利', pillar: 'ri' })
  }

  // 鸣吠对
  if (MING_FEI_DUI.has(riGanZhi)) {
    results.push({ name: '鸣吠对', type: 'ji', desc: '次吉之神，宜安葬迁坟', pillar: 'ri' })
  }

  // 福德
  findInPillars(pillars, p => p.zhi === FU_DE[riGan], '福德', 'ji', '福气深厚，德业有成', results)

  // --- 凶煞 ---

  // 劫煞
  findInPillars(pillars, p => p.zhi === JIE_SHA[riZhi], '劫煞', 'xiong', '是非破财，意外灾祸', results)

  // 灾煞
  findInPillars(pillars, p => p.zhi === ZAI_SHA[riZhi], '灾煞', 'xiong', '疾病灾祸，意外伤害', results)

  // 羊刃
  findInPillars(pillars, p => p.zhi === YANG_REN[riGan], '羊刃', 'xiong', '性情刚烈，易受伤灾', results)

  // 孤辰
  findInPillars(pillars, p => p.zhi === GU_CHEN[nianZhi], '孤辰', 'xiong', '性格孤僻，婚姻不顺', results)

  // 寡宿
  findInPillars(pillars, p => p.zhi === GUA_SU[nianZhi], '寡宿', 'xiong', '孤单寂寞，感情波折', results)

  // 亡神
  findInPillars(pillars, p => p.zhi === WANG_SHEN[riZhi], '亡神', 'xiong', '心神不宁，意外灾祸', results)

  // 元辰
  findInPillars(pillars, p => p.zhi === YUAN_CHEN[nianZhi], '元辰', 'xiong', '运势反复，事多阻碍', results)

  // 勾绞
  const gouJiaoList = GOU_JIAO[riZhi]
  findInPillars(pillars, p => gouJiaoList.includes(p.zhi), '勾绞', 'xiong', '口舌是非，官非纠纷', results)

  // 桃花/咸池
  findInPillars(pillars, p => p.zhi === TAO_HUA[riZhi], '桃花', 'xiong', '多情风流，异性缘旺', results)

  // 红艳煞
  findInPillars(pillars, p => p.zhi === HONG_YAN[riGan], '红艳煞', 'xiong', '多情善感，易为情困', results)

  // 丧门
  findInPillars(pillars, p => p.zhi === getSangMen(nianZhi), '丧门', 'xiong', '孝服悲伤，家运不宁', results)

  // 吊客
  findInPillars(pillars, p => p.zhi === getDiaoKe(nianZhi), '吊客', 'xiong', '吊唁送葬，宜慎出行', results)

  // 病符
  findInPillars(pillars, p => p.zhi === getBingFu(nianZhi), '病符', 'xiong', '疾病缠身，身体欠安', results)

  // 死符
  findInPillars(pillars, p => p.zhi === getSiFu(nianZhi), '死符', 'xiong', '灾祸临身，谨防意外', results)

  // 岁破
  findInPillars(pillars, p => p.zhi === getSuiPo(nianZhi), '岁破', 'xiong', '冲犯太岁，诸事不顺', results)

  // 小耗
  findInPillars(pillars, p => p.zhi === getXiaoHao(nianZhi), '小耗', 'xiong', '钱财损耗，破财消灾', results)

  // 大耗
  findInPillars(pillars, p => p.zhi === getDaHao(nianZhi), '大耗', 'xiong', '大破钱财，倾家荡产', results)

  // 阑干
  findInPillars(pillars, p => p.zhi === getLanGan(nianZhi), '阑干', 'xiong', '阻碍重重，进退两难', results)

  // 白虎
  findInPillars(pillars, p => p.zhi === getBaiHu(nianZhi), '白虎', 'xiong', '血光之灾，意外伤害', results)

  // 天狗
  findInPillars(pillars, p => p.zhi === getTianGou(nianZhi), '天狗', 'xiong', '口舌是非，意外灾害', results)

  // 卷舌
  findInPillars(pillars, p => p.zhi === getJuanShe(nianZhi), '卷舌', 'xiong', '口舌官司，言语纷争', results)

  // 天哭
  findInPillars(pillars, p => p.zhi === getTianKu(nianZhi), '天哭', 'xiong', '悲伤哭泣，忧愁烦恼', results)

  // 天虚
  findInPillars(pillars, p => p.zhi === getTianXu(nianZhi), '天虚', 'xiong', '空虚不实，好事落空', results)

  // 官符
  findInPillars(pillars, p => p.zhi === getGuanFu(nianZhi), '官符', 'xiong', '官非诉讼，牢狱之灾', results)

  // 黄幡
  findInPillars(pillars, p => p.zhi === getHuangFan(nianZhi), '黄幡', 'xiong', '疾病灾伤，家宅不宁', results)

  // 豹尾
  findInPillars(pillars, p => p.zhi === getBaoWei(nianZhi), '豹尾', 'xiong', '出行不利，易遭意外', results)

  // 飞廉
  findInPillars(pillars, p => p.zhi === FEI_LIAN[nianZhi], '飞廉', 'xiong', '飞来横祸，意外之灾', results)

  // 血刃
  findInPillars(pillars, p => p.zhi === XUE_REN[yueZhi], '血刃', 'xiong', '血光之灾，手术外伤', results)

  // 血支
  findInPillars(pillars, p => p.zhi === XUE_ZHI[yueZhi], '血支', 'xiong', '血光星，防意外受伤', results)

  // 披麻
  findInPillars(pillars, p => p.zhi === getPiMa(nianZhi), '披麻', 'xiong', '孝服临身，家运不昌', results)

  // 天煞
  findInPillars(pillars, p => p.zhi === getTianSha(riZhi), '天煞', 'xiong', '刑克六亲，灾祸临身', results)

  // 地煞
  findInPillars(pillars, p => p.zhi === getDiSha(riZhi), '地煞', 'xiong', '根基不稳，灾祸频发', results)

  // 指背
  findInPillars(pillars, p => p.zhi === getZhiBei(nianZhi), '指背', 'xiong', '背后遭人诽谤非议', results)

  // 破碎
  findInPillars(pillars, p => p.zhi === PO_SUI[riZhi], '破碎', 'xiong', '好事易破，劳而无功', results)

  // 天罗
  findInPillars(pillars, p => isTianLuo(p.zhi), '天罗', 'xiong', '命运困顿，有志难伸', results)

  // 地网
  findInPillars(pillars, p => isDiWang(p.zhi), '地网', 'xiong', '陷入困境，进退维谷', results)

  // 流霞
  findInPillars(pillars, p => p.zhi === LIU_XIA[riGan], '流霞', 'xiong', '男忌酒色，女忌产厄', results)

  // 六厄
  findInPillars(pillars, p => p.zhi === LIU_E[riZhi], '六厄', 'xiong', '困顿潦倒，事业受阻', results)

  // 天刑（黄道黑道）
  findInPillars(pillars, p => p.zhi === getTianXing(yueZhi), '天刑', 'xiong', '刑克灾祸，官司缠身', results)

  // 朱雀（黄道黑道）
  findInPillars(pillars, p => p.zhi === getZhuQue(yueZhi), '朱雀', 'xiong', '口舌是非，诉讼纷争', results)

  // 白虎（黄道黑道）
  findInPillars(pillars, p => p.zhi === getBaiHuHeiDao(yueZhi), '白虎', 'xiong', '血光之灾，出行凶险', results)

  // 玄武（黄道黑道）
  findInPillars(pillars, p => p.zhi === getXuanWuHeiDao(yueZhi), '玄武', 'xiong', '盗贼失财，骗局陷阱', results)

  // 勾陈（黄道黑道）
  findInPillars(pillars, p => p.zhi === getGouChenHeiDao(yueZhi), '勾陈', 'xiong', '拖延阻碍，事多反复', results)

  // 天火
  findInPillars(pillars, p => p.zhi === TIAN_HUO[yueZhi], '天火', 'xiong', '火灾隐患，防烧烫伤', results)

  // 五鬼
  findInPillars(pillars, p => p.zhi === WU_GUI[yueZhi], '五鬼', 'xiong', '小人作祟，是非不断', results)

  // 天罡
  if (isTianGang(riZhi, yueZhi)) {
    results.push({ name: '天罡', type: 'xiong', desc: '刚强好胜，易惹是非', pillar: 'ri' })
  }

  // 河魁
  if (isHeKui(riZhi, yueZhi)) {
    results.push({ name: '河魁', type: 'xiong', desc: '性格刚烈，防官司口舌', pillar: 'ri' })
  }

  // 暗金煞
  const anJinZhis = AN_JIN[nianZhi]
  if (anJinZhis.includes(riZhi)) {
    results.push({ name: '暗金煞', type: 'xiong', desc: '暗藏凶险，谨防意外', pillar: 'ri' })
  }

  // 截路空亡（日干对时支）
  const jieLuZhis = JIE_LU_KONG[riGan]
  if (jieLuZhis.includes(shiZhi)) {
    results.push({ name: '截路空亡', type: 'xiong', desc: '行路受阻，所求难成', pillar: 'shi' })
  }

  // 截路煞
  if (isJieLu(riGan, shiZhi)) {
    results.push({ name: '截路煞', type: 'xiong', desc: '中途阻滞，难得善终', pillar: 'shi' })
  }

  // 埋儿煞
  if (getMaiEr(shiZhi, yueZhi)) {
    results.push({ name: '埋儿煞', type: 'xiong', desc: '不利子息，生育宜慎', pillar: 'shi' })
  }

  // 短寿煞
  if (isDuanShou(riGan, riZhi)) {
    results.push({ name: '短寿煞', type: 'xiong', desc: '健康堪忧，宜珍惜身体', pillar: 'ri' })
  }

  // 短命煞
  if (isDuanMing(riGan, riZhi)) {
    results.push({ name: '短命煞', type: 'xiong', desc: '命途多舛，宜行善积德', pillar: 'ri' })
  }

  // 截命煞
  if (isJieMing(riGan, riZhi)) {
    results.push({ name: '截命煞', type: 'xiong', desc: '命运波折，中年多难', pillar: 'ri' })
  }

  // 四废
  const siFeiDays = getSiFei(yueZhi)
  if (siFeiDays.includes(riGanZhi)) {
    results.push({ name: '四废', type: 'xiong', desc: '万事不顺，有志难伸', pillar: 'ri' })
  }

  // 十恶大败
  if (SHI_E_DA_BAI.has(riGanZhi)) {
    results.push({ name: '十恶大败', type: 'xiong', desc: '钱财不聚，破败连连', pillar: 'ri' })
  }

  // 孤鸾
  if (GU_LUAN.has(riGanZhi)) {
    results.push({ name: '孤鸾', type: 'xiong', desc: '婚姻不顺，夫妻缘薄', pillar: 'ri' })
  }

  // 阴错阳差
  if (YANG_CHA.has(riGanZhi)) {
    results.push({ name: '阳差', type: 'xiong', desc: '阴阳差错，婚姻不利', pillar: 'ri' })
  }
  if (YIN_CUO.has(riGanZhi)) {
    results.push({ name: '阴错', type: 'xiong', desc: '阴阳不调，感情波折', pillar: 'ri' })
  }

  // 八专
  if (BA_ZHUAN.has(riGanZhi)) {
    results.push({ name: '八专', type: 'xiong', desc: '感情复杂，易陷情网', pillar: 'ri' })
  }

  // 九丑
  if (JIU_CHOU.has(riGanZhi)) {
    results.push({ name: '九丑', type: 'xiong', desc: '品貌不佳，人缘较差', pillar: 'ri' })
  }

  // 天贼
  findInPillars(pillars, p => p.zhi === TIAN_ZEI[yueZhi], '天贼', 'xiong', '盗贼失窃，财物宜慎', results)

  // 天雄
  findInPillars(pillars, p => p.zhi === getTianXiong(yueZhi), '天雄', 'xiong', '刚烈好斗，易有争斗', results)

  // 地雌
  findInPillars(pillars, p => p.zhi === getDiCi(yueZhi), '地雌', 'xiong', '阴柔多疑，家庭不和', results)

  // 月厌
  findInPillars(pillars, p => p.zhi === YUE_YAN[yueZhi], '月厌', 'xiong', '月令之气不调，诸事不宜', results)

  // 月煞
  findInPillars(pillars, p => p.zhi === getYueSha(yueZhi), '月煞', 'xiong', '月令凶煞，防意外灾祸', results)

  // 三丘
  findInPillars(pillars, p => p.zhi === getSanQiu(nianZhi), '三丘', 'xiong', '丧事悲愁，家运不宁', results)

  // 五墓
  findInPillars(pillars, p => p.zhi === getWuMu(nianZhi), '五墓', 'xiong', '墓库之气，运势闭塞', results)

  // 浮沉
  findInPillars(pillars, p => p.zhi === FU_CHEN[nianZhi], '浮沉', 'xiong', '机运浮沉不定，事业起落', results)

  // 天厄
  findInPillars(pillars, p => p.zhi === TIAN_E[nianZhi], '天厄', 'xiong', '天降灾厄，诸多不顺', results)

  // 吞陷
  findInPillars(pillars, p => p.zhi === getTunXian(nianZhi), '吞陷', 'xiong', '受人陷害，防小人暗算', results)

  // 暴败
  findInPillars(pillars, p => p.zhi === getBaoBai(nianZhi), '暴败', 'xiong', '突然败落，防意外之灾', results)

  // 宅煞
  findInPillars(pillars, p => p.zhi === getZhaiSha(nianZhi), '宅煞', 'xiong', '家宅不宁，住宅不利', results)

  // 墓煞
  findInPillars(pillars, p => p.zhi === getMuSha(nianZhi), '墓煞', 'xiong', '运势低迷，如入墓库', results)

  // 扫帚煞
  findInPillars(pillars, p => p.zhi === SAO_ZHOU[yueZhi], '扫帚煞', 'xiong', '扫除家财，败家之象', results)

  // 天屠
  findInPillars(pillars, p => p.zhi === getTianTu(yueZhi), '天屠', 'xiong', '刑伤灾祸，防意外伤害', results)

  // 天狱
  findInPillars(pillars, p => p.zhi === TIAN_YU[yueZhi], '天狱', 'xiong', '牢狱官非之象，行事谨慎', results)

  // 天刑煞（复合）
  if (getTianXingSha(nianZhi, yueZhi)) {
    results.push({ name: '天刑煞', type: 'xiong', desc: '官非诉讼，刑克灾祸', pillar: 'yue' })
  }

  // 天官贵人
  findInPillars(pillars, p => p.zhi === TIAN_GUAN[riGan], '天官贵人', 'ji', '近贵得官，仕途顺遂', results)

  // 科名星
  const keMingZhis = KE_MING[riGan]
  findInPillars(pillars, p => keMingZhis.includes(p.zhi), '科名星', 'ji', '科考成名，学业事业有成', results)

  // 暗禄
  const anLu = getAnLu(riGan)
  if (anLu) findInPillars(pillars, p => p.zhi === anLu, '暗禄', 'ji', '暗中得助，福禄暗至', results)

  // 奏书
  findInPillars(pillars, p => p.zhi === getZouShu(yueZhi), '奏书', 'ji', '文书喜庆，宜奏表上书', results)

  // 博士
  findInPillars(pillars, p => p.zhi === getBoShi(yueZhi), '博士', 'ji', '学识渊博，学业精进', results)

  // 天巫
  findInPillars(pillars, p => p.zhi === TIAN_WU[yueZhi], '天巫', 'ji', '巫医卜相，宗教缘深', results)

  // 解神
  findInPillars(pillars, p => p.zhi === JIE_SHEN[yueZhi], '解神', 'ji', '逢凶化吉，化解灾厄', results)

  // 圣心
  findInPillars(pillars, p => p.zhi === SHENG_XIN[yueZhi], '圣心', 'ji', '心地善良，有圣贤之心', results)

  // 金堂
  findInPillars(pillars, p => p.zhi === getJinTang(yueZhi), '金堂', 'ji', '金玉满堂，荣华富贵', results)

  // 贯索
  findInPillars(pillars, p => p.zhi === getGuanSuo(nianZhi), '贯索', 'xiong', '牢狱束缚，困顿难脱', results)

  // --- 小儿关煞 ---
  if (getSiZhuGuan(yueZhi, shiZhi)) {
    results.push({ name: '四柱关', type: 'xiong', desc: '小儿防跌撞之灾，宜细心看护', pillar: 'shi' })
  }
  if (getSiJiGuan(yueZhi, shiZhi)) {
    results.push({ name: '四季关', type: 'xiong', desc: '季节交替时易生病，宜注意调养', pillar: 'shi' })
  }
  if (getBaiRiGuan(yueZhi, shiZhi)) {
    results.push({ name: '百日关', type: 'xiong', desc: '出生百日内忌出远门', pillar: 'shi' })
  }
  if (getQianRiGuan(yueZhi, shiZhi)) {
    results.push({ name: '千日关', type: 'xiong', desc: '三岁前体弱多病，宜精心照料', pillar: 'shi' })
  }
  if (isJiangJunGuan(shiZhi)) {
    results.push({ name: '将军关', type: 'xiong', desc: '男儿宜防刀兵之伤', pillar: 'shi' })
  }
  if (getYanWangGuan(yueZhi, shiZhi)) {
    results.push({ name: '阎王关', type: 'xiong', desc: '防溺水、危险游戏', pillar: 'shi' })
  }
  if (getJiJiaoGuan(yueZhi, shiZhi)) {
    results.push({ name: '急脚关', type: 'xiong', desc: '小儿防跌撞摔伤', pillar: 'shi' })
  }
  if (getWuQingGuan(yueZhi, shiZhi)) {
    results.push({ name: '无情关', type: 'xiong', desc: '性格内向，社交需引导', pillar: 'shi' })
  }
  if (getYuPenGuan(yueZhi, shiZhi)) {
    results.push({ name: '浴盆关', type: 'xiong', desc: '小儿洗澡宜防溺水', pillar: 'shi' })
  }
  if (isShenShuiGuan(shiZhi)) {
    results.push({ name: '深水关', type: 'xiong', desc: '防溺水、远离深水区域', pillar: 'shi' })
  }
  if (getTangHuoGuan(yueZhi, shiZhi)) {
    results.push({ name: '汤火关', type: 'xiong', desc: '防烧烫伤、远离火源', pillar: 'shi' })
  }
  if (isYeTiGuan(shiZhi)) {
    results.push({ name: '夜啼关', type: 'xiong', desc: '小儿夜哭不宁，宜安神调养', pillar: 'shi' })
  }
  if (isLuoJingGuan(shiZhi)) {
    results.push({ name: '落井关', type: 'xiong', desc: '防坠井、高空坠落', pillar: 'shi' })
  }
  if (isJiFeiGuan(shiZhi)) {
    results.push({ name: '鸡飞关', type: 'xiong', desc: '小儿受惊夜啼，宜安神', pillar: 'shi' })
  }
  if (getQuMingGuan(yueZhi, shiZhi)) {
    results.push({ name: '取命关', type: 'xiong', desc: '小儿多病灾，宜拜干爹干妈化解', pillar: 'shi' })
  }
  if (isBaiHuGuan(shiZhi)) {
    results.push({ name: '白虎关', type: 'xiong', desc: '小儿防血光之灾，宜佩戴护身符', pillar: 'shi' })
  }
  if (getTieSheGuan(nianZhi, shiZhi)) {
    results.push({ name: '铁蛇关', type: 'xiong', desc: '防金属利器所伤', pillar: 'shi' })
  }
  if (getDuanQiaoGuan(yueZhi, shiZhi)) {
    results.push({ name: '断桥关', type: 'xiong', desc: '出行防桥梁、渡口危险', pillar: 'shi' })
  }

  return results
}

/** 获取神煞分柱显示 */
export function getShenShaByPillar(
  allShenSha: ShenShaItem[]
): { nian: ShenShaItem[]; yue: ShenShaItem[]; ri: ShenShaItem[]; shi: ShenShaItem[] } {
  const result = { nian: [] as ShenShaItem[], yue: [] as ShenShaItem[], ri: [] as ShenShaItem[], shi: [] as ShenShaItem[] }
  for (const s of allShenSha) {
    if (result[s.pillar as keyof typeof result]) {
      result[s.pillar as keyof typeof result].push(s)
    }
  }
  return result
}
