<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">发票管理</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">申请发票</text>
        <view class="field"><text class="fl">发票类型</text><picker range="电子普通发票,纸质发票"><text>电子普通发票</text></picker></view>
        <view class="field"><text class="fl">发票抬头</text><input class="fi" placeholder="请输入发票抬头"/></view>
        <view class="field"><text class="fl">税号</text><input class="fi" placeholder="请输入统一社会信用代码"/></view>
        <view class="field"><text class="fl">接收邮箱</text><input class="fi" placeholder="接收电子发票的邮箱"/></view>
      </view>
      <view class="btn" @click="handleSubmit">提交申请</view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {onPullDownRefresh} from '@dcloudio/uni-app';function handleSubmit(){uni.showToast({title:'提交成功'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.field{margin-bottom:20rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;box-sizing:border-box}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
