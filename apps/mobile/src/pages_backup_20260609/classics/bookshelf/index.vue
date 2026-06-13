<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">我的书架</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="c"><view v-for="b in books" :key="b.id" class="card"><text class="cc">📖</text><view><text class="cn">{{b.title}}</text><text class="cm">{{b.progress}}%</text></view></view></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const books=ref([{id:1,title:'渊海子平',progress:35},{id:2,title:'紫微斗数全书',progress:12}]);function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{display:flex;align-items:center;gap:20rpx;background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.cc{font-size:48rpx}.cn{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cm{font-size:22rpx;color:#999}
</style>
