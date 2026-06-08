<template>
  <DataState :is-loading="pageLoading" :error="pageError" :is-empty="false" @retry="initPage">
    <view class="page">
      <!-- 顶部导航 -->
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">
          <text class="nav-back-icon">‹</text>
        </view>
        <text class="nav-title">关于我们</text>
        <view class="nav-placeholder" />
      </view>

      <scroll-view class="content" scroll-y>
        <!-- Hero -->
        <view class="hero">
          <view class="hero-logo">
            <text class="hero-logo-text">热</text>
          </view>
          <text class="hero-name">热卜国学</text>
          <text class="hero-slogan">传承智慧 · 启迪人生</text>
        </view>

        <!-- 介绍 -->
        <view class="section">
          <view class="card">
            <view class="about-desc">
              <text>
                热卜国学是一个专注于中华传统文化传承与学习的综合性平台。
                我们汇聚了易经、风水、命理、中医养生等领域的专家学者，
                致力于让国学智慧以现代化的方式传播，帮助更多人了解和受益于中华传统文化的精髓。
              </text>
            </view>
          </view>
        </view>

        <!-- 数据展示 -->
        <view class="section">
          <text class="section-title">平台数据</text>
          <view class="stats-grid">
            <view class="stat-item">
              <text class="stat-number">100+</text>
              <text class="stat-label">专家讲师</text>
            </view>
            <view class="stat-item">
              <text class="stat-number gold">500+</text>
              <text class="stat-label">精品课程</text>
            </view>
            <view class="stat-item">
              <text class="stat-number green">50万+</text>
              <text class="stat-label">学习用户</text>
            </view>
          </view>
        </view>

        <!-- 我们的特色 -->
        <view class="section">
          <text class="section-title">我们的特色</text>
          <view class="card">
            <view v-for="feature in features" :key="feature.title" class="feature-item">
              <view class="feature-icon">
                <text>{{ feature.icon }}</text>
              </view>
              <view class="feature-info">
                <text class="feature-title">{{ feature.title }}</text>
                <text class="feature-desc">{{ feature.desc }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 联系我们 -->
        <view class="section">
          <text class="section-title">联系我们</text>
          <view class="card">
            <view class="contact-item">
              <text class="contact-label">意见反馈</text>
              <text class="contact-arrow" @click="goFeedback">›</text>
            </view>
            <view class="contact-item">
              <text class="contact-label">客服邮箱</text>
              <text class="contact-value">support@rebu.com</text>
            </view>
            <view class="contact-item">
              <text class="contact-label">官方微信</text>
              <text class="contact-value">rebu_guoxue</text>
            </view>
          </view>
        </view>

        <!-- 协议 -->
        <view class="section">
          <text class="section-title">法律协议</text>
          <view class="card">
            <view class="agreement-item" @click="showAgreement('user')">
              <text class="agreement-label">📝 用户协议</text>
              <text class="setting-arrow">›</text>
            </view>
            <view class="agreement-item" @click="showAgreement('privacy')">
              <text class="agreement-label">🛡️ 隐私政策</text>
              <text class="setting-arrow">›</text>
            </view>
            <view class="agreement-item" @click="showAgreement('children')">
              <text class="agreement-label">👶 儿童隐私保护声明</text>
              <text class="setting-arrow">›</text>
            </view>
          </view>
        </view>

        <!-- 版本信息 -->
        <view class="section">
          <view class="card version-card">
            <view class="version-row">
              <text class="version-label">应用版本</text>
              <text class="version-value">v1.0.0</text>
            </view>
            <view class="version-row">
              <text class="version-label">构建版本</text>
              <text class="version-value">2024.06.01</text>
            </view>
          </view>
        </view>

        <!-- 版权 -->
        <view class="footer-copyright">
          <text>Copyright © 2024 热卜国学</text>
          <text>All Rights Reserved</text>
        </view>
      </scroll-view>
    </view>
  </DataState>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataState from '@/components/DataState.vue'

const pageLoading = ref(false)
const pageError = ref<string | null>(null)

const features = [
  { icon: '📚', title: '专业内容', desc: '严选优质国学课程与古籍资源' },
  { icon: '👥', title: '圈子交流', desc: '加入志同道合的学习社区' },
  { icon: '🏆', title: '名师指导', desc: '一对一咨询，答疑解惑' },
  { icon: '🏛️', title: '线下活动', desc: '定期举办国学文化体验活动' },
]

function initPage() {
  pageLoading.value = false
  pageError.value = null
}

onMounted(initPage)

function goFeedback() {
  uni.navigateTo({ url: '/pages/mine/feedback' })
}

function showAgreement(type: string) {
  const titles: Record<string, string> = {
    user: '用户协议',
    privacy: '隐私政策',
    children: '儿童隐私保护声明',
  }
  uni.showModal({
    title: titles[type] || '协议',
    content: '协议内容加载中，请稍候...',
    showCancel: false,
  })
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

/* Hero */
.hero {
  padding: 60rpx 24rpx;
  text-align: center;
  background: linear-gradient(180deg, rgba(139, 105, 20, 0.08), transparent);
}
.hero-logo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #8b6914, #5a3a1a);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(90, 58, 26, 0.2);
}
.hero-logo-text {
  font-size: 56rpx;
  font-weight: bold;
  color: #fff;
}
.hero-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #5a3a1a;
  display: block;
  margin-bottom: 8rpx;
}
.hero-slogan {
  font-size: 26rpx;
  color: #8b6914;
  display: block;
}

/* 分区 */
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

/* 介绍 */
.about-desc {
  padding: 28rpx 24rpx;
}
.about-desc text {
  font-size: 26rpx;
  color: #5a3a1a;
  line-height: 1.8;
}

/* 统计数据 */
.stats-grid {
  display: flex;
  gap: 16rpx;
}
.stat-item {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 16rpx;
  text-align: center;
}
.stat-number {
  font-size: 40rpx;
  font-weight: bold;
  color: #5a3a1a;
  display: block;
}
.stat-number.gold {
  color: #8b6914;
}
.stat-number.green {
  color: #2ecc71;
}
.stat-label {
  font-size: 22rpx;
  color: #a09080;
  display: block;
  margin-top: 8rpx;
}

/* 特色 */
.feature-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0ebe0;
}
.feature-item:last-child {
  border-bottom: none;
}
.feature-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(139, 105, 20, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  flex-shrink: 0;
}
.feature-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #5a3a1a;
  display: block;
}
.feature-desc {
  font-size: 22rpx;
  color: #a09080;
  display: block;
  margin-top: 4rpx;
}

/* 联系我们 */
.contact-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 24rpx;
  border-bottom: 1rpx solid #f0ebe0;
}
.contact-item:last-child {
  border-bottom: none;
}
.contact-label {
  font-size: 26rpx;
  color: #5a3a1a;
}
.contact-value {
  font-size: 24rpx;
  color: #a09080;
}
.contact-arrow {
  font-size: 36rpx;
  color: #c0b0a0;
  font-weight: bold;
  padding: 4rpx 12rpx;
}

/* 协议 */
.agreement-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 24rpx;
  border-bottom: 1rpx solid #f0ebe0;
}
.agreement-item:last-child {
  border-bottom: none;
}
.agreement-item:active {
  background: #f9f5ed;
}
.agreement-label {
  font-size: 26rpx;
  color: #5a3a1a;
}

.setting-arrow {
  font-size: 32rpx;
  color: #c0b0a0;
  font-weight: bold;
  flex-shrink: 0;
}

/* 版本 */
.version-card {
  padding: 0;
}
.version-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 24rpx;
  border-bottom: 1rpx solid #f0ebe0;
}
.version-row:last-child {
  border-bottom: none;
}
.version-label {
  font-size: 26rpx;
  color: #5a3a1a;
}
.version-value {
  font-size: 24rpx;
  color: #a09080;
}

/* 版权 */
.footer-copyright {
  margin: 60rpx 24rpx 40rpx;
  text-align: center;
}
.footer-copyright text {
  display: block;
  font-size: 20rpx;
  color: #a09080;
  line-height: 1.6;
}
</style>
