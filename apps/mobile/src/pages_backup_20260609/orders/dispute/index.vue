<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">交易纠纷</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">纠纷类型</text>
        <view v-for="t in types" :key="t.key" class="type-row" :class="{sel:disputeType===t.key}" @click="disputeType=t.key"><text class="tr-icon">{{t.icon}}</text><text>{{t.label}}</text></view>
      </view>
      <view class="card"><text class="ct">问题描述</text><textarea class="fi" placeholder="请详细描述您遇到的问题..." :rows="4"/></view>
      <view class="card"><text class="ct">上传凭证</text><view class="upload">📷 点击上传截图</view></view>
      <view class="btn" @click="handleSubmit">提交申诉</view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const disputeType=ref('');const types=[{key:'items',label:'未收到货',icon:'📦'},{key:'quality',label:'商品质量问题',icon:'⚠️'},{key:'wrong',label:'发错货',icon:'📋'},{key:'other',label:'其他',icon:'⋯'}];function handleSubmit(){uni.showToast({title:'提交成功'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.type-row{display:flex;align-items:center;gap:16rpx;padding:20rpx;border:2rpx solid #E8E0D5;border-radius:16rpx;font-size:26rpx;color:#666;margin-bottom:12rpx}.type-row.sel{border-color:#C41E3A;background:rgba(196,30,58,.03)}.tr-icon{font-size:36rpx}.fi{width:100%;padding:20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;box-sizing:border-box;resize:none}.upload{width:100%;height:200rpx;border:2rpx dashed #E8E0D5;border-radius:16rpx;display:flex;align-items:center;justify-content:center;font-size:26rpx;color:#999}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
