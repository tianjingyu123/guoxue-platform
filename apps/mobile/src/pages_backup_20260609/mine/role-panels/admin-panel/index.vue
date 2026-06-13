<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">管理面板</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="stats"><view v-for="s in stats" :key="s.label" class="st"><text class="st-val">{{s.value}}</text><text class="st-label">{{s.label}}</text></view></view>
      <view class="card"><text class="ct">快捷入口</text>
        <view class="entry-grid"><view v-for="e in entries" :key="e.label" class="ei" @click="go(e.url)"><text class="ei-icon">{{e.icon}}</text><text>{{e.label}}</text></view></view>
      </view>
      <view class="card"><text class="ct">待处理事项</text>
        <view v-for="p in pending" :key="p.id" class="pen"><text class="pi-icon">{{p.icon}}</text><view><text class="pi-title">{{p.title}}</text><text class="pi-count">{{p.count}}</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const stats=[{label:'用户总数',value:'12.8万'},{label:'今日新增',value:'256'},{label:'待审核',value:'18'},{label:'违规',value:'5'}];const entries=[{label:'用户管理',icon:'👥',url:''},{label:'内容审核',icon:'📝',url:''},{label:'订单管理',icon:'🛍️',url:''},{label:'数据分析',icon:'📊',url:''},{label:'系统设置',icon:'⚙️',url:''},{label:'通知管理',icon:'🔔',url:''}];const pending=ref([{id:1,title:'内容审核待处理',count:'18条',icon:'📝'},{id:2,title:'用户举报待处理',count:'5条',icon:'🚨'},{id:3,title:'提现申请待审核',count:'8条',icon:'💰'}]);function go(url:string){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.stats{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-bottom:24rpx}.st{background:#fff;border-radius:20rpx;padding:24rpx;text-align:center;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.st-val{font-size:36rpx;font-weight:700;color:#C41E3A;display:block}.st-label{font-size:22rpx;color:#999;margin-top:4rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.entry-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16rpx}.ei{display:flex;flex-direction:column;align-items:center;gap:8rpx;padding:24rpx 0;font-size:22rpx;color:#666;background:#FAF8F5;border-radius:16rpx}.ei-icon{font-size:40rpx}.pen{display:flex;align-items:center;gap:16rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.pi-icon{font-size:36rpx}.pi-title{font-size:26rpx;color:#2C2C2C;display:block}.pi-count{font-size:24rpx;color:#f97316;font-weight:500}
</style>
