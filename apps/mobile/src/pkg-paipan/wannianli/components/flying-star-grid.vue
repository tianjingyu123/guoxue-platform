<script setup lang="ts">
/**
 * 【万年历子组件】九宫飞星盘（自 V0 components/yijing/wannianli/flying-star-grid.tsx 还原）
 * 3×3 洛书宫位排布（南上北下），展示九星/位名，按吉凶着色；
 * 顶部分段切换流年/流月/流日/流时四盘。
 * X5 红线：不用 aspect-ratio，格子用固定高度。
 */
import { ref, computed } from 'vue'
import type { FlyingStar } from '@/lib/paipan/types'
import type { FlyingStarChart } from '@/pkg-paipan/lib/wannianli-types'
import SegmentedControl from './segmented-control.vue'

const props = defineProps<{
  charts: FlyingStarChart[]
}>()

const activeKey = ref<string>(props.charts[0]?.key ?? 'year')
const chart = computed(() => props.charts.find((c) => c.key === activeKey.value) ?? props.charts[0])
const segOptions = computed(() => props.charts.map((c) => ({ key: c.key as string, label: c.label })))
const centerKeywords = computed(() => chart.value?.stars.find((s) => s.key === 'CENTER')?.keywords.join(' · ') ?? '')

// 3×3 洛书定位（南上北下）
const GRID_POS: Record<FlyingStar['key'], { col: number; row: number }> = {
  SE: { col: 1, row: 1 }, S: { col: 2, row: 1 }, SW: { col: 3, row: 1 },
  E: { col: 1, row: 2 }, CENTER: { col: 2, row: 2 }, W: { col: 3, row: 2 },
  NE: { col: 1, row: 3 }, N: { col: 2, row: 3 }, NW: { col: 3, row: 3 },
}
</script>

<template>
  <view class="fs">
    <view class="fs-seg">
      <segmented-control :options="segOptions" :active-key="activeKey" @change="(k: string) => (activeKey = k)" />
    </view>

    <view v-if="chart" class="fs-grid">
      <view
        v-for="s in chart.stars"
        :key="s.key"
        class="fs-cell"
        :class="[`fs-cell-${s.luck}`, s.key === 'CENTER' ? 'fs-cell-center' : '']"
        :style="{ gridColumn: String(GRID_POS[s.key].col), gridRow: String(GRID_POS[s.key].row) }"
      >
        <!-- 星序水印 -->
        <text class="fs-watermark">{{ s.num }}</text>
        <text class="fs-dir">{{ s.direction }}</text>
        <text class="fs-star" :class="`wx-${s.wuxing}`">{{ s.star }}</text>
        <text class="fs-pos">{{ s.positionName }}</text>
      </view>
    </view>

    <!-- 中宫信息 -->
    <view v-if="chart" class="fs-center-info">
      <text class="fs-center-label">{{ chart.label }}中宫</text>
      <text class="fs-center-value">{{ chart.centerInfo }}</text>
    </view>

    <!-- 当前盘中宫关键词图例 -->
    <text class="fs-keywords">{{ centerKeywords }}</text>
  </view>
</template>

<style scoped lang="scss">
.fs { display: flex; flex-direction: column; gap: 24rpx; }
.fs-seg { display: flex; justify-content: center; }
.fs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 200rpx);
  gap: 12rpx;
  width: 100%;
}
.fs-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  overflow: hidden;
  border-radius: 16rpx;
  border: 1rpx solid var(--line);
  padding: 8rpx;
  text-align: center;
}
.fs-cell-good { background: rgba(47, 157, 106, 0.1); border-color: rgba(47, 157, 106, 0.3); }
.fs-cell-bad { background: rgba(196, 30, 58, 0.08); border-color: rgba(196, 30, 58, 0.3); }
.fs-cell-neutral { background: var(--muted); }
.fs-cell-center { box-shadow: 0 0 0 4rpx rgba(196, 30, 58, 0.4); }
.fs-watermark {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  text-align: center;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 72rpx;
  font-weight: 900;
  color: rgba(44, 44, 44, 0.05);
  pointer-events: none;
}
.fs-dir { position: relative; font-size: 20rpx; line-height: 1; color: var(--text-soft); }
.fs-star {
  position: relative;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 1.3;
}
.fs-pos { position: relative; font-size: 20rpx; line-height: 1; color: var(--text); }
.fs-center-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  border-radius: 16rpx;
  background: rgba(201, 169, 110, 0.12);
  padding: 16rpx 0;
}
.fs-center-label {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx;
  color: var(--text);
}
.fs-center-value {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--brand);
}
.fs-keywords { text-align: center; font-size: 24rpx; color: var(--text-soft); }
</style>
