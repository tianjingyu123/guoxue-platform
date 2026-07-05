<script setup lang="ts">
/**
 * 讲师影响力指数卡（课题二工作台 P3）
 * teacher-profile 公开主页 + teacher-dashboard 工作台复用。纯展示：
 * 综合指数 + 等级徽章 + 四维分解进度条。数据来自后端 computeTeacherInfluence（纯函数·可核对）。
 */
import { computed } from 'vue'
import type { TeacherInfluence } from '@/lib/teacher-data'

const props = defineProps<{ influence: TeacherInfluence }>()

// 四维满分（与后端权重一致：学员规模40/内容产出20/口碑评分25/信任背书15）
const DIMS = [
  { key: 'reach', label: '学员规模', max: 40 },
  { key: 'output', label: '内容产出', max: 20 },
  { key: 'reputation', label: '口碑评分', max: 25 },
  { key: 'trust', label: '信任背书', max: 15 },
] as const

const dims = computed(() =>
  DIMS.map((d) => {
    const val = props.influence.breakdown[d.key] ?? 0
    return { ...d, val, pct: Math.min(100, Math.round((val / d.max) * 100)) }
  }),
)

const LEVEL_COLORS: Record<string, string> = {
  master: '#b8860b', senior: '#7c3aed', growing: '#2563eb', rising: '#16a34a', starter: '#9ca3af',
}
const levelColor = computed(() => LEVEL_COLORS[props.influence.levelKey] || '#9ca3af')
</script>

<template>
  <view class="inf-card">
    <view class="inf-head">
      <view class="inf-score-wrap">
        <text
          class="inf-score"
          :style="{ color: levelColor }"
        >{{ influence.score }}</text>
        <text class="inf-score-unit">分</text>
      </view>
      <view class="inf-head-right">
        <text class="inf-title">影响力指数</text>
        <text
          class="inf-level"
          :style="{ background: levelColor }"
        >{{ influence.level }}</text>
      </view>
    </view>
    <view class="inf-dims">
      <view
        v-for="d in dims"
        :key="d.key"
        class="inf-dim"
      >
        <view class="inf-dim-top">
          <text class="inf-dim-label">{{ d.label }}</text>
          <text class="inf-dim-val">{{ d.val }}/{{ d.max }}</text>
        </view>
        <view class="inf-bar">
          <view
            class="inf-bar-fill"
            :style="{ width: d.pct + '%', background: levelColor }"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.inf-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.inf-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 2rpx solid #f2ede3;
}
.inf-score-wrap { display: flex; align-items: baseline; }
.inf-score { font-size: 72rpx; font-weight: 800; line-height: 1; }
.inf-score-unit { font-size: 26rpx; color: #9a8b73; margin-left: 6rpx; }
.inf-head-right { display: flex; flex-direction: column; gap: 12rpx; }
.inf-title { font-size: 30rpx; font-weight: 600; color: #2d2a26; }
.inf-level {
  align-self: flex-start;
  font-size: 22rpx;
  color: #fff;
  padding: 4rpx 18rpx;
  border-radius: 999rpx;
}
.inf-dims {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 24rpx;
}
.inf-dim { display: flex; flex-direction: column; gap: 10rpx; }
.inf-dim-top { display: flex; align-items: center; justify-content: space-between; }
.inf-dim-label { font-size: 25rpx; color: #6b5b45; }
.inf-dim-val { font-size: 23rpx; color: #9a8b73; }
.inf-bar {
  height: 14rpx;
  background: #f2ede3;
  border-radius: 999rpx;
  overflow: hidden;
}
.inf-bar-fill {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.4s ease;
}
</style>
