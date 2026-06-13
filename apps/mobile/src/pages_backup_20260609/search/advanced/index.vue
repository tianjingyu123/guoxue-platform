<template>
  <view class="page">
    <view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">高级搜索</text><view style="width:48rpx"/></view>
    <view class="sb"><text class="sbi">🔍</text><input class="sbin" placeholder="输入搜索关键词"/></view>
    <scroll-view scroll-y class="c">
      <view class="card"><text class="ct">内容类型</text><view class="tags"><text v-for="t in types" :key="t" class="tg" :class="{s:selType===t}" @click="selType=t">{{t}}</text></view></view>
      <view class="card"><text class="ct">时间</text><view class="tags"><text v-for="t in times" :key="t" class="tg" :class="{s:selTime===t}" @click="selTime=t">{{t}}</text></view></view>
      <view class="card"><text class="ct">排序</text><view class="tags"><text v-for="s in sorts" :key="s" class="tg" :class="{s:selSort===s}" @click="selSort=s">{{s}}</text></view></view>
      <view class="btn">搜索</view>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const selType=ref('全部'),selTime=ref('不限'),selSort=ref('相关度');const types=['全部','文章','课程','帖子','视频'];const times=['不限','最近一周','最近一月'];const sorts=['相关度','最新','最热'];function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.sb{display:flex;align-items:center;padding:16rpx 24rpx;background:#fff}.sbi{font-size:28rpx;margin-right:12rpx}.sbin{flex:1;height:72rpx;background:#F5F1EB;border-radius:40rpx;padding:0 24rpx;font-size:26rpx}.c{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}.tags{display:flex;flex-wrap:wrap;gap:12rpx}.tg{padding:12rpx 24rpx;background:#F5F1EB;border-radius:40rpx;font-size:24rpx;color:#999}.tg.s{background:#C41E3A;color:#fff}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
