/**
 * 大运计算模块
 * 包含：起运时间、8步大运排盘
 */
import type { Gan, Zhi, QiYun, DaYunStep, LiuNian } from './types'
import { GAN, ZHI } from './constants'
import { daysToNearestJie } from './jieqi'
import { calcNianZhu, calcShiShen } from './sizhu'

/** 判断年柱天干是否为阳年 */
export function isYangNian(nianGan: Gan): boolean {
  return '甲丙戊庚壬'.includes(nianGan)
}

/** 计算起运信息 */
export function calcQiYun(
  year: number, month: number, day: number, hour: number,
  gender: '男' | '女',
  nianGan: Gan,
  yueGanZhi: string
): QiYun {
  const yang = isYangNian(nianGan)
  // 阳男阴女顺排，阴男阳女逆排
  const forward = (yang && gender === '男') || (!yang && gender === '女')
  const direction = forward ? 'forward' : 'backward'

  // 距最近节的天数（传入出生小时用于精确判定）
  const dayCount = daysToNearestJie(year, month, day, direction, hour)

  // 3天折1岁，1天折4个月
  const totalMonths = (dayCount / 3) * 12
  const startAge = Math.floor(totalMonths / 12)
  const remainMonths = Math.round(totalMonths % 12)

  // 起运年月
  let startYear = year + startAge
  let startMonth = month + remainMonths
  if (startMonth > 12) {
    startYear += Math.floor(startMonth / 12)
    startMonth = startMonth % 12 || 12
  }

  // 交运日（简化：用出生日）
  const jiaoYunDay = day

  // 生成大运步骤
  const daYun = buildDaYun(yueGanZhi, startYear, startAge, forward)

  return {
    startYear,
    startAge,
    jiaoYunGan: daYun[0]?.tianGan || '甲',
    jiaoYunMonth: startMonth,
    jiaoYunDay,
    dayCount,
    desc: `${direction === 'forward' ? '顺' : '逆'}排，距${direction === 'forward' ? '下一' : '上一'}个节${dayCount}天，${startAge}岁${remainMonths}个月起运`,
    daYun,
  }
}

/** 构建8步大运 */
function buildDaYun(
  yueGanZhi: string,
  startYear: number,
  startAge: number,
  forward: boolean
): DaYunStep[] {
  const yueGan = yueGanZhi[0] as Gan
  const yueZhi = yueGanZhi[1] as Zhi
  const ganIdx = GAN.indexOf(yueGan)
  const zhiIdx = ZHI.indexOf(yueZhi)

  const steps: DaYunStep[] = []

  for (let i = 1; i <= 8; i++) {
    const offset = forward ? i : -i
    const newGanIdx = ((ganIdx + offset) % 10 + 10) % 10
    const newZhiIdx = ((zhiIdx + offset) % 12 + 12) % 12
    const tianGan = GAN[newGanIdx]
    const diZhi = ZHI[newZhiIdx]
    const ganZhi = tianGan + diZhi

    const stepStartAge = startAge + (i - 1) * 10
    const stepEndAge = stepStartAge + 9
    const stepStartYear = startYear + (i - 1) * 10
    const stepEndYear = stepStartYear + 9

    steps.push({
      ganZhi,
      tianGan,
      diZhi,
      ganShiShen: '比', // 待填充，需要日干
      zhiShiShen: '比', // 待填充
      startYear: stepStartYear,
      endYear: stepEndYear,
      startAge: stepStartAge,
      endAge: stepEndAge,
      liuNian: [],
    })
  }

  return steps
}

/** 计算流年（某一步大运中的10个流年） */
export function calcLiuNian(
  step: DaYunStep,
  riGan: Gan
): LiuNian[] {
  const liuNian: LiuNian[] = []

  for (let y = step.startYear; y <= step.endYear; y++) {
    const nian = calcNianZhu(y)
    const age = step.startAge + (y - step.startYear)

    liuNian.push({
      year: y,
      age,
      ganZhi: nian.ganZhi,
      ganShiShen: calcShiShen(riGan, nian.gan),
      zhiShiShen: calcShiShen(riGan, nian.zhi),
    })
  }

  return liuNian
}

/** 为所有大运填充十神并生成流年 */
export function fillDaYunShiShen(daYun: DaYunStep[], riGan: Gan): DaYunStep[] {
  return daYun.map(step => {
    const filled: DaYunStep = {
      ...step,
      ganShiShen: calcShiShen(riGan, step.tianGan),
      zhiShiShen: calcShiShen(riGan, step.diZhi),
      liuNian: calcLiuNian(step, riGan),
    }
    return filled
  })
}

/** 流月计算：某流年中的12个月干支（寅月=正月起） */
export function calcLiuYue(nianGan: Gan): { month: number; ganZhi: string }[] {
  const result = []
  for (let i = 0; i < 12; i++) {
    const nianIdx = GAN.indexOf(nianGan)
    const dunIdx = Math.floor(nianIdx % 5)
    const WU_HU_DUN: Gan[] = ['丙','戊','庚','壬','甲','丙','戊','庚','壬','甲']
    const ganIdx = (GAN.indexOf(WU_HU_DUN[dunIdx]) + i) % 10
    // 正月=寅月(ZHI[2])，二月=卯月(ZHI[3])，...
    const zhiIdx = (i + 2) % 12
    result.push({
      month: i + 1,
      ganZhi: GAN[ganIdx] + ZHI[zhiIdx],
    })
  }
  return result
}
