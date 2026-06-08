<template>
  <DataState :is-loading="pageLoading" :error="pageError" :is-empty="false" @retry="initPage">
    <view class="page">
      <!-- 顶部导航 -->
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">
          <text class="nav-back-icon">‹</text>
        </view>
        <text class="nav-title">通知设置</text>
        <view class="nav-placeholder" />
      </view>

      <scroll-view class="content" scroll-y>
        <!-- 总开关 -->
        <view class="section">
          <view class="card card-master">
            <view class="master-toggle">
              <view class="master-left">
                <view class="master-icon" :class="{ active: pushEnabled }">
                  <text class="master-emoji">{{ pushEnabled ? '🔔' : '🔕' }}</text>
                </view>
                <view class="master-info">
                  <text class="master-title">接收推送通知</text>
                  <text class="master-desc">{{ pushEnabled ? '已开启，将收到各类通知提醒' : '已关闭，将不会收到任何推送' }}</text>
                </view>
              </view>
              <switch
                :checked="pushEnabled"
                color="#8b6914"
                @change="(e: any) => pushEnabled = e.detail.value"
              />
            </view>
          </view>
        </view>

        <!-- 以下设置在总开关关闭时禁用 -->
        <view :class="['sub-settings', { disabled: !pushEnabled }]">
          <!-- 互动通知 -->
          <view class="section">
            <text class="section-title">互动通知</text>
            <view class="card">
              <view
                v-for="item in interactionNotifs"
                :key="item.key"
                class="notify-item"
              >
                <view class="notify-left">
                  <view class="notify-icon-box" :class="{ important: item.important }">
                    <text class="notify-emoji">{{ item.icon }}</text>
                  </view>
                  <view>
                    <view class="notify-title-row">
                      <text class="notify-title">{{ item.title }}</text>
                      <text v-if="item.important" class="notify-badge">重要</text>
                    </view>
                    <text class="notify-desc">{{ item.desc }}</text>
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

          <!-- 内容更新 -->
          <view class="section">
            <text class="section-title">内容更新</text>
            <view class="card">
              <view
                v-for="item in contentNotifs"
                :key="item.key"
                class="notify-item"
              >
                <view class="notify-left">
                  <view class="notify-icon-box">
                    <text class="notify-emoji">{{ item.icon }}</text>
                  </view>
                  <view>
                    <text class="notify-title">{{ item.title }}</text>
                    <text class="notify-desc">{{ item.desc }}</text>
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

          <!-- 交易通知 -->
          <view class="section">
            <text class="section-title">交易通知</text>
            <view class="card">
              <view
                v-for="item in transactionNotifs"
                :key="item.key"
                class="notify-item"
              >
                <view class="notify-left">
                  <view class="notify-icon-box" :class="{ important: item.important }">
                    <text class="notify-emoji">{{ item.icon }}</text>
                  </view>
                  <view>
                    <view class="notify-title-row">
                      <text class="notify-title">{{ item.title }}</text>
                      <text v-if="item.important" class="notify-badge">重要</text>
                    </view>
                    <text class="notify-desc">{{ item.desc }}</text>
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

          <!-- 系统通知 -->
          <view class="section">
            <text class="section-title">系统通知</text>
            <view class="card">
              <view
                v-for="item in systemNotifs"
                :key="item.key"
                class="notify-item"
              >
                <view class="notify-left">
                  <view class="notify-icon-box">
                    <text class="notify-emoji">{{ item.icon }}</text>
                  </view>
                  <view>
                    <text class="notify-title">{{ item.title }}</text>
                    <text class="notify-desc">{{ item.desc }}</text>
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

          <!-- 免打扰模式 -->
          <view class="section">
            <text class="section-title">免打扰模式</text>
            <view class="card">
              <view class="notify-item">
                <view class="notify-left">
                  <view class="notify-icon-box">
                    <text class="notify-emoji">🌙</text>
                  </view>
                  <view>
                    <text class="notify-title">开启免打扰</text>
                    <text class="notify-desc">在指定时间段内不接收推送通知</text>
                  </view>
                </view>
                <switch
                  :checked="quietModeEnabled"
                  color="#8b6914"
                  @change="(e: any) => quietModeEnabled = e.detail.value"
                />
              </view>
              <view v-if="quietModeEnabled" class="quiet-time">
                <text class="quiet-label">免打扰时段</text>
                <view class="quiet-picker">
                  <picker
                    :value="quietStartIndex"
                    :range="timeOptions"
                    @change="onQuietStartChange"
                  >
                    <text class="quiet-value">{{ quietStart }}</text>
                  </picker>
                  <text class="quiet-sep">-</text>
                  <picker
                    :value="quietEndIndex"
                    :range="timeOptions"
                    @change="onQuietEndChange"
                  >
                    <text class="quiet-value">{{ quietEnd }}</text>
                  </picker>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 底部提示 -->
        <view class="footer-note">
          <text>关闭通知后，您仍可在消息中心查看相关消息</text>
        </view>
      </scroll-view>
    </view>
  </DataState>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '@/components/DataState.vue'

const pageLoading = ref(false)
const pageError = ref<string | null>(null)

// 总开关
const pushEnabled = ref(true)

// 互动通知
const notifyComment = ref(true)
const notifyLike = ref(true)
const notifyFollow = ref(true)
const notifyMention = ref(true)
const notifyMessage = ref(true)

// 内容通知
const notifyCircleUpdate = ref(true)
const notifyLiveStart = ref(true)
const notifyCourseUpdate = ref(true)
const notifyActivityRemind = ref(true)

// 交易通知
const notifyOrder = ref(true)
const notifyIncome = ref(true)
const notifyExpiry = ref(true)

// 系统通知
const notifySystem = ref(true)
const notifyPromotion = ref(false)

// 免打扰
const quietModeEnabled = ref(true)
const quietStart = ref('22:00')
const quietEnd = ref('08:00')

const timeOptions = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
]

const quietStartIndex = computed(() => timeOptions.indexOf(quietStart.value))
const quietEndIndex = computed(() => timeOptions.indexOf(quietEnd.value))

// 分类通知列表
const interactionNotifs = computed(() => [
  { key: 'comment', icon: '💬', title: '评论通知', desc: '有人评论您的内容时通知', checked: notifyComment.value, onChange: (v: boolean) => { notifyComment.value = v; saveSettings() } },
  { key: 'like', icon: '❤️', title: '点赞通知', desc: '有人点赞您的内容时通知', checked: notifyLike.value, onChange: (v: boolean) => { notifyLike.value = v; saveSettings() } },
  { key: 'follow', icon: '👥', title: '关注通知', desc: '有人关注您时通知', checked: notifyFollow.value, onChange: (v: boolean) => { notifyFollow.value = v; saveSettings() } },
  { key: 'mention', icon: '@', title: '@提及通知', desc: '有人@您时通知', checked: notifyMention.value, onChange: (v: boolean) => { notifyMention.value = v; saveSettings() } },
  { key: 'message', icon: '✉️', title: '私信通知', desc: '收到私信时通知', checked: notifyMessage.value, onChange: (v: boolean) => { notifyMessage.value = v; saveSettings() } },
])

const contentNotifs = computed(() => [
  { key: 'circle', icon: '🔄', title: '圈子更新', desc: '关注的圈子有新内容时通知', checked: notifyCircleUpdate.value, onChange: (v: boolean) => { notifyCircleUpdate.value = v; saveSettings() } },
  { key: 'live', icon: '📺', title: '直播开播', desc: '预约的直播开播时通知', checked: notifyLiveStart.value, onChange: (v: boolean) => { notifyLiveStart.value = v; saveSettings() } },
  { key: 'course', icon: '📚', title: '课程更新', desc: '订阅的课程有新章节时通知', checked: notifyCourseUpdate.value, onChange: (v: boolean) => { notifyCourseUpdate.value = v; saveSettings() } },
  { key: 'activity', icon: '📅', title: '活动提醒', desc: '报名的活动即将开始时通知', checked: notifyActivityRemind.value, onChange: (v: boolean) => { notifyActivityRemind.value = v; saveSettings() } },
])

const transactionNotifs = computed(() => [
  { key: 'order', icon: '🛒', title: '订单通知', desc: '订单状态变更时通知（发货、完成等）', checked: notifyOrder.value, onChange: (v: boolean) => { notifyOrder.value = v; saveSettings() } },
  { key: 'income', icon: '💰', title: '收益通知', desc: '有新收益到账时通知', checked: notifyIncome.value, onChange: (v: boolean) => { notifyIncome.value = v; saveSettings() } },
  { key: 'expiry', icon: '⏰', title: '到期提醒', desc: '会员、圈子等即将到期时通知', checked: notifyExpiry.value, onChange: (v: boolean) => { notifyExpiry.value = v; saveSettings() }, important: true },
])

const systemNotifs = computed(() => [
  { key: 'system', icon: '🔔', title: '系统消息', desc: '平台公告、安全提醒等重要通知', checked: notifySystem.value, onChange: (v: boolean) => { notifySystem.value = v; saveSettings() } },
  { key: 'promotion', icon: '📧', title: '营销推广', desc: '优惠活动、新功能推荐等', checked: notifyPromotion.value, onChange: (v: boolean) => { notifyPromotion.value = v; saveSettings() } },
])

function initPage() {
  pageLoading.value = false
  pageError.value = null
  loadSettings()
}

onMounted(initPage)

function loadSettings() {
  try {
    const saved = uni.getStorageSync('app_notify_settings')
    if (saved) {
      const s = JSON.parse(saved)
      if (s.pushEnabled !== undefined) pushEnabled.value = s.pushEnabled
      if (s.quietModeEnabled !== undefined) quietModeEnabled.value = s.quietModeEnabled
      if (s.quietStart) quietStart.value = s.quietStart
      if (s.quietEnd) quietEnd.value = s.quietEnd
      if (s.notifyComment !== undefined) notifyComment.value = s.notifyComment
      if (s.notifyLike !== undefined) notifyLike.value = s.notifyLike
      if (s.notifyFollow !== undefined) notifyFollow.value = s.notifyFollow
      if (s.notifyMention !== undefined) notifyMention.value = s.notifyMention
      if (s.notifyMessage !== undefined) notifyMessage.value = s.notifyMessage
      if (s.notifyCircleUpdate !== undefined) notifyCircleUpdate.value = s.notifyCircleUpdate
      if (s.notifyLiveStart !== undefined) notifyLiveStart.value = s.notifyLiveStart
      if (s.notifyCourseUpdate !== undefined) notifyCourseUpdate.value = s.notifyCourseUpdate
      if (s.notifyActivityRemind !== undefined) notifyActivityRemind.value = s.notifyActivityRemind
      if (s.notifyOrder !== undefined) notifyOrder.value = s.notifyOrder
      if (s.notifyIncome !== undefined) notifyIncome.value = s.notifyIncome
      if (s.notifyExpiry !== undefined) notifyExpiry.value = s.notifyExpiry
      if (s.notifySystem !== undefined) notifySystem.value = s.notifySystem
      if (s.notifyPromotion !== undefined) notifyPromotion.value = s.notifyPromotion
    }
  } catch {}
}

function saveSettings() {
  uni.setStorageSync('app_notify_settings', JSON.stringify({
    pushEnabled: pushEnabled.value,
    notifyComment: notifyComment.value,
    notifyLike: notifyLike.value,
    notifyFollow: notifyFollow.value,
    notifyMention: notifyMention.value,
    notifyMessage: notifyMessage.value,
    notifyCircleUpdate: notifyCircleUpdate.value,
    notifyLiveStart: notifyLiveStart.value,
    notifyCourseUpdate: notifyCourseUpdate.value,
    notifyActivityRemind: notifyActivityRemind.value,
    notifyOrder: notifyOrder.value,
    notifyIncome: notifyIncome.value,
    notifyExpiry: notifyExpiry.value,
    notifySystem: notifySystem.value,
    notifyPromotion: notifyPromotion.value,
    quietModeEnabled: quietModeEnabled.value,
    quietStart: quietStart.value,
    quietEnd: quietEnd.value,
  }))
}

function onQuietStartChange(e: any) {
  quietStart.value = timeOptions[e.detail.value]
  saveSettings()
}

function onQuietEndChange(e: any) {
  quietEnd.value = timeOptions[e.detail.value]
  saveSettings()
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

.card-master {
  padding: 28rpx 24rpx;
}

.master-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.master-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
}

.master-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0ebe0;
}
.master-icon.active {
  background: rgba(139, 105, 20, 0.1);
}

.master-emoji {
  font-size: 40rpx;
}

.master-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #5a3a1a;
  display: block;
}

.master-desc {
  font-size: 22rpx;
  color: #a09080;
  display: block;
  margin-top: 4rpx;
}

/* 子设置禁用 */
.sub-settings.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* 通知行 */
.notify-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 24rpx;
  border-bottom: 1rpx solid #f0ebe0;
}
.notify-item:last-child {
  border-bottom: none;
}

.notify-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.notify-icon-box {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 105, 20, 0.1);
  flex-shrink: 0;
}
.notify-icon-box.important {
  background: rgba(196, 30, 58, 0.1);
}

.notify-emoji {
  font-size: 32rpx;
}

.notify-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.notify-title {
  font-size: 26rpx;
  color: #5a3a1a;
  font-weight: 500;
}

.notify-badge {
  font-size: 18rpx;
  color: #C41E3A;
  background: rgba(196, 30, 58, 0.1);
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

.notify-desc {
  font-size: 20rpx;
  color: #a09080;
  display: block;
  margin-top: 2rpx;
}

/* 免打扰时段 */
.quiet-time {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx 20rpx 104rpx;
}
.quiet-label {
  font-size: 24rpx;
  color: #a09080;
}
.quiet-picker {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.quiet-value {
  font-size: 24rpx;
  color: #5a3a1a;
  padding: 8rpx 20rpx;
  background: #f5f0e8;
  border-radius: 10rpx;
}
.quiet-sep {
  font-size: 24rpx;
  color: #a09080;
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
