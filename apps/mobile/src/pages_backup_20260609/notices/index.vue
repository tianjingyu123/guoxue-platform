<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">通知中心</text><text class="nav-mark" @click="markAll">已读</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="n in notices" :key="n.id" class="notice-card" :class="{unread:!n.read}" @click="goDetail(n.id)">
        <text class="nc-icon">{{n.icon}}</text><view class="nc-info"><text class="nci-title">{{n.title}}</text><text class="nci-content">{{n.content}}</text><text class="nci-time">{{n.time}}</text></view>
        <view v-if="!n.read" class="nc-dot"/>
      </view>
      <view v-if="notices.length===0" class="empty"><text class="em-icon">🔔</text><text>暂无通知</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const notices=ref([{id:1,title:'课程更新通知',content:'《八字命理入门精讲》第12章已更新',time:'刚刚',icon:'📚',read:false},{id:2,title:'圈子动态',content:'周易大师发布了新帖子',time:'2小时前',icon:'👥',read:false},{id:3,title:'系统通知',content:'您的会员即将到期',time:'昨天',icon:'🔔',read:true}]);function goDetail(id:number){notices.value=notices.value.map(n=>n.id===id?{...n,read:true}:n);uni.navigateTo({url:'/pages/notice/id-detail/index'})};function markAll(){notices.value=notices.value.map(n=>({...n,read:true}))};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-mark{font-size:24rpx;color:#C41E3A}.content{padding:24rpx}.notice-card{display:flex;gap:16rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:12rpx;position:relative;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.notice-card.unread{background:#FFF9F0}.nc-icon{font-size:40rpx;flex-shrink:0}.nci-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.nci-content{font-size:24rpx;color:#999;margin-top:4rpx}.nci-time{font-size:20rpx;color:#ccc;margin-top:8rpx}.nc-dot{width:16rpx;height:16rpx;border-radius:50%;background:#C41E3A;position:absolute;top:24rpx;right:24rpx}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}.em-icon{font-size:80rpx;opacity:.3;display:block;margin-bottom:16rpx}
</style>
