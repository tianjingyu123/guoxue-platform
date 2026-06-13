<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">隐私授权</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">信息授权管理</text>
        <view v-for="p in permissions" :key="p.key" class="perm-row"><text class="pr-icon">{{p.icon}}</text><view><text class="pr-name">{{p.label}}</text><text class="pr-desc">{{p.desc}}</text></view><switch :checked="p.enabled" @change="p.enabled=!p.enabled"/></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {reactive} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const permissions=reactive([{key:'location',label:'位置信息',desc:'用于推荐附近驿站和活动',icon:'📍',enabled:true},{key:'camera',label:'相机',desc:'用于拍照上传和直播',icon:'📷',enabled:true},{key:'microphone',label:'麦克风',desc:'用于直播连麦和语音',icon:'🎤',enabled:false},{key:'storage',label:'相册访问',desc:'用于上传图片和保存内容',icon:'🖼️',enabled:true}]);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.perm-row{display:flex;align-items:center;gap:16rpx;padding:20rpx 0;border-bottom:1px solid #F5F1EB}.pr-icon{font-size:36rpx}.pr-name{font-size:26rpx;color:#2C2C2C;display:block}.pr-desc{font-size:22rpx;color:#999;margin-top:2rpx}
</style>
