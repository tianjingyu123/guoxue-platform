<template>
  <view class="page">
    <view class="nav"><text class="n-back" @click="goBack">←</text><text class="n-title">同城动态</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="f in feeds" :key="f.id" class="card">
        <view class="ch"><text class="ch-av">{{f.user[0]}}</text><view><text class="ch-name">{{f.user}}</text><text class="ch-time">{{f.time}}·{{f.dist}}</text></view></view>
        <text class="cc">{{f.content}}</text>
        <view v-if="f.images" class="ci"><view v-for="i in f.images" :key="i" class="cit">🖼️</view></view>
        <view class="cf"><text>❤️{{f.likes}}</text><text>💬{{f.comments}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const feeds=ref([{id:1,user:'易学爱好者',content:'周末去北京国学馆参加了线下活动，收获满满！',images:['',''],likes:28,comments:8,time:'2小时前',dist:'1.2km'},{id:2,user:'风水新手',content:'请问附近有没有好的风水老师推荐？',likes:12,comments:15,time:'5小时前',dist:'3.5km'}]);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.n-back{font-size:36rpx;color:#2C2C2C}.n-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ch{display:flex;align-items:center;gap:12rpx;margin-bottom:12rpx}.ch-av{width:56rpx;height:56rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#999}.ch-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.ch-time{font-size:20rpx;color:#999}.cc{font-size:26rpx;color:#2C2C2C;line-height:1.5;margin-bottom:12rpx}.ci{display:flex;gap:8rpx;margin-bottom:12rpx}.cit{width:140rpx;height:140rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:40rpx}.cf{display:flex;gap:24rpx;font-size:22rpx;color:#999}
</style>
