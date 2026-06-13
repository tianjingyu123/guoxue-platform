<template>
  <view class="page">
    <view class="body"><text class="icon">🔧</text><text class="title">系统维护中</text><text class="desc">我们正在进行系统升级维护</text><text class="hint">预计维护时间：2小时</text>
      <view class="progress"><view class="pg-bar"><view class="pg-fill"/></view><text class="pg-text">维护进度 65%</text></view>
      <view class="btn" @click="goBack">返回上页</view>
    </view>
  </view>
</template>
<script setup lang="ts">function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh;display:flex;align-items:center;justify-content:center}.body{text-align:center;padding:48rpx}.icon{font-size:120rpx;display:block;margin-bottom:24rpx}.title{font-size:40rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:12rpx}.desc{font-size:28rpx;color:#666;display:block;margin-bottom:8rpx}.hint{font-size:24rpx;color:#999;display:block;margin-bottom:40rpx}.progress{margin-bottom:40rpx}.pg-bar{width:400rpx;height:12rpx;background:#E8E0D5;border-radius:6rpx;overflow:hidden;margin:0 auto 12rpx}.pg-fill{width:65%;height:100%;background:linear-gradient(90deg,#C41E3A,#E74C3C);border-radius:6rpx}.pg-text{font-size:22rpx;color:#999}.btn{padding:24rpx 80rpx;border-radius:40rpx;border:1px solid #E8E0D5;color:#666;display:inline-block;font-size:26rpx}</style>
