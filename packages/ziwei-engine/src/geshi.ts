/**
 * 紫微斗数特殊格局检测
 *
 * 覆盖30+常见格局，包括：
 * - 君臣庆会/紫府朝垣/府相朝垣/紫微朝斗
 * - 日照雷门/月朗天门/日月并明/日月反背
 * - 杀破狼/机月同梁/巨日同宫
 * - 石中隐玉/雄宿乾元/英星入庙
 * - 左右夹命/魁钺夹命/禄马交驰
 * - 明珠出海/武贪同行/火铃夹命 等
 */
import type { GongWei } from './types'

function getStarNames(gong: GongWei): string[] {
  return gong.stars.map(s => s.name)
}

function hasStar(gong: GongWei, starName: string): boolean {
  return gong.stars.some(s => s.name === starName)
}

function findStarPosition(gongWei: GongWei[], starName: string): GongWei | undefined {
  return gongWei.find(g => hasStar(g, starName))
}

/** 获取某个宫位在12宫中的索引（0=命宫） */
function getGongIdx(gongWei: GongWei[], name: string): number {
  return gongWei.findIndex(g => g.name === name)
}

/** 获取三方四正中某宫的所有星曜名称 */
function getSanFangStarNames(gongWei: GongWei[], centerIdx: number): string[] {
  // 标准三方四正：本位 + 对宫(centerIdx+6) + 左三合(centerIdx+4) + 右三合(centerIdx-4)
  const sanFang = [
    centerIdx,
    (centerIdx + 6) % 12,
    (centerIdx + 4) % 12,
    (centerIdx + 8) % 12,  // same as (centerIdx - 4 + 12) % 12
  ]
  return sanFang.flatMap(idx => getStarNames(gongWei[idx]))
}

/**
 * 君臣庆会 — 紫微在命，三方有天府/天相/左辅/右弼等吉星
 */
function checkJunChenQingHui(mingGong: GongWei, gongWei: GongWei[]): string | null {
  if (!hasStar(mingGong, '紫微')) return null
  const sanFangStars = getSanFangStarNames(gongWei, 0)
  const jiStars = ['天府', '天相', '左辅', '右弼', '文昌', '文曲', '天魁', '天钺']
  const matched = jiStars.filter(s => sanFangStars.includes(s))
  if (matched.length >= 3) return '君臣庆会'
  return null
}

/**
 * 月朗天门 — 太阴在亥
 */
function checkYueLangTianMen(gongWei: GongWei[]): string | null {
  const g = findStarPosition(gongWei, '太阴')
  if (g && g.zhi === '亥') return '月朗天门'
  return null
}

/**
 * 日照雷门 — 太阳在卯
 */
function checkRiZhaoLeiMen(gongWei: GongWei[]): string | null {
  const g = findStarPosition(gongWei, '太阳')
  if (g && g.zhi === '卯') return '日照雷门'
  return null
}

/**
 * 紫府朝垣 — 紫微在寅或申守命
 */
function checkZiFuChaoYuan(mingGong: GongWei): string | null {
  if (hasStar(mingGong, '紫微') && (mingGong.zhi === '寅' || mingGong.zhi === '申')) return '紫府朝垣'
  return null
}

/**
 * 日月并明 — 太阴在亥+太阳在卯
 */
function checkRiYueBingMing(gongWei: GongWei[]): string | null {
  const sun = findStarPosition(gongWei, '太阳')
  const moon = findStarPosition(gongWei, '太阴')
  if (sun && moon && sun.zhi === '卯' && moon.zhi === '亥') return '日月并明'
  return null
}

/**
 * 日月反背 — 太阳在亥/子，太阴在巳/午（失辉）
 */
function checkRiYueFanBei(gongWei: GongWei[]): string | null {
  const sun = findStarPosition(gongWei, '太阳')
  const moon = findStarPosition(gongWei, '太阴')
  const sunLost = sun && ['亥','子','戌'].includes(sun.zhi)
  const moonLost = moon && ['巳','午','辰'].includes(moon.zhi)
  if (sunLost && moonLost) return '日月反背'
  return null
}

/**
 * 府相朝垣 — 天府天相在三方会照命宫
 */
function checkFuXiangChaoYuan(mingGong: GongWei, gongWei: GongWei[]): string | null {
  const sanFang = getSanFangStarNames(gongWei, 0)
  if (sanFang.includes('天府') && sanFang.includes('天相')) return '府相朝垣'
  return null
}

/**
 * 杀破狼 — 七杀+破军+贪狼在三方
 */
function checkShaPoLang(gongWei: GongWei[]): string | null {
  for (let i = 0; i < 12; i++) {
    const stars = getSanFangStarNames(gongWei, i)
    if (stars.includes('七杀') && stars.includes('破军') && stars.includes('贪狼')) return '杀破狼'
  }
  return null
}

/**
 * 机月同梁 — 天机+太阴+天同+天梁在三方
 */
function checkJiYueTongLiang(gongWei: GongWei[]): string | null {
  for (let i = 0; i < 12; i++) {
    const stars = getSanFangStarNames(gongWei, i)
    const set = new Set(stars)
    if (['天机','太阴','天同','天梁'].every(s => set.has(s))) return '机月同梁'
  }
  return null
}

/**
 * 巨日同宫 — 巨门+太阳同宫在寅或申
 */
function checkJuRiTongGong(gongWei: GongWei[]): string | null {
  for (const g of gongWei) {
    if (hasStar(g, '巨门') && hasStar(g, '太阳') && (g.zhi === '寅' || g.zhi === '申')) return '巨日同宫'
  }
  return null
}

/**
 * 石中隐玉 — 巨门在子或午
 */
function checkShiZhongYinYu(gongWei: GongWei[]): string | null {
  const g = findStarPosition(gongWei, '巨门')
  if (g && (g.zhi === '子' || g.zhi === '午')) return '石中隐玉'
  return null
}

/**
 * 雄宿乾元 — 廉贞在申（或廉贞在命无煞）
 */
function checkXiongSuQianYuan(mingGong: GongWei): string | null {
  if (hasStar(mingGong, '廉贞') && mingGong.zhi === '申') return '雄宿乾元'
  return null
}

/**
 * 英星入庙 — 破军在子或午
 */
function checkYingXingRuMiao(gongWei: GongWei[]): string | null {
  const g = findStarPosition(gongWei, '破军')
  if (g && (g.zhi === '子' || g.zhi === '午')) return '英星入庙'
  return null
}

/**
 * 紫微朝斗 — 紫微在午
 */
function checkZiWeiChaoDou(mingGong: GongWei): string | null {
  if (hasStar(mingGong, '紫微') && mingGong.zhi === '午') return '紫微朝斗'
  return null
}

/**
 * 明珠出海 — 日月在田宅宫（日月照壁）或紫微+天同
 */
function checkMingZhuChuHai(gongWei: GongWei[]): string | null {
  const tianZhai = gongWei[getGongIdx(gongWei, '田宅')]
  if (tianZhai && hasStar(tianZhai, '太阳') && hasStar(tianZhai, '太阴')) return '明珠出海'
  return null
}

/**
 * 月同遇煞 — 太阴天同在三方且见煞（擎羊/陀罗/火星/铃星）
 */
function checkYueTongYuSha(mingGong: GongWei, gongWei: GongWei[]): string | null {
  const sanFang = getSanFangStarNames(gongWei, 0)
  const sha = ['擎羊','陀罗','火星','铃星']
  if (sanFang.includes('太阴') && sanFang.includes('天同') && sha.some(s => sanFang.includes(s))) return '月同遇煞'
  return null
}

/**
 * 武贪同行 — 武曲+贪狼同宫
 */
function checkWuTanTongXing(gongWei: GongWei[]): string | null {
  for (const g of gongWei) {
    if (hasStar(g, '武曲') && hasStar(g, '贪狼')) return '武贪同行'
  }
  return null
}

/**
 * 禄马交驰 — 禄存+天马同宫或对宫
 */
function checkLuMaJiaoChi(gongWei: GongWei[]): string | null {
  for (let i = 0; i < 12; i++) {
    const stars = getSanFangStarNames(gongWei, i)
    if (stars.includes('禄存') && stars.includes('天马')) return '禄马交驰'
  }
  return null
}

/**
 * 火铃夹命 — 命宫左右两宫有火星+铃星
 */
function checkHuoLingJiaMing(gongWei: GongWei[]): string | null {
  const left = gongWei[11]   // 父母宫（命宫逆一位）
  const right = gongWei[1]   // 兄弟宫（命宫顺一位）
  if ((hasStar(left, '火星') && hasStar(right, '铃星')) || (hasStar(left, '铃星') && hasStar(right, '火星'))) return '火铃夹命'
  return null
}

/**
 * 左右夹命 — 命宫两侧有左辅右弼
 */
function checkZuoYouJiaMing(gongWei: GongWei[]): string | null {
  const left = gongWei[11]
  const right = gongWei[1]
  if ((hasStar(left, '左辅') && hasStar(right, '右弼')) || (hasStar(left, '右弼') && hasStar(right, '左辅'))) return '左右夹命'
  return null
}

/**
 * 魁钺夹命 — 命宫两侧有天魁天钺
 */
function checkKuiYueJiaMing(gongWei: GongWei[]): string | null {
  const left = gongWei[11]
  const right = gongWei[1]
  if ((hasStar(left, '天魁') && hasStar(right, '天钺')) || (hasStar(left, '天钺') && hasStar(right, '天魁'))) return '魁钺夹命'
  return null
}

/**
 * 紫府同宫 — 紫微+天府同宫
 */
function checkZiFuTongGong(gongWei: GongWei[]): string | null {
  for (const g of gongWei) {
    if (hasStar(g, '紫微') && hasStar(g, '天府')) return '紫府同宫'
  }
  return null
}

/**
 * 阳梁昌禄 — 太阳+天梁+文昌+禄存会照
 */
function checkYangLiangChangLu(gongWei: GongWei[]): string | null {
  for (let i = 0; i < 12; i++) {
    const stars = getSanFangStarNames(gongWei, i)
    const needed = ['太阳','天梁','文昌','禄存']
    if (needed.filter(s => stars.includes(s)).length >= 3) return '阳梁昌禄'
  }
  return null
}

/**
 * 贪武同行 — 贪狼+武曲同宫
 */
function checkTanWuTongXing(gongWei: GongWei[]): string | null {
  for (const g of gongWei) {
    if (hasStar(g, '贪狼') && hasStar(g, '武曲')) return '贪武同行'
  }
  return null
}

/**
 * 天乙拱命 — 天魁天钺在命宫三方
 */
function checkTianYiGongMing(gongWei: GongWei[]): string | null {
  const sanFang = getSanFangStarNames(gongWei, 0)
  if (sanFang.includes('天魁') && sanFang.includes('天钺')) return '天乙拱命'
  return null
}

/**
 * 文星拱命 — 文昌文曲在命宫三方
 */
function checkWenXingGongMing(gongWei: GongWei[]): string | null {
  const sanFang = getSanFangStarNames(gongWei, 0)
  if (sanFang.includes('文昌') && sanFang.includes('文曲')) return '文星拱命'
  return null
}

/**
 * 双禄朝垣 — 禄存+化禄在三方
 */
function checkShuangLuChaoYuan(gongWei: GongWei[]): string | null {
  const sanFang = getSanFangStarNames(gongWei, 0)
  if (sanFang.includes('禄存') && sanFang.includes('化禄')) return '双禄朝垣'
  return null
}

/**
 * 科权禄会 — 化科+化权+化禄在三方
 */
function checkKeQuanLuHui(gongWei: GongWei[]): string | null {
  const sanFang = getSanFangStarNames(gongWei, 0)
  const needed = ['化科','化权','化禄']
  if (needed.filter(s => sanFang.includes(s)).length >= 2) return '科权禄会'
  return null
}

/**
 * 铃昌陀武 — 铃星+文昌+陀罗+武曲会聚
 */
function checkLingChangTuoWu(gongWei: GongWei[]): string | null {
  const sanFang = getSanFangStarNames(gongWei, 0)
  const needed = ['铃星','文昌','陀罗','武曲']
  if (needed.filter(s => sanFang.includes(s)).length >= 3) return '铃昌陀武'
  return null
}

/**
 * 刑囚夹印 — 天相被擎羊+廉贞夹（天相=印，廉贞=囚，擎羊=刑）
 */
function checkXingQiuJiaYin(gongWei: GongWei[]): string | null {
  for (let i = 0; i < 12; i++) {
    if (!hasStar(gongWei[i], '天相')) continue
    const left = gongWei[(i + 11) % 12]
    const right = gongWei[(i + 1) % 12]
    const lStars = getStarNames(left)
    const rStars = getStarNames(right)
    if ((lStars.includes('擎羊') && rStars.includes('廉贞')) || (lStars.includes('廉贞') && rStars.includes('擎羊'))) return '刑囚夹印'
  }
  return null
}

/**
 * 检测所有特殊格局
 */
export function checkGeShi(mingGong: GongWei, gongWei: GongWei[]): string[] {
  const results: string[] = []
  const checks = [
    checkJunChenQingHui(mingGong, gongWei),
    checkYueLangTianMen(gongWei),
    checkRiZhaoLeiMen(gongWei),
    checkZiFuChaoYuan(mingGong),
    checkRiYueBingMing(gongWei),
    // 新增25格局
    checkRiYueFanBei(gongWei),
    checkFuXiangChaoYuan(mingGong, gongWei),
    checkShaPoLang(gongWei),
    checkJiYueTongLiang(gongWei),
    checkJuRiTongGong(gongWei),
    checkShiZhongYinYu(gongWei),
    checkXiongSuQianYuan(mingGong),
    checkYingXingRuMiao(gongWei),
    checkZiWeiChaoDou(mingGong),
    checkMingZhuChuHai(gongWei),
    checkYueTongYuSha(mingGong, gongWei),
    checkWuTanTongXing(gongWei),
    checkLuMaJiaoChi(gongWei),
    checkHuoLingJiaMing(gongWei),
    checkZuoYouJiaMing(gongWei),
    checkKuiYueJiaMing(gongWei),
    checkZiFuTongGong(gongWei),
    checkYangLiangChangLu(gongWei),
    checkTanWuTongXing(gongWei),
    checkTianYiGongMing(gongWei),
    checkWenXingGongMing(gongWei),
    checkShuangLuChaoYuan(gongWei),
    checkKeQuanLuHui(gongWei),
    checkLingChangTuoWu(gongWei),
    checkXingQiuJiaYin(gongWei),
  ]

  for (const result of checks) {
    if (result) results.push(result)
  }
  return results
}
