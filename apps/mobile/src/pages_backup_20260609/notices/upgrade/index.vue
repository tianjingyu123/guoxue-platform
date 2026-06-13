<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">版本升级</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="header"><text class="h-icon">🚀</text><text class="h-ver">V{{newVersion}}</text><text class="h-size">安装包大小：{{pkgSize}}MB</text></view>
      <view class="card"><text class="ct">更新内容</text>
        <view v-for="(c,i) in changelog" :key="i" class="cl"><text class="cl-dot">•</text><text>{{c}}</text></view>
      </view>
      <view class="btn" @click="handleUpgrade">立即升级</view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const newVersion=ref('2.3.0');const pkgSize=ref(28);const changelog=['新增紫微斗数排盘工具','优化首页加载速度','修复已知问题','更新青少年模式'];</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.header{text-align:center;padding:48rpx 0}.h-icon{font-size:96rpx;display:block;margin-bottom:20rpx}.h-ver{font-size:56rpx;font-weight:900;color:#C41E3A;display:block}.h-size{font-size:24rpx;color:#999;margin-top:8rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:32rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.cl{font-size:26rpx;color:#666;padding:8rpx 0;display:flex;align-items:flex-start;gap:8rpx}.cl-dot{color:#C41E3A;font-weight:600}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
