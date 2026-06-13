<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">售后详情</text><view style="width:48rpx"/></view>
    <view class="c"><view class="tl"><view v-for="(s,i) in steps" :key="i" class="tli"><view class="tic" :class="{d:s.done,a:s.active}"><text>{{s.done?'✓':s.active?'●':'○'}}</text></view><view><text class="tid">{{s.desc}}</text><text class="tit">{{s.time}}</text></view></view></view></view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const steps=ref([{desc:'退款到账',time:'预计1-3个工作日',done:false,active:false},{desc:'平台审核通过',time:'2024-01-18 15:30',done:true,active:false},{desc:'商家处理中',time:'2024-01-18 14:00',done:true,active:false},{desc:'申请已提交',time:'2024-01-18 10:00',done:true,active:false}]);function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.tl{padding:0 8rpx}.tli{display:flex;gap:16rpx;padding:16rpx 0}.tic{font-size:24rpx;width:36rpx;text-align:center}.tic.d{color:#22c55e}.tic.a{color:#C41E3A}.tic{color:#ccc}.tid{font-size:26rpx;color:#2C2C2C;display:block}.tit{font-size:20rpx;color:#999;margin-top:4rpx}
</style>
