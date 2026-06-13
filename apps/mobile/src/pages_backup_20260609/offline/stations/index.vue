<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">线下驿站</text><text class="nav-search" @click="goSearch">🔍</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="s in stations" :key="s.id" class="st-card" @click="goDetail(s.id)">
        <view class="st-cover">🏠</view><view class="st-info"><text class="sti-name">{{s.name}}</text><text class="sti-addr">📍{{s.address}}</text><view class="sti-tags"><text v-for="t in s.tags" :key="t" class="stit">{{t}}</text></view></view>
        <text class="st-dist">{{s.distance}}</text>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const stations=ref([{id:1,name:'北京国学馆',address:'朝阳区建国路88号',distance:'1.2km',tags:['课程','沙龙']},{id:2,name:'上海分院',address:'静安区南京西路128号',distance:'3.5km',tags:['课程','活动']},{id:3,name:'广州国学中心',address:'天河区珠江新城68号',distance:'5.8km',tags:['商店']}]);function goDetail(id:number){uni.navigateTo({url:'/pages/offline/stations/id-detail/index'})};function goSearch(){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-search{font-size:32rpx}.content{padding:24rpx}.st-card{display:flex;gap:20rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.st-cover{width:100rpx;height:80rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:44rpx;flex-shrink:0}.sti-name{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.sti-addr{font-size:22rpx;color:#999;margin-top:4rpx}.sti-tags{display:flex;gap:8rpx;margin-top:8rpx}.stit{font-size:20rpx;padding:4rpx 12rpx;background:#F5F1EB;border-radius:8rpx;color:#999}.st-dist{font-size:24rpx;color:#C41E3A;flex-shrink:0}
</style>
