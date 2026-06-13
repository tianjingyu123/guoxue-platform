<template>
  <view class="page">
    <view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">语音搜索</text><view style="width:48rpx"/></view>
    <view class="body"><view class="wave" :class="{on:listening}"><text class="wi">🎤</text></view><text class="hint">{{listening?'正在聆听...':'点击话筒开始'}}</text><text v-if="result" class="res">{{result}}</text><view class="btn" @click="start">{{listening?'聆听中...':'开始语音'}}</view></view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const listening=ref(false),result=ref('');function start(){listening.value=true;setTimeout(()=>{listening.value=false;result.value='"八字命理"';},3000)};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.body{display:flex;flex-direction:column;align-items:center;padding:120rpx 48rpx}.wave{margin-bottom:40rpx}.wi{font-size:120rpx}.wave.on{animation:pulse 1.5s ease-in-out infinite}@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:.7}}.hint{font-size:26rpx;color:#999;margin-bottom:32rpx}.res{font-size:32rpx;color:#C41E3A;font-weight:500;margin-bottom:48rpx}.btn{padding:28rpx 80rpx;background:#C41E3A;color:#fff;border-radius:40rpx;font-size:28rpx}
</style>
