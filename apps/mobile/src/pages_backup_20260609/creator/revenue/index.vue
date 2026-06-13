<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">创作者收益</text></view><text class="nav-right" @click="goWithdraw">提现</text></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view class="overview-card">
        <text class="oc-label">累计收益</text><text class="oc-val">¥{{data.totalEarnings.toLocaleString()}}</text>
        <view class="oc-row"><view class="ocr"><text class="ocr-val">¥{{data.monthlyEarnings.toLocaleString()}}</text><text class="ocr-label">本月收益</text><text class="ocr-change up">↑{{data.monthlyGrowth}}%</text></view><view class="ocr"><text class="ocr-val">¥{{data.withdrawable.toLocaleString()}}</text><text class="ocr-label">可提现余额</text></view></view>
      </view>

      <view class="card"><text class="card-title">收益来源</text>
        <view v-for="s in data.sources" :key="s.type" class="src-row"><text class="sr-icon">{{srcIcon(s.type)}}</text><view class="sr-info"><text class="sr-name">{{srcName(s.type)}}</text><view class="sr-bar"><view class="sr-fill" :style="{width:s.percent+'%',backgroundColor:srcColor(s.type)}"/></view></view><text class="sr-amount">¥{{s.amount.toLocaleString()}}</text></view>
      </view>

      <view class="card"><text class="card-title">收益明细</text>
        <view v-for="d in details" :key="d.id" class="det-row"><text class="dr-icon">{{srcIcon(d.type)}}</text><view class="dr-info"><text class="dr-desc">{{d.desc}}</text><text class="dr-time">{{d.time}}</text></view><text class="dr-amount" :class="d.amount>=0?'up':'down'">{{d.amount>=0?'+':''}}¥{{d.amount}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const data=ref({totalEarnings:128680.50,monthlyEarnings:12580,monthlyGrowth:15.8,withdrawable:45680,sources:[{type:'course',amount:45800,percent:45},{type:'question',amount:28600,percent:28},{type:'live',amount:16800,percent:17},{type:'tip',amount:10800,percent:10}]})
const details=[{id:1,type:'course',desc:'课程《八字入门》被购买',time:'今天14:32',amount:299},{id:2,type:'question',desc:'回答付费问题获得收益',time:'今天11:20',amount:50},{id:3,type:'live',desc:'直播打赏收入',time:'昨天21:30',amount:88},{id:4,type:'tip',desc:'收到打赏',time:'昨天16:45',amount:168},{id:5,type:'course',desc:'课程《紫微斗数》被购买',time:'前天15:30',amount:399}]
function srcIcon(t:string){const m:any={course:'📚',question:'💬',reward:'🎁',tip:'❤️',article:'📄',live:'📻'};return m[t]||'💰'}
function srcName(t:string){const m:any={course:'课程收入',question:'付费问答',reward:'悬赏奖励',tip:'打赏',article:'文章收益',live:'直播收益'};return m[t]||t}
function srcColor(t:string){const m:any={course:'#C41E3A',question:'#C9A96E',reward:'#f97316',tip:'#ec4899',article:'#a855f7',live:'#ef4444'};return m[t]||'#999'}
function goWithdraw(){uni.navigateTo({url:'/pages/wallet/withdraw/index'})}
function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-right{font-size:26rpx;color:#C41E3A}
.content{padding:24rpx}
.overview-card{background:linear-gradient(135deg,#C9A96E,#C41E3A);border-radius:24rpx;padding:36rpx;color:#fff;margin-bottom:24rpx}.oc-label{font-size:24rpx;opacity:.8}.oc-val{font-size:56rpx;font-weight:700;display:block;margin:8rpx 0 28rpx}.oc-row{display:flex;gap:32rpx}.ocr{flex:1}.ocr-val{font-size:32rpx;font-weight:600;display:block}.ocr-label{font-size:22rpx;opacity:.7}.ocr-change{font-size:20rpx;padding:2rpx 12rpx;border-radius:8rpx;background:rgba(255,255,255,.2)}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}
.src-row{display:flex;align-items:center;gap:12rpx;padding:12rpx 0;border-bottom:1px solid #F5F1EB}.sr-icon{font-size:28rpx}.sr-info{flex:1}.sr-name{font-size:24rpx;color:#999;margin-bottom:6rpx;display:block}.sr-bar{height:8rpx;background:#F5F1EB;border-radius:4rpx;overflow:hidden}.sr-fill{height:100%;border-radius:4rpx}.sr-amount{font-size:26rpx;font-weight:500;color:#2C2C2C}
.det-row{display:flex;align-items:center;gap:12rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.dr-icon{font-size:28rpx}.dr-info{flex:1}.dr-desc{font-size:26rpx;color:#2C2C2C;display:block}.dr-time{font-size:20rpx;color:#999;margin-top:4rpx}.dr-amount{font-size:26rpx;font-weight:500}.up{color:#22c55e}.down{color:#ef4444}
</style>
