<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">申请售后</text><view style="width:48rpx"/></view>
    <view class="c"><view class="card"><text class="ct">售后类型</text><view class="tr"><text v-for="t in types" :key="t.k" class="tg" :class="{s:sel===t.k}" @click="sel=t.k">{{t.v}}</text></view></view>
    <view class="card"><text class="ct">退款原因</text><picker range="质量问题,不想要了,发错货,其他"><text>请选择</text></picker></view>
    <view class="card"><text class="ct">问题描述</text><textarea class="fi" placeholder="请描述问题..."/></view>
    <view class="card"><text class="ct">上传凭证</text><view class="up">📷 点击上传</view></view>
    <view class="btn" @click="submit">提交申请</view></view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const sel=ref('refund');const types=[{k:'refund',v:'仅退款'},{k:'return',v:'退货退款'}];function submit(){uni.showToast({title:'提交成功'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.ct{font-size:26rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}.tr{display:flex;gap:12rpx}.tg{padding:14rpx 28rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;color:#999}.tg.s{background:#C41E3A;color:#fff}.fi{width:100%;padding:16rpx;background:#F5F1EB;border-radius:12rpx;font-size:24rpx;box-sizing:border-box;resize:none}.up{height:160rpx;border:2rpx dashed #E8E0D5;border-radius:12rpx;display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#999}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
