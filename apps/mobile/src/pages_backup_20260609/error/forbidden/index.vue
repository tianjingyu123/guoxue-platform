<template>
  <view class="page">
    <view class="body"><text class="icon">🔒</text><text class="title">403</text><text class="desc">无权访问此页面</text><text class="hint">请检查您的权限或联系管理员</text>
      <view class="btns"><view class="btn outline" @click="goBack">返回上页</view><view class="btn fill" @click="goHome">返回首页</view></view>
    </view>
  </view>
</template>
<script setup lang="ts">function goBack(){uni.navigateBack()};function goHome(){uni.reLaunch({url:'/pages/index/index'})}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh;display:flex;align-items:center;justify-content:center}.body{text-align:center;padding:48rpx}.icon{font-size:120rpx;display:block;margin-bottom:24rpx}.title{font-size:80rpx;font-weight:900;color:#C41E3A;display:block;margin-bottom:12rpx}.desc{font-size:32rpx;color:#2C2C2C;display:block;margin-bottom:8rpx}.hint{font-size:24rpx;color:#999;display:block;margin-bottom:48rpx}.btns{display:flex;gap:24rpx;justify-content:center}.btn{padding:24rpx 56rpx;border-radius:40rpx;font-size:26rpx}.btn.outline{border:1px solid #E8E0D5;color:#666;background:#fff}.btn.fill{background:#C41E3A;color:#fff}</style>
