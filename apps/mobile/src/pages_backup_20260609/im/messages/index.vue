<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">系统消息</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="m in messages" :key="m.id" class="msg-card">
        <text class="mc-icon">{{m.icon}}</text><view class="mc-info"><text class="mc-title">{{m.title}}</text><text class="mc-content">{{m.content}}</text><text class="mc-time">{{m.time}}</text></view>
        <view v-if="!m.read" class="mc-dot"/>
      </view>
      <view v-if="messages.length===0" class="empty"><text class="em-icon">🔔</text><text>暂无消息</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const messages=ref([{id:1,title:'课程更新通知',content:'《八字入门精讲》第12章已更新',time:'刚刚',icon:'📚',read:false},{id:2,title:'圈子动态',content:'周易大师发布了新帖子',time:'2小时前',icon:'👥',read:false},{id:3,title:'系统通知',content:'您的会员即将到期，请及时续费',time:'昨天',icon:'🔔',read:true},{id:4,title:'互动提醒',content:'您的帖子收到32个新赞',time:'3天前',icon:'❤️',read:true}]);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.msg-card{display:flex;gap:16rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:12rpx;position:relative;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.mc-icon{font-size:40rpx;flex-shrink:0}.mc-info{flex:1}.mc-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.mc-content{font-size:24rpx;color:#999;margin-top:6rpx}.mc-time{font-size:20rpx;color:#ccc;margin-top:8rpx}.mc-dot{width:16rpx;height:16rpx;border-radius:50%;background:#C41E3A;position:absolute;top:24rpx;right:24rpx}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}.em-icon{font-size:80rpx;opacity:.3;display:block;margin-bottom:16rpx}
</style>
