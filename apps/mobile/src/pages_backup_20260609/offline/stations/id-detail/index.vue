<template>
  <view class="page">
    <view class="cover"><view class="cover-img"/><text class="c-back" @click="goBack">←</text></view>
    <scroll-view scroll-y class="content">
      <view class="info"><text class="in-name">{{station.name}}</text><text class="in-addr">📍{{station.address}}</text>
        <view class="in-stats"><view class="ins"><text class="ins-val">{{station.courses}}</text><text>课程</text></view><view class="ins"><text class="ins-val">{{station.events}}</text><text>活动</text></view><view class="ins"><text class="ins-val">{{station.rating}}</text><text>⭐</text></view></view>
      </view>
      <view class="card"><text class="ct">驿站介绍</text><text class="desc">{{station.description}}</text></view>
      <view class="card"><text class="ct">联系方式</text><text class="phone">📞{{station.phone}}</text></view>
      <view class="card"><text class="ct">近期课程</text>
        <view v-for="c in station.courseList" :key="c.id" class="cl"><text class="clt">{{c.title}}</text><text class="cld">{{c.date}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const station=ref({name:'北京国学馆',address:'朝阳区建国路88号',phone:'010-8888-6666',rating:4.8,courses:15,events:28,description:'北京国学馆是热卜国学在北京设立的线下学习基地。',courseList:[{id:1,title:'八字命理入门班',date:'2024-03-15'},{id:2,title:'风水实践课',date:'2024-03-22'}]});function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.cover{position:relative;height:240rpx}.cover-img{width:100%;height:100%;background:linear-gradient(135deg,rgba(196,30,58,.2),rgba(201,169,110,.15))}.c-back{position:absolute;top:20rpx;left:24rpx;width:64rpx;height:64rpx;border-radius:50%;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28rpx}.content{padding:24rpx}.info{margin-top:-60rpx;background:#fff;border-radius:24rpx;padding:28rpx;box-shadow:0 4rpx 24rpx rgba(0,0,0,.08);position:relative;z-index:10;margin-bottom:20rpx}.in-name{font-size:34rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:8rpx}.in-addr{font-size:24rpx;color:#999;display:block;margin-bottom:20rpx}.in-stats{display:flex;gap:32rpx}.ins{text-align:center;font-size:22rpx;color:#999}.ins-val{font-size:30rpx;font-weight:700;color:#C41E3A;display:block}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}.desc{font-size:26rpx;color:#666;line-height:1.6}.phone{font-size:28rpx;color:#C41E3A}.cl{display:flex;justify-content:space-between;padding:14rpx 0;border-bottom:1px solid #F5F1EB}.clt{font-size:26rpx;color:#2C2C2C}.cld{font-size:24rpx;color:#999}
</style>
