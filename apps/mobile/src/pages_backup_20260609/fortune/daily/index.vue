<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">每日运势</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view class="header-card">
        <text class="hc-date">{{today}}</text><text class="hc-zodiac">生肖运势</text>
        <view class="hc-fortune"><text class="hf-icon">🌟</text><view><text class="hf-score">{{fortune.score}}分</text><text class="hf-label">综合运势</text></view></view>
      </view>

      <view class="card"><text class="card-title">今日宜忌</text>
        <view class="yi-ji"><view><text class="yj-label">✅ 宜</text><text v-for="y in fortune.yi" :key="y" class="yj-item">{{y}}</text></view><view><text class="yj-label">❌ 忌</text><text v-for="j in fortune.ji" :key="j" class="yj-item">{{j}}</text></view></view>
      </view>

      <view class="card"><text class="card-title">各维度运势</text>
        <view v-for="d in fortune.dimensions" :key="d.name" class="dim-row"><text class="dr-name">{{d.icon}} {{d.name}}</text><view class="dr-bar"><view class="dr-fill" :style="{width:d.score+'%'}"/></view><text class="dr-score">{{d.score}}%</text></view>
      </view>

      <view class="card"><text class="card-title">开运建议</text>
        <view class="tips"><text v-for="t in fortune.tips" :key="t" class="tip">{{t}}</text></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const today=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});const fortune=ref({score:85,yi:['出行','交易','嫁娶','搬家'],ji:['动土','安葬','诉讼','开业'],dimensions:[{name:'💼 事业',score:88},{name:'💰 财运',score:75},{name:'❤️ 感情',score:82},{name:'🏥 健康',score:90},{name:'📚 学业',score:85}],tips:['今日幸运色：红色','幸运数字：8','吉时：上午9-11点','建议多与贵人交流']});function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}
.header-card{background:linear-gradient(135deg,#C9A96E,#C41E3A);border-radius:24rpx;padding:36rpx;color:#fff;text-align:center;margin-bottom:24rpx}.hc-date{font-size:24rpx;opacity:.8;display:block}.hc-zodiac{font-size:20rpx;opacity:.7;margin-top:4rpx;display:block}.hc-fortune{display:flex;align-items:center;justify-content:center;gap:16rpx;margin-top:24rpx}.hf-icon{font-size:56rpx}.hf-score{font-size:48rpx;font-weight:900;display:block}.hf-label{font-size:22rpx;opacity:.8}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}
.yi-ji{display:flex;gap:48rpx}.yj-label{font-size:26rpx;font-weight:600;margin-bottom:12rpx;display:block}.yj-item{font-size:24rpx;color:#666;padding:8rpx 0;display:block}
.dim-row{display:flex;align-items:center;gap:12rpx;padding:12rpx 0}.dr-name{font-size:24rpx;color:#2C2C2C;width:120rpx}.dr-bar{flex:1;height:12rpx;background:#F5F1EB;border-radius:6rpx;overflow:hidden}.dr-fill{height:100%;background:linear-gradient(90deg,#C9A96E,#C41E3A);border-radius:6rpx}.dr-score{font-size:22rpx;color:#999;width:60rpx;text-align:right}
.tips{display:flex;flex-wrap:wrap;gap:12rpx}.tip{padding:12rpx 24rpx;background:#F5F1EB;border-radius:40rpx;font-size:22rpx;color:#666}</style>
