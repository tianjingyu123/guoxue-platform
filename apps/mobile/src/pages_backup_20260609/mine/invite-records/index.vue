<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">邀请记录</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="summary"><view class="sm-item"><text class="smi-val">{{stats.total}}</text><text class="smi-label">总邀请</text></view><view class="sm-item"><text class="smi-val">{{stats.registered}}</text><text class="smi-label">已注册</text></view><view class="sm-item"><text class="smi-val">{{stats.reward}}</text><text class="smi-label">获得积分</text></view></view>
      <view class="card"><text class="ct">邀请列表</text>
        <view v-for="r in records" :key="r.id" class="rec-row"><text class="rr-avatar">{{r.name[0]}}</text><view><text class="rr-name">{{r.name}}</text><text class="rr-time">{{r.time}}</text></view><text class="rr-status" :class="r.status">{{statusLabel(r.status)}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const stats={total:25,registered:18,reward:500};const records=ref([{id:1,name:'张*',time:'2024-01-15',status:'registered'},{id:2,name:'李*',time:'2024-01-20',status:'pending'},{id:3,name:'王*',time:'2024-02-01',status:'registered'}]);function statusLabel(s:string){const m:any={registered:'已注册',pending:'待注册'};return m[s]};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.summary{display:flex;gap:16rpx;margin-bottom:24rpx}.sm-item{flex:1;background:#fff;border-radius:20rpx;padding:24rpx 0;text-align:center;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.smi-val{font-size:36rpx;font-weight:700;color:#C41E3A;display:block}.smi-label{font-size:22rpx;color:#999;margin-top:4rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.rec-row{display:flex;align-items:center;gap:16rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.rr-avatar{width:56rpx;height:56rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#999}.rr-name{font-size:26rpx;color:#2C2C2C;display:block}.rr-time{font-size:20rpx;color:#ccc}.rr-status{font-size:20rpx;padding:4rpx 14rpx;border-radius:8rpx;color:#22c55e;background:rgba(34,197,94,.1)}.rr-status.pending{color:#999;background:#F5F1EB}
</style>
