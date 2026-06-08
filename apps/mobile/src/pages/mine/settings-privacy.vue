<template>
  <DataState :is-loading="pageLoading" :error="pageError" :is-empty="false" @retry="initPage">
    <view class="page">
      <!-- 顶部导航 -->
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">
          <text class="nav-back-icon">‹</text>
        </view>
        <text class="nav-title">隐私设置</text>
        <view class="nav-placeholder" />
      </view>

      <scroll-view class="content" scroll-y>
        <!-- 个人信息可见性 -->
        <view class="section">
          <text class="section-title">个人信息可见性</text>
          <view class="card">
            <view
              v-for="item in visibilityItems"
              :key="item.key"
              class="setting-item"
            >
              <view class="setting-left">
                <view class="icon-box">
                  <text class="icon-emoji">{{ item.icon }}</text>
                </view>
                <view>
                  <text class="setting-label">{{ item.title }}</text>
                  <text class="setting-desc">{{ item.desc }}</text>
                </view>
              </view>
              <switch
                :checked="item.checked"
                color="#8b6914"
                @change="(e: any) => item.onChange(e.detail.value)"
              />
            </view>
          </view>
        </view>

        <!-- 互动权限 -->
        <view class="section">
          <text class="section-title">互动权限</text>
          <view class="card">
            <view
              v-for="item in interactionItems"
              :key="item.key"
              class="setting-item select-item"
            >
              <view class="setting-left">
                <view class="icon-box">
                  <text class="icon-emoji">{{ item.icon }}</text>
                </view>
                <text class="setting-label">{{ item.title }}</text>
              </view>
              <view class="select-trigger" @click="item.toggle()">
                <text class="select-current">{{ item.currentLabel }}</text>
                <text class="select-arrow" :class="{ open: item.open }">▾</text>
              </view>
            </view>
            <!-- 展开的选项 -->
            <view
              v-for="item in interactionItems"
              :key="'opt-' + item.key"
            >
              <view v-if="item.open" class="select-options">
                <view
                  v-for="opt in item.options"
                  :key="opt.value"
                  class="select-option"
                  :class="{ active: item.current === opt.value }"
                  @click="item.select(opt.value)"
                >
                  <text>{{ opt.label }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 黑名单 -->
        <view class="section">
          <view class="card">
            <view class="setting-item link-item" @click="goBlacklist">
              <view class="setting-left">
                <view class="icon-box red-bg">
                  <text class="icon-emoji">🚫</text>
                </view>
                <view>
                  <text class="setting-label">黑名单管理</text>
                  <text class="setting-desc">已拉黑 {{ blacklistCount }} 人</text>
                </view>
              </view>
              <text class="setting-arrow">›</text>
            </view>
          </view>
        </view>

        <!-- 其他 -->
        <view class="section">
          <text class="section-title">其他</text>
          <view class="card">
            <view
              v-for="item in otherItems"
              :key="item.key"
              class="setting-item"
            >
              <view class="setting-left">
                <view class="icon-box">
                  <text class="icon-emoji">{{ item.icon }}</text>
                </view>
                <view>
                  <text class="setting-label">{{ item.title }}</text>
                  <text class="setting-desc">{{ item.desc }}</text>
                </view>
              </view>
              <switch
                :checked="item.checked"
                color="#8b6914"
                @change="(e: any) => item.onChange(e.detail.value)"
              />
            </view>
          </view>
        </view>

        <!-- 提示 -->
        <view class="footer-note">
          <text>隐私设置修改后立即生效，部分设置可能需要重新启动应用查看效果</text>
        </view>
      </scroll-view>
    </view>
  </DataState>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import DataState from '@/components/DataState.vue'

const pageLoading = ref(false)
const pageError = ref<string | null>(null)

// 可见性
const showOnlineStatus = ref(true)
const showLastSeen = ref(true)
const showLocation = ref(false)
const showFavorites = ref(true)
const showFollowing = ref(true)

// 互动权限
const whoCanMessage = ref('everyone')
const whoCanComment = ref('everyone')
const whoCanSeeCircle = ref('members')

// 其他
const recordHistory = ref(true)
const personalizedRecommend = ref(true)

// 黑名单
const blacklistCount = ref(3)

// 选项定义
const messageOptions = [
  { label: '所有人', value: 'everyone' },
  { label: '仅关注的人', value: 'following' },
  { label: '关闭私信', value: 'none' },
]
const commentOptions = [
  { label: '所有人', value: 'everyone' },
  { label: '仅关注的人', value: 'following' },
  { label: '关闭评论', value: 'none' },
]
const circleOptions = [
  { label: '所有人可见', value: 'everyone' },
  { label: '仅成员可见', value: 'members' },
  { label: '仅自己可见', value: 'private' },
]

// 展开状态
const openSelectKey = ref<string | null>(null)

// 可见性设置列表
const visibilityItems = computed(() => [
  { key: 'onlineStatus', icon: '🌐', title: '显示在线状态', desc: '其他用户可以看到您是否在线', checked: showOnlineStatus.value, onChange: (v: boolean) => { showOnlineStatus.value = v; saveSettings() } },
  { key: 'lastSeen', icon: '🕐', title: '显示最后上线时间', desc: '其他用户可以看到您的最后活跃时间', checked: showLastSeen.value, onChange: (v: boolean) => { showLastSeen.value = v; saveSettings() } },
  { key: 'location', icon: '📍', title: '显示位置信息', desc: '在内容中显示您的地理位置', checked: showLocation.value, onChange: (v: boolean) => { showLocation.value = v; saveSettings() } },
  { key: 'favorites', icon: '❤️', title: '公开收藏夹', desc: '其他用户可以查看您的收藏内容', checked: showFavorites.value, onChange: (v: boolean) => { showFavorites.value = v; saveSettings() } },
  { key: 'following', icon: '👥', title: '公开关注列表', desc: '其他用户可以查看您关注的人', checked: showFollowing.value, onChange: (v: boolean) => { showFollowing.value = v; saveSettings() } },
])

// 互动权限列表
function labelForValue(options: { label: string; value: string }[], value: string): string {
  return options.find(o => o.value === value)?.label || ''
}

const interactionItems = computed(() => [
  {
    icon: '✉️', title: '谁可以私信我', key: 'message',
    current: whoCanMessage.value,
    currentLabel: labelForValue(messageOptions, whoCanMessage.value),
    options: messageOptions,
    open: openSelectKey.value === 'message',
    toggle: () => { openSelectKey.value = openSelectKey.value === 'message' ? null : 'message' },
    select: (v: string) => { whoCanMessage.value = v; openSelectKey.value = null; saveSettings() },
  },
  {
    icon: '💬', title: '谁可以评论我', key: 'comment',
    current: whoCanComment.value,
    currentLabel: labelForValue(commentOptions, whoCanComment.value),
    options: commentOptions,
    open: openSelectKey.value === 'comment',
    toggle: () => { openSelectKey.value = openSelectKey.value === 'comment' ? null : 'comment' },
    select: (v: string) => { whoCanComment.value = v; openSelectKey.value = null; saveSettings() },
  },
  {
    icon: '👥', title: '我加入的圈子', key: 'circle',
    current: whoCanSeeCircle.value,
    currentLabel: labelForValue(circleOptions, whoCanSeeCircle.value),
    options: circleOptions,
    open: openSelectKey.value === 'circle',
    toggle: () => { openSelectKey.value = openSelectKey.value === 'circle' ? null : 'circle' },
    select: (v: string) => { whoCanSeeCircle.value = v; openSelectKey.value = null; saveSettings() },
  },
])

// 其他设置列表
const otherItems = computed(() => [
  { key: 'history', icon: '📖', title: '记录浏览历史', desc: '记录您浏览过的内容，方便回顾', checked: recordHistory.value, onChange: (v: boolean) => { recordHistory.value = v; saveSettings() } },
  { key: 'recommend', icon: '👁️', title: '个性化推荐', desc: '基于您的兴趣推荐相关内容', checked: personalizedRecommend.value, onChange: (v: boolean) => { personalizedRecommend.value = v; saveSettings() } },
])

function initPage() {
  pageLoading.value = false
  pageError.value = null
  loadSettings()
}

onMounted(initPage)

function loadSettings() {
  try {
    const saved = uni.getStorageSync('app_privacy_settings')
    if (saved) {
      const s = JSON.parse(saved)
      if (s.showOnlineStatus !== undefined) showOnlineStatus.value = s.showOnlineStatus
      if (s.showLastSeen !== undefined) showLastSeen.value = s.showLastSeen
      if (s.showLocation !== undefined) showLocation.value = s.showLocation
      if (s.showFavorites !== undefined) showFavorites.value = s.showFavorites
      if (s.showFollowing !== undefined) showFollowing.value = s.showFollowing
      if (s.whoCanMessage) whoCanMessage.value = s.whoCanMessage
      if (s.whoCanComment) whoCanComment.value = s.whoCanComment
      if (s.whoCanSeeCircle) whoCanSeeCircle.value = s.whoCanSeeCircle
      if (s.recordHistory !== undefined) recordHistory.value = s.recordHistory
      if (s.personalizedRecommend !== undefined) personalizedRecommend.value = s.personalizedRecommend
    }
  } catch {}
}

function saveSettings() {
  uni.setStorageSync('app_privacy_settings', JSON.stringify({
    showOnlineStatus: showOnlineStatus.value,
    showLastSeen: showLastSeen.value,
    showLocation: showLocation.value,
    showFavorites: showFavorites.value,
    showFollowing: showFollowing.value,
    whoCanMessage: whoCanMessage.value,
    whoCanComment: whoCanComment.value,
    whoCanSeeCircle: whoCanSeeCircle.value,
    recordHistory: recordHistory.value,
    personalizedRecommend: personalizedRecommend.value,
  }))
}

function goBlacklist() {
  uni.navigateTo({ url: '/pages/mine/blacklist' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #e8e0d0;
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-back {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
}
.nav-back-icon {
  font-size: 48rpx;
  color: #5a3a1a;
  font-weight: 300;
}
.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #5a3a1a;
}
.nav-placeholder {
  width: 80rpx;
}

.content {
  flex: 1;
  padding-bottom: 40rpx;
}

.section {
  margin: 24rpx 24rpx 0;
}
.section-title {
  font-size: 24rpx;
  color: #8b6914;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 24rpx;
  border-bottom: 1rpx solid #f0ebe0;
}
.setting-item:last-child {
  border-bottom: none;
}
.setting-item:active {
  background: #f9f5ed;
}

.link-item:active {
  background: #f9f5ed;
}

.select-item {
  cursor: pointer;
}

.setting-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.icon-box {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 105, 20, 0.1);
  flex-shrink: 0;
}
.icon-box.red-bg {
  background: rgba(196, 30, 58, 0.1);
}

.icon-emoji {
  font-size: 32rpx;
}

.setting-label {
  font-size: 26rpx;
  color: #5a3a1a;
  font-weight: 500;
}
.setting-desc {
  font-size: 20rpx;
  color: #a09080;
  display: block;
  margin-top: 2rpx;
}
.setting-arrow {
  font-size: 32rpx;
  color: #c0b0a0;
  font-weight: bold;
  flex-shrink: 0;
}

/* 选择触发器 */
.select-trigger {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: #f5f0e8;
  border-radius: 12rpx;
}
.select-current {
  font-size: 24rpx;
  color: #8b6914;
}
.select-arrow {
  font-size: 20rpx;
  color: #a09080;
  transition: transform 0.2s;
}
.select-arrow.open {
  transform: rotate(180deg);
}

/* 选项列表 */
.select-options {
  padding: 12rpx 24rpx 20rpx 100rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  border-bottom: 1rpx solid #f0ebe0;
}
.select-option {
  padding: 10rpx 24rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  background: #f5f0e8;
  color: #a09080;
}
.select-option:active {
  opacity: 0.8;
}
.select-option.active {
  background: #8b6914;
  color: #fff;
}

/* 底部提示 */
.footer-note {
  margin: 40rpx 24rpx;
  text-align: center;
}
.footer-note text {
  font-size: 20rpx;
  color: #a09080;
}
</style>
