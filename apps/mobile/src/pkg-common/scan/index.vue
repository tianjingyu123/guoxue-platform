<template>
  <view class="scan-page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="nav-back" @click="goBack">
        <AppIcon name="arrow-left" :size="22" color="#1a1a1a" />
      </view>
      <text class="nav-title">扫码结果</text>
      <view class="nav-placeholder" />
    </view>

    <view class="main">
      <!-- 解析中 -->
      <view v-if="status === 'parsing'" class="state-box">
        <view class="loader-circle">
          <AppIcon name="loader-2" :size="40" color="#C41E3A" class="spin" />
        </view>
        <text class="state-tip">正在解析二维码...</text>
      </view>

      <!-- 解析成功 -->
      <view v-else-if="status === 'success' && result" class="success-box">
        <!-- 类型标识 -->
        <view class="type-icon-wrap">
          <view class="type-icon-circle" :style="{ background: typeConfig.bg }">
            <AppIcon :name="typeConfig.icon" :size="40" :color="typeConfig.color" />
          </view>
        </view>
        <text class="type-label">{{ typeConfig.label }}</text>

        <!-- 内容卡片 -->
        <view class="content-card">
          <!-- 好友 -->
          <view v-if="result.type === 'friend'" class="row">
            <image class="avatar" :src="result.data.avatar" mode="aspectFill" />
            <view class="row-info">
              <text class="row-title">{{ result.data.nickname }}</text>
              <text class="row-sub clamp2">{{ result.data.signature }}</text>
            </view>
          </view>

          <!-- 群聊 -->
          <view v-else-if="result.type === 'group'" class="row">
            <image class="avatar avatar-square" :src="result.data.avatar" mode="aspectFill" />
            <view class="row-info">
              <text class="row-title">{{ result.data.name }}</text>
              <text class="row-sub">{{ result.data.memberCount }}人</text>
              <text class="row-sub clamp1">{{ result.data.description }}</text>
            </view>
          </view>

          <!-- 付款 -->
          <view v-else-if="result.type === 'pay'" class="row">
            <image class="avatar" :src="result.data.merchantAvatar" mode="aspectFill" />
            <view class="row-info">
              <text class="row-title">{{ result.data.merchantName }}</text>
              <text class="row-sub">向TA付款</text>
            </view>
          </view>

          <!-- 课程 -->
          <view v-else-if="result.type === 'course'" class="media-row">
            <image class="media-cover" :src="result.data.cover" mode="aspectFill" />
            <view class="row-info">
              <text class="row-title clamp2">{{ result.data.title }}</text>
              <text class="row-sub">{{ result.data.teacher }}</text>
              <text class="price">¥{{ result.data.price }}</text>
            </view>
          </view>

          <!-- 文章 -->
          <view v-else-if="result.type === 'article'" class="media-row">
            <image class="media-cover" :src="result.data.cover" mode="aspectFill" />
            <view class="row-info">
              <text class="row-title clamp2">{{ result.data.title }}</text>
              <text class="row-sub">{{ result.data.author }}</text>
            </view>
          </view>

          <!-- 直播 -->
          <view v-else-if="result.type === 'live'" class="media-row">
            <view class="live-cover-wrap">
              <image class="media-cover" :src="result.data.cover" mode="aspectFill" />
              <text v-if="result.data.status === 'live'" class="live-badge">直播中</text>
            </view>
            <view class="row-info">
              <text class="row-title clamp2">{{ result.data.title }}</text>
              <text class="row-sub">{{ result.data.host }}</text>
            </view>
          </view>

          <!-- 邀请注册 -->
          <view v-else-if="result.type === 'invite'" class="invite-box">
            <image class="avatar avatar-center" :src="result.data.inviterAvatar" mode="aspectFill" />
            <text class="invite-text"><text class="invite-name">{{ result.data.inviterName }}</text> 邀请您加入热卜</text>
            <view class="benefits">
              <view v-for="(b, idx) in result.data.benefits" :key="idx" class="benefit-item">
                <AppIcon name="check-circle-2" :size="16" color="#22c55e" />
                <text class="benefit-text">{{ b }}</text>
              </view>
            </view>
          </view>

          <!-- 签到 -->
          <view v-else-if="result.type === 'checkin'" class="checkin-box">
            <text class="row-title">{{ result.data.eventName }}</text>
            <text class="row-sub center">{{ result.data.eventTime }}</text>
            <text class="row-sub center">{{ result.data.location }}</text>
          </view>

          <!-- 外部链接 -->
          <view v-else-if="result.type === 'url'" class="url-box">
            <text class="url-tip">即将访问外部链接：</text>
            <text class="url-link">{{ result.data.url }}</text>
            <text class="url-warn">请注意识别链接安全性</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view v-if="result.action" class="action-btn" :class="{ disabled: actionLoading }" @click="handleAction">
          <AppIcon v-if="actionLoading" name="loader-2" :size="20" color="#fff" class="spin" />
          <AppIcon v-else name="arrow-right" :size="20" color="#fff" />
          <text class="action-label">{{ result.action.label }}</text>
        </view>
      </view>

      <!-- 解析失败 -->
      <view v-else class="state-box">
        <view class="error-circle">
          <AppIcon name="x-circle" :size="40" color="#9ca3af" />
        </view>
        <text class="error-title">无法识别二维码</text>
        <text class="error-tip">{{ content ? '该二维码内容无法识别或已失效' : '未获取到二维码内容' }}</text>

        <view v-if="result && result.type === 'unknown' && result.data.content" class="raw-card">
          <text class="url-tip">原始内容：</text>
          <text class="raw-content">{{ result.data.content }}</text>
        </view>

        <view class="error-actions">
          <view class="ghost-btn" @click="goBack">
            <AppIcon name="refresh-cw" :size="16" color="#1a1a1a" />
            <text class="ghost-label">重新扫码</text>
          </view>
          <view class="ghost-btn" @click="goHome">
            <AppIcon name="home" :size="16" color="#1a1a1a" />
            <text class="ghost-label">返回首页</text>
          </view>
        </view>
      </view>
    </view>

  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack, navigateTo, reLaunch } from '@/utils/router'

type ScanResultType =
  | 'friend' | 'group' | 'pay' | 'course' | 'article'
  | 'live' | 'invite' | 'checkin' | 'url' | 'unknown'

interface ScanResult {
  type: ScanResultType
  data: Record<string, any>
  action?: { label: string; url?: string; handler?: string }
}

const PLACEHOLDER = 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=200&h=200&fit=crop'

const content = ref('')
const status = ref<'parsing' | 'success' | 'error'>('parsing')
const result = ref<ScanResult | null>(null)
const actionLoading = ref(false)

const TYPE_CONFIG: Record<ScanResultType, { icon: string; label: string; color: string; bg: string }> = {
  friend: { icon: 'user-plus', label: '好友名片', color: '#2563eb', bg: '#eff6ff' },
  group: { icon: 'users', label: '群聊', color: '#16a34a', bg: '#f0fdf4' },
  pay: { icon: 'credit-card', label: '收款码', color: '#d97706', bg: '#fffbeb' },
  course: { icon: 'qr-code', label: '课程', color: '#9333ea', bg: '#faf5ff' },
  article: { icon: 'qr-code', label: '文章', color: '#0891b2', bg: '#ecfeff' },
  live: { icon: 'qr-code', label: '直播', color: '#dc2626', bg: '#fef2f2' },
  invite: { icon: 'user-plus', label: '邀请注册', color: '#C41E3A', bg: 'rgba(196,30,58,0.1)' },
  checkin: { icon: 'check-circle-2', label: '签到', color: '#16a34a', bg: '#f0fdf4' },
  url: { icon: 'link', label: '外部链接', color: '#4b5563', bg: '#f9fafb' },
  unknown: { icon: 'x-circle', label: '未知', color: '#9ca3af', bg: '#f9fafb' },
}

const typeConfig = computed(() => TYPE_CONFIG[result.value?.type || 'unknown'])

function parseQrCode(c: string): ScanResult {
  if (c.includes('rebu.com') || c.includes('rebu://')) {
    if (c.includes('/user/') || c.includes('user=')) {
      const userId = c.match(/user[=/](\d+)/)?.[1] || '123'
      return { type: 'friend', data: { userId, nickname: '国学爱好者', avatar: PLACEHOLDER, signature: '探索国学智慧，传承传统文化' }, action: { label: '添加好友', handler: 'addFriend' } }
    }
    if (c.includes('/group/') || c.includes('group=')) {
      const groupId = c.match(/group[=/](\d+)/)?.[1] || '456'
      return { type: 'group', data: { groupId, name: '八字命理交流群', avatar: PLACEHOLDER, memberCount: 128, description: '探讨八字命理，共同学习进步' }, action: { label: '申请加入', handler: 'joinGroup' } }
    }
    if (c.includes('/pay/') || c.includes('pay=')) {
      return { type: 'pay', data: { merchantId: '789', merchantName: '热卜国学', merchantAvatar: PLACEHOLDER }, action: { label: '立即付款', url: '/pay/transfer' } }
    }
    if (c.includes('/course/')) {
      const courseId = c.match(/course\/(\d+)/)?.[1] || '1'
      return { type: 'course', data: { courseId, title: '八字命理入门精讲', cover: PLACEHOLDER, price: 199, teacher: '张明德' }, action: { label: '查看课程', url: `/course/${courseId}` } }
    }
    if (c.includes('/article/')) {
      const articleId = c.match(/article\/(\d+)/)?.[1] || '1'
      return { type: 'article', data: { articleId, title: '如何看懂自己的八字命盘', cover: PLACEHOLDER, author: '易学先生' }, action: { label: '阅读文章', url: `/article/${articleId}` } }
    }
    if (c.includes('/live/')) {
      const liveId = c.match(/live\/(\d+)/)?.[1] || '1'
      return { type: 'live', data: { liveId, title: '今晚8点：八字看财运专题', cover: PLACEHOLDER, host: '王老师', status: 'upcoming' }, action: { label: '进入直播', url: `/live/${liveId}` } }
    }
    if (c.includes('/invite/') || c.includes('invite=')) {
      const inviteCode = c.match(/invite[=/](\w+)/)?.[1] || 'ABC123'
      return { type: 'invite', data: { inviteCode, inviterName: '国学传承者', inviterAvatar: PLACEHOLDER, benefits: ['注册即得100积分', '首单立减10元'] }, action: { label: '立即注册', url: `/auth/register?invite=${inviteCode}` } }
    }
    if (c.includes('/checkin/')) {
      return { type: 'checkin', data: { eventName: '线下讲座签到', eventTime: '2026-06-05 14:00', location: '北京国学馆' }, action: { label: '确认签到', handler: 'checkin' } }
    }
  }
  if (c.startsWith('http://') || c.startsWith('https://')) {
    return { type: 'url', data: { url: c }, action: { label: '访问链接', url: c } }
  }
  return { type: 'unknown', data: { content: c } }
}

function handleAction() {
  if (!result.value?.action) return
  const action = result.value.action
  if (action.url) {
    navigateTo(action.url)
    return
  }
  if (action.handler) {
    actionLoading.value = true
    setTimeout(() => {
      actionLoading.value = false
      switch (action.handler) {
        case 'addFriend':
          navigateTo(`/im/chat?targetId=${result.value!.data.userId}&type=user`)
          break
        case 'joinGroup':
          navigateTo(`/im/group-chat/${result.value!.data.groupId}`)
          break
        case 'checkin':
          navigateTo('/profile')
          break
      }
    }, 1500)
  }
}

function goBack() {
  navigateBack()
}
function goHome() {
  reLaunch('/pages/index/index')
}

onMounted(() => {
  const pages = getCurrentPages()
  const cur: any = pages[pages.length - 1]
  const opts = cur?.options || {}
  // 接 ?content=/?data= query（入口 offline/checkin 等扫码场景会传），与原型一致：无 content 即 error 态
  const raw = opts.content || opts.data || ''
  content.value = raw ? decodeURIComponent(raw) : ''

  setTimeout(() => {
    if (!content.value) {
      status.value = 'error'
      return
    }
    const res = parseQrCode(content.value)
    result.value = res
    status.value = res.type === 'unknown' ? 'error' : 'success'
  }, 1000)
})
</script>

<style scoped>
.scan-page {
  min-height: 100vh;
  background: #ffffff;
}
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1rpx solid #ededed;
}
.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.nav-placeholder {
  width: 60rpx;
}
.main {
  padding: 32rpx;
}

/* 状态盒（解析中/失败） */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}
.loader-circle {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}
.state-tip {
  font-size: 28rpx;
  color: #999;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 成功 */
.type-icon-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 24rpx;
}
.type-icon-circle {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.type-label {
  display: block;
  text-align: center;
  font-size: 28rpx;
  color: #999;
  margin-bottom: 48rpx;
}
.content-card {
  background: #fff;
  border: 1rpx solid #ededed;
  border-radius: 24rpx;
  padding: 32rpx;
}
.row {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f3f4f6;
}
.avatar-square {
  border-radius: 16rpx;
}
.avatar-center {
  display: block;
  margin: 0 auto 24rpx;
}
.row-info {
  flex: 1;
  min-width: 0;
}
.row-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.row-sub {
  display: block;
  font-size: 26rpx;
  color: #999;
  margin-top: 6rpx;
}
.row-sub.center {
  text-align: center;
}
.clamp1 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.clamp2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.price {
  display: block;
  color: #C41E3A;
  font-size: 30rpx;
  font-weight: 600;
  margin-top: 6rpx;
}
.media-row {
  display: flex;
  gap: 24rpx;
}
.media-cover {
  width: 192rpx;
  height: 128rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  background: #f3f4f6;
}
.live-cover-wrap {
  position: relative;
  flex-shrink: 0;
}
.live-badge {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  padding: 2rpx 10rpx;
  background: #ef4444;
  color: #fff;
  font-size: 18rpx;
  border-radius: 6rpx;
}
.invite-box {
  text-align: center;
}
.invite-text {
  font-size: 28rpx;
  color: #999;
}
.invite-name {
  color: #1a1a1a;
  font-weight: 500;
}
.benefits {
  margin-top: 32rpx;
}
.benefit-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 26rpx;
  color: #1a1a1a;
  margin-top: 12rpx;
}
.checkin-box {
  text-align: center;
}
.checkin-box .row-title {
  text-align: center;
}
.url-box {
  display: flex;
  flex-direction: column;
}
.url-tip {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 12rpx;
}
.url-link {
  font-size: 26rpx;
  color: #2563eb;
  word-break: break-all;
}
.url-warn {
  font-size: 22rpx;
  color: #d97706;
  margin-top: 12rpx;
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 96rpx;
  background: #C41E3A;
  border-radius: 16rpx;
  margin-top: 48rpx;
}
.action-btn.disabled {
  opacity: 0.6;
}
.action-label {
  color: #fff;
  font-size: 32rpx;
}

/* 失败 */
.error-circle {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}
.error-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}
.error-tip {
  font-size: 28rpx;
  color: #999;
  text-align: center;
  margin-bottom: 48rpx;
}
.raw-card {
  width: 100%;
  background: #fff;
  border: 1rpx solid #ededed;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 48rpx;
}
.raw-content {
  font-size: 26rpx;
  color: #1a1a1a;
  word-break: break-all;
}
.error-actions {
  display: flex;
  gap: 24rpx;
}
.ghost-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 32rpx;
  border: 1rpx solid #d1d5db;
  border-radius: 16rpx;
}
.ghost-label {
  font-size: 28rpx;
  color: #1a1a1a;
}
</style>
