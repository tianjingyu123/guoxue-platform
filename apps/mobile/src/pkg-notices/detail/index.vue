<template>
  <view class="detail-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-row">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="#1F2937" />
        </view>
        <text class="nav-title">公告详情</text>
        <view class="nav-share" :class="{ disabled: !notice }" @tap="handleShare">
          <app-icon name="share-2" :size="40" :color="notice ? '#6B7280' : '#D1D5DB'" />
        </view>
      </view>
    </view>

    <view v-if="loading" class="state-main">
      <app-icon name="megaphone" :size="88" color="#D1D5DB" />
      <text class="state-title">正在加载公告</text>
    </view>
    <view v-else-if="error || !notice" class="state-main">
      <app-icon name="alert-circle" :size="88" color="#C41E3A" />
      <text class="state-title">公告暂不可用</text>
      <text class="state-desc">{{ error || '该公告不存在或已结束展示' }}</text>
      <view class="state-action" @tap="retry"><text class="state-action-text">重新加载</text></view>
    </view>

    <view v-else class="detail-main">
      <smart-cover class="detail-cover" :src="''" :title="notice.title" type="default" deco :deco-size="88" />
      <view class="title-block">
        <view class="badge-row">
          <view class="badge badge-type" :style="{ backgroundColor: typeColor(notice.type) + '20' }">
            <app-icon :name="typeIcon(notice.type)" :size="24" :color="typeColor(notice.type)" />
            <text class="badge-type-text" :style="{ color: typeColor(notice.type) }">{{ typeLabel(notice.type) }}</text>
          </view>
        </view>
        <text class="detail-title">{{ notice.title }}</text>
        <view class="meta-row">
          <view class="meta-item">
            <app-icon name="calendar" :size="28" color="#9CA3AF" />
            <text class="meta-text">{{ formatDate(notice.createdAt) }}</text>
          </view>
        </view>
      </view>

      <view class="divider" />
      <view class="content-card">
        <view v-for="(block, index) in contentBlocks" :key="index" class="content-block">
          <text v-if="block.type === 'h'" class="content-h">{{ block.text }}</text>
          <text v-else-if="block.type === 'p'" class="content-p">{{ block.text }}</text>
          <view v-else class="content-li">
            <text class="content-li-dot">•</text>
            <text class="content-li-text">{{ block.text }}</text>
          </view>
        </view>
      </view>

      <view class="publish-info">
        <text class="publish-text">由 {{ BRAND.nameShort }}平台发布</text>
        <text class="publish-text">发布时间：{{ formatDate(notice.createdAt, true) }}</text>
      </view>
    </view>

    <view v-if="notice" class="bottom-bar">
      <view class="bottom-btn bottom-btn-outline" @tap="goBack">
        <text class="bottom-btn-outline-text">返回列表</text>
      </view>
      <view class="bottom-btn bottom-btn-primary" @tap="handleShare">
        <app-icon name="share-2" :size="32" color="#FFFFFF" />
        <text class="bottom-btn-primary-text">分享公告</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SmartCover from '@/components/common/smart-cover.vue'
import { navigateBack } from '@/utils/router'
import { BRAND } from '@/lib/brand'
import { noticesApi, type PublicNotice } from '@/lib/notices-data'

interface ContentBlock { type: 'h' | 'p' | 'li'; text: string }

const statusBarHeight = ref(20)
const noticeId = ref('')
const notice = ref<PublicNotice | null>(null)
const loading = ref(true)
const error = ref('')

const TYPE_LABELS: Record<string, string> = { INFO: '通知', WARNING: '提醒', FORCE: '重要' }
const TYPE_COLORS: Record<string, string> = { INFO: '#2563EB', WARNING: '#CA8A04', FORCE: '#C41E3A' }
const TYPE_ICONS: Record<string, string> = { INFO: 'megaphone', WARNING: 'alert-circle', FORCE: 'shield' }
function typeLabel(type: string) { return TYPE_LABELS[type.toUpperCase()] || '公告' }
function typeColor(type: string) { return TYPE_COLORS[type.toUpperCase()] || '#6B7280' }
function typeIcon(type: string) { return TYPE_ICONS[type.toUpperCase()] || 'megaphone' }

const contentBlocks = computed<ContentBlock[]>(() => {
  const content = notice.value?.content || ''
  const blocks: ContentBlock[] = []
  for (const rawLine of content.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim()
    if (!line || line === '```') continue
    const heading = line.match(/^#{1,6}\s+(.+)$/)
    if (heading) { blocks.push({ type: 'h', text: heading[1] }); continue }
    const list = line.match(/^(?:[-*+]\s+|\d+[.、]\s*)(.+)$/)
    if (list) { blocks.push({ type: 'li', text: list[1] }); continue }
    blocks.push({ type: 'p', text: line.replace(/\*\*|__/g, '') })
  }
  return blocks.length ? blocks : [{ type: 'p', text: '公告暂无正文内容' }]
})

function formatDate(value: string, withTime = false) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const day = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  if (!withTime) return day
  return `${day} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function loadNotice() {
  if (!noticeId.value) {
    loading.value = false
    error.value = '缺少公告编号'
    return
  }
  loading.value = true
  error.value = ''
  try {
    notice.value = await noticesApi.detail(noticeId.value)
  } catch (e) {
    notice.value = null
    error.value = (e as Error)?.message || '该公告不存在或已结束展示'
  } finally {
    loading.value = false
  }
}

function goBack() { navigateBack() }
function retry() { loadNotice() }
function handleShare() {
  if (!notice.value) return
  let shareText = `${notice.value.title}\n${BRAND.nameShort}平台公告`
  // #ifdef H5
  shareText = window.location.href
  // #endif
  uni.setClipboardData({
    data: shareText,
    success: () => uni.showToast({ title: '公告链接已复制', icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败，请稍后重试', icon: 'none' }),
  })
}

onLoad((options?: Record<string, string>) => {
  try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 20 } catch {}
  noticeId.value = String(options?.id || '')
  loadNotice()
})
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #F9FAFB;
  padding-bottom: calc(200rpx + env(safe-area-inset-bottom));
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
.nav-back, .nav-share {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
}
.nav-share { justify-content: flex-end; }
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1F2937;
}

.detail-main {
  padding: 32rpx;
}
.state-main {
  min-height: 65vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  text-align: center;
}
.state-title { margin-top: 24rpx; font-size: 30rpx; font-weight: 600; color: #374151; }
.state-desc { margin-top: 12rpx; font-size: 24rpx; line-height: 1.6; color: #9CA3AF; }
.state-action { margin-top: 28rpx; padding: 16rpx 36rpx; border-radius: 999rpx; background: var(--brand); }
.state-action-text { font-size: 26rpx; color: #FFFFFF; }
.nav-share.disabled { opacity: 0.55; }

.detail-cover {
  width: 100%;
  height: 320rpx;
  border-radius: 20rpx;
  overflow: hidden;
  background-color: #F3F4F6;
  margin-bottom: 32rpx;
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.badge-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.badge {
  display: flex;
  align-items: center;
  border-radius: 8rpx;
}
.badge-pinned {
  background-color: var(--brand);
  padding: 4rpx 14rpx;
}
.badge-pinned-text {
  font-size: 20rpx;
  color: #FFFFFF;
}
.badge-type {
  gap: 6rpx;
  padding: 6rpx 14rpx;
}
.badge-type-text {
  font-size: 20rpx;
}
.detail-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1F2937;
  line-height: 1.4;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.meta-text {
  font-size: 26rpx;
  color: #9CA3AF;
}

.divider {
  height: 1rpx;
  background-color: #E5E7EB;
  margin: 32rpx 0;
}

.content-card {
  background-color: #FFFFFF;
  border-radius: 20rpx;
  padding: 32rpx;
}
.content-block {
  margin-bottom: 20rpx;
}
.content-h {
  font-size: 30rpx;
  font-weight: 600;
  color: #1F2937;
  display: block;
}
.content-p {
  font-size: 28rpx;
  color: #374151;
  line-height: 1.7;
  display: block;
}
.content-li {
  display: flex;
  gap: 12rpx;
  padding-left: 8rpx;
}
.content-li-dot {
  color: var(--brand);
  font-size: 28rpx;
}
.content-li-text {
  flex: 1;
  font-size: 28rpx;
  color: #374151;
  line-height: 1.7;
}

.link-card, .attach-card {
  background-color: #FFFFFF;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-top: 24rpx;
}
.link-title, .attach-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1F2937;
  margin-bottom: 16rpx;
  display: block;
}
.link-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.link-text {
  font-size: 26rpx;
  color: var(--brand);
}
.link-arrow {
  font-size: 22rpx;
  color: var(--brand);
}

.attach-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  background-color: #F9FAFB;
  border-radius: 12rpx;
  margin-top: 12rpx;
}
.attach-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  background-color: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.attach-info {
  flex: 1;
  min-width: 0;
}
.attach-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #1F2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.attach-size {
  font-size: 22rpx;
  color: #9CA3AF;
}
.attach-download {
  font-size: 22rpx;
  color: var(--brand);
}

.publish-info {
  text-align: center;
  padding-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.publish-text {
  font-size: 22rpx;
  color: #9CA3AF;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.95);
  border-top: 1rpx solid #E5E7EB;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 24rpx;
}
.bottom-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.bottom-btn-outline {
  border: 1rpx solid #D1D5DB;
}
.bottom-btn-outline-text {
  font-size: 28rpx;
  color: #374151;
}
.bottom-btn-primary {
  background-color: var(--brand);
}
.bottom-btn-primary-text {
  font-size: 28rpx;
  color: #FFFFFF;
}
</style>
