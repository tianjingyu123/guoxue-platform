<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">黑名单</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="u in blacklist" :key="u.id" class="user-row">
        <text class="ur-avatar">{{u.name[0]}}</text><view class="ur-info"><text class="ur-name">{{u.name}}</text><text class="ur-time">{{u.date}} 加入</text></view>
        <view class="ur-btn" @click="remove(u.id)">移出</view>
      </view>
      <view v-if="blacklist.length===0" class="empty"><text>暂无黑名单</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const blacklist=ref([{id:1,name:'广告用户A',date:'2024-01-15'},{id:2,name:'骚扰用户B',date:'2024-02-20'}]);function remove(id:number){blacklist.value=blacklist.value.filter(u=>u.id!==id)};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.user-row{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ur-avatar{width:80rpx;height:80rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:30rpx;color:#2C2C2C}.ur-name{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.ur-time{font-size:22rpx;color:#999;margin-top:4rpx}.ur-btn{padding:14rpx 32rpx;background:#F5F1EB;border-radius:40rpx;font-size:24rpx;color:#999}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
