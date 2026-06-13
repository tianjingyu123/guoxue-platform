<template>
  <view class="creator-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">创作者中心</text>
        <text class="header-refresh" :class="{ spin: refreshing }" @click="handleRefresh">🔄</text>
      </view>
    </view>

    <!-- 骨架屏 -->
    <template v-if="loading">
      <view class="sk-area">
        <view class="sk-grid">
          <view v-for="i in 4" :key="i" class="sk-card" />
        </view>
        <view class="sk-tabs" />
        <view v-for="i in 3" :key="'a'+i" class="sk-item" />
      </view>
    </template>

    <template v-else>
      <!-- 概览卡片 -->
      <view class="overview-grid">
        <view v-for="(item, idx) in overviewItems" :key="idx" class="ov-card" :class="item.gradient">
          <view class="ov-top">
            <text class="ov-icon">{{ item.icon }}</text>
            <view class="ov-growth" :class="item.growth >= 0 ? 'up' : 'down'">
              <text>{{ item.growth >= 0 ? '↑' : '↓' }}{{ Math.abs(item.growth) }}%</text>
            </view>
          </view>
          <text class="ov-value">{{ item.value }}</text>
          <text class="ov-label">{{ item.label }}</text>
        </view>
      </view>

      <!-- Tabs -->
      <view class="tab-bar">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <text>{{ tab.icon }} {{ tab.label }}</text>
        </view>
      </view>

      <!-- 内容 Tab -->
      <view v-if="activeTab === 'content'" class="tab-content">
        <view v-for="c in mockContents" :key="c.id" class="content-card">
          <view class="cc-preview" />
          <view class="cc-info">
            <view class="cc-top">
              <text class="cc-title">{{ c.title }}</text>
              <view class="cc-menu-btn" @click="showMenu = showMenu === c.id ? null : c.id">
                <text>⋯</text>
              </view>
              <view v-if="showMenu === c.id" class="cc-menu-popup">
                <text class="cc-menu-item">编辑</text>
                <text class="cc-menu-item del" @click="showMenu = null">删除</text>
              </view>
            </view>
            <view class="cc-tags">
              <text class="cc-status" :class="statusClass(c.status)">{{ statusLabel(c.status) }}</text>
              <text class="cc-type">{{ c.type === 'article' ? '文章' : '帖子' }}</text>
            </view>
            <view v-if="c.status === 'published'" class="cc-stats">
              <text>👁 {{ c.views }}</text>
              <text>❤️ {{ c.likes }}</text>
              <text>💬 {{ c.comments }}</text>
              <text v-if="c.revenue > 0" class="cc-rev">¥{{ c.revenue }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 数据 Tab -->
      <view v-if="activeTab === 'analytics'" class="tab-content">
        <view class="ana-card">
          <text class="ana-title">近30天阅读趋势</text>
          <view class="ana-chart">
            <view v-for="i in 30" :key="i" class="ana-bar" :class="{ today: i === 30 }" :style="{ height: (Math.random() * 80 + 20) + '%' }" />
          </view>
          <view class="ana-xlabel">
            <text>30天前</text>
            <text>今天</text>
          </view>
        </view>
        <view class="ana-card">
          <text class="ana-title">内容表现 TOP5</text>
          <view v-for="(c, idx) in mockContents.filter(c => c.status === 'published').slice(0, 5)" :key="c.id" class="top-item">
            <view class="top-rank" :class="'tr-' + (idx + 1)">{{ idx + 1 }}</view>
            <view class="top-info">
              <text class="top-title">{{ c.title }}</text>
              <text class="top-views">{{ c.views.toLocaleString() }} 阅读</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 收益 Tab -->
      <view v-if="activeTab === 'revenue'" class="tab-content">
        <view class="rev-hero">
          <text class="rev-label">累计收益</text>
          <text class="rev-total">¥{{ mockOverview.totalRevenue.toFixed(2) }}</text>
          <view class="rev-sub-row">
            <view>
              <text class="rev-sub-label">可提现</text>
              <text class="rev-sub-val">¥2,180.00</text>
            </view>
            <view>
              <text class="rev-sub-label">待结算</text>
              <text class="rev-sub-val">¥1,500.50</text>
            </view>
          </view>
          <view class="rev-withdraw-btn">提现</view>
        </view>

        <view class="ana-card">
          <text class="ana-title">收益趋势</text>
          <view class="ana-chart">
            <view v-for="i in 14" :key="i" class="ana-bar rev-bar" :style="{ height: (Math.random() * 80 + 20) + '%' }" />
          </view>
        </view>

        <view class="ana-card">
          <text class="ana-title">收益构成</text>
          <view v-for="item in revBreakdown" :key="item.name" class="rev-item">
            <text class="ri-name">{{ item.name }}</text>
            <text class="ri-val">¥{{ item.value }}</text>
            <view class="ri-bar"><view class="ri-fill" :style="{ background: item.color, width: item.percent + '%' }" /></view>
          </view>
        </view>
      </view>

      <!-- 互动 Tab -->
      <view v-if="activeTab === 'interaction'" class="tab-content">
        <view class="ana-card">
          <view class="ana-head">
            <text class="ana-title">新增粉丝</text>
            <text class="ana-extra">+12 本周</text>
          </view>
          <view v-for="f in mockFollowers" :key="f.id" class="fan-item">
            <view class="fan-avatar" />
            <view class="fan-info">
              <text class="fan-name">{{ f.name }}</text>
              <text class="fan-time">{{ f.followedAt }} 关注</text>
            </view>
            <text v-if="f.hasInteracted" class="fan-tag">已互动</text>
          </view>
        </view>

        <view class="ana-card">
          <text class="ana-title">互动统计</text>
          <view class="int-stats">
            <view class="is-item">
              <text class="is-num">156</text>
              <text class="is-label">收到点赞</text>
            </view>
            <view class="is-item">
              <text class="is-num">42</text>
              <text class="is-label">收到评论</text>
            </view>
            <view class="is-item">
              <text class="is-num">18</text>
              <text class="is-label">被转发</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- FAB -->
    <view class="fab" @click="goPage('/pages/editor/index')">
      <text>+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

type Tab = 'content' | 'analytics' | 'revenue' | 'interaction'

const activeTab = ref<Tab>('content')
const loading = ref(true)
const refreshing = ref(false)
const showMenu = ref<string | null>(null)

const mockOverview = { contents: 28, totalViews: 125600, totalRevenue: 3680.50, followers: 1256, contentsGrowth: 12, viewsGrowth: 8.5, revenueGrowth: 15.2, followersGrowth: 5.8 }

const mockContents = [
  { id: '1', type: 'article', title: '八字命理入门：天干地支的基础知识', status: 'published', publishedAt: '2024-01-15', views: 3280, likes: 156, comments: 42, revenue: 128.5 },
  { id: '2', type: 'post', title: '今日分享：如何看流年运势', status: 'published', publishedAt: '2024-01-14', views: 1560, likes: 89, comments: 23, revenue: 45.0 },
  { id: '3', type: 'article', title: '紫微斗数与八字的区别', status: 'reviewing', views: 0, likes: 0, comments: 0, revenue: 0 },
  { id: '4', type: 'article', title: '风水布局的基本原则', status: 'draft', views: 0, likes: 0, comments: 0, revenue: 0 },
]

const mockFollowers = [
  { id: '1', name: '命理爱好者', followedAt: '2024-01-15', hasInteracted: true },
  { id: '2', name: '易学新人', followedAt: '2024-01-14', hasInteracted: false },
  { id: '3', name: '周易研习', followedAt: '2024-01-13', hasInteracted: true },
]

const revBreakdown = [
  { name: '打赏收入', value: 1580, percent: 43, color: '#C41E3A' },
  { name: '付费内容', value: 1200, percent: 33, color: '#C9A96E' },
  { name: '课程分成', value: 900, percent: 24, color: '#1677FF' },
]

const tabs = [
  { key: 'content' as const, label: '内容', icon: '📄' },
  { key: 'analytics' as const, label: '数据', icon: '📊' },
  { key: 'revenue' as const, label: '收益', icon: '💰' },
  { key: 'interaction' as const, label: '互动', icon: '👥' },
]

const overviewItems = [
  { label: '内容数', value: mockOverview.contents + '', growth: mockOverview.contentsGrowth, icon: '📄', gradient: 'g-red' },
  { label: '总阅读', value: mockOverview.totalViews.toLocaleString(), growth: mockOverview.viewsGrowth, icon: '👁', gradient: 'g-blue' },
  { label: '总收益', value: '¥' + mockOverview.totalRevenue.toFixed(2), growth: mockOverview.revenueGrowth, icon: '💰', gradient: 'g-gold' },
  { label: '粉丝数', value: mockOverview.followers.toLocaleString(), growth: mockOverview.followersGrowth, icon: '👥', gradient: 'g-green' },
]

onMounted(() => { setTimeout(() => { loading.value = false }, 600) })

function handleRefresh() {
  refreshing.value = true
  setTimeout(() => { refreshing.value = false }, 1000)
}

function statusLabel(s: string) {
  const m: Record<string, string> = { published: '已发布', draft: '草稿', reviewing: '审核中', rejected: '未通过' }
  return m[s] || s
}

function statusClass(s: string) {
  const m: Record<string, string> = { published: 'st-green', draft: 'st-gray', reviewing: 'st-orange', rejected: 'st-red' }
  return m[s] || 'st-gray'
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.creator-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 140rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; flex: 1; }
.header-refresh { font-size: 32rpx; padding: 8rpx; }
.header-refresh.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.sk-area { padding: 16rpx 24rpx; }
.sk-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin-bottom: 20rpx; }
.sk-card { height: 140rpx; background: #E8E4DC; border-radius: 16rpx; }
.sk-tabs { height: 72rpx; background: #E8E4DC; border-radius: 16rpx; margin-bottom: 20rpx; }
.sk-item { height: 120rpx; background: #E8E4DC; border-radius: 16rpx; margin-bottom: 14rpx; }

.overview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; padding: 16rpx 24rpx; }
.ov-card { border-radius: 20rpx; padding: 20rpx 24rpx; border: 1px solid rgba(255,255,255,0.5); }
.g-red { background: linear-gradient(135deg, rgba(196,30,58,0.08), rgba(196,30,58,0.02)); }
.g-blue { background: linear-gradient(135deg, rgba(22,119,255,0.08), rgba(22,119,255,0.02)); }
.g-gold { background: linear-gradient(135deg, rgba(201,169,110,0.12), rgba(201,169,110,0.03)); }
.g-green { background: linear-gradient(135deg, rgba(82,196,26,0.08), rgba(82,196,26,0.02)); }
.ov-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ov-icon { font-size: 32rpx; }
.ov-growth { font-size: 20rpx; font-weight: 500; padding: 2rpx 8rpx; border-radius: 6rpx; }
.ov-growth.up { color: #52C41A; background: rgba(82,196,26,0.08); }
.ov-growth.down { color: #FF4D4F; background: rgba(255,77,79,0.08); }
.ov-value { font-size: 36rpx; font-weight: 700; color: #2C2C2C; display: block; }
.ov-label { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }

.tab-bar { display: flex; margin: 0 24rpx 16rpx; background: #fff; border-radius: 16rpx; padding: 6rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.tab-item { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 12rpx; font-size: 24rpx; font-weight: 500; color: #666; }
.tab-item.active { background: #C41E3A; color: #fff; }

.tab-content { padding: 0 24rpx 24rpx; }

.content-card { display: flex; gap: 14rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); position: relative; }
.cc-preview { width: 120rpx; height: 120rpx; border-radius: 14rpx; background: linear-gradient(135deg, rgba(196,30,58,0.1), rgba(201,169,110,0.1)); flex-shrink: 0; }
.cc-info { flex: 1; min-width: 0; }
.cc-top { display: flex; justify-content: space-between; align-items: flex-start; }
.cc-title { font-size: 26rpx; font-weight: 500; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; padding-right: 40rpx; }
.cc-menu-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #999; flex-shrink: 0; }
.cc-menu-popup { position: absolute; right: 20rpx; top: 56rpx; background: #fff; border-radius: 12rpx; padding: 8rpx 16rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.12); z-index: 10; }
.cc-menu-item { font-size: 24rpx; color: #333; display: block; padding: 8rpx 0; }
.cc-menu-item.del { color: #FF4D4F; }

.cc-tags { display: flex; gap: 8rpx; margin-top: 8rpx; }
.cc-status { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 6rpx; }
.st-green { background: rgba(82,196,26,0.08); color: #52C41A; }
.st-gray { background: #F5F1EB; color: #999; }
.st-orange { background: rgba(250,140,22,0.08); color: #FA8C16; }
.st-red { background: rgba(255,77,79,0.08); color: #FF4D4F; }
.cc-type { font-size: 20rpx; color: #BBB; padding: 2rpx 12rpx; }

.cc-stats { display: flex; gap: 20rpx; margin-top: 10rpx; font-size: 20rpx; color: #999; }
.cc-rev { color: #C9A96E; }

.ana-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.ana-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.ana-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.ana-extra { font-size: 22rpx; color: #C41E3A; }

.ana-chart { display: flex; align-items: flex-end; gap: 4rpx; height: 200rpx; }
.ana-bar { flex: 1; background: rgba(196,30,58,0.2); border-radius: 4rpx 4rpx 0 0; }
.ana-bar.today { background: #C41E3A; }
.ana-bar.rev-bar { background: #C9A96E; }
.ana-xlabel { display: flex; justify-content: space-between; font-size: 20rpx; color: #BBB; margin-top: 8rpx; }

.top-item { display: flex; align-items: center; gap: 14rpx; padding: 14rpx 0; }
.top-item + .top-item { border-top: 1px solid #F5F1EB; }
.top-rank { width: 48rpx; height: 48rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; flex-shrink: 0; }
.tr-1 { background: #C9A96E; color: #fff; }
.tr-2 { background: #A0A0A0; color: #fff; }
.tr-3 { background: #CD7F32; color: #fff; }
.tr-4, .tr-5 { background: #F0EDE5; color: #999; }
.top-info { flex: 1; min-width: 0; }
.top-title { font-size: 24rpx; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-views { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }

.rev-hero { background: linear-gradient(135deg, #C9A96E, #B8956A); border-radius: 20rpx; padding: 28rpx; margin-bottom: 16rpx; }
.rev-label { font-size: 24rpx; color: rgba(255,255,255,0.7); display: block; }
.rev-total { font-size: 56rpx; font-weight: 700; color: #fff; display: block; margin: 8rpx 0 16rpx; }
.rev-sub-row { display: flex; gap: 40rpx; margin-bottom: 20rpx; }
.rev-sub-label { font-size: 22rpx; color: rgba(255,255,255,0.6); display: block; }
.rev-sub-val { font-size: 28rpx; font-weight: 600; color: #fff; display: block; }
.rev-withdraw-btn { width: 100%; padding: 16rpx 0; border-radius: 14rpx; background: rgba(255,255,255,0.2); backdrop-filter: blur(4rpx); color: #fff; font-size: 28rpx; font-weight: 500; text-align: center; }

.rev-item { padding: 10rpx 0; }
.ri-name { font-size: 24rpx; color: #666; display: inline-block; width: 140rpx; }
.ri-val { font-size: 24rpx; color: #2C2C2C; font-weight: 500; margin-right: 14rpx; }
.ri-bar { display: inline-block; height: 8rpx; background: #F0EDE5; border-radius: 4rpx; width: calc(100% - 260rpx); vertical-align: middle; }
.ri-fill { height: 100%; border-radius: 4rpx; }

.fan-item { display: flex; align-items: center; gap: 14rpx; padding: 14rpx 0; }
.fan-item + .fan-item { border-top: 1px solid #F5F1EB; }
.fan-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: linear-gradient(135deg, rgba(196,30,58,0.12), rgba(201,169,110,0.12)); flex-shrink: 0; }
.fan-info { flex: 1; }
.fan-name { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.fan-time { font-size: 20rpx; color: #BBB; margin-top: 4rpx; display: block; }
.fan-tag { font-size: 20rpx; color: #52C41A; background: rgba(82,196,26,0.08); padding: 4rpx 14rpx; border-radius: 8rpx; }

.int-stats { display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; }
.is-num { font-size: 40rpx; font-weight: 700; color: #2C2C2C; display: block; }
.is-label { font-size: 22rpx; color: #999; margin-top: 6rpx; display: block; }

.fab { position: fixed; right: 32rpx; bottom: 100rpx; width: 96rpx; height: 96rpx; border-radius: 50%; background: #C41E3A; color: #fff; font-size: 48rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.35); }
</style>
