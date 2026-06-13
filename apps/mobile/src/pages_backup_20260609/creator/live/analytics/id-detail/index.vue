<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">直播数据</text></view><view style="width:48rpx"/></view>

    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view class="live-info"><text class="li-title">{{liveData.title}}</text><view class="li-meta"><text class="li-status">已结束</text><text>{{liveData.duration}}</text></view></view>

      <view class="metrics-grid">
        <view v-for="m in coreStats" :key="m.label" class="mc"><text class="mc-icon">{{m.icon}}</text><text class="mc-value">{{m.value}}</text><text class="mc-label">{{m.label}}</text><text class="mc-change up">{{m.change}}</text></view>
      </view>

      <view class="card"><text class="card-title">流量趋势</text>
        <view class="trend-chart"><view v-for="(d,i) in trafficData" :key="i" class="tc-bar" :style="{height:(d.value/3256*100)+'%'}"/></view>
        <view class="tc-labels"><text>19:00</text><text>19:30</text><text>20:00</text><text>20:30</text><text>21:00</text><text>21:30</text></view>
      </view>

      <view class="card"><text class="card-title">观众画像</text>
        <text class="sub-title">性别分布</text>
        <view class="bar-row"><view v-for="g in audienceData.gender" :key="g.label" class="br-item"><text class="br-label">{{g.label}}</text><view class="br-bar"><view class="br-fill" :style="{width:g.value+'%'}"/></view><text class="br-val">{{g.value}}%</text></view></view>
        <text class="sub-title mt">年龄分布</text>
        <view v-for="a in audienceData.age" :key="a.label" class="bar-row"><text class="br-label">{{a.label}}</text><view class="br-bar"><view class="br-fill" :style="{width:(a.value/38*100)+'%'}"/></view><text class="br-val">{{a.value}}%</text></view>
      </view>

      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const liveData={title:'八字命理入门：如何快速解读四柱八字',startTime:'2024-01-15 19:00',endTime:'2024-01-15 21:35',duration:'2小时35分钟',status:'ended'}
const coreStats=[{label:'总观看人数',value:'12,580',change:'+23%',icon:'👁️'},{label:'峰值在线',value:'3,256',change:'+15%',icon:'👥'},{label:'平均观看时长',value:'18分32秒',change:'+8%',icon:'⏰'},{label:'新增关注',value:'428',change:'+45%',icon:'❤️'},{label:'加入圈子',value:'156',change:'+32%',icon:'🎯'},{label:'打赏收入',value:'¥2,680',change:'+18%',icon:'🎁'}]
const trafficData=[{time:'19:00',value:120},{time:'19:15',value:580},{time:'19:30',value:1200},{time:'19:45',value:2100},{time:'20:00',value:2850},{time:'20:15',value:3256},{time:'20:30',value:2980},{time:'20:45',value:2650},{time:'21:00',value:2200},{time:'21:15',value:1800},{time:'21:30',value:1200}]
const audienceData={gender:[{label:'男性',value:42},{label:'女性',value:55},{label:'未知',value:3}],age:[{label:'18-24',value:15},{label:'25-34',value:38},{label:'35-44',value:28},{label:'45-54',value:14},{label:'55+',value:5}]}

function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}
.content{padding:24rpx}
.live-info{padding:20rpx;background:#fff;border-radius:20rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.li-title{font-size:30rpx;font-weight:600;color:#2C2C2C;display:block}.li-meta{display:flex;gap:16rpx;margin-top:8rpx;font-size:22rpx;color:#999}.li-status{padding:2rpx 12rpx;background:rgba(239,68,68,.1);color:#ef4444;border-radius:6rpx}
.metrics-grid{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-bottom:24rpx}.mc{background:#fff;border-radius:20rpx;padding:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.mc-icon{font-size:36rpx;margin-bottom:8rpx;display:block}.mc-value{font-size:36rpx;font-weight:700;color:#2C2C2C;display:block}.mc-label{font-size:22rpx;color:#999;margin-top:4rpx}.mc-change{font-size:20rpx;color:#22c55e;margin-top:4rpx}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.sub-title{font-size:24rpx;color:#999;margin-bottom:12rpx;display:block}.mt{margin-top:24rpx}
.trend-chart{display:flex;align-items:flex-end;gap:8rpx;height:200rpx}.tc-bar{flex:1;background:linear-gradient(180deg,#C41E3A,rgba(196,30,58,.3));border-radius:4rpx 4rpx 0 0;min-height:4rpx}.tc-labels{display:flex;justify-content:space-between;margin-top:12rpx;font-size:20rpx;color:#999}
.bar-row{display:flex;align-items:center;gap:12rpx;margin-bottom:12rpx;font-size:22rpx;color:#2C2C2C}.br-label{width:80rpx}.br-bar{flex:1;height:16rpx;background:#F5F1EB;border-radius:8rpx;overflow:hidden}.br-fill{height:100%;background:#C41E3A;border-radius:8rpx}.br-val{margin-left:8rpx;color:#999}
</style>
