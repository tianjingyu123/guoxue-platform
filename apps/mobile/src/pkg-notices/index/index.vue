<template>
  <view class="notices-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-row">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="#1F2937" />
        </view>
        <text class="nav-title">平台公告</text>
        <view class="nav-placeholder" />
      </view>
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

    <view class="list-main">
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

      <view v-else-if="error" class="empty-state">
        <app-icon name="alert-circle" :size="88" color="#C41E3A" />
        <text class="empty-title">公告加载失败</text>
        <text class="empty-desc">{{ error }}</text>
        <view class="retry-btn" @tap="loadData(true)"><text class="retry-text">重新加载</text></view>
      </view>

      <view v-else-if="notices.length === 0" class="empty-state">
        <app-icon name="megaphone" :size="96" color="#D1D5DB" />
        <text class="empty-title">暂无公告</text>
        <text class="empty-desc">平台当前没有正在展示的公告</text>
      </view>

      <template v-else>
        <view v-for="notice in notices" :key="notice.id" class="notice-card" @tap="goDetail(notice.id)">
          <view class="card-inner">
            <smart-cover class="card-cover" :src="''" :title="notice.title" type="default" deco :deco-size="40" />
            <view class="card-content">
              <view class="card-title-row">
                <text class="card-title">{{ notice.title }}</text>
              </view>
              <text class="card-summary">{{ notice.summary }}</text>
              <view class="card-footer">
                <view class="footer-left">
                  <view class="type-badge" :style="{ backgroundColor: typeColor(notice.type) + '20' }">
                    <text class="type-badge-text" :style="{ color: typeColor(notice.type) }">{{ typeLabel(notice.type) }}</text>
                  </view>
                  <text class="footer-time">{{ formatTime(notice.createdAt) }}</text>
                </view>
                <view class="footer-right"><app-icon name="chevron-right" :size="24" color="#9CA3AF" /></view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="hasMore" class="load-more" @tap="handleLoadMore">
          <view v-if="loadingMore" class="load-more-inner">
            <view class="spinner" />
            <text class="load-more-text">加载中...</text>
          </view>
          <text v-else class="load-more-text">加载更多</text>
        </view>
        <text v-else class="load-end">已加载全部公告</text>
      </template>
    </view>
  </view>
</template>


<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SmartCover from '@/components/common/smart-cover.vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { noticesApi, type PublicNotice } from '@/lib/notices-data'

type NoticeFilter = 'all' | 'INFO' | 'WARNING' | 'FORCE'
type NoticeVM = PublicNotice & { summary: string }

const statusBarHeight = ref(20)
const filterOptions: { value: NoticeFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'INFO', label: '通知' },
  { value: 'WARNING', label: '提醒' },
  { value: 'FORCE', label: '重要' },
]
const TYPE_LABELS: Record<string, string> = { INFO: '通知', WARNING: '提醒', FORCE: '重要' }
const TYPE_COLORS: Record<string, string> = { INFO: '#2563EB', WARNING: '#CA8A04', FORCE: '#C41E3A' }

const allNotices = ref<NoticeVM[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const filter = ref<NoticeFilter>('all')
const page = ref(1)
const totalPages = ref(1)
const notices = computed(() => filter.value === 'all'
  ? allNotices.value
  : allNotices.value.filter((notice) => notice.type.toUpperCase() === filter.value))
const hasMore = computed(() => page.value < totalPages.value)

function summaryOf(content: string) {
  return (content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[|\]|[#>*_`()]/g, ' ')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function mapNotice(notice: PublicNotice): NoticeVM {
  return { ...notice, type: (notice.type || 'INFO').toUpperCase(), summary: summaryOf(notice.content) }
}

function typeLabel(type: string) { return TYPE_LABELS[type.toUpperCase()] || '公告' }
function typeColor(type: string) { return TYPE_COLORS[type.toUpperCase()] || '#6B7280' }

async function loadData(reset = true) {
  if (reset) {
    loading.value = true
    error.value = ''
    page.value = 1
  }
  try {
    const result = await noticesApi.list(reset ? 1 : page.value + 1, 50)
    const mapped = (result.items || []).map(mapNotice)
    allNotices.value = reset ? mapped : [...allNotices.value, ...mapped]
    page.value = result.page || 1
    totalPages.value = result.totalPages || 1
  } catch (e) {
    error.value = (e as Error)?.message || '请检查网络后重试'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function setFilter(value: NoticeFilter) { filter.value = value }
async function handleLoadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  await loadData(false)
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  if (diff >= 0 && diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}分钟前`
  if (diff >= 0 && diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff >= 0 && diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function goBack() { navigateBack() }
function goDetail(id: string) { navigateTo(`/notices/${id}`) }

onLoad(() => {
  try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 20 } catch {}
  loadData(true)
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
  overflow: hidden;
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
  text-align: center;
}
.retry-btn {
  margin-top: 28rpx;
  padding: 16rpx 36rpx;
  border-radius: 999rpx;
  background: var(--brand);
}
.retry-text { font-size: 26rpx; color: #FFFFFF; }

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
