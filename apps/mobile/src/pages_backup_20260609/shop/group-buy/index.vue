<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">拼团专区</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="c"><view v-for="p in ps" :key="p.id" class="card"><view class="cc">🛍️</view>
      <view class="ci"><text class="cn">{{p.name}}</text><view class="cp-row"><text class="cp">¥{{p.price}}</text><text class="co">¥{{p.orig}}</text></view>
        <text class="cd">已拼{{p.joined}}件·差{{p.need}}人成团</text></view>
      <view class="btn" @click="join(p.id)">去拼团</view></view><view style="height:48rpx"/></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const ps=ref([{id:1,name:'渊海子平精装版',price:68,orig:98,joined:3,need:2},{id:2,name:'专业罗盘',price:258,orig:398,joined:1,need:4}]);function join(id:number){uni.navigateTo({url:'/pages/shop/group-buy/id-detail/index'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:16rpx;padding:20rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.cc{width:100rpx;height:100rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:48rpx;flex-shrink:0}.cn{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cp-row{display:flex;align-items:baseline;gap:8rpx;margin-top:6rpx}.cp{font-size:28rpx;font-weight:700;color:#C41E3A}.co{font-size:22rpx;color:#999;text-decoration:line-through}.cd{font-size:22rpx;color:#999;margin-top:4rpx}.btn{padding:14rpx 28rpx;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:24rpx;flex-shrink:0}
</style>
