<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">管理直播间</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">直播状态</text><view class="status-row"><text class="sr-icon">🟢</text><text class="sr-text">直播中</text><view class="sr-switch" @click="endLive">结束直播</view></view></view>
      <view class="card"><text class="ct">实时数据</text>
        <view class="data-grid"><view class="dg"><text class="dg-val">1,258</text><text class="dg-label">在线</text></view><view class="dg"><text class="dg-val">8,560</text><text class="dg-label">观看</text></view><view class="dg"><text class="dg-val">¥2,680</text><text class="dg-label">收益</text></view></view>
      </view>
      <view class="card"><text class="ct">快捷操作</text>
        <view class="quick-grid"><view v-for="q in quickOps" :key="q.label" class="qg" @click="q.action"><text class="qg-icon">{{q.icon}}</text><text>{{q.label}}</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const quickOps=[{label:'商品管理',icon:'🛍️',action:()=>{}},{label:'观众管理',icon:'👥',action:()=>{}},{label:'弹幕设置',icon:'💬',action:()=>{}},{label:'数据看板',icon:'📊',action:()=>{}},{label:'连麦管理',icon:'🎤',action:()=>{}},{label:'抽奖活动',icon:'🎁',action:()=>{}}];function endLive(){uni.showModal({title:'确认结束直播？',content:'结束后将生成回放'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.status-row{display:flex;align-items:center;gap:16rpx}.sr-icon{font-size:48rpx}.sr-text{font-size:28rpx;font-weight:600;flex:1}.sr-switch{padding:14rpx 28rpx;background:#ef4444;color:#fff;border-radius:40rpx;font-size:24rpx}.data-grid{display:flex;gap:16rpx}.dg{flex:1;text-align:center;padding:24rpx 0}.dg-val{font-size:36rpx;font-weight:700;color:#C41E3A;display:block}.dg-label{font-size:20rpx;color:#999;margin-top:4rpx}.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16rpx}.qg{text-align:center;padding:24rpx 0;background:#FAF8F5;border-radius:16rpx;font-size:22rpx;color:#666}.qg-icon{font-size:40rpx;display:block;margin-bottom:8rpx}
</style>
