<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">主播数据中心</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="summary"><text class="sm-title">数据概览</text>
        <view class="sm-grid"><view v-for="s in summary" :key="s.label" class="smg"><text class="smg-val">{{s.value}}</text><text class="smg-label">{{s.label}}</text></view></view>
      </view>
      <view class="card"><text class="ct">直播场次</text>
        <view v-for="l in liveList" :key="l.id" class="ll-item">
          <view class="lli-cover">📻</view><view class="lli-info"><text class="lli-title">{{l.title}}</text><text class="lli-date">{{l.date}}</text></view>
          <view class="lli-stats"><text>👁️{{l.views}}</text><text>💰¥{{l.income}}</text></view>
        </view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const summary=[{label:'总观看',value:'8.6万'},{label:'场均时长',value:'32分钟'},{label:'总收益',value:'¥12,680'},{label:'粉丝增长',value:'+856'}];const liveList=ref([{id:1,title:'八字命理入门第一课',date:'2024-01-15 20:00',views:12800,income:2680},{id:2,title:'紫微斗数基础课',date:'2024-01-12 19:30',views:8560,income:1880},{id:3,title:'风水布局入门',date:'2024-01-10 20:00',views:6280,income:1280}]);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.summary{background:linear-gradient(135deg,#C41E3A,#C9A96E);border-radius:24rpx;padding:32rpx;color:#fff;margin-bottom:24rpx}.sm-title{font-size:28rpx;font-weight:600;display:block;margin-bottom:24rpx}.sm-grid{display:grid;grid-template-columns:1fr 1fr;gap:24rpx}.smg{text-align:center}.smg-val{font-size:36rpx;font-weight:700;display:block}.smg-label{font-size:22rpx;opacity:.8;margin-top:4rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.ll-item{display:flex;align-items:center;gap:16rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.lli-cover{width:72rpx;height:48rpx;border-radius:8rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:28rpx}.lli-title{font-size:26rpx;color:#2C2C2C;display:block}.lli-date{font-size:20rpx;color:#999}.lli-stats{text-align:right;font-size:22rpx;color:#999;flex-shrink:0}
</style>
