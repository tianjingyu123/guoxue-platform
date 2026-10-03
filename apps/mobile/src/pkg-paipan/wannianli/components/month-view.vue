<script setup lang="ts">
/**
 * 【万年历子组件】月视图（自 V0 components/yijing/wannianli/month-view.tsx 还原）
 * 传统月历网格：公历大字 + 农历/节气小字 + 每日吉凶点，今日高亮，点选看速览。
 * 取舍：选中日不做本地 state，直接以父级 date 为单一真源（V0 双源易失步）。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import LuckBadge from './luck-badge.vue'
import { buildMonthGrid } from '@/pkg-paipan/lib/wannianli-engine'

const props = defineProps<{
  date: Date
}>()

const emit = defineEmits<{
  (e: 'select-date', d: Date): void
  (e: 'open-day'): void
}>()

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const year = computed(() => props.date.getFullYear())
const month = computed(() => props.date.getMonth() + 1)
const selected = computed(() => props.date.getDate())

const grid = computed(() => buildMonthGrid(year.value, month.value))
const selectedCell = computed(() =>
  grid.value.cells.find((c) => c.isCurrentMonth && c.solarDay === selected.value),
)

const selectedSummary = computed(() => {
  const cell = selectedCell.value
  if (!cell) return ''
  if (cell.luck === 'good') return '吉神当值、宜事较多，诸事较顺，宜把握。'
  if (cell.luck === 'bad') return '凶煞值日、忌事偏多，宜静守，慎动土远行。'
  return '平稳之日，宜守常规事务，量力而行。'
})

function shiftMonth(delta: number) {
  emit('select-date', new Date(year.value, month.value - 1 + delta, 1))
}

function pickDay(cell: { isCurrentMonth: boolean; solarDay: number }) {
  if (!cell.isCurrentMonth) return
  emit('select-date', new Date(year.value, month.value - 1, cell.solarDay))
}
</script>

<template>
  <view class="mv">
    <!-- 月份切换 -->
    <view class="mv-head">
      <view class="mv-nav" @tap="shiftMonth(-1)">
        <app-icon name="chevron-left" :size="40" color="var(--text-ink)" />
      </view>
      <text class="mv-title">{{ grid.title }}</text>
      <view class="mv-nav" @tap="shiftMonth(1)">
        <app-icon name="chevron-right" :size="40" color="var(--text-ink)" />
      </view>
    </view>

    <!-- 图例 -->
    <view class="mv-legend">
      <view class="mv-legend-item"><view class="mv-dot mv-dot-good" /><text class="mv-legend-text">吉</text></view>
      <view class="mv-legend-item"><view class="mv-dot mv-dot-neutral" /><text class="mv-legend-text">平</text></view>
      <view class="mv-legend-item"><view class="mv-dot mv-dot-bad" /><text class="mv-legend-text">凶</text></view>
    </view>

    <paper-card padding="sm">
      <!-- 星期表头 -->
      <view class="mv-week">
        <view v-for="(w, i) in WEEKDAYS" :key="w" class="mv-week-cell">
          <text class="mv-week-text" :class="{ 'mv-week-text-weekend': i === 0 || i === 6 }">{{ w }}</text>
        </view>
      </view>
      <!-- 日期网格 -->
      <view class="mv-grid">
        <view
          v-for="(cell, idx) in grid.cells"
          :key="idx"
          class="mv-cell"
          :class="{
            'mv-cell-dim': !cell.isCurrentMonth,
            'mv-cell-today': cell.isToday,
            'mv-cell-selected': !cell.isToday && cell.isCurrentMonth && selected === cell.solarDay,
          }"
          @tap="pickDay(cell)"
        >
          <text class="mv-cell-day" :class="{ 'mv-cell-day-today': cell.isToday }">{{ cell.solarDay }}</text>
          <text
            class="mv-cell-lunar"
            :class="{
              'mv-cell-lunar-today': cell.isToday,
              'mv-cell-lunar-fest': !cell.isToday && !!cell.festival,
            }"
          >{{ cell.festival ?? cell.lunarDay }}</text>
          <view
            v-if="cell.isCurrentMonth"
            class="mv-dot"
            :class="cell.isToday ? 'mv-dot-white' : `mv-dot-${cell.luck}`"
          />
          <view v-else class="mv-dot mv-dot-empty" />
        </view>
      </view>
    </paper-card>

    <!-- 选中日速览 -->
    <paper-card v-if="selectedCell" padding="lg">
      <view class="mv-sum-head">
        <view class="mv-sum-main">
          <text class="mv-sum-title">{{ month }}月{{ selectedCell.solarDay }}日 · {{ selectedCell.lunarDay }}</text>
          <text class="mv-sum-fest">{{ selectedCell.festival ?? '无节庆' }}</text>
        </view>
        <luck-badge :luck="selectedCell.luck" variant="soft" />
      </view>
      <view class="mv-rule" />
      <text class="mv-sum-desc">{{ selectedSummary }}</text>
      <view class="mv-open-day" @tap="emit('open-day')">
        <text class="mv-open-day-text">查看当日完整黄历 →</text>
      </view>
    </paper-card>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
$good: #2f9d6a;

.mv {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding: 32rpx 32rpx 48rpx;
}
.mv-head { display: flex; align-items: center; justify-content: space-between; }
.mv-nav {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  &:active { background: rgba(0, 0, 0, 0.05); }
}
.mv-title { font-family: $serif; font-size: 36rpx; font-weight: 700; color: var(--text-ink); }

.mv-legend { display: flex; align-items: center; justify-content: center; gap: 32rpx; }
.mv-legend-item { display: flex; align-items: center; gap: 12rpx; }
.mv-legend-text { font-size: 24rpx; color: var(--text-soft); }

.mv-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.mv-dot-good { background: $good; }
.mv-dot-bad { background: var(--brand); }
.mv-dot-neutral { background: var(--gold); }
.mv-dot-white { background: #ffffff; }
.mv-dot-empty { background: transparent; }

.mv-week { display: grid; grid-template-columns: repeat(7, 1fr); }
.mv-week-cell { padding: 16rpx 0; text-align: center; }
.mv-week-text { font-size: 24rpx; font-weight: 500; color: var(--text-soft); }
.mv-week-text-weekend { color: var(--brand); }

.mv-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8rpx; }
.mv-cell {
  height: 116rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  border-radius: 16rpx;
  text-align: center;
}
.mv-cell-dim { opacity: 0.3; }
.mv-cell-today { background: var(--brand); }
.mv-cell-selected {
  background: rgba(196, 30, 58, 0.1);
  box-shadow: inset 0 0 0 2rpx rgba(196, 30, 58, 0.3);
}
.mv-cell-day {
  font-family: $serif;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1;
  color: var(--text-ink);
}
.mv-cell-day-today { color: #ffffff; }
.mv-cell-lunar {
  max-width: 100%;
  font-size: 20rpx;
  line-height: 1;
  color: var(--text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mv-cell-lunar-today { color: rgba(255, 255, 255, 0.9); }
.mv-cell-lunar-fest { color: var(--brand); }

.mv-sum-head { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; }
.mv-sum-main { min-width: 0; }
.mv-sum-title { font-family: $serif; font-size: 36rpx; font-weight: 700; color: var(--text-ink); }
.mv-sum-fest { display: block; margin-top: 8rpx; font-size: 24rpx; color: var(--text-soft); }
.mv-rule { margin: 24rpx 0; height: 1rpx; background: rgba(201, 169, 110, 0.5); }
.mv-sum-desc { font-size: 28rpx; line-height: 1.7; color: var(--text); }
.mv-open-day {
  margin-top: 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid rgba(201, 169, 110, 0.4);
  background: rgba(201, 169, 110, 0.15);
  padding: 20rpx 0;
  text-align: center;
  &:active { background: rgba(201, 169, 110, 0.3); }
}
.mv-open-day-text {
  font-family: $serif;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--brand);
}
</style>
