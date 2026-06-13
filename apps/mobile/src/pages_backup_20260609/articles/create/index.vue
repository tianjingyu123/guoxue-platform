<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">写文章</text><text class="ns" @click="pub">发布</text></view>
    <view class="c"><view class="f"><text class="fl">标题</text><input class="fi" placeholder="请输入文章标题"/></view><view class="f"><text class="fl">内容</text><textarea class="fi ta" placeholder="请输入文章内容"/></view><view class="f"><text class="fl">封面</text><view class="up">🖼️ 上传封面图</view></view></view></view>
</template>
<script setup lang="ts">function pub(){uni.showToast({title:'发布成功'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.ns{color:#C41E3A;font-size:26rpx}.c{padding:24rpx}.f{margin-bottom:24rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#fff;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.fi.ta{height:360rpx;padding:20rpx;resize:none}.up{height:200rpx;border:2rpx dashed #E8E0D5;border-radius:16rpx;display:flex;align-items:center;justify-content:center;font-size:28rpx;color:#999;background:#fff}
</style>
