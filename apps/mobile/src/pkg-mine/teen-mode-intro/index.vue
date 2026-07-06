<template>
  <view class="teen-intro-page">
    <!-- 导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left">
          <view class="nav-back" @tap="goBack">
            <app-icon name="chevron-left" :size="40" color="#2C2C2C" />
          </view>
          <text class="nav-title">青少年模式</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="page-scroll">
      <view class="content-wrap">
        <!-- 头部Banner -->
        <view class="banner">
          <view class="banner-icon">
            <app-icon name="shield" :size="80" color="#C41E3A" />
          </view>
          <text class="banner-title">守护青少年健康成长</text>
          <text class="banner-desc">青少年模式为未成年用户提供全方位的使用保护，帮助建立健康的数字使用习惯</text>
        </view>

        <!-- 核心功能 -->
        <view class="section">
          <text class="section-title">核心功能</text>
          <view
            v-for="(feature, index) in features"
            :key="index"
            class="feature-card"
          >
            <view class="feature-row">
              <view class="feature-icon" :style="{ background: feature.iconBg }">
                <app-icon :name="feature.icon" :size="48" :color="feature.iconColor" />
              </view>
              <view class="feature-body">
                <text class="feature-title">{{ feature.title }}</text>
                <text class="feature-desc">{{ feature.description }}</text>
                <view class="feature-details">
                  <view
                    v-for="(detail, i) in feature.details"
                    :key="i"
                    class="detail-item"
                  >
                    <app-icon name="check-circle" :size="32" color="#22C55E" />
                    <text class="detail-text">{{ detail }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 额外保护措施 -->
        <view class="section">
          <text class="section-title section-title-mb">额外保护措施</text>
          <view class="list-card">
            <view
              v-for="(item, index) in protections"
              :key="index"
              class="protect-item"
            >
              <view class="protect-icon">
                <app-icon :name="item.icon" :size="32" color="#C41E3A" />
              </view>
              <text class="protect-text">{{ item.text }}</text>
            </view>
          </view>
        </view>

        <!-- 使用须知 -->
        <view class="section">
          <text class="section-title section-title-mb">使用须知</text>
          <view class="notice-card">
            <text class="notice-text"><text class="notice-num">1. </text>青少年模式开启后，部分功能将受到限制，如直播打赏、充值消费等。</text>
            <text class="notice-text"><text class="notice-num">2. </text>建议由家长或监护人设置密码，并妥善保管。</text>
            <text class="notice-text"><text class="notice-num">3. </text>如需关闭青少年模式，需输入设置时的密码。</text>
            <text class="notice-text"><text class="notice-num">4. </text>忘记密码可通过"设置 - 青少年模式 - 忘记密码"找回。</text>
          </view>
        </view>

        <!-- 常见问题 -->
        <view class="section">
          <text class="section-title section-title-mb">常见问题</text>
          <view class="list-card">
            <view
              v-for="(faq, index) in faqs"
              :key="index"
              class="faq-item"
              @tap="goFaq"
            >
              <text class="faq-text">{{ faq }}</text>
              <app-icon name="chevron-right" :size="32" color="#999999" />
            </view>
          </view>
        </view>

        <!-- 联系我们 -->
        <view class="section">
          <view class="contact-card">
            <text class="contact-tip">如有任何问题，欢迎联系我们</text>
            <text class="contact-mail">客服邮箱：<text class="contact-link">support@rebu.com</text></text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部固定按钮 -->
    <view class="footer">
      <view class="footer-btn" @tap="openTeenMode">
        <app-icon name="shield" :size="40" color="#FFFFFF" />
        <text class="footer-btn-text">立即开启青少年模式</text>
      </view>
      <text class="footer-tip">开启后可随时在"设置"中进行调整</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { goBack, navigateTo } from '@/utils/router'

const statusBarHeight = ref(0)

const features = [
  {
    icon: 'clock',
    title: '时长管理',
    description: '每日使用时长限制，帮助青少年合理规划学习和娱乐时间。',
    details: ['每日使用时长上限设置', '休息提醒功能', '使用时段限制'],
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
  },
  {
    icon: 'filter',
    title: '内容过滤',
    description: '智能过滤不适合青少年的内容，营造健康的学习环境。',
    details: ['自动屏蔽敏感内容', '仅展示适龄内容', '严格内容审核'],
    iconColor: '#16A34A',
    iconBg: '#F0FDF4',
  },
  {
    icon: 'moon',
    title: '夜间模式',
    description: '设置夜间禁用时段，保障青少年充足睡眠。',
    details: ['自定义禁用时段', '默认22:00-6:00禁用', '护眼模式自动开启'],
    iconColor: '#9333EA',
    iconBg: '#FAF5FF',
  },
  {
    icon: 'lock',
    title: '密码保护',
    description: '独立密码保护，防止青少年自行关闭保护模式。',
    details: ['独立4位数字密码', '密码修改需验证', '忘记密码可通过监护人找回'],
    iconColor: '#EA580C',
    iconBg: '#FFF7ED',
  },
]

const protections = [
  { icon: 'eye', text: '浏览记录可供家长查看' },
  { icon: 'bell', text: '异常行为通知监护人' },
  { icon: 'shield', text: '禁止充值和打赏功能' },
  { icon: 'sparkles', text: '推荐优质国学学习内容' },
]

const faqs = [
  '如何设置青少年模式密码？',
  '忘记密码怎么办？',
  '青少年模式会限制哪些功能？',
  '如何查看孩子的使用记录？',
]

function goFaq() {
  navigateTo('/help/faq?topic=teen-mode')
}

function openTeenMode() {
  navigateTo('/mine/teen-mode')
}

uni.getSystemInfo({
  success: (res) => {
    statusBarHeight.value = res.statusBarHeight || 0
  },
})
</script>

<style scoped lang="scss">
.teen-intro-page {
  /* iOS Safari flex bug：用固定 height 才能让 flex:1 滚动子项正确填充(min-height:100vh 会算出高度0致内容空白) */
  height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

/* 导航栏 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #faf8f5;
  border-bottom: 2rpx solid #e8e0d5;
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.nav-back {
  margin-left: -8rpx;
  padding: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}

.page-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}
.content-wrap {
  padding-bottom: 240rpx;
}

/* 头部Banner */
.banner {
  background: linear-gradient(to bottom right, rgba(196, 30, 58, 0.1), rgba(196, 30, 58, 0.05), #faf8f5);
  padding: 64rpx 32rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.banner-icon {
  width: 160rpx;
  height: 160rpx;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.banner-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.banner-desc {
  font-size: 28rpx;
  line-height: 1.5;
  color: #999999;
  max-width: 640rpx;
}

/* 通用 section */
.section {
  padding: 32rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.section-title-mb {
  display: block;
  margin-bottom: 24rpx;
}

/* 功能卡 */
.feature-card {
  background: #ffffff;
  border: 2rpx solid #e8e0d5;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-top: 32rpx;
}
.feature-row {
  display: flex;
  align-items: flex-start;
  gap: 32rpx;
}
.feature-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.feature-body {
  flex: 1;
  min-width: 0;
}
.feature-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 8rpx;
}
.feature-desc {
  display: block;
  font-size: 28rpx;
  line-height: 1.5;
  color: #999999;
  margin-bottom: 24rpx;
}
.feature-details {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.detail-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.detail-text {
  font-size: 28rpx;
  color: rgba(44, 44, 44, 0.8);
}

/* 列表卡(额外保护/常见问题) */
.list-card {
  background: #ffffff;
  border: 2rpx solid #e8e0d5;
  border-radius: 24rpx;
  overflow: hidden;
}
.protect-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid #e8e0d5;
}
.protect-item:last-child {
  border-bottom: none;
}
.protect-icon {
  width: 64rpx;
  height: 64rpx;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.protect-text {
  font-size: 28rpx;
  color: #2c2c2c;
}

/* 使用须知 */
.notice-card {
  background: #fffbeb;
  border: 2rpx solid #fde68a;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.notice-text {
  font-size: 28rpx;
  line-height: 1.5;
  color: #92400e;
}
.notice-num {
  font-weight: 500;
}

/* 常见问题 */
.faq-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid #e8e0d5;
}
.faq-item:last-child {
  border-bottom: none;
}
.faq-text {
  font-size: 28rpx;
  color: #2c2c2c;
}

/* 联系我们 */
.contact-card {
  background: rgba(245, 241, 235, 0.5);
  border-radius: 24rpx;
  padding: 32rpx;
  text-align: center;
}
.contact-tip {
  display: block;
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 16rpx;
}
.contact-mail {
  font-size: 28rpx;
  color: #2c2c2c;
}
.contact-link {
  color: var(--brand);
}

/* 底部固定按钮 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #faf8f5;
  border-top: 2rpx solid #e8e0d5;
  padding: 32rpx;
  padding-bottom: calc(32rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}
.footer-btn {
  width: 100%;
  height: 96rpx;
  background: var(--brand);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.footer-btn-text {
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
}
.footer-tip {
  display: block;
  font-size: 24rpx;
  color: #999999;
  text-align: center;
  margin-top: 16rpx;
}
</style>
