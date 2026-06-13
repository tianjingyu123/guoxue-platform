<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">#{{t.n}}</text><text class="nf">关注</text></view>
    <scroll-view scroll-y class="c"><view v-for="p in ps" :key="p.id" class="card"><text class="ca">{{p.a}}</text><view><text class="cn">{{p.a}}</text><text class="cc">{{p.c}}</text></view></view></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const t={n:'八字命理'};const ps=ref([{id:1,a:'周易大师',c:'日主强弱是分析命局的基础'}]);function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:28rpx;font-weight:500;color:#C41E3A}.nf{font-size:24rpx;color:#C41E3A}.c{padding:24rpx}.card{display:flex;gap:12rpx;background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx}.ca{width:56rpx;height:56rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#999;flex-shrink:0}.cn{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cc{font-size:24rpx;color:#666}
</style>
