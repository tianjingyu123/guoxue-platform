<template>
  <view class="poster-page">
    <!-- 顶部导航 -->
    <view
      class="poster-nav"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="poster-nav-inner">
        <view
          class="poster-nav-btn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#1f1f1f"
          />
        </view>
        <text class="poster-nav-title">
          分享海报
        </text>
        <view class="poster-nav-btn" />
      </view>
    </view>

    <!-- 海报预览 -->
    <view class="poster-preview-wrap">
      <view
        class="poster-card"
        :style="posterBgStyle"
      >
        <!-- 装饰圆 -->
        <view class="poster-deco poster-deco-1" />
        <view class="poster-deco poster-deco-2" />

        <view class="poster-content">
          <!-- 顶部 Logo -->
          <view class="poster-logo-row">
            <view
              class="poster-logo"
              :style="{ background: station.themeColor }"
            >
              <text class="poster-logo-txt">
                {{ station.name.charAt(0) }}
              </text>
            </view>
            <text
              class="poster-brand"
              :style="{ color: tpl.textColor }"
            >
              热卜国学
            </text>
          </view>

          <!-- 主内容 -->
          <view class="poster-main">
            <view
              class="poster-avatar"
              :style="{ background: station.themeColor }"
            >
              <image
                v-if="station.masterAvatar"
                :src="station.masterAvatar"
                class="poster-avatar-img"
                mode="aspectFill"
              />
              <text
                v-else
                class="poster-avatar-txt"
              >
                {{ station.masterName.charAt(0) }}
              </text>
            </view>
            <text
              class="poster-name"
              :style="{ color: tpl.textColor }"
            >
              {{ station.name }}
            </text>
            <text
              class="poster-sub"
              :style="{ color: tpl.textColor }"
            >
              {{ station.masterName }} · 诚邀您加入
            </text>

            <view class="poster-stats">
              <view class="poster-stat">
                <text
                  class="poster-stat-num"
                  :style="{ color: tpl.accentColor }"
                >
                  {{ station.memberCount }}
                </text>
                <text
                  class="poster-stat-label"
                  :style="{ color: tpl.textColor }"
                >
                  成员
                </text>
              </view>
              <view class="poster-stat-divider" />
              <view class="poster-stat">
                <text
                  class="poster-stat-num"
                  :style="{ color: tpl.accentColor }"
                >
                  {{ station.contentCount }}
                </text>
                <text
                  class="poster-stat-label"
                  :style="{ color: tpl.textColor }"
                >
                  精选
                </text>
              </view>
            </view>

            <text
              class="poster-intro"
              :style="{ color: tpl.textColor }"
            >
              {{ station.masterIntro }}
            </text>
          </view>

          <!-- 底部二维码 -->
          <view class="poster-qr-wrap">
            <view class="poster-qr">
              <view class="poster-qr-inner">
                <app-icon
                  name="qr-code"
                  :size="96"
                  color="#9ca3af"
                />
              </view>
            </view>
            <text
              class="poster-qr-txt"
              :style="{ color: tpl.textColor }"
            >
              扫码加入{{ station.name }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 模板选择 -->
    <view class="poster-tpl-section">
      <text class="poster-section-title">
        选择风格
      </text>
      <view class="poster-tpl-row">
        <view
          v-for="t in posterTemplates"
          :key="t.id"
          class="poster-tpl-item"
          :class="{ active: selectedId === t.id }"
          @tap="selectedId = t.id"
        >
          <view
            class="poster-tpl-thumb"
            :style="thumbBg(t)"
          >
            <view class="poster-tpl-dot" />
            <view class="poster-tpl-bar1" />
            <view class="poster-tpl-bar2" />
          </view>
        </view>
      </view>
      <view class="poster-tpl-labels">
        <text
          v-for="t in posterTemplates"
          :key="t.id"
          class="poster-tpl-label"
          :class="{ active: selectedId === t.id }"
        >
          {{ t.name }}
        </text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="poster-actions">
      <view class="poster-action-row">
        <view
          class="poster-btn poster-btn-outline"
          :class="{ disabled: isSaving }"
          @tap="handleSave"
        >
          <app-icon
            v-if="saved"
            name="check"
            :size="32"
            color="#1f1f1f"
          />
          <app-icon
            v-else
            name="download"
            :size="32"
            color="#1f1f1f"
            :class="{ 'icon-bounce': isSaving }"
          />
          <text class="poster-btn-txt">
            {{ saved ? '已保存' : isSaving ? '保存中...' : '保存图片' }}
          </text>
        </view>
        <view
          class="poster-btn poster-btn-primary"
          :style="{ background: station.themeColor }"
          @tap="handleShare"
        >
          <app-icon
            name="share-2"
            :size="32"
            color="#ffffff"
          />
          <text
            class="poster-btn-txt"
            style="color:#fff"
          >
            分享海报
          </text>
        </view>
      </view>
      <text class="poster-tip">
        分享海报邀请好友，好友通过您的专属链接加入平台后将永久归属您的分站
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

const station = {
  id: 'station-demo',
  name: '青云国学小站',
  themeColor: '#8B5CF6',
  masterName: '青云道长',
  masterAvatar: '/static/experts/expert-1.jpg',
  masterIntro: '从事国学研究20余年，专注八字命理与风水堪舆',
  memberCount: 3680,
  contentCount: 156,
}

interface PosterTemplate {
  id: string
  name: string
  bg: string
  textColor: string
  accentColor: string
}

const posterTemplates: PosterTemplate[] = [
  { id: 'classic', name: '经典', bg: 'linear-gradient(to bottom, #1f1f1f, #2b2b2b)', textColor: '#ffffff', accentColor: '#fbbf24' },
  { id: 'elegant', name: '素雅', bg: 'linear-gradient(to bottom, #faf8f5, #e8e4d9)', textColor: '#1f1f1f', accentColor: '#C9A96E' },
  { id: 'modern', name: '现代', bg: 'linear-gradient(to bottom right, #8B5CF6, #7c3aed)', textColor: '#ffffff', accentColor: '#fde047' },
  { id: 'nature', name: '自然', bg: 'linear-gradient(to bottom, #3b82f6, #16a34a)', textColor: '#ffffff', accentColor: '#bef264' },
]

const selectedId = ref(posterTemplates[0].id)
const tpl = computed(() => posterTemplates.find((t) => t.id === selectedId.value) || posterTemplates[0])
const posterBgStyle = computed(() => ({ background: tpl.value.bg }))

function thumbBg(t: PosterTemplate) {
  return { background: t.bg }
}

const isSaving = ref(false)
const saved = ref(false)

function handleSave() {
  if (isSaving.value) return
  isSaving.value = true
  setTimeout(() => {
    isSaving.value = false
    saved.value = true
    uni.showToast({ title: '已保存到相册', icon: 'success' })
    setTimeout(() => { saved.value = false }, 2000)
  }, 1500)
}

function handleShare() {
  uni.showToast({ title: '调起分享', icon: 'none' })
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
</script>

<style lang="scss" scoped>
.poster-page {
  min-height: 100vh;
  background: #faf8f5;
}
.poster-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #faf8f5;
  border-bottom: 1rpx solid #ece8e1;
}
.poster-nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}
.poster-nav-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.poster-nav-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #1f1f1f;
}

.poster-preview-wrap {
  padding: 32rpx;
}
.poster-card {
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 16;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 50rpx rgba(0, 0, 0, 0.25);
}
.poster-deco {
  position: absolute;
  border-radius: 50%;
}
.poster-deco-1 {
  top: 0;
  right: 0;
  width: 320rpx;
  height: 320rpx;
  background: rgba(255, 255, 255, 0.12);
  transform: translate(50%, -50%);
}
.poster-deco-2 {
  bottom: 0;
  left: 0;
  width: 480rpx;
  height: 480rpx;
  background: rgba(255, 255, 255, 0.08);
  transform: translate(-50%, 50%);
}
.poster-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 48rpx;
  box-sizing: border-box;
}
.poster-logo-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 48rpx;
}
.poster-logo {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.poster-logo-txt {
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
}
.poster-brand {
  font-size: 28rpx;
  font-weight: 500;
}
.poster-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.poster-avatar {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  border: 8rpx solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
  margin-bottom: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.poster-avatar-img {
  width: 100%;
  height: 100%;
}
.poster-avatar-txt {
  color: #fff;
  font-size: 60rpx;
  font-weight: 700;
}
.poster-name {
  font-size: 48rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}
.poster-sub {
  font-size: 28rpx;
  opacity: 0.8;
  margin-bottom: 48rpx;
}
.poster-stats {
  display: flex;
  align-items: center;
  gap: 48rpx;
  margin-bottom: 64rpx;
}
.poster-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.poster-stat-num {
  font-size: 48rpx;
  font-weight: 700;
}
.poster-stat-label {
  font-size: 22rpx;
  opacity: 0.7;
  margin-top: 4rpx;
}
.poster-stat-divider {
  width: 1rpx;
  height: 64rpx;
  background: rgba(255, 255, 255, 0.2);
}
.poster-intro {
  font-size: 28rpx;
  opacity: 0.7;
  max-width: 400rpx;
  line-height: 1.5;
}
.poster-qr-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.poster-qr {
  width: 192rpx;
  height: 192rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 16rpx;
  box-sizing: border-box;
  margin-bottom: 24rpx;
}
.poster-qr-inner {
  width: 100%;
  height: 100%;
  background: #f1ede7;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.poster-qr-txt {
  font-size: 22rpx;
  opacity: 0.7;
}

.poster-tpl-section {
  padding: 0 32rpx;
  margin-bottom: 32rpx;
}
.poster-section-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1f1f1f;
  margin-bottom: 24rpx;
  display: block;
}
.poster-tpl-row {
  display: flex;
  gap: 24rpx;
}
.poster-tpl-item {
  flex: 1;
  aspect-ratio: 3 / 4;
  border-radius: 24rpx;
  overflow: hidden;
  border: 4rpx solid transparent;
  box-sizing: border-box;
}
.poster-tpl-item.active {
  border-color: #C41E3A;
  box-shadow: 0 0 0 4rpx rgba(196, 30, 58, 0.2);
}
.poster-tpl-thumb {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}
.poster-tpl-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
}
.poster-tpl-bar1 {
  width: 64rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: rgba(255, 255, 255, 0.5);
}
.poster-tpl-bar2 {
  width: 48rpx;
  height: 4rpx;
  border-radius: 2rpx;
  background: rgba(255, 255, 255, 0.3);
}
.poster-tpl-labels {
  display: flex;
  gap: 24rpx;
  margin-top: 12rpx;
}
.poster-tpl-label {
  flex: 1;
  text-align: center;
  font-size: 22rpx;
  color: #8a8a8a;
}
.poster-tpl-label.active {
  color: #C41E3A;
  font-weight: 500;
}

.poster-actions {
  padding: 0 32rpx 64rpx;
}
.poster-action-row {
  display: flex;
  gap: 24rpx;
}
.poster-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.poster-btn-outline {
  border: 1rpx solid #d8d2c8;
  background: #fff;
}
.poster-btn-outline.disabled {
  opacity: 0.6;
}
.poster-btn-primary {
  background: #8B5CF6;
}
.poster-btn-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #1f1f1f;
}
.icon-bounce {
  animation: bounce 0.6s infinite;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6rpx); }
}
.poster-tip {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #8a8a8a;
  margin-top: 32rpx;
  line-height: 1.5;
}
</style>
