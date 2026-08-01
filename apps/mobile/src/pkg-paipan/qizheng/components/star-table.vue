<script setup lang="ts">
/**
 * 七政四余·十一曜表（自 V0 components/qizheng/star-table.tsx 还原）
 * 列：星曜 / 宫位 / 宿度 / 行（迟留伏逆）/ 化曜 / 垣（庙陷）/ 恩用（恩用仇难）
 * 取舍：V0 的 <table> → flex 行（.tr/.th/.td），小程序无表格语义
 */
import type { QizhengResult } from '@/pkg-paipan/lib/qizheng-engine'

defineProps<{ result: QizhengResult }>()

const WX_TEXT: Record<string, string> = {
  金: '#b45309', 木: '#15803d', 水: '#2563eb', 火: '#dc2626', 土: '#92661a', 日: '#dc2626', 月: '#2563eb',
}

const ROLE_COLOR: Record<string, { bg: string; fg: string }> = {
  恩: { bg: 'rgba(21,128,61,0.1)', fg: '#15803d' },
  用: { bg: 'rgba(37,99,235,0.1)', fg: '#2563eb' },
  仇: { bg: 'rgba(180,83,9,0.1)', fg: '#b45309' },
  难: { bg: 'rgba(220,38,38,0.1)', fg: '#dc2626' },
}

function motionColor(motion: string): string {
  if (motion === '逆') return '#dc2626'
  if (motion === '伏' || motion === '留') return '#b45309'
  return '#8a8a8a'
}

function dignityColor(dignity: string): string {
  if (dignity === '庙') return '#15803d'
  if (dignity === '陷') return '#dc2626'
  return '#8a8a8a'
}
</script>

<template>
  <view class="table">
    <view class="tr tr-head">
      <text class="th th-star">星曜</text>
      <text class="th th-palace">宫位</text>
      <text class="th th-xiu">宿度</text>
      <text class="th th-c">行</text>
      <text class="th th-c">化曜</text>
      <text class="th th-c">垣</text>
      <text class="th th-c">恩用</text>
    </view>

    <view v-for="b in result.bodies" :key="b.key" class="tr">
      <view class="td td-star">
        <text class="star-name" :style="{ color: WX_TEXT[b.wuxing] || 'var(--text-ink)' }">{{ b.name }}</text>
        <text v-if="b.category === '四余'" class="star-tag">余</text>
      </view>
      <text class="td td-palace">{{ b.palaceZhi }}宫 {{ b.lonText }}</text>
      <text class="td td-xiu">{{ b.mansion }}宿{{ b.mansionDeg.toFixed(1) }}°</text>
      <text
        class="td td-c"
        :style="{ color: motionColor(b.motion), fontWeight: b.motion === '逆' ? 700 : 400 }"
      >{{ b.motion }}</text>
      <text class="td td-c td-ink">{{ b.huayao || '—' }}</text>
      <text
        class="td td-c"
        :style="{ color: dignityColor(b.dignity), fontWeight: b.dignity === '庙' ? 700 : 400 }"
      >{{ b.dignity }}</text>
      <view class="td td-c">
        <text
          v-if="b.role"
          class="role"
          :style="{ background: ROLE_COLOR[b.role]?.bg, color: ROLE_COLOR[b.role]?.fg }"
        >{{ b.role }}</text>
        <text v-else class="td-dash">—</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.table { display: flex; flex-direction: column; }

.tr {
  display: flex; align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
}
.tr-head { border-bottom: 2rpx solid var(--line); }

.th { font-size: 20rpx; font-weight: 500; color: var(--text-soft); }
.td { font-size: 22rpx; color: var(--text-soft); }
.td-ink { color: var(--text-ink); }

.th-star, .td-star { width: 112rpx; flex-shrink: 0; display: flex; align-items: center; gap: 6rpx; }
.th-palace, .td-palace { flex: 1.5; min-width: 0; color: var(--text-ink); }
.th-xiu, .td-xiu { flex: 1.3; min-width: 0; }
.th-c, .td-c { width: 72rpx; flex-shrink: 0; text-align: center; }

.star-name { font-size: 24rpx; font-weight: 700; }
.star-tag { font-size: 18rpx; color: var(--text-soft); }

.role {
  display: inline-block;
  padding: 2rpx 10rpx; border-radius: 6rpx;
  font-size: 18rpx; font-weight: 700;
}
.td-dash { font-size: 22rpx; color: var(--text-soft); }
</style>
