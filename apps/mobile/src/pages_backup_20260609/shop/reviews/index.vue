<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">商品评价</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="c"><view v-for="r in list" :key="r.id" class="card">
      <view class="ch"><text class="ca">{{r.user[0]}}</text><view><text class="cn">{{r.user}}</text><text class="cs">⭐{{r.rating}}</text></view><text class="ct">{{r.time}}</text></view>
      <text class="cc">{{r.content}}</text></view><view style="height:48rpx"/></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const list=ref([{id:1,user:'易学爱好者',content:'书的质量很好，纸质优良。',rating:5,time:'3天前'},{id:2,user:'命理新手',content:'讲解详细，入门必读。',rating:4,time:'1周前'}]);function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.ch{display:flex;align-items:center;gap:12rpx;margin-bottom:12rpx}.ca{width:56rpx;height:56rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#999}.cn{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cs{font-size:22rpx;color:#C9A96E}.ct{font-size:20rpx;color:#ccc;margin-left:auto}.cc{font-size:26rpx;color:#333;line-height:1.6}
</style>
