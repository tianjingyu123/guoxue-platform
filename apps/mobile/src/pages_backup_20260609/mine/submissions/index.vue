<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">我的投稿</text><view style="width:48rpx"/></view>
    <view class="tab-row"><text v-for="t in tabs" :key="t.key" class="tab" :class="{act:tab===t.key}" @click="tab=t.key">{{t.label}}</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="s in submissions" :key="s.id" class="sub-card">
        <text class="sc-title">{{s.title}}</text>
        <view class="sc-meta"><text class="sc-status" :class="'st-'+s.status">{{statusLabel(s.status)}}</text><text class="sc-time">{{s.time}}</text></view>
        <text v-if="s.reason" class="sc-reason">原因：{{s.reason}}</text>
      </view>
      <view v-if="submissions.length===0" class="empty"><text>暂无投稿</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const tab=ref('all');const tabs=[{key:'all',label:'全部'},{key:'pending',label:'审核中'},{key:'approved',label:'已通过'},{key:'rejected',label:'未通过'}];const allSubs=[{id:1,title:'八字命理入门指南',status:'pending',time:'2024-02-15'},{id:2,title:'风水布局的心得分享',status:'approved',time:'2024-01-20'},{id:3,title:'浅谈紫微斗数',status:'rejected',time:'2024-01-10',reason:'内容重复'}];const submissions=computed(()=>tab.value==='all'?allSubs:allSubs.filter(s=>s.status===tab.value));function statusLabel(s:string){const m:any={pending:'审核中',approved:'已通过',rejected:'未通过'};return m[s]};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.tab-row{display:flex;gap:24rpx;padding:16rpx 24rpx}.tab{font-size:24rpx;color:#999;position:relative}.tab.act{color:#C41E3A;font-weight:500}.tab.act::after{content:'';position:absolute;bottom:-16rpx;left:0;right:0;height:4rpx;background:#C41E3A;border-radius:2rpx}.content{padding:24rpx}.sub-card{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.sc-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block;margin-bottom:12rpx}.sc-meta{display:flex;justify-content:space-between;align-items:center}.sc-status{font-size:20rpx;padding:4rpx 14rpx;border-radius:8rpx}.st-pending{background:rgba(249,115,22,.1);color:#f97316}.st-approved{background:rgba(34,197,94,.1);color:#22c55e}.st-rejected{background:rgba(239,68,68,.1);color:#ef4444}.sc-time{font-size:22rpx;color:#999}.sc-reason{font-size:22rpx;color:#ef4444;margin-top:8rpx;display:block}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
