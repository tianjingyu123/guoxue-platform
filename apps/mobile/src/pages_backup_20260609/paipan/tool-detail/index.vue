<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">{{tool.name}}</text><view style="width:48rpx"/></view>
    <view class="c"><view class="card"><text class="ct">排盘输入</text>
      <view class="f"><text class="fl">姓名</text><input class="fi" placeholder="请输入姓名"/></view>
      <view class="f"><text class="fl">性别</text><view class="g"><text v-for="g in genders" :key="g" class="gi" :class="{s:gender===g}" @click="gender=g">{{g}}</text></view></view>
      <view class="f"><text class="fl">出生日期</text><picker mode="date"><text>请选择</text></picker></view>
      <view class="f"><text class="fl">出生时间</text><picker mode="time"><text>请选择</text></picker></view>
      <view class="btn" @click="calc">开始排盘</view></view></view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const gender=ref('男');const tool={name:'八字排盘',desc:'四柱八字命盘分析'};const genders=['男','女'];function calc(){uni.navigateTo({url:'/pages/paipan/bazi/result/index'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:24rpx;display:block}.f{margin-bottom:24rpx}.fl{font-size:24rpx;color:#999;margin-bottom:10rpx;display:block}.fi{width:100%;height:72rpx;padding:0 20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;box-sizing:border-box}.g{display:flex;gap:16rpx}.gi{padding:16rpx 40rpx;background:#F5F1EB;border-radius:16rpx;font-size:26rpx;color:#999}.gi.s{background:#C41E3A;color:#fff}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
