<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">结算记录</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="summary"><view class="sm"><text class="sm-val">¥{{stats.total.toLocaleString()}}</text><text class="sm-label">累计结算</text></view><view class="sm"><text class="sm-val">¥{{stats.pending.toLocaleString()}}</text><text class="sm-label">待结算</text></view></view>
      <view v-for="s in settlements" :key="s.id" class="settle-card"><text class="sc-date">{{s.month}}</text><view class="sc-info"><text class="sci-label">课程收入：¥{{s.course.toLocaleString()}}</text><text class="sci-label">商品收入：¥{{s.product.toLocaleString()}}</text></view><text class="sc-total">¥{{s.total.toLocaleString()}}</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const stats={total:86800,pending:12580};const settlements=ref([{id:1,month:'2024年2月',course:8600,product:2800,total:11400},{id:2,month:'2024年1月',course:12800,product:4200,total:17000}]);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.summary{display:flex;gap:16rpx;margin-bottom:24rpx}.sm{flex:1;background:#fff;border-radius:20rpx;padding:28rpx;text-align:center;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.sm-val{font-size:36rpx;font-weight:700;color:#C41E3A;display:block}.sm-label{font-size:22rpx;color:#999;margin-top:4rpx}.settle-card{display:flex;align-items:center;gap:20rpx;background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.sc-date{font-size:26rpx;font-weight:500;color:#2C2C2C}.sc-info{flex:1}.sci-label{font-size:22rpx;color:#999;display:block}.sc-total{font-size:28rpx;font-weight:600;color:#C41E3A}
</style>
