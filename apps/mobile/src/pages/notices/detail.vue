<template>
  <view class="page">
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ‹
        </text>
        <text class="header-title">
          公告详情
        </text>
        <text
          class="share-btn"
          @click="handleShare"
        >
          📤
        </text>
      </view>
    </view>

    <view
      v-if="loading"
      class="loading-skeleton"
    >
      <view class="s-block w-70" />
      <view class="s-row">
        <view class="s-block w-30" /><view class="s-block w-40" />
      </view>
      <view class="s-block h-40" />
      <view class="s-block w-100" /><view class="s-block w-90" /><view class="s-block w-60" />
    </view>

    <view
      v-else-if="!notice"
      class="empty-state"
    >
      <text class="empty-icon">
        📢
      </text>
      <text class="empty-text">
        公告不存在或已删除
      </text>
      <view
        class="empty-btn"
        @click="goBack"
      >
        返回列表
      </view>
    </view>

    <scroll-view
      v-else
      scroll-y
      class="content-scroll"
    >
      <!-- 封面 -->
      <image
        v-if="notice.cover"
        :src="notice.cover"
        mode="aspectFill"
        class="cover-img"
      />

      <view class="detail-section">
        <view class="type-row">
          <text
            v-if="notice.isPinned"
            class="pin-tag"
          >
            📌 置顶
          </text>
          <text class="type-tag">
            {{ typeLabel(notice.type) }}
          </text>
        </view>

        <text class="detail-title">
          {{ notice.title }}
        </text>

        <view class="meta-row">
          <text class="meta-time">
            📅 {{ notice.publishedAt }}
          </text>
          <text class="meta-views">
            👁 {{ notice.viewCount || 0 }} 次阅读
          </text>
        </view>

        <view class="divider" />

        <view class="detail-body">
          <rich-text :nodes="notice.content || ''" />
        </view>

        <!-- 相关链接 -->
        <view
          v-if="notice.link"
          class="link-card"
          @click="openLink(notice.link)"
        >
          <text class="link-label">
            🔗 相关链接
          </text>
          <text class="link-url">
            {{ notice.link }}
          </text>
        </view>

        <!-- 附件 -->
        <view
          v-if="notice.attachments && notice.attachments.length"
          class="attach-section"
        >
          <text class="attach-title">
            附件
          </text>
          <view
            v-for="(att, idx) in notice.attachments"
            :key="idx"
            class="attach-item"
            @click="downloadAtt(att)"
          >
            <text class="attach-icon">
              📄
            </text>
            <view class="attach-info">
              <text class="attach-name">
                {{ att.name }}
              </text>
              <text class="attach-size">
                {{ formatSize(att.size) }}
              </text>
            </view>
            <text class="attach-dl">
              下载
            </text>
          </view>
        </view>

        <view class="footer-info">
          <text>由 国学平台 发布</text>
          <text>发布时间：{{ notice.publishedAt }}</text>
        </view>
      </view>
    </scroll-view>

    <view
      v-if="notice"
      class="bottom-bar"
    >
      <view class="bottom-inner">
        <view
          class="bb-btn"
          @click="goBack"
        >
          返回列表
        </view>
        <view
          class="bb-btn primary"
          @click="handleShare"
        >
          📤 分享公告
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { notifyApi } from '../../api'

interface Attachment { name: string; size?: number; url: string }

interface NoticeDetail {
  id: number; title: string; summary?: string; content?: string; type?: string; isRead?: boolean; isPinned?: boolean
  publishedAt?: string; createdAt?: string; cover?: string; viewCount?: number; link?: string; attachments?: Attachment[]
}

const loading = ref(true); const notice = ref<NoticeDetail | null>(null)

onMounted(async () => {
  const pages = getCurrentPages(); const opts = (pages[pages.length - 1] as any)?.options || {}; const id = opts.id
  if (!id) { loading.value = false; return }
  try {
    const res = await notifyApi.detail(id) as any
    const data: NoticeDetail = res?.data || res || {}
    notice.value = data
    if (!data.isRead) { try { await notifyApi.markRead(id) } catch {} }
  } catch { notice.value = null }
  loading.value = false
})

function typeLabel(t?: string): string {
  const m: Record<string, string> = { system: '系统', update: '更新', activity: '活动', maintenance: '维护', policy: '政策' }
  return m[t || ''] || '系统'
}

function formatSize(size?: number): string {
  if (!size) return ''
  return size > 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`
}

function handleShare() { uni.showToast({ title: '分享链接已复制' }) }
function openLink(url: string) { uni.setClipboardData({ data: url }) }
function downloadAtt(att: Attachment) { uni.showToast({ title: '下载中...', icon: 'none' }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 120rpx; }
.header { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.share-btn { font-size: 32rpx; color: #999; padding: 8rpx; }
.loading-skeleton { padding: 24rpx; }
.s-block { height: 32rpx; background: #e8e3db; border-radius: 8rpx; margin-bottom: 16rpx; }
.s-block.h-40 { height: 240rpx; }
.s-row { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.w-70 { width: 70%; } .w-30 { width: 30%; } .w-40 { width: 40%; } .w-100 { width: 100%; } .w-90 { width: 90%; } .w-60 { width: 60%; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 24rpx; }
.empty-btn { padding: 12rpx 40rpx; background: #C41E3A; color: #fff; border-radius: 12rpx; font-size: 26rpx; }
.content-scroll { padding-bottom: 40rpx; }
.cover-img { width: 100%; height: 400rpx; }
.detail-section { background: #fff; padding: 24rpx; }
.type-row { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.pin-tag { font-size: 22rpx; padding: 4rpx 16rpx; background: #fde8e8; color: #C41E3A; border-radius: 8rpx; }
.type-tag { font-size: 22rpx; padding: 4rpx 16rpx; background: #f5f0e8; color: #C9A96E; border-radius: 8rpx; }
.detail-title { font-size: 36rpx; font-weight: 700; color: #2C2C2C; line-height: 1.4; }
.meta-row { display: flex; gap: 24rpx; margin-top: 12rpx; font-size: 22rpx; color: #999; }
.divider { height: 1rpx; background: #E5E1DB; margin: 20rpx 0; }
.detail-body { font-size: 28rpx; line-height: 1.8; color: #333; }
.detail-body rich-text { word-break: break-all; }
.link-card { background: #faf8f5; border-radius: 12rpx; padding: 16rpx; margin-top: 20rpx; }
.link-label { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 8rpx; }
.link-url { font-size: 24rpx; color: #C41E3A; }
.attach-section { margin-top: 24rpx; }
.attach-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 12rpx; }
.attach-item { display: flex; align-items: center; gap: 12rpx; padding: 16rpx; background: #faf8f5; border-radius: 12rpx; margin-bottom: 8rpx; }
.attach-icon { font-size: 36rpx; }
.attach-info { flex: 1; min-width: 0; }
.attach-name { font-size: 26rpx; color: #2C2C2C; display: block; }
.attach-size { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.attach-dl { font-size: 24rpx; color: #C41E3A; }
.footer-info { text-align: center; padding: 32rpx 0 16rpx; font-size: 22rpx; color: #ccc; }
.footer-info text { display: block; margin-bottom: 4rpx; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E5E1DB; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bottom-inner { display: flex; gap: 16rpx; }
.bb-btn { flex: 1; text-align: center; padding: 18rpx; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #666; }
.bb-btn.primary { background: #C41E3A; color: #fff; border-color: #C41E3A; }
</style>
