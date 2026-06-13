<template>
  <view class="page">
    <view class="splash">
      <text class="logo">🏮</text>
      <text class="name">热卜国学</text>
      <text class="slogan">探寻东方智慧</text>
      <view class="loading-bar"><view class="lb-fill"/></view>
      <text class="version">v2.1.0</text>
    </view>
  </view>
</template>
<script setup lang="ts">import {onMounted} from 'vue';onMounted(()=>{setTimeout(()=>{},3000)})</script>
<style scoped>.page{position:fixed;inset:0;z-index:999}.splash{width:100%;height:100%;background:linear-gradient(180deg,#C41E3A,#8B0000);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16rpx}.logo{font-size:120rpx;animation:pulse 2s ease-in-out infinite}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}.name{font-size:56rpx;font-weight:700;color:#fff}.slogan{font-size:28rpx;color:rgba(255,255,255,.7)}.loading-bar{width:300rpx;height:6rpx;background:rgba(255,255,255,.3);border-radius:3rpx;overflow:hidden;margin-top:80rpx}.lb-fill{width:60%;height:100%;background:#fff;border-radius:3rpx;animation:ld 2s ease-in-out infinite}@keyframes ld{0%{width:0}50%{width:80%}100%{width:0}}.version{position:absolute;bottom:60rpx;font-size:22rpx;color:rgba(255,255,255,.5)}</style>
