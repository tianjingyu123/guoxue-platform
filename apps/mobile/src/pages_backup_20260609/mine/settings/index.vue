<template>
  <view class="settings-page">
    <!-- 头部 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">设置</text>
        <view class="header-spacer" />
      </view>
    </view>

    <view class="page-body">
      <!-- 账号与安全 -->
      <view class="card">
        <view class="card-label">账号与安全</view>
        <view class="card-body">
          <view class="setting-row" @click="goPage('/pages/mine/phone/index')">
            <view class="sr-left">
              <view class="sr-icon"><text>📱</text></view>
              <text class="sr-label">手机号</text>
            </view>
            <view class="sr-right">
              <text class="sr-value">138****8888</text>
              <text class="sr-arrow">›</text>
            </view>
          </view>
          <view class="setting-row" @click="goPage('/pages/mine/password/index')">
            <view class="sr-left">
              <view class="sr-icon"><text>🔒</text></view>
              <text class="sr-label">登录密码</text>
            </view>
            <view class="sr-right">
              <text class="sr-value">修改</text>
              <text class="sr-arrow">›</text>
            </view>
          </view>
          <view class="setting-row">
            <view class="sr-left">
              <view class="sr-icon"><text>🛡️</text></view>
              <text class="sr-label">二次验证</text>
            </view>
            <view class="sr-right">
              <switch :checked="twoFactorEnabled" @change="twoFactorEnabled = $event.detail.value" color="#C41E3A" />
            </view>
          </view>
        </view>
      </view>

      <!-- 隐私设置 -->
      <view class="card">
        <view class="card-label">隐私设置</view>
        <view class="card-body">
          <view class="setting-row">
            <view class="sr-left">
              <view class="sr-icon"><text>👁️</text></view>
              <text class="sr-label">公开展示我的收藏</text>
            </view>
            <switch :checked="showFavorites" @change="showFavorites = $event.detail.value" color="#C41E3A" />
          </view>
          <view class="setting-row">
            <view class="sr-left">
              <view class="sr-icon"><text>📋</text></view>
              <text class="sr-label">记录浏览历史</text>
            </view>
            <switch :checked="recordHistory" @change="recordHistory = $event.detail.value" color="#C41E3A" />
          </view>
        </view>
      </view>

      <!-- 通知设置 -->
      <view class="card">
        <view class="card-label">通知设置</view>
        <view class="card-body">
          <view class="setting-row">
            <view class="sr-left">
              <view class="sr-icon"><text>🔔</text></view>
              <text class="sr-label">推送通知</text>
            </view>
            <switch :checked="pushEnabled" @change="pushEnabled = $event.detail.value" color="#C41E3A" />
          </view>
          <view class="setting-row" @click="openSelect('消息免打扰时段', quietHoursOptions, quietHours, setQuietHours)">
            <view class="sr-left">
              <view class="sr-icon"><text>🌙</text></view>
              <text class="sr-label">消息免打扰时段</text>
            </view>
            <view class="sr-right">
              <text class="sr-value">{{ quietHours }}</text>
              <text class="sr-arrow">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 外观主题 -->
      <view class="card">
        <view class="card-label">外观主题</view>
        <view class="card-body">
          <view class="setting-row">
            <view class="sr-left">
              <view class="sr-icon"><text>🎨</text></view>
              <text class="sr-label">主题模式</text>
            </view>
            <view class="theme-switch">
              <text
                v-for="t in themes"
                :key="t.value"
                class="theme-opt"
                :class="{ active: currentTheme === t.value }"
                @click="currentTheme = t.value"
              >{{ t.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 通用设置 -->
      <view class="card">
        <view class="card-label">通用设置</view>
        <view class="card-body">
          <view class="setting-row" @click="openSelect('默认阅读背景', bgOptions, readingBg, setReadingBg)">
            <view class="sr-left">
              <view class="sr-icon"><text>👁️</text></view>
              <text class="sr-label">默认阅读背景</text>
            </view>
            <view class="sr-right">
              <text class="sr-value">{{ readingBg }}</text>
              <text class="sr-arrow">›</text>
            </view>
          </view>
          <view class="setting-row" @click="openSelect('字体大小', fontSizeOptions, fontSize, setFontSize)">
            <view class="sr-left">
              <view class="sr-icon"><text>🔤</text></view>
              <text class="sr-label">字体大小</text>
            </view>
            <view class="sr-right">
              <text class="sr-value">{{ fontSize }}</text>
              <text class="sr-arrow">›</text>
            </view>
          </view>
          <view class="setting-row" @click="openSelect('视频自动播放', autoPlayOptions, autoPlay, setAutoPlay)">
            <view class="sr-left">
              <view class="sr-icon"><text>📶</text></view>
              <text class="sr-label">视频自动播放</text>
            </view>
            <view class="sr-right">
              <text class="sr-value">{{ autoPlay }}</text>
              <text class="sr-arrow">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 缓存管理 -->
      <view class="card">
        <view class="card-label">缓存管理</view>
        <view class="card-body">
          <view class="setting-row">
            <view class="sr-left">
              <view class="sr-icon"><text>🗑️</text></view>
              <view>
                <text class="sr-label">缓存数据</text>
                <text class="sr-sub">{{ isClearing ? '清理中...' : cacheSize }}</text>
              </view>
            </view>
            <view class="clear-btn" :class="{ disabled: isClearing }" @click="handleClearCache">
              <text>{{ isClearing ? '清理中' : '清理缓存' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 关于我们 -->
      <view class="card">
        <view class="card-label">关于我们</view>
        <view class="card-body">
          <view class="setting-row" @click="goPage('/pages/about/agreement/index')">
            <view class="sr-left">
              <view class="sr-icon"><text>📄</text></view>
              <text class="sr-label">用户协议</text>
            </view>
            <text class="sr-arrow">›</text>
          </view>
          <view class="setting-row" @click="goPage('/pages/about/privacy/index')">
            <view class="sr-left">
              <view class="sr-icon"><text>🛡️</text></view>
              <text class="sr-label">隐私政策</text>
            </view>
            <text class="sr-arrow">›</text>
          </view>
          <view class="setting-row">
            <view class="sr-left">
              <view class="sr-icon"><text>ℹ️</text></view>
              <text class="sr-label">版本号</text>
            </view>
            <text class="sr-value">v1.0.0</text>
          </view>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-btn" @click="showLogoutConfirm = true">
        <text>退出登录</text>
      </view>
    </view>

    <!-- 选择弹窗 -->
    <view v-if="selectModal" class="modal-overlay" @click="selectModal = null">
      <view class="select-modal" @click.stop>
        <text class="sm-title">{{ selectModal.title }}</text>
        <view class="sm-list">
          <view
            v-for="opt in selectModal.options"
            :key="opt"
            class="sm-option"
            :class="{ active: opt === selectModal.current }"
            @click="selectModal.onSelect(opt); selectModal = null"
          >
            <text>{{ opt }}</text>
            <text v-if="opt === selectModal.current" class="sm-check">✓</text>
          </view>
        </view>
        <view class="sm-cancel" @click="selectModal = null">
          <text>取消</text>
        </view>
      </view>
    </view>

    <!-- 退出确认弹窗 -->
    <view v-if="showLogoutConfirm" class="modal-overlay" @click="showLogoutConfirm = false">
      <view class="confirm-modal" @click.stop>
        <view class="cm-body">
          <text class="cm-title">确认退出登录？</text>
          <text class="cm-desc">退出后将需要重新登录才能使用完整功能</text>
        </view>
        <view class="cm-actions">
          <view class="cm-btn" @click="showLogoutConfirm = false"><text>取消</text></view>
          <view class="cm-btn danger" @click="handleLogout"><text>确认退出</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const twoFactorEnabled = ref(false)
const showFavorites = ref(true)
const recordHistory = ref(true)
const pushEnabled = ref(true)
const quietHours = ref('22:00-08:00')
const readingBg = ref('宣纸色')
const fontSize = ref('中')
const autoPlay = ref('仅Wi-Fi')
const cacheSize = ref('128.5MB')
const isClearing = ref(false)
const showLogoutConfirm = ref(false)
const currentTheme = ref('light')

const themes = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

const quietHoursOptions = ['关闭', '22:00-08:00', '23:00-07:00', '00:00-08:00']
const bgOptions = ['宣纸色', '护眼黄', '夜间黑', '纯白']
const fontSizeOptions = ['小', '中', '大']
const autoPlayOptions = ['仅Wi-Fi', '始终', '关闭']

interface SelectModal {
  title: string
  options: string[]
  current: string
  onSelect: (v: string) => void
}

const selectModal = ref<SelectModal | null>(null)

function openSelect(title: string, options: string[], current: string, onSelect: (v: string) => void) {
  selectModal.value = { title, options, current, onSelect }
}

function setQuietHours(v: string) { quietHours.value = v }
function setReadingBg(v: string) { readingBg.value = v }
function setFontSize(v: string) { fontSize.value = v }
function setAutoPlay(v: string) { autoPlay.value = v }

function handleClearCache() {
  isClearing.value = true
  setTimeout(() => { isClearing.value = false }, 1500)
}

function handleLogout() {
  showLogoutConfirm.value = false
  // 退出登录逻辑
}

function goPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 48rpx;
}

.header-sticky {
  position: sticky;
  top: 0;
  z-index: 30;
  background: #fff;
  border-bottom: 1px solid #E8E0D5;
}
.header-row {
  display: flex;
  align-items: center;
  padding: 10rpx 24rpx;
  height: 80rpx;
}
.header-back {
  font-size: 48rpx;
  color: #333;
  width: 56rpx;
}
.header-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
  flex: 1;
  text-align: center;
}
.header-spacer {
  width: 56rpx;
}

.page-body {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.card-label {
  font-size: 22rpx;
  color: #999;
  padding: 16rpx 24rpx 12rpx;
  border-bottom: 1px solid #F5F1EB;
}
.card-body {
  /* divider between rows handled by .setting-row + border-bottom */
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1px solid #F5F1EB;
}
.setting-row:last-child {
  border-bottom: none;
}

.sr-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.sr-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: #F5F1EB;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}
.sr-label {
  font-size: 28rpx;
  color: #2C2C2C;
}
.sr-sub {
  font-size: 20rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}
.sr-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.sr-value {
  font-size: 26rpx;
  color: #999;
}
.sr-arrow {
  font-size: 36rpx;
  color: #CCC;
}

.theme-switch {
  display: flex;
  background: #F5F1EB;
  border-radius: 10rpx;
  padding: 4rpx;
}
.theme-opt {
  padding: 10rpx 24rpx;
  font-size: 24rpx;
  color: #999;
  border-radius: 8rpx;
}
.theme-opt.active {
  background: #fff;
  color: #C41E3A;
  font-weight: 500;
}

.clear-btn {
  padding: 10rpx 24rpx;
  border-radius: 16rpx;
  font-size: 22rpx;
  font-weight: 500;
  background: rgba(196, 30, 58, 0.08);
  color: #C41E3A;
}
.clear-btn.disabled {
  background: #F5F1EB;
  color: #999;
}

.logout-btn {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
  color: #C41E3A;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.select-modal {
  width: 100%;
  max-width: 750rpx;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}
.sm-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
  text-align: center;
  padding: 32rpx;
  border-bottom: 1px solid #E8E0D5;
}
.sm-list {
  padding: 16rpx 0;
}
.sm-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #2C2C2C;
}
.sm-option.active {
  background: rgba(196, 30, 58, 0.04);
  color: #C41E3A;
}
.sm-check {
  color: #C41E3A;
  font-size: 32rpx;
}
.sm-cancel {
  margin: 16rpx 24rpx 32rpx;
  padding: 24rpx;
  text-align: center;
  background: #F5F1EB;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #999;
}

.confirm-modal {
  width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}
.cm-body {
  padding: 48rpx 32rpx;
  text-align: center;
}
.cm-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2C2C2C;
  display: block;
}
.cm-desc {
  font-size: 26rpx;
  color: #999;
  margin-top: 16rpx;
  display: block;
}
.cm-actions {
  display: flex;
  border-top: 1px solid #E8E0D5;
}
.cm-btn {
  flex: 1;
  padding: 28rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  border-right: 1px solid #E8E0D5;
}
.cm-btn:last-child {
  border-right: none;
}
.cm-btn.danger {
  color: #C41E3A;
}
</style>
