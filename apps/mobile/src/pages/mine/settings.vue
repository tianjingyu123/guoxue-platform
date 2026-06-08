<template>
  <DataState :is-loading="pageLoading" :error="pageError" :is-empty="false" @retry="initPage">
    <view class="page">
      <!-- 顶部导航 -->
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">
          <text class="nav-back-icon">‹</text>
        </view>
        <text class="nav-title">设置</text>
        <view class="nav-placeholder" />
      </view>

      <scroll-view class="content" scroll-y>
        <!-- 账号与安全 -->
        <view class="section">
          <text class="section-title">账号与安全</text>
          <view class="card">
            <view class="setting-item" @click="goPage('/pages/mine/change-phone')">
              <view class="setting-left">
                <text class="setting-icon">📱</text>
                <text class="setting-label">手机号</text>
              </view>
              <view class="setting-right">
                <text class="setting-value">138****8888</text>
                <text class="setting-arrow">›</text>
              </view>
            </view>
            <view class="setting-item" @click="goPage('/pages/mine/change-password')">
              <view class="setting-left">
                <text class="setting-icon">🔒</text>
                <text class="setting-label">登录密码</text>
              </view>
              <view class="setting-right">
                <text class="setting-value">修改</text>
                <text class="setting-arrow">›</text>
              </view>
            </view>
            <view class="setting-item">
              <view class="setting-left">
                <text class="setting-icon">🛡️</text>
                <text class="setting-label">二次验证</text>
              </view>
              <switch
                :checked="twoFactorEnabled"
                color="#8b6914"
                @change="(e: any) => twoFactorEnabled = e.detail.value"
              />
            </view>
          </view>
        </view>

        <!-- 隐私设置 -->
        <view class="section">
          <text class="section-title">隐私设置</text>
          <view class="card">
            <view class="setting-item">
              <view class="setting-left">
                <text class="setting-icon">👁️</text>
                <view>
                  <text class="setting-label">公开展示我的收藏</text>
                  <text class="setting-desc">其他用户可以看到您的收藏内容</text>
                </view>
              </view>
              <switch
                :checked="showFavorites"
                color="#8b6914"
                @change="(e: any) => showFavorites = e.detail.value"
              />
            </view>
            <view class="setting-item">
              <view class="setting-left">
                <text class="setting-icon">📖</text>
                <view>
                  <text class="setting-label">记录浏览历史</text>
                  <text class="setting-desc">记录您浏览过的内容，方便回顾</text>
                </view>
              </view>
              <switch
                :checked="recordHistory"
                color="#8b6914"
                @change="(e: any) => recordHistory = e.detail.value"
              />
            </view>
            <view class="setting-item" @click="goPage('/pages/mine/settings-privacy')">
              <view class="setting-left">
                <text class="setting-icon">🔐</text>
                <text class="setting-label">更多隐私设置</text>
              </view>
              <view class="setting-right">
                <text class="setting-arrow">›</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 通知设置 -->
        <view class="section">
          <text class="section-title">通知设置</text>
          <view class="card">
            <view class="setting-item">
              <view class="setting-left">
                <text class="setting-icon">🔔</text>
                <view>
                  <text class="setting-label">推送通知</text>
                  <text class="setting-desc">接收各类通知提醒</text>
                </view>
              </view>
              <switch
                :checked="pushEnabled"
                color="#8b6914"
                @change="(e: any) => pushEnabled = e.detail.value"
              />
            </view>
            <view class="setting-item" @click="goPage('/pages/mine/settings-notification')">
              <view class="setting-left">
                <text class="setting-icon">⚙️</text>
                <text class="setting-label">通知分类管理</text>
              </view>
              <view class="setting-right">
                <text class="setting-arrow">›</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 外观主题 -->
        <view class="section">
          <text class="section-title">外观主题</text>
          <view class="card">
            <view class="setting-item">
              <view class="setting-left">
                <text class="setting-icon">🎨</text>
                <text class="setting-label">主题模式</text>
              </view>
              <view class="theme-selector">
                <text
                  class="theme-option"
                  :class="{ active: theme === 'auto' }"
                  @click="theme = 'auto'"
                >自动</text>
                <text
                  class="theme-option"
                  :class="{ active: theme === 'light' }"
                  @click="theme = 'light'"
                >浅色</text>
                <text
                  class="theme-option"
                  :class="{ active: theme === 'dark' }"
                  @click="theme = 'dark'"
                >深色</text>
              </view>
            </view>
            <view class="setting-item" @click="goPage('/pages/mine/settings-display')">
              <view class="setting-left">
                <text class="setting-icon">🖥️</text>
                <text class="setting-label">显示设置</text>
              </view>
              <view class="setting-right">
                <text class="setting-value">阅读背景 · 字体</text>
                <text class="setting-arrow">›</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 通用设置 -->
        <view class="section">
          <text class="section-title">通用设置</text>
          <view class="card">
            <view class="setting-item" @click="openSelect('readingBg')">
              <view class="setting-left">
                <text class="setting-icon">📄</text>
                <text class="setting-label">默认阅读背景</text>
              </view>
              <view class="setting-right">
                <text class="setting-value">{{ readingBg }}</text>
                <text class="setting-arrow">›</text>
              </view>
            </view>
            <view class="setting-item" @click="openSelect('fontSize')">
              <view class="setting-left">
                <text class="setting-icon">🔤</text>
                <text class="setting-label">字体大小</text>
              </view>
              <view class="setting-right">
                <text class="setting-value">{{ fontSize }}</text>
                <text class="setting-arrow">›</text>
              </view>
            </view>
            <view class="setting-item" @click="openSelect('autoPlay')">
              <view class="setting-left">
                <text class="setting-icon">📹</text>
                <text class="setting-label">视频自动播放</text>
              </view>
              <view class="setting-right">
                <text class="setting-value">{{ autoPlay }}</text>
                <text class="setting-arrow">›</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 缓存管理 -->
        <view class="section">
          <text class="section-title">缓存管理</text>
          <view class="card">
            <view class="setting-item">
              <view class="setting-left">
                <text class="setting-icon">🗑️</text>
                <view>
                  <text class="setting-label">缓存数据</text>
                  <text class="setting-desc">{{ isClearing ? '清理中...' : cacheSize }}</text>
                </view>
              </view>
              <view
                class="btn-small"
                :class="{ disabled: isClearing }"
                @click="handleClearCache"
              >
                <text>{{ isClearing ? '清理中' : '清理缓存' }}</text>
              </view>
            </view>
            <view class="setting-item" @click="goPage('/pages/mine/settings-cache')">
              <view class="setting-left">
                <text class="setting-icon">📊</text>
                <text class="setting-label">缓存详情管理</text>
              </view>
              <view class="setting-right">
                <text class="setting-arrow">›</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 关于我们 -->
        <view class="section">
          <text class="section-title">关于我们</text>
          <view class="card">
            <view class="setting-item" @click="goPage('/pages/mine/settings-about')">
              <view class="setting-left">
                <text class="setting-icon">📋</text>
                <text class="setting-label">关于热卜国学</text>
              </view>
              <view class="setting-right">
                <text class="setting-arrow">›</text>
              </view>
            </view>
            <view class="setting-item" @click="goAgreement">
              <view class="setting-left">
                <text class="setting-icon">📝</text>
                <text class="setting-label">用户协议</text>
              </view>
              <view class="setting-right">
                <text class="setting-arrow">›</text>
              </view>
            </view>
            <view class="setting-item" @click="goPrivacy">
              <view class="setting-left">
                <text class="setting-icon">🛡️</text>
                <text class="setting-label">隐私政策</text>
              </view>
              <view class="setting-right">
                <text class="setting-arrow">›</text>
              </view>
            </view>
            <view class="setting-item">
              <view class="setting-left">
                <text class="setting-icon">ℹ️</text>
                <text class="setting-label">版本号</text>
              </view>
              <text class="setting-value">v1.0.0</text>
            </view>
          </view>
        </view>

        <!-- 退出登录 -->
        <view class="logout-area">
          <view class="logout-btn" @click="showLogoutConfirm = true">
            <text>退出登录</text>
          </view>
        </view>
      </scroll-view>

      <!-- 选择弹窗 -->
      <view v-if="selectModal" class="modal-mask" @click="closeSelect">
        <view class="modal-content" @click.stop>
          <view class="modal-header">
            <text class="modal-title">{{ selectModal.title }}</text>
          </view>
          <view class="modal-body">
            <view
              v-for="opt in selectModal.options"
              :key="opt"
              class="modal-option"
              :class="{ selected: opt === selectModal.current }"
              @click="onSelectOption(opt)"
            >
              <text>{{ opt }}</text>
              <text v-if="opt === selectModal.current" class="check-mark">✓</text>
            </view>
          </view>
          <view class="modal-footer">
            <view class="modal-cancel" @click="closeSelect">
              <text>取消</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 退出确认弹窗 -->
      <view v-if="showLogoutConfirm" class="modal-mask" @click="showLogoutConfirm = false">
        <view class="confirm-modal" @click.stop>
          <view class="confirm-body">
            <text class="confirm-title">确认退出登录？</text>
            <text class="confirm-desc">退出后将需要重新登录才能使用完整功能</text>
          </view>
          <view class="confirm-actions">
            <view class="confirm-btn cancel" @click="showLogoutConfirm = false">
              <text>取消</text>
            </view>
            <view class="confirm-btn confirm" @click="handleLogout">
              <text>确认退出</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </DataState>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../store/user'
import DataState from '@/components/DataState.vue'

const userStore = useUserStore()

// 页面状态
const pageLoading = ref(false)
const pageError = ref<string | null>(null)

// 账号安全
const twoFactorEnabled = ref(false)

// 隐私
const showFavorites = ref(true)
const recordHistory = ref(true)

// 通知
const pushEnabled = ref(true)

// 主题
const theme = ref('auto')

// 通用设置
const readingBg = ref('宣纸色')
const fontSize = ref('中')
const autoPlay = ref('仅Wi-Fi')

// 缓存
const cacheSize = ref('计算中...')
const isClearing = ref(false)

// 弹窗
const showLogoutConfirm = ref(false)

// 选择弹窗
interface SelectModal {
  title: string
  options: string[]
  current: string
  key: string
}
const selectModal = ref<SelectModal | null>(null)

const selectOptions: Record<string, { title: string; options: string[] }> = {
  readingBg: { title: '默认阅读背景', options: ['宣纸色', '护眼黄', '夜间黑', '纯白'] },
  fontSize: { title: '字体大小', options: ['小', '中', '大'] },
  autoPlay: { title: '视频自动播放', options: ['仅Wi-Fi', '始终', '关闭'] },
}

function initPage() {
  pageLoading.value = false
  pageError.value = null
  loadSettings()
  calcCache()
}

onMounted(() => {
  initPage()
  calcCache()
})

function loadSettings() {
  try {
    const saved = uni.getStorageSync('app_settings')
    if (saved) {
      const s = JSON.parse(saved)
      if (s.theme) theme.value = s.theme
      if (s.readingBg) readingBg.value = s.readingBg
      if (s.fontSize) fontSize.value = s.fontSize
      if (s.autoPlay) autoPlay.value = s.autoPlay
      if (s.pushEnabled !== undefined) pushEnabled.value = s.pushEnabled
      if (s.showFavorites !== undefined) showFavorites.value = s.showFavorites
      if (s.recordHistory !== undefined) recordHistory.value = s.recordHistory
      if (s.twoFactorEnabled !== undefined) twoFactorEnabled.value = s.twoFactorEnabled
    }
  } catch {}
}

function saveSettings() {
  uni.setStorageSync('app_settings', JSON.stringify({
    theme: theme.value,
    readingBg: readingBg.value,
    fontSize: fontSize.value,
    autoPlay: autoPlay.value,
    pushEnabled: pushEnabled.value,
    showFavorites: showFavorites.value,
    recordHistory: recordHistory.value,
    twoFactorEnabled: twoFactorEnabled.value,
  }))
}

function calcCache() {
  try {
    const info = uni.getStorageInfoSync()
    const size = (info.currentSize || 0).toFixed(1)
    cacheSize.value = size + 'MB'
  } catch {
    cacheSize.value = '0MB'
  }
}

function handleClearCache() {
  isClearing.value = true
  uni.showLoading({ title: '清理中...' })
  setTimeout(() => {
    try {
      uni.clearStorageSync()
      cacheSize.value = '0MB'
    } catch {}
    uni.hideLoading()
    isClearing.value = false
    uni.showToast({ title: '缓存已清理', icon: 'success' })
  }, 1500)
}

function openSelect(key: string) {
  const opt = selectOptions[key]
  if (!opt) return
  const currentMap: Record<string, string> = {
    readingBg: readingBg.value,
    fontSize: fontSize.value,
    autoPlay: autoPlay.value,
  }
  selectModal.value = {
    title: opt.title,
    options: opt.options,
    current: currentMap[key] || opt.options[0],
    key,
  }
}

function closeSelect() {
  selectModal.value = null
}

function onSelectOption(opt: string) {
  if (!selectModal.value) return
  const key = selectModal.value.key
  if (key === 'readingBg') readingBg.value = opt
  else if (key === 'fontSize') fontSize.value = opt
  else if (key === 'autoPlay') autoPlay.value = opt
  saveSettings()
  selectModal.value = null
}

function handleLogout() {
  showLogoutConfirm.value = false
  uni.showLoading({ title: '退出中...' })
  setTimeout(() => {
    userStore.logout()
    uni.hideLoading()
    uni.reLaunch({ url: '/pages/index/index' })
  }, 500)
}

function goPage(url: string) {
  uni.navigateTo({ url })
}

function goAgreement() {
  uni.navigateTo({ url: '/pages/mine/settings-about?tab=agreement' })
}

function goPrivacy() {
  uni.navigateTo({ url: '/pages/mine/settings-about?tab=privacy' })
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

.setting-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}
.setting-icon {
  font-size: 32rpx;
  width: 44rpx;
  text-align: center;
  flex-shrink: 0;
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
.setting-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.setting-value {
  font-size: 24rpx;
  color: #a09080;
}
.setting-arrow {
  font-size: 32rpx;
  color: #c0b0a0;
  font-weight: bold;
}

/* 主题选择 */
.theme-selector {
  display: flex;
  gap: 8rpx;
}
.theme-option {
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
  font-size: 22rpx;
  border: 2rpx solid #e0d8c8;
  color: #8b6914;
}
.theme-option.active {
  background: #8b6914;
  border-color: #8b6914;
  color: #fff;
}

/* 小按钮 */
.btn-small {
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  background: rgba(139, 105, 20, 0.1);
  color: #8b6914;
  font-weight: 500;
}
.btn-small:active {
  background: rgba(139, 105, 20, 0.2);
}
.btn-small.disabled {
  background: #f0ebe0;
  color: #a09080;
}

/* 退出登录 */
.logout-area {
  margin: 60rpx 24rpx 40rpx;
}
.logout-btn {
  height: 80rpx;
  background: #fff;
  border: 2rpx solid #C41E3A;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logout-btn:active {
  opacity: 0.7;
}
.logout-btn text {
  font-size: 28rpx;
  color: #C41E3A;
  font-weight: 500;
}

/* 弹窗遮罩 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-content {
  width: 100%;
  max-width: 750rpx;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  overflow: hidden;
}
.modal-header {
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #f0ebe0;
}
.modal-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #5a3a1a;
  text-align: center;
  display: block;
}
.modal-body {
  padding: 16rpx 0;
}
.modal-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  font-size: 28rpx;
  color: #5a3a1a;
}
.modal-option:active {
  background: #f9f5ed;
}
.modal-option.selected {
  color: #8b6914;
  background: rgba(139, 105, 20, 0.05);
}
.check-mark {
  color: #8b6914;
  font-weight: bold;
}
.modal-footer {
  padding: 20rpx 24rpx;
  border-top: 1rpx solid #f0ebe0;
}
.modal-cancel {
  padding: 24rpx 0;
  background: #f5f0e8;
  border-radius: 16rpx;
  text-align: center;
}
.modal-cancel text {
  font-size: 28rpx;
  color: #a09080;
}

/* 确认弹窗 */
.confirm-modal {
  width: 580rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  margin-bottom: 20vh;
}
.confirm-body {
  padding: 48rpx 32rpx;
  text-align: center;
}
.confirm-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #5a3a1a;
  display: block;
}
.confirm-desc {
  font-size: 26rpx;
  color: #a09080;
  display: block;
  margin-top: 16rpx;
}
.confirm-actions {
  display: flex;
  border-top: 1rpx solid #f0ebe0;
}
.confirm-btn {
  flex: 1;
  padding: 28rpx 0;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
}
.confirm-btn:active {
  background: #f9f5ed;
}
.confirm-btn.cancel {
  border-right: 1rpx solid #f0ebe0;
  color: #5a3a1a;
}
.confirm-btn.confirm {
  color: #C41E3A;
}
</style>
