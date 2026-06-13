<template>
  <view class="page">
    <view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">搜索历史</text><text class="nc" @click="clearAll">清空</text></view>
    <view class="sb"><text class="sbi">🔍</text><input class="sbin" placeholder="搜索..."/></view>
    <view class="tags"><text v-for="h in history" :key="h" class="tg" @click="search(h)">{{h}}</text></view>
    <text class="sec">🔥 热门搜索</text>
    <view class="tags"><text v-for="h in hot" :key="h" class="tg hot" @click="search(h)">{{h}}</text></view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const history=ref(['八字命理','紫微斗数','渊海子平','风水布局','周易入门']);const hot=ref(['八字入门','天干地支','五行生克','奇门遁甲','排盘教程','每日运势']);function search(q:string){};function clearAll(){history.value=[]};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.nc{font-size:24rpx;color:#C41E3A}.sb{display:flex;align-items:center;padding:20rpx 24rpx;background:#fff;border-bottom:1px solid #E8E0D5}.sbi{font-size:28rpx;margin-right:12rpx}.sbin{flex:1;height:72rpx;background:#F5F1EB;border-radius:40rpx;padding:0 24rpx;font-size:26rpx}.sec{font-size:26rpx;font-weight:600;color:#2C2C2C;padding:24rpx 24rpx 12rpx;display:block}.tags{display:flex;flex-wrap:wrap;gap:12rpx;padding:0 24rpx}.tg{padding:12rpx 24rpx;background:#fff;border-radius:40rpx;font-size:24rpx;color:#666}.tg.hot{color:#C41E3A}
</style>
