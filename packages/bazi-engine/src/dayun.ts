/**
 * 大运计算模块
 * 包含：起运时间、大运排盘（首列为「起运前」，其后 9 步，共 10 列，与旧版排盘一致）
 */
import type { Gan, Zhi, QiYun, DaYunStep, LiuNian } from './types'
import { GAN, ZHI } from './constants'
import { daysToNearestJie, getNianZhuYear } from './jieqi'
import { calcNianZhu, calcShiShen } from './sizhu'
import { getLiuYueGanZhi } from './liunian'

/** 判断年柱天干是否为阳年 */
export function isYangNian(nianGan: Gan): boolean {
  return '甲丙戊庚壬'.includes(nianGan)
}

/** 计算起运信息 */
export function calcQiYun(
  year: number, month: number, day: number, hour: number,
  gender: '男' | '女',
  nianGan: Gan,
  yueGanZhi: string,
  minute = 0
): QiYun {
  const yang = isYangNian(nianGan)
  // 阳男阴女顺排，阴男阳女逆排
  const forward = (yang && gender === '男') || (!yang && gender === '女')
  const direction = forward ? 'forward' : 'backward'

  // 距最近节的天数（传入出生小时用于精确判定）
  // 必须把分钟传下去：节气时刻精确到分，只传整点会在节气当天判错归属（见 jieqi.ts 顶部说明）
  const dayCount = daysToNearestJie(year, month, day, direction, hour, minute)

  /**
   * 三天折一岁、一天折四个月、一时辰折十天。
   *
   * 🔴 2026-09-19 调整：`daysToNearestJie` 现在返回**含小数**的天数
   * （原先在那边 `Math.ceil` 掉了，见该函数顶部说明）。小数必须留到这里才折算，
   * 否则「9 年 9 个月 22 日」这种精度根本表达不出来——旧版 App 给的就是到日的。
   *
   * 折算口径：1 天 = 4 个月 = 120 天（按 30 天/月），余数再折成日。
   */
  const totalMonthsExact = dayCount * 4
  const startAge = Math.floor(totalMonthsExact / 12)
  const remainMonths = Math.floor(totalMonthsExact % 12)
  // 剩余不足一个月的部分折成日（1 个月按 30 日计，与「三天折一岁」同一套近似）。
  // 用 floor 不用 round——不满一日不计，这是传统习惯，也与旧版实测吻合：
  // B2 得 29.76 日，旧版给「29 日」；四舍五入会得 30 日，差一天。
  const remainDays = Math.floor((totalMonthsExact % 1) * 30)

  // 交运日期 = 出生日期 + 起运总月数
  const totalQiYunMonths = Math.round(totalMonthsExact)
  const birthDate = new Date(year, month - 1, day, hour)
  const jiaoYunDate = new Date(birthDate)
  jiaoYunDate.setMonth(jiaoYunDate.getMonth() + totalQiYunMonths)
  const jiaoYunMonth = jiaoYunDate.getMonth() + 1
  const jiaoYunDay = jiaoYunDate.getDate()
  /**
   * 🔴 2026-09-19 修：大运列的起始年要取**命理年**（立春分界），不是公历年。
   *
   * 交运日若落在 1月1日 ~ 立春 之间，两者差一年，整条大运的年份会整体偏移：
   *   B1 交运 2009-12-04 → 公历 2009、命理 2009，**两者相同，碰巧对**
   *   B2 交运 2010-01-04 → 公历 2010、命理 **2009**（立春在 02-04），旧版取 2009
   *
   * 这条是「两个样本里一个碰巧对」的活例——只拿 B1 验证的话，
   * 这一层根本不会暴露，会以为起运已经收工。
   *
   * ⚠️ 只有**大运列的起始年**要用命理年；对外展示的「每逢X年X月X日交运」
   * 用的是公历月日（旧版表述即「每逢己年11月27日前后交运」），故
   * `jiaoYunMonth`/`jiaoYunDay` 保持公历，不要跟着改。
   */
  const jiaoYunYear = getNianZhuYear(
    jiaoYunDate.getFullYear(), jiaoYunMonth, jiaoYunDay, 12, 0,
  )

  // 生成大运步骤（首列为「起运前」，年份取年柱所属的命理年，与旧版一致）
  const nianZhuYear = getNianZhuYear(year, month, day, hour, minute)
  const daYun = buildDaYun(yueGanZhi, jiaoYunYear, startAge, forward, nianZhuYear)

  return {
    startYear: jiaoYunYear,
    startAge,
    // 交运天干取第一步真大运（daYun[0] now 是起运前的月柱列，不是大运）
    jiaoYunGan: daYun[1]?.tianGan || '甲',
    jiaoYunMonth,
    jiaoYunDay,
    dayCount,
    // dayCount 现在含小数（原先在 daysToNearestJie 里被 ceil 掉了），
    // 展示时保留一位；起运时间补到「日」——旧版 App 给的就是「9年10个月29日」这种精度
    desc:
      `${direction === 'forward' ? '顺' : '逆'}排，` +
      `距${direction === 'forward' ? '下一' : '上一'}个节${dayCount.toFixed(1)}天，` +
      `${startAge}岁${remainMonths}个月${remainDays > 0 ? `${remainDays}日` : ''}起运`,
    daYun,
  }
}

/**
 * 构建大运：共 10 列 = 1 列「起运前」（i=0，用月柱本身）+ 9 步大运（i=1..9）。
 * 与旧版排盘列数一致；此前只出 8 步且无起运前列，覆盖年龄比旧版少约 10 年。
 */
function buildDaYun(
  yueGanZhi: string,
  startYear: number,
  startAge: number,
  forward: boolean,
  nianZhuYear: number
): DaYunStep[] {
  const yueGan = yueGanZhi[0] as Gan
  const yueZhi = yueGanZhi[1] as Zhi
  const ganIdx = GAN.indexOf(yueGan)
  const zhiIdx = ZHI.indexOf(yueZhi)

  const steps: DaYunStep[] = []

  for (let i = 0; i <= 9; i++) {
    // i=0 即「起运前」：offset 为 0，取月柱本身
    const offset = forward ? i : -i
    const newGanIdx = ((ganIdx + offset) % 10 + 10) % 10
    const newZhiIdx = ((zhiIdx + offset) % 12 + 12) % 12
    const tianGan = GAN[newGanIdx]
    const diZhi = ZHI[newZhiIdx]
    const ganZhi = tianGan + diZhi

    const isPreQiYun = i === 0
    const stepStartAge = isPreQiYun ? 0 : startAge + (i - 1) * 10
    const stepEndAge = isPreQiYun ? Math.max(startAge - 1, 0) : stepStartAge + 9
    // 起运前列年份用年柱的命理年（旧版即如此：年柱己卯→1999，年柱庚辰→2000）
    const stepStartYear = isPreQiYun ? nianZhuYear : startYear + (i - 1) * 10
    const stepEndYear = isPreQiYun ? startYear - 1 : stepStartYear + 9

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
  return getLiuYueGanZhi(nianGan).map(({ month, ganZhi }) => ({ month, ganZhi }))
}
