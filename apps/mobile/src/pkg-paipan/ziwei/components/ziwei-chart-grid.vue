<script setup lang="ts">
/**
 * 紫微斗数十二宫盘（自 V0 components/yijing/workspace/ziwei-chart.tsx 还原）
 * 经典 4×4 环形布局：外圈十二宫按地支定位，中宫 2×2 放命主信息 + 四化图例。
 * 交互：专业盘/精简盘切换；点宫高亮三方四正（或飞化落宫），再点弹宫位详情。
 * 取舍：V0 的 SVG 连线层小程序不支持，改为「高亮宫位 + 文字明细条」承载同等信息；
 *       星名竖排禁用 writing-mode（X5 红线），用每字一行的 flex column 实现。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import type { ZiweiChart, ZiweiPalace } from '@/pkg-paipan/lib/ziwei-types'

const props = defineProps<{ chart: ZiweiChart }>()

/**
 * 地支序（寅起顺行，palaces[0]=寅 … palaces[11]=丑）→ 4×4 网格坐标。
 * 传统布局：巳午未申在顶行，寅丑子亥在底行。
 */
const GRID_POS = [
  { c: 1, r: 4 }, // 寅
  { c: 1, r: 3 }, // 卯
  { c: 1, r: 2 }, // 辰
  { c: 1, r: 1 }, // 巳
  { c: 2, r: 1 }, // 午
  { c: 3, r: 1 }, // 未
  { c: 4, r: 1 }, // 申
  { c: 4, r: 2 }, // 酉
  { c: 4, r: 3 }, // 戌
  { c: 4, r: 4 }, // 亥
  { c: 3, r: 4 }, // 子
  { c: 2, r: 4 }, // 丑
]

const HUA_LIST = ['禄', '权', '科', '忌'] as const

// ── 交互状态 ──
const selected = ref<number | null>(null)
const detail = ref<ZiweiPalace | null>(null)
/** 盘面密度：专业盘（全信息）/精简盘（只留主星+宫名，适合截图讲解） */
const lite = ref(false)
/** 连线模式：三合=三方四正；飞化=宫干四化落宫 */
const lineMode = ref<'sanhe' | 'feihua'>('sanhe')

/** 三方四正：本宫 + 三合(+4/+8) + 对宫(+6) */
function sanfangSizheng(i: number): number[] {
  return [i, (i + 4) % 12, (i + 6) % 12, (i + 8) % 12]
}

const highlightSet = computed<Set<number> | null>(() => {
  if (selected.value === null) return null
  if (lineMode.value === 'sanhe') return new Set(sanfangSizheng(selected.value))
  const fh = props.chart.palaces[selected.value].feihua ?? []
  return new Set([selected.value, ...fh.map((f) => f.target)])
})

/** 选中提示条文字 */
const selectedTip = computed(() => {
  const i = selected.value
  if (i === null) return ''
  const p = props.chart.palaces[i]
  if (lineMode.value === 'sanhe') {
    return `${p.name} 三方四正：${sanfangSizheng(i).map((k) => props.chart.palaces[k].name).join(' · ')}`
  }
  const parts = (p.feihua ?? []).map((f) =>
    f.target === i ? `${f.star}自化${f.hua}` : `${f.star}${f.hua}→${props.chart.palaces[f.target].name}`,
  )
  return `${p.name} ${p.ganzhi.charAt(0)}干飞化：${parts.length ? parts.join(' · ') : '四化星不在盘中'}`
})

function onPalaceTap(i: number) {
  if (selected.value === i) {
    detail.value = props.chart.palaces[i]
  } else {
    selected.value = i
  }
}

function clearSelected() {
  selected.value = null
}

function huaClass(h: string): string {
  return h === '禄' ? 'hua-lu' : h === '权' ? 'hua-quan' : h === '科' ? 'hua-ke' : 'hua-ji'
}

/** 星名逐字拆分（竖排用，X5 红线禁 writing-mode） */
function chars(s: string): string[] {
  return s.split('')
}

const detailIdx = computed(() => (detail.value ? props.chart.palaces.indexOf(detail.value) : -1))
</script>

<template>
  <view class="zw">
    <!-- 密度切换 -->
    <view class="density">
      <view class="d-chip" :class="{ 'd-chip-on': !lite }" @tap="lite = false">
        <text class="d-text" :class="{ 'd-text-on': !lite }">专业盘</text>
      </view>
      <view class="d-chip" :class="{ 'd-chip-on': lite }" @tap="lite = true">
        <text class="d-text" :class="{ 'd-text-on': lite }">精简盘</text>
      </view>
    </view>

    <!-- 4×4 盘面 -->
    <view class="grid">
      <view
        v-for="(p, i) in chart.palaces"
        :key="p.name"
        class="cell"
        :class="{
          'cell-ming': p.name === '命宫',
          'cell-shen': p.isShen && p.name !== '命宫',
          'cell-dim': highlightSet !== null && !highlightSet.has(i),
          'cell-sel': selected === i,
          'cell-dx': p.currentDaxian && selected !== i,
        }"
        :style="{ gridColumn: String(GRID_POS[i].c), gridRow: String(GRID_POS[i].r) }"
        @tap="onPalaceTap(i)"
      >
        <!-- 星曜区：主星竖排大字 + 辅煞竖排小字 -->
        <view class="stars">
          <view class="majors">
            <view v-for="s in p.majors" :key="s.name" class="major-col">
              <view class="major-name">
                <text v-for="(ch, ci) in chars(s.name)" :key="ci" class="major-ch">{{ ch }}</text>
              </view>
              <text v-if="s.bright" class="major-bright">{{ s.bright }}</text>
              <text v-if="s.hua" class="hua-badge" :class="huaClass(s.hua)">{{ s.hua }}</text>
            </view>
            <text v-if="!p.majors.length" class="empty-tag">空宫</text>
          </view>
          <view v-if="!lite" class="minors">
            <view v-for="mn in p.minors" :key="mn" class="minor-col">
              <text v-for="(ch, ci) in chars(mn)" :key="ci" class="minor-ch">{{ ch }}</text>
            </view>
          </view>
        </view>

        <!-- 身宫金印 -->
        <view v-if="p.isShen" class="shen-seal"><text class="shen-seal-text">身</text></view>

        <!-- 底部：岁数列/神煞/大限 + 宫名干支 -->
        <view class="cell-bottom">
          <view v-if="!lite" class="bl">
            <text class="bl-line">{{ p.liunianAges }}</text>
            <text class="bl-line">{{ p.xiaoxian }}</text>
            <text class="bl-line bl-shensha">{{ p.boshi }} {{ p.changsheng }}{{ p.shensha?.length ? ' ' + p.shensha.join(' ') : '' }}</text>
            <text v-if="p.liunian" class="bl-line">{{ p.liunian }}</text>
            <text class="bl-line bl-dx">大限 {{ p.daxian }}</text>
          </view>
          <view v-else class="bl">
            <text class="bl-line bl-dx">{{ p.daxian }}</text>
          </view>
          <view class="br">
            <text class="palace-name" :class="{ 'pn-ming': p.name === '命宫', 'pn-shen': p.isShen && p.name !== '命宫' }">{{ p.name }}</text>
            <text class="palace-gz">{{ p.ganzhi }}</text>
          </view>
        </view>
      </view>

      <!-- 中宫 2×2：命主信息 + 四化图例 -->
      <view class="center" :style="{ gridColumn: '2 / 4', gridRow: '2 / 4' }">
        <text class="c-name">{{ chart.clientName }}<text class="c-gender"> {{ chart.gender }}命</text></text>
        <text class="c-birth">{{ chart.lunarBirth }}</text>
        <view class="c-ju"><text class="c-ju-text">{{ chart.wuxingJu }}</text></view>
        <text class="c-zhu">命主 {{ chart.mingzhu }} · 身主 {{ chart.shenzhu }}</text>
        <view class="c-legend">
          <text v-for="h in HUA_LIST" :key="h" class="hua-badge hua-badge-lg" :class="huaClass(h)">{{ h }}</text>
        </view>
        <text class="c-hint">点宫看三方四正 · 再点看详情</text>
      </view>
    </view>

    <!-- 选中提示条：三合/飞化模式切换 + 明细 -->
    <view v-if="selected !== null" class="tip">
      <view class="tip-head">
        <view class="tip-modes">
          <view class="tm-chip" :class="{ 'tm-chip-on': lineMode === 'sanhe' }" @tap="lineMode = 'sanhe'">
            <text class="tm-text" :class="{ 'tm-text-on': lineMode === 'sanhe' }">三合四正</text>
          </view>
          <view class="tm-chip" :class="{ 'tm-chip-on': lineMode === 'feihua' }" @tap="lineMode = 'feihua'">
            <text class="tm-text" :class="{ 'tm-text-on': lineMode === 'feihua' }">宫干飞化</text>
          </view>
        </view>
        <view class="tip-cancel" @tap="clearSelected"><text class="tip-cancel-text">取消</text></view>
      </view>
      <text class="tip-body">{{ selectedTip }}</text>
    </view>

    <!-- 宫位详情弹层 -->
    <view v-if="detail" class="mask" @tap="detail = null">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ detail.name }} · {{ detail.ganzhi }}</text>
          <view class="sheet-close" @tap="detail = null">
            <app-icon name="x" :size="32" color="#9ca3af" />
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <!-- 主星 -->
          <view class="dt-stars">
            <view v-for="s in detail.majors" :key="s.name" class="dt-major">
              <text class="dt-major-name">{{ s.name }}</text>
              <text v-if="s.bright" class="dt-major-bright">{{ s.bright }}</text>
              <text v-if="s.hua" class="hua-badge hua-badge-lg" :class="huaClass(s.hua)">化{{ s.hua }}</text>
            </view>
            <text v-if="!detail.majors.length" class="dt-empty">空宫（借对宫星曜论）</text>
          </view>
          <!-- 辅煞杂曜 -->
          <view v-if="detail.minors.length" class="dt-minors">
            <text v-for="mn in detail.minors" :key="mn" class="dt-minor">{{ mn }}</text>
          </view>
          <!-- 宫位要素 -->
          <view class="dt-meta">
            <text class="dt-meta-item">大限 {{ detail.daxian }} 岁</text>
            <text v-if="detail.liunian" class="dt-meta-item">流年 {{ detail.liunian }}</text>
            <text v-if="detail.changsheng" class="dt-meta-item">长生位「{{ detail.changsheng }}」</text>
            <text v-if="detail.boshi" class="dt-meta-item">博士神「{{ detail.boshi }}」</text>
            <text v-if="detail.shensha?.length" class="dt-meta-item">神煞 {{ detail.shensha.join('、') }}</text>
            <text v-if="detail.isShen" class="dt-meta-item dt-meta-shen">身宫所在</text>
          </view>
          <!-- 宫干飞化明细 -->
          <view v-if="detail.feihua?.length" class="dt-fh">
            <text class="dt-fh-title">{{ detail.ganzhi.charAt(0) }}干飞四化</text>
            <view class="dt-fh-list">
              <view v-for="f in detail.feihua" :key="f.hua" class="dt-fh-item">
                <text class="hua-badge" :class="huaClass(f.hua)">{{ f.hua }}</text>
                <text class="dt-fh-star">{{ f.star }}</text>
                <text class="dt-fh-target">{{ f.target === detailIdx ? '本宫自化' : `入${chart.palaces[f.target].name}` }}</text>
              </view>
            </view>
          </view>
          <!-- 断语参考（引擎有输出才展示） -->
          <view v-if="detail.judgment" class="dt-judge">
            <text class="dt-judge-title">断语参考</text>
            <text class="dt-judge-text">{{ detail.judgment }}</text>
          </view>
          <!-- 古籍参考（引擎有输出才展示） -->
          <view v-if="detail.gudian?.length" class="dt-gudian">
            <text class="dt-gudian-title">古籍参考</text>
            <view v-for="g in detail.gudian" :key="g.star" class="dt-gd-item">
              <text class="dt-gd-src">{{ g.star }} 《{{ g.source }}》</text>
              <text class="dt-gd-text">{{ g.text }}</text>
            </view>
          </view>
          <view class="sheet-pad" />
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.zw { display: flex; flex-direction: column; gap: 16rpx; }

/* 密度切换 */
.density { display: flex; align-self: center; background: rgba(0, 0, 0, 0.04); border-radius: 999rpx; padding: 4rpx; }
.d-chip { padding: 10rpx 36rpx; border-radius: 999rpx; }
.d-chip-on { background: var(--card); box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08); }
.d-text { font-size: 24rpx; color: var(--text-soft); }
.d-text-on { color: var(--brand); font-weight: 600; }

/* 盘面 */
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 236rpx);
  gap: 2rpx;
  background: var(--line);
  border: 2rpx solid rgba(201, 169, 110, 0.5);
  border-radius: 16rpx;
  overflow: hidden;
}
.cell {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8rpx;
  background: var(--card);
  overflow: hidden;
  transition: opacity 0.15s;
}
.cell-ming { background: rgba(196, 30, 58, 0.06); }
.cell-shen { background: rgba(201, 169, 110, 0.14); }
.cell-dim { opacity: 0.3; }
.cell-sel { box-shadow: inset 0 0 0 4rpx var(--brand); }
.cell-dx { box-shadow: inset 0 0 0 2rpx rgba(196, 30, 58, 0.45); }

/* 星曜区 */
.stars { display: flex; align-items: flex-start; gap: 8rpx; overflow: hidden; }
.majors { display: flex; align-items: flex-start; gap: 6rpx; flex-shrink: 0; }
.major-col { display: flex; flex-direction: column; align-items: center; gap: 2rpx; }
.major-name { display: flex; flex-direction: column; align-items: center; }
.major-ch { font-family: $serif; font-size: 26rpx; font-weight: 700; line-height: 1.15; color: var(--text-ink); }
.major-bright { font-family: $serif; font-size: 18rpx; line-height: 1; color: var(--text-soft); }
.empty-tag { font-family: $serif; font-size: 18rpx; color: var(--text-soft); }
.minors { display: flex; align-items: flex-start; gap: 4rpx; overflow: hidden; flex-wrap: wrap; max-height: 132rpx; }
.minor-col { display: flex; flex-direction: column; align-items: center; }
.minor-ch { font-family: $serif; font-size: 18rpx; line-height: 1.2; color: var(--text-soft); }

/* 四化色徽：禄绿 权金 科墨 忌朱 */
.hua-badge {
  font-family: $serif;
  font-size: 18rpx;
  font-weight: 700;
  line-height: 1;
  padding: 3rpx 6rpx;
  border-radius: 6rpx;
  color: #fff;
}
.hua-badge-lg { font-size: 22rpx; padding: 5rpx 10rpx; }
.hua-lu { background: #2e8b57; }
.hua-quan { background: var(--gold); }
.hua-ke { background: var(--text-ink); }
.hua-ji { background: var(--brand); }

/* 身宫金印 */
.shen-seal {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  border: 2rpx solid var(--gold);
  border-radius: 6rpx;
  padding: 2rpx 6rpx;
  background: rgba(255, 255, 255, 0.7);
}
.shen-seal-text { font-family: $serif; font-size: 18rpx; font-weight: 700; line-height: 1; color: var(--gold); }

/* 宫格底部 */
.cell-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 4rpx; overflow: hidden; }
.bl { display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.bl-line {
  font-family: $serif;
  font-size: 18rpx;
  line-height: 1.3;
  color: var(--text-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bl-shensha { color: var(--text-soft); }
.bl-dx { color: var(--brand); }
.br { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.palace-name { font-family: $serif; font-size: 22rpx; font-weight: 700; line-height: 1.2; color: var(--text-ink); }
.pn-ming { color: var(--brand); }
.pn-shen { color: var(--gold); }
.palace-gz { font-family: $serif; font-size: 18rpx; line-height: 1.2; color: var(--text-soft); }

/* 中宫 */
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 16rpx;
  background: var(--bg-paper);
  text-align: center;
  overflow: hidden;
}
.c-name { font-family: $serif; font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.c-gender { font-size: 22rpx; font-weight: 400; color: var(--text-soft); }
.c-birth { font-family: $serif; font-size: 20rpx; line-height: 1.5; color: var(--text-soft); }
.c-ju { background: rgba(196, 30, 58, 0.08); border-radius: 999rpx; padding: 6rpx 24rpx; }
.c-ju-text { font-family: $serif; font-size: 24rpx; font-weight: 700; color: var(--brand); }
.c-zhu { font-family: $serif; font-size: 20rpx; color: var(--text-soft); }
.c-legend { display: flex; align-items: center; gap: 10rpx; }
.c-hint { font-size: 18rpx; color: var(--text-soft); opacity: 0.8; }

/* 选中提示条 */
.tip {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  background: rgba(201, 169, 110, 0.14);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}
.tip-head { display: flex; align-items: center; justify-content: space-between; }
.tip-modes { display: flex; gap: 12rpx; }
.tm-chip { padding: 8rpx 22rpx; border-radius: 999rpx; background: var(--card); }
.tm-chip-on { background: var(--brand); }
.tm-text { font-family: $serif; font-size: 22rpx; color: var(--text-soft); }
.tm-text-on { color: #fff; }
.tip-cancel { padding: 8rpx 16rpx; }
.tip-cancel-text { font-size: 22rpx; color: var(--text-soft); text-decoration: underline; }
.tip-body { font-family: $serif; font-size: 24rpx; line-height: 1.6; color: var(--text-ink); }

/* 详情弹层 */
.mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 90; display: flex; align-items: flex-end; }
.sheet { background: var(--card); width: 100%; border-radius: 32rpx 32rpx 0 0; display: flex; flex-direction: column; max-height: 75vh; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx 32rpx 20rpx; }
.sheet-title { font-family: $serif; font-size: 34rpx; font-weight: 700; color: var(--text-ink); }
.sheet-close { width: 56rpx; height: 56rpx; border-radius: 999rpx; border: 2rpx solid var(--line); display: flex; align-items: center; justify-content: center; }
.sheet-body { padding: 0 32rpx; max-height: 60vh; }
.sheet-pad { height: 48rpx; }

.dt-stars { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 20rpx; }
.dt-major { display: flex; align-items: center; gap: 8rpx; background: rgba(196, 30, 58, 0.08); border-radius: 14rpx; padding: 12rpx 20rpx; }
.dt-major-name { font-family: $serif; font-size: 28rpx; font-weight: 700; color: var(--brand); }
.dt-major-bright { font-family: $serif; font-size: 22rpx; color: var(--text-soft); }
.dt-empty { font-size: 24rpx; color: var(--text-soft); }
.dt-minors { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 20rpx; }
.dt-minor { background: rgba(0, 0, 0, 0.04); border-radius: 10rpx; padding: 8rpx 14rpx; font-family: $serif; font-size: 22rpx; color: var(--text-soft); }
.dt-meta { display: flex; flex-wrap: wrap; gap: 12rpx 28rpx; margin-bottom: 20rpx; }
.dt-meta-item { font-family: $serif; font-size: 22rpx; color: var(--text-soft); }
.dt-meta-shen { color: var(--gold); font-weight: 700; }
.dt-fh { background: rgba(0, 0, 0, 0.03); border-radius: 16rpx; padding: 20rpx; margin-bottom: 20rpx; }
.dt-fh-title { display: block; font-family: $serif; font-size: 24rpx; font-weight: 700; color: var(--text-ink); margin-bottom: 12rpx; }
.dt-fh-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.dt-fh-item { display: flex; align-items: center; gap: 8rpx; background: var(--card); border-radius: 12rpx; padding: 10rpx 16rpx; }
.dt-fh-star { font-family: $serif; font-size: 24rpx; color: var(--text-ink); }
.dt-fh-target { font-size: 22rpx; color: var(--text-soft); }
.dt-judge { border: 2rpx solid rgba(201, 169, 110, 0.4); background: rgba(201, 169, 110, 0.1); border-radius: 16rpx; padding: 20rpx; margin-bottom: 20rpx; }
.dt-judge-title { display: block; font-family: $serif; font-size: 24rpx; font-weight: 700; color: var(--gold); margin-bottom: 8rpx; }
.dt-judge-text { font-family: $serif; font-size: 26rpx; line-height: 1.7; color: var(--text-ink); }
.dt-gudian { margin-bottom: 20rpx; }
.dt-gudian-title { display: block; font-family: $serif; font-size: 24rpx; font-weight: 700; color: var(--text-soft); margin-bottom: 12rpx; }
.dt-gd-item { background: rgba(0, 0, 0, 0.03); border-radius: 16rpx; padding: 20rpx; margin-bottom: 12rpx; }
.dt-gd-src { display: block; font-family: $serif; font-size: 22rpx; color: var(--text-soft); margin-bottom: 6rpx; }
.dt-gd-text { font-family: $serif; font-size: 24rpx; line-height: 1.7; color: var(--text-ink); }
</style>
