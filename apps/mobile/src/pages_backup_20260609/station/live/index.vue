<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">分站直播</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="c"><view v-for="l in lives" :key="l.id" class="card"><view class="cc">📻</view>
      <view class="ci"><text class="cn">{{l.title}}</text><text class="cm">{{l.host}}·{{l.time}}</text><text class="ct">{{l.status}}</text></view></view><view style="height:48rpx"/></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const lives=ref([{id:1,title:'八字命理教学直播',host:'周易大师',time:'今天20:00',status:'预告'},{id:2,title:'风水实战分享',host:'陈风水',time:'明天19:30',status:'预告'}]);function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:16rpx;padding:20rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.cc{width:100rpx;height:64rpx;border-radius:8rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:36rpx;flex-shrink:0}.cn{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cm{font-size:22rpx;color:#999}.ct{font-size:22rpx;color:#3b82f6}
</style>
