/**
 * 四化飞星计算
 */
import type { Gan, SiHua } from './types'
import { GAN, SI_HUA_TABLE } from './constants'

/**
 * 根据生年天干计算四化
 * 返回 { huaLu, huaQuan, huaKe, huaJi }
 */
export function calcSiHua(yearGan: Gan): SiHua {
  const idx = GAN.indexOf(yearGan)
  if (idx === -1) {
    return { huaLu: '', huaQuan: '', huaKe: '', huaJi: '' }
  }
  const [huaLu, huaQuan, huaKe, huaJi] = SI_HUA_TABLE[idx]
  return { huaLu, huaQuan, huaKe, huaJi }
}
