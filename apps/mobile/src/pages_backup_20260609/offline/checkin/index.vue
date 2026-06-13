<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">线下签到</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="event-card"><text class="ec-title">{{event.name}}</text><text class="ec-info">📅{{event.date}}·📍{{event.location}}</text></view>
      <view class="card"><text class="ct">扫码签到</text><view class="qr-area"><text class="qr-icon">📱</text><text class="qr-hint">请出示二维码给工作人员扫描</text></view></view>
      <view class="card"><text class="ct">手动签到</text><view class="field"><text class="fl">签到码</text><input class="fi" placeholder="请输入签到码"/></view><view class="btn" @click="handleCheckin">签到</view></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const event=ref({name:'春季国学研讨会',date:'2024-03-15 14:00',location:'北京国学馆'});function handleCheckin(){uni.showToast({title:'签到成功',icon:'success'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.event-card{background:#fff;border-radius:20rpx;padding:28rpx;margin-bottom:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ec-title{font-size:30rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:8rpx}.ec-info{font-size:24rpx;color:#999}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.qr-area{text-align:center;padding:40rpx 0}.qr-icon{font-size:96rpx;display:block;margin-bottom:16rpx}.qr-hint{font-size:24rpx;color:#999}.field{margin-bottom:20rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
