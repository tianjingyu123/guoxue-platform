<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-inner">
        <view class="back-btn" @tap="onBack">
          <AppIcon name="arrow-left" :size="20" color="#2c2c2c" />
        </view>
        <text class="navbar-title">找回密码</text>
      </view>
    </view>

    <!-- 主内容 -->
    <view class="body">
      <view class="intro">
        <text class="intro-title">选择找回方式</text>
        <text class="intro-sub">请选择您注册时使用的验证方式</text>
      </view>

      <view class="card-list">
        <!-- 手机号找回 -->
        <view class="rec-card" @tap="onPhone">
          <view class="rec-icon icon-phone"><AppIcon name="phone" :size="24" color="#c9a96e" /></view>
          <view class="rec-main">
            <text class="rec-title">手机号找回</text>
            <text class="rec-desc">自助找回暂未开放，客服协助处理</text>
          </view>
          <AppIcon name="chevron-right" :size="20" color="#bbbbbb" />
        </view>

        <!-- 邮箱找回 -->
        <view class="rec-card" @tap="onEmail">
          <view class="rec-icon icon-mail"><AppIcon name="mail" :size="24" color="#3b82f6" /></view>
          <view class="rec-main">
            <text class="rec-title">邮箱找回</text>
            <text class="rec-desc">自助找回暂未开放，客服协助处理</text>
          </view>
          <AppIcon name="chevron-right" :size="20" color="#bbbbbb" />
        </view>

        <!-- 联系客服 -->
        <view class="rec-card" @tap="onFeedback">
          <view class="rec-icon icon-service"><AppIcon name="message-circle" :size="24" color="#d4a017" /></view>
          <view class="rec-main">
            <text class="rec-title">联系客服</text>
            <text class="rec-desc">人工协助找回账号</text>
          </view>
          <AppIcon name="chevron-right" :size="20" color="#bbbbbb" />
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="tip">
        <text class="tip-text">温馨提示：账号找回目前由人工客服协助处理，请通过「联系客服」提交找回申请，我们会尽快为您处理。</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'

const statusBarHeight = ref(0)
try {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0
} catch (e) {
  statusBarHeight.value = 0
}

function onBack() {
  goBack()
}

/** 手机号/邮箱自助找回子页未迁移——给用户活路：说明人工协助并引导到本页已有的客服入口 */
function assistRecover(channel: string) {
  uni.showModal({
    title: '人工协助找回',
    content: `${channel}自助找回暂未开放，账号找回目前由人工客服协助处理，是否前往联系客服？`,
    confirmText: '联系客服',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) onFeedback()
    },
  })
}

function onPhone() {
  assistRecover('手机号')
}

function onEmail() {
  assistRecover('邮箱')
}

function onFeedback() {
  navigateTo('/feedback')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f7f8;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(247, 247, 248, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 2rpx solid #ececec;
}
.navbar-inner {
  display: flex;
  align-items: center;
  gap: 24rpx;
  height: 88rpx;
  padding: 0 32rpx;
}
.back-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -8rpx;
}
.navbar-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
}

/* 主内容 */
.body {
  flex: 1;
  padding: 48rpx 32rpx;
}
.intro {
  display: flex;
  flex-direction: column;
  margin-bottom: 48rpx;
}
.intro-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.intro-sub {
  font-size: 28rpx;
  color: #999999;
}

/* 卡片列表 */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.rec-card {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 32rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}
.rec-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon-phone {
  background: rgba(201, 169, 110, 0.12);
}
.icon-mail {
  background: rgba(59, 130, 246, 0.12);
}
.icon-service {
  background: rgba(212, 160, 23, 0.12);
}
.rec-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.rec-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rec-desc {
  font-size: 26rpx;
  color: #999999;
}

/* 温馨提示 */
.tip {
  margin-top: 64rpx;
  padding: 32rpx;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 24rpx;
}
.tip-text {
  font-size: 26rpx;
  color: #999999;
  line-height: 1.6;
}
</style>
