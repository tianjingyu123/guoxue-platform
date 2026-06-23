<template>
  <view class="dash">
    <!-- 顶部店铺信息 -->
    <view class="dash-hero" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="dash-hero-top">
        <text class="dash-hero-title">商家工作台</text>
        <view class="dash-hero-actions">
          <view class="dash-hero-btn" @tap="go('/merchant/shop-preview')">
            <AppIcon name="eye" :size="20" color="rgba(255,255,255,0.85)" />
          </view>
          <view class="dash-hero-btn dash-hero-bell" @tap="go('/notifications')">
            <AppIcon name="bell" :size="20" color="rgba(255,255,255,0.85)" />
            <view class="dash-hero-dot" />
          </view>
        </view>
      </view>
      <view class="dash-shop">
        <view class="dash-shop-avatar">
          <AppIcon name="store" :size="28" color="#fff" />
        </view>
        <view class="dash-shop-info">
          <view class="dash-shop-name-row">
            <text class="dash-shop-name">{{ d.shopName }}</text>
            <text class="dash-shop-level">{{ d.level }}</text>
          </view>
          <view class="dash-shop-status">
            <view class="dash-shop-dot" />
            <text class="dash-shop-status-txt">{{ d.status }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 今日数据 -->
    <view class="dash-section dash-overview">
      <view class="dash-card dash-shadow">
        <view class="dash-card-head">
          <text class="dash-card-title">今日数据</text>
          <view class="dash-card-more" @tap="go('/merchant/analytics')">
            <text class="dash-more-txt">查看详情</text>
            <AppIcon name="chevron-right" :size="16" color="#c41e3a" />
          </view>
        </view>
        <!-- 主要指标 -->
        <view class="dash-main-grid">
          <view class="dash-main-cell">
            <view class="dash-main-cell-head">
              <text class="dash-main-label">订单数</text>
              <view class="dash-trend" :class="d.todayStats.orders.trend === 'up' ? 'up' : 'down'">
                <AppIcon :name="d.todayStats.orders.trend === 'up' ? 'arrow-up-right' : 'arrow-down-right'" :size="12" :color="d.todayStats.orders.trend === 'up' ? '#16a34a' : '#ef4444'" />
                <text>{{ Math.abs(d.todayStats.orders.change) }}%</text>
              </view>
            </view>
            <text class="dash-main-value">{{ d.todayStats.orders.value }}</text>
            <view class="dash-spark">
              <view
                v-for="(pt, i) in sparkBars(d.weeklyTrend.orders)"
                :key="i"
                class="dash-spark-bar"
                style="background:#c41e3a"
                :style="{ height: pt + '%' }"
              />
            </view>
          </view>
          <view class="dash-main-cell">
            <view class="dash-main-cell-head">
              <text class="dash-main-label">销售额</text>
              <view class="dash-trend" :class="d.todayStats.sales.trend === 'up' ? 'up' : 'down'">
                <AppIcon :name="d.todayStats.sales.trend === 'up' ? 'arrow-up-right' : 'arrow-down-right'" :size="12" :color="d.todayStats.sales.trend === 'up' ? '#16a34a' : '#ef4444'" />
                <text>{{ Math.abs(d.todayStats.sales.change) }}%</text>
              </view>
            </view>
            <text class="dash-main-value">¥{{ d.todayStats.sales.value }}</text>
            <view class="dash-spark">
              <view
                v-for="(pt, i) in sparkBars(d.weeklyTrend.sales)"
                :key="i"
                class="dash-spark-bar"
                style="background:#16a34a"
                :style="{ height: pt + '%' }"
              />
            </view>
          </view>
        </view>
        <!-- 次要指标 -->
        <view class="dash-sub-grid">
          <view class="dash-sub-cell">
            <view>
              <text class="dash-sub-label">访客数</text>
              <text class="dash-sub-value">{{ d.todayStats.visitors.value }}</text>
            </view>
            <view class="dash-sub-tag" :class="d.todayStats.visitors.trend === 'up' ? 'up' : 'down'">
              <AppIcon :name="d.todayStats.visitors.trend === 'up' ? 'trending-up' : 'trending-down'" :size="12" :color="d.todayStats.visitors.trend === 'up' ? '#16a34a' : '#ef4444'" />
              <text>{{ Math.abs(d.todayStats.visitors.change) }}%</text>
            </view>
          </view>
          <view class="dash-sub-cell">
            <view>
              <text class="dash-sub-label">转化率</text>
              <text class="dash-sub-value">{{ d.todayStats.conversion.value }}%</text>
            </view>
            <view class="dash-sub-tag" :class="d.todayStats.conversion.trend === 'up' ? 'up' : 'down'">
              <AppIcon :name="d.todayStats.conversion.trend === 'up' ? 'trending-up' : 'trending-down'" :size="12" :color="d.todayStats.conversion.trend === 'up' ? '#16a34a' : '#ef4444'" />
              <text>{{ Math.abs(d.todayStats.conversion.change) }}%</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 待处理事项 -->
    <view class="dash-section">
      <view class="dash-card">
        <text class="dash-card-title dash-mb">待处理事项</text>
        <view class="dash-pending-grid">
          <view class="dash-pending-cell" @tap="go('/merchant/orders?status=pending')">
            <view class="dash-pending-icon">
              <AppIcon name="shopping-cart" :size="24" color="#6b7280" />
              <view v-if="d.pending.toShip > 0" class="dash-badge">{{ d.pending.toShip }}</view>
            </view>
            <text class="dash-pending-label">待发货</text>
          </view>
          <view class="dash-pending-cell" @tap="go('/merchant/orders?status=refunding')">
            <view class="dash-pending-icon">
              <AppIcon name="alert-circle" :size="24" color="#6b7280" />
              <view v-if="d.pending.refund > 0" class="dash-badge">{{ d.pending.refund }}</view>
            </view>
            <text class="dash-pending-label">退款中</text>
          </view>
          <view class="dash-pending-cell" @tap="go('/merchant/reviews')">
            <view class="dash-pending-icon">
              <AppIcon name="star" :size="24" color="#6b7280" />
              <view v-if="d.pending.review > 0" class="dash-badge">{{ d.pending.review }}</view>
            </view>
            <text class="dash-pending-label">待回复</text>
          </view>
          <view class="dash-pending-cell" @tap="go('/merchant/inquiries')">
            <view class="dash-pending-icon">
              <AppIcon name="message-square" :size="24" color="#6b7280" />
              <view v-if="d.pending.inquiry > 0" class="dash-badge">{{ d.pending.inquiry }}</view>
            </view>
            <text class="dash-pending-label">咨询</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 常用功能 -->
    <view class="dash-section">
      <view class="dash-card">
        <text class="dash-card-title dash-mb">常用功能</text>
        <view class="dash-action-grid">
          <view v-for="a in actions" :key="a.label" class="dash-action-cell" @tap="go(a.path)">
            <view class="dash-action-icon" :style="{ background: a.bg }">
              <AppIcon :name="a.icon" :size="20" :color="a.color" />
            </view>
            <text class="dash-action-label">{{ a.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 平台公告 -->
    <view class="dash-section">
      <view class="dash-card">
        <view class="dash-card-head dash-mb">
          <text class="dash-card-title">平台公告</text>
          <text class="dash-more-txt" @tap="go('/merchant/notices')">更多</text>
        </view>
        <view class="dash-notice-list">
          <view v-for="n in d.notices" :key="n.id" class="dash-notice" @tap="go('/merchant/notices')">
            <text class="dash-notice-type">{{ n.type }}</text>
            <view class="dash-notice-body">
              <text class="dash-notice-title">{{ n.title }}</text>
              <text class="dash-notice-time">{{ n.time }}</text>
            </view>
            <AppIcon name="chevron-right" :size="16" color="#9ca3af" />
          </view>
        </view>
      </view>
    </view>

    <!-- 经营小贴士 -->
    <view class="dash-section dash-pb">
      <view class="dash-card dash-tip">
        <view class="dash-tip-icon">
          <AppIcon name="trending-up" :size="20" color="#d97706" />
        </view>
        <view class="dash-tip-body">
          <text class="dash-tip-title">经营小贴士</text>
          <text class="dash-tip-desc">您的商品详情页转化率较低，建议优化商品主图和详情描述，可提升约20%的转化率。</text>
          <text class="dash-tip-link">查看优化建议</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantDashboard, merchantQuickActions } from '@/lib/merchant-data'

const d = merchantDashboard
const actions = merchantQuickActions
const statusBarHeight = ref(0)

uni.getSystemInfo({
  success: (e) => {
    statusBarHeight.value = e.statusBarHeight || 0
  },
})

// sparkline 用柱高百分比近似（项目无图表库）
function sparkBars(data: number[]): number[] {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  return data.map((v) => 30 + ((v - min) / range) * 70)
}

function go(path: string) {
  navigateTo(path)
}
</script>

<style scoped>
.dash { min-height: 100vh; background: #f5f5f7; }
.dash-hero { background: linear-gradient(135deg, #c41e3a, #a01830); padding-left: 16px; padding-right: 16px; padding-bottom: 64px; }
.dash-hero-top { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; margin-bottom: 16px; }
.dash-hero-title { font-size: 18px; font-weight: 600; color: #fff; }
.dash-hero-actions { display: flex; align-items: center; gap: 8px; }
.dash-hero-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; position: relative; }
.dash-hero-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
.dash-shop { display: flex; align-items: center; gap: 12px; }
.dash-shop-avatar { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.dash-shop-name-row { display: flex; align-items: center; gap: 8px; }
.dash-shop-name { font-size: 18px; font-weight: 600; color: #fff; }
.dash-shop-level { font-size: 10px; color: #fff; background: rgba(245,158,11,0.9); padding: 2px 6px; border-radius: 4px; }
.dash-shop-status { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
.dash-shop-dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; }
.dash-shop-status-txt { font-size: 13px; color: rgba(255,255,255,0.85); }

.dash-section { padding: 0 16px; margin-top: 16px; }
.dash-overview { margin-top: -48px; }
.dash-pb { padding-bottom: 24px; }
.dash-card { background: #fff; border-radius: 12px; padding: 16px; }
.dash-shadow { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.dash-card-head { display: flex; align-items: center; justify-content: space-between; }
.dash-card-title { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.dash-mb { margin-bottom: 12px; display: block; }
.dash-card-more { display: flex; align-items: center; }
.dash-more-txt { font-size: 12px; color: #c41e3a; }

.dash-main-grid { display: flex; gap: 16px; margin: 16px 0; }
.dash-main-cell { flex: 1; background: #f5f5f7; border-radius: 12px; padding: 12px; }
.dash-main-cell-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.dash-main-label { font-size: 12px; color: #6b7280; }
.dash-trend { display: flex; align-items: center; gap: 1px; font-size: 10px; }
.dash-trend.up { color: #16a34a; }
.dash-trend.down { color: #ef4444; }
.dash-main-value { font-size: 24px; font-weight: 700; color: #1a1a1a; display: block; }
.dash-spark { display: flex; align-items: flex-end; gap: 2px; height: 24px; margin-top: 8px; }
.dash-spark-bar { flex: 1; border-radius: 1px; opacity: 0.85; }

.dash-sub-grid { display: flex; gap: 16px; }
.dash-sub-cell { flex: 1; display: flex; align-items: center; justify-content: space-between; }
.dash-sub-label { font-size: 12px; color: #6b7280; display: block; }
.dash-sub-value { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.dash-sub-tag { display: flex; align-items: center; gap: 2px; font-size: 12px; padding: 2px 6px; border-radius: 4px; }
.dash-sub-tag.up { color: #16a34a; background: #f0fdf4; }
.dash-sub-tag.down { color: #ef4444; background: #fef2f2; }

.dash-pending-grid { display: flex; }
.dash-pending-cell { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px; }
.dash-pending-icon { position: relative; }
.dash-badge { position: absolute; top: -4px; right: -8px; min-width: 16px; height: 16px; border-radius: 8px; background: #ef4444; color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
.dash-pending-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

.dash-action-grid { display: flex; flex-wrap: wrap; }
.dash-action-cell { width: 33.33%; display: flex; flex-direction: column; align-items: center; padding: 12px 0; }
.dash-action-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.dash-action-label { font-size: 12px; color: #1a1a1a; margin-top: 8px; }

.dash-notice-list { display: flex; flex-direction: column; gap: 12px; }
.dash-notice { display: flex; align-items: flex-start; gap: 12px; }
.dash-notice-type { font-size: 10px; color: #6b7280; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; margin-top: 2px; }
.dash-notice-body { flex: 1; min-width: 0; }
.dash-notice-title { font-size: 14px; color: #1a1a1a; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dash-notice-time { font-size: 12px; color: #9ca3af; margin-top: 2px; }

.dash-tip { display: flex; align-items: flex-start; gap: 12px; background: linear-gradient(135deg, #fffbeb, #fff7ed); border: 1px solid rgba(245,158,11,0.3); }
.dash-tip-icon { width: 40px; height: 40px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.dash-tip-body { flex: 1; }
.dash-tip-title { font-size: 14px; font-weight: 500; color: #1a1a1a; display: block; }
.dash-tip-desc { font-size: 12px; color: #6b7280; margin-top: 4px; display: block; line-height: 1.5; }
.dash-tip-link { font-size: 12px; color: #d97706; margin-top: 8px; display: block; }
</style>
