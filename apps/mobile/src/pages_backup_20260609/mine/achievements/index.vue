<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">我的成就</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="level-card"><text class="lc-icon">🏆</text><text class="lc-name">国学达人 Lv.5</text><text class="lc-progress">距离下一级还需 280 经验值</text><view class="lc-bar"><view class="lcb-fill" :style="{width:'65%'}"/></view></view>
      <view class="card"><text class="ct">已获勋章 ({{badges.length}})</text>
        <view class="badge-grid"><view v-for="b in badges" :key="b.id" class="bg-item"><text class="bgi-icon">{{b.icon}}</text><text class="bgi-name">{{b.name}}</text><text class="bgi-date">{{b.date}}</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const badges=ref([{id:1,icon:'📖',name:'初识命理',date:'2024-01-15'},{id:2,icon:'🔥',name:'连续7天',date:'2024-01-22'},{id:3,icon:'✏️',name:'10篇笔记',date:'2024-02-01'},{id:4,icon:'💯',name:'完成第一课',date:'2024-01-16'},{id:5,icon:'🎯',name:'学习达人',date:'2024-02-10'},{id:6,icon:'📚',name:'学者',date:'2024-03-01'}]);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.level-card{background:linear-gradient(135deg,#C9A96E,#C41E3A);border-radius:24rpx;padding:36rpx;color:#fff;text-align:center;margin-bottom:24rpx}.lc-icon{font-size:72rpx;display:block;margin-bottom:12rpx}.lc-name{font-size:36rpx;font-weight:700;display:block}.lc-progress{font-size:24rpx;opacity:.8;margin-top:8rpx;margin-bottom:16rpx}.lc-bar{height:8rpx;background:rgba(255,255,255,.3);border-radius:4rpx;overflow:hidden}.lcb-fill{height:100%;background:#fff;border-radius:4rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.badge-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16rpx}.bg-item{text-align:center;padding:24rpx 0;background:#FAF8F5;border-radius:16rpx}.bgi-icon{font-size:48rpx;display:block;margin-bottom:8rpx}.bgi-name{font-size:22rpx;color:#2C2C2C;display:block}.bgi-date{font-size:18rpx;color:#ccc;margin-top:4rpx}
</style>
