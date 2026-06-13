<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">支付方式</text><view style="width:48rpx"/></view>
    <view v-for="m in methods" :key="m.k" class="card" :class="{s:m.default}">
      <text class="mi">{{m.icon}}</text><view class="mc"><text class="mn">{{m.name}}</text><text class="md">{{m.detail}}</text></view>
      <text v-if="m.default" class="mb">默认</text><text class="ma" @click="unbind(m.k)">解绑</text></view>
    <view class="btn" @click="add">＋ 添加支付方式</view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const methods=ref([{k:'wechat',name:'微信支付',icon:'💚',detail:'已绑定微信号',default:true},{k:'alipay',name:'支付宝',icon:'💙',detail:'已绑定支付宝',default:false}]);function unbind(k:string){};function add(){};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.card{display:flex;align-items:center;gap:20rpx;background:#fff;border-radius:16rpx;padding:24rpx;margin:12rpx 24rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.mi{font-size:44rpx}.mn{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.md{font-size:22rpx;color:#999}.mb{font-size:18rpx;padding:4rpx 12rpx;background:rgba(196,30,58,.1);color:#C41E3A;border-radius:6rpx}.ma{font-size:22rpx;color:#999;padding:8rpx}.btn{padding:28rpx;margin:24rpx;text-align:center;border:2rpx dashed #E8E0D5;border-radius:24rpx;font-size:28rpx;color:#999}
</style>
