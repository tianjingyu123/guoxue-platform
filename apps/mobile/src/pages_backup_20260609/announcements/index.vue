<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">圈子公告</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="c"><view v-for="a in anns" :key="a.id" class="card" @click="goDetail(a.id)">
      <view class="ch"><text class="cn">{{a.title}}</text><text v-if="a.isTop" class="ct">置顶</text></view>
      <text class="cc">{{a.content}}</text><text class="cm">{{a.time}}</text></view><view style="height:48rpx"/></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const anns=ref([{id:1,title:'欢迎加入八字命理研习社',content:'请先阅读圈规，有问题可以@管理员。',time:'2024-01-15',isTop:true}]);function goDetail(id:number){};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.ch{display:flex;justify-content:space-between;margin-bottom:8rpx}.cn{font-size:28rpx;font-weight:500;color:#2C2C2C}.ct{font-size:18rpx;padding:2rpx 10rpx;background:rgba(196,30,58,.1);color:#C41E3A;border-radius:6rpx}.cc{font-size:24rpx;color:#999;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.cm{font-size:20rpx;color:#ccc;margin-top:8rpx}
</style>
