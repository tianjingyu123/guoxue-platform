<template>
  <view class="page">
    <view class="nav"><text class="n-back" @click="goBack">←</text><text class="n-title">我的预约</text><view style="width:48rpx"/></view>
    <view class="tab-row"><text v-for="t in tabs" :key="t.key" class="tab" :class="{act:tab===t.key}" @click="tab=t.key">{{t.label}}</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="r in items" :key="r.id" class="card">
        <view class="ch"><text class="ch-icon">{{r.icon}}</text><view><text class="ch-title">{{r.title}}</text><text class="ch-expert">{{r.expert}}</text></view><text class="ch-status" :class="'sts-'+r.status">{{statusLabel(r.status)}}</text></view>
        <view class="cm"><text>📅{{r.date}} {{r.time}}</text></view>
      </view>
      <view v-if="items.length===0" class="empty"><text>暂无预约</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const tab=ref('all');const tabs=[{key:'all',label:'全部'},{key:'upcoming',label:'即将进行'},{key:'done',label:'已完成'}];const allItems=[{id:1,title:'八字精批咨询',expert:'周易大师',date:'2024-02-15',time:'10:00',status:'upcoming',icon:'🔮'},{id:2,title:'风水实地勘察',expert:'陈风水',date:'2024-02-20',time:'14:00',status:'upcoming',icon:'🏠'},{id:3,title:'紫微斗数分析',expert:'张玄风',date:'2024-01-20',time:'15:00',status:'done',icon:'⭐'}];const items=computed(()=>tab.value==='all'?allItems:allItems.filter((i:any)=>i.status===tab.value));function statusLabel(s:string){const m:any={upcoming:'即将进行',done:'已完成'};return m[s]};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.n-back{font-size:36rpx;color:#2C2C2C}.n-title{font-size:32rpx;font-weight:600}.tab-row{display:flex;gap:32rpx;padding:16rpx 24rpx}.tab{font-size:24rpx;color:#999;position:relative}.tab.act{color:#C41E3A;font-weight:500}.tab.act::after{content:'';position:absolute;bottom:-16rpx;left:0;right:0;height:4rpx;background:#C41E3A;border-radius:2rpx}.content{padding:24rpx}.card{background:#fff;border-radius:16rpx;padding:24rpx;margin-bottom:12rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.03)}.ch{display:flex;align-items:center;gap:12rpx;margin-bottom:12rpx}.ch-icon{font-size:40rpx}.ch-title{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.ch-expert{font-size:22rpx;color:#999}.ch-status{font-size:20rpx;padding:4rpx 14rpx;border-radius:8rpx;margin-left:auto}.sts-upcoming{background:rgba(59,130,246,.1);color:#3b82f6}.sts-done{background:rgba(34,197,94,.1);color:#22c55e}.cm{font-size:24rpx;color:#999}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
