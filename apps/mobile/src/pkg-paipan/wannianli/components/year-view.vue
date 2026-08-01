<script setup lang="ts">
/**
 * 【万年历子组件】年视图（自 V0 components/yijing/wannianli/year-view.tsx 还原）
 * 全年 12 月概览：每月节气、节日、吉日数，卡片式陈列，点击进月视图。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { buildYearOverview } from '@/pkg-paipan/lib/wannianli-engine'

const props = defineProps<{
  date: Date
}>()

const emit = defineEmits<{
  (e: 'select-month', d: Date): void
  (e: 'open-month'): void
}>()

const year = computed(() => props.date.getFullYear())
const overview = computed(() => buildYearOverview(year.value))

function shiftYear(delta: number) {
  emit('select-month', new Date(year.value + delta, props.date.getMonth(), 1))
}

function pickMonth(month: number) {
  emit('select-month', new Date(year.value, month - 1, 1))
  emit('open-month')
}
</script>

<template>
  <view class="yv">
    <!-- 年份切换 -->
    <view class="yv-head">
      <view class="yv-nav" @tap="shiftYear(-1)">
        <app-icon name="chevron-left" :size="40" color="var(--text-ink)" />
      </view>
      <text class="yv-title">{{ overview.title }}</text>
      <view class="yv-nav" @tap="shiftYear(1)">
        <app-icon name="chevron-right" :size="40" color="var(--text-ink)" />
      </view>
    </view>

    <view class="yv-grid">
      <view v-for="m in overview.months" :key="m.month" class="yv-card" @tap="pickMonth(m.month)">
        <view class="yv-card-head">
          <text class="yv-month">{{ m.label }}</text>
          <text class="yv-lunar">{{ m.lunarLabel }}</text>
        </view>
        <view class="yv-terms">
          <view v-for="t in m.solarTerms" :key="t" class="yv-term">
            <text class="yv-term-text">{{ t }}</text>
          </view>
        </view>
        <view v-if="m.festival" class="yv-fest">
          <app-icon name="sparkles" :size="22" color="var(--brand)" />
          <text class="yv-fest-text">{{ m.festival }}</text>
        </view>
        <view class="yv-good">
          <view class="yv-good-dot" />
          <text class="yv-good-label">吉日</text>
          <text class="yv-good-num">{{ m.goodDays }}</text>
          <text class="yv-good-label">天</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
$good: #2f9d6a;

.yv {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding: 32rpx 32rpx 48rpx;
}
.yv-head { display: flex; align-items: center; justify-content: space-between; }
.yv-nav {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  &:active { background: rgba(0, 0, 0, 0.05); }
}
.yv-title { font-family: $serif; font-size: 40rpx; font-weight: 900; color: var(--brand); }

.yv-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24rpx; }
.yv-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  border-radius: 24rpx;
  border: 1rpx solid var(--line);
  background: var(--card);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  padding: 32rpx;
  &:active { border-color: rgba(201, 169, 110, 0.6); }
}
.yv-card-head { display: flex; align-items: baseline; justify-content: space-between; }
.yv-month { font-family: $serif; font-size: 36rpx; font-weight: 700; color: var(--text-ink); }
.yv-lunar { font-size: 24rpx; color: var(--text-soft); }
.yv-terms { display: flex; flex-wrap: wrap; gap: 12rpx; }
.yv-term { border-radius: 12rpx; background: var(--muted); padding: 4rpx 16rpx; }
.yv-term-text { font-size: 22rpx; color: var(--text); }
.yv-fest {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 8rpx;
  border-radius: 12rpx;
  background: rgba(196, 30, 58, 0.1);
  padding: 4rpx 16rpx;
}
.yv-fest-text { font-size: 22rpx; color: var(--brand); }
.yv-good { margin-top: auto; display: flex; align-items: center; gap: 12rpx; padding-top: 8rpx; }
.yv-good-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: $good; }
.yv-good-label { font-size: 24rpx; color: var(--text-soft); }
.yv-good-num { font-family: $serif; font-size: 28rpx; font-weight: 700; color: $good; }
</style>
