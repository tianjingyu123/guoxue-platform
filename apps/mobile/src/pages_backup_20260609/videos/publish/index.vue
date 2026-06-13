<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">发布视频</text><text class="ns" @click="pub">发布</text></view>
    <view class="up"><text class="ui">📹</text><text class="uh">点击选择视频</text></view>
    <view class="c"><view class="f"><text class="fl">标题</text><input class="fi" placeholder="请输入视频标题"/></view><view class="f"><text class="fl">描述</text><textarea class="fi ta" placeholder="添加描述"/></view></view></view>
</template>
<script setup lang="ts">function pub(){uni.showToast({title:'发布成功'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.ns{color:#C41E3A;font-size:26rpx}.up{height:400rpx;border:2rpx dashed #E8E0D5;border-radius:20rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12rpx;margin:24rpx;background:#fff}.ui{font-size:80rpx}.uh{font-size:24rpx;color:#999}.c{padding:0 24rpx}.f{margin-bottom:24rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#fff;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.fi.ta{height:120rpx;padding:20rpx;resize:none}
</style>
