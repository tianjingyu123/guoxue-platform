<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">青少年模式</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="header"><text class="h-icon">🛡️</text><text class="h-title">青少年保护模式</text><text class="h-desc">为青少年打造健康安全的学习环境</text></view>
      <view class="card"><text class="ct">保护功能</text>
        <view v-for="f in features" :key="f" class="feat"><text class="fi-icon">✓</text><text>{{f}}</text></view>
      </view>
      <view class="card"><text class="ct">使用限制</text>
        <view class="limit"><text>每日使用时长：40分钟</text><text>禁用时段：22:00 - 06:00</text><text>内容过滤级别：严格</text></view>
      </view>
      <view class="btn" @click="goSettings">前往设置</view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">const features=['限制每日使用时长','夜间禁用保护','内容安全过滤','禁止打赏消费','关闭直播互动','隐藏付费入口'];function goSettings(){uni.navigateTo({url:'/pages/mine/teen-mode/index'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.header{text-align:center;padding:48rpx 0 32rpx}.h-icon{font-size:96rpx;display:block;margin-bottom:16rpx}.h-title{font-size:36rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:8rpx}.h-desc{font-size:26rpx;color:#999}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.feat{padding:12rpx 0;font-size:26rpx;color:#666;display:flex;align-items:center;gap:12rpx}.fi-icon{color:#22c55e;font-size:28rpx;font-weight:600}.limit{font-size:26rpx;color:#666;line-height:2}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
