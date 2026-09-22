/**
 * 金口诀排课引擎（大六壬金口诀 / 孙膑预测法）
 *
 * 排课流程（已对照竞品黄金基准逐步验证）：
 * 1. 四柱：lunar-typescript 精确取（年柱立春换年、月柱交节换月）
 * 2. 月将：交节法=月建六合；中气法=太阳过宫（雨水登明亥起）
 * 3. 地分：来人方位/报数/随机 → 十二支
 * 4. 将神：月将加时 —— 将神 = 月将 + (地分 - 时支)
 * 5. 贵神：日干起天乙贵人（两派口诀），昼夜之分，
 *    贵人临亥子丑寅卯辰顺布、临巳午未申酉戌逆布十二天将至地分，
 *    所乘天将之本家支即贵神
 * 6. 人元：五子元遁日干得地分之遁干；神干/贵干同法
 * 7. 取用：三阳一阴取阴爻、三阴一阳取阳爻、二阴二阳取将神、
 *    纯阴课反取阳（将神）、纯阳课反取阴（贵神）
 *
 * 黄金基准（竞品实测 2025-09-29 10:49 地分子）：
 * 四柱 乙巳/乙酉/辛丑/癸巳，月将辰，人元戊，贵神戊戌(天空)，
 * 将神己亥(登明)，用爻=将神，日空辰巳，四大空亡亥子壬癸，妻动+贼动
 */

import { Solar } from "./vendor/lunar"
import { jieqiRangeAt, type JieqiMoment } from "./jieqi-engine"
import { computeJinkoujue, type JkjPosition, type JkjResult } from "@guoxue/shared/paipan"

// ─── 基础常量 ───

export const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const
export const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const

/**
 * 🔴 2026-09-20 删掉了一大段**死副本**。
 *
 * 2026-09-18 推算逻辑迁去 shared 之后，本文件原样留着 16 个与 shared 逐字相同的
 * 常量与函数（五行/阴阳/生克、十二天将、两派贵人口诀、月将名、wuziDun、wangShuaiOf、
 * xunKongOf、siDaKongOf、LIUHE、ZHONGQI_JIANG、驿马桃花日禄羊刃月德天医），
 * 而页面只 import 了 `ZHI` 与 `paiJinKouJue` 两个东西——**一个都没在用**。
 *
 * 删它们不只是为了整洁，是因为这类死副本是**下一个人的陷阱**：
 * 他会以为改这里就改了算法（本仓库已在穿山七十二龙、纳音、姓名五格上各栽过一次）。
 * 删除前逐块比对过，16 块与 shared 当时还**逐字相同、尚未漂移**——
 * 趁没漂移先拆掉，比等它错开之后再来查哪份是真的容易得多。
 *
 * 需要这些常量请从 `@guoxue/shared/paipan` 取，不要在此重建。
 */


// ─── 类型 ───

export type DifenMethod = "manual" | "number" | "random"

export interface JkjOptions {
  /** 起课时间 */
  date: Date
  /** 地分（manual 直接给支；number 给报数；random 忽略） */
  difenMethod: DifenMethod
  difenZhi?: string
  difenNumber?: number
  /** 换将方式：jie=交节（月建六合） zhong=中气（太阳过宫） */
  jiangMethod: "jie" | "zhong"
  /** 贵人口诀：A=甲戊庚牛羊 B=甲羊戊庚牛 */
  guirenSchool: "A" | "B"
  /** 贵神昼夜：auto=卯酉区分 day=白天 night=夜晚 */
  guiType: "auto" | "day" | "night"
  /** 事项（选填） */
  topic?: string
}

// 结果类型直接复用 shared 的，别再抄一份（页面 import 路径与名字都不变）
export type { JkjPosition, JkjResult }


// ─── 主引擎 ───

/**
 * 排金口诀。
 *
 * 🔴 推算逻辑已迁至 packages/shared/src/paipan/jinkoujue-engine.ts（2026-09-18），
 * 前后端共用同一份，**不要在此另写一份**（后端旧 calculator 曾另写一套，月将算错半年，已删除）。
 * 这里只做两件事：把历法数据（四柱、中气表、节气区间、农历标签）算好喂给引擎，
 * 以及保持原有出参形态不变，页面无需改动。
 */
export function paiJinKouJue(opts: JkjOptions): JkjResult {
  const d = opts.date
  const solar = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), 0)
  const lunar = solar.getLunar()

  // 中气表：名 → 时间戳，交给引擎判「最近一个已过的中气」
  //
  // 🔴 2026-09-20：必须合并两张年表，只取当日那张会漏掉当年冬至。
  // `getJieQiTable()` 是**按农历年**给的：查 2025-12-25 时表里的「冬至」装的是
  // 2024-12-21（上一个），当年 2025-12-21 那个要跨年后再查才出现。
  // 只用单张表的话，每年 **12-22 ~ 12-31** 这十天找不到当年冬至而退回小雪，
  // **月将错一位（给寅，应丑）**，盘面却完整无异常。实测 2022–2027 稳定复现。
  // 并入「45 天后」那张年表即可补全：实测 2020–2030 最大陈旧度由 39.4 天降到 31.3 天
  // （31.3 正是相邻中气的真实最大间隔，即候选集已完整）。
  // ⚠️ 服务端 `paipan.service.ts` 的 `calcJinkoujue` 有一份同样的建表代码，**两处要一起改**。
  const zhongqiTable: Record<string, number> = {}
  const later = new Date(d.getTime() + 45 * 86400000)
  const tables = [
    lunar.getJieQiTable(),
    Solar.fromYmdHms(later.getFullYear(), later.getMonth() + 1, later.getDate(), 12, 0, 0)
      .getLunar().getJieQiTable(),
  ]
  // 引擎按名字查表、每名只能有一个时刻，所以同名条目的取舍规则是：
  // **取「不晚于起课时刻」中最晚的那个**；若都在未来则留最早的（未来条目会被引擎自行滤掉）。
  // 不能简单取较晚的——一月份查盘时，两张表的「冬至」一个是刚过的、一个是年底的，
  // 取较晚就会把刚过的那个丢掉，反而把月将推回小雪。
  const now = d.getTime()
  const cand: Record<string, number[]> = {}
  for (const table of tables) {
    for (const name of Object.keys(table)) {
      const jq = table[name]
      const t = new Date(
        jq.getYear(), jq.getMonth() - 1, jq.getDay(), jq.getHour(), jq.getMinute(),
      ).getTime()
      ;(cand[name] ??= []).push(t)
    }
  }
  for (const [name, list] of Object.entries(cand)) {
    const passed = list.filter((t) => t <= now)
    zhongqiTable[name] = passed.length ? Math.max(...passed) : Math.min(...list)
  }

  // 节气区间按**瞬时**判：lunar.getPrevJieQi() 是按天判的——2026 立春交节在 04:02，
  // 当天 03:00 问它就已答「立春」，而同一时刻月柱(Exact)还是丑月，盘面会自相矛盾。
  const jqRange = jieqiRangeAt(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes())
  const fmtJq = (jq: JieqiMoment) =>
    `${jq.name}${jq.year}.${String(jq.month).padStart(2, "0")}.${String(jq.day).padStart(2, "0")} ${jq.timeText.slice(0, 5)}`

  return computeJinkoujue({
    ...opts,
    sizhu: {
      year: lunar.getYearInGanZhiByLiChun(),
      month: lunar.getMonthInGanZhiExact(),
      day: lunar.getDayInGanZhiExact(),
      hour: lunar.getTimeInGanZhi(),
    },
    zhongqiTable,
    jieqiRange: `${fmtJq(jqRange.prev)} ~ ${fmtJq(jqRange.next)}`,
    lunarLabel: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
  }) as JkjResult
}
