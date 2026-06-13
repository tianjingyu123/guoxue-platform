<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">优惠券详情</text><view style="width:48rpx"/></view>
    <view class="card"><text class="ct">券面信息</text><view class="cm"><text class="cv">¥{{cp.value}}</text><text class="cn">{{cp.name}}</text></view><text class="ccd">满{{cp.minAmount}}可用·{{cp.expireAt}}到期</text></view>
    <view class="card"><text class="ct">适用范围</text><view v-for="s in cp.scope" :key="s" class="si">• {{s}}</view></view>
    <view class="btn">立即使用</view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const cp=ref({value:50,name:'新人专享券',minAmount:299,expireAt:'2024-12-31',scope:['全部课程','全部商品']});function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.cm{text-align:center;padding:32rpx 0}.cv{font-size:72rpx;font-weight:900;color:#C41E3A;display:block}.cn{font-size:28rpx;color:#2C2C2C;margin-top:8rpx}.ccd{font-size:22rpx;color:#999;display:block;margin-top:16rpx;text-align:center}.si{padding:8rpx 0;font-size:24rpx;color:#666}.btn{padding:28rpx;margin:0 24rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
