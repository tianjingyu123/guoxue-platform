<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">收到的评论</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="c in comments" :key="c.id" class="cmt-card">
        <text class="cc-avatar">{{c.user[0]}}</text>
        <view class="cc-info"><text class="cc-user">{{c.user}}</text><text class="cc-content">{{c.content}}</text><text class="cc-target">评论自：{{c.target}}</text></view>
        <text class="cc-time">{{c.time}}</text>
      </view>
      <view v-if="comments.length===0" class="empty"><text>暂无评论</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const comments=ref([{id:1,user:'命理爱好者',content:'老师讲得非常清晰，已收藏！',target:'八字命理入门',time:'2小时前'},{id:2,user:'风水新手',content:'请问有没有配套的练习资料？',target:'风水布局入门',time:'昨天'}]);
function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.cmt-card{display:flex;gap:16rpx;background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.cc-avatar{width:56rpx;height:56rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#999;flex-shrink:0}.cc-user{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cc-content{font-size:24rpx;color:#666;margin:6rpx 0}.cc-target{font-size:20rpx;color:#C41E3A}.cc-time{font-size:20rpx;color:#ccc;flex-shrink:0}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
