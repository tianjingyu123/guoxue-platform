<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">学习看板</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="overview"><view v-for="s in overview" :key="s.label" class="ov"><text class="ov-val">{{s.value}}</text><text class="ov-label">{{s.label}}</text></view></view>
      <view class="card"><text class="ct">学习趋势(近30天)</text><view class="chart"><view v-for="(d,i) in trend" :key="i" class="ch-bar" :style="{height:(d.value/180*100)+'%'}"/></view><view class="ch-labels"><text>30天前</text><text>今日</text></view></view>
      <view class="card"><text class="ct">最近学习</text>
        <view v-for="r in recent" :key="r.id" class="rec-row"><text class="rr-icon">{{r.icon}}</text><view><text class="rr-title">{{r.title}}</text><text class="rr-meta">{{r.course}}·{{r.time}}</text></view><text class="rr-dur">{{r.duration}}分钟</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const overview=[{label:'总学习时长',value:'128h'},{label:'完成课程',value:'5'},{label:'笔记数',value:'42'},{label:'连续打卡',value:'21天'}];const trend=Array.from({length:30},()=>({value:60+Math.floor(Math.random()*120)}));const recent=ref([{id:1,title:'3.4 官杀的含义与作用',course:'八字命理入门精讲',time:'今天',duration:30,icon:'▶️'},{id:2,title:'3.3 财星的含义与作用',course:'八字命理入门精讲',time:'昨天',duration:25,icon:'✓'},{id:3,title:'2.1 八字排盘',course:'紫微斗数基础课',time:'前天',duration:45,icon:'✓'}]);function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.overview{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-bottom:24rpx}.ov{background:#fff;border-radius:20rpx;padding:28rpx;text-align:center;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ov-val{font-size:36rpx;font-weight:700;color:#C41E3A;display:block}.ov-label{font-size:22rpx;color:#999;margin-top:4rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.chart{display:flex;align-items:flex-end;gap:4rpx;height:160rpx}.ch-bar{flex:1;background:linear-gradient(180deg,#C41E3A,rgba(196,30,58,.2));border-radius:3rpx 3rpx 0 0;min-height:4rpx}.ch-labels{display:flex;justify-content:space-between;margin-top:12rpx;font-size:20rpx;color:#999}.rec-row{display:flex;align-items:center;gap:16rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.rr-icon{font-size:32rpx}.rr-title{font-size:26rpx;color:#2C2C2C;display:block}.rr-meta{font-size:20rpx;color:#999}.rr-dur{font-size:22rpx;color:#999}
</style>
