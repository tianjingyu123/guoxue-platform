<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">浏览历史</text><text class="nav-clear" @click="clearAll">清空</text></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px)'}">
      <view v-for="(dayItems,date) in groupedHistory" :key="date">
        <text class="date-label">{{date}}</text>
        <view v-for="h in dayItems" :key="h.id" class="hist-item">
          <text class="hi-icon">{{h.type==='article'?'📄':h.type==='video'?'📹':h.type==='course'?'📚':'📻'}}</text>
          <view class="hi-info"><text class="hi-title">{{h.title}}</text><text class="hi-meta">{{h.typeLabel}}·{{h.time}}</text></view>
        </view>
      </view>
      <view v-if="Object.keys(groupedHistory).length===0" class="empty"><text class="em-icon">🕐</text><text class="em-text">暂无浏览记录</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const history=ref([{id:1,title:'八字命理入门：如何看懂你的命盘',type:'article',typeLabel:'文章',date:'今天',time:'14:30'},{id:2,title:'紫微斗数与八字的区别',type:'article',typeLabel:'文章',date:'今天',time:'11:20'},{id:3,title:'八字入门精讲·第一章',type:'course',typeLabel:'课程',date:'昨天',time:'20:15'},{id:4,title:'风水知识：客厅布局禁忌',type:'article',typeLabel:'文章',date:'昨天',time:'09:00'}]);const groupedHistory=computed(()=>{const g:any={};history.value.forEach(h=>{if(!g[h.date])g[h.date]=[];g[h.date].push(h)});return g});function clearAll(){history.value=[]};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-clear{font-size:24rpx;color:#C41E3A}.content{padding:24rpx}.date-label{font-size:24rpx;color:#999;margin:16rpx 0 12rpx;display:block}.hist-item{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:16rpx;padding:20rpx;margin-bottom:8rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.hi-icon{font-size:36rpx;flex-shrink:0}.hi-title{font-size:26rpx;color:#2C2C2C;display:block}.hi-meta{font-size:20rpx;color:#999;margin-top:4rpx}.empty{display:flex;flex-direction:column;align-items:center;padding:160rpx 0}.em-icon{font-size:80rpx;opacity:.3;margin-bottom:16rpx}.em-text{font-size:26rpx;color:#999}
</style>
