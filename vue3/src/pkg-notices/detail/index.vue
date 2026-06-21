<template>
  <view class="detail-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-row">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="#1F2937" />
        </view>
        <text class="nav-title">公告详情</text>
        <view class="nav-share" @tap="handleShare">
          <app-icon name="share-2" :size="40" color="#6B7280" />
        </view>
      </view>
    </view>

    <view class="detail-main">
      <!-- 封面 -->
      <image v-if="notice.cover" :src="notice.cover" class="detail-cover" mode="aspectFill" />

      <!-- 标题区 -->
      <view class="title-block">
        <view class="badge-row">
          <view v-if="notice.isPinned" class="badge badge-pinned">
            <text class="badge-pinned-text">置顶</text>
          </view>
          <view
            class="badge badge-type"
            :style="{ backgroundColor: typeColor(notice.type) + '20' }"
          >
            <app-icon :name="typeIcon(notice.type)" :size="24" :color="typeColor(notice.type)" />
            <text class="badge-type-text" :style="{ color: typeColor(notice.type) }">{{ typeLabel(notice.type) }}</text>
          </view>
        </view>

        <text class="detail-title">{{ notice.title }}</text>

        <view class="meta-row">
          <view class="meta-item">
            <app-icon name="calendar" :size="28" color="#9CA3AF" />
            <text class="meta-text">{{ notice.publishedAt }}</text>
          </view>
          <view class="meta-item">
            <app-icon name="eye" :size="28" color="#9CA3AF" />
            <text class="meta-text">{{ notice.viewCount }} 次阅读</text>
          </view>
        </view>
      </view>

      <view class="divider" />

      <!-- 正文 -->
      <view class="content-card">
        <view v-for="(block, idx) in notice.content" :key="idx" class="content-block">
          <text v-if="block.type === 'h'" class="content-h">{{ block.text }}</text>
          <text v-else-if="block.type === 'p'" class="content-p">{{ block.text }}</text>
          <view v-else-if="block.type === 'li'" class="content-li">
            <text class="content-li-dot">•</text>
            <text class="content-li-text">{{ block.text }}</text>
          </view>
        </view>
      </view>

      <!-- 相关链接 -->
      <view v-if="notice.link" class="link-card">
        <text class="link-title">相关链接</text>
        <view class="link-row" @tap="handleLink">
          <text class="link-text">查看详情</text>
          <text class="link-arrow">→</text>
        </view>
      </view>

      <!-- 附件 -->
      <view v-if="notice.attachments && notice.attachments.length" class="attach-card">
        <text class="attach-title">附件</text>
        <view
          v-for="(att, idx) in notice.attachments"
          :key="idx"
          class="attach-item"
          @tap="handleDownload(att)"
        >
          <view class="attach-icon">
            <app-icon name="file-text" :size="36" color="#C41E3A" />
          </view>
          <view class="attach-info">
            <text class="attach-name">{{ att.name }}</text>
            <text v-if="att.size" class="attach-size">{{ (att.size / 1024).toFixed(1) }} KB</text>
          </view>
          <text class="attach-download">下载</text>
        </view>
      </view>

      <!-- 发布信息 -->
      <view class="publish-info">
        <text class="publish-text">由 热卜平台 发布</text>
        <text class="publish-text">发布时间：{{ notice.publishedAt }}</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
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
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateBack } from '@/utils/router'

type NoticeType = 'system' | 'update' | 'activity' | 'maintenance' | 'policy'

const statusBarHeight = ref(20)

const TYPE_LABELS: Record<string, string> = {
  system: '系统', update: '更新', activity: '活动', maintenance: '维护', policy: '政策',
  announcement: '系统', warning: '提醒',
}
const TYPE_COLORS: Record<string, string> = {
  system: '#2563EB', update: '#16A34A', activity: '#EA580C', maintenance: '#CA8A04', policy: '#C41E3A',
  announcement: '#2563EB', warning: '#DC2626',
}
const TYPE_ICONS: Record<string, string> = {
  system: 'megaphone', announcement: 'megaphone', activity: 'gift', update: 'settings', warning: 'alert-circle',
  maintenance: 'wrench', policy: 'shield',
}
function typeLabel(t: string) { return TYPE_LABELS[t] || '系统' }
function typeColor(t: string) { return TYPE_COLORS[t] || '#2563EB' }
function typeIcon(t: string) { return TYPE_ICONS[t] || 'megaphone' }

interface ContentBlock { type: 'h' | 'p' | 'li'; text: string }
interface Attachment { name: string; url: string; size?: number }

const notice = ref({
  id: 1,
  type: 'system' as NoticeType,
  title: '关于平台账号实名认证升级的通知',
  cover: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
  isPinned: true,
  publishedAt: '2025-11-08 10:30',
  viewCount: 23568,
  link: 'https://example.com',
  content: [
    { type: 'p', text: '尊敬的各位用户：' },
    { type: 'p', text: '为进一步保障用户账号安全、营造健康有序的平台环境，根据相关法律法规要求，平台将于近期对实名认证体系进行全面升级。现将有关事项通知如下：' },
    { type: 'h', text: '一、升级内容' },
    { type: 'li', text: '新增人脸识别认证环节，提升认证准确性与安全性。' },
    { type: 'li', text: '优化身份信息核验流程，认证更便捷高效。' },
    { type: 'li', text: '完善未成年人保护机制，严格落实实名制要求。' },
    { type: 'h', text: '二、升级时间' },
    { type: 'p', text: '本次升级将于 2025 年 11 月 15 日正式生效，请尚未完成实名认证的用户及时前往「我的-账号设置」完成认证。' },
    { type: 'h', text: '三、温馨提示' },
    { type: 'p', text: '未完成实名认证的账号将无法使用付费咨询、提现等核心功能。如在认证过程中遇到问题，可联系在线客服获取帮助。' },
    { type: 'p', text: '感谢您一直以来对平台的支持与信任！' },
  ] as ContentBlock[],
  attachments: [
    { name: '实名认证操作指引.pdf', url: '#', size: 256000 },
  ] as Attachment[],
})

function goBack() { navigateBack() }
function handleShare() { uni.showToast({ title: '链接已复制', icon: 'none' }) }
function handleLink() { uni.showToast({ title: '打开相关链接', icon: 'none' }) }
function handleDownload(att: Attachment) { uni.showToast({ title: '开始下载 ' + att.name, icon: 'none' }) }

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
  } catch (e) {}
})
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #F9FAFB;
  padding-bottom: 160rpx;
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

.detail-cover {
  width: 100%;
  height: 320rpx;
  border-radius: 20rpx;
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
  background-color: #C41E3A;
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
  color: #C41E3A;
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
  color: #C41E3A;
}
.link-arrow {
  font-size: 22rpx;
  color: #C41E3A;
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
  color: #C41E3A;
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
  background-color: #C41E3A;
}
.bottom-btn-primary-text {
  font-size: 28rpx;
  color: #FFFFFF;
}
</style>
