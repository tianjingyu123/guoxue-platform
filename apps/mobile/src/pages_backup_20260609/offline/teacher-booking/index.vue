<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">讲师预约</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="t in teachers" :key="t.id" class="t-card">
        <text class="tc-av">{{t.name[0]}}</text><view class="tc-info"><text class="tci-name">{{t.name}}</text><text class="tci-title">{{t.title}}</text><view class="tci-tags"><text v-for="tg in t.tags" :key="tg" class="tcit">{{tg}}</text></view></view>
        <view class="tc-right"><text class="tcr-price">¥{{t.price}}<text class="tcr-unit">/次</text></text><view class="tcr-btn" @click="book(t.id)">预约</view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const teachers=ref([{id:1,name:'周易大师',title:'资深命理师',tags:['八字','紫微'],price:500},{id:2,name:'张玄风',title:'紫微传承人',tags:['紫微','风水'],price:300},{id:3,name:'李易安',title:'姓名学专家',tags:['姓名','择日'],price:200}]);function book(id:number){uni.showToast({title:'预约成功'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.t-card{display:flex;align-items:center;gap:20rpx;background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.tc-av{width:88rpx;height:88rpx;border-radius:50%;background:rgba(196,30,58,.1);display:flex;align-items:center;justify-content:center;font-size:36rpx;color:#C41E3A;flex-shrink:0}.tci-name{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.tci-title{font-size:22rpx;color:#999;margin-top:4rpx}.tci-tags{display:flex;gap:8rpx;margin-top:8rpx}.tcit{font-size:20rpx;padding:4rpx 12rpx;background:#F5F1EB;border-radius:8rpx;color:#999}.tc-right{text-align:right;flex-shrink:0}.tcr-price{font-size:32rpx;font-weight:700;color:#C41E3A;display:block}.tcr-unit{font-size:20rpx;font-weight:400;color:#999}.tcr-btn{padding:12rpx 28rpx;background:#C41E3A;color:#fff;border-radius:40rpx;font-size:24rpx;margin-top:8rpx}
</style>
