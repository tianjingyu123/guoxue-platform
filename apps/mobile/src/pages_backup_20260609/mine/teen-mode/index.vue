<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">青少年模式</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">模式设置</text>
        <view class="toggle-row"><text class="tr-label">启用青少年模式</text><switch :checked="enabled" @change="enabled=!enabled"/></view>
      </view>
      <view v-if="enabled" class="content-shown">
        <view class="card"><text class="ct">时长限制</text>
          <view class="field"><text class="fl">每日使用时长</text><picker :range="timeOptions" value="40"><text>40分钟</text></picker></view>
          <view class="field"><text class="fl">禁用时段</text><picker mode="time" value="22:00"><text>22:00 - 06:00</text></picker></view>
        </view>
        <view class="card"><text class="ct">密码设置</text>
          <view class="field"><text class="fl">监护密码</text><input class="fi" placeholder="设置4位数字密码" password maxlength="4"/></view>
        </view>
        <view class="btn" @click="handleSave">保存设置</view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const enabled=ref(false);const timeOptions=['30分钟','40分钟','60分钟','90分钟','120分钟'];function handleSave(){uni.showToast({title:'保存成功'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.toggle-row{display:flex;align-items:center;justify-content:space-between}.tr-label{font-size:26rpx;color:#2C2C2C}.field{margin-bottom:20rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:26rpx;box-sizing:border-box}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
