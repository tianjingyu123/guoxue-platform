<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">充值</text><view style="width:48rpx"/></view>
    <view class="c"><view class="card"><text class="ct">选择金额</text><view class="ams"><text v-for="a in amounts" :key="a" class="am" :class="{s:sel===a}" @click="sel=a">¥{{a}}</text></view></view>
    <view class="card"><text class="ct">支付方式</text><text>微信支付</text></view>
    <view class="btn" @click="recharge">确认充值 ¥{{sel}}</view></view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const sel=ref(50);const amounts=[10,50,100,200,500,1000];function recharge(){uni.showToast({title:'充值成功'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.ams{display:grid;grid-template-columns:repeat(3,1fr);gap:16rpx}.am{padding:24rpx;text-align:center;background:#F5F1EB;border-radius:16rpx;font-size:28rpx;color:#999}.am.s{background:#C41E3A;color:#fff}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
