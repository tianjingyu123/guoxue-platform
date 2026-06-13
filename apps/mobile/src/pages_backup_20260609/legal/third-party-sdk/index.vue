<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">第三方SDK清单</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view v-for="sdk in sdks" :key="sdk.name" class="sdk-card">
        <text class="sc-name">{{sdk.name}}</text><view class="sc-row"><text class="sc-label">用途</text><text>{{sdk.purpose}}</text></view>
        <view class="sc-row"><text class="sc-label">收集信息</text><text>{{sdk.data}}</text></view>
        <view class="sc-row"><text class="sc-label">厂商</text><text>{{sdk.provider}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">const sdks=[{name:'腾讯云IM',purpose:'即时通讯功能',data:'设备信息、网络状态',provider:'腾讯云计算（北京）有限责任公司'},{name:'微信OpenSDK',purpose:'微信登录、分享、支付',data:'设备信息、应用列表',provider:'深圳市腾讯计算机系统有限公司'},{name:'支付宝SDK',purpose:'支付宝支付',data:'设备信息、网络状态',provider:'支付宝（中国）网络技术有限公司'},{name:'腾讯云COS',purpose:'文件/图片/视频存储',data:'设备信息',provider:'腾讯云计算（北京）有限责任公司'},{name:'Vue3',purpose:'前端框架',data:'无',provider:'Evan You / Open Source'}];function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.sdk-card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.sc-name{font-size:28rpx;font-weight:600;color:#C41E3A;display:block;margin-bottom:16rpx}.sc-row{display:flex;padding:8rpx 0;font-size:24rpx;color:#666;gap:8rpx}.sc-label{color:#999;flex-shrink:0;min-width:120rpx}</style>
