<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">我的点赞</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="l in likes" :key="l.id" class="item">
        <text class="im-icon">{{l.type==='article'?'📄':l.type==='post'?'💬':'📚'}}</text>
        <view class="im-info"><text class="im-title">{{l.title}}</text><text class="im-meta">{{l.typeLabel}}·{{l.author}}·{{l.time}}</text></view>
      </view>
      <view v-if="likes.length===0" class="empty"><text class="em-icon">❤️</text><text>暂无点赞记录</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const likes=ref([{id:1,title:'八字命理入门：如何看懂你的命盘',type:'article',typeLabel:'文章',author:'周易大师',time:'3天前'},{id:2,title:'食神制杀格局详解',type:'post',typeLabel:'帖子',author:'张玄风',time:'5天前'},{id:3,title:'八字入门精讲·第一章',type:'course',typeLabel:'课程',author:'周易大师',time:'1周前'}]);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.item{display:flex;gap:16rpx;background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.im-icon{font-size:40rpx;flex-shrink:0}.im-title{font-size:26rpx;color:#2C2C2C;display:block}.im-meta{font-size:20rpx;color:#999;margin-top:6rpx}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}.em-icon{font-size:80rpx;opacity:.3;display:block;margin-bottom:16rpx}
</style>
