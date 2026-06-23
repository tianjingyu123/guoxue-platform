<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="40" color="#2C2C2C" />
        </view>
        <text class="nav-title">OBS 推流教程</text>
      </view>
    </view>

    <view class="body">
      <!-- Hero -->
      <view class="hero">
        <view class="hero-icon">
          <AppIcon name="monitor" :size="56" color="#fff" />
        </view>
        <view class="hero-text">
          <text class="hero-title">OBS Studio 直播推流</text>
          <text class="hero-desc">适合知识授课类横屏直播，画质清晰稳定</text>
        </view>
      </view>

      <!-- 配置步骤 -->
      <view class="section">
        <text class="sec-title">配置步骤</text>
        <view class="step-list">
          <view v-for="(s, i) in steps" :key="s.step" class="step-card">
            <view class="step-rail">
              <view class="step-num">{{ s.step }}</view>
              <view v-if="i < steps.length - 1" class="step-line" />
            </view>
            <view class="step-main">
              <text class="step-title">{{ s.title }}</text>
              <text class="step-desc">{{ s.desc }}</text>
              <view v-if="s.action" class="step-action">
                <text class="step-action-txt">{{ s.action }}</text>
                <AppIcon name="external-link" :size="24" color="#C41E3A" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 推荐硬件配置 -->
      <view class="section">
        <text class="sec-title">推荐硬件配置</text>
        <view class="req-card">
          <view v-for="(r, i) in requirements" :key="r.label" class="req-row" :class="{ 'req-border': i > 0 }">
            <text class="req-label">{{ r.label }}</text>
            <text class="req-value">{{ r.value }}</text>
          </view>
        </view>
      </view>

      <!-- 常见问题 -->
      <view class="section">
        <text class="sec-title">常见问题</text>
        <view class="faq-list">
          <view v-for="f in faq" :key="f.q" class="faq-card">
            <view class="faq-q-row">
              <text class="faq-badge q">Q</text>
              <text class="faq-q">{{ f.q }}</text>
            </view>
            <view class="faq-a-row">
              <text class="faq-badge a">A</text>
              <text class="faq-a">{{ f.a }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="cta" @tap="goCreate">开始直播</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { obsGuideSteps, obsGuideRequirements, obsGuideFaq } from '@/lib/live-data'

const statusBarHeight = ref(0)
const steps = ref(obsGuideSteps)
const requirements = ref(obsGuideRequirements)
const faq = ref(obsGuideFaq)

function goCreate() {
  uni.navigateTo({ url: '/pkg-live/create/index' })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #faf8f5;
  border-bottom: 1rpx solid #e8e0d5;
}
.nav-bar {
  height: 96rpx;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  gap: 24rpx;
}
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.body {
  padding: 32rpx 32rpx 160rpx;
}

/* Hero */
.hero {
  background: #0f172a;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.hero-icon {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  background: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hero-text {
  display: flex;
  flex-direction: column;
}
.hero-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4rpx;
}
.hero-desc {
  font-size: 28rpx;
  color: #cbd5e1;
}

/* Section */
.section {
  margin-top: 48rpx;
}
.sec-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 24rpx;
}

/* Steps */
.step-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.step-card {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  background: #fff;
  border: 1rpx solid #e8e0d5;
  border-radius: 24rpx;
}
.step-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.step-num {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  color: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
}
.step-line {
  width: 4rpx;
  flex: 1;
  background: #e8e0d5;
  min-height: 32rpx;
}
.step-main {
  flex: 1;
  min-width: 0;
  padding-top: 8rpx;
}
.step-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 8rpx;
}
.step-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
  margin-bottom: 16rpx;
}
.step-action {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.step-action-txt {
  font-size: 24rpx;
  color: #C41E3A;
  font-weight: 500;
}

/* Requirements */
.req-card {
  background: #fff;
  border: 1rpx solid #e8e0d5;
  border-radius: 24rpx;
  overflow: hidden;
}
.req-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  font-size: 28rpx;
}
.req-border {
  border-top: 1rpx solid #e8e0d5;
}
.req-label {
  color: #999;
}
.req-value {
  color: #2C2C2C;
  font-weight: 500;
}

/* FAQ */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.faq-card {
  padding: 32rpx;
  background: #fff;
  border: 1rpx solid #e8e0d5;
  border-radius: 24rpx;
}
.faq-q-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.faq-a-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.faq-badge {
  font-size: 24rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 500;
  flex-shrink: 0;
}
.faq-badge.q {
  background: rgba(196, 30, 58, 0.1);
  color: #C41E3A;
}
.faq-badge.a {
  background: #dcfce7;
  color: #15803d;
}
.faq-q {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  flex: 1;
}
.faq-a {
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
  flex: 1;
}

/* CTA */
.cta {
  margin-top: 48rpx;
  height: 96rpx;
  background: #C41E3A;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
}
</style>
