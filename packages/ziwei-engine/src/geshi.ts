/**
 * 紫微斗数特殊格局检测
 *
 * 实现至少4种格局：
 * 1. 君臣庆会 — 紫微在命宫且有辅弼等吉星会照
 * 2. 月朗天门 — 太阴在亥（天门之位）
 * 3. 日照雷门 — 太阳在卯（雷门之位）
 * 4. 紫府朝垣 — 紫微与天府分别在命宫的三方四正
 * 5. 日月并明 — 太阴在亥+太阳在卯 同时出现
 */
import type { GongWei, Star, GongName } from './types'

/** 星曜名称集合 */
function getStarNames(gong: GongWei): string[] {
  return gong.stars.map(s => s.name)
}

/** 检查某个宫位是否包含指定星曜 */
function hasStar(gong: GongWei, starName: string): boolean {
  return gong.stars.some(s => s.name === starName)
}

/** 获取特定星曜所在的宫位 */
function findStarPosition(gongWei: GongWei[], starName: string): GongWei | undefined {
  return gongWei.find(g => hasStar(g, starName))
}

/**
 * 君臣庆会
 * 紫微在命宫，且命宫的三方（命宫、财帛、官禄）有天相、左辅、右弼等吉星
 * 或命宫有紫微+天府同宫/会照
 */
function checkJunChenQingHui(mingGong: GongWei): string | null {
  const stars = getStarNames(mingGong)
  if (stars.includes('紫微') || stars.includes('天府')) {
    // 命宫有吉星会聚（简化为有3颗以上主星）
    const mainStars = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军']
    const matched = stars.filter(s => mainStars.includes(s))
    if (matched.length >= 3) {
      return '君臣庆会'
    }
  }
  return null
}

/**
 * 月朗天门
 * 太阴在亥宫（天门），亥属水，太阴亦属水，得位
 */
function checkYueLangTianMen(gongWei: GongWei[]): string | null {
  const taiYinGong = findStarPosition(gongWei, '太阴')
  if (taiYinGong && taiYinGong.zhi === '亥') {
    return '月朗天门'
  }
  return null
}

/**
 * 日照雷门
 * 太阳在卯宫（雷门），卯属木，太阳属火，木火相生
 */
function checkRiZhaoLeiMen(gongWei: GongWei[]): string | null {
  const taiYangGong = findStarPosition(gongWei, '太阳')
  if (taiYangGong && taiYangGong.zhi === '卯') {
    return '日照雷门'
  }
  return null
}

/**
 * 紫府朝垣
 * 紫微在命宫或身宫，天府在三方四正来会
 * 简化版：紫微在寅或申守命
 */
function checkZiFuChaoYuan(mingGong: GongWei): string | null {
  if (hasStar(mingGong, '紫微') && (mingGong.zhi === '寅' || mingGong.zhi === '申')) {
    return '紫府朝垣'
  }
  return null
}

/**
 * 日月并明
 * 太阴在亥 + 太阳在卯，日月各居庙旺之位
 */
function checkRiYueBingMing(gongWei: GongWei[]): string | null {
  const taiYangGong = findStarPosition(gongWei, '太阳')
  const taiYinGong = findStarPosition(gongWei, '太阴')
  if (taiYangGong && taiYinGong && taiYangGong.zhi === '卯' && taiYinGong.zhi === '亥') {
    return '日月并明'
  }
  return null
}

/**
 * 检测所有特殊格局
 */
export function checkGeShi(mingGong: GongWei, gongWei: GongWei[]): string[] {
  const results: string[] = []

  const checks = [
    checkJunChenQingHui(mingGong),
    checkYueLangTianMen(gongWei),
    checkRiZhaoLeiMen(gongWei),
    checkZiFuChaoYuan(mingGong),
    checkRiYueBingMing(gongWei),
  ]

  for (const result of checks) {
    if (result) {
      results.push(result)
    }
  }

  return results
}
