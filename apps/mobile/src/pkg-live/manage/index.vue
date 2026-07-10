<template>
  <!-- 加载骨架屏 -->
  <view v-if="loading" class="skeleton-page">
    <view class="skeleton-nav" />
    <view class="skeleton-stats" />
    <view class="skeleton-card" />
    <view class="skeleton-card skeleton-card-sm" />
  </view>
  <!-- 错误状态 -->
  <view v-else-if="error" class="error-state">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="fetchData">重试</view>
  </view>
  <!-- 正常内容 -->
  <view v-else class="manage-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#1a1a1a" />
        </view>
        <text class="nav-title">直播管理</text>
      </view>
      <view class="nav-right">
        <view class="nav-icon-btn">
          <app-icon name="bell" :size="40" color="#666" />
        </view>
        <view class="nav-icon-btn">
          <app-icon name="settings" :size="40" color="#666" />
        </view>
      </view>
    </view>

    <view class="page-body">
      <!-- 数据概览卡片 横向滑动 -->
      <scroll-view scroll-x class="stats-scroll" :show-scrollbar="false">
        <view class="stats-row">
          <view
            v-for="stat in stats"
            :key="stat.id"
            class="stat-card"
            :style="{ background: stat.color }"
          >
            <app-icon :name="stat.icon" :size="40" color="rgba(255,255,255,0.85)" />
            <view class="stat-value">
              {{ stat.value }}<text class="stat-unit">{{ stat.unit }}</text>
            </view>
            <text class="stat-label">{{ stat.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 创建直播按钮 -->
      <view class="create-btn" @tap="goCreate">
        <app-icon name="plus" :size="40" color="#fff" />
        <text class="create-btn-text">创建直播</text>
      </view>

      <!-- 快捷入口 -->
      <view class="quick-grid">
        <view class="quick-item" @tap="goCreate">
          <view class="quick-icon" style="background: rgba(59,111,212,0.1)">
            <app-icon name="book-open" :size="40" color="#3b6fd4" />
          </view>
          <text class="quick-label">知识授课</text>
        </view>
        <view class="quick-item" @tap="goCreate">
          <view class="quick-icon" style="background: rgba(217,148,35,0.1)">
            <app-icon name="shopping-bag" :size="40" color="#d99423" />
          </view>
          <text class="quick-label">电商带货</text>
        </view>
        <view class="quick-item" @tap="goCreate">
          <view class="quick-icon" style="background: rgba(124,91,212,0.1)">
            <app-icon name="radio" :size="40" color="#7c5bd4" />
          </view>
          <text class="quick-label">快速开播</text>
        </view>
      </view>

      <!-- Tab切换 -->
      <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
        <view class="tab-row">
          <view
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-chip"
            :class="{ 'tab-chip-active': activeTab === tab.key }"
            @tap="activeTab = tab.key"
          >
            {{ tab.label }}
            <text
              v-if="tabCount(tab.key) > 0"
              class="tab-count"
              :class="{ 'tab-count-active': activeTab === tab.key }"
            >{{ tabCount(tab.key) }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 直播列表 -->
      <view v-if="filteredList.length > 0" class="live-list">
        <view
          v-for="item in filteredList"
          :key="item.id"
          class="live-card"
          :class="{ 'live-card-live': item.status === 'live' }"
        >
          <view class="live-main">
            <!-- 封面 -->
            <view class="live-cover">
              <app-icon name="video" :size="64" color="rgba(0,0,0,0.18)" />
              <view class="status-badge" :style="{ background: statusConfig[item.status].color }">
                <view v-if="item.status === 'live'" class="live-dot" />
                {{ statusConfig[item.status].label }}
              </view>
              <view class="type-badge">{{ item.type === 'knowledge' ? '知识' : '带货' }}</view>
            </view>

            <!-- 信息 -->
            <view class="live-info">
              <text class="live-title">{{ item.title }}</text>
              <view v-if="item.removed || item.selfOnly" class="live-badges">
                <text v-if="item.removed" class="live-mod-badge live-mod-removed" @tap.stop="showRemovedTip">已下架</text>
                <text v-else-if="item.selfOnly" class="live-mod-badge live-mod-selfonly" @tap.stop="showSelfOnlyTip">仅自己可见</text>
              </view>
              <view v-if="item.scheduledTime" class="live-time">
                <app-icon name="calendar" :size="24" color="#999" />
                <text class="live-time-text">{{ item.scheduledTime }}</text>
              </view>
              <view class="live-stats">
                <template v-if="item.status === 'preview'">
                  <view class="live-stat">
                    <app-icon name="bell" :size="24" color="#999" />
                    <text class="live-stat-text">{{ item.previewCount }}人预约</text>
                  </view>
                </template>
                <template v-else-if="item.status !== 'draft'">
                  <view class="live-stat">
                    <app-icon name="eye" :size="24" color="#999" />
                    <text class="live-stat-text">{{ formatNum(item.viewers) }}</text>
                  </view>
                  <view class="live-stat">
                    <app-icon name="clock" :size="24" color="#999" />
                    <text class="live-stat-text">{{ item.duration }}</text>
                  </view>
                  <view v-if="item.income > 0" class="live-stat">
                    <app-icon name="gift" :size="24" color="#d99423" />
                    <text class="live-stat-text live-stat-income">¥{{ item.income }}</text>
                  </view>
                </template>
              </view>
            </view>

            <!-- 操作 -->
            <view class="live-actions">
              <view class="more-btn" @tap="toggleActions(item.id)">
                <app-icon name="more-horizontal" :size="40" color="#999" />
              </view>
              <view
                v-if="item.status === 'live'"
                class="act-btn act-btn-live"
                @tap="enterLive(item)"
              >
                <app-icon name="play" :size="24" color="#fff" />
                <text class="act-btn-text">进入直播</text>
              </view>
              <view
                v-else-if="item.status === 'preview'"
                class="act-btn act-btn-live"
                @tap="startLive(item)"
              >
                <app-icon name="play" :size="24" color="#fff" />
                <text class="act-btn-text">开始直播</text>
              </view>
              <view
                v-else-if="item.status === 'draft'"
                class="act-btn act-btn-solid"
                @tap="goCreate"
              >
                <text class="act-btn-text">继续编辑</text>
              </view>
              <view
                v-else
                class="act-btn act-btn-ghost"
                @tap="viewData(item)"
              >
                <app-icon name="bar-chart-2" :size="24" color="#999" />
                <text class="act-btn-text act-btn-text-muted">数据</text>
              </view>
            </view>
          </view>

          <!-- 展开操作菜单 -->
          <view v-if="showActions === item.id" class="action-menu">
            <view class="menu-item" @tap="goCreate">
              <app-icon name="edit-3" :size="28" color="#666" />
              <text class="menu-text">编��</text>
            </view>
            <view class="menu-item" @tap="viewData(item)">
              <app-icon name="bar-chart-2" :size="28" color="#666" />
              <text class="menu-text">数据详情</text>
            </view>
            <view class="menu-item" @tap="showActions = null">
              <app-icon name="trash-2" :size="28" color="#C41E3A" />
              <text class="menu-text menu-text-danger">删除</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-box">
        <view class="empty-icon">
          <app-icon name="video" :size="128" color="rgba(0,0,0,0.15)" />
        </view>
        <text class="empty-title">暂无直播记录</text>
        <text class="empty-desc">开始你的第一场直播，与粉丝实时互动</text>
        <view class="empty-btn" @tap="goCreate">
          <app-icon name="plus" :size="32" color="#fff" />
          <text class="empty-btn-text">创建直播</text>
        </view>
      </view>
    </view>

    <!-- 悬浮快速开播按钮 -->
    <view class="fab" @tap="goCreate">
      <app-icon name="radio" :size="48" color="#fff" />
    </view>

    <view class="bottom-pad" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { goBack } from '@/utils/router'
import {
  liveApi,
  liveManageTabs,
  liveManageStatusConfig,
  type LiveManageItem,
  type LiveManageStat,
} from '@/lib/live-data'

// 三态UI
const loading = ref(true)
const error = ref('')

const stats = ref<LiveManageStat[]>([])
const list = ref<LiveManageItem[]>([])
const tabs = liveManageTabs
const statusConfig = liveManageStatusConfig

const activeTab = ref('all')
const showActions = ref<number | string | null>(null)

const filteredList = computed(() =>
  activeTab.value === 'all' ? list.value : list.value.filter((i) => i.status === activeTab.value),
)

function tabCount(key: string): number {
  return key === 'all' ? list.value.length : list.value.filter((i) => i.status === key).length
}

function formatNum(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await liveApi.getManageList()
    stats.value = res.stats
    list.value = res.list
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchData() })

function toggleActions(id: number | string) {
  showActions.value = showActions.value === id ? null : id
}

function goCreate() {
  uni.navigateTo({ url: '/pkg-live/create/index' })
}

function enterLive(item: LiveManageItem) {
  uni.navigateTo({ url: `/pkg-live/console/index?id=${item.id}` })
}

// 开始直播 — PUT /live/rooms/:id/start（房主本人·2026-07-11 拍板放开），成功跳中控台
const starting = ref(false)
function startLive(item: LiveManageItem) {
  if (starting.value) return
  uni.showModal({
    title: '开始直播',
    content: `确定现在开播「${item.title}」吗？`,
    confirmText: '开播',
    success: async (res) => {
      if (!res.confirm) return
      starting.value = true
      uni.showLoading({ title: '开播中…' })
      try {
        await liveApi.startLive(String(item.id))
        uni.hideLoading()
        uni.navigateTo({ url: `/pkg-live/console/index?id=${item.id}` })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: (e as Error)?.message || '开播失败，请重试', icon: 'none' })
      } finally {
        starting.value = false
      }
    },
  })
}

function viewData(item: LiveManageItem) {
  uni.navigateTo({ url: `/pkg-live/analytics/index?id=${item.id}` })
}

// 审核无感化（20260711 第八节）：SELF_ONLY / 已下架说明 + 申诉指引
function showSelfOnlyTip() {
  uni.showModal({
    title: '仅自己可见',
    content: '该直播间经系统复核暂时调整为仅自己可见，其他用户看不到，不影响您查看和管理。如有疑问，请联系客服申诉，我们会尽快为您复核。',
    showCancel: false,
    confirmText: '知道了',
  })
}

function showRemovedTip() {
  uni.showModal({
    title: '已下架',
    content: '该直播间因涉及违规内容已被下架，具体原因可在消息中心查看。如有疑问，请联系客服申诉。',
    showCancel: false,
    confirmText: '知道了',
  })
}
</script>

<style scoped>
/* 骨架屏 */
.skeleton-page {
  min-height: 100vh;
  background: #faf8f5;
  padding: 24rpx;
}
.skeleton-nav {
  height: 88rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}
.skeleton-stats {
  height: 160rpx;
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
}
.skeleton-card {
  height: 200rpx;
  background: #fff;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
}
.skeleton-card-sm {
  height: 120rpx;
}

/* 错误状态 */
.error-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #faf8f5;
  padding: 48rpx;
}
.error-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 32rpx;
}
.retry-btn {
  padding: 20rpx 64rpx;
  background: var(--brand);
  color: #fff;
  border-radius: 24rpx;
  font-size: 28rpx;
}

.manage-page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(12rpx);
  border-bottom: 2rpx solid #efe9e1;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.nav-icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.page-body {
  padding: 24rpx;
}

/* 数据概览卡片 */
.stats-scroll {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 24rpx;
}
.stats-row {
  display: inline-flex;
  gap: 20rpx;
  padding-bottom: 8rpx;
}
.stat-card {
  flex-shrink: 0;
  width: 224rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
}
.stat-value {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  margin-top: 16rpx;
  line-height: 1.1;
}
.stat-unit {
  font-size: 24rpx;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.85);
  margin-left: 4rpx;
}
.stat-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 6rpx;
}

/* 创建直播按钮 */
.create-btn {
  height: 96rpx;
  border-radius: 24rpx;
  background: linear-gradient(to right, var(--brand), #C9A96E);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.25);
}
.create-btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}

/* 快捷入口 */
.quick-grid {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}
.quick-item {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  border: 2rpx solid #efe9e1;
}
.quick-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick-label {
  font-size: 24rpx;
  color: #666;
}

/* Tab */
.tab-scroll {
  width: 100%;
  white-space: nowrap;
  margin-top: 32rpx;
  margin-bottom: 24rpx;
}
.tab-row {
  display: inline-flex;
  gap: 12rpx;
}
.tab-chip {
  flex-shrink: 0;
  padding: 14rpx 32rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: #888;
  background: #f0ebe3;
}
.tab-chip-active {
  background: var(--brand);
  color: #fff;
}
.tab-count {
  font-size: 22rpx;
  color: #999;
  margin-left: 8rpx;
}
.tab-count-active {
  color: rgba(255, 255, 255, 0.8);
}

/* 直播列表 */
.live-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.live-card {
  background: #fff;
  border-radius: 20rpx;
  border: 2rpx solid #efe9e1;
  overflow: hidden;
}
.live-card-live {
  border-color: rgba(196, 30, 58, 0.3);
  box-shadow: 0 0 0 2rpx rgba(196, 30, 58, 0.2);
}
.live-main {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
}
.live-cover {
  position: relative;
  width: 200rpx;
  height: 144rpx;
  border-radius: 16rpx;
  background: #f0ebe3;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-badge {
  position: absolute;
  top: 10rpx;
  left: 10rpx;
  display: flex;
  align-items: center;
  height: 32rpx;
  padding: 0 12rpx;
  border-radius: 8rpx;
  font-size: 18rpx;
  color: #fff;
}
.live-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #fff;
  margin-right: 8rpx;
}
.type-badge {
  position: absolute;
  bottom: 10rpx;
  right: 10rpx;
  height: 32rpx;
  padding: 0 12rpx;
  border-radius: 8rpx;
  font-size: 18rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
}
.live-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.live-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.live-badges {
  margin-top: 8rpx;
}
.live-mod-badge {
  display: inline-block;
  font-size: 20rpx;
  line-height: 1;
  padding: 6rpx 14rpx;
  border-radius: 14rpx;
}
.live-mod-selfonly {
  color: #8c8c8c;
  background: #f0f0f0;
  border: 1rpx solid #e0e0e0;
}
.live-mod-removed {
  color: #c4443a;
  background: #fdf0ef;
  border: 1rpx solid #f3d6d3;
}
.live-time {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 8rpx;
}
.live-time-text {
  font-size: 22rpx;
  color: #999;
}
.live-stats {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 8rpx;
}
.live-stat {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.live-stat-text {
  font-size: 22rpx;
  color: #999;
}
.live-stat-income {
  color: #d99423;
}
.live-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
}
.more-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.act-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 52rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
}
.act-btn-live {
  background: var(--brand);
}
.act-btn-outline {
  border: 2rpx solid #dcd3c7;
}
.act-btn-solid {
  background: var(--brand);
}
.act-btn-ghost {
  background: transparent;
}
.act-btn-text {
  font-size: 22rpx;
  color: #fff;
  white-space: nowrap;
}
.act-btn-text-dark {
  color: #1a1a1a;
}
.act-btn-text-muted {
  color: #999;
}

/* 展开操作菜单 */
.action-menu {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  border-top: 2rpx solid #efe9e1;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 56rpx;
  padding: 0 16rpx;
}
.menu-text {
  font-size: 24rpx;
  color: #666;
}
.menu-text-danger {
  color: var(--brand);
}

/* 空状态 */
.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 96rpx 0;
}
.empty-icon {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: #f0ebe3;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.empty-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}
.empty-desc {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 40rpx;
}
.empty-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 80rpx;
  padding: 0 40rpx;
  border-radius: 16rpx;
  background: var(--brand);
}
.empty-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}

/* 悬浮按钮 */
.fab {
  position: fixed;
  bottom: 48rpx;
  right: 24rpx;
  z-index: 30;
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.3);
}

.bottom-pad {
  height: 120rpx;
}
</style>
