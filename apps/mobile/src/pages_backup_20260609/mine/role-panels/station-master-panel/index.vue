<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">分站长面板</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="overview"><view v-for="s in overview" :key="s.label" class="ov"><text class="ov-val">{{s.value}}</text><text class="ov-label">{{s.label}}</text></view></view>
      <view class="card"><text class="ct">快捷入口</text>
        <view class="eg"><view v-for="e in entries" :key="e.label" class="ei"><text class="eii">{{e.icon}}</text><text>{{e.label}}</text></view></view>
      </view>
      <view class="card"><text class="ct">收益趋势</text>
        <view class="chart"><view v-for="(d,i) in trend" :key="i" class="ch-bar" :style="{height:(d/maxTrend*100)+'%'}"/></view></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const overview=[{label:'成员',value:'328'},{label:'订单',value:'156'},{label:'收益',value:'¥8,680'}];const entries=[{label:'团队管理',icon:'👥'},{label:'推广素材',icon:'📢'},{label:'收益明细',icon:'💰'},{label:'分站配置',icon:'⚙️'},{label:'数据看板',icon:'📊'},{label:'成员审核',icon:'📝'}];const trend=[380,520,680,450,890,720,580];const maxTrend=computed(()=>Math.max(...trend));function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.overview{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16rpx;margin-bottom:24rpx}.ov{background:#fff;border-radius:20rpx;padding:24rpx;text-align:center;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ov-val{font-size:32rpx;font-weight:700;color:#C41E3A;display:block}.ov-label{font-size:22rpx;color:#999;margin-top:4rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.eg{display:grid;grid-template-columns:repeat(3,1fr);gap:16rpx}.ei{display:flex;flex-direction:column;align-items:center;gap:8rpx;padding:24rpx 0;font-size:22rpx;color:#666;background:#FAF8F5;border-radius:16rpx}.eii{font-size:40rpx}.chart{display:flex;align-items:flex-end;gap:8rpx;height:160rpx}.ch-bar{flex:1;background:linear-gradient(180deg,#C41E3A,rgba(196,30,58,.2));border-radius:4rpx 4rpx 0 0}
</style>
