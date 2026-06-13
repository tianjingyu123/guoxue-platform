<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">账单</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="c"><view v-for="b in bills" :key="b.id" class="card"><text class="bi">{{b.icon}}</text><view><text class="bn">{{b.desc}}</text><text class="bt">{{b.time}}</text></view><text class="ba" :class="b.a>=0?'u':'d'">{{b.a>=0?'+':''}}¥{{Math.abs(b.a)}}</text></view></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const bills=ref([{id:1,desc:'购买课程',time:'今天14:30',a:-299,icon:'📚'},{id:2,desc:'退款',time:'昨天',a:68,icon:'↩️'}]);function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.bi{font-size:36rpx}.bn{font-size:26rpx;color:#2C2C2C;display:block}.bt{font-size:20rpx;color:#999}.ba{font-size:26rpx;font-weight:500;margin-left:auto}.u{color:#22c55e}.d{color:#ef4444}
</style>
