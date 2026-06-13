<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">我的售后</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="c"><view v-for="a in list" :key="a.id" class="card">
      <view class="ch"><text class="cn">{{a.product}}</text><text class="cs" :class="'s-'+a.status">{{st(a.status)}}</text></view>
      <text class="ct">{{a.type}}·¥{{a.amount}}·{{a.time}}</text></view>
      <view v-if="list.length===0" class="e">暂无售后记录</view><view style="height:48rpx"/></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const list=ref([{id:1,product:'渊海子平精装版',type:'仅退款',amount:'98.00',time:'2024-01-18',status:'done'},{id:2,product:'专业罗盘',type:'退货退款',amount:'398.00',time:'2024-02-01',status:'pending'}]);function st(s:string){const m:any={pending:'处理中',done:'已完成',reject:'已驳回'};return m[s]};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.ch{display:flex;justify-content:space-between;margin-bottom:8rpx}.cn{font-size:26rpx;font-weight:500;color:#2C2C2C}.cs{font-size:20rpx;padding:4rpx 14rpx;border-radius:8rpx}.s-done{background:rgba(34,197,94,.1);color:#22c55e}.s-pending{background:rgba(249,115,22,.1);color:#f97316}.ct{font-size:22rpx;color:#999}.e{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
