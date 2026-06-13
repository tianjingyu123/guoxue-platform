<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">我的预约</text><view style="width:48rpx"/></view>
    <view class="tab-row"><text v-for="t in tabs" :key="t.key" class="tab" :class="{act:tab===t.key}" @click="tab=t.key">{{t.label}}</text></view>
    <scroll-view scroll-y class="content">
      <view v-for="b in bookings" :key="b.id" class="bk-card">
        <view class="bkc-head"><text class="bkch-icon">{{b.icon}}</text><view><text class="bkch-title">{{b.title}}</text><text class="bkch-expert">{{b.expert}}</text></view><text class="bkch-status" :class="'st-'+b.status">{{statusLabel(b.status)}}</text></view>
        <view class="bkc-info"><text>📅{{b.date}} {{b.time}}</text><text>🕐{{b.duration}}分钟</text></view>
        <view v-if="b.status==='upcoming'" class="bkc-actions"><text @click="cancel(b.id)">取消预约</text><text @click="addCalendar(b.id)">添加到日历</text></view>
      </view>
      <view v-if="bookings.length===0" class="empty"><text>暂无预约</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">import {ref,computed} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const tab=ref('all');const tabs=[{key:'all',label:'全部'},{key:'upcoming',label:'待进行'},{key:'done',label:'已完成'}];const allBookings=[{id:1,title:'连麦咨询',expert:'周易大师',date:'2024-02-15',time:'10:00',duration:30,status:'upcoming',icon:'🎤'},{id:2,title:'线下沙龙',expert:'国学馆',date:'2024-02-20',time:'14:00',duration:120,status:'upcoming',icon:'📚'},{id:3,title:'八字精批',expert:'周易大师',date:'2024-01-20',time:'15:00',duration:45,status:'done',icon:'🔮'}];const bookings=computed(()=>tab.value==='all'?allBookings:allBookings.filter(b=>b.status===tab.value));function statusLabel(s:string){const m:any={upcoming:'待进行',done:'已完成',cancelled:'已取消'};return m[s]};function cancel(id:number){};function addCalendar(id:number){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.tab-row{display:flex;gap:32rpx;padding:16rpx 24rpx}.tab{font-size:24rpx;color:#999;position:relative}.tab.act{color:#C41E3A;font-weight:500}.tab.act::after{content:'';position:absolute;bottom:-16rpx;left:0;right:0;height:4rpx;background:#C41E3A;border-radius:2rpx}.content{padding:24rpx}.bk-card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.bkc-head{display:flex;align-items:center;gap:12rpx;margin-bottom:16rpx}.bkch-icon{font-size:40rpx}.bkch-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.bkch-expert{font-size:22rpx;color:#999}.bkch-status{font-size:20rpx;padding:4rpx 14rpx;border-radius:8rpx;margin-left:auto}.st-upcoming{background:rgba(59,130,246,.1);color:#3b82f6}.st-done{background:rgba(34,197,94,.1);color:#22c55e}.bkc-info{display:flex;gap:24rpx;font-size:24rpx;color:#999;margin-bottom:16rpx}.bkc-actions{display:flex;gap:24rpx;padding-top:16rpx;border-top:1px solid #F5F1EB;font-size:24rpx;color:#999}.empty{padding:160rpx 0;text-align:center;font-size:26rpx;color:#999}
</style>
