<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <text class="nav-title">设置</text>
      <view class="nav-placeholder" />
    </view>

    <!-- ==================== 通知设置 ==================== -->
    <view class="section">
      <text class="section-title">通知设置</text>
      <view class="setting-list">
        <view class="setting-item">
          <view class="setting-left">
            <text class="setting-icon">🔔</text>
            <view>
              <text class="setting-label">系统通知</text>
              <text class="setting-desc">活动推送、系统公告</text>
            </view>
          </view>
          <switch
            :checked="notifySettings.system"
            color="#C9A96E"
            @change="(e: any) => toggleNotify('system', e.detail.value)"
          />
        </view>
        <view class="setting-item">
          <view class="setting-left">
            <text class="setting-icon">💬</text>
            <view>
              <text class="setting-label">评论与回复</text>
              <text class="setting-desc">有人评论或回复我的内容</text>
            </view>
          </view>
          <switch
            :checked="notifySettings.comment"
            color="#C9A96E"
            @change="(e: any) => toggleNotify('comment', e.detail.value)"
          />
        </view>
        <view class="setting-item">
          <view class="setting-left">
            <text class="setting-icon">❤️</text>
            <view>
              <text class="setting-label">点赞与关注</text>
              <text class="setting-desc">有人点赞或关注我</text>
            </view>
          </view>
          <switch
            :checked="notifySettings.like"
            color="#C9A96E"
            @change="(e: any) => toggleNotify('like', e.detail.value)"
          />
        </view>
        <view class="setting-item">
          <view class="setting-left">
            <text class="setting-icon">📢</text>
            <view>
              <text class="setting-label">直播提醒</text>
              <text class="setting-desc">关注的直播开始</text>
            </view>
          </view>
          <switch
            :checked="notifySettings.live"
            color="#C9A96E"
            @change="(e: any) => toggleNotify('live', e.detail.value)"
          />
        </view>
      </view>
    </view>

    <!-- ==================== 隐私设置 ==================== -->
    <view class="section">
      <text class="section-title">隐私设置</text>
      <view class="setting-list">
        <view class="setting-item">
          <view class="setting-left">
            <text class="setting-icon">👤</text>
            <view>
              <text class="setting-label">公开个人资料</text>
              <text class="setting-desc">允许他人查看我的资料页</text>
            </view>
          </view>
          <switch
            :checked="privacySettings.publicProfile"
            color="#C9A96E"
            @change="(e: any) => togglePrivacy('publicProfile', e.detail.value)"
          />
        </view>
        <view class="setting-item">
          <view class="setting-left">
            <text class="setting-icon">📍</text>
            <view>
              <text class="setting-label">显示地理位置</text>
              <text class="setting-desc">在内容中展示位置信息</text>
            </view>
          </view>
          <switch
            :checked="privacySettings.showLocation"
            color="#C9A96E"
            @change="(e: any) => togglePrivacy('showLocation', e.detail.value)"
          />
        </view>
        <view class="setting-item">
          <view class="setting-left">
            <text class="setting-icon">🔍</text>
            <view>
              <text class="setting-label">允许被搜索</text>
              <text class="setting-desc">通过手机号可搜索到我</text>
            </view>
          </view>
          <switch
            :checked="privacySettings.searchable"
            color="#C9A96E"
            @change="(e: any) => togglePrivacy('searchable', e.detail.value)"
          />
        </view>
        <view class="setting-item" @click="goPage('/pages/mine/privacy-authorization')">
          <view class="setting-left">
            <text class="setting-icon">🛡️</text>
            <view>
              <text class="setting-label">授权管理</text>
              <text class="setting-desc">管理第三方授权</text>
            </view>
          </view>
          <text class="setting-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- ==================== 通用设置 ==================== -->
    <view class="section">
      <text class="section-title">通用设置</text>
      <view class="setting-list">
        <view class="setting-item">
          <view class="setting-left">
            <text class="setting-icon">🎨</text>
            <view>
              <text class="setting-label">深色模式</text>
              <text class="setting-desc">跟随系统或手动切换</text>
            </view>
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
        <view class="setting-item" @click="goTeenMode">
          <view class="setting-left">
            <text class="setting-icon">👶</text>
            <view>
              <text class="setting-label">青少年模式</text>
              <text class="setting-desc">限制使用时长和内容</text>
            </view>
          </view>
          <text class="setting-arrow">›</text>
        </view>
        <view class="setting-item" @click="clearCache">
          <view class="setting-left">
            <text class="setting-icon">🗑️</text>
            <view>
              <text class="setting-label">清除缓存</text>
              <text class="setting-desc">清理本地缓存数据</text>
            </view>
          </view>
          <text class="setting-value">{{ cacheSize }}</text>
        </view>
        <view class="setting-item" @click="goPage('')">
          <view class="setting-left">
            <text class="setting-icon">ℹ️</text>
            <view>
              <text class="setting-label">关于我们</text>
              <text class="setting-desc">版本信息与用户协议</text>
            </view>
          </view>
          <text class="setting-value">v1.0.0</text>
        </view>
      </view>
    </view>

    <!-- 退出登录 -->
    <button class="logout-btn" @click="handleLogout">退出登录</button>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()

const cacheSize = ref('计算中...')

// 通知设置
const notifySettings = ref({
  system: true,
  comment: true,
  like: true,
  live: false,
})

// 隐私设置
const privacySettings = ref({
  publicProfile: true,
  showLocation: false,
  searchable: true,
})

// 主题
const theme = ref('auto')

onMounted(() => {
  loadSettings()
  calcCache()
})

function loadSettings() {
  try {
    const saved = uni.getStorageSync('app_settings')
    if (saved) {
      const s = JSON.parse(saved)
      if (s.notify) notifySettings.value = { ...notifySettings.value, ...s.notify }
      if (s.privacy) privacySettings.value = { ...privacySettings.value, ...s.privacy }
      if (s.theme) theme.value = s.theme
    }
  } catch {}
}

function saveSettings() {
  uni.setStorageSync('app_settings', JSON.stringify({
    notify: notifySettings.value,
    privacy: privacySettings.value,
    theme: theme.value,
  }))
}

function toggleNotify(key: string, val: boolean) {
  ;(notifySettings.value as any)[key] = val
  saveSettings()
  uni.showToast({ title: val ? '已开启' : '已关闭', icon: 'none' })
}

function togglePrivacy(key: string, val: boolean) {
  ;(privacySettings.value as any)[key] = val
  saveSettings()
  uni.showToast({ title: val ? '已开启' : '已关闭', icon: 'none' })
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

function clearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '确定清除所有本地缓存吗？',
    success: (res) => {
      if (res.confirm) {
        try {
          uni.clearStorageSync()
          uni.showToast({ title: '已清除', icon: 'success' })
          cacheSize.value = '0MB'
        } catch {
          uni.showToast({ title: '清除失败', icon: 'none' })
        }
      }
    },
  })
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/pages/index/index' })
      }
    },
  })
}

function goPage(url: string) {
  if (url) {
    uni.navigateTo({ url })
  } else {
    uni.showToast({ title: '即将上线', icon: 'none' })
  }
}
function goTeenMode() {
  uni.navigateTo({ url: '/pages/mine/teen-mode' })
}
function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: $bg;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* ── 导航栏 ── */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
}
.nav-back {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
}
.nav-back-icon {
  font-size: 48rpx;
  color: $text;
  font-weight: 300;
}
.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $text;
}
.nav-placeholder {
  width: 80rpx;
}

/* ── 分区 ── */
.section {
  margin: 24rpx 24rpx 0;
}
.section-title {
  font-size: 24rpx;
  color: $text-tertiary;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}
.setting-list {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 24rpx;
  border-bottom: 1rpx solid $border-light;
}
.setting-item:last-child {
  border-bottom: none;
}
.setting-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}
.setting-icon {
  font-size: 32rpx;
  width: 44rpx;
  text-align: center;
}
.setting-label {
  font-size: 26rpx;
  color: $text;
  font-weight: 500;
  display: block;
}
.setting-desc {
  font-size: 20rpx;
  color: $text-tertiary;
  display: block;
  margin-top: 2rpx;
}
.setting-value {
  font-size: 24rpx;
  color: $text-tertiary;
}
.setting-arrow {
  font-size: 32rpx;
  color: $border;
  font-weight: bold;
}

/* ── 主题选择 ── */
.theme-selector {
  display: flex;
  gap: 8rpx;
}
.theme-option {
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
  font-size: 22rpx;
  border: 2rpx solid $border;
  color: $text-secondary;
}
.theme-option.active {
  background: $gold;
  border-color: $gold;
  color: #fff;
}

/* ── 退出登录 ── */
.logout-btn {
  width: calc(100% - 48rpx);
  height: 80rpx;
  background: #fff;
  color: $primary;
  border: 2rpx solid $primary;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin: 48rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logout-btn:active {
  opacity: 0.7;
}
</style>
