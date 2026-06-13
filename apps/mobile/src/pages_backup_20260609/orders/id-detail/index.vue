<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">订单详情</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="status-badge" :class="'st-'+order.status">{{statusLabel(order.status)}}</view>
      <view class="card"><text class="ct">收货地址</text><text class="addr">{{order.address.name}} {{order.address.phone}}</text><text class="addr-detail">{{order.address.detail}}</text></view>
      <view class="card"><text class="ct">商品信息</text>
        <view class="prod-row"><view class="pr-cover">🛍️</view><view class="pr-info"><text class="pri-name">{{order.product}}</text><text class="pri-sku">{{order.sku}}</text></view><text class="pr-price">¥{{order.price}}×{{order.qty}}</text></view>
      </view>
      <view class="card"><text class="ct">价格明细</text>
        <view class="price-row"><text>商品金额</text><text>¥{{order.price}}</text></view>
        <view class="price-row"><text>运费</text><text>¥{{order.shipping}}</text></view>
        <view v-if="order.discount" class="price-row red"><text>优惠</text><text>-¥{{order.discount}}</text></view>
        <view class="price-row total"><text>实付</text><text class="prt-val">¥{{order.total}}</text></view>
      </view>
      <view class="card"><text class="ct">订单信息</text>
        <view class="info-row"><text>订单编号</text><text class="ir-copy">{{order.orderNo}} 📋</text></view>
        <view class="info-row"><text>下单时间</text><text>{{order.createdAt}}</text></view>
      </view>
      <view v-if="order.status==='paid'" class="card"><view class="act-row"><text @click="goLogistics">📦 查看物流</text><text @click="goRefund">↩ 申请售后</text></view></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const order=ref({orderNo:'RB202401150001',status:'paid',product:'渊海子平精装版',sku:'平装版',price:98,qty:1,shipping:10,discount:15,total:93,address:{name:'张三',phone:'138****8888',detail:'北京市朝阳区建国路88号'},createdAt:'2024-01-15 14:30'});function statusLabel(s:string){const m:any={paid:'已付款',shipped:'已发货',done:'已完成',refund:'已退款'};return m[s]};function goLogistics(){uni.navigateTo({url:'/pages/orders/logistics/index'})};function goRefund(){uni.navigateTo({url:'/pages/orders/refund-progress/index'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.status-badge{display:inline-block;padding:10rpx 24rpx;border-radius:40rpx;font-size:24rpx;margin-bottom:20rpx}.st-paid{background:rgba(59,130,246,.1);color:#3b82f6}.st-shipped{background:rgba(249,115,22,.1);color:#f97316}.st-done{background:rgba(34,197,94,.1);color:#22c55e}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}.addr{font-size:26rpx;color:#2C2C2C;display:block}.addr-detail{font-size:24rpx;color:#999;margin-top:4rpx}.prod-row{display:flex;align-items:center;gap:16rpx}.pr-cover{width:88rpx;height:88rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:40rpx;flex-shrink:0}.pri-name{font-size:26rpx;color:#2C2C2C;display:block}.pri-sku{font-size:22rpx;color:#999}.pr-price{font-size:26rpx;color:#C41E3A;font-weight:500;flex-shrink:0}.price-row{display:flex;justify-content:space-between;padding:8rpx 0;font-size:26rpx;color:#666}.price-row.red{color:#C41E3A}.price-row.total{padding-top:12rpx;border-top:1px solid #E8E0D5;font-weight:500;color:#2C2C2C}.prt-val{font-size:36rpx;font-weight:700;color:#C41E3A}.info-row{display:flex;justify-content:space-between;padding:12rpx 0;font-size:24rpx;color:#666;border-bottom:1px solid #F5F1EB}.ir-copy{color:#C41E3A}.act-row{display:flex;gap:32rpx;font-size:26rpx;color:#C41E3A}
</style>
