<template>
  <view class="notices-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-row">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="#1F2937" />
        </view>
        <text class="nav-title">平台公告</text>
        <view class="nav-placeholder" />
      </view>
      <!-- 筛选栏 -->
      <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
        <view class="filter-row">
          <view
            v-for="opt in filterOptions"
            :key="opt.value"
            class="filter-chip"
            :class="{ active: filter === opt.value }"
            @tap="setFilter(opt.value)"
          >
            <text class="filter-text" :class="{ active: filter === opt.value }">{{ opt.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 列表 -->
    <view class="list-main">
      <!-- 骨架屏 -->
      <template v-if="loading">
        <view v-for="i in 4" :key="i" class="notice-card skeleton-card">
          <view class="sk-cover" />
          <view class="sk-body">
            <view class="sk-line w70" />
            <view class="sk-line w100" />
            <view class="sk-line w50" />
          </view>
        </view>
      </template>

      <!-- 空态 -->
      <view v-else-if="notices.length === 0" class="empty-state">
        <app-icon name="megaphone" :size="96" color="#D1D5DB" />
        <text class="empty-title">暂无公告</text>
        <text class="empty-desc">当前没有任何公告信息</text>
      </view>

      <!-- 公告卡片 -->
      <template v-else>
        <view
          v-for="notice in notices"
          :key="notice.id"
          class="notice-card"
          :class="{ unread: !notice.isRead }"
          @tap="goDetail(notice.id)"
        >
          <view class="card-inner">
            <image lazy-load
              v-if="notice.cover"
              :src="notice.cover"
              class="card-cover"
              mode="aspectFill"
            />
            <view class="card-content">
              <!-- 标题行 -->
              <view class="card-title-row">
                <app-icon v-if="notice.isPinned" name="pin" :size="28" color="#C41E3A" />
                <view v-if="!notice.isRead" class="unread-dot" />
                <text class="card-title" :class="{ read: notice.isRead }">{{ notice.title }}</text>
              </view>
              <!-- 摘要 -->
              <text class="card-summary">{{ notice.summary }}</text>
              <!-- 底部信息 -->
              <view class="card-footer">
                <view class="footer-left">
                  <view
                    class="type-badge"
                    :style="{ backgroundColor: typeColor(notice.type) + '20', color: typeColor(notice.type) }"
                  >
                    <text class="type-badge-text" :style="{ color: typeColor(notice.type) }">{{ typeLabel(notice.type) }}</text>
                  </view>
                  <text class="footer-time">{{ formatTime(notice.publishedAt) }}</text>
                </view>
                <view class="footer-right">
                  <app-icon name="eye" :size="24" color="#9CA3AF" />
                  <text class="footer-views">{{ formatViews(notice.viewCount) }}</text>
                  <app-icon name="chevron-right" :size="24" color="#9CA3AF" />
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="hasMore" class="load-more" @tap="handleLoadMore">
          <view v-if="loadingMore" class="load-more-inner">
            <view class="spinner" />
            <text class="load-more-text">加载中...</text>
          </view>
          <text v-else class="load-more-text">点击加载更多</text>
        </view>
        <text v-else class="load-end">已加载全部公告</text>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateBack, navigateTo } from '@/utils/router'

type NoticeType = 'system' | 'update' | 'activity' | 'maintenance' | 'policy'

interface NoticeItem {
  id: number
  type: NoticeType
  title: string
  summary: string
  cover?: string
  isPinned: boolean
  isRead: boolean
  publishedAt: string
  viewCount: number
}

const statusBarHeight = ref(20)

const filterOptions: { value: NoticeType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'system', label: '系统' },
  { value: 'update', label: '更新' },
  { value: 'activity', label: '活动' },
  { value: 'maintenance', label: '维护' },
  { value: 'policy', label: '政策' },
]

const TYPE_LABELS: Record<NoticeType, string> = {
  system: '系统',
  update: '更新',
  activity: '活动',
  maintenance: '维护',
  policy: '政策',
}
const TYPE_COLORS: Record<NoticeType, string> = {
  system: '#2563EB',
  update: '#16A34A',
  activity: '#EA580C',
  maintenance: '#CA8A04',
  policy: '#C41E3A',
}
function typeLabel(t: NoticeType) {
  return TYPE_LABELS[t] || '公告'
}
function typeColor(t: NoticeType) {
  return TYPE_COLORS[t] || '#C41E3A'
}

const ALL_NOTICES: NoticeItem[] = [
  {
    id: 1,
    type: 'system',
    title: '关于平台账号实名认证升级的通知',
    summary: '为保障用户账号安全，平台将于近期升级实名认证体系，请各位用户及时完成认证以免影响正常使用。',
    cover: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80',
    isPinned: true,
    isRead: false,
    publishedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    viewCount: 23568,
  },
  {
    id: 2,
    type: 'update',
    title: 'v3.2.0 版本更新：全新国学排盘工具上线',
    summary: '本次更新新增六爻、梅花易数等多款排盘工具，优化了排盘结果展示，修复了若干已知问题。',
    isPinned: true,
    isRead: false,
    publishedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    viewCount: 15200,
  },
  {
    id: 3,
    type: 'activity',
    title: '双十一国学节火热进行中，海量优惠等你来',
    summary: '11月1日至11日，全场课程低至5折，名师一对一咨询限时特惠，更有国学币充值返利活动。',
    cover: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&q=80',
    isPinned: false,
    isRead: true,
    publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    viewCount: 8900,
  },
  {
    id: 4,
    type: 'maintenance',
    title: '系统维护公告：11月15日凌晨维护通知',
    summary: '为提升服务质量，平台将于11月15日凌晨2:00-4:00进行系统维护，期间部分功能可能无法使用。',
    isPinned: false,
    isRead: true,
    publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    viewCount: 5600,
  },
  {
    id: 5,
    type: 'policy',
    title: '《用户服务协议》与《隐私政策》更新说明',
    summary: '我们更新了用户服务协议与隐私政策的部分条款，请您仔细阅读，继续使用即代表您同意更新后的条款。',
    isPinned: false,
    isRead: true,
    publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    viewCount: 3400,
  },
  {
    id: 6,
    type: 'system',
    title: '关于打击违规内容与虚假宣传的专项治理公告',
    summary: '平台近期开展专项治理行动，对违规内容、虚假宣传等行为进行严厉打击，欢迎广大用户监督举报。',
    isPinned: false,
    isRead: true,
    publishedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    viewCount: 2100,
  },
]

const notices = ref<NoticeItem[]>([])
const loading = ref(true)
const filter = ref<NoticeType | 'all'>('all')
const loadingMore = ref(false)
const hasMore = ref(false)

function loadData() {
  loading.value = true
  setTimeout(() => {
    const list = filter.value === 'all'
      ? ALL_NOTICES
      : ALL_NOTICES.filter((n) => n.type === filter.value)
    notices.value = list
    hasMore.value = false
    loading.value = false
  }, 300)
}

function setFilter(v: NoticeType | 'all') {
  filter.value = v
  loadData()
}

function handleLoadMore() {
  if (loadingMore.value || !hasMore.value) return
}

function formatTime(timeStr: string) {
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatViews(v: number) {
  return v > 10000 ? `${(v / 10000).toFixed(1)}万` : String(v)
}

function goBack() {
  navigateBack()
}
function goDetail(id: number) {
  navigateTo(`/notices/${id}`)
}

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
  } catch (e) {}
  loadData()
})
</script>

<style scoped>
.notices-page {
  min-height: 100vh;
  background-color: #F9FAFB;
}

.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: rgba(255, 255, 255, 0.95);
  border-bottom: 1rpx solid #E5E7EB;
}
.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1F2937;
}
.nav-placeholder {
  width: 60rpx;
}

.filter-scroll {
  white-space: nowrap;
  padding: 0 24rpx 20rpx;
}
.filter-row {
  display: flex;
  gap: 16rpx;
}
.filter-chip {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background-color: #F3F4F6;
}
.filter-chip.active {
  background-color: var(--brand);
}
.filter-text {
  font-size: 26rpx;
  color: #6B7280;
  white-space: nowrap;
}
.filter-text.active {
  color: #FFFFFF;
}

.list-main {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.notice-card {
  background-color: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.04);
}
.notice-card.unread {
  border-left: 6rpx solid var(--brand);
}
.card-inner {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}
.card-cover {
  width: 160rpx;
  height: 112rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background-color: #F3F4F6;
}
.card-content {
  flex: 1;
  min-width: 0;
}
.card-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.unread-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background-color: var(--brand);
  flex-shrink: 0;
}
.card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.card-title.read {
  color: #9CA3AF;
}
.card-summary {
  font-size: 24rpx;
  color: #9CA3AF;
  line-height: 1.5;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.footer-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.type-badge {
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}
.type-badge-text {
  font-size: 20rpx;
}
.footer-time {
  font-size: 20rpx;
  color: #9CA3AF;
}
.footer-right {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.footer-views {
  font-size: 20rpx;
  color: #9CA3AF;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.empty-title {
  font-size: 30rpx;
  color: #6B7280;
  margin-top: 24rpx;
}
.empty-desc {
  font-size: 24rpx;
  color: #9CA3AF;
  margin-top: 8rpx;
}

.skeleton-card {
  display: flex;
}
.sk-cover {
  width: 160rpx;
  height: 112rpx;
  border-radius: 12rpx;
  background-color: #F3F4F6;
  flex-shrink: 0;
  margin-right: 20rpx;
}
.sk-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-top: 8rpx;
}
.sk-line {
  height: 20rpx;
  border-radius: 6rpx;
  background-color: #F3F4F6;
}
.sk-line.w70 { width: 70%; }
.sk-line.w100 { width: 100%; }
.sk-line.w50 { width: 50%; }

.load-more {
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.load-more-inner {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.load-more-text {
  font-size: 26rpx;
  color: #9CA3AF;
}
.spinner {
  width: 28rpx;
  height: 28rpx;
  border: 3rpx solid #E5E7EB;
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.load-end {
  text-align: center;
  font-size: 22rpx;
  color: #9CA3AF;
  padding: 32rpx 0;
  display: block;
}
</style>
