<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">物流详情</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="info"><text class="ic-name">{{logistics.company}}</text><text class="ic-no">运单号：{{logistics.trackingNo}} <text class="ic-copy" @click="copy">📋</text></text></view>
      <view class="timeline">
        <view v-for="(t,i) in logistics.tracks" :key="i" class="tl-item" :class="{latest:i===0}">
          <view class="tl-icon" :class="{on:i===0}"><text>{{i===0?'●':'○'}}</text></view>
          <view class="tl-info"><text class="tli-desc">{{t.desc}}</text><text class="tli-time">{{t.time}}</text></view>
        </view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const logistics=ref({company:'顺丰速运',trackingNo:'SF123456789',tracks:[{desc:'已签收，签收人：本人',time:'2024-01-18 14:30'},{desc:'正在派送中，快递员：张师傅 138****',time:'2024-01-18 09:00'},{desc:'已到达【北京朝阳分拨中心】',time:'2024-01-17 22:00'},{desc:'已发出【上海浦东营业点】',time:'2024-01-16 15:00'},{desc:'快递员已揽收',time:'2024-01-16 10:00'}]});function copy(){uni.setClipboardData({data:logistics.value.trackingNo})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.info{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ic-name{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:8rpx}.ic-no{font-size:24rpx;color:#999}.ic-copy{color:#C41E3A}.timeline{padding:0 8rpx}.tl-item{display:flex;gap:16rpx;padding:8rpx 0}.tl-icon{font-size:24rpx;color:#ccc;line-height:1}.tl-icon.on{color:#C41E3A}.tli-desc{font-size:26rpx;color:#2C2C2C;display:block}.tli-time{font-size:20rpx;color:#999;margin-top:4rpx}
</style>
