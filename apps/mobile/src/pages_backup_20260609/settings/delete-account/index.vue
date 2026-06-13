<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">账号注销</text><view style="width:48rpx"/></view>
    <view class="warn"><text class="wi">⚠️</text><text class="wt">注销须知</text><text v-for="n in notices" :key="n" class="wn">• {{n}}</text></view>
    <view class="btn danger" @click="doit">确认注销</view></view>
</template>
<script setup lang="ts">const notices=['账号注销后将永久删除无法恢复','所有个人信息、学习记录将被清除','已购课程权益将失效'];function doit(){uni.showToast({title:'申请已提交'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.warn{background:#FFF7E6;border:1px solid #FFD591;border-radius:20rpx;padding:28rpx;margin:24rpx}.wi{font-size:48rpx;display:block;margin-bottom:8rpx}.wt{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:16rpx}.wn{font-size:24rpx;color:#8B6914;padding:6rpx 0;display:block}.btn{padding:28rpx;margin:0 24rpx;text-align:center;border-radius:24rpx;font-size:28rpx;font-weight:600;color:#fff}.btn.danger{background:#ef4444}
</style>
