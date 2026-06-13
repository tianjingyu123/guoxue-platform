<template>
  <view class="page"><view class="vid"><view class="vm">📹</view></view>
    <view class="info"><text class="in">{{v.title}}</text><view class="im"><text>{{v.author}}</text><text>👁️{{v.views}}</text></view></view>
    <view class="act"><text @click="like">❤️{{v.likes}}</text><text>💬</text><text>📤</text></view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const v=ref({title:'一分钟看懂八字排盘',author:'周易大师',views:'12,800',likes:2560});function like(){v.value.likes++}</script>
<style scoped>.page{background:#000;min-height:100vh;display:flex;flex-direction:column}.vid{aspect-ratio:9/16;max-height:70vh;display:flex;align-items:center;justify-content:center;background:#1a1a2e}.vm{font-size:80rpx;color:rgba(255,255,255,.3)}.info{padding:24rpx;background:#000}.in{font-size:28rpx;font-weight:500;color:#fff;display:block}.im{display:flex;gap:16rpx;margin-top:8rpx;font-size:22rpx;color:rgba(255,255,255,.6)}.act{display:flex;gap:32rpx;padding:16rpx 24rpx;font-size:28rpx;color:#fff}
</style>
