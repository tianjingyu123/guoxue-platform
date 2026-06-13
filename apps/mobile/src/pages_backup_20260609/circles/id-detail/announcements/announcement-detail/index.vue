<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">公告详情</text><view style="width:48rpx"/></view>
    <view class="c"><view class="card"><text class="ct">{{ann.title}}</text>
      <view class="cm"><text>{{ann.author}}</text><text>{{ann.time}}</text></view>
      <text class="cb">{{ann.content}}</text></view></view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const ann=ref({title:'欢迎加入八字命理研习社',content:'欢迎各位新成员！请先阅读圈规。',author:'周易大师',time:'3天前'});function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:28rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:34rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:12rpx}.cm{display:flex;gap:16rpx;font-size:22rpx;color:#999;margin-bottom:24rpx}.cb{font-size:26rpx;color:#333;line-height:1.8}
</style>
