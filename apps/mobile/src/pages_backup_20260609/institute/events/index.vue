<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">学术活动</text><text class="nav-add" @click="goCreate">＋</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="e in events" :key="e.id" class="event-card">
        <view class="ec-cover">{{e.icon}}</view>
        <view class="ec-info"><text class="ec-title">{{e.title}}</text><text class="ec-meta">📅{{e.date}}·{{e.time}}</text><text class="ec-venue">📍{{e.venue}}</text></view>
        <view class="ec-status" :class="'st-'+e.status">{{statusLabel(e.status)}}</view>
      </view>
      <view v-if="events.length===0" class="empty"><text>暂无活动</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const events=ref([{id:1,title:'国学研讨会：八字命理的现代应用',date:'2024-02-15',time:'14:00-17:00',venue:'北京国学馆',status:'upcoming',icon:'📚'},{id:2,title:'易学沙龙：风水布局的新思路',date:'2024-02-20',time:'10:00-12:00',venue:'上海研究院',status:'upcoming',icon:'🏠'},{id:3,title:'紫微斗数讲座',date:'2024-01-10',time:'15:00-17:00',venue:'线上',status:'ended',icon:'📻'}]);function statusLabel(s:string){const m:any={upcoming:'即将开始',ongoing:'进行中',ended:'已结束'};return m[s]};function goCreate(){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-add{font-size:40rpx;color:#C41E3A}.content{padding:24rpx}.event-card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ec-cover{width:88rpx;height:88rpx;border-radius:16rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:44rpx;flex-shrink:0}.ec-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.ec-meta,.ec-venue{font-size:22rpx;color:#999;margin-top:4rpx;display:block}.ec-status{font-size:20rpx;padding:6rpx 16rpx;border-radius:12rpx;flex-shrink:0}.st-upcoming{background:rgba(59,130,246,.1);color:#3b82f6}.st-ongoing{background:rgba(34,197,94,.1);color:#22c55e}.st-ended{background:#F5F1EB;color:#999}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
