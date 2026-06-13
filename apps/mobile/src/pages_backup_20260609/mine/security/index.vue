<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">账号安全</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="group in groups" :key="group.title" class="group">
        <text class="g-title">{{group.title}}</text>
        <view v-for="item in group.items" :key="item.label" class="g-item" @click="go(item.url)">
          <text class="gi-icon">{{item.icon}}</text><view><text class="gi-label">{{item.label}}</text><text class="gi-val">{{item.value}}</text></view><text>›</text>
        </view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {onPullDownRefresh} from '@dcloudio/uni-app';const groups=[{title:'登录安全',items:[{label:'修改密码',value:'已设置',icon:'🔑',url:''},{label:'修改手机号',value:'138****8888',icon:'📱',url:''},{label:'邮箱绑定',value:'未绑定',icon:'📧',url:''}]},{title:'支付安全',items:[{label:'支付密码',value:'已设置',icon:'🔐',url:''},{label:'实名认证',value:'已认证',icon:'🪪',url:''}]},{title:'设备管理',items:[{label:'登录设备',value:'3台设备',icon:'📱',url:''}]}];function go(url:string){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.group{margin-bottom:32rpx}.g-title{font-size:24rpx;color:#999;padding:0 4rpx;margin-bottom:12rpx;display:block}.g-item{display:flex;align-items:center;gap:16rpx;background:#fff;padding:24rpx;border-radius:16rpx;margin-bottom:2rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.gi-icon{font-size:36rpx}.gi-label{font-size:26rpx;color:#2C2C2C;display:block}.gi-val{font-size:22rpx;color:#999;margin-top:4rpx}
</style>
