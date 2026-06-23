<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="navbar-left">
        <view class="icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="24" color="#2c2c2c" />
        </view>
        <view class="navbar-title-wrap">
          <app-icon name="shield" :size="20" color="#c41e3a" />
          <text class="navbar-title">儿童隐私保护</text>
        </view>
      </view>
      <text class="navbar-version">v{{ doc.version }}</text>
    </view>

    <!-- 滚动区 -->
    <scroll-view
      scroll-y
      class="scroll-area"
      :scroll-into-view="scrollTarget"
      scroll-with-animation
      @scrolltolower="hasScrolledToBottom = true"
    >
      <view class="container">
        <!-- 重要提示卡片 -->
        <view class="notice-card">
          <app-icon name="shield" :size="20" color="#c41e3a" class="notice-icon" />
          <view class="notice-body">
            <text class="notice-title">儿童隐私保护声明</text>
            <text class="notice-text">本平台高度重视儿童个人信息保护，严格遵守《儿童个人信息网络保护规定》及相关法律法规。如您是未满14周岁的未成年人，请在监护人陪同下阅读本声明。</text>
          </view>
        </view>

        <!-- 版本信息 -->
        <view class="version-row">
          <text class="version-text">更新日期：{{ doc.effectiveDate }}</text>
        </view>

        <!-- 文档内容 -->
        <view class="content">
          <view v-for="section in doc.sections" :id="section.id" :key="section.id" class="section">
            <text class="h2">{{ section.title }}</text>
            <block v-for="(blk, bi) in section.blocks" :key="bi">
              <view v-if="blk.type === 'p'" class="para">
                <text v-for="(run, ri) in blk.runs" :key="ri" :class="['run', { 'run-bold': run.bold }]">{{ run.text }}</text>
              </view>
              <view v-else class="ul">
                <view v-for="(li, li2) in blk.items" :key="li2" class="li">
                  <text class="li-dot">•</text>
                  <text class="li-text">{{ li }}</text>
                </view>
              </view>
            </block>
          </view>
        </view>

        <!-- 监护人联系方式 -->
        <view class="guardian-card">
          <text class="guardian-title">监护人联系方式</text>
          <text class="guardian-desc">如您是未成年人的监护人，对我们处理您所监护的未成年人个人信息有任何疑问、意见或建议，或需要行使相关权利，请通过以下方式联系我们：</text>
          <view class="contact-list">
            <view class="contact-item" @tap="onMail">
              <view class="contact-icon-wrap">
                <app-icon name="mail" :size="20" color="#c41e3a" />
              </view>
              <view class="contact-info">
                <text class="contact-label">邮件联系</text>
                <text class="contact-value">privacy@rebu.com</text>
              </view>
            </view>
            <view class="contact-item" @tap="onPhone">
              <view class="contact-icon-wrap">
                <app-icon name="phone" :size="20" color="#c41e3a" />
              </view>
              <view class="contact-info">
                <text class="contact-label">电话联系</text>
                <text class="contact-value">400-888-8888（工作日 9:00-18:00）</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 底部确认 -->
        <view class="confirm-wrap">
          <view
            v-if="!confirmed"
            class="confirm-btn"
            :class="{ 'confirm-btn-disabled': !hasScrolledToBottom || confirming }"
            @tap="handleConfirm"
          >
            <text class="confirm-text">{{ confirming ? '确认中...' : hasScrolledToBottom ? '我已阅读并理解' : '请阅读完整内容' }}</text>
          </view>
          <text v-else class="confirmed-tip">您已于 {{ confirmedAt }} 阅读并确认本声明</text>
        </view>
      </view>
    </scroll-view>

    <!-- 移动端悬浮目录按钮 -->
    <view class="toc-fab" @tap="showToc = true">
      <text class="toc-fab-text">目录</text>
    </view>

    <!-- 目录抽屉 -->
    <view v-if="showToc" class="toc-overlay">
      <view class="toc-mask" @tap="showToc = false" />
      <view class="toc-panel">
        <view class="toc-head">
          <text class="toc-title">目录</text>
          <view class="icon-btn" @tap="showToc = false">
            <app-icon name="x" :size="20" color="#2c2c2c" />
          </view>
        </view>
        <scroll-view scroll-y class="toc-list">
          <view
            v-for="item in toc"
            :key="item.id"
            class="toc-item"
            :class="{ 'toc-item-sub': item.level !== 2, 'toc-item-active': activeSection === item.id }"
            @tap="goSection(item.id)"
          >
            <text class="toc-item-text">{{ item.title }}</text>
            <app-icon name="chevron-right" :size="16" color="#cccccc" />
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { goBack } from '@/utils/router'
import { legalDocs, extractToc } from '@/lib/legal-data'

const doc = legalDocs['child-privacy']
const toc = extractToc(doc)

const showToc = ref(false)
const activeSection = ref('')
const scrollTarget = ref('')
const hasScrolledToBottom = ref(false)
const confirming = ref(false)
const confirmed = ref(false)
const confirmedAt = ref('')

const goSection = (id: string) => {
  activeSection.value = id
  scrollTarget.value = ''
  setTimeout(() => { scrollTarget.value = id }, 0)
  showToc.value = false
}

const handleConfirm = () => {
  if (!hasScrolledToBottom.value || confirming.value) return
  confirming.value = true
  setTimeout(() => {
    confirming.value = false
    confirmed.value = true
    confirmedAt.value = new Date().toLocaleDateString()
  }, 400)
}

const onMail = () => {
  // 原型 mailto:privacy@rebu.com
}
const onPhone = () => {
  uni.makePhoneCall({ phoneNumber: '400-888-8888', fail: () => {} })
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #faf8f5;
}

/* 导航栏 */
.navbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background-color: #faf8f5;
  border-bottom: 2rpx solid #e8e0d5;
}
.navbar-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.icon-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.navbar-title-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.navbar-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.navbar-version {
  font-size: 24rpx;
  color: #999999;
}

/* 滚动区 */
.scroll-area {
  flex: 1;
  overflow: hidden;
}
.container {
  padding: 32rpx;
}

/* 提示卡片 */
.notice-card {
  display: flex;
  gap: 24rpx;
  background-color: rgba(196, 30, 58, 0.05);
  border: 2rpx solid rgba(196, 30, 58, 0.2);
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 48rpx;
}
.notice-icon {
  flex-shrink: 0;
  margin-top: 4rpx;
}
.notice-body {
  flex: 1;
}
.notice-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #c41e3a;
  margin-bottom: 8rpx;
}
.notice-text {
  font-size: 28rpx;
  color: #999999;
  line-height: 1.6;
}

/* 版本信息 */
.version-row {
  margin-bottom: 48rpx;
}
.version-text {
  font-size: 28rpx;
  color: #999999;
}

/* 正文 */
.content {
  display: block;
}
.section {
  display: block;
}
.h2 {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-top: 64rpx;
  margin-bottom: 32rpx;
}
.section:first-child .h2 {
  margin-top: 0;
}
.para {
  margin-bottom: 32rpx;
}
.run {
  font-size: 28rpx;
  color: #999999;
  line-height: 1.7;
}
.run-bold {
  color: #2c2c2c;
  font-weight: 500;
}
.ul {
  margin: 32rpx 0;
}
.li {
  display: flex;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.li-dot {
  font-size: 28rpx;
  color: #999999;
  line-height: 1.7;
}
.li-text {
  flex: 1;
  font-size: 28rpx;
  color: #999999;
  line-height: 1.7;
}

/* 监护人联系方式 */
.guardian-card {
  margin-top: 64rpx;
  padding: 32rpx;
  background-color: rgba(245, 241, 235, 0.5);
  border: 2rpx solid #e8e0d5;
  border-radius: 16rpx;
}
.guardian-title {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 24rpx;
}
.guardian-desc {
  display: block;
  font-size: 28rpx;
  color: #999999;
  line-height: 1.6;
  margin-bottom: 32rpx;
}
.contact-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.contact-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background-color: #faf8f5;
  border: 2rpx solid #e8e0d5;
  border-radius: 16rpx;
}
.contact-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.contact-info {
  flex: 1;
}
.contact-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.contact-value {
  font-size: 28rpx;
  color: #999999;
}

/* 底部确认 */
.confirm-wrap {
  margin-top: 64rpx;
  padding-bottom: 64rpx;
}
.confirm-btn {
  width: 100%;
  height: 88rpx;
  background-color: #c41e3a;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-btn-disabled {
  background-color: #e8e0d5;
}
.confirm-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}
.confirmed-tip {
  display: block;
  text-align: center;
  font-size: 28rpx;
  color: #999999;
}

/* 悬浮目录按钮 */
.toc-fab {
  position: fixed;
  right: 32rpx;
  bottom: 160rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background-color: #c41e3a;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.toc-fab-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 目录抽屉 */
.toc-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.toc-mask {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
}
.toc-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 480rpx;
  background-color: #faf8f5;
  box-shadow: -8rpx 0 24rpx rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}
.toc-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 2rpx solid #e8e0d5;
}
.toc-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.toc-list {
  flex: 1;
  padding: 32rpx;
}
.toc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  margin-bottom: 8rpx;
}
.toc-item-sub {
  padding-left: 48rpx;
}
.toc-item-active {
  background-color: rgba(196, 30, 58, 0.1);
}
.toc-item-text {
  font-size: 28rpx;
  color: #999999;
}
.toc-item-active .toc-item-text {
  color: #c41e3a;
  font-weight: 500;
}
</style>
