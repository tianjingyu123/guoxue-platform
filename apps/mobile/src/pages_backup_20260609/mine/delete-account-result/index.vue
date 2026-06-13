<template>
  <view class="page">
    <view class="body">
      <text class="icon">⏰</text><text class="title">注销申请已提交</text><text class="desc">您的账号将在7天冷静期后正式注销</text>
      <view class="countdown"><text class="cd-num">7天</text><text class="cd-label">冷静期</text></view>
      <text class="hint">在此期间重新登录可自动撤销注销申请</text>
      <view class="btns"><view class="btn" @click="goHome">返回首页</view></view>
    </view>
  </view>
</template>
<script setup lang="ts">function goHome(){uni.reLaunch({url:'/pages/index/index'})}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh;display:flex;align-items:center;justify-content:center}.body{text-align:center;padding:48rpx}.icon{font-size:96rpx;display:block;margin-bottom:24rpx}.title{font-size:36rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:12rpx}.desc{font-size:26rpx;color:#999;display:block;margin-bottom:48rpx}.countdown{text-align:center;margin-bottom:32rpx}.cd-num{font-size:72rpx;font-weight:900;color:#C41E3A;display:block}.cd-label{font-size:26rpx;color:#999;margin-top:4rpx}.hint{font-size:24rpx;color:#999;display:block;margin-bottom:48rpx}.btns{display:flex;justify-content:center}.btn{padding:24rpx 80rpx;background:#C41E3A;color:#fff;border-radius:40rpx;font-size:28rpx;font-weight:500}</style>
