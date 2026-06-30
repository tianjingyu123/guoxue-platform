<template>
  <view class="creator-page">
    <!-- 顶部导航 -->
    <view class="cc-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="cc-header-inner">
        <view class="cc-icon-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="cc-title">创作者中心</text>
        <view class="cc-icon-btn" @tap="go('/videos/creator/settings')">
          <AppIcon name="settings" :size="20" color="#999" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="cc-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- 加载态 -->
      <view v-if="loading" class="cc-state">
        <text class="cc-state-txt">加载中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="errMsg" class="cc-state">
        <AppIcon name="alert-circle" :size="40" color="#ccc" />
        <text class="cc-state-txt">{{ errMsg }}</text>
        <view class="cc-state-btn" @tap="loadAll">重试</view>
      </view>

      <template v-else-if="stats">
      <!-- 创作者信息卡片 -->
      <view class="cc-profile">
        <view class="cc-profile-top">
          <image lazy-load class="cc-avatar" :src="profile.avatar || ('https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(profile.nickname))" mode="aspectFill" />
          <view class="cc-profile-info">
            <view class="cc-name-row">
              <text class="cc-name">{{ profile.nickname }}</text>
            </view>
            <text class="cc-followers">{{ fmt(stats.followers) }} 粉丝</text>
          </view>
          <view class="cc-publish-btn" @tap="go('/videos/publish')">
            <AppIcon name="plus" :size="16" color="#c41e3a" />
            <text class="cc-publish-txt">发布</text>
          </view>
        </view>

        <!-- 核心数据 -->
        <view class="cc-core-stats">
          <view class="cc-core-item">
            <text class="cc-core-num">{{ fmt(stats.totalViews) }}</text>
            <text class="cc-core-label">总播放</text>
          </view>
          <view class="cc-core-item">
            <text class="cc-core-num">{{ fmt(stats.totalLikes) }}</text>
            <text class="cc-core-label">总点赞</text>
          </view>
          <view class="cc-core-item">
            <text class="cc-core-num">{{ stats.totalSales }}</text>
            <text class="cc-core-label">带货商品</text>
          </view>
          <view class="cc-core-item">
            <text class="cc-core-num">¥{{ fmt(stats.totalEarnings) }}</text>
            <text class="cc-core-label">累计收益</text>
          </view>
        </view>
      </view>

      <!-- Tab切换 -->
      <view class="cc-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.id"
          class="cc-tab"
          :class="{ 'cc-tab-active': activeTab === tab.id }"
          @tap="activeTab = tab.id"
        >
          <AppIcon :name="tab.icon" :size="16" :color="activeTab === tab.id ? '#c41e3a' : '#999'" />
          <text class="cc-tab-label">{{ tab.label }}</text>
          <view v-if="activeTab === tab.id" class="cc-tab-line" />
        </view>
      </view>

      <!-- 数据概览 -->
      <view v-if="activeTab === 'overview'" class="cc-panel">
        <!-- 数据总览（「较上周」趋势缺每日快照支撑，不编造，仅展示真实累计）-->
        <view class="cc-card">
          <view class="cc-card-head">
            <text class="cc-card-title">数据总览</text>
          </view>
          <view class="cc-trend-grid">
            <view class="cc-trend-item">
              <view>
                <text class="cc-trend-label">总播放量</text>
                <text class="cc-trend-num">{{ fmt(stats.totalViews) }}</text>
              </view>
            </view>
            <view class="cc-trend-item">
              <view>
                <text class="cc-trend-label">粉丝数</text>
                <text class="cc-trend-num">{{ fmt(stats.followers) }}</text>
              </view>
            </view>
            <view class="cc-trend-item">
              <view>
                <text class="cc-trend-label">互动量</text>
                <text class="cc-trend-num">{{ fmt(stats.totalLikes + stats.totalComments) }}</text>
              </view>
            </view>
            <view class="cc-trend-item">
              <view>
                <text class="cc-trend-label">带货商品</text>
                <text class="cc-trend-num">{{ stats.totalSales }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 带货数据 -->
        <view class="cc-card">
          <view class="cc-card-head">
            <text class="cc-card-title">带货数据</text>
            <view class="cc-link" @tap="go('/videos/creator/sales')">
              <text>查看详情</text>
              <AppIcon name="chevron-right" :size="14" color="#c41e3a" />
            </view>
          </view>
          <view v-if="hasBizStats" class="cc-sales-grid">
            <view class="cc-sales-item cc-sales-red">
              <AppIcon name="shopping-bag" :size="20" color="#c41e3a" />
              <text class="cc-sales-num">{{ stats.totalSales }}</text>
              <text class="cc-sales-label">带货商品</text>
            </view>
            <view class="cc-sales-item cc-sales-amber">
              <AppIcon name="dollar-sign" :size="20" color="#d97706" />
              <text class="cc-sales-num">¥{{ fmt(stats.totalGMV) }}</text>
              <text class="cc-sales-label">带货GMV</text>
            </view>
            <view class="cc-sales-item cc-sales-green">
              <AppIcon name="trending-up" :size="20" color="#22c55e" />
              <text class="cc-sales-num">{{ stats.conversionRate }}%</text>
              <text class="cc-sales-label">转化率</text>
            </view>
          </view>
          <view v-else class="cc-biz-empty">
            <text class="cc-biz-num">{{ stats.totalSales }}</text>
            <text class="cc-biz-label">已关联带货商品</text>
            <text class="cc-biz-tip">成交额 / 转化率统计即将开放</text>
          </view>
        </view>

        <!-- 热门作品 -->
        <view class="cc-card">
          <view class="cc-card-head">
            <text class="cc-card-title">热门作品</text>
            <view class="cc-link" @tap="activeTab = 'videos'">
              <text>查看全部</text>
              <AppIcon name="chevron-right" :size="14" color="#c41e3a" />
            </view>
          </view>
          <view class="cc-hot-list">
            <view v-for="(video, index) in videos.slice(0, 2)" :key="video.id" class="cc-hot-item" @tap="go('/video/' + video.id)">
              <view class="cc-hot-cover">
                <image lazy-load :src="video.cover" mode="aspectFill" class="cc-hot-img" />
                <view class="cc-hot-mask">
                  <AppIcon name="play" :size="24" color="#ffffff" :fill="true" />
                </view>
                <text class="cc-hot-rank">#{{ index + 1 }}</text>
              </view>
              <view class="cc-hot-info">
                <text class="cc-hot-title">{{ video.title }}</text>
                <view class="cc-hot-stats">
                  <view class="cc-hot-stat"><AppIcon name="eye" :size="14" color="#999" /><text>{{ fmt(video.views) }}</text></view>
                  <view class="cc-hot-stat"><AppIcon name="heart" :size="14" color="#999" /><text>{{ fmt(video.likes) }}</text></view>
                </view>
                <view v-if="video.products.length > 0" class="cc-hot-sale">
                  <AppIcon name="shopping-bag" :size="14" color="#c41e3a" />
                  <text class="cc-hot-sale-txt">{{ video.sales }}单 · ¥{{ fmt(video.gmv) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 我的作品 -->
      <view v-if="activeTab === 'videos'" class="cc-panel">
        <view v-if="videos.length === 0" class="cc-empty">
          <AppIcon name="file-video" :size="40" color="#ccc" />
          <text class="cc-empty-txt">还没有作品，去发布第一个视频吧</text>
          <view class="cc-empty-btn" @tap="go('/videos/publish')">发布视频</view>
        </view>
        <view v-for="video in videos" :key="video.id" class="cc-card cc-video-card">
          <view class="cc-video-row">
            <view class="cc-video-cover">
              <image lazy-load :src="video.cover" mode="aspectFill" class="cc-hot-img" />
              <view class="cc-hot-mask">
                <AppIcon name="play" :size="24" color="#ffffff" :fill="true" />
              </view>
            </view>
            <view class="cc-video-info">
              <text class="cc-hot-title">{{ video.title }}</text>
              <text class="cc-video-time">{{ video.publishTime }}</text>
              <view class="cc-video-metrics">
                <view class="cc-metric"><text class="cc-metric-num">{{ fmt(video.views) }}</text><text class="cc-metric-label">播放</text></view>
                <view class="cc-metric"><text class="cc-metric-num">{{ fmt(video.likes) }}</text><text class="cc-metric-label">点赞</text></view>
                <view class="cc-metric"><text class="cc-metric-num">{{ video.comments }}</text><text class="cc-metric-label">评论</text></view>
                <view class="cc-metric"><text class="cc-metric-num">{{ video.shares }}</text><text class="cc-metric-label">分享</text></view>
              </view>
              <view v-if="video.products.length > 0" class="cc-video-foot">
                <view class="cc-video-foot-left">
                  <AppIcon name="shopping-bag" :size="16" color="#c41e3a" />
                  <text class="cc-video-foot-txt">{{ video.products.length }}件商品</text>
                </view>
                <view class="cc-video-foot-right">
                  <text class="cc-foot-sale">{{ video.sales }}单</text>
                  <text class="cc-foot-gmv"> · ¥{{ fmt(video.gmv) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 商品管理 -->
      <view v-if="activeTab === 'products'" class="cc-panel">
        <view class="cc-card">
          <view class="cc-prod-head">
            <view>
              <text class="cc-card-title">可带货商品库</text>
              <text class="cc-prod-sub">共 {{ products.length }} 件平台商品可选</text>
            </view>
            <view class="cc-add-btn" @tap="go('/videos/creator/products/add')">
              <AppIcon name="info" :size="16" color="#ffffff" />
              <text class="cc-add-txt">带货说明</text>
            </view>
          </view>
        </view>
        <view v-if="products.length === 0" class="cc-empty">
          <AppIcon name="package" :size="40" color="#ccc" />
          <text class="cc-empty-txt">平台暂无可带货商品</text>
        </view>
        <view class="cc-prod-list">
          <view v-for="product in products" :key="product.id" class="cc-card cc-prod-card">
            <view class="cc-prod-row">
              <image lazy-load :src="product.image" mode="aspectFill" class="cc-prod-img" />
              <view class="cc-prod-info">
                <text class="cc-prod-name">{{ product.name }}</text>
                <view class="cc-prod-price-row">
                  <text class="cc-prod-price">¥{{ product.price }}</text>
                  <text class="cc-prod-commission">{{ product.commission }}%佣金</text>
                </view>
                <view class="cc-prod-meta">
                  <text>销量 {{ product.sales }}</text>
                  <text>库存 {{ product.stock }}</text>
                </view>
              </view>
              <view class="cc-prod-action">
                <view class="cc-prod-promote" @tap="go('/videos/publish?product=' + product.id)">
                  <text>去带货</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 收益中心 -->
      <view v-if="activeTab === 'earnings'" class="cc-panel">
        <!-- 收益概览 -->
        <view class="cc-card cc-earn-card">
          <view class="cc-earn-head">
            <view>
              <text class="cc-earn-label">累计收益 (元)</text>
              <text class="cc-earn-total">¥{{ stats.totalEarnings.toFixed(2) }}</text>
            </view>
            <view class="cc-withdraw-btn" @tap="go('/videos/creator/withdraw')">
              <text>提现</text>
            </view>
          </view>
          <view class="cc-earn-grid">
            <view class="cc-earn-sub">
              <text class="cc-earn-sub-label">待结算</text>
              <text class="cc-earn-sub-num">¥{{ stats.pendingEarnings.toFixed(2) }}</text>
            </view>
            <view class="cc-earn-sub">
              <text class="cc-earn-sub-label">已提现</text>
              <text class="cc-earn-sub-num">¥{{ stats.withdrawnEarnings.toFixed(2) }}</text>
            </view>
          </view>
        </view>

        <!-- 收益明细 -->
        <view class="cc-card">
          <view class="cc-card-head">
            <text class="cc-card-title">收益明细</text>
            <view class="cc-link" @tap="go('/videos/creator/earnings/history')">
              <text>全部记录</text>
              <AppIcon name="chevron-right" :size="14" color="#c41e3a" />
            </view>
          </view>
          <view class="cc-earn-list">
            <view v-if="earningsPreview.length === 0" class="cc-earn-empty">
              <text class="cc-earn-empty-txt">暂无收益记录</text>
            </view>
            <view v-for="(item, index) in earningsPreview" :key="index" class="cc-earn-item">
              <view>
                <text class="cc-earn-type">{{ item.type }}</text>
                <text class="cc-earn-detail">{{ item.product }} · {{ item.time }}</text>
              </view>
              <text class="cc-earn-amount">+¥{{ item.amount.toFixed(2) }}</text>
            </view>
          </view>
        </view>

        <!-- 收益规则 -->
        <view class="cc-card">
          <text class="cc-card-title cc-rule-title">收益规则</text>
          <view class="cc-rule-list">
            <text class="cc-rule">1. 带货佣金：按商品设定的佣金比例结算</text>
            <text class="cc-rule">2. 结算周期：订单确认收货后7天自动结算</text>
            <text class="cc-rule">3. 提现门槛：满100元可申请提现</text>
            <text class="cc-rule">4. 到账时间：提现申请后1-3个工作日到账</text>
          </view>
        </view>
      </view>

      <view class="cc-bottom-pad" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, goBack } from '@/utils/router'
import {
  creatorApi,
  formatCreatorNumber,
  type CreatorOverview,
  type CreatorVideo,
  type CreatorProduct,
  type CreatorEarningItem,
} from '@/lib/creator-data'

const statusBarHeight = ref(0)
const activeTab = ref<'overview' | 'videos' | 'products' | 'earnings'>('overview')

const tabs = [
  { id: 'overview' as const, label: '数据概览', icon: 'bar-chart-3' },
  { id: 'videos' as const, label: '我的作品', icon: 'file-video' },
  { id: 'products' as const, label: '商品管理', icon: 'package' },
  { id: 'earnings' as const, label: '收益中心', icon: 'wallet' },
]

const fmt = formatCreatorNumber

// ===== 数据 + 三态 =====
const loading = ref(true)
const errMsg = ref('')
const stats = ref<CreatorOverview | null>(null)
const videos = ref<CreatorVideo[]>([])
const products = ref<CreatorProduct[]>([])
const earningsPreview = ref<CreatorEarningItem[]>([])
const profile = ref({ nickname: '创作者', avatar: '', bio: '' })

// 带货 GMV/转化率后端暂无统计支撑（恒 0）→ 是否有任一可展示
const hasBizStats = computed(() => !!stats.value && (stats.value.totalGMV > 0 || stats.value.conversionRate > 0))

async function loadAll() {
  loading.value = true
  errMsg.value = ''
  try {
    const [ov, vs, ps, ep, st] = await Promise.all([
      creatorApi.getOverview(),
      creatorApi.getMyVideos(),
      creatorApi.getProducts(),
      creatorApi.getEarningsPreview(),
      creatorApi.getSettings(),
    ])
    stats.value = ov
    videos.value = vs
    products.value = ps
    earningsPreview.value = ep
    if (st?.profile) profile.value = { nickname: st.profile.nickname || '创作者', avatar: st.profile.avatar, bio: st.profile.bio }
  } catch (e: any) {
    errMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function go(url: string) {
  navigateTo(url)
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
  loadAll()
})
</script>

<style scoped>
.creator-page {
  min-height: 100vh;
  background: #f5f5f5;
}
.cc-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #ffffff;
  border-bottom: 1px solid #eee;
}
.cc-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
}
.cc-icon-btn {
  padding: 4px;
}
.cc-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}
.cc-scroll {
  height: 100vh;
  box-sizing: border-box;
}
/* 创作者信息卡片 */
.cc-profile {
  background: linear-gradient(135deg, var(--brand), #d94452);
  color: #ffffff;
  padding: 16px;
}
.cc-profile-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.cc-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
}
.cc-profile-info {
  flex: 1;
}
.cc-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cc-name {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}
.cc-badge {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}
.cc-followers {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-top: 2px;
}
.cc-publish-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #ffffff;
  border-radius: 999px;
}
.cc-publish-txt {
  color: var(--brand);
  font-size: 14px;
  font-weight: 500;
}
.cc-core-stats {
  display: flex;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
}
.cc-core-item {
  flex: 1;
  text-align: center;
}
.cc-core-num {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
}
.cc-core-label {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin-top: 2px;
}
/* Tab */
.cc-tabs {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-bottom: 1px solid #eee;
}
.cc-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #999;
  position: relative;
}
.cc-tab-active {
  color: var(--brand);
}
.cc-tab-label {
  font-size: 14px;
}
.cc-tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 2px;
  background: var(--brand);
  border-radius: 999px;
}
/* 面板 */
.cc-panel {
  padding: 16px;
}
.cc-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #f0f0f0;
}
.cc-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.cc-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}
.cc-card-sub {
  font-size: 12px;
  color: #999;
}
.cc-link {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--brand);
}
/* 趋势 */
.cc-trend-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.cc-trend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
}
.cc-trend-label {
  display: block;
  color: #999;
  font-size: 12px;
}
.cc-trend-num {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}
.cc-trend-tag {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  font-weight: 500;
}
.cc-up {
  color: #22c55e;
}
.cc-down {
  color: #ef4444;
}
/* 带货数据 */
.cc-sales-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.cc-sales-item {
  text-align: center;
  padding: 12px;
  border-radius: 8px;
}
.cc-sales-red {
  background: rgba(196, 30, 58, 0.05);
}
.cc-sales-amber {
  background: rgba(217, 119, 6, 0.05);
}
.cc-sales-green {
  background: rgba(34, 197, 94, 0.05);
}
.cc-sales-num {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 4px;
}
.cc-sales-label {
  display: block;
  color: #999;
  font-size: 12px;
}
/* 热门作品 */
.cc-hot-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cc-hot-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
}
.cc-hot-cover {
  position: relative;
  width: 80px;
  height: 112px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.cc-hot-img {
  width: 100%;
  height: 100%;
}
.cc-hot-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cc-hot-rank {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
}
.cc-hot-info {
  flex: 1;
  min-width: 0;
  padding: 4px 0;
}
.cc-hot-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cc-hot-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.cc-hot-stat {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: #999;
}
.cc-hot-sale {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}
.cc-hot-sale-txt {
  font-size: 12px;
  color: var(--brand);
  font-weight: 500;
}
/* 我的作品 */
.cc-video-card {
  padding: 12px;
}
.cc-video-row {
  display: flex;
  gap: 12px;
}
.cc-video-cover {
  position: relative;
  width: 96px;
  height: 128px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.cc-video-info {
  flex: 1;
  min-width: 0;
}
.cc-video-time {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.cc-video-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 12px;
}
.cc-metric {
  text-align: center;
}
.cc-metric-num {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
}
.cc-metric-label {
  display: block;
  font-size: 12px;
  color: #999;
}
.cc-video-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
.cc-video-foot-left {
  display: flex;
  align-items: center;
  gap: 4px;
}
.cc-video-foot-txt {
  font-size: 12px;
  color: #999;
}
.cc-foot-sale {
  font-size: 12px;
  color: var(--brand);
  font-weight: 500;
}
.cc-foot-gmv {
  font-size: 12px;
  color: #999;
}
/* 商品管理 */
.cc-prod-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cc-prod-sub {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.cc-add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--brand);
  border-radius: 999px;
}
.cc-add-txt {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
}
.cc-prod-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cc-prod-card {
  padding: 12px;
  margin-bottom: 0;
}
.cc-prod-row {
  display: flex;
  gap: 12px;
}
.cc-prod-img {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  flex-shrink: 0;
}
.cc-prod-info {
  flex: 1;
  min-width: 0;
}
.cc-prod-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cc-prod-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.cc-prod-price {
  color: var(--brand);
  font-weight: 700;
  font-size: 15px;
}
.cc-prod-commission {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}
.cc-prod-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}
.cc-prod-action {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.cc-prod-promote {
  padding: 4px 12px;
  background: rgba(196, 30, 58, 0.1);
  color: var(--brand);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
/* 收益中心 */
.cc-earn-card {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.1), rgba(217, 119, 6, 0.05));
}
.cc-earn-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.cc-earn-label {
  display: block;
  color: #999;
  font-size: 14px;
}
.cc-earn-total {
  display: block;
  font-size: 30px;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 4px;
}
.cc-withdraw-btn {
  padding: 8px 16px;
  background: var(--brand);
  color: #ffffff;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
}
.cc-earn-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.cc-earn-sub {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  padding: 12px;
}
.cc-earn-sub-label {
  display: block;
  color: #999;
  font-size: 12px;
}
.cc-earn-sub-num {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 2px;
}
.cc-earn-list {
  display: flex;
  flex-direction: column;
}
.cc-earn-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}
.cc-earn-item:last-child {
  border-bottom: 0;
}
.cc-earn-type {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}
.cc-earn-detail {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.cc-earn-amount {
  color: #22c55e;
  font-weight: 500;
}
.cc-rule-title {
  display: block;
  margin-bottom: 8px;
}
.cc-rule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cc-rule {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}
.cc-bottom-pad {
  height: 80px;
}
/* 三态 + 空态 + 降级 */
.cc-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 32px; }
.cc-state-txt { font-size: 14px; color: #999; }
.cc-state-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); color: #ffffff; border-radius: 999px; font-size: 14px; }
.cc-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 32px; }
.cc-empty-txt { font-size: 14px; color: #999; }
.cc-empty-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); color: #ffffff; border-radius: 999px; font-size: 14px; }
.cc-biz-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px; background: rgba(0, 0, 0, 0.02); border-radius: 8px; }
.cc-biz-num { font-size: 28px; font-weight: 700; color: var(--brand); }
.cc-biz-label { font-size: 13px; color: #1a1a1a; }
.cc-biz-tip { font-size: 12px; color: #999; }
.cc-earn-empty { padding: 24px; text-align: center; }
.cc-earn-empty-txt { font-size: 13px; color: #999; }
</style>
