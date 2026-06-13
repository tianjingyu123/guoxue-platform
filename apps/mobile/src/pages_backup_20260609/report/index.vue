<template>
  <view class="page">
    <view class="nav"><text class="n-back" @click="goBack">←</text><text class="n-title">举报</text><view style="width:48rpx"/></view>
    <view class="target"><text class="tg-label">举报对象：</text><text class="tg-name">{{target.name}}</text></view>
    <view class="card"><text class="ct">举报类型</text>
      <view v-for="t in types" :key="t.key" class="type-row" :class="{sel:reportType===t.key}" @click="reportType=t.key"><text>{{t.icon}} {{t.label}}</text></view>
    </view>
    <view class="card"><text class="ct">详细描述</text><textarea class="fi" placeholder="请描述具体原因..." :rows="4"/></view>
    <view class="card"><text class="ct">上传凭证</text><view class="up">📷 点击上传截图</view></view>
    <view class="btn" @click="submit">提交举报</view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';const reportType=ref('');const target=ref({name:'某用户的帖子'});const types=[{key:'spam',label:'垃圾广告',icon:'📢'},{key:'harass',label:'骚扰信息',icon:'🚫'},{key:'fake',label:'虚假内容',icon:'⚠️'},{key:'illegal',label:'违法违规',icon:'🔞'},{key:'other',label:'其他',icon:'⋯'}];function submit(){uni.showToast({title:'举报提交成功'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.n-back{font-size:36rpx;color:#2C2C2C}.n-title{font-size:32rpx;font-weight:600}.target{padding:24rpx;font-size:26rpx;color:#666;background:#FFF9F0}.tg-label{color:#999}.tg-name{font-weight:500;color:#2C2C2C}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.type-row{display:flex;align-items:center;gap:12rpx;padding:20rpx;border:2rpx solid #E8E0D5;border-radius:16rpx;font-size:26rpx;color:#666;margin-bottom:12rpx}.type-row.sel{border-color:#C41E3A;background:rgba(196,30,58,.03)}.fi{width:100%;padding:20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;box-sizing:border-box;resize:none}.up{width:100%;height:200rpx;border:2rpx dashed #E8E0D5;border-radius:16rpx;display:flex;align-items:center;justify-content:center;font-size:26rpx;color:#999}.btn{padding:28rpx;margin:0 24rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
