<template>
  <view class="op-page">
    <!-- Header -->
    <view
      class="op-header"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="op-header-row">
        <view
          class="op-back"
          @tap="goBack"
        >
          <app-icon
            name="chevron-left"
            :size="48"
            color="#ffffff"
          />
        </view>
        <view class="op-header-info">
          <text class="op-header-name">
            {{ info.name }}
          </text>
          <view class="op-header-level">
            <app-icon
              name="crown"
              :size="28"
              color="#C9A96E"
            />
            <text class="op-header-level-text">
              {{ info.level }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view
      v-if="!loading"
      scroll-y
      class="op-scroll"
    >
      <!-- 数据概览 -->
      <view class="op-sec">
        <view class="op-overview">
          <view
            v-for="item in overview"
            :key="item.key"
            class="op-ov-card"
            @tap="navigateTo('/pkg-operator/operator-panel/index')"
          >
            <text class="op-ov-label">
              {{ item.label }}
            </text>
            <text class="op-ov-value">
              {{ formatValue(item.value, item.unit) }}
            </text>
            <view
              v-if="item.trend !== undefined"
              class="op-ov-trend"
              :class="item.trend > 0 ? 'up' : 'down'"
            >
              <app-icon
                :name="item.trend > 0 ? 'trending-up' : 'trending-down'"
                :size="22"
                :color="item.trend > 0 ? '#16a34a' : '#ef4444'"
              />
              <text class="op-ov-trend-val">
                {{ item.trend > 0 ? '+' : '' }}{{ item.trend }}%
              </text>
              <text
                v-if="item.trendLabel"
                class="op-ov-trend-label"
              >
                {{ item.trendLabel }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 快捷功能 -->
      <view class="op-sec">
        <view class="op-card">
          <text class="op-card-title">
            快捷功能
          </text>
          <view class="op-actions">
            <view
              v-for="action in quickActions"
              :key="action.key"
              class="op-action"
              @tap="navigateTo(action.href)"
            >
              <view class="op-action-icon">
                <app-icon
                  :name="action.icon"
                  :size="40"
                  color="#C41E3A"
                />
                <view
                  v-if="action.badge && action.badge > 0"
                  class="op-action-badge"
                >
                  <text class="op-action-badge-text">
                    {{ action.badge > 99 ? '99+' : action.badge }}
                  </text>
                </view>
              </view>
              <text class="op-action-label">
                {{ action.label }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 团队排行 -->
      <view class="op-sec">
        <view class="op-card op-card-flush">
          <view class="op-rank-head">
            <view class="op-rank-title-wrap">
              <app-icon
                name="trophy"
                :size="36"
                color="#C9A96E"
              />
              <text class="op-card-title plain">
                团队排行
              </text>
            </view>
            <view class="op-rank-tabs">
              <view
                v-for="t in periodTabs"
                :key="t.key"
                class="op-rank-tab"
                :class="{ on: rankingPeriod === t.key }"
                @tap="rankingPeriod = t.key"
              >
                <text
                  class="op-rank-tab-text"
                  :class="{ on: rankingPeriod === t.key }"
                >
                  {{ t.label }}
                </text>
              </view>
            </view>
          </view>
          <view class="op-rank-list">
            <view
              v-for="m in teamRanking.slice(0, 5)"
              :key="m.userId"
              class="op-rank-item"
              :class="{ self: m.isSelf }"
            >
              <view
                class="op-rank-no"
                :class="rankClass(m.rank)"
              >
                <text
                  class="op-rank-no-text"
                  :class="rankClass(m.rank)"
                >
                  {{ m.rank }}
                </text>
              </view>
              <view class="op-rank-avatar">
                {{ m.nickname[0] }}
              </view>
              <view class="op-rank-body">
                <view class="op-rank-name-row">
                  <text class="op-rank-name">
                    {{ m.nickname }}
                  </text>
                  <view
                    v-if="m.isSelf"
                    class="op-rank-self-tag"
                  >
                    <text class="op-rank-self-text">
                      我
                    </text>
                  </view>
                </view>
                <text
                  v-if="m.change !== undefined"
                  class="op-rank-change"
                  :class="m.change >= 0 ? 'up' : 'down'"
                >
                  {{ m.change >= 0 ? '+' : '' }}{{ m.change }}%
                </text>
              </view>
              <view class="op-rank-perf">
                <text class="op-rank-perf-val">
                  {{ m.performance.toLocaleString() }}
                </text>
                <text class="op-rank-perf-unit">
                  {{ m.performanceUnit }}
                </text>
              </view>
            </view>
          </view>
          <view
            class="op-rank-more"
            @tap="navigateTo('/pkg-operator/operator-panel/index')"
          >
            <text class="op-rank-more-text">
              查看完整排行
            </text>
            <app-icon
              name="chevron-right"
              :size="26"
              color="#C41E3A"
            />
          </view>
        </view>
      </view>

      <!-- 配额使用 -->
      <view class="op-sec">
        <view class="op-card">
          <text class="op-card-title">
            配额使用
          </text>
          <view class="op-quota-list">
            <view
              v-for="q in quotaUsage"
              :key="q.key"
              class="op-quota"
            >
              <view class="op-quota-head">
                <view class="op-quota-label-wrap">
                  <text class="op-quota-label">
                    {{ q.label }}
                  </text>
                  <app-icon
                    v-if="q.isLow"
                    name="alert-circle"
                    :size="26"
                    color="#f59e0b"
                  />
                </view>
                <text class="op-quota-num">
                  <text :class="{ low: q.isLow }">
                    {{ q.used }}
                  </text><text class="op-quota-total">
                    /{{ q.total }}{{ q.unit }}
                  </text>
                </text>
              </view>
              <view class="op-quota-bar">
                <view
                  class="op-quota-bar-fill"
                  :class="{ low: q.isLow }"
                  :style="{ width: pct(q) + '%' }"
                />
              </view>
              <text
                v-if="q.expireAt"
                class="op-quota-expire"
              >
                有效期至 {{ q.expireAt }}
              </text>
            </view>
          </view>
          <view
            class="op-quota-btn"
            @tap="navigateTo('/pkg-operator/operator-panel/index')"
          >
            <text class="op-quota-btn-text">
              升级配额
            </text>
          </view>
        </view>
      </view>

      <view class="op-bottom-pad" />
    </scroll-view>

    <!-- Loading 骨架 -->
    <view
      v-else
      class="op-loading"
    >
      <view class="op-skeleton-grid">
        <view
          v-for="i in 6"
          :key="i"
          class="op-skeleton-card"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  operatorPanelInfo as info,
  operatorOverview as overview,
  operatorTeamRanking as teamRanking,
  operatorQuotaUsage as quotaUsage,
  operatorQuickActions as quickActions,
} from '@/lib/operator-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const rankingPeriod = ref<'day' | 'week' | 'month'>('month')

const periodTabs = [
  { key: 'day' as const, label: '日' },
  { key: 'week' as const, label: '周' },
  { key: 'month' as const, label: '月' },
]

onMounted(() => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  // 模拟原型 600ms loading
  setTimeout(() => { loading.value = false }, 600)
})

function goBack() {
  uni.navigateBack({ delta: 1 })
}

function formatValue(value: number | string, unit?: string) {
  if (typeof value === 'number') {
    if (value >= 10000) return `${(value / 10000).toFixed(1)}万${unit || ''}`
    return `${value.toLocaleString()}${unit || ''}`
  }
  return value
}

function rankClass(rank: number) {
  if (rank === 1) return 'r1'
  if (rank === 2) return 'r2'
  if (rank === 3) return 'r3'
  return 'rn'
}

function pct(q: { used: number; total: number }) {
  return Math.min(100, (q.used / q.total) * 100)
}
</script>

<style scoped>
.op-page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }

/* Header */
.op-header { background: #C41E3A; }
.op-header-row { display: flex; align-items: center; gap: 24rpx; padding: 20rpx 32rpx; }
.op-back { margin-left: -12rpx; }
.op-header-info { flex: 1; }
.op-header-name { display: block; font-size: 36rpx; font-weight: 600; color: #fff; }
.op-header-level { display: flex; align-items: center; gap: 8rpx; margin-top: 4rpx; }
.op-header-level-text { font-size: 26rpx; color: rgba(255,255,255,0.8); }

.op-scroll { flex: 1; }
.op-sec { padding: 32rpx 32rpx 0; }
.op-bottom-pad { height: 48rpx; }

/* 数据概览 */
.op-overview { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; }
.op-ov-card { background: #fff; border-radius: 16rpx; padding: 24rpx; border: 1rpx solid #EDE7DC; }
.op-ov-label { display: block; font-size: 22rpx; color: #8a8178; margin-bottom: 8rpx; }
.op-ov-value { display: block; font-size: 40rpx; font-weight: 700; color: #C41E3A; }
.op-ov-trend { display: flex; align-items: center; gap: 4rpx; margin-top: 8rpx; }
.op-ov-trend-val { font-size: 22rpx; }
.op-ov-trend.up .op-ov-trend-val { color: #16a34a; }
.op-ov-trend.down .op-ov-trend-val { color: #ef4444; }
.op-ov-trend-label { font-size: 22rpx; color: #8a8178; margin-left: 4rpx; }

/* Card 通用 */
.op-card { background: #fff; border-radius: 16rpx; border: 1rpx solid #EDE7DC; padding: 32rpx; }
.op-card-flush { padding: 0; overflow: hidden; }
.op-card-title { display: block; font-size: 30rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 24rpx; }
.op-card-title.plain { margin-bottom: 0; }

/* 快捷功能 */
.op-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32rpx 16rpx; }
.op-action { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.op-action-icon { position: relative; width: 96rpx; height: 96rpx; border-radius: 16rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.op-action-badge { position: absolute; top: -8rpx; right: -8rpx; min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 16rpx; background: #ef4444; display: flex; align-items: center; justify-content: center; }
.op-action-badge-text { font-size: 18rpx; color: #fff; }
.op-action-label { font-size: 22rpx; color: #2C2C2C; text-align: center; }

/* 团队排行 */
.op-rank-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx 32rpx 16rpx; }
.op-rank-title-wrap { display: flex; align-items: center; gap: 12rpx; }
.op-rank-tabs { display: flex; background: #F2ECE1; border-radius: 12rpx; padding: 4rpx; }
.op-rank-tab { padding: 8rpx 20rpx; border-radius: 10rpx; }
.op-rank-tab.on { background: #fff; }
.op-rank-tab-text { font-size: 22rpx; color: #8a8178; }
.op-rank-tab-text.on { color: #2C2C2C; font-weight: 500; }
.op-rank-list { display: flex; flex-direction: column; }
.op-rank-item { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; border-top: 1rpx solid #EDE7DC; }
.op-rank-item.self { background: rgba(196,30,58,0.05); }
.op-rank-no { width: 44rpx; height: 44rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.op-rank-no.r1 { background: #f59e0b; }
.op-rank-no.r2 { background: #9ca3af; }
.op-rank-no.r3 { background: #b45309; }
.op-rank-no.rn { background: #F2ECE1; }
.op-rank-no-text { font-size: 22rpx; font-weight: 700; }
.op-rank-no-text.r1, .op-rank-no-text.r2, .op-rank-no-text.r3 { color: #fff; }
.op-rank-no-text.rn { color: #8a8178; }
.op-rank-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #C41E3A; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.op-rank-body { flex: 1; min-width: 0; }
.op-rank-name-row { display: flex; align-items: center; gap: 12rpx; }
.op-rank-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.op-rank-self-tag { border: 1rpx solid #C41E3A; border-radius: 6rpx; padding: 0 8rpx; }
.op-rank-self-text { font-size: 18rpx; color: #C41E3A; }
.op-rank-change { display: block; font-size: 22rpx; margin-top: 2rpx; }
.op-rank-change.up { color: #16a34a; }
.op-rank-change.down { color: #ef4444; }
.op-rank-perf { text-align: right; flex-shrink: 0; }
.op-rank-perf-val { display: block; font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.op-rank-perf-unit { font-size: 20rpx; color: #8a8178; }
.op-rank-more { display: flex; align-items: center; justify-content: center; gap: 4rpx; padding: 24rpx; border-top: 1rpx solid #EDE7DC; }
.op-rank-more-text { font-size: 26rpx; color: #C41E3A; }

/* 配额使用 */
.op-quota-list { display: flex; flex-direction: column; gap: 32rpx; }
.op-quota-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.op-quota-label-wrap { display: flex; align-items: center; gap: 8rpx; }
.op-quota-label { font-size: 26rpx; color: #2C2C2C; }
.op-quota-num { font-size: 26rpx; color: #2C2C2C; }
.op-quota-num .low { color: #f59e0b; font-weight: 500; }
.op-quota-total { color: #8a8178; }
.op-quota-bar { height: 16rpx; background: #F2ECE1; border-radius: 8rpx; overflow: hidden; }
.op-quota-bar-fill { height: 100%; background: #C41E3A; border-radius: 8rpx; }
.op-quota-bar-fill.low { background: #f59e0b; }
.op-quota-expire { display: block; font-size: 20rpx; color: #8a8178; margin-top: 8rpx; }
.op-quota-btn { margin-top: 32rpx; height: 80rpx; border: 1rpx solid #C41E3A; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.op-quota-btn-text { font-size: 28rpx; color: #C41E3A; }

/* Loading 骨架 */
.op-loading { flex: 1; padding: 32rpx; }
.op-skeleton-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; }
.op-skeleton-card { height: 140rpx; background: #EDE7DC; border-radius: 16rpx; opacity: 0.6; }
</style>
