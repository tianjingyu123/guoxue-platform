<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">我的圈子</text><text class="nav-search" @click="goSearch">🔍</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="c in circles" :key="c.id" class="circle-card" @click="goCircle(c.id)">
        <text class="cc-avatar">{{c.name[0]}}</text>
        <view class="cc-info"><text class="cci-name">{{c.name}}</text><text class="cci-meta">{{c.members}}成员·{{c.posts}}帖子</text>
          <view class="cci-tags"><text v-for="t in c.tags" :key="t" class="ccit">{{t}}</text></view>
        </view>
        <text class="cc-arrow">›</text>
      </view>
      <view v-if="circles.length===0" class="empty"><text class="em-icon">👥</text><text>暂无圈子</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const circles=ref([{id:1,name:'八字命理研习社',members:1280,posts:3560,tags:['八字','命理']},{id:2,name:'紫微斗数交流群',members:860,posts:1860,tags:['紫微']},{id:3,name:'风水布局研究会',members:450,posts:980,tags:['风水']}]);function goCircle(id:number){uni.navigateTo({url:'/pages/circle/id-detail/home/index'})};function goSearch(){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-search{font-size:32rpx}.content{padding:24rpx}.circle-card{display:flex;align-items:center;gap:20rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.cc-avatar{width:88rpx;height:88rpx;border-radius:24rpx;background:rgba(196,30,58,.1);display:flex;align-items:center;justify-content:center;font-size:36rpx;color:#C41E3A;flex-shrink:0}.cci-name{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.cci-meta{font-size:22rpx;color:#999;margin-top:4rpx}.cci-tags{display:flex;gap:8rpx;margin-top:8rpx}.ccit{font-size:20rpx;padding:4rpx 12rpx;background:#F5F1EB;border-radius:8rpx;color:#999}.cc-arrow{font-size:32rpx;color:#ccc}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}.em-icon{font-size:80rpx;opacity:.3;display:block;margin-bottom:16rpx}
</style>
