<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">通知详情</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="header"><text class="h-title">{{notice.title}}</text><view class="h-meta"><text>{{notice.source}}</text><text>{{notice.time}}</text></view></view>
      <view class="card"><text class="body">{{notice.content}}</text></view>
      <view v-if="notice.action" class="card" @click="goAction"><text class="action-link">{{notice.action.label}} ›</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const notice=ref({title:'课程更新通知',source:'系统消息',time:'2024-02-15 14:30',content:'您购买的课程《八字命理入门精讲》第12章已更新。讲师张明远老师为您准备了关于食神制杀格局的详细讲解，请及时前往学习。',action:{label:'立即查看',url:''}});function goAction(){uni.navigateTo({url:'/pages/courses/id-detail/learn/index'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.header{margin-bottom:24rpx}.h-title{font-size:34rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:12rpx}.h-meta{display:flex;gap:24rpx;font-size:22rpx;color:#999}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.body{font-size:26rpx;color:#333;line-height:1.8}.action-link{font-size:28rpx;color:#C41E3A;font-weight:500}
</style>
