<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">直播回放</text><text class="nav-search" @click="goSearch">🔍</text></view>
    <view class="cat-scroll"><view v-for="c in categories" :key="c.key" class="cc" :class="{act:cat===c.key}" @click="cat=c.key"><text>{{c.label}}</text></view></view>
    <scroll-view scroll-y class="content">
      <view v-for="r in replays" :key="r.id" class="replay-card" @click="goReplay(r.id)">
        <view class="rc-cover"><text class="rcc-icon">▶</text><text class="rcc-dur">{{r.duration}}</text></view>
        <view class="rc-info"><text class="rci-title">{{r.title}}</text><text class="rci-meta">{{r.host}}·👁️{{r.views}}·{{r.date}}</text></view>
      </view>
      <view v-if="replays.length===0" class="empty"><text>暂无回放</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const cat=ref('all');const categories=[{key:'all',label:'全部'},{key:'knowledge',label:'知识授课'},{key:'commerce',label:'带货直播'}];const replays=ref([{id:1,title:'八字命理入门第一课：天干地支基础',host:'周易大师',views:'8,560',duration:'1:30:25',date:'2024-01-15'},{id:2,title:'紫微斗数基础课',host:'张玄风',views:'6,280',duration:'1:15:40',date:'2024-01-12'},{id:3,title:'风水布局实战分享',host:'陈风水',views:'4,120',duration:'58:30',date:'2024-01-10'}]);function goReplay(id:number){uni.navigateTo({url:'/pages/live/replay/id-detail/index'})};function goSearch(){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-search{font-size:32rpx}.cat-scroll{white-space:nowrap;padding:16rpx 24rpx;background:#FAF8F5}.cc{display:inline-block;padding:12rpx 28rpx;border-radius:40rpx;font-size:24rpx;color:#999;background:#F5F1EB;margin-right:12rpx}.cc.act{background:#C41E3A;color:#fff}.content{padding:24rpx}.replay-card{display:flex;gap:20rpx;background:#fff;border-radius:20rpx;padding:20rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.rc-cover{width:200rpx;aspect-ratio:16/9;background:#F5F1EB;border-radius:12rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;flex-shrink:0}.rcc-icon{font-size:40rpx;color:rgba(0,0,0,.3)}.rcc-dur{position:absolute;bottom:8rpx;right:8rpx;background:rgba(0,0,0,.6);color:#fff;font-size:18rpx;padding:2rpx 10rpx;border-radius:6rpx}.rci-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.rci-meta{font-size:22rpx;color:#999;margin-top:8rpx}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
