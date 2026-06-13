<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">退款进度</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="amount-card"><text class="ac-label">退款金额</text><text class="ac-val">¥{{refund.amount}}</text><text class="ac-method">{{refund.method}}</text></view>
      <view class="timeline">
        <view v-for="(s,i) in refund.steps" :key="i" class="tl-item">
          <view class="tl-icon" :class="s.done?'done':s.active?'active':'pending'"><text>{{s.done?'✓':s.active?'●':'○'}}</text></view>
          <view class="tl-info"><text class="tli-desc">{{s.desc}}</text><text class="tli-time">{{s.time}}</text></view>
        </view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const refund=ref({amount:'98.00',method:'原路退回(微信支付)',steps:[{desc:'退款到账',time:'预计1-3个工作日',done:false,active:false},{desc:'平台审核通过',time:'2024-01-18 15:30',done:true,active:false},{desc:'商家处理中',time:'2024-01-18 14:00',done:true,active:false},{desc:'退款申请已提交',time:'2024-01-18 10:00',done:true,active:false}]});function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.amount-card{background:#fff;border-radius:20rpx;padding:32rpx;text-align:center;margin-bottom:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ac-label{font-size:24rpx;color:#999;display:block}.ac-val{font-size:64rpx;font-weight:900;color:#C41E3A;display:block;margin:8rpx 0}.ac-method{font-size:22rpx;color:#999}.timeline{padding:0 8rpx}.tl-item{display:flex;gap:16rpx;padding:16rpx 0}.tl-icon{font-size:24rpx;width:36rpx;text-align:center}.tl-icon.done{color:#22c55e}.tl-icon.active{color:#C41E3A}.tl-icon.pending{color:#ccc}.tli-desc{font-size:26rpx;color:#2C2C2C;display:block}.tli-time{font-size:20rpx;color:#999;margin-top:4rpx}
</style>
