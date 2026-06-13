<template>
  <view class="settings-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">设置</text>
      </view>
    </view>

    <view class="sc-list">
      <!-- 账号与安全 -->
      <view class="section-card">
        <view class="sc-title">账号与安全</view>
        <view class="sc-item" @click="goPage('/pages/settings/phone/index')">
          <view class="sci-left"><text class="sci-icon">📱</text><text class="sci-label">手机号</text></view>
          <view class="sci-right"><text class="sci-val">138****8888</text><text class="sci-arrow">›</text></view>
        </view>
        <view class="sc-item" @click="goPage('/pages/settings/password/index')">
          <view class="sci-left"><text class="sci-icon">🔒</text><text class="sci-label">登录密码</text></view>
          <view class="sci-right"><text class="sci-val">修改</text><text class="sci-arrow">›</text></view>
        </view>
        <view class="sc-item">
          <view class="sci-left"><text class="sci-icon">🛡</text><text class="sci-label">二次验证</text></view>
          <switch :checked="twoFactorEnabled" @change="twoFactorEnabled = !twoFactorEnabled" color="#C41E3A" />
        </view>
      </view>

      <!-- 隐私设置 -->
      <view class="section-card">
        <view class="sc-title">隐私设置</view>
        <view class="sc-item">
          <view class="sci-left"><text class="sci-icon">👁</text><text class="sci-label">公开展示我的收藏</text></view>
          <switch :checked="showFavorites" @change="showFavorites = !showFavorites" color="#C41E3A" />
        </view>
        <view class="sc-item">
          <view class="sci-left"><text class="sci-icon">📋</text><text class="sci-label">记录浏览历史</text></view>
          <switch :checked="recordHistory" @change="recordHistory = !recordHistory" color="#C41E3A" />
        </view>
      </view>

      <!-- 通知设置 -->
      <view class="section-card">
        <view class="sc-title">通知设置</view>
        <view class="sc-item">
          <view class="sci-left"><text class="sci-icon">🔔</text><text class="sci-label">推送通知</text></view>
          <switch :checked="pushEnabled" @change="pushEnabled = !pushEnabled" color="#C41E3A" />
        </view>
        <view class="sc-item" @click="showSelect('免打扰时段', quietHours, quietOptions, setQuietHours)">
          <view class="sci-left"><text class="sci-icon">🌙</text><text class="sci-label">消息免打扰时段</text></view>
          <view class="sci-right"><text class="sci-val">{{ quietHours }}</text><text class="sci-arrow">›</text></view>
        </view>
      </view>

      <!-- 通用设置 -->
      <view class="section-card">
        <view class="sc-title">通用设置</view>
        <view class="sc-item" @click="showSelect('阅读背景', readingBg, bgOptions, setReadingBg)">
          <view class="sci-left"><text class="sci-icon">👁</text><text class="sci-label">默认阅读背景</text></view>
          <view class="sci-right"><text class="sci-val">{{ readingBg }}</text><text class="sci-arrow">›</text></view>
        </view>
        <view class="sc-item" @click="showSelect('字体大小', fontSize, fontOptions, setFontSize)">
          <view class="sci-left"><text class="sci-icon">🔤</text><text class="sci-label">字体大小</text></view>
          <view class="sci-right"><text class="sci-val">{{ fontSize }}</text><text class="sci-arrow">›</text></view>
        </view>
        <view class="sc-item" @click="showSelect('视频自动播放', autoPlay, playOptions, setAutoPlay)">
          <view class="sci-left"><text class="sci-icon">📶</text><text class="sci-label">视频自动播放</text></view>
          <view class="sci-right"><text class="sci-val">{{ autoPlay }}</text><text class="sci-arrow">›</text></view>
        </view>
      </view>

      <!-- 缓存管理 -->
      <view class="section-card">
        <view class="sc-title">缓存管理</view>
        <view class="sc-item">
          <view class="sci-left"><text class="sci-icon">🗑</text><text class="sci-label">缓存数据</text></view>
          <view class="sci-right">
            <text class="sci-val" style="margin-right: 16rpx;">{{ clearing ? '清理中...' : cacheSize }}</text>
            <view class="cache-btn" :class="{ off: clearing }" @click="clearCache">{{ clearing ? '清理中' : '清理缓存' }}</view>
          </view>
        </view>
      </view>

      <!-- 关于 -->
      <view class="section-card">
        <view class="sc-title">关于我们</view>
        <view class="sc-item" @click="goPage('/pages/agreement/user/index')">
          <view class="sci-left"><text class="sci-icon">📄</text><text class="sci-label">用户协议</text></view>
          <text class="sci-arrow">›</text>
        </view>
        <view class="sc-item" @click="goPage('/pages/agreement/privacy/index')">
          <view class="sci-left"><text class="sci-icon">🛡</text><text class="sci-label">隐私政策</text></view>
          <text class="sci-arrow">›</text>
        </view>
        <view class="sc-item">
          <view class="sci-left"><text class="sci-icon">ℹ️</text><text class="sci-label">版本号</text></view>
          <text class="sci-val">v1.0.0</text>
        </view>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-btn" @click="showLogoutConfirm = true">退出登录</view>

    <!-- 选择弹窗 -->
    <view v-if="selModal" class="modal-mask" @click="selModal = null">
      <view class="select-sheet" @click.stop>
        <text class="ss-title">{{ selModal.title }}</text>
        <view class="ss-list">
          <view v-for="opt in selModal.options" :key="opt" class="ss-item" :class="{ sel: opt === selModal.current }" @click="selModal.onSelect(opt); selModal = null">
            <text>{{ opt }}</text>
            <text v-if="opt === selModal.current" class="ss-check">✓</text>
          </view>
        </view>
        <view class="ss-cancel" @click="selModal = null">取消</view>
      </view>
    </view>

    <!-- 退出确认 -->
    <view v-if="showLogoutConfirm" class="modal-mask center" @click="showLogoutConfirm = false">
      <view class="confirm-dialog" @click.stop>
        <text class="cd-title">确认退出登录？</text>
        <text class="cd-desc">退出后将需要重新登录才能使用完整功能</text>
        <view class="cd-actions">
          <view class="cd-btn" @click="showLogoutConfirm = false">取消</view>
          <view class="cd-btn confirm" @click="handleLogout">确认退出</view>
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
const clearing = ref(false)
const showLogoutConfirm = ref(false)
const selModal = ref<{ title: string; options: string[]; current: string; onSelect: (v: string) => void } | null>(null)

const quietOptions = ['关闭', '22:00-08:00', '23:00-07:00', '00:00-08:00']
const bgOptions = ['宣纸色', '护眼黄', '夜间黑', '纯白']
const fontOptions = ['小', '中', '大']
const playOptions = ['仅Wi-Fi', '始终', '关闭']

function showSelect(title: string, current: string, options: string[], onSelect: (v: string) => void) {
  selModal.value = { title, options, current, onSelect }
}
function setQuietHours(v: string) { quietHours.value = v }
function setReadingBg(v: string) { readingBg.value = v }
function setFontSize(v: string) { fontSize.value = v }
function setAutoPlay(v: string) { autoPlay.value = v }

function clearCache() {
  clearing.value = true
  setTimeout(() => {
    clearing.value = false
    uni.showToast({ title: '缓存已清理', icon: 'success' })
  }, 1500)
}

function handleLogout() {
  showLogoutConfirm.value = false
  uni.showToast({ title: '已退出登录', icon: 'success' })
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.settings-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 80rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }

.sc-list { padding: 16rpx 0; }
.section-card { margin: 0 24rpx 16rpx; background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.sc-title { font-size: 24rpx; color: #999; padding: 16rpx 24rpx 8rpx; }
.sc-item { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.sc-item + .sc-item { border-top: 1px solid #F5F1EB; }
.sci-left { display: flex; align-items: center; gap: 16rpx; }
.sci-icon { font-size: 32rpx; }
.sci-label { font-size: 28rpx; color: #2C2C2C; }
.sci-right { display: flex; align-items: center; }
.sci-val { font-size: 26rpx; color: #999; }
.sci-arrow { font-size: 32rpx; color: #CCC; margin-left: 8rpx; }

.cache-btn { padding: 8rpx 20rpx; border-radius: 16rpx; font-size: 22rpx; color: #C41E3A; background: rgba(196,30,58,0.08); }
.cache-btn.off { color: #999; background: #F5F1EB; }

.logout-btn { margin: 40rpx 24rpx; padding: 24rpx 0; text-align: center; background: #fff; border-radius: 16rpx; font-size: 30rpx; color: #C41E3A; font-weight: 500; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }

.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.modal-mask.center { align-items: center; justify-content: center; }
.select-sheet { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx 32rpx 40rpx; }
.ss-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; text-align: center; display: block; margin-bottom: 24rpx; }
.ss-item { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; font-size: 28rpx; color: #333; border-bottom: 1px solid #F5F1EB; }
.ss-item.sel { color: #C41E3A; }
.ss-check { color: #C41E3A; font-weight: 700; }
.ss-cancel { margin-top: 24rpx; padding: 24rpx 0; text-align: center; background: #F5F1EB; border-radius: 16rpx; font-size: 28rpx; color: #999; }

.confirm-dialog { width: 80%; max-width: 600rpx; background: #fff; border-radius: 24rpx; padding: 48rpx 32rpx 0; text-align: center; }
.cd-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; display: block; }
.cd-desc { font-size: 26rpx; color: #999; display: block; margin-top: 12rpx; }
.cd-actions { display: flex; margin-top: 32rpx; border-top: 1px solid #F0EDE5; }
.cd-btn { flex: 1; padding: 24rpx 0; text-align: center; font-size: 28rpx; color: #333; }
.cd-btn + .cd-btn { border-left: 1px solid #F0EDE5; }
.cd-btn.confirm { color: #C41E3A; font-weight: 500; }
</style>
