<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">直播控制台</text></view><view class="nav-status on">直播中</view></view>

    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px - 140rpx)'}">
      <view class="stats-grid">
        <view v-for="s in statsList" :key="s.label" class="stat-card"><text class="sc-val">{{s.value}}</text><text class="sc-label">{{s.label}}</text></view>
      </view>

      <view class="card"><text class="card-title">💬 弹幕 ({{danmaku.length}})</text>
        <view v-for="d in danmaku" :key="d.id" class="dm-item"><text class="dm-user" :class="'lv'+d.level">{{d.user}}</text><text class="dm-content">: {{d.content}}</text></view>
      </view>

      <view class="card"><text class="card-title">📞 连麦申请 ({{connectReqs.length}})</text>
        <view v-for="r in connectReqs" :key="r.id" class="cr-item"><text class="cr-avatar">{{r.user[0]}}</text><view class="cr-info"><text class="cr-name">{{r.user}}</text><text class="cr-reason">{{r.reason}}</text></view><text class="cr-wait">⏰{{r.waitTime}}</text></view>
      </view>

      <view class="card"><text class="card-title">🛍️ 商品管理</text>
        <view v-for="p in products" :key="p.id" class="prod-item"><view class="pi-info"><text class="pi-name">{{p.name}}</text><text class="pi-sold">已售{{p.sold}}/{{p.stock}}</text></view><view class="pi-switch" :class="{on:p.isLive}" @click="p.isLive=!p.isLive"><view class="pis-dot"/></view></view>
      </view>

      <view class="card"><text class="card-title">📝 提词器</text>
        <view v-for="t in script" :key="t.id" class="sc-item" :class="{done:t.done,cur:t.isCurrent}"><text class="sc-time">{{t.time}}</text><text class="sc-text">{{t.content}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>

    <view class="bottom-bar">
      <view class="bb-grid"><text class="bb-act" @click="onAction('stop')">⏹ 结束</text><text class="bb-act" @click="onAction('mute')">🎤 静音</text><text class="bb-act" @click="onAction('product')">🛍️ 商品</text><text class="bb-act" @click="onAction('script')">📝 提词</text></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const statsList=[{label:'在线人数',value:'1,258'},{label:'总观看',value:'8,560'},{label:'新增关注',value:'86'},{label:'打赏',value:'¥2,680'}]
const danmaku=[{id:1,user:'易学小白',content:'老师讲得真好！',level:3},{id:2,user:'命理爱好者',content:'这个八字怎么看财运？',level:5},{id:3,user:'紫微迷',content:'老师能讲讲紫微斗数吗',level:2},{id:4,user:'风水先生',content:'支持老师！',level:8}]
const connectReqs=[{id:1,user:'命理爱好者',reason:'想请教老师关于日主偏弱的问题',waitTime:'2:30'},{id:2,user:'紫微迷',reason:'我的命盘有疑问',waitTime:'1:15'}]
const products=reactive([{id:1,name:'八字命理精讲课程',price:199,stock:100,sold:58,isLive:true},{id:2,name:'开光貔貅摆件',price:168,stock:15,sold:85,isLive:false}])
const script=[{id:1,time:'00:00',content:'开场白',done:true},{id:2,time:'15:00',content:'第二部分：十天干特性',done:false,isCurrent:true},{id:3,time:'30:00',content:'第三部分：十二地支',done:false}]

function onAction(a:string){}
function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-status{padding:8rpx 20rpx;border-radius:40rpx;font-size:22rpx;background:rgba(34,197,94,.1);color:#22c55e}
.content{padding:24rpx}
.stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-bottom:24rpx}.stat-card{background:#fff;border-radius:20rpx;padding:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.sc-val{font-size:36rpx;font-weight:700;color:#C41E3A;display:block}.sc-label{font-size:22rpx;color:#999;margin-top:4rpx}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}
.dm-item{padding:8rpx 0;font-size:24rpx;border-bottom:1px solid #F5F1EB}.dm-user{color:#4A90D9;font-weight:500}.dm-content{color:#2C2C2C}
.cr-item{display:flex;align-items:center;gap:12rpx;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.cr-avatar{width:56rpx;height:56rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:22rpx;color:#999}.cr-info{flex:1}.cr-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cr-reason{font-size:22rpx;color:#999}.cr-wait{font-size:22rpx;color:#f97316}
.prod-item{display:flex;align-items:center;justify-content:space-between;padding:16rpx 0;border-bottom:1px solid #F5F1EB}.pi-name{font-size:26rpx;color:#2C2C2C;display:block}.pi-sold{font-size:20rpx;color:#999}.pi-switch{width:88rpx;height:48rpx;border-radius:24rpx;background:#E8E0D5;position:relative}.pi-switch.on{background:#C41E3A}.pis-dot{width:40rpx;height:40rpx;border-radius:50%;background:#fff;position:absolute;top:4rpx;left:4rpx;transition:left .2s}.pi-switch.on .pis-dot{left:44rpx}
.sc-item{display:flex;gap:16rpx;padding:12rpx 0;font-size:24rpx;color:#999}.sc-item.done{color:#22c55e}.sc-item.cur{color:#C41E3A;font-weight:500}.sc-time{width:80rpx;flex-shrink:0}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #E8E0D5;padding:16rpx 24rpx;z-index:50}.bb-grid{display:flex;gap:16rpx}.bb-act{flex:1;text-align:center;padding:20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;color:#666}
</style>
