<template>
  <view class="page">
    <AppNavBar
      title="关于我们"
      :back-size="40"
    />

    <view class="hero">
      <view class="seal-wrap">
        <image
          class="logo-img"
          :src="logoSrc"
          mode="aspectFill"
        />
      </view>
      <text class="hero-name">
        {{ BRAND.name }}
      </text>
      <text class="hero-slogan">
        {{ BRAND.slogan }}
      </text>
      <text class="hero-tagline">
        {{ BRAND.tagline }}
      </text>
    </view>

    <view class="content">
      <view class="mission-card">
        <text class="eyebrow">
          我们在做什么
        </text>
        <text class="mission-title">
          让传统文化知识更可信、更好用
        </text>
        <text class="mission-desc">
          {{ BRAND.name }}提供古籍阅读、术数工具、课程学习、社区交流与智能辅助。我们持续核验公开内容和功能状态，不用演示数据替代真实服务。
        </text>
      </view>

      <text class="section-title">
        平台能力
      </text>
      <view class="feature-grid">
        <view
          v-for="feature in features"
          :key="feature.title"
          class="feature-card"
        >
          <view class="feature-icon">
            <AppIcon
              :name="feature.icon"
              :size="22"
              color="#c41e3a"
            />
          </view>
          <text class="feature-title">
            {{ feature.title }}
          </text>
          <text class="feature-desc">
            {{ feature.desc }}
          </text>
        </view>
      </view>

      <text class="section-title">
        联系我们
      </text>
      <view class="contact-card">
        <view
          class="contact-row"
          role="button"
          aria-label="联系平台客服"
          @tap="goService"
        >
          <view class="contact-left">
            <AppIcon
              name="message-square"
              :size="20"
              color="#c41e3a"
            />
            <view class="contact-copy">
              <text class="contact-label">
                平台客服
              </text>
              <text class="contact-sub">
                咨询产品使用、隐私与账号问题
              </text>
            </view>
          </view>
          <AppIcon
            name="chevron-right"
            :size="18"
            color="#9b948b"
          />
        </view>
        <view
          class="contact-row"
          role="button"
          aria-label="提交意见反馈"
          @tap="goFeedback"
        >
          <view class="contact-left">
            <AppIcon
              name="edit"
              :size="20"
              color="#c41e3a"
            />
            <view class="contact-copy">
              <text class="contact-label">
                意见反馈
              </text>
              <text class="contact-sub">
                提交问题、建议或体验反馈
              </text>
            </view>
          </view>
          <AppIcon
            name="chevron-right"
            :size="18"
            color="#9b948b"
          />
        </view>
        <view
          v-if="BRAND.serviceEmail"
          class="contact-row"
          @tap="copyContact(BRAND.serviceEmail, '邮箱')"
        >
          <view class="contact-left">
            <AppIcon
              name="mail"
              :size="20"
              color="#76624f"
            />
            <view class="contact-copy">
              <text class="contact-label">
                客服邮箱
              </text>
              <text class="contact-sub">
                {{ BRAND.serviceEmail }}
              </text>
            </view>
          </view>
          <text class="copy-label">
            复制
          </text>
        </view>
        <view
          v-if="BRAND.serviceWechat"
          class="contact-row"
          @tap="copyContact(BRAND.serviceWechat, '微信号')"
        >
          <view class="contact-left">
            <AppIcon
              name="message-circle"
              :size="20"
              color="#76624f"
            />
            <view class="contact-copy">
              <text class="contact-label">
                官方微信
              </text>
              <text class="contact-sub">
                {{ BRAND.serviceWechat }}
              </text>
            </view>
          </view>
          <text class="copy-label">
            复制
          </text>
        </view>
      </view>

      <view class="footer-copy">
        <text>{{ BRAND.copyright }}</text>
        <text>Copyright © {{ currentYear }} {{ BRAND.name }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { BRAND } from '@/lib/brand'
import { navigateTo } from '@/utils/router'

const logoSrc = '/static/logo.webp'
const currentYear = new Date().getFullYear()

const features = [
  { icon: 'book-open', title: '古籍与工具', desc: '阅读经典原文，使用经过校验的传统文化工具' },
  { icon: 'play', title: '内容与课程', desc: '从公开内容到体系课程，按真实上架状态呈现' },
  { icon: 'users', title: '社区交流', desc: '围绕兴趣加入圈子，与同好持续讨论和学习' },
  { icon: 'sparkles', title: '智能辅助', desc: '为伴读、搜索、客服与创作提供流式智能能力' },
]

function goService() {
  navigateTo('/customer-service')
}

function goFeedback() {
  navigateTo('/feedback')
}

function copyContact(value: string, label: string) {
  uni.setClipboardData({
    data: value,
    success: () => uni.showToast({ title: `${label}已复制`, icon: 'none' }),
  })
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f8f5f0;
  color: #2b2620;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 58rpx 32rpx 50rpx;
  background:
    radial-gradient(circle at 50% 8%, rgba(196, 30, 58, 0.12), transparent 48%),
    linear-gradient(180deg, #fffaf5 0%, #f8f5f0 100%);
}

.seal-wrap {
  width: 136rpx;
  height: 136rpx;
  overflow: hidden;
  border: 8rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 32rpx;
  background: #fff;
  box-shadow: 0 16rpx 42rpx rgba(111, 48, 49, 0.18);
}

.logo-img {
  width: 100%;
  height: 100%;
}

.hero-name {
  margin-top: 28rpx;
  font-family: "Songti SC", "STSong", serif;
  font-size: 44rpx;
  font-weight: 700;
  color: #2a2420;
}

.hero-slogan {
  margin-top: 12rpx;
  font-size: 27rpx;
  letter-spacing: 4rpx;
  color: #8d6f36;
}

.hero-tagline {
  margin-top: 10rpx;
  font-size: 23rpx;
  color: #9a9187;
}

.content {
  padding: 0 28rpx calc(68rpx + env(safe-area-inset-bottom));
}

.mission-card {
  padding: 34rpx;
  border: 1rpx solid #e8dfd4;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 12rpx 34rpx rgba(66, 45, 33, 0.06);
}

.eyebrow {
  display: block;
  margin-bottom: 10rpx;
  font-size: 21rpx;
  font-weight: 700;
  letter-spacing: 3rpx;
  color: #a5843f;
}

.mission-title {
  display: block;
  font-family: "Songti SC", "STSong", serif;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.45;
  color: #2b2620;
}

.mission-desc {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.78;
  color: #70675f;
}

.section-title {
  display: block;
  margin: 42rpx 4rpx 20rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #312a24;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.feature-card {
  min-width: 0;
  padding: 28rpx;
  border: 1rpx solid #ece4da;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.9);
}

.feature-icon {
  width: 66rpx;
  height: 66rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  background: #fbebee;
}

.feature-title {
  display: block;
  margin-top: 18rpx;
  font-size: 27rpx;
  font-weight: 700;
  color: #322b25;
}

.feature-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #837970;
}

.contact-card {
  overflow: hidden;
  border: 1rpx solid #e8dfd4;
  border-radius: 24rpx;
  background: #fff;
}

.contact-row {
  min-height: 106rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 20rpx 28rpx;
  border-bottom: 1rpx solid #f1ebe4;
}

.contact-row:last-child {
  border-bottom: none;
}

.contact-row:active {
  background: #faf7f3;
}

.contact-left {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.contact-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5rpx;
}

.contact-label {
  font-size: 27rpx;
  font-weight: 600;
  color: #342d27;
}

.contact-sub {
  max-width: 500rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 22rpx;
  color: #8d847b;
}

.copy-label {
  flex-shrink: 0;
  font-size: 23rpx;
  color: #c41e3a;
}

.footer-copy {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 46rpx;
  text-align: center;
  font-size: 21rpx;
  color: #9b9289;
}
</style>
