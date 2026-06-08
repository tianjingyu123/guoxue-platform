<template>
  <DataState :is-loading="pageLoading" :error="pageError" :is-empty="false" @retry="initPage">
    <view class="page">
      <!-- 顶部导航 -->
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">
          <text class="nav-back-icon">‹</text>
        </view>
        <text class="nav-title">显示设置</text>
        <view class="nav-placeholder" />
      </view>

      <scroll-view class="content" scroll-y>
        <!-- 主题模式 -->
        <view class="section">
          <text class="section-title">主题模式</text>
          <view class="card">
            <view class="theme-grid">
              <view
                class="theme-card"
                :class="{ active: theme === 'light' }"
                @click="theme = 'light'"
              >
                <view class="theme-preview light-preview">
                  <view class="preview-bar" />
                  <view class="preview-content">
                    <view class="preview-line" />
                    <view class="preview-line short" />
                  </view>
                </view>
                <text class="theme-name">浅色模式</text>
              </view>
              <view
                class="theme-card"
                :class="{ active: theme === 'dark' }"
                @click="theme = 'dark'"
              >
                <view class="theme-preview dark-preview">
                  <view class="preview-bar" />
                  <view class="preview-content">
                    <view class="preview-line" />
                    <view class="preview-line short" />
                  </view>
                </view>
                <text class="theme-name">深色模式</text>
              </view>
              <view
                class="theme-card"
                :class="{ active: theme === 'auto' }"
                @click="theme = 'auto'"
              >
                <view class="theme-preview auto-preview">
                  <view class="preview-bar" />
                  <view class="preview-content">
                    <view class="preview-line" />
                    <view class="preview-line short" />
                  </view>
                </view>
                <text class="theme-name">跟随系统</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 阅读设置 -->
        <view class="section">
          <text class="section-title">阅读设置</text>
          <view class="card">
            <view class="setting-item" @click="openSelect('readingBg')">
              <view class="setting-left">
                <view class="icon-box">
                  <text class="icon-emoji">📄</text>
                </view>
                <text class="setting-label">默认阅读背景</text>
              </view>
              <view class="setting-right">
                <text class="setting-value">{{ readingBg }}</text>
                <text class="setting-arrow">›</text>
              </view>
            </view>
            <view class="setting-item" @click="openSelect('fontSize')">
              <view class="setting-left">
                <view class="icon-box">
                  <text class="icon-emoji">🔤</text>
                </view>
                <text class="setting-label">字体大小</text>
              </view>
              <view class="setting-right">
                <text class="setting-value">{{ fontSize }}</text>
                <text class="setting-arrow">›</text>
              </view>
            </view>
            <view class="font-preview-box">
              <text class="font-preview-label">预览效果</text>
              <text
                class="font-preview-text"
                :class="'font-size-' + fontSize"
              >
                学而时习之，不亦说乎。有朋自远方来，不亦乐乎。
              </text>
            </view>
          </view>
        </view>

        <!-- 视频设置 -->
        <view class="section">
          <text class="section-title">视频设置</text>
          <view class="card">
            <view class="setting-item" @click="openSelect('autoPlay')">
              <view class="setting-left">
                <view class="icon-box">
                  <text class="icon-emoji">📹</text>
                </view>
                <text class="setting-label">视频自动播放</text>
              </view>
              <view class="setting-right">
                <text class="setting-value">{{ autoPlay }}</text>
                <text class="setting-arrow">›</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 提示 -->
        <view class="footer-note">
          <text>修改后将立即生效，部分设置可能需要重新进入页面查看效果</text>
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
    </view>
  </DataState>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataState from '@/components/DataState.vue'

const pageLoading = ref(false)
const pageError = ref<string | null>(null)

// 设置项
const theme = ref('auto')
const readingBg = ref('宣纸色')
const fontSize = ref('中')
const autoPlay = ref('仅Wi-Fi')

const selectOptions: Record<string, { title: string; options: string[] }> = {
  readingBg: { title: '默认阅读背景', options: ['宣纸色', '护眼黄', '夜间黑', '纯白'] },
  fontSize: { title: '字体大小', options: ['小', '中', '大'] },
  autoPlay: { title: '视频自动播放', options: ['仅Wi-Fi', '始终', '关闭'] },
}

interface SelectModal {
  title: string
  options: string[]
  current: string
  key: string
}
const selectModal = ref<SelectModal | null>(null)

function initPage() {
  pageLoading.value = false
  pageError.value = null
  loadSettings()
}

onMounted(initPage)

function loadSettings() {
  try {
    const saved = uni.getStorageSync('app_settings')
    if (saved) {
      const s = JSON.parse(saved)
      if (s.theme) theme.value = s.theme
      if (s.readingBg) readingBg.value = s.readingBg
      if (s.fontSize) fontSize.value = s.fontSize
      if (s.autoPlay) autoPlay.value = s.autoPlay
    }
  } catch {}
}

function saveSettings() {
  try {
    const saved = uni.getStorageSync('app_settings') || '{}'
    const s = JSON.parse(saved)
    s.theme = theme.value
    s.readingBg = readingBg.value
    s.fontSize = fontSize.value
    s.autoPlay = autoPlay.value
    uni.setStorageSync('app_settings', JSON.stringify(s))
  } catch {}
  uni.showToast({ title: '已保存', icon: 'success' })
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

.icon-emoji {
  font-size: 32rpx;
}

.setting-label {
  font-size: 26rpx;
  color: #5a3a1a;
  font-weight: 500;
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

/* 主题网格 */
.theme-grid {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
}
.theme-card {
  flex: 1;
  border-radius: 16rpx;
  border: 3rpx solid #e8e0d0;
  overflow: hidden;
  text-align: center;
}
.theme-card.active {
  border-color: #8b6914;
  background: rgba(139, 105, 20, 0.05);
}

.theme-preview {
  height: 120rpx;
  padding: 16rpx;
}
.light-preview {
  background: #F5F0E8;
}
.dark-preview {
  background: #1a1a2e;
}
.auto-preview {
  background: linear-gradient(135deg, #F5F0E8 50%, #1a1a2e 50%);
}

.preview-bar {
  height: 12rpx;
  width: 60%;
  border-radius: 6rpx;
  margin-bottom: 12rpx;
}
.light-preview .preview-bar {
  background: #5a3a1a;
}
.dark-preview .preview-bar {
  background: #c0b0a0;
}
.auto-preview .preview-bar {
  background: #5a3a1a;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.preview-line {
  height: 8rpx;
  border-radius: 4rpx;
  width: 100%;
}
.preview-line.short {
  width: 70%;
}
.light-preview .preview-line {
  background: #d0c8b8;
}
.dark-preview .preview-line {
  background: #3a3a5e;
}
.auto-preview .preview-line {
  background: #d0c8b8;
}
.auto-preview .preview-line.short {
  background: #3a3a5e;
}

.theme-name {
  display: block;
  font-size: 22rpx;
  color: #5a3a1a;
  padding: 12rpx 0;
  font-weight: 500;
}
.theme-card.active .theme-name {
  color: #8b6914;
}

/* 字体预览 */
.font-preview-box {
  padding: 24rpx 24rpx 28rpx;
  border-top: 1rpx solid #f0ebe0;
}
.font-preview-label {
  font-size: 22rpx;
  color: #a09080;
  display: block;
  margin-bottom: 16rpx;
}
.font-preview-text {
  color: #5a3a1a;
  line-height: 1.8;
  padding: 20rpx;
  background: #faf8f4;
  border-radius: 12rpx;
  display: block;
}
.font-size-小 {
  font-size: 24rpx;
}
.font-size-中 {
  font-size: 28rpx;
}
.font-size-大 {
  font-size: 34rpx;
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
</style>
