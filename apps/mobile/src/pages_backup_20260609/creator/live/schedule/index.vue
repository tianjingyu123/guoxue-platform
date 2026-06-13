<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">排期管理</text></view><text class="nav-add" @click="showAdd=true">＋</text></view>
    <view class="filter-row"><text v-for="f in filters" :key="f.key" class="fl" :class="{act:filter===f.key}" @click="filter=f.key">{{f.label}}</text></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px)'}">
      <view v-for="s in schedules" :key="s.id" class="card"><view class="c-top"><text class="ct-date">{{s.date}}</text><text class="ct-status" :class="'sts-'+s.status">{{st(s.status)}}</text></view>
        <text class="ct-title">{{s.title}}</text>
        <view class="ct-meta"><text>🕐{{s.time}}·{{s.duration}}分钟</text><text>{{s.type==='knowledge'?'📚知识授课':'🛍️带货'}}</text></view>
        <view v-if="s.seriesName" class="ct-series"><text>📺{{s.seriesName}}(第{{s.seriesIndex}}/{{s.seriesTotal}}期)</text></view>
        <view class="ct-actions"><text @click="edit(s)">✏️编辑</text><text @click="copy(s)">📋复制</text><text @click="del(s)">🗑️删除</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const filter=ref('all'),showAdd=ref(false)
const filters=[{key:'all',label:'全部'},{key:'scheduled',label:'待播'},{key:'ended',label:'已结束'}]
const schedules=[{id:1,title:'八字命理入门第一课：天干地支基础',date:'2026-05-12',time:'20:00',duration:90,type:'knowledge',status:'scheduled',seriesName:'八字命理入门系列',seriesIndex:1,seriesTotal:8},{id:2,title:'紫微斗数实战分析',date:'2026-05-14',time:'19:30',duration:60,type:'knowledge',status:'scheduled'},{id:3,title:'开光貔貅专场',date:'2026-05-10',time:'20:00',duration:120,type:'commerce',status:'ended'}]
function st(s:string){const m:any={scheduled:'待播',live:'直播中',ended:'已结束'};return m[s]}
function edit(s:any){};function copy(s:any){};function del(s:any){}
function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-add{font-size:44rpx;color:#C41E3A;padding:8rpx}
.filter-row{display:flex;gap:12rpx;padding:16rpx 24rpx;background:#FAF8F5;border-bottom:1px solid #E8E0D5}.fl{padding:10rpx 28rpx;border-radius:40rpx;font-size:24rpx;background:#F5F1EB;color:#999}.fl.act{background:#C41E3A;color:#fff}
.content{padding:24rpx}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.c-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12rpx}.ct-date{font-size:24rpx;color:#999}.ct-status{font-size:20rpx;padding:4rpx 14rpx;border-radius:8rpx}.sts-scheduled{background:rgba(59,130,246,.1);color:#3b82f6}.sts-ended{background:#F5F1EB;color:#999}.ct-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block;margin-bottom:12rpx}.ct-meta{font-size:22rpx;color:#999;margin-bottom:8rpx}.ct-series{font-size:22rpx;color:#C9A96E;margin-bottom:16rpx}.ct-actions{display:flex;gap:24rpx;padding-top:16rpx;border-top:1px solid #F5F1EB;font-size:24rpx;color:#999}
</style>
