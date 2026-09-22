// ─────────────────────────────────────────────
// 奇门穿壬排盘引擎
//
// ── 已验证成立（竞品截图 2020-08-19 15:58，庚子 甲申 甲午 壬申，12 格逐格核对）──
//  - 六壬层：月将午（处暑前大暑后）加时申；四课三传复用已黄金校准的大六壬引擎
//  - 外圈十二支层（只依赖日柱与六壬盘，与奇门局数无关，故仍成立）：
//    · 遁干 = 自日柱起顺遁六十甲子（如甲午日：午甲 未乙 … 丑辛 寅壬，不避旬空）
//    · 天将 = 天盘支之将（天盘支 Z 落于地盘 lin，取 jiangPan[lin]；六合显示"六"、青龙"青"、白虎"白"）
//    · 建除 = 日支起建顺行十二神（建除满平定执破危成收开闭）
//    · 十二宫 = 命宫起于日支顺三位（黄金课例：午日命在酉），自命宫逆时针布
//      命兄妻子财疾移役禄田德母（即命/兄弟/夫妻/子女/财帛/疾厄/迁移/仆役/官禄/田宅/福德/父母）
//
// ── 2026-09-20 切除：自制「无闰连续排局」──
// 原实现自带一张 JU_WHEEL 三元定局表 + 2020-08-19 锚点，按 360 日轮连续推进、不置闰不拆补。
// 两处硬伤：
//  ① 表尾立冬/小雪/大雪 = 四七一/三六九/二五八，实为六九三/五八二/四七一。
//     （寒露与立冬同局、霜降与小雪同局，作者把 7→6→5 顺手递减成了 4→3→2；
//      且阴遁上元合法值域为 {9,8,7,6,5,4,2,1}，"3"根本不该出现）
//  ② 360 日轮 vs 365.2422 日回归年 ⇒ 每年漂移约 5.24 天且永不重锚。
//     实测：锚点当日（真节气立秋）即判为"白露上元"，已偏 2 个节气；2026 年偏 4 个节气；
//     与 shared 已验证的拆补/茅山/置闰三法逐日全枚举比对，92% 的日子局数不同。
//     无界漂移在任何一派下都不成立（三派皆重锚真节气），故按缺陷处理而非流派差异。
// 现改为直接调用 shared 的 determineJu。
//
// ── 定局口径：拆补（王凤麟一脉，2026-09-20 决策人确认）──
// 奇门穿壬与阴盘奇门、山向奇门同属王凤麟理论体系。本仓库同脉实现的定局口径：
//   · 阴盘奇门 pkg-paipan/yinpan     —— 硬编码 'chaibu'，页面副标题即写「阴盘遁甲 · 拆补定局」
//   · 山向奇门 lib/shanxiang-engine  —— 坐山配节气定局（另一套机制，不按日期）
//   · 传统时家奇门 pkg-paipan/qimen  —— 默认置闰，四法可切（不属本脉）
// 故穿壬默认 'chaibu'，与阴盘奇门一致；startMethod 仍可覆盖，但页面不提供切换。
//
// 竞品截图该日「阴遁9局」已查明不属本脉任何标准定局：2020-08-19 真节气立秋，
// 拆补=阴遁2局、茅山=阴遁8局、置闰=阴遁1局，且立秋[2,5,8] 三元皆到不了 9 局。
// 该读数不作为对齐目标。
// ─────────────────────────────────────────────

import { computeQimenForHour, determineJu, type QimenHourChart } from "@guoxue/shared/paipan"
import { computeLiuren, type LiurenResult, TIANJIANG_SHORT } from "@guoxue/shared/paipan"
import { GANS, ZHIS, type Zhi } from "@guoxue/shared/paipan"

// ── 无闰连续排局（竞品定局法）──
// 符头五日一元，沿 72 局年轮（24节气×3元，每元5日、全轮360日）连续推进，不置闰不拆补。
// 锚点：黄金基准 2020-08-19（甲午符头日）= 白露上元 阴遁9局 起点。
/** 天将展示名（合→六 龙→青 虎→白，与竞品一致） */
const JIANG_DISPLAY: Record<string, string> = {
  贵: "贵", 蛇: "蛇", 朱: "朱", 合: "六", 勾: "勾", 龙: "青",
  空: "空", 虎: "白", 常: "常", 玄: "玄", 阴: "阴", 后: "后",
}

/** 建除十二神 */
const JIANCHU = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"]

/** 十二宫（自命宫逆时针） */
const HOUSES = ["命", "兄", "妻", "子", "财", "疾", "移", "役", "禄", "田", "德", "母"]
const HOUSE_FULL: Record<string, string> = {
  命: "命宫", 兄: "兄弟", 妻: "夫妻", 子: "子女", 财: "财帛", 疾: "疾厄",
  移: "迁移", 役: "仆役", 禄: "官禄", 田: "田宅", 德: "福德", 母: "父母",
}

/** 生肖 → 年命支 */
export const SHENGXIAO = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"] as const
export type Shengxiao = (typeof SHENGXIAO)[number]

const zi = (i: number) => ZHIS[((i % 12) + 12) % 12]
const zIdx = (z: string) => ZHIS.indexOf(z as Zhi)
const gIdx = (g: string) => GANS.indexOf(g as never)

export interface ChuanrenOuterCell {
  zhi: Zhi
  /** 遁干（日柱顺遁六十甲子） */
  dunGan: string
  /** 天将（展示名：贵蛇朱六勾青空白常玄阴后） */
  jiang: string
  /** 建除神 */
  jianChu: string
  /** 十二宫（单字） */
  house: string
  houseFull: string
  /** 日旬空亡 */
  kong: boolean
  /** 马星 */
  ma: boolean
  /** 贵人所在 */
  gui: boolean
}

export interface ChuanrenInput {
  date: Date
  /** 用神：day=日柱 month=月柱 custom=自选 */
  yongshenType: "day" | "month" | "custom"
  customYongshen?: string
  /** 贵人：auto=按昼夜 yang=阳贵(昼) yin=阴贵(夜) */
  guiren: "auto" | "yang" | "yin"
  /** 定局法：默认拆补（王凤麟一脉，与阴盘奇门页一致）；不在本引擎另起炉灶 */
  startMethod?: "zhirun" | "chaibu" | "maoshan"
  /** 年命生肖（可选） */
  nianming?: Shengxiao
  topic?: string
}

export interface ChuanrenResult {
  qimen: QimenHourChart
  /** 定局口径（展示用）：局名 / 三元 / 定局法中文名 */
  juInfo: { label: string; yuan: string; method: string }
  liuren: LiurenResult
  /** 外圈十二格（按地支索引） */
  outer: Record<string, ChuanrenOuterCell>
  /** 用神标签（如 甲午） */
  yongshen: string
  /** 贵人标签（阳贵/阴贵） */
  guirenLabel: string
  /** 年命生肖 */
  nianming?: Shengxiao
  /** 白话总断 */
  verdicts: { title: string; text: string }[]
  /** AI 摘要 */
  summary: string
}

export function paiChuanren(input: ChuanrenInput): ChuanrenResult {
  const { date } = input

  // ── 六壬层（贵人昼夜：auto 按卯~申昼；阳贵=昼贵 阴贵=夜贵） ──
  const guishenType = input.guiren === "yang" ? "day" : input.guiren === "yin" ? "night" : "auto"
  const liuren = computeLiuren(date, { guishenType })

  // ── 奇门层（定局复用 shared 已验证三法，以时干支直排；本脉默认拆补） ──
  const startMethod = input.startMethod ?? "chaibu"
  const juInfo = determineJu(date, startMethod)
  const METHOD_CN = { chaibu: "拆补", maoshan: "茅山", zhirun: "置闰" } as const
  const qimen = computeQimenForHour(liuren.sizhu.hour.gan, liuren.sizhu.hour.zhi, juInfo.isYang, juInfo.num)

  const dayGan = liuren.sizhu.day.gan
  const dayZhi = liuren.sizhu.day.zhi

  // ── 用神 ──
  const yongshen =
    input.yongshenType === "month"
      ? `${liuren.sizhu.month.gan}${liuren.sizhu.month.zhi}`
      : input.yongshenType === "custom" && input.customYongshen
        ? input.customYongshen
        : `${dayGan}${dayZhi}`

  const guirenLabel = liuren.guiren.isDay ? "阳贵" : "阴贵"

  // ── 外圈十二支层 ──
  const dayGanI = gIdx(dayGan)
  const dayZhiI = zIdx(dayZhi)
  // 命宫 = 日支顺三位；自命宫逆时针布十二宫
  const mingAnchor = zIdx(zi(dayZhiI + 3))
  // 贵人天盘支落宫
  const guiZhi = liuren.guiren.zhi

  const outer: Record<string, ChuanrenOuterCell> = {}
  for (let k = 0; k < 12; k++) {
    const z = ZHIS[k]
    const stepFromDay = (k - dayZhiI + 12) % 12
    // 遁干：日柱顺遁（干支同步推进）
    const dunGan = GANS[(dayGanI + stepFromDay) % 10]
    // 天将：天盘支 z 所落地盘位之将
    const lin = ZHIS.find((g) => liuren.tianPan[g] === z) as Zhi
    const jiangShort = liuren.jiangPan[lin] || ""
    outer[z] = {
      zhi: z,
      dunGan,
      jiang: JIANG_DISPLAY[jiangShort] || jiangShort,
      jianChu: JIANCHU[stepFromDay],
      house: HOUSES[(mingAnchor - k + 12) % 12],
      houseFull: HOUSE_FULL[HOUSES[(mingAnchor - k + 12) % 12]],
      kong: liuren.kongwang.includes(z),
      ma: qimen.maXing === z,
      gui: z === guiZhi,
    }
  }

  // ── 白话总断 ──
  const verdicts: { title: string; text: string }[] = []
  const sc = liuren.sanchuan
  verdicts.push({
    title: "格局大势",
    text: `${qimen.ju.label}，值符${qimen.zhifu.star}落${qimen.zhifu.palace}宫、值使${qimen.zhishi.men}落${qimen.zhishi.palace}宫。六壬得${liuren.keti.join("、")}课，三传${sc[0].zhi}${sc[1].zhi}${sc[2].zhi}（${sc[0].qin}→${sc[1].qin}→${sc[2].qin}）。奇门看天时地利，六壬看人事进退，两盘互参吉凶更为立体。`,
  })
  const chuKong = sc[0].kong
  verdicts.push({
    title: "三传事理",
    text: `初传${sc[0].zhi}（${sc[0].qin}${sc[0].jiang ? "·" + (JIANG_DISPLAY[sc[0].jiang] || sc[0].jiang) + "将" : ""}${chuKong ? "·旬空" : ""}）为事之发端${chuKong ? "，落空亡示开局虚浮、动而少实" : ""}；中传${sc[1].zhi}（${sc[1].qin}）为事之过程；末传${sc[2].zhi}（${sc[2].qin}）为事之归宿。${sc[2].kong ? "末传空亡，结局易落空，宜早收手。" : "末传不空，事有着落。"}`,
  })
  const yjCell = outer[dayZhi]
  verdicts.push({
    title: "用神落宫",
    text: `用神${yongshen}，日支${dayZhi}位临${yjCell.jiang}将、${yjCell.jianChu}神、${yjCell.houseFull}。月将${liuren.yuejiang.zhi}（${liuren.yuejiang.name}）加${liuren.sizhu.hour.zhi}时，${guirenLabel}临${guiZhi}。贵人所临之方利谒贵求助。`,
  })
  const menPoCount = Object.values(qimen.palaces).filter((p) => p.menPo).length
  const muXingCount = Object.values(qimen.palaces).reduce((n, p) => n + p.ruMu.length + p.jiXing.length, 0)
  verdicts.push({
    title: "刑墓迫提示",
    text: `盘中${menPoCount > 0 ? `${menPoCount}宫门迫（红字），所主之事多阻力、欲速不达` : "无门迫"}；${muXingCount > 0 ? `共${muXingCount}处入墓/击刑（黄紫字），相关人事易受困受制，宜静不宜动` : "干支无入墓击刑，行事通达"}。空亡${qimen.xunshou.kong}之宫（◎）主虚、主变，谋事避之。`,
  })

  const summary = [
    `奇门穿壬：${liuren.sizhu.year.gan}${liuren.sizhu.year.zhi}年 ${liuren.sizhu.month.gan}${liuren.sizhu.month.zhi}月 ${dayGan}${dayZhi}日 ${liuren.sizhu.hour.gan}${liuren.sizhu.hour.zhi}时`,
    `${qimen.ju.label}，值符${qimen.zhifu.star}，值使${qimen.zhishi.men}，旬首${qimen.xunshou.name}，空亡${qimen.xunshou.kong}，马星${qimen.maXing}`,
    `月将${liuren.yuejiang.zhi}，${guirenLabel}临${guiZhi}，用神${yongshen}${input.nianming ? `，年命${input.nianming}` : ""}`,
    `四课：${liuren.sike.map((k) => `${k.shang}/${k.xia}`).join(" ")}`,
    `三传：${sc.map((c) => `${c.zhi}(${c.qin}${c.kong ? "空" : ""})`).join(" → ")}，课体${liuren.keti.join("、")}`,
    input.topic ? `所占事项：${input.topic}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  return {
    qimen,
    juInfo: { label: juInfo.label, yuan: juInfo.yuan, method: METHOD_CN[startMethod] },
    liuren, outer, yongshen, guirenLabel, nianming: input.nianming, verdicts, summary,
  }
}

/** 外圈布局（与竞品一致）：顶行 卯辰巳 → 右列 午未申 → 底行(右→左) 酉戌亥 → 左列(下→上) 子丑寅 */
export const OUTER_LAYOUT = {
  top: ["卯", "辰", "巳"] as Zhi[],
  right: ["午", "未", "申"] as Zhi[],
  bottom: ["亥", "戌", "酉"] as Zhi[],
  left: ["寅", "丑", "子"] as Zhi[],
}

export { TIANJIANG_SHORT }
