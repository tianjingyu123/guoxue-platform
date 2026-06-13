<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">非遗传承人认证</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">基本信息</text>
        <view class="field"><text class="fl">姓名</text><input class="fi" placeholder="请输入真实姓名"/></view>
        <view class="field"><text class="fl">传承项目</text><input class="fi" placeholder="请输入非遗项目名称"/></view>
        <view class="field"><text class="fl">传承谱系</text><textarea class="fi ta" placeholder="请描述传承谱系..." :rows="3"/></view>
      </view>
      <view class="card"><text class="ct">资质材料</text>
        <view class="upload"><text class="up-icon">📄</text><text class="up-hint">上传非遗传承人证书</text></view>
        <view class="upload"><text class="up-icon">🪪</text><text class="up-hint">上传身份证明</text></view>
      </view>
      <view class="notice"><text>📋 认证须知：审核需要7-15个工作日，审核结果将通过消息通知</text></view>
      <view class="btn" @click="handleSubmit">提交认证</view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';function handleSubmit(){uni.showToast({title:'提交成功，等待审核',icon:'success'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.field{margin-bottom:20rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;box-sizing:border-box}.fi.ta{height:120rpx;padding:20rpx;resize:none}.upload{width:100%;height:160rpx;border:2rpx dashed #E8E0D5;border-radius:16rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8rpx;margin-bottom:16rpx}.up-icon{font-size:48rpx}.up-hint{font-size:22rpx;color:#999}.notice{padding:20rpx;background:#FFF8E6;border-radius:16rpx;font-size:24rpx;color:#8B6914;margin-bottom:32rpx}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
