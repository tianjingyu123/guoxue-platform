<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">个人信息收集清单</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="(items,cat) in list" :key="cat">
        <text class="cat">{{cat}}</text>
        <view v-for="item in items" :key="item.name" class="item"><text class="im-name">{{item.name}}</text><text class="im-purpose">{{item.purpose}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {onPullDownRefresh} from '@dcloudio/uni-app';const list:any={基本信息:[{name:'手机号',purpose:'账号注册与安全验证'},{name:'昵称/头像',purpose:'个人展示'}],位置信息:[{name:'粗略位置',purpose:'附近驿站推荐'}],设备信息:[{name:'设备型号/系统版本',purpose:'适配优化'}],使用信息:[{name:'浏览记录',purpose:'个性化推荐'}],};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.cat{font-size:28rpx;font-weight:600;color:#C41E3A;margin:28rpx 0 16rpx;display:block}.item{padding:20rpx 0;border-bottom:1px solid #F5F1EB}.im-name{font-size:26rpx;color:#2C2C2C;display:block}.im-purpose{font-size:22rpx;color:#999;margin-top:4rpx}</style>
