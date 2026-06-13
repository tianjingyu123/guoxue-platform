<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">回放列表</text><view class="nav-search" @click="goSearch">🔍</view></view>
    <view class="sort-row"><text v-for="s in sorts" :key="s.key" class="sr" :class="{act:sort===s.key}" @click="sort=s.key">{{s.label}}</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="r in replays" :key="r.id" class="replay-card" @click="goReplay(r.id)">
        <view class="rc-cover"><text class="rcc-icon">▶</text><view class="rcc-badge">回放</view></view>
        <view class="rc-info"><text class="rci-title">{{r.title}}</text><text class="rci-meta">{{r.host}}·👁️{{r.views}}</text><text class="rci-dur">🕐{{r.duration}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const sort=ref('latest');const sorts=[{key:'latest',label:'最新'},{key:'popular',label:'最热'}];const replays=ref([{id:1,title:'八字命理入门第一课：天干地支基础',host:'周易大师',views:'8,560',duration:'1:30'},{id:2,title:'紫微斗数基础课',host:'张玄风',views:'6,280',duration:'1:15'},{id:3,title:'五行生克关系解析',host:'周易大师',views:'5,120',duration:'45:30'}]);function goReplay(id:number){uni.navigateTo({url:'/pages/live/replay/id-detail/index'})};function goSearch(){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-search{font-size:32rpx}.sort-row{display:flex;gap:24rpx;padding:16rpx 24rpx}.sr{font-size:24rpx;color:#999}.sr.act{color:#C41E3A;font-weight:500}.content{padding:24rpx}.replay-card{display:flex;gap:20rpx;background:#fff;border-radius:16rpx;padding:20rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.rc-cover{width:180rpx;aspect-ratio:16/9;background:#F5F1EB;border-radius:12rpx;display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0}.rcc-icon{font-size:36rpx;color:rgba(0,0,0,.3)}.rcc-badge{position:absolute;top:8rpx;left:8rpx;background:#C9A96E;color:#fff;font-size:18rpx;padding:2rpx 10rpx;border-radius:6rpx}.rci-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.rci-meta{font-size:22rpx;color:#999;margin-top:6rpx}.rci-dur{font-size:20rpx;color:#999;margin-top:4rpx}</style>
