<template>
  <view class="page">
    <view class="cover-wrap"><view class="cover-img"/><view class="cover-nav"><text class="cn-back" @click="goBack">←</text><text class="cn-share" @click="onShare">📤</text></view></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 280rpx - 140rpx)'}">
      <view class="info-card">
        <view class="ic-tag">热门</view><text class="ic-title">{{course.title}}</text>
        <view class="ic-instructor"><text class="ici-avatar">{{course.instructor.name[0]}}</text><text class="ici-name">{{course.instructor.name}}·{{course.instructor.title}}</text></view>
        <view class="ic-price-row"><text class="ic-price">¥{{course.price}}</text><text class="ic-orig">¥{{course.originalPrice}}</text></view>
        <view class="ic-stats"><text>⭐{{course.rating}}</text><text>👥{{course.students.toLocaleString()}}人学习</text><text>📚{{course.chapters}}课时</text></view>
      </view>
      <view class="card"><text class="card-title">课程介绍</text><text class="desc-text">{{course.description}}</text></view>
      <view class="card"><text class="card-title">学习目标</text><text v-for="o in course.objectives" :key="o" class="obj-item">✓ {{o}}</text></view>
      <view class="card"><text class="card-title">适合人群</text><text v-for="s in course.suitable" :key="s" class="obj-item">👤 {{s}}</text></view>
      <view class="card"><text class="card-title">课程目录</text>
        <view v-for="c in chapters" :key="c.id" class="ch-item" @click="toggleCh(c.id)">
          <view class="ch-head"><text class="ch-num">{{completedIn(c)}}/{{c.lessons.length}}</text><view class="ch-info"><text class="ch-title">{{c.title}}</text><text class="ch-dur">🕐{{c.duration}}分钟</text></view><text class="ch-arrow" :class="{exp:expanded.has(c.id)}">▼</text></view>
          <view v-if="expanded.has(c.id)" class="ch-body"><view v-for="l in c.lessons" :key="l.id" class="ch-lesson"><text class="cl-icon">{{l.isFree?'🎬':'🔒'}}</text><text class="cl-title">{{l.title}}</text><text class="cl-dur">{{l.duration}}分钟</text></view></view>
        </view>
      </view>
      <view class="card"><text class="card-title">学员评价</text>
        <view v-for="r in reviews" :key="r.id" class="review-item"><text class="ri-avatar">{{r.user.name[0]}}</text><view class="ri-info"><text class="ri-name">{{r.user.name}}</text><text class="ri-stars">⭐{{r.rating}}</text><text class="ri-content">{{r.content}}</text></view></view>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
    <view class="bottom-bar"><view class="bb-price">¥{{course.price}}</view><view class="bb-btn" @click="goBuy">立即购买</view></view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const course={title:'八字命理入门到精通',instructor:{name:'张明远',title:'资深命理师'},price:299,originalPrice:599,students:12860,rating:4.9,chapters:32,category:'命理',description:'本课程由资深命理师张明远老师主讲，从零基础开始，系统讲解八字命理的核心理论与实战技巧。',objectives:['掌握天干地支的基本概念','理解八字排盘的原理和方法','学会分析日主强弱','能够独立进行命盘分析'],suitable:['对命理学感兴趣的初学者','希望系统学习八字的爱好者','想要提升命理水平的从业者']}
const chapters=ref([{id:'c1',title:'第一章 八字命理概述',duration:45,isFree:true,lessons:[{id:'l1',title:'1.1 什么是八字命理',duration:15,isFree:true},{id:'l2',title:'1.2 八字命理的历史渊源',duration:18,isFree:true},{id:'l3',title:'1.3 学习八字的正确方法',duration:12,isFree:false}]},{id:'c2',title:'第二章 天干地支基础',duration:68,isFree:false,lessons:[{id:'l4',title:'2.1 十天干详解',duration:22,isFree:false},{id:'l5',title:'2.2 十二地支详解',duration:25,isFree:false},{id:'l6',title:'2.3 干支配合规律',duration:21,isFree:false}]}])
const reviews=[{id:'r1',user:{name:'易学爱好者'},rating:5,content:'张老师讲得非常清晰！'},{id:'r2',user:{name:'命理新手'},rating:5,content:'从零开始学完全能听懂。'}]
const expanded=ref(new Set(['c1']))

function completedIn(c:any){return c.lessons.length}
function toggleCh(id:string){const s=new Set(expanded.value);s.has(id)?s.delete(id):s.add(id);expanded.value=s}
function onShare(){}
function goBuy(){uni.navigateTo({url:'/pages/courses/purchase-confirm/index'})}

function goBack(){uni.navigateBack()}
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.cover-wrap{position:relative;height:320rpx}.cover-img{width:100%;height:100%;background:linear-gradient(135deg,rgba(196,30,58,.2),rgba(201,169,110,.15))}.cover-nav{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;padding:20rpx 24rpx}.cn-back,.cn-share{width:64rpx;height:64rpx;border-radius:50%;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28rpx}
.content{padding:24rpx}
.info-card{margin-top:-80rpx;background:#fff;border-radius:24rpx;padding:28rpx;box-shadow:0 4rpx 24rpx rgba(0,0,0,.08);margin-bottom:20rpx;position:relative;z-index:10}.ic-tag{display:inline-block;font-size:20rpx;padding:4rpx 14rpx;background:#ef4444;color:#fff;border-radius:6rpx;margin-bottom:12rpx}.ic-title{font-size:34rpx;font-weight:700;color:#2C2C2C;display:block;margin-bottom:12rpx}.ic-instructor{display:flex;align-items:center;gap:8rpx;margin-bottom:16rpx}.ici-avatar{width:48rpx;height:48rpx;border-radius:50%;background:rgba(196,30,58,.1);display:flex;align-items:center;justify-content:center;font-size:22rpx;color:#C41E3A}.ici-name{font-size:24rpx;color:#999}.ic-price-row{display:flex;align-items:baseline;gap:12rpx;margin-bottom:12rpx}.ic-price{font-size:44rpx;font-weight:700;color:#C41E3A}.ic-orig{font-size:26rpx;color:#999;text-decoration:line-through}.ic-stats{display:flex;gap:24rpx;font-size:22rpx;color:#999}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}
.desc-text{font-size:26rpx;color:#666;line-height:1.6}.obj-item{font-size:26rpx;color:#666;display:block;margin-bottom:8rpx}
.ch-item{border-bottom:1px solid #F5F1EB;padding:16rpx 0}.ch-head{display:flex;align-items:center;gap:16rpx}.ch-num{width:52rpx;height:52rpx;border-radius:50%;background:rgba(196,30,58,.08);display:flex;align-items:center;justify-content:center;font-size:22rpx;font-weight:600;color:#C41E3A;flex-shrink:0}.ch-info{flex:1}.ch-title{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.ch-dur{font-size:20rpx;color:#999}.ch-arrow{font-size:22rpx;color:#999;transition:transform .2s}.ch-arrow.exp{transform:rotate(180deg)}.ch-body{padding:0 0 0 68rpx}.ch-lesson{display:flex;align-items:center;gap:12rpx;padding:14rpx 0}.cl-icon{font-size:22rpx}.cl-title{font-size:24rpx;color:#666;flex:1}.cl-dur{font-size:20rpx;color:#999}
.review-item{display:flex;gap:12rpx;margin-bottom:16rpx}.ri-avatar{width:56rpx;height:56rpx;border-radius:50%;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:24rpx;color:#999;flex-shrink:0}.ri-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.ri-stars{font-size:22rpx;color:#C9A96E}.ri-content{font-size:24rpx;color:#666;margin-top:4rpx}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;gap:24rpx;padding:20rpx 24rpx;background:#fff;border-top:1px solid #E8E0D5;z-index:50}.bb-price{font-size:40rpx;font-weight:700;color:#C41E3A}.bb-btn{flex:1;padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:28rpx;font-weight:600}
</style>
