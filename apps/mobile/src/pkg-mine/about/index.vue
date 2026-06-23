<template>
  <view class="page">
    <!-- 顶部导航 -->
    <app-nav-bar title="关于我们" :back-icon="'arrow-left'" :back-size="40" :title-size="36" :bar-height="112" title-align="left" />

    <!-- Hero -->
    <view class="hero">
      <view class="logo-box">
        <image class="logo-img" :src="logoSrc" mode="aspectFill" />
      </view>
      <text class="hero-title">热卜国学</text>
      <text class="hero-slogan">传承智慧 · 启迪人生</text>
    </view>

    <!-- 加载/错误/内容 -->
    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else-if="error" class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
    <view v-else class="content">
      <!-- 介绍 -->
      <text class="intro">
        热卜国学是一个专注于中华传统文化传承与学习的综合性平台。我们汇聚了易经、风水、命理、中医养生等领域的专家学者，致力于让国学智慧以现代化的方式传播，帮助更多人了解和受益于中华传统文化的精髓。
      </text>

      <!-- 数据展示 -->
      <view class="stats">
        <view v-for="s in aboutStats" :key="s.label" class="stat-card">
          <text class="stat-value" :style="{ color: s.color }">{{ s.value }}</text>
          <text class="stat-label">{{ s.label }}</text>
        </view>
      </view>

      <!-- 特色 -->
      <text class="section-title">我们的特色</text>
      <view class="feature-list">
        <view v-for="f in aboutFeatures" :key="f.title" class="feature-card">
          <view class="feature-icon">
            <AppIcon :name="f.icon" :size="20" color="#c41e3a" />
          </view>
          <view class="feature-body">
            <text class="feature-title">{{ f.title }}</text>
            <text class="feature-desc">{{ f.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 联系方式 -->
      <text class="section-title">联系我们</text>
      <view class="contact-card">
        <view class="contact-row" @tap="goFeedback">
          <text class="contact-label">意见反馈</text>
          <AppIcon name="chevron-right" :size="20" color="#999999" />
        </view>
        <view class="contact-row">
          <text class="contact-label">客服邮箱</text>
          <text class="contact-value">support@rebu.com</text>
        </view>
        <view class="contact-row">
          <text class="contact-label">官方微信</text>
          <text class="contact-value">rebu_guoxue</text>
        </view>
      </view>

      <!-- 版本信息 -->
      <view class="version">
        <text class="version-text">版本 1.0.0</text>
        <text class="version-text">Copyright © 2024 热卜国学</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { navigateTo } from '@/utils/router'
import { mineApi } from '@/lib/mine-data'

// 热卜 logo（根 public 与 vue3 共享，:src 动态绑定避免 Vite 静态解析报错）
const logoSrc = ref('/images/logo.jpg')

const aboutStats = ref<{ value: string; label: string; color: string }[]>([])
const aboutFeatures = ref<{ icon: string; title: string; desc: string }[]>([])
const loading = ref(true)
const error = ref('')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data: any = await mineApi.getAbout()
    aboutStats.value = data.stats || []
    aboutFeatures.value = data.features || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() {
  fetchData()
}

onMounted(() => {
  fetchData()
})

function goFeedback() {
  navigateTo('/feedback')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 三态 */
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 12rpx; font-size: 26rpx; }

/* Hero */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 0;
  background: linear-gradient(to bottom right, rgba(196, 30, 58, 0.1), rgba(212, 184, 125, 0.1));
}
.logo-box {
  width: 160rpx;
  height: 160rpx;
  border-radius: 32rpx;
  overflow: hidden;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.25);
  margin-bottom: 32rpx;
}
.logo-img {
  width: 100%;
  height: 100%;
}
.hero-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #2c2c2c;
  font-family: 'Noto Serif SC', serif;
  margin-bottom: 16rpx;
}
.hero-slogan {
  font-size: 28rpx;
  color: #999999;
}

/* 内容 */
.content {
  padding: 48rpx;
}
.intro {
  display: block;
  font-size: 28rpx;
  color: #999999;
  line-height: 1.7;
  margin-bottom: 48rpx;
}

/* 数据 */
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  margin-bottom: 64rpx;
}
.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 16rpx;
  background: #ffffff;
  border-radius: 24rpx;
  border: 2rpx solid #f0ece5;
}
.stat-value {
  font-size: 40rpx;
  font-weight: 700;
}
.stat-label {
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 区块标题 */
.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 32rpx;
}

/* 特色 */
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 64rpx;
}
.feature-card {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 32rpx;
  background: #ffffff;
  border-radius: 24rpx;
  border: 2rpx solid #f0ece5;
}
.feature-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.feature-body {
  display: flex;
  flex-direction: column;
}
.feature-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.feature-desc {
  font-size: 26rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* 联系方式 */
.contact-card {
  background: #ffffff;
  border-radius: 24rpx;
  border: 2rpx solid #f0ece5;
  overflow: hidden;
}
.contact-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0ece5;
}
.contact-row:last-child {
  border-bottom: none;
}
.contact-label {
  font-size: 28rpx;
  color: #2c2c2c;
}
.contact-value {
  font-size: 28rpx;
  color: #999999;
}

/* 版本 */
.version {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  margin-top: 64rpx;
  padding-bottom: 48rpx;
}
.version-text {
  font-size: 24rpx;
  color: #999999;
}
</style>
