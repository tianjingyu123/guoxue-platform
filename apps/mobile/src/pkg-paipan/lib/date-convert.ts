/**
 * 排盘日期归一：农历输入 → 公历（所有排盘引擎的入参恒为公历）
 *
 * 背景（2026-07-14 修复）：components/bazi/date-picker-modal.vue 有「公历 / 农历 / 四柱」三档，
 * 农历模式下 confirm 回传的 year/month/day 是**农历值**（正月=1、初一=1），并带 isLunar: true。
 * 此前 13 个排盘入口页全部丢弃 isLunar，把农历数字直接当公历塞进引擎 → 四柱全错。
 * 所有入口页的 onDateConfirm 必须经本函数归一后再存入 params。
 *
 * 闰月说明：date-picker-modal 的农历月份只有「正…腊」12 项，无闰月选项，
 * 故此处按非闰月解释（Lunar.fromYmdHms 的 month 传正数）。闰月生辰暂无法输入，
 * 待选择器支持后本函数需同步支持负数月份（lunar-typescript 以负数表示闰月）。
 */
import { Lunar } from './lunar/index.js'

export interface PickedDate {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** true 表示 year/month/day 为农历值 */
  isLunar?: boolean
}

export interface SolarDate {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

/**
 * 归一为公历。isLunar 为假时原样返回；为真时按农历解释并转公历。
 * 农历日期非法（如某月无三十）时抛错，由调用方提示用户重选。
 */
export function toSolar(d: PickedDate): SolarDate {
  const { year, month, day, hour, minute } = d
  if (!d.isLunar) return { year, month, day, hour, minute }

  const solar = Lunar.fromYmdHms(year, month, day, hour, minute, 0).getSolar()
  const y = solar.getYear()
  const m = solar.getMonth()
  const dd = solar.getDay()
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(dd)) {
    throw new Error('农历日期无效，请重新选择')
  }
  return { year: y, month: m, day: dd, hour, minute }
}

/** 安全版：转换失败时回退为原值并返回 ok=false，供页面 toast 提示 */
export function toSolarSafe(d: PickedDate): { date: SolarDate; ok: boolean } {
  try {
    return { date: toSolar(d), ok: true }
  } catch {
    const { year, month, day, hour, minute } = d
    return { date: { year, month, day, hour, minute }, ok: false }
  }
}
