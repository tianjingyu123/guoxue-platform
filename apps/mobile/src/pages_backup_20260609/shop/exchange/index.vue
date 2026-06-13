<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">换货申请</text><view style="width:48rpx"/></view>
    <view class="c"><view class="card"><text class="ct">换货商品</text><view v-for="p in ps" :key="p.id" class="pr" :class="{s:sel===p.id}" @click="sel=p.id"><text>{{p.name}}</text></view></view>
      <view class="card"><text class="ct">换货原因</text><picker range="质量问题,尺寸不符,发错货"><text>请选择</text></picker></view>
      <view class="card"><text class="ct">换货类型</text><view class="tr"><text v-for="t in types" :key="t.k" class="tg" :class="{s:ex===t.k}" @click="ex=t.k">{{t.v}}</text></view></view>
      <view class="btn" @click="submit">提交申请</view></view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const sel=ref(''),ex=ref('same');const ps=ref([{id:1,name:'渊海子平精装版'}]);const types=[{k:'same',v:'同款换同款'},{k:'other',v:'换其他款'}];function submit(){uni.showToast({title:'提交成功'})};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.c{padding:24rpx}.card{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.ct{font-size:26rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}.pr{padding:16rpx;border:2rpx solid #E8E0D5;border-radius:12rpx;font-size:24rpx;color:#666}.pr.s{border-color:#C41E3A;background:rgba(196,30,58,.03)}.tr{display:flex;gap:12rpx}.tg{padding:14rpx 28rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;color:#999}.tg.s{background:#C41E3A;color:#fff}.btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:600}
</style>
