<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">运势查询</text><text class="nav-right" @click="goDaily">每日运势</text></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view class="card"><text class="ct">选择生肖</text>
        <view class="zodiac-grid"><text v-for="z in zodiacs" :key="z" class="zg-item" :class="{sel:selectedZodiac===z}" @click="selectedZodiac=z">{{z}}</text></view>
      </view>

      <view class="card"><text class="ct">选择查询日期</text>
        <view class="date-row"><text class="dr-prev" @click="prevDay">‹</text><text class="dr-date">{{fmtDate(date)}}</text><text class="dr-next" @click="nextDay">›</text></view>
      </view>

      <view class="result-card">
        <text class="rc-title">{{selectedZodiac}}·{{fmtDate(date)}} 运势</text>
        <view class="rc-score-row"><text class="rcs-icon">🌟</text><view><text class="rcs-num">{{fortune.score}}分</text><text class="rcs-label">综合运势</text></view></view>
        <view class="rc-grid"><view v-for="d in fortune.dimensions" :key="d.name" class="rcg"><text class="rcg-icon">{{d.icon}}</text><text class="rcg-name">{{d.name}}</text><view class="rcg-bar"><view class="rcg-fill" :style="{width:d.score+'%'}"/></view></view></view>
        <view class="rc-yiji"><text class="rcy-label">宜：</text><text>{{fortune.yi.join('、')}}</text></view>
        <view class="rc-yiji"><text class="rcy-label ji">忌：</text><text>{{fortune.ji.join('、')}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,reactive} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const selectedZodiac=ref('🐭鼠'),date=ref(new Date());const zodiacs=['🐭鼠','🐮牛','🐯虎','🐰兔','🐲龙','🐍蛇','🐴马','🐏羊','🐵猴','🐔鸡','🐶狗','🐷猪'];const fortune=reactive({score:85,yi:['出行','交易','嫁娶','搬家'],ji:['动土','安葬','诉讼'],dimensions:[{name:'事业',icon:'💼',score:88},{name:'财运',icon:'💰',score:75},{name:'感情',icon:'❤️',score:82},{name:'健康',icon:'🏥',score:90}]});function fmtDate(d:Date){return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日'};function prevDay(){const d=new Date(date.value);d.setDate(d.getDate()-1);date.value=d};function nextDay(){const d=new Date(date.value);d.setDate(d.getDate()+1);date.value=d};function goDaily(){uni.navigateTo({url:'/pages/fortune/daily/index'})};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-right{font-size:24rpx;color:#C41E3A}.content{padding:24rpx}.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}
.zodiac-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12rpx}.zg-item{text-align:center;padding:20rpx 12rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;color:#666}.zg-item.sel{background:#C41E3A;color:#fff}
.date-row{display:flex;align-items:center;justify-content:center;gap:32rpx;font-size:28rpx;color:#2C2C2C}.dr-prev,.dr-next{font-size:40rpx;color:#C41E3A;padding:8rpx}.dr-date{font-weight:500}
.result-card{background:linear-gradient(135deg,#C9A96E,#C41E3A);border-radius:24rpx;padding:36rpx;color:#fff}.rc-title{font-size:26rpx;opacity:.9;display:block;margin-bottom:24rpx}.rc-score-row{display:flex;align-items:center;gap:16rpx;margin-bottom:28rpx}.rcs-icon{font-size:56rpx}.rcs-num{font-size:48rpx;font-weight:900;display:block}.rcs-label{font-size:22rpx;opacity:.8}
.rc-grid{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-bottom:28rpx}.rcg{}.rcg-icon{font-size:32rpx;margin-bottom:4rpx;display:block}.rcg-name{font-size:22rpx;opacity:.8;margin-bottom:8rpx;display:block}.rcg-bar{height:8rpx;background:rgba(255,255,255,.3);border-radius:4rpx;overflow:hidden}.rcg-fill{height:100%;background:#fff;border-radius:4rpx}
.rc-yiji{font-size:26rpx;padding:8rpx 0}.rcy-label{font-weight:600}.rcy-label.ji{color:rgba(255,255,255,.5)}</style>
