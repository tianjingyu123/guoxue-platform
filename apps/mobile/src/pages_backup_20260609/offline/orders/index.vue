<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">线下订单</text><view style="width:48rpx"/></view>
    <view class="tab-row"><text v-for="t in tabs" :key="t.key" class="tab" :class="{act:tab===t.key}" @click="tab=t.key">{{t.label}}</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="o in orders" :key="o.id" class="oc"><view class="och"><text class="ocht">{{o.course}}</text><text :class="'ochs st-'+o.status">{{st(o.status)}}</text></view><view class="ocm"><text>{{o.date}}</text><text class="ocp">¥{{o.price}}</text></view></view>
      <view v-if="orders.length===0" class="empty"><text>暂无订单</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const tab=ref('all');const tabs=[{key:'all',label:'全部'},{key:'paid',label:'已付款'},{key:'done',label:'已完成'}];const allOrders=[{id:1,course:'八字命理入门线下班',date:'2024-03-15',price:1999,status:'paid'},{id:2,course:'风水实践课',date:'2024-04-01',price:2999,status:'done'}];const orders=computed(()=>tab.value==='all'?allOrders:allOrders.filter((o:any)=>o.status===tab.value));function st(s:string){const m:any={paid:'已付款',done:'已完成'};return m[s]};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.tab-row{display:flex;gap:32rpx;padding:16rpx 24rpx}.tab{font-size:24rpx;color:#999;position:relative}.tab.act{color:#C41E3A;font-weight:500}.tab.act::after{content:'';position:absolute;bottom:-16rpx;left:0;right:0;height:4rpx;background:#C41E3A;border-radius:2rpx}.content{padding:24rpx}.oc{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.och{display:flex;justify-content:space-between;align-items:center;margin-bottom:12rpx}.ocht{font-size:28rpx;font-weight:500;color:#2C2C2C}.ochs{font-size:20rpx;padding:4rpx 14rpx;border-radius:8rpx}.st-paid{background:rgba(59,130,246,.1);color:#3b82f6}.st-done{background:rgba(34,197,94,.1);color:#22c55e}.ocm{display:flex;justify-content:space-between;font-size:24rpx;color:#999}.ocp{font-weight:500;color:#C41E3A}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
