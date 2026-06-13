<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">分站配置</text><view style="width:48rpx"/></view>
    <view class="c"><view class="card"><text class="ct">基本信息</text><view class="f"><text class="fl">分站名称</text><input class="fi" placeholder="请输入分站名称"/></view><view class="f"><text class="fl">分站简介</text><textarea class="fi ta" placeholder="请输入简介"/></view></view>
    <view class="card"><text class="ct">联系方式</text><view class="f"><text class="fl">联系电话</text><input class="fi" placeholder="请输入联系电话"/></view></view>
    <view class="btn" @click="save">保存</view></view></view>
</template>
<script setup lang="ts">function save(){uni.showToast({title:'保存成功'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.f{margin-bottom:20rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;box-sizing:border-box}.fi.ta{height:120rpx;padding:20rpx;resize:none}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
