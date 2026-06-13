<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">我的评论</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="c in comments" :key="c.id" class="cmt-card">
        <text class="cc-content">{{c.content}}</text>
        <view class="cc-meta"><text class="cc-target">回复：{{c.target}}</text><text class="cc-time">{{c.time}}</text></view>
      </view>
      <view v-if="comments.length===0" class="empty"><text>暂无评论</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const comments=ref([{id:1,content:'讲得非常清晰，终于理解了八字排盘的原理！',target:'八字命理入门：如何看懂你的命盘',time:'3天前'},{id:2,content:'老师的案例分析特别实用',target:'食神制杀格局详解',time:'1周前'},{id:3,content:'请问日柱怎么推算？有详细教程吗？',target:'八字入门精讲·第一章',time:'2周前'}]);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.cmt-card{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.cc-content{font-size:26rpx;color:#2C2C2C;line-height:1.5;display:block;margin-bottom:12rpx}.cc-target{font-size:22rpx;color:#C41E3A}.cc-time{font-size:20rpx;color:#ccc;margin-left:auto}.cc-meta{display:flex;justify-content:space-between}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
