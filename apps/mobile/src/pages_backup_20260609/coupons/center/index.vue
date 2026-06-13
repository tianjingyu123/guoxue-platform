<template>
  <view class="page">
    <view class="top-banner"><view class="tb-nav"><view class="tbn-left" @click="goBack"><text>←</text></view><text class="tbn-title">🎁 领券中心</text><text class="tbn-right" @click="goMyCoupons">我的券</text></view>
      <view class="points-card"><view class="pc-left"><text class="pc-icon">🪙</text><view><text class="pc-label">我的积分</text><text class="pc-val">{{userPoints}}</text></view></view><view class="pc-btn">兑换礼品</view></view>
    </view>

    <view class="tab-row"><view v-for="t in tabs" :key="t.key" class="tab" :class="{act:activeTab===t.key}" @click="activeTab=t.key"><text>{{t.label}}</text></view></view>

    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px - 56px)'}">
      <view v-if="activeTab==='points'" class="list">
        <text class="sec-title">可用积分：{{userPoints}}</text>
        <view v-for="c in pointsCoupons" :key="c.id" class="cp-card"><view class="cp-amount gold">¥{{c.amount}}</view><view class="cp-info"><text class="cp-scope">{{c.scope}}</text><text class="cp-cond">{{c.minAmount?'满'+c.minAmount+'可用':'无门槛'}}</text><text class="cp-points">🪙{{c.points}}积分</text></view><view class="cp-btn" :class="{dis:userPoints<c.points||receivedIds.includes(c.id)}" @click="handleReceive(c.id)"><text>{{receivedIds.includes(c.id)?'已兑换':userPoints>=c.points?'兑换':'积分不足'}}</text></view></view>

        <text class="sec-title mt">👑 会员专属券</text>
        <view v-for="c in vipCoupons" :key="c.id" class="cp-card vip"><view class="cp-amount purple">¥{{c.amount}}</view><view class="cp-info"><text class="cp-scope">{{c.scope}}</text><text class="cp-cond">{{c.minAmount?'满'+c.minAmount+'可用':'无门槛'}}</text><text class="cp-vip">VIP{{c.vipLevel}}专享</text></view><view class="cp-btn" :class="{dis:userVipLevel<c.vipLevel||receivedIds.includes(c.id)}" @click="handleReceive(c.id)"><text>{{receivedIds.includes(c.id)?'已领取':userVipLevel>=c.vipLevel?'领取':'需VIP'+c.vipLevel}}</text></view></view>
      </view>

      <view v-else class="list">
        <view v-for="c in filteredCoupons" :key="c.id" class="coupon-card" :class="{got:receivedIds.includes(c.id)}">
          <view class="cc-left"><text v-if="c.type==='折扣'" class="cc-amount">{{c.amount}}折</text><text v-else class="cc-amount">¥{{c.amount}}</text><text class="cc-cond">{{c.minAmount?'满'+c.minAmount+'可用':'无门槛'}}</text></view>
          <view class="cc-info"><view class="cc-badges"><text class="cc-type">{{c.type}}券</text><text v-if="c.tag" class="cc-tag">{{c.tag}}</text></view><text class="cc-scope">{{c.scope}}</text><text class="cc-date">🕐{{c.startDate}}-{{c.endDate}}</text></view>
          <view class="cc-action"><view v-if="receivedIds.includes(c.id)" class="cc-received">✓</view><view v-else class="cc-get-btn" @click="handleReceive(c.id)">领取</view></view>
        </view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
const activeTab=ref<'all'|'course'|'product'|'points'>('all'),receivedIds=ref<number[]>([]),userPoints=ref(1580),userVipLevel=ref(1)
const tabs=[{key:'all' as const,label:'全部'},{key:'course' as const,label:'课程券'},{key:'product' as const,label:'商品券'},{key:'points' as const,label:'积分兑'}]

const availableCoupons=[{id:1,amount:50,type:'满减' as const,minAmount:299,scope:'全部课程',startDate:'2026.05.10',endDate:'2026.06.30',tag:'热门'},{id:2,amount:20,type:'满减' as const,minAmount:99,scope:'全部商品',startDate:'2026.05.10',endDate:'2026.05.31',tag:'限时'},{id:3,amount:8,type:'折扣' as const,scope:'指定课程',startDate:'2026.05.10',endDate:'2026.06.15',tag:''},{id:4,amount:10,type:'无门槛' as const,scope:'全部商品',startDate:'2026.05.10',endDate:'2026.05.20',tag:'新人'},{id:5,amount:100,type:'满减' as const,minAmount:599,scope:'精品课程',startDate:'2026.05.10',endDate:'2026.07.31',tag:''}]
const pointsCoupons=[{id:101,amount:5,type:'无门槛',scope:'全部商品',points:500},{id:102,amount:15,type:'满减',minAmount:99,scope:'全部商品',points:1000},{id:103,amount:30,type:'满减',minAmount:199,scope:'全部课程',points:2000}]
const vipCoupons=[{id:201,amount:88,type:'满减',minAmount:388,scope:'全场通用',vipLevel:2},{id:202,amount:9,type:'折扣',scope:'精品课程',vipLevel:3}]

const filteredCoupons=computed(()=>availableCoupons.filter(c=>activeTab.value==='all'?true:activeTab.value==='course'?c.scope.includes('课程'):c.scope.includes('商品')))

function handleReceive(id:number){if(!receivedIds.value.includes(id))receivedIds.value.push(id)}
function goBack(){uni.navigateBack()}
function goMyCoupons(){uni.navigateTo({url:'/pages/shop/coupons/index'})}
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.top-banner{background:linear-gradient(135deg,#C41E3A,#C9A96E);padding:24rpx}
.tb-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:20rpx}
.tbn-left{font-size:36rpx;color:#fff}.tbn-title{font-size:34rpx;font-weight:700;color:#fff}.tbn-right{font-size:24rpx;color:rgba(255,255,255,.8)}
.points-card{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.1);border-radius:20rpx;padding:20rpx;border:1px solid rgba(255,255,255,.2)}
.pc-left{display:flex;align-items:center;gap:16rpx}.pc-icon{font-size:44rpx}.pc-label{font-size:22rpx;color:rgba(255,255,255,.7);display:block}.pc-val{font-size:36rpx;font-weight:700;color:#fff}
.pc-btn{background:rgba(255,255,255,.2);color:#fff;padding:16rpx 28rpx;border-radius:40rpx;font-size:24rpx}
.tab-row{display:flex;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:30}
.tab{flex:1;text-align:center;padding:20rpx;font-size:26rpx;color:#999;position:relative}
.tab.act{color:#C41E3A;font-weight:500}.tab.act::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:48rpx;height:4rpx;background:#C41E3A;border-radius:2rpx}
.content{padding:24rpx}
.list{}.sec-title{font-size:24rpx;color:#999;margin-bottom:16rpx;display:block}.mt{margin-top:32rpx}

.cp-card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:20rpx;padding:20rpx;margin-bottom:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.cp-amount{width:120rpx;height:120rpx;border-radius:20rpx;display:flex;align-items:center;justify-content:center;font-size:36rpx;font-weight:700;color:#fff;flex-shrink:0}.cp-amount.gold{background:linear-gradient(135deg,#f59e0b,#d97706)}.cp-amount.purple{background:linear-gradient(135deg,#a855f7,#ec4899)}
.cp-info{flex:1}.cp-scope{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cp-cond{font-size:22rpx;color:#999;margin-top:4rpx}.cp-points{font-size:22rpx;color:#f59e0b;margin-top:4rpx}.cp-vip{font-size:20rpx;padding:2rpx 10rpx;background:linear-gradient(90deg,#f59e0b,#d97706);color:#fff;border-radius:6rpx;display:inline-block;margin-top:4rpx}
.cp-btn{padding:16rpx 28rpx;border-radius:40rpx;font-size:24rpx;background:#C41E3A;color:#fff;flex-shrink:0}.cp-btn.dis{background:#D9D9D9;color:#999}

.coupon-card{display:flex;background:linear-gradient(90deg,#C41E3A,#C41E3A);border-radius:20rpx;overflow:hidden;margin-bottom:16rpx;position:relative}
.coupon-card.got{background:linear-gradient(90deg,#ccc,#bbb)}
.cc-left{width:200rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;padding:24rpx}.cc-amount{font-size:48rpx;font-weight:700}.cc-cond{font-size:22rpx;opacity:.8;margin-top:4rpx}
.cc-info{flex:1;background:#fff;border-radius:0 20rpx 20rpx 0;padding:20rpx 24rpx}.cc-badges{display:flex;gap:8rpx;margin-bottom:8rpx}.cc-type{font-size:20rpx;padding:2rpx 10rpx;border:1px solid rgba(196,30,58,.3);color:#C41E3A;border-radius:6rpx}.cc-tag{font-size:20rpx;padding:2rpx 10rpx;background:#ef4444;color:#fff;border-radius:6rpx}
.cc-scope{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cc-date{font-size:20rpx;color:#999;margin-top:4rpx}
.cc-action{display:flex;align-items:center;padding:0 24rpx 0 0}.cc-get-btn{background:#C41E3A;color:#fff;padding:16rpx 32rpx;border-radius:40rpx;font-size:24rpx}.cc-received{width:48rpx;height:48rpx;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24rpx}
</style>
