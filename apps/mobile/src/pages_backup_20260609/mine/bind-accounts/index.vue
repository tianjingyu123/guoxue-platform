<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">绑定账号</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="a in accounts" :key="a.key" class="acc-row">
        <text class="ar-icon">{{a.icon}}</text><view class="ar-info"><text class="ar-name">{{a.name}}</text><text class="ar-status">{{a.bound?a.detail:'未绑定'}}</text></view>
        <view class="ar-btn" :class="{bound:a.bound}" @click="toggle(a)"><text>{{a.bound?'解绑':'绑定'}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,reactive} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const accounts=reactive([{key:'wechat',name:'微信',icon:'💚',bound:true,detail:'wxid_abc123'},{key:'qq',name:'QQ',icon:'🐧',bound:false,detail:''},{key:'apple',name:'Apple ID',icon:'🍎',bound:false,detail:''}]);function toggle(a:any){a.bound=!a.bound};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.acc-row{display:flex;align-items:center;gap:20rpx;background:#fff;border-radius:20rpx;padding:28rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ar-icon{font-size:48rpx}.ar-name{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.ar-status{font-size:22rpx;color:#999;margin-top:4rpx}.ar-btn{padding:14rpx 32rpx;border-radius:40rpx;font-size:24rpx;background:#C41E3A;color:#fff}.ar-btn.bound{background:#F5F1EB;color:#999}
</style>
