<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">商品对比</text><view style="width:48rpx"/></view>
    <view class="table"><view class="tr h"><text class="th">对比项</text><text v-for="p in ps" :key="p.id" class="th">{{p.name}}</text></view>
      <view v-for="r in rows" :key="r.l" class="tr"><text class="td lb">{{r.l}}</text><text v-for="p in ps" :key="p.id" class="td" :class="{d:p[r.k]!==ps[0]?.[r.k]}">{{p[r.k]}}</text></view></view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const ps=ref([{id:1,name:'渊海子平',price:'¥98',author:'徐大升',pages:'680',rating:'4.8'},{id:2,name:'紫微斗数全书',price:'¥128',author:'陈希夷',pages:'520',rating:'4.7'}]);const rows=[{l:'价格',k:'price'},{l:'作者',k:'author'},{l:'页数',k:'pages'},{l:'评分',k:'rating'}];function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.table{padding:24rpx}.tr{display:flex;border-bottom:1px solid #E8E0D5}.tr.h{background:#F5F1EB}.th{flex:1;padding:24rpx 16rpx;font-size:24rpx;font-weight:600;color:#2C2C2C;text-align:center}.td{flex:1;padding:20rpx 16rpx;font-size:24rpx;color:#666;text-align:center}.td.lb{font-weight:500;color:#2C2C2C;background:#FAF8F5}.td.d{color:#C41E3A;font-weight:500}
</style>
