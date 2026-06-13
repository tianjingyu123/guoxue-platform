<template>
  <view class="page">
    <view class="nav"><text class="n-back" @click="goBack">←</text><text class="n-title">举报记录</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="r in reports" :key="r.id" class="card">
        <view class="ch"><text class="ch-type">{{r.type}}</text><text class="ch-status" :class="'st-'+r.status">{{st(r.status)}}</text></view>
        <text class="ctarget">{{r.target}}</text><text class="ctime">{{r.time}}</text>
        <text v-if="r.reply" class="creply">{{r.reply}}</text>
      </view>
      <view v-if="reports.length===0" class="empty"><text>暂无举报记录</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const reports=ref([{id:1,type:'垃圾广告',target:'某用户的帖子',time:'2024-01-15',status:'done',reply:'已处理，内容已删除'},{id:2,type:'骚扰信息',target:'某用户的评论',time:'2024-02-01',status:'pending'}]);function st(s:string){const m:any={pending:'处理中',done:'已处理'};return m[s]};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.n-back{font-size:36rpx;color:#2C2C2C}.n-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.ch{display:flex;justify-content:space-between;margin-bottom:8rpx}.ch-type{font-size:26rpx;font-weight:500;color:#2C2C2C}.ch-status{font-size:20rpx;padding:4rpx 14rpx;border-radius:8rpx}.st-pending{background:rgba(249,115,22,.1);color:#f97316}.st-done{background:rgba(34,197,94,.1);color:#22c55e}.ctarget{font-size:24rpx;color:#999}.ctime{font-size:20rpx;color:#ccc;margin-top:4rpx}.creply{font-size:24rpx;color:#22c55e;margin-top:8rpx;display:block}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
