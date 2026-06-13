<template>
  <view class="page">
    <view class="cover"><view class="cover-img"/><text class="c-back" @click="goBack">←</text><text class="c-status">预告中</text></view>
    <scroll-view scroll-y class="content">
      <view class="info-card">
        <text class="ic-title">{{live.title}}</text>
        <view class="ic-host"><text class="ich-avatar">{{live.host[0]}}</text><text>{{live.host}}</text></view>
        <view class="ic-time"><text>🕐{{live.scheduledTime}}</text><text>⏱预计{{live.duration}}分钟</text></view>
        <view class="ic-countdown"><text class="icd-num">{{countdown}}</text><text class="icd-label">距开播</text></view>
      </view>
      <view class="card"><text class="ct">直播简介</text><text class="desc">{{live.description}}</text></view>
      <view class="card"><text class="ct">相关推荐</text>
        <view v-for="r in recommends" :key="r.id" class="rec">{{r.icon}} {{r.title}}</view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
    <view class="bb">
      <view class="bb-info"><text>已有{{live.booked}}人预约</text></view>
      <view class="bb-btn" :class="{booked:isBooked}" @click="toggleBook">{{isBooked?'✓ 已预约':'📅 立即预约'}}</view>
    </view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const isBooked=ref(false);const countdown=ref('02:30:45');const live={title:'八字命理入门：如何快速解读四柱八字',host:'周易大师',scheduledTime:'2024-02-15 20:00',duration:90,description:'本次直播将系统讲解八字命理的基础知识，包括天干地支的基础概念、四柱的关系解读、以及如何快速上手分析自己的命盘。',booked:1258};const recommends=[{id:1,title:'八字命理入门精讲',icon:'📚'},{id:2,title:'紫微斗数基础课',icon:'⭐'}];function toggleBook(){isBooked.value=!isBooked.value};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.cover{position:relative;height:320rpx}.cover-img{width:100%;height:100%;background:linear-gradient(135deg,rgba(196,30,58,.2),rgba(201,169,110,.15))}.c-back{position:absolute;top:20rpx;left:24rpx;width:64rpx;height:64rpx;border-radius:50%;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28rpx}.c-status{position:absolute;top:24rpx;right:24rpx;background:rgba(59,130,246,.8);color:#fff;padding:8rpx 20rpx;border-radius:40rpx;font-size:22rpx}.content{padding:24rpx}.info-card{margin-top:-60rpx;background:#fff;border-radius:24rpx;padding:28rpx;box-shadow:0 4rpx 24rpx rgba(0,0,0,.08);position:relative;z-index:10;margin-bottom:20rpx}.ic-title{font-size:34rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:12rpx}.ic-host{display:flex;align-items:center;gap:8rpx;font-size:24rpx;color:#999;margin-bottom:16rpx}.ich-avatar{width:48rpx;height:48rpx;border-radius:50%;background:rgba(196,30,58,.1);display:flex;align-items:center;justify-content:center;font-size:20rpx;color:#C41E3A}.ic-time{display:flex;gap:24rpx;font-size:24rpx;color:#999;margin-bottom:24rpx}.ic-countdown{text-align:center;padding:32rpx 0;background:#FAF8F5;border-radius:16rpx}.icd-num{font-size:56rpx;font-weight:700;color:#C41E3A;display:block}.icd-label{font-size:24rpx;color:#999;margin-top:4rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}.desc{font-size:26rpx;color:#666;line-height:1.6}.rec{padding:12rpx 0;font-size:26rpx;color:#666;border-bottom:1px solid #F5F1EB}.bb{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;gap:24rpx;padding:20rpx 24rpx;background:#fff;border-top:1px solid #E8E0D5;z-index:50}.bb-info{font-size:24rpx;color:#999}.bb-btn{padding:24rpx 48rpx;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:28rpx;font-weight:600}.bb-btn.booked{background:#F5F1EB;color:#999}
</style>
