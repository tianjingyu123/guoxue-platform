<template>
  <view v-if="isLoading" class="analysis-page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="88rpx" radius="0" mb="24rpx" />
      <AppSkeleton width="100%" height="240rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="240rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="240rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无分析数据" />
  <view v-else class="analysis-page">
    <app-nav-bar
      title="下线业绩分析"
      :show-back="true"
      background="#ffffff"
      color="#1f2937"
    />

    <view class="an-body">
      <text class="an-intro">
        系统自动分析每位下线的推广漏斗（曝光→点击→成交），诊断转化瓶颈。
      </text>

      <view
        v-for="m in members"
        :key="m.id"
        class="an-card"
      >
        <!-- 头部 -->
        <view class="an-head">
          <view class="an-avatar">
            <text class="an-avatar-txt">
              {{ m.name.charAt(0) }}
            </text>
          </view>
          <view class="an-head-info">
            <view class="an-head-name-row">
              <text class="an-name">
                {{ m.name }}
              </text>
              <text class="an-level">
                {{ m.level }}
              </text>
            </view>
            <text class="an-commission">
              佣金 ¥{{ m.commission }}
            </text>
          </view>
          <view
            class="an-trend"
            :class="m.trend >= 0 ? 'up' : 'down'"
          >
            <app-icon
              :name="m.trend >= 0 ? 'trending-up' : 'trending-down'"
              :size="28"
              :color="m.trend >= 0 ? '#16a34a' : '#ef4444'"
            />
            <text
              class="an-trend-txt"
              :class="m.trend >= 0 ? 'up' : 'down'"
            >
              {{ Math.abs(m.trend) }}%
            </text>
          </view>
        </view>

        <!-- 漏斗数据 -->
        <view class="an-funnel">
          <view class="an-funnel-item">
            <app-icon
              name="eye"
              :size="28"
              color="#9ca3af"
            />
            <text class="an-funnel-val">
              {{ m.visits }}
            </text>
            <text class="an-funnel-label">
              曝光
            </text>
          </view>
          <view class="an-funnel-item">
            <app-icon
              name="mouse-pointer-click"
              :size="28"
              color="#9ca3af"
            />
            <text class="an-funnel-val">
              {{ m.clicks }}
            </text>
            <text class="an-funnel-label">
              点击 {{ ctr(m) }}%
            </text>
          </view>
          <view class="an-funnel-item">
            <app-icon
              name="shopping-cart"
              :size="28"
              color="#9ca3af"
            />
            <text class="an-funnel-val">
              {{ m.orders }}
            </text>
            <text class="an-funnel-label">
              成交 {{ cvr(m) }}%
            </text>
          </view>
        </view>

        <!-- 自动诊断 -->
        <view
          class="an-diag"
          :class="m.diagnosis.type"
        >
          <app-icon
            name="alert-circle"
            :size="26"
            :color="m.diagnosis.type === 'good' ? '#16a34a' : '#b45309'"
          />
          <text
            class="an-diag-txt"
            :class="m.diagnosis.type"
          >
            {{ m.diagnosis.text }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { operatorApi, type MemberPerf } from '@/lib/operator-data'

const { data: pageData, isLoading, loadError, reload } = useAsyncData(async () => {
  const station = await operatorApi.getMyStation()
  return { members: (station as any)?.members ?? [] }
})

const members = computed(() => pageData.value?.members ?? [])
const isEmpty = computed(() => {
  const m = pageData.value?.members
  return m !== undefined && m.length === 0
})

function ctr(m: MemberPerf) {
  return ((m.clicks / m.visits) * 100).toFixed(1)
}
function cvr(m: MemberPerf) {
  return ((m.orders / m.clicks) * 100).toFixed(1)
}
</script>

<style lang="scss" scoped>
.analysis-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 40rpx;
}

.an-body {
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.an-intro {
  font-size: 22rpx;
  color: #9ca3af;
  line-height: 1.5;
}

.an-card {
  padding: 32rpx;
  background: #ffffff;
  border: 1rpx solid #f0e9e0;
  border-radius: 24rpx;
}

.an-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.an-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: rgba(146, 84, 222, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.an-avatar-txt {
  font-size: 30rpx;
  font-weight: 700;
  color: #9254de;
}
.an-head-info {
  flex: 1;
  min-width: 0;
}
.an-head-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.an-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
}
.an-level {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #f3f4f6;
  color: #9ca3af;
}
.an-commission {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
  margin-top: 6rpx;
}
.an-trend {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2rpx;
}
.an-trend-txt {
  font-size: 26rpx;
  font-weight: 500;
}
.an-trend-txt.up {
  color: #16a34a;
}
.an-trend-txt.down {
  color: #ef4444;
}

.an-funnel {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.an-funnel-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 0;
  border-radius: 16rpx;
  background: #f9fafb;
}
.an-funnel-val {
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2937;
  margin-top: 8rpx;
}
.an-funnel-label {
  font-size: 20rpx;
  color: #9ca3af;
  margin-top: 4rpx;
}

.an-diag {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 20rpx;
  border-radius: 16rpx;
}
.an-diag.good {
  background: rgba(22, 163, 74, 0.05);
}
.an-diag.warn {
  background: #fffbeb;
}
.an-diag-txt {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.6;
}
.an-diag-txt.good {
  color: #16a34a;
}
.an-diag-txt.warn {
  color: #b45309;
}
</style>
