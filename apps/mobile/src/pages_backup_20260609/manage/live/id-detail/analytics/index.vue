<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">直播数据详情</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="card"><text class="ct">{{live.title}}</text><view class="meta-row"><text>🕐{{live.time}}</text><text>已结束</text></view></view>
      <view class="metrics"><view v-for="m in metrics" :key="m.label" class="m-item"><text class="mi-val">{{m.value}}</text><text class="mi-label">{{m.label}}</text></view></view>
      <view class="card"><text class="ct">观看趋势</text><view class="chart"><view v-for="(d,i) in trendData" :key="i" class="ch-bar" :style="{height:(d.value/3256*100)+'%'}"/></view><view class="ch-labels"><text>19:00</text><text>20:00</text><text>21:00</text></view></view>
      <view class="card"><text class="ct">互动数据</text>
        <view class="int-row"><text>💬弹幕数</text><text>3,280</text></view>
        <view class="int-row"><text>❤️点赞数</text><text>32,800</text></view>
        <view class="int-row"><text>🎁打赏数</text><text>156</text></view>
        <view class="int-row"><text>🛍️商品点击</text><text>868</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const live={title:'八字命理入门第一课',time:'2024-01-15 20:00'};const metrics=[{label:'总观看',value:'12,580'},{label:'峰值在线',value:'3,256'},{label:'平均观看时长',value:'18:32'},{label:'新增关注',value:'428'},{label:'加入圈子',value:'156'},{label:'打赏收入',value:'¥2,680'}];const trendData=[{time:'19:00',value:120},{time:'19:15',value:580},{time:'19:30',value:1200},{time:'19:45',value:2100},{time:'20:00',value:2850},{time:'20:15',value:3256},{time:'20:30',value:2980},{time:'20:45',value:2650},{time:'21:00',value:2200}];function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:12rpx;display:block}.meta-row{display:flex;gap:24rpx;font-size:22rpx;color:#999}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-bottom:24rpx}.m-item{background:#fff;border-radius:20rpx;padding:24rpx;text-align:center;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.mi-val{font-size:34rpx;font-weight:700;color:#C41E3A;display:block}.mi-label{font-size:22rpx;color:#999;margin-top:4rpx}.chart{display:flex;align-items:flex-end;gap:6rpx;height:180rpx}.ch-bar{flex:1;background:linear-gradient(180deg,#C41E3A,rgba(196,30,58,.3));border-radius:4rpx 4rpx 0 0;min-height:4rpx}.ch-labels{display:flex;justify-content:space-between;margin-top:12rpx;font-size:20rpx;color:#999}.int-row{display:flex;justify-content:space-between;padding:16rpx 0;border-bottom:1px solid #F5F1EB;font-size:26rpx;color:#2C2C2C}
</style>
