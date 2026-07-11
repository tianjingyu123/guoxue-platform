<script setup lang="ts">
/**
 * 阴盘奇门·完整盘面（外圈十二地支 + 九宫格），阴盘/命理两结果页共用。
 * 布局：上圈（巳午未）→ 中段（左圈辰卯寅 | 3×3 九宫 | 右圈申酉戌）→ 下圈（丑子亥），洛书方位。
 * 每宫三行：八神｜空亡圈 / 天盘干｜九星 / 地盘干｜八门；值符值使朱红加粗，门迫红、入墓/击刑/刑墓状态色。
 * 【X5 红线】不用 writing-mode / aspect-ratio，侧圈竖排标签用逐字 flex-column 堆叠，九宫用固定高度 grid。
 */
import { computed } from 'vue'
import {
  GRID_PALACES,
  PALACE_NAMES,
  PALACE_DIZHI,
  RING_PALACES,
} from '@/pkg-paipan/lib/qimen-engine'
import {
  type PalaceData,
  type OuterRingItem,
  BASHEN_SHORT,
  JIUXING_SHORT,
  BAMEN_SHORT,
  ganColorCls,
} from './yinpan-core'

const props = withDefaults(defineProps<{
  palaces: Record<number, PalaceData>
  showChangsheng?: boolean
  /** 空亡地支（如「戌亥」） */
  kongZhi?: string
  /** 马星地支 */
  maZhi?: string
  /** 外圈十二位（天门地户/神将），null 时只显示寄干 */
  outerRing?: OuterRingItem[] | null
  /** 高亮宫位（用神定位/运年联动） */
  highlight?: number[]
  /** 可点击（点宫位 emit palace） */
  interactive?: boolean
}>(), {
  showChangsheng: false,
  kongZhi: '',
  maZhi: '',
  outerRing: null,
  highlight: () => [],
  interactive: true,
})

const emit = defineEmits<{ (e: 'palace', p: number): void }>()

const EMPTY: PalaceData = {
  bashen: '', jiuxing: '', bamen: '', tianGan: '', diGan: '',
  changsheng: { shen: '', tian: '', di: '' },
  isZhifu: false, isZhishi: false, ruMu: [], jiXing: [], xingMu: [], menPo: false,
}

// ─── 宫位格视图模型 ───
interface CellVM {
  p: number
  isCenter: boolean
  label: string
  bashen: string
  isZhifu: boolean
  kong: boolean
  tianGan: string
  tianGan2: string
  tgCls: string
  tg2Cls: string
  star: string
  diGan: string
  diGan2: string
  dgCls: string
  dg2Cls: string
  men: string
  isZhishi: boolean
  menPo: boolean
  hl: boolean
  cs: { shen: string; tian: string; di: string }
}

const cells = computed<CellVM[]>(() =>
  GRID_PALACES.map((p) => {
    const d = props.palaces[p] || EMPTY
    return {
      p,
      isCenter: p === 5,
      label: PALACE_NAMES[p] || '',
      bashen: d.isZhifu ? '符' : (BASHEN_SHORT[d.bashen] || d.bashen),
      isZhifu: d.isZhifu,
      kong: (PALACE_DIZHI[p] || []).some((z) => (props.kongZhi || '').includes(z)),
      tianGan: d.tianGan,
      tianGan2: d.tianGan2 || '',
      tgCls: ganColorCls(d.tianGan, d),
      tg2Cls: d.tianGan2 ? ganColorCls(d.tianGan2, d) : '',
      star: JIUXING_SHORT[d.jiuxing] || d.jiuxing,
      diGan: d.diGan,
      diGan2: d.diGan2 && d.diGan2 !== d.diGan ? d.diGan2 : '',
      dgCls: ganColorCls(d.diGan, d),
      dg2Cls: d.diGan2 ? ganColorCls(d.diGan2, d) : '',
      men: BAMEN_SHORT[d.bamen] || d.bamen,
      isZhishi: d.isZhishi,
      menPo: d.menPo,
      hl: (props.highlight || []).includes(p),
      cs: d.changsheng,
    }
  }),
)

// ─── 外圈标签（宫位地支位置：神将标签 + 寄干）───
interface OuterVM {
  zhi: string
  label: string
  jianchu: string
  gan: string
  chars: string[]
}

/** 外圈寄干：双地支宫一支显示天盘干、一支显示地盘干；单支宫显示天盘干 */
const sideGan = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  for (const p of RING_PALACES) {
    const zhis = PALACE_DIZHI[p] || []
    const d = props.palaces[p]
    if (!d) continue
    for (const z of zhis) {
      out[z] = zhis.length === 2 ? (zhis.indexOf(z) === 0 ? d.tianGan : d.diGan) : d.tianGan
    }
  }
  return out
})

function outerVM(zhi: string): OuterVM {
  const item = (props.outerRing || []).find((r) => r.zhi === zhi)
  const label = item?.label || ''
  return {
    zhi,
    label,
    jianchu: item?.jianchu || '',
    gan: sideGan.value[zhi] || '',
    chars: label ? label.split('') : [],
  }
}

const TOP_ZHI = ['巳', '午', '未']
const LEFT_ZHI = ['辰', '卯', '寅']
const RIGHT_ZHI = ['申', '酉', '戌']
const BOTTOM_ZHI = ['丑', '子', '亥']

const topRing = computed(() => TOP_ZHI.map(outerVM))
const leftRing = computed(() => LEFT_ZHI.map(outerVM))
const rightRing = computed(() => RIGHT_ZHI.map(outerVM))
const bottomRing = computed(() => BOTTOM_ZHI.map(outerVM))

/** 马星角标（马星只落四隅：巳=左上、申=右上、亥=右下、寅=左下） */
const maCorner = computed(() => {
  const map: Record<string, string> = { 巳: 'ma-tl', 申: 'ma-tr', 亥: 'ma-br', 寅: 'ma-bl' }
  return map[props.maZhi || ''] || ''
})

function onCell(p: number) {
  if (!props.interactive || p === 5) return
  emit('palace', p)
}
</script>

<template>
  <view class="board">
    <!-- 上圈: 巳午未 -->
    <view class="ring-h ring-top">
      <view class="ring-h-spacer" />
      <view v-for="o in topRing" :key="o.zhi" class="ring-h-cell">
        <text v-if="o.label" class="ring-label">{{ o.label }}<text v-if="o.jianchu" class="ring-jianchu">{{ o.jianchu }}</text></text>
        <text class="ring-gan">{{ o.gan }}</text>
      </view>
      <view class="ring-h-spacer" />
    </view>

    <!-- 中段: 左圈 | 九宫 | 右圈 -->
    <view class="board-mid">
      <view class="ring-v">
        <view v-for="o in leftRing" :key="o.zhi" class="ring-v-cell">
          <view v-if="o.chars.length" class="ring-v-label">
            <text v-for="(c, ci) in o.chars" :key="ci" class="ring-v-char">{{ c }}</text>
            <text v-if="o.jianchu" class="ring-v-char ring-jianchu">{{ o.jianchu }}</text>
          </view>
          <text class="ring-gan">{{ o.gan }}</text>
        </view>
      </view>

      <view class="grid-wrap">
        <view v-if="maCorner" class="ma-mark" :class="maCorner"><text class="ma-mark-t">马</text></view>
        <view class="grid9" :class="{ 'grid9-cs': showChangsheng }">
          <view
            v-for="c in cells"
            :key="c.p"
            class="cell"
            :class="{ 'cell-center': c.isCenter, 'cell-hl': c.hl, 'cell-cs': showChangsheng }"
            @tap="onCell(c.p)"
          >
            <template v-if="!c.isCenter">
              <!-- 行1: 八神 ｜ 空亡圈 -->
              <view class="cell-row">
                <text class="cell-shen" :class="{ 'cell-zhifu': c.isZhifu }">{{ c.bashen }}</text>
                <view v-if="c.kong" class="kong-circle" />
              </view>
              <text v-if="showChangsheng && c.cs.shen" class="cell-cs-t">{{ c.cs.shen }}</text>
              <!-- 行2: 天盘干 ｜ 九星 -->
              <view class="cell-row">
                <view class="cell-gans">
                  <text class="cell-gan" :class="c.tgCls">{{ c.tianGan }}</text>
                  <text v-if="c.tianGan2" class="cell-gan" :class="c.tg2Cls">{{ c.tianGan2 }}</text>
                </view>
                <text class="cell-star">{{ c.star }}</text>
              </view>
              <text v-if="showChangsheng && c.cs.tian" class="cell-cs-t">{{ c.cs.tian }}</text>
              <!-- 行3: 地盘干（坤2带中宫寄干）｜ 八门 -->
              <view class="cell-row">
                <view class="cell-gans">
                  <text class="cell-gan" :class="c.dgCls">{{ c.diGan }}</text>
                  <text v-if="c.diGan2" class="cell-gan" :class="c.dg2Cls">{{ c.diGan2 }}</text>
                </view>
                <text class="cell-men" :class="{ 'cell-zhishi': c.isZhishi, 'cell-menpo': !c.isZhishi && c.menPo }">{{ c.men }}</text>
              </view>
              <text v-if="showChangsheng && c.cs.di" class="cell-cs-t">{{ c.cs.di }}</text>
            </template>
          </view>
        </view>
      </view>

      <view class="ring-v">
        <view v-for="o in rightRing" :key="o.zhi" class="ring-v-cell">
          <view v-if="o.chars.length" class="ring-v-label">
            <text v-for="(c, ci) in o.chars" :key="ci" class="ring-v-char">{{ c }}</text>
            <text v-if="o.jianchu" class="ring-v-char ring-jianchu">{{ o.jianchu }}</text>
          </view>
          <text class="ring-gan">{{ o.gan }}</text>
        </view>
      </view>
    </view>

    <!-- 下圈: 丑子亥（洛书北方） -->
    <view class="ring-h ring-bottom">
      <view class="ring-h-spacer" />
      <view v-for="o in bottomRing" :key="o.zhi" class="ring-h-cell">
        <text v-if="o.label" class="ring-label">{{ o.label }}<text v-if="o.jianchu" class="ring-jianchu">{{ o.jianchu }}</text></text>
        <text class="ring-gan">{{ o.gan }}</text>
      </view>
      <view class="ring-h-spacer" />
    </view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.board { padding: 0 24rpx; }

/* ── 上/下圈（横排标签 + 寄干）── */
.ring-h { display: flex; align-items: flex-end; min-height: 44rpx; }
.ring-bottom { align-items: flex-start; padding-top: 6rpx; }
.ring-top { padding-bottom: 6rpx; }
.ring-h-spacer { width: 72rpx; flex-shrink: 0; }
.ring-h-cell { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6rpx; min-width: 0; }
.ring-label { font-size: 20rpx; color: var(--text-soft); letter-spacing: -1rpx; white-space: nowrap; }
.ring-jianchu { font-size: 20rpx; color: #dc2626; }
.ring-gan { font-family: $serif; font-size: 24rpx; font-weight: 500; color: var(--text-ink); }

/* ── 中段 ── */
.board-mid { display: flex; align-items: stretch; }
.ring-v { width: 72rpx; flex-shrink: 0; display: flex; flex-direction: column; justify-content: space-around; align-items: center; }
.ring-v-cell { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.ring-v-label { display: flex; flex-direction: column; align-items: center; }
.ring-v-char { font-size: 20rpx; line-height: 1.15; color: var(--text-soft); }

/* ── 九宫 ── */
.grid-wrap { flex: 1; position: relative; min-width: 0; }
.ma-mark { position: absolute; z-index: 2; }
.ma-mark-t { font-size: 24rpx; font-weight: 700; color: #dc2626; line-height: 1; }
.ma-tl { top: -34rpx; left: 2rpx; }
.ma-tr { top: -34rpx; right: 2rpx; }
.ma-br { bottom: -34rpx; right: 2rpx; }
.ma-bl { bottom: -34rpx; left: 2rpx; }

.grid9 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 2rpx solid rgba(60, 50, 40, 0.4);
  background: var(--card);
}
.cell {
  height: 216rpx;
  box-sizing: border-box;
  border-right: 2rpx solid rgba(60, 50, 40, 0.4);
  border-bottom: 2rpx solid rgba(60, 50, 40, 0.4);
  padding: 10rpx 14rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: var(--card);
  &:nth-child(3n) { border-right: none; }
  &:nth-child(n + 7) { border-bottom: none; }
  &:active { background: rgba(0, 0, 0, 0.03); }
}
/* 长生状态展开时加高容纳小字行 */
.cell-cs { height: 288rpx; }
.cell-center { background: var(--card); }
.cell-center:active { background: var(--card); }
.cell-hl { background: rgba(196, 30, 58, 0.08); box-shadow: inset 0 0 0 4rpx rgba(196, 30, 58, 0.5); }

.cell-row { display: flex; align-items: center; justify-content: space-between; }
.cell-shen { font-family: $serif; font-size: 34rpx; font-weight: 500; color: var(--text-ink); line-height: 1; }
.cell-zhifu { color: var(--brand); font-weight: 700; }
.kong-circle { width: 32rpx; height: 32rpx; border-radius: 999rpx; border: 3rpx solid rgba(60, 50, 40, 0.55); box-sizing: border-box; flex-shrink: 0; }
.cell-gans { display: flex; align-items: center; }
.cell-gan { font-family: $serif; font-size: 34rpx; font-weight: 600; color: var(--text-ink); line-height: 1; }
.cell-star { font-family: $serif; font-size: 34rpx; color: var(--text-ink); line-height: 1; }
.cell-men { font-family: $serif; font-size: 34rpx; font-weight: 500; color: var(--text-ink); line-height: 1; }
.cell-zhishi { color: var(--brand); font-weight: 700; }
.cell-menpo { color: #dc2626; }
.cell-cs-t { font-size: 18rpx; color: var(--text-soft); line-height: 1; }

/* 干字状态色（入墓/击刑/刑+墓） */
.g-rm { color: #d97706; }
.g-jx { color: #9333ea; }
.g-xm { color: #0284c7; }
</style>
