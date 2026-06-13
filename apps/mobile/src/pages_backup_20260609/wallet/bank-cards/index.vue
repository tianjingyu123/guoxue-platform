<template>
  <view class="page"><view class="nav"><text class="nb" @click="goBack">←</text><text class="nt">银行卡</text><text class="na" @click="add">＋</text></view>
    <scroll-view scroll-y class="c"><view v-for="c in cards" :key="c.id" class="card">
      <text class="ci">{{c.icon}}</text><view><text class="cn">{{c.bank}} ({{c.last4}})</text><text class="ct">{{c.type}}</text></view><text class="cd" @click="del(c.id)">解绑</text></view><view style="height:48rpx"/></scroll-view></view>
</template>
<script setup lang="ts">import {ref} from 'vue';const cards=ref([{id:1,bank:'工商银行',last4:'6688',type:'储蓄卡',icon:'🏦'}]);function add(){};function del(id:number){cards.value=cards.value.filter(c=>c.id!==id)};function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nb{font-size:36rpx;color:#2C2C2C}.nt{font-size:32rpx;font-weight:600}.na{font-size:40rpx;color:#C41E3A}.c{padding:24rpx}.card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.ci{font-size:40rpx}.cn{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.ct{font-size:22rpx;color:#999}.cd{font-size:22rpx;color:#ef4444;margin-left:auto}
</style>
