<template>
  <view class="am-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">AI助手</text>
        <view class="header-spacer" />
      </view>
    </view>

    <view class="am-body">
      <view class="am-hero">
        <view class="am-hero-glow" />
        <text class="am-hero-icon">🤖</text>
        <text class="am-hero-title">热卜AI助手</text>
        <text class="am-hero-desc">您的专属国学智能助手，随时为您解答</text>
      </view>

      <view class="am-features">
        <text class="am-sec-title">我能帮您做什么</text>
        <view class="am-feat-grid">
          <view v-for="f in features" :key="f.key" class="am-feat" @click="goChat(f.key)">
            <view class="am-feat-icon">
              <text>{{ f.emoji }}</text>
            </view>
            <text class="am-feat-label">{{ f.label }}</text>
          </view>
        </view>
      </view>

      <view class="am-start-area">
        <view class="am-input-row">
          <view class="am-input-box" @click="goChat('')">
            <text class="am-input-hint">输入您的问题...</text>
          </view>
          <view class="am-send-btn">
            <text>发送</text>
          </view>
        </view>
        <view class="am-quick-row">
          <text v-for="q in quickWords" :key="q" class="am-quick-chip" @click="goChat(q)">{{ q }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const features = [
  { key: 'bazi', label: '八字分析', emoji: '🔮' },
  { key: 'name', label: '起名建议', emoji: '📛' },
  { key: 'fengshui', label: '风水咨询', emoji: '🏠' },
  { key: 'zhouyi', label: '周易解读', emoji: '☯️' },
  { key: 'health', label: '养生指导', emoji: '🌿' },
  { key: 'general', label: '通用问答', emoji: '💡' },
]

const quickWords = ['我的八字运势如何？', '帮我解读这个卦', '五行缺什么？', '推荐学习课程']

function goChat(topic: string) {
  uni.navigateTo({ url: '/pages/agent/id-detail/index?id=main' + (topic ? '&topic=' + encodeURIComponent(topic) : '') })
}
</script>

<style scoped>
.am-page { min-height: 100vh; background: #FAF8F5; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.am-body { padding: 24rpx; }
.am-hero { display: flex; flex-direction: column; align-items: center; padding: 56rpx 0 40rpx; position: relative; }
.am-hero-glow { position: absolute; width: 280rpx; height: 280rpx; border-radius: 50%; background: radial-gradient(circle, rgba(196,30,58,0.06), transparent); top: -20rpx; }
.am-hero-icon { font-size: 120rpx; position: relative; z-index: 1; }
.am-hero-title { font-size: 40rpx; font-weight: 700; color: #2C2C2C; margin-top: 16rpx; }
.am-hero-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; }

.am-sec-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 14rpx; }
.am-feat-grid { display: flex; flex-wrap: wrap; gap: 14rpx; }
.am-feat { display: flex; flex-direction: column; align-items: center; gap: 10rpx; width: calc(33.33% - 10rpx); padding: 28rpx 0 20rpx; background: #fff; border-radius: 14rpx; border: 1px solid #E8E0D5; }
.am-feat-icon { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
.am-feat-label { font-size: 22rpx; color: #666; }

.am-start-area { margin-top: 32rpx; }
.am-input-row { display: flex; align-items: center; gap: 12rpx; }
.am-input-box { flex: 1; height: 80rpx; background: #fff; border-radius: 40rpx; border: 1px solid #E8E0D5; padding: 0 24rpx; display: flex; align-items: center; }
.am-input-hint { font-size: 24rpx; color: #BBB; }
.am-send-btn { height: 80rpx; padding: 0 28rpx; background: #C41E3A; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; }
.am-send-btn text { font-size: 26rpx; color: #fff; }
.am-quick-row { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.am-quick-chip { font-size: 22rpx; padding: 10rpx 18rpx; background: #F5F1EB; border-radius: 24rpx; color: #666; }
</style>
