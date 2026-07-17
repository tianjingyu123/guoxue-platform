/**
 * 奇门遁甲·本地引擎适配层（2026-07-14 去伪存真）
 *
 * 背景：奇门此前走后端 POST /paipan/qimen，而后端 qimen.calculator.ts **只实现了转盘法**，
 * 于是 paipan.service.ts 把 panMethod="fei"（飞盘）委托给了 calculateQimenYin（阴盘奇门引擎）——
 * 「飞盘/转盘」是同一套时家奇门的两种布盘法，「阴盘」是王凤麟另一个流派（以月柱推局），
 * 起局法根本不同。用户在奇门页选「飞盘」，拿到的其实是阴盘，属于流派错配。
 *
 * 前端 pkg-paipan/lib/qimen-engine.ts 转盘/飞盘俱全，且经竞品黄金测试逐值验证
 * （scripts/verify-qimen.ts，84/84）。故奇门收敛为「前端引擎为唯一真源」，本地重算，
 * 与其余 20 余个排盘工具的做法一致。
 *
 * 本文件负责把引擎的 QimenResult 结构适配为页面既有的展示结构（lib/qimen-data.ts 的 QimenResult），
 * 保持渲染层不动。节气区间由 lib/paipan/jieqi.ts 补齐（后端原先在 meta 里提供）。
 */
import { computeQimen, PALACE_NAMES, type QimenOptions, type QimenPalace } from './qimen-engine'
import { getJieqiRange } from '@/lib/paipan/jieqi'
import { trueSolarTime } from '@/lib/paipan/ganzhi'
import type { QimenGong, QimenInput, QimenResult, QimenMeta } from '@/lib/qimen-data'

/** 九宫对应八卦（页面展示用） */
const PALACE_BAGUA: Record<number, string> = {
  1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** 把引擎宫位转成页面展示结构 */
function toGong(p: QimenPalace): QimenGong {
  // 天盘干可能双干（值符宫），地盘干同理；引擎用 tianGan2 承载第二个
  const tianPan = p.tianGan2 ? `${p.tianGan}${p.tianGan2}` : p.tianGan
  const star = p.star2 ? `${p.star}${p.star2}` : p.star
  return {
    index: p.palace,
    name: PALACE_NAMES[p.palace] ?? '',
    bagua: PALACE_BAGUA[p.palace] ?? '',
    diPan: p.diGan,
    tianPan,
    star,
    men: p.men,
    shen: p.shen,
    isRuMu: p.ruMu.length > 0,
    isJiXing: p.jiXing.length > 0,
    isMenPo: p.menPo,
    kongWang: p.kongWang,
    maXing: p.maXing,
    anGan: p.anGan || undefined,
    dipanShen: p.diShen || undefined,
    // 飞盘的「飞干」在页面上占 yinGan 位（左侧大字），转盘为空
    yinGan: p.feiGan || undefined,
    changsheng: { tian: p.csTian, di: p.csDi, an: '' },
  }
}

/**
 * 本地排盘：入参沿用页面既有的 QimenInput，返回页面既有的 QimenResult。
 * 与后端 /paipan/qimen 的差别：飞盘走真正的飞盘布局（而非阴盘引擎）。
 */
export function computeQimenLocal(input: QimenInput): QimenResult {
  // 逐字段构造 Date，规避各端字符串解析差异
  const clock = new Date(input.year, input.month - 1, input.day, input.hour, input.minute ?? 0)

  // 真太阳时修正（与阴盘 yinpan/result.vue、八字/紫微引擎同一真源 shared/paipan/ganzhi.trueSolarTime）：
  // 修正量 = 经度差 4*(lng-120) 分钟 + 均时差。修正后的时刻用于起局与节气区间，
  // 并落 meta.trueSolar 供结果页「真太阳时」行展示。此前 useTrueSolar/lng 传进来从不消费，开关是假的。
  let date = clock
  let trueSolarMeta: QimenMeta['trueSolar']
  if (input.useTrueSolar && typeof input.lng === 'number' && Number.isFinite(input.lng)) {
    date = trueSolarTime(clock, input.lng)
    trueSolarMeta = {
      hour: date.getHours(),
      minute: date.getMinutes(),
      offsetMin: Math.round((date.getTime() - clock.getTime()) / 60000),
    }
  }

  const options: QimenOptions = {
    panMethod: input.panMethod === 'fei' ? 'fei' : 'zhuan',
    startMethod: input.startMethod,
    customJu: input.customJu,
    anganMethod: input.anganMethod,
  }
  const r = computeQimen(date, options)

  const gongs: QimenGong[] = Object.values(r.palaces)
    .map(toGong)
    .sort((a, b) => a.index - b.index)

  const jq = getJieqiRange(date)
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`

  const meta: QimenMeta = {
    siZhu: {
      nian: { gan: r.sizhu.year.gan, zhi: r.sizhu.year.zhi },
      yue: { gan: r.sizhu.month.gan, zhi: r.sizhu.month.zhi },
      ri: { gan: r.sizhu.day.gan, zhi: r.sizhu.day.zhi },
      shi: { gan: r.sizhu.hour.gan, zhi: r.sizhu.hour.zhi },
    },
    kongWang: {
      nian: r.kongwang[0]?.label ?? '',
      yue: r.kongwang[1]?.label ?? '',
      ri: r.kongwang[2]?.label ?? '',
      shi: r.kongwang[3]?.label ?? '',
    },
    maXingZhi: r.maXing,
    jieQi: {
      name: jq.prev.name,
      start: fmt(jq.prev.date),
      nextName: jq.next.name,
      end: fmt(jq.next.date),
    },
    trueSolar: trueSolarMeta,
  }

  return {
    juNumber: r.ju.num,
    dunType: r.ju.isYang ? 'yang' : 'yin',
    jieQi: jq.prev.name,
    yongShi: `${r.sizhu.hour.gan}${r.sizhu.hour.zhi}时`,
    zhiFu: r.zhifu.star,
    zhiShiMen: r.zhishi.men,
    gongs,
    // 地盘八神：飞盘由引擎给出（diShen），转盘不排地盘八神
    dipanBashen: gongs.map((g) => g.dipanShen ?? ''),
    meta,
  }
}
