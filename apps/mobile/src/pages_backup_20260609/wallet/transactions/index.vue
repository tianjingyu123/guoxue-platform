<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">交易记录</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="c"><view v-for="t in txns" :key="t.id" class="card"><text class="ti">{{t.icon}}</text><view><text class="tn">{{t.desc}}</text><text class="tt">{{t.time}}</text></view><text class="ta" :class="t.a>=0?'u':'d'">{{t.a>=0?'+':''}}¥{{Math.abs(t.a)}}</text></view></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const txns=ref([{id:1,desc:'充值',time:'今天10:00',a:100,icon:'💳'},{id:2,desc:'购买课程',time:'昨天',a:-299,icon:'📚'}]);function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.ti{font-size:36rpx}.tn{font-size:26rpx;color:#2C2C2C;display:block}.tt{font-size:20rpx;color:#999}.ta{font-size:26rpx;font-weight:500;margin-left:auto}.u{color:#22c55e}.d{color:#ef4444}
</style>
