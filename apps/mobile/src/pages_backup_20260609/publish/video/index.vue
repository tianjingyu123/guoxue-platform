<template>
  <view class="page"><view class="nav"><text class="n-back" @click="goBack">←</text><text class="n-title">发布视频</text><text class="n-save" @click="pub">发布</text></view>
    <view class="up" @click="upload"><text class="up-icon">📹</text><text class="up-hint">点击选择或拍摄视频</text></view>
    <view class="card"><view class="f"><text class="fl">标题</text><input class="fi" placeholder="请输入视频标题"/></view><view class="f"><text class="fl">描述</text><textarea class="fi ta" placeholder="添加描述..."/></view><view class="f"><text class="fl">话题</text><input class="fi" placeholder="添加话题标签"/></view></view>
  </view>
</template>
<script setup lang="ts">function upload(){};function pub(){uni.showToast({title:'发布成功'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.n-back{font-size:36rpx;color:#2C2C2C}.n-title{font-size:32rpx;font-weight:600}.n-save{color:#C41E3A;font-size:26rpx}.up{width:100%;height:320rpx;border:2rpx dashed #E8E0D5;border-radius:20rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12rpx;margin-bottom:28rpx;background:#fff}.up-icon{font-size:72rpx}.up-hint{font-size:24rpx;color:#999}.card{background:#fff;border-radius:20rpx;padding:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.f{margin-bottom:20rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.fi.ta{height:120rpx;padding:20rpx;resize:none}
</style>
