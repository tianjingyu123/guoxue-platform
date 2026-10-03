import * as fs from 'node:fs'
import * as path from 'node:path'
import { calcMingGong, calcShenGong } from '../shensha'
import type { Gan, Zhi } from '../types'

// 本包未开 resolveJsonModule，故运行时读取（改 tsconfig 会牵动构建产物，不值当）
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/minggong-shengong-144.json'), 'utf8'),
)

/**
 * 命宫 / 身宫回归（2026-09-19，接续文档 §2.85）
 *
 * ══ 基准来源 ══
 *
 * 旧版 App `cn.net.rebu.bazi` v1.0.2(3) 实机逐盘排出的 **12×12 全矩阵**，
 * 由 desktop-44 采集：固定 2000 年·男·真太阳时关，只变月支与时辰；
 * 月支取月中且远离节气交界 ≥10 天，时辰取各时辰中点；
 * uiautomator 读结果页文本，**非截图识别**，无 OCR 误差。
 *
 * 决策人口径：「以前我们都是按照旧版这样排的」——跟旧版。
 *
 * 坚持要全 144 格而不是几个抽样点，是因为**两个点能反推出无数条规则**。
 * 全矩阵的价值在于：推出规则后可以逐格回验，任何一格对不上就说明规则不对。
 *
 * ══ 推出的规则（子＝0 编号）══
 *
 *   命宫支 ≡ 5 − 月支序 − 时支序 (mod 12)   卯上起正月**逆**数至生月，再自该宫起子时**逆**数至生时
 *   身宫支 ≡ 1 + 月支序 + 时支序 (mod 12)   同起点，月与时皆**顺**数
 *   宫干   = 五虎遁(**年柱**天干) 配到宫支
 *
 * ══ 修之前 ══
 *
 * 原实现两式的**方向恰好被对调**，且都缺常数项：
 * 命宫写成 `(月支序 + 时支序) % 12`、注释却写「顺数」；
 * 身宫写成 `(月支序 − 时支序) % 12`、注释写「逆数」。
 * 寅月子时原本算出「寅」，实测是「卯」。
 *
 * ══ 关于那条不变量 ══
 *
 * 采样方报来「命宫支序 + 身宫支序 ≡ 6 (mod 12)，144/144 成立」。
 * 这是上面两式相加的**代数推论**，不构成独立证据——
 * 一条由结论推出的性质，无法反过来验证结论。真正的判据是逐格比对。
 * 本文件仍测它，但只作为「两式未被各自改坏」的护栏。
 *
 * ══ 月支 vs 农历月：已定案，取月柱地支 ══
 *
 * 144 格矩阵为避开节气交界全取月中，代价是**农历月与节气月格格重合**（0 格不一致），
 * 因此那批数据判不出规则取的是月柱地支还是农历月。
 * 2026-09-19 补采 4 格判别样本实测：**月支 4/4，两种农历月口径各 1/4**。
 * 四柱亦与 `lunar-javascript` 预计算逐字一致，两边历法口径无分歧。
 *
 * 其中 ①② 为非闰月，「归本月」与「归下月」同解且双双落空——
 * **农历月方案在这两格就已出局**。
 * ③④ 的作用并非分辨两种闰月口径（彼时已无对手），而是证明
 * **闰月不扰动月支规则**，排除「平时取月支、闰月另作特殊处理」这种可能。
 * 结论：旧版命宫/身宫根本不经过农历月这一步，**闰月对二者不产生影响**。
 */

interface Sample {
  input: string
  yueZhi: string
  shiZhi: string
  siZhu: string
  mingGong: string
  shenGong: string
  taiYuan: string
}
const SAMPLES = (fixture as { samples: Sample[]; count: number }).samples
const ZHI_ORDER = '子丑寅卯辰巳午未申酉戌亥'

/** 年柱天干取自旧版给出的四柱首位——立春为界，非公历年 */
const nianGanOf = (s: Sample) => s.siZhu.split(' ')[0][0] as Gan
/** 日干只影响十神字段，本测试不断言十神，取个合法值即可 */
const RI_GAN: Gan = '甲'

describe('命宫/身宫：旧版 12×12 全矩阵逐格回验', () => {
  it('fixture 完整，144 格一格不少', () => {
    expect(`格数=${SAMPLES.length}`).toBe('格数=144')
    const cells = new Set(SAMPLES.map((s) => `${s.yueZhi}-${s.shiZhi}`))
    expect(`去重后=${cells.size}`).toBe('去重后=144')
  })

  it.each(SAMPLES.map((s) => [`${s.yueZhi}月${s.shiZhi}时`, s] as const))(
    '%s 命宫全柱（含天干）与旧版一致',
    (_label, s) => {
      const got = calcMingGong(s.yueZhi as Zhi, s.shiZhi as Zhi, nianGanOf(s), RI_GAN)
      expect(`${s.input} 命宫=${got.gan}${got.zhi}`).toBe(`${s.input} 命宫=${s.mingGong}`)
    },
  )

  it.each(SAMPLES.map((s) => [`${s.yueZhi}月${s.shiZhi}时`, s] as const))(
    '%s 身宫全柱（含天干）与旧版一致',
    (_label, s) => {
      const got = calcShenGong(s.yueZhi as Zhi, s.shiZhi as Zhi, nianGanOf(s), RI_GAN)
      expect(`${s.input} 身宫=${got.gan}${got.zhi}`).toBe(`${s.input} 身宫=${s.shenGong}`)
    },
  )
})

describe('命宫/身宫：方向与起点', () => {
  it('寅月子时为卯——修之前算出「寅」的那一格', () => {
    expect(calcMingGong('寅', '子', '庚', RI_GAN).zhi).toBe('卯')
    expect(calcShenGong('寅', '子', '庚', RI_GAN).zhi).toBe('卯')
  })

  it('命宫地支随时辰逆行，身宫顺行（固定月支扫十二时辰）', () => {
    const ming = ZHI_ORDER.split('').map((h) => ZHI_ORDER.indexOf(calcMingGong('午', h as Zhi, '庚', RI_GAN).zhi))
    const shen = ZHI_ORDER.split('').map((h) => ZHI_ORDER.indexOf(calcShenGong('午', h as Zhi, '庚', RI_GAN).zhi))
    for (let i = 1; i < 12; i++) {
      expect(`命·步${i}=${(ming[i - 1] - ming[i] + 12) % 12}`).toBe(`命·步${i}=1`)
      expect(`身·步${i}=${(shen[i] - shen[i - 1] + 12) % 12}`).toBe(`身·步${i}=1`)
    }
  })

  it('相邻月支整行错开一位', () => {
    for (let m = 0; m < 12; m++) {
      const a = calcMingGong(ZHI_ORDER[m] as Zhi, '子', '庚', RI_GAN).zhi
      const b = calcMingGong(ZHI_ORDER[(m + 1) % 12] as Zhi, '子', '庚', RI_GAN).zhi
      expect(`${ZHI_ORDER[m]}→${ZHI_ORDER[(m + 1) % 12]} 差=${(ZHI_ORDER.indexOf(a) - ZHI_ORDER.indexOf(b) + 12) % 12}`)
        .toBe(`${ZHI_ORDER[m]}→${ZHI_ORDER[(m + 1) % 12]} 差=1`)
    }
  })
})

describe('命宫/身宫：宫干取年柱而非公历年', () => {
  /**
   * 144 格里只有丑月那一行落在立春之前，年柱是**己卯**而非庚辰，
   * 宫干整行随之改用己年的五虎遁（丙寅起）。
   * 这一行是全矩阵中唯一能区分「年柱天干」与「公历年干」的证据。
   */
  it('丑月行的年柱确为己卯，其余十一行为庚辰', () => {
    const byYue = new Map<string, Set<string>>()
    for (const s of SAMPLES) {
      const set = byYue.get(s.yueZhi) ?? new Set()
      set.add(s.siZhu.split(' ')[0])
      byYue.set(s.yueZhi, set)
    }
    expect(`丑月=${[...(byYue.get('丑') ?? [])].join(',')}`).toBe('丑月=己卯')
    for (const z of '寅卯辰巳午未申酉戌亥子') {
      expect(`${z}月=${[...(byYue.get(z) ?? [])].join(',')}`).toBe(`${z}月=庚辰`)
    }
  })

  it('同一宫支在两种年柱下得到不同宫干（若误用公历年干则此项必挂）', () => {
    // 丑月子时命宫支为辰：己卯年得戊辰，庚辰年得庚辰
    expect(calcMingGong('丑', '子', '己', RI_GAN).gan + calcMingGong('丑', '子', '己', RI_GAN).zhi).toBe('戊辰')
    const asGengYear = calcMingGong('丑', '子', '庚', RI_GAN)
    expect(`庚年同支=${asGengYear.gan}${asGengYear.zhi}`).toBe('庚年同支=庚辰')
  })
})

describe('命宫/身宫：护栏（非独立证据）', () => {
  /**
   * 「命宫支序 + 身宫支序 ≡ 6 (mod 12)」是两式相加的代数推论。
   * 它证明不了规则对，只能保证将来有人改动其中一式时不会静默破坏另一式的配对关系。
   */
  it('命宫支序 + 身宫支序 ≡ 6 (mod 12)，全 144 组合成立', () => {
    for (const m of ZHI_ORDER) {
      for (const h of ZHI_ORDER) {
        const a = ZHI_ORDER.indexOf(calcMingGong(m as Zhi, h as Zhi, '庚', RI_GAN).zhi)
        const b = ZHI_ORDER.indexOf(calcShenGong(m as Zhi, h as Zhi, '庚', RI_GAN).zhi)
        expect(`${m}${h}:${(a + b) % 12}`).toBe(`${m}${h}:6`)
      }
    }
  })

  it('命宫与身宫同支的样本确实存在，不是噪声', () => {
    // (5−m−h) ≡ (1+m+h) ⇔ 2(m+h) ≡ 4 ⇔ m+h ≡ 2 或 8 (mod 12)
    const same = SAMPLES.filter((s) => s.mingGong === s.shenGong)
    expect(same.length).toBeGreaterThan(0)
    for (const s of same) {
      const sum = (ZHI_ORDER.indexOf(s.yueZhi) + ZHI_ORDER.indexOf(s.shiZhi)) % 12
      expect(`${s.yueZhi}${s.shiZhi} 和=${sum}`).toMatch(/和=(2|8)$/)
    }
  })
})

/**
 * ══ 判别样本：规则取月柱地支，不经农历月 ══
 *
 * 这 4 格是 144 格矩阵之外专门补采的，因为那批全取月中、农历月与节气月重合，判不出来。
 * 实测结果：月支 4/4，农历月（归本月）1/4，农历月（归下月）1/4。
 *
 * 它们是**唯一能证伪农历月方案的样本**，故单独成组钉死：
 * 将来若有人把实现改回按农历月推算，144 格矩阵**全部照样通过**，只有这 4 格会红。
 */
const DISCRIMINATING = (fixture as {
  discriminating: { samples: (Sample & { label: string; date: string })[] }
}).discriminating.samples

describe('命宫/身宫：取月柱地支而非农历月（判别样本）', () => {
  it('4 格判别样本齐备', () => {
    expect(`格数=${DISCRIMINATING.length}`).toBe('格数=4')
  })

  it.each(DISCRIMINATING.map((s) => [`${s.label} ${s.input}`, s] as const))(
    '%s 命宫与旧版一致',
    (_l, s) => {
      const got = calcMingGong(s.yueZhi as Zhi, s.shiZhi as Zhi, nianGanOf(s), RI_GAN)
      expect(`${s.date} 命宫=${got.gan}${got.zhi}`).toBe(`${s.date} 命宫=${s.mingGong}`)
    },
  )

  it.each(DISCRIMINATING.map((s) => [`${s.label} ${s.input}`, s] as const))(
    '%s 身宫与旧版一致',
    (_l, s) => {
      const got = calcShenGong(s.yueZhi as Zhi, s.shiZhi as Zhi, nianGanOf(s), RI_GAN)
      expect(`${s.date} 身宫=${got.gan}${got.zhi}`).toBe(`${s.date} 身宫=${s.shenGong}`)
    },
  )

  it('若改按农历月推算，这 4 格至少三格会红（反向确认判别力）', () => {
    // 农历月→支：正月=寅。此处直接构造「按农历月」的输入，验证它确实给出不同答案
    const byLunar: Record<string, string> = {
      '2000-07-02 12:30': '未', // 农历六月 → 未
      '2000-10-27 12:30': '亥', // 农历十月 → 亥
      '2001-06-15 12:30': '巳', // 农历闰四月（归本月）→ 巳
    }
    for (const s of DISCRIMINATING) {
      const alt = byLunar[s.input]
      if (!alt) continue // ③ 闰四月初一：农历归本月与月支同解，不具判别力
      const wrong = calcMingGong(alt as Zhi, s.shiZhi as Zhi, nianGanOf(s), RI_GAN)
      expect(`${s.input} 农历月解=${wrong.gan}${wrong.zhi}`).not.toBe(`${s.input} 农历月解=${s.mingGong}`)
    }
  })

  it('闰月不扰动结果：闰四月两格均由月柱地支直接决定', () => {
    // ③ 闰四月初一，月柱支巳；④ 闰四月廿四，月柱支午——同一个农历月，月支已换
    const a = DISCRIMINATING.find((s) => s.input.startsWith('2001-05-23'))!
    const b = DISCRIMINATING.find((s) => s.input.startsWith('2001-06-15'))!
    expect(`${a.yueZhi}/${b.yueZhi}`).toBe('巳/午')
    expect(calcMingGong(a.yueZhi as Zhi, a.shiZhi as Zhi, nianGanOf(a), RI_GAN).zhi)
      .not.toBe(calcMingGong(b.yueZhi as Zhi, b.shiZhi as Zhi, nianGanOf(b), RI_GAN).zhi)
  })
})
