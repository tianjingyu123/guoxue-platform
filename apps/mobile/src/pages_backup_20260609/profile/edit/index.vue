<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">编辑资料</text><text class="nav-save" @click="save">保存</text></view>
    <view class="av" @click="changeAv"><text class="av-icon">👤</text><text class="av-hint">更换头像</text></view>
    <view class="card"><view class="f"><text class="fl">昵称</text><input class="fi" placeholder="请输入昵称"/></view><view class="f"><text class="fl">简介</text><textarea class="fi ta" placeholder="介绍一下自己"/></view></view>
  </view>
</template>
<script setup lang="ts">function changeAv(){};function save(){uni.showToast({title:'保存成功'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-save{color:#C41E3A;font-size:26rpx}.av{text-align:center;padding:40rpx 0}.av-icon{width:140rpx;height:140rpx;border-radius:50%;background:rgba(196,30,58,.1);display:flex;align-items:center;justify-content:center;font-size:56rpx;color:#C41E3A;margin:0 auto 16rpx}.av-hint{font-size:24rpx;color:#C41E3A}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin:0 24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.f{margin-bottom:20rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.fi.ta{height:120rpx;padding:20rpx;resize:none}
</style>
