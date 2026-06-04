<template>
  <view class="page">
    <view class="header">
      <text
        class="back-btn"
        @click="goBack"
      >
        ‹
      </text>
      <text class="header-title">
        青少年模式说明
      </text>
      <view style="width:60rpx" />
    </view>
    <scroll-view
      scroll-y
      class="content-scroll"
    >
      <view class="mode-card">
        <text class="mode-icon">
          👦
        </text>
        <text class="mode-title">
          青少年模式
        </text>
        <text class="mode-desc">
          为青少年提供健康、安全、有益的网络环境
        </text>
      </view>
      <rich-text
        :nodes="content"
        class="doc-content"
      />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const content = ref('')

onMounted(async () => {
  try {
    const { legalApi } = await import('../../api')
    const res: any = await (legalApi as any).getDoc?.('teen-mode')
    content.value = res?.content || generateContent()
  } catch { content.value = generateContent() }
  uni.setNavigationBarTitle({ title: '青少年模式说明' })
})

function generateContent(): string {
  return `
    <h3>什么是青少年模式？</h3>
    <p>青少年模式是为未满18周岁的用户提供的特殊使用模式，旨在保护青少年健康上网。</p>
    <h3>功能限制</h3>
    <p>启用青少年模式后，以下功能将受到限制：每日使用时长限制（默认40分钟）、夜间禁止使用（22:00-06:00）、部分内容过滤、充值消费功能关闭、互动功能限制。</p>
    <h3>如何开启</h3>
    <p>您可以在"我的-设置-青少年模式"中开启或关闭该模式。开启后需设置独立的密码，退出模式需验证密码。</p>
    <h3>家长须知</h3>
    <p>建议家长开启青少年模式并妥善保管密码，定期关注孩子的使用情况。如遇问题请联系在线客服。</p>
  `
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; position: sticky; top: 0; z-index: 10; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content-scroll { padding: 24rpx; }
.mode-card { background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 20rpx; padding: 48rpx 32rpx; text-align: center; color: #fff; margin-bottom: 24rpx; }
.mode-icon { font-size: 80rpx; display: block; margin-bottom: 16rpx; }
.mode-title { font-size: 36rpx; font-weight: bold; display: block; margin-bottom: 12rpx; }
.mode-desc { font-size: 26rpx; opacity: 0.9; display: block; }
.doc-content { background: #fff; border-radius: 20rpx; padding: 32rpx; font-size: 28rpx; line-height: 1.8; color: #2C2C2C; }
.doc-content :deep(h3) { font-size: 28rpx; font-weight: 600; margin-top: 24rpx; margin-bottom: 12rpx; color: #C41E3A; }
.doc-content :deep(h3:first-child) { margin-top: 0; }
.doc-content :deep(p) { margin-bottom: 16rpx; color: #444; }
</style>
