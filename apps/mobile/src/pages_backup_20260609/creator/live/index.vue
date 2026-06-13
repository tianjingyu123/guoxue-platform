<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">直播管理</text></view><text class="nav-add" @click="goCreate">＋</text></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px - 100rpx)'}">
      <view class="stats-grid"><view v-for="s in stats" :key="s.id" class="sc"><text class="sc-icon">{{s.icon}}</text><text class="sc-val">{{s.value}}<text class="sc-unit">{{s.unit}}</text></text><text class="sc-label">{{s.label}}</text></view></view>
      <view class="card"><text class="card-title">功能入口</text><view class="entry-grid"><text v-for="e in entries" :key="e.label" class="ei" @click="go(e.url)"><text class="eii">{{e.icon}}</text><text>{{e.label}}</text></text></view></view>
      <text class="sec">直播列表</text>
      <view v-for="l in lives" :key="l.id" class="lc">
        <view class="lct"><view class="lcc">📻</view><view class="lci"><text class="lctt">{{l.title}}</text><view class="lcm"><text :class="'sts st-'+l.status">{{st(l.status)}}</text><text>{{l.type==='knowledge'?'知识':'带货'}}</text></view></view></view>
        <view class="lcs"><text>👁️{{l.viewers}}</text><text>❤️{{l.likes}}</text><text>💰¥{{l.income}}</text></view>
        <view class="lca"><text @click="go('/pages/creator/live/console/index')">🎛️控制台</text><text @click="go('/pages/creator/live/analytics/id-detail/index')">📊数据</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
    <view class="bb"><view class="bbb" @click="goCreate">＋创建直播</view></view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const stats=[{id:1,label:'本月直播',value:'12',unit:'场',icon:'📹'},{id:2,label:'累计观看',value:'8.6',unit:'万',icon:'👁️'},{id:3,label:'新增粉丝',value:'1,280',unit:'',icon:'👥'},{id:4,label:'打赏收入',value:'¥3,680',unit:'',icon:'🎁'},{id:5,label:'带货成交',value:'¥12,800',unit:'',icon:'🛍️'}]
const entries=[{label:'排期',icon:'📅',url:'/pages/creator/live/schedule/index'},{label:'团队',icon:'👥',url:'/pages/creator/live/team/index'},{label:'皮肤',icon:'🎨',url:'/pages/creator/live/theme/index'},{label:'数据',icon:'📊',url:'/pages/creator/live/analytics/id-detail/index'}]
const lives=[{id:1,title:'八字命理入门：快速解读四柱八字',type:'knowledge',status:'live',viewers:1258,likes:3200,income:680},{id:2,title:'开光貔貅专场',type:'commerce',status:'preview',viewers:0,likes:0,income:0},{id:3,title:'紫微斗数入门分享',type:'knowledge',status:'ended',viewers:8560,likes:12000,income:1880}]
function st(s:string){const m:any={live:'直播中',preview:'预告中',ended:'已结束',draft:'草稿'};return m[s]}
function goCreate(){uni.navigateTo({url:'/pages/creator/live/create/index'})}
function go(u:string){uni.navigateTo({url:u})}
function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-add{font-size:44rpx;color:#C41E3A;padding:8rpx}
.content{padding:24rpx}
.stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16rpx;margin-bottom:24rpx}.sc{background:#fff;border-radius:20rpx;padding:24rpx;text-align:center;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.sc-icon{font-size:40rpx;display:block;margin-bottom:8rpx}.sc-val{font-size:30rpx;font-weight:700;color:#2C2C2C;display:block}.sc-unit{font-size:20rpx;font-weight:400;color:#999}.sc-label{font-size:20rpx;color:#999;margin-top:4rpx}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}
.entry-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16rpx}.ei{display:flex;flex-direction:column;align-items:center;gap:8rpx;font-size:22rpx;color:#666;padding:20rpx 0}.eii{font-size:40rpx}
.sec{font-size:28rpx;font-weight:600;color:#2C2C2C;margin:24rpx 0 16rpx;display:block}
.lc{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx}.lct{display:flex;gap:16rpx;margin-bottom:16rpx}.lcc{width:140rpx;height:84rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:40rpx;flex-shrink:0}.lctt{font-size:26rpx;font-weight:500;color:#2C2C2C;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.lcm{display:flex;gap:12rpx;margin-top:8rpx;font-size:22rpx;color:#999}.sts{padding:2rpx 12rpx;border-radius:6rpx}.st-live{background:rgba(239,68,68,.1);color:#ef4444}.st-preview{background:rgba(59,130,246,.1);color:#3b82f6}.st-ended{background:#F5F1EB;color:#999}
.lcs{display:flex;gap:24rpx;font-size:22rpx;color:#999;margin-bottom:16rpx}.lca{display:flex;gap:24rpx;padding-top:16rpx;border-top:1px solid #F5F1EB;font-size:24rpx;color:#C41E3A}
.bb{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #E8E0D5;padding:20rpx 24rpx;z-index:50}.bbb{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:28rpx;font-weight:600}
</style>
