<template>
  <view class="cs-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">智能客服</text>
        <view class="header-spacer" />
      </view>
    </view>

    <view class="cs-body">
      <view class="cs-hero">
        <text class="cs-hero-icon">🤖</text>
        <text class="cs-hero-title">AI智能客服</text>
        <text class="cs-hero-desc">国学知识问答 · 功能引导 · 问题解决</text>
      </view>

      <view class="cs-categories">
        <text class="cs-cat-title">常见问题分类</text>
        <view class="cs-cat-grid">
          <view v-for="c in categories" :key="c.key" class="cs-cat-card" @click="goChat(c.key)">
            <text class="cs-cat-emoji">{{ c.emoji }}</text>
            <text class="cs-cat-label">{{ c.label }}</text>
          </view>
        </view>
      </view>

      <view class="cs-quick">
        <text class="cs-quick-title">快速咨询</text>
        <view class="cs-quick-list">
          <view v-for="(q, i) in quickQuestions" :key="i" class="cs-quick-item" @click="goChat(q)">
            <text class="cs-q-icon">💬</text>
            <text class="cs-q-text">{{ q }}</text>
            <text class="cs-q-arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <view class="cs-bottom">
      <view class="cs-start-btn" @click="goChat('')">
        <text>🤖 开始对话</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const categories = [
  { key: 'order', label: '订单问题', emoji: '📦' },
  { key: 'course', label: '课程咨询', emoji: '📖' },
  { key: 'account', label: '账号相关', emoji: '👤' },
  { key: 'payment', label: '支付问题', emoji: '💳' },
  { key: 'refund', label: '退款售后', emoji: '↩️' },
  { key: 'other', label: '其他问题', emoji: '❓' },
]

const quickQuestions = ['如何购买课程？', '优惠券怎么使用？', '订单多久能退款？', '如何联系讲师？', '课程可以试看吗？']

function goChat(topic: string) {
  uni.navigateTo({ url: '/pages/agent/id-detail/index?id=cs' + (topic ? '&topic=' + topic : '') })
}
</script>

<style scoped>
.cs-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 140rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.cs-body { padding: 24rpx; }
.cs-hero { display: flex; flex-direction: column; align-items: center; padding: 48rpx 0; }
.cs-hero-icon { font-size: 100rpx; margin-bottom: 16rpx; }
.cs-hero-title { font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.cs-hero-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; }

.cs-categories { margin-top: 20rpx; }
.cs-cat-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 14rpx; }
.cs-cat-grid { display: flex; flex-wrap: wrap; gap: 14rpx; }
.cs-cat-card { display: flex; flex-direction: column; align-items: center; gap: 8rpx; width: calc(33.33% - 10rpx); padding: 24rpx 0; background: #fff; border-radius: 14rpx; border: 1px solid #E8E0D5; }
.cs-cat-emoji { font-size: 44rpx; }
.cs-cat-label { font-size: 22rpx; color: #666; }

.cs-quick { margin-top: 28rpx; }
.cs-quick-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 14rpx; }
.cs-quick-list { background: #fff; border-radius: 14rpx; overflow: hidden; }
.cs-quick-item { display: flex; align-items: center; gap: 10rpx; padding: 18rpx 20rpx; border-bottom: 1px solid #F5F1EB; }
.cs-quick-item:last-child { border-bottom: 0; }
.cs-q-icon { font-size: 24rpx; }
.cs-q-text { flex: 1; font-size: 24rpx; color: #333; }
.cs-q-arrow { font-size: 28rpx; color: #BBB; }

.cs-bottom { position: fixed; bottom: 0; left: 0; right: 0; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; }
.cs-start-btn { padding: 16rpx; text-align: center; background: #C41E3A; border-radius: 14rpx; }
.cs-start-btn text { font-size: 28rpx; color: #fff; font-weight: 500; }
</style>
