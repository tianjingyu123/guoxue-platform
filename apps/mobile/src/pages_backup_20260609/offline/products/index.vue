<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">驿站商品</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="grid"><view v-for="p in products" :key="p.id" class="item"><view class="ii-cover">🛍️</view><text class="ii-name">{{p.name}}</text><text class="ii-price">¥{{p.price}}</text></view></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const products=ref([{id:1,name:'渊海子平精装版',price:98},{id:2,name:'专业罗盘',price:398},{id:3,name:'五帝钱套装',price:88},{id:4,name:'开光貔貅',price:168}]);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16rpx}.item{background:#fff;border-radius:16rpx;overflow:hidden;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.ii-cover{aspect-ratio:1;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:56rpx}.ii-name{font-size:24rpx;color:#2C2C2C;padding:12rpx 12rpx 0}.ii-price{font-size:26rpx;font-weight:600;color:#C41E3A;padding:8rpx 12rpx 16rpx}
</style>
