<template>
  <view class="upgrade-page">
    <!-- 顶部装饰头图 -->
    <view class="hero">
      <view class="hero-decor">
        <view class="decor-circle c1" />
        <view class="decor-circle c2" />
        <view class="decor-dot d1" />
        <view class="decor-dot d2" />
      </view>

      <view class="hero-center">
        <view class="hero-logo">
          <text class="hero-logo-text">{{ BRAND.nameShort }}</text>
        </view>
        <text class="hero-label">版本更新</text>
        <text class="hero-version">v{{ notice.version }}</text>
        <text v-if="notice.versionName" class="hero-version-name">{{ notice.versionName }}</text>
      </view>

      <!-- 关闭/倒计时 -->
      <view v-if="canClose" class="hero-close" @tap="handleClose">
        <app-icon name="x" :size="40" color="#1F2937" />
      </view>
      <view v-else class="hero-close">
        <text class="hero-countdown">{{ countdown }}</text>
      </view>
    </view>

    <!-- 主要内容 -->
    <view class="content-wrap">
      <view class="content-card">
        <!-- 标题 -->
        <view class="card-title-block">
          <text class="card-title">{{ notice.title }}</text>
          <text v-if="notice.subtitle" class="card-subtitle">{{ notice.subtitle }}</text>
        </view>

        <!-- 维护时间提示 -->
        <view v-if="notice.maintenanceStart && notice.maintenanceEnd" class="maintenance-box">
          <view class="maintenance-head">
            <app-icon name="clock" :size="28" color="#B45309" />
            <text class="maintenance-title">系统维护时间</text>
          </view>
          <text class="maintenance-time">{{ notice.maintenanceStart }} ~ {{ notice.maintenanceEnd }}</text>
          <text class="maintenance-tip">维护期间部分功能可能无法使用，请提前做好准备</text>
        </view>

        <!-- 新功能 -->
        <view v-if="notice.features.length" class="section">
          <view class="section-head">
            <view class="section-icon" style="background-color: rgba(196,30,58,0.1)">
              <app-icon name="sparkles" :size="26" color="#C41E3A" />
            </view>
            <text class="section-title">新功能</text>
            <view class="section-count" style="background-color: rgba(196,30,58,0.1)">
              <text class="section-count-text" style="color: #C41E3A">{{ notice.features.length }}</text>
            </view>
          </view>
          <view class="section-items">
            <view v-for="(item, i) in notice.features" :key="i" class="item">
              <view class="item-icon" style="background-color: rgba(196,30,58,0.1)">
                <app-icon name="sparkles" :size="22" color="#C41E3A" />
              </view>
              <view class="item-body">
                <text class="item-title">{{ item.title }}</text>
                <text v-if="item.description" class="item-desc">{{ item.description }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 体验优化 -->
        <view v-if="notice.optimizations.length" class="section">
          <view class="section-head">
            <view class="section-icon" style="background-color: #EFF6FF">
              <app-icon name="zap" :size="26" color="#2563EB" />
            </view>
            <text class="section-title">体验优化</text>
            <view class="section-count" style="background-color: #EFF6FF">
              <text class="section-count-text" style="color: #2563EB">{{ notice.optimizations.length }}</text>
            </view>
          </view>
          <view class="section-items">
            <view v-for="(item, i) in notice.optimizations" :key="i" class="item">
              <view class="item-icon" style="background-color: #EFF6FF">
                <app-icon name="zap" :size="22" color="#2563EB" />
              </view>
              <view class="item-body">
                <text class="item-title">{{ item.title }}</text>
                <text v-if="item.description" class="item-desc">{{ item.description }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 问题修复 -->
        <view v-if="notice.fixes.length" class="section">
          <view class="section-head">
            <view class="section-icon" style="background-color: #F0FDF4">
              <app-icon name="wrench" :size="26" color="#16A34A" />
            </view>
            <text class="section-title">问题修复</text>
            <view class="section-count" style="background-color: #F0FDF4">
              <text class="section-count-text" style="color: #16A34A">{{ notice.fixes.length }}</text>
            </view>
          </view>
          <view class="section-items">
            <view v-for="(item, i) in notice.fixes" :key="i" class="item">
              <view class="item-icon" style="background-color: #F0FDF4">
                <app-icon name="wrench" :size="22" color="#16A34A" />
              </view>
              <view class="item-body">
                <text class="item-title">{{ item.title }}</text>
                <text v-if="item.description" class="item-desc">{{ item.description }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 发布时间 -->
        <view class="publish-row">
          <text class="publish-text">发布于 {{ notice.publishedAt }}</text>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view
        class="bottom-btn"
        :class="canClose ? 'btn-active' : 'btn-disabled'"
        @tap="handleClose"
      >
        <template v-if="canClose">
          <app-icon name="check" :size="32" color="#FFFFFF" />
          <text class="bottom-btn-text">我知道了</text>
        </template>
        <template v-else>
          <app-icon name="clock" :size="28" color="#9CA3AF" />
          <text class="bottom-btn-text-disabled">请等待 {{ countdown }} 秒</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateBack } from '@/utils/router'
import { BRAND } from '@/lib/brand'

interface UpgradeItem { title: string; description?: string }

const statusBarHeight = ref(20)
const countdown = ref(0)
const canClose = ref(true)
let timer: ReturnType<typeof setInterval> | null = null

const notice = ref({
  id: 1,
  version: '3.2.0',
  versionName: '国学焕新版',
  title: '发现新版本',
  subtitle: '我们带来了诸多新功能与体验优化',
  mode: 'normal' as 'normal' | 'forced',
  maintenanceStart: '',
  maintenanceEnd: '',
  publishedAt: '2025-11-08',
  features: [
    { title: '全新国学排盘工具', description: '新增六爻、梅花易数、奇门遁甲等多款排盘工具' },
    { title: 'AI 智能解读', description: '排盘结果支持 AI 一键解读，更易理解' },
    { title: '专家连麦咨询', description: '支持与名师实时音视频连麦咨询' },
  ] as UpgradeItem[],
  optimizations: [
    { title: '首页加载速度提升 40%', description: '优化资源加载策略，启动更快' },
    { title: '排盘结果展示优化', description: '重新设计排盘结果页，信息层次更清晰' },
  ] as UpgradeItem[],
  fixes: [
    { title: '修复部分机型闪退问题' },
    { title: '修复支付偶发失败的问题' },
  ] as UpgradeItem[],
})

function handleClose() {
  if (!canClose.value) return
  navigateBack()
}

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
  } catch (e) {}
  // 强制模式下走倒计时；本 mock 为 normal，可直接关闭
  if (notice.value.mode === 'forced' && countdown.value > 0) {
    canClose.value = false
    timer = setInterval(() => {
      if (countdown.value <= 1) {
        countdown.value = 0
        canClose.value = true
        if (timer) clearInterval(timer)
      } else {
        countdown.value -= 1
      }
    }, 1000)
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.upgrade-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, rgba(196, 30, 58, 0.1), rgba(196, 30, 58, 0.05) 30%, #F9FAFB);
  padding-bottom: 180rpx;
}

.hero {
  position: relative;
  height: 384rpx;
  overflow: hidden;
}
.hero-decor {
  position: absolute;
  inset: 0;
  opacity: 0.1;
}
.decor-circle {
  position: absolute;
  border: 4rpx solid var(--brand);
  border-radius: 50%;
}
.decor-circle.c1 {
  top: 32rpx;
  left: 32rpx;
  width: 160rpx;
  height: 160rpx;
}
.decor-circle.c2 {
  top: 96rpx;
  right: 64rpx;
  width: 96rpx;
  height: 96rpx;
  border-width: 2rpx;
}
.decor-dot {
  position: absolute;
  background-color: var(--brand);
  border-radius: 50%;
}
.decor-dot.d1 {
  bottom: 64rpx;
  left: 25%;
  width: 64rpx;
  height: 64rpx;
}
.decor-dot.d2 {
  top: 160rpx;
  right: 33%;
  width: 48rpx;
  height: 48rpx;
  opacity: 0.5;
}

.hero-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.hero-logo {
  width: 128rpx;
  height: 128rpx;
  background-color: var(--brand);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.3);
}
.hero-logo-text {
  font-size: 44rpx;
  font-weight: 700;
  color: #FFFFFF;
}
.hero-label {
  font-size: 22rpx;
  color: #9CA3AF;
  margin-bottom: 8rpx;
}
.hero-version {
  font-size: 52rpx;
  font-weight: 700;
  color: var(--brand);
}
.hero-version-name {
  font-size: 26rpx;
  color: #6B7280;
  margin-top: 8rpx;
}

.hero-close {
  position: absolute;
  top: 32rpx;
  right: 32rpx;
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-countdown {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F2937;
}

.content-wrap {
  padding: 0 32rpx;
  margin-top: -48rpx;
  position: relative;
}
.content-card {
  background-color: #FFFFFF;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
  padding: 40rpx;
}

.card-title-block {
  text-align: center;
  margin-bottom: 48rpx;
}
.card-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1F2937;
  display: block;
  margin-bottom: 12rpx;
}
.card-subtitle {
  font-size: 26rpx;
  color: #6B7280;
}

.maintenance-box {
  background-color: #FFFBEB;
  border: 1rpx solid #FDE68A;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 48rpx;
}
.maintenance-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.maintenance-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #B45309;
}
.maintenance-time {
  font-size: 26rpx;
  color: #D97706;
  margin-top: 8rpx;
  padding-left: 40rpx;
  display: block;
}
.maintenance-tip {
  font-size: 22rpx;
  color: #F59E0B;
  margin-top: 8rpx;
  padding-left: 40rpx;
  display: block;
}

.section {
  margin-bottom: 48rpx;
}
.section-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.section-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1F2937;
}
.section-count {
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}
.section-count-text {
  font-size: 22rpx;
}
.section-items {
  padding-left: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.item {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 16rpx 0;
}
.item-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.item-body {
  flex: 1;
  min-width: 0;
}
.item-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F2937;
  display: block;
}
.item-desc {
  font-size: 24rpx;
  color: #9CA3AF;
  margin-top: 4rpx;
  display: block;
}

.publish-row {
  text-align: center;
  padding-top: 32rpx;
  border-top: 1rpx solid #E5E7EB;
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
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}
.bottom-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.btn-active {
  background-color: var(--brand);
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.3);
}
.btn-disabled {
  background-color: #E5E7EB;
}
.bottom-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}
.bottom-btn-text-disabled {
  font-size: 30rpx;
  font-weight: 500;
  color: #9CA3AF;
}
</style>
