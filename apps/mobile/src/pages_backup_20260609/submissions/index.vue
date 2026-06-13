<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">我的投稿</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="c"><view v-for="s in subs" :key="s.id" class="card">
      <text class="cn">{{s.title}}</text><view class="cm"><text class="cs" :class="'s-'+s.status">{{st(s.status)}}</text><text class="ct">{{s.time}}</text></view></view><view style="height:48rpx"/></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const subs=ref([{id:1,title:'八字命理入门指南',status:'pending',time:'2024-02-15'},{id:2,title:'风水心得分享',status:'approved',time:'2024-01-20'}]);function st(s:string){const m:any={pending:'审核中',approved:'已通过',rejected:'未通过'};return m[s]};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.cn{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block;margin-bottom:12rpx}.cm{display:flex;justify-content:space-between}.cs{font-size:20rpx;padding:4rpx 14rpx;border-radius:8rpx}.s-pending{background:rgba(249,115,22,.1);color:#f97316}.s-approved{background:rgba(34,197,94,.1);color:#22c55e}.s-rejected{background:rgba(239,68,68,.1);color:#ef4444}.ct{font-size:22rpx;color:#999}
</style>
