<template>
  <view class="page">
    <app-nav-bar title="支付说明" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />

    <view class="desc">平台当前已接通微信支付。购买课程、商品或会员时，由统一收银台按当前环境调起微信支付。</view>

    <view class="list">
      <view class="card">
        <view class="left">
          <view class="badge">微</view>
          <view class="info">
            <text class="name">微信支付</text>
            <text class="status">购买时由统一收银台调用</text>
          </view>
        </view>
        <view class="supported">
          <app-icon name="check" :size="26" color="#2f7d4b" />
          <text>已支持</text>
        </view>
      </view>

      <view class="notice">
        <text class="notice-title">支付安全说明</text>
        <text class="notice-text">本页仅说明平台当前支持的支付渠道，无需在平台内预先绑定支付账户。实际可用状态以收银台实时结果为准。</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'

</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.desc { padding: 24rpx 32rpx; font-size: 24rpx; line-height: 1.6; color: #8a8378; }
.list { padding: 0 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
.card { display: flex; align-items: center; justify-content: space-between; padding: 32rpx; background: #fff; border: 1rpx solid #e8e3db; border-radius: 24rpx; }
.left { display: flex; align-items: center; gap: 24rpx; }
.badge { width: 72rpx; height: 72rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; background: #22c55e; font-size: 28rpx; font-weight: 700; color: #fff; }
.info { display: flex; flex-direction: column; gap: 6rpx; }
.name { font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.status { font-size: 24rpx; color: #8a8378; }
.supported { display: flex; align-items: center; gap: 6rpx; padding: 12rpx 24rpx; border-radius: 999rpx; background: #edf7f0; color: #2f7d4b; font-size: 24rpx; font-weight: 600; }
.notice { padding: 28rpx 32rpx; background: #fffaf0; border: 1rpx solid #eadfcf; border-radius: 24rpx; display: flex; flex-direction: column; gap: 8rpx; }
.notice-title { font-size: 26rpx; font-weight: 600; color: #5c4b36; }
.notice-text { font-size: 24rpx; line-height: 1.65; color: #8a765b; }
</style>
