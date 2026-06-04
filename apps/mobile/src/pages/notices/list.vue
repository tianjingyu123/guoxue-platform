<template>
  <view class="page">
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="header-title">平台公告</text>
        <view style="width:60rpx" />
      </view>
      <scroll-view scroll-x class="tabs-scroll" show-scrollbar="false">
        <view class="tabs-inner">
          <text v-for="opt in filterOptions" :key="opt.value" class="tab" :class="{ active: filter === opt.value }" @click="switchFilter(opt.value)">{{ opt.label }}</text>
        </view>
      </scroll-view>
    </view>

    <DataState :is-loading="loading" :is-empty="!notices.length" empty-icon="📢" empty-title="暂无公告" empty-description="当前没有任何公告信息">
      <view v-for="n in notices" :key="n.id" class="notice-card" @click="goDetail(n)">
        <view class="nc-left">
          <view class="nc-dot" :class="{ unread: !n.isRead }" />
          <view v-if="n.isPinned" class="nc-pin"><text>📌</text></view>
          <view class="nc-info">
            <view class="nc-title-row">
              <text class="nc-title" :class="{ unread: !n.isRead }">{{ n.title }}</text>
            </view>
            <text class="nc-summary">{{ n.summary || n.title }}</text>
            <view class="nc-meta">
              <text class="nc-type-tag" :class="'t-' + (n.type || 'system')">{{ typeLabel(n.type) }}</text>
              <text class="nc-time">{{ formatTime(n.publishedAt || n.createdAt) }}</text>
            </view>
          </view>
        </view>
        <text class="nc-arrow">›</text>
      </view>

      <view v-if="hasMore" class="load-more-btn" @click="loadMore"><text>{{ loadingMore ? '加载中...' : '点击加载更多' }}</text></view>
      <view v-if="notices.length && !hasMore" class="no-more"><text>已加载全部公告</text></view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { notifyApi } from '../../api'

interface NoticeItem {
  id: number; title: string; summary?: string; type?: string; isRead?: boolean; isPinned?: boolean
  publishedAt?: string; createdAt?: string; cover?: string; viewCount?: number
}

const notices = ref<NoticeItem[]>([]); const loading = ref(true); const loadingMore = ref(false); const hasMore = ref(false); const page = ref(1)
const filter = ref<string>('all')
const filterOptions = [{ value: 'all', label: '全部' }, { value: 'system', label: '系统' }, { value: 'update', label: '更新' }, { value: 'activity', label: '活动' }, { value: 'maintenance', label: '维护' }, { value: 'policy', label: '政策' }]

onMounted(() => loadData(true))

async function loadData(reset = false) {
  if (reset) { loading.value = true; page.value = 1 }
  try {
    const res = await notifyApi.notices({ page: page.value, type: filter.value === 'all' ? undefined : filter.value }) as any
    const items: NoticeItem[] = Array.isArray(res) ? res : res?.list || res?.data || []
    if (reset) notices.value = items; else notices.value.push(...items)
    hasMore.value = items.length >= 10
    page.value++
  } catch {}
  loading.value = false; loadingMore.value = false
}

async function loadMore() { loadingMore.value = true; await loadData() }
function switchFilter(v: string) { filter.value = v; loadData(true) }

function formatTime(timeStr?: string): string {
  if (!timeStr) return ''
  const date = new Date(timeStr); const now = new Date(); const diff = now.getTime() - date.getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function typeLabel(t?: string): string {
  const m: Record<string, string> = { system: '系统', update: '更新', activity: '活动', maintenance: '维护', policy: '政策' }
  return m[t || ''] || '系统'
}

function goDetail(n: NoticeItem) { uni.navigateTo({ url: `/pages/notices/detail?id=${n.id}` }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 40rpx; }
.header { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.tabs-scroll { padding: 0 24rpx 16rpx; white-space: nowrap; }
.tabs-inner { display: inline-flex; gap: 12rpx; }
.tab { display: inline-block; padding: 8rpx 24rpx; border-radius: 28rpx; font-size: 24rpx; background: #f5f0e8; color: #666; }
.tab.active { background: #C41E3A; color: #fff; }
.notice-card { margin: 12rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; display: flex; align-items: center; gap: 12rpx; }
.nc-left { display: flex; align-items: flex-start; gap: 12rpx; flex: 1; min-width: 0; }
.nc-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #ddd; flex-shrink: 0; margin-top: 6rpx; }
.nc-dot.unread { background: #C41E3A; }
.nc-pin { flex-shrink: 0; font-size: 24rpx; }
.nc-info { flex: 1; min-width: 0; }
.nc-title-row { display: flex; align-items: center; gap: 8rpx; }
.nc-title { font-size: 28rpx; font-weight: 500; color: #666; }
.nc-title.unread { color: #2C2C2C; font-weight: 600; }
.nc-summary { font-size: 24rpx; color: #999; margin-top: 6rpx; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nc-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.nc-type-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: #f5f0e8; color: #C9A96E; }
.nc-time { font-size: 22rpx; color: #ccc; }
.nc-arrow { font-size: 32rpx; color: #ccc; flex-shrink: 0; }
.load-more-btn, .no-more { text-align: center; padding: 24rpx; font-size: 26rpx; color: #999; }
</style>
