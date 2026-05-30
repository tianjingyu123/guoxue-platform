<template>
  <view class="page">
    <view class="hero" :style="{ backgroundImage: `url(${activity.banner || ''})` }">
      <text class="hero-title">{{ activity.title || '节日活动' }}</text>
      <text class="hero-time">{{ activity.startDate }} - {{ activity.endDate }}</text>
    </view>
    <view class="section">
      <text class="title">活动详情</text>
      <text class="desc">{{ activity.description || '' }}</text>
    </view>
    <view class="section"><text class="title">活动规则</text>
      <view v-for="(r, idx) in rules" :key="idx" class="rule"><text>{{ idx + 1 }}. {{ r }}</text></view>
    </view>
    <button class="btn-join" @click="join">立即参与</button>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const activity = ref({ title: '端午祈福活动', startDate: '2026-05-30', endDate: '2026-06-05', banner: '', description: '参与端午传统文化活动，赢取限定礼品！' })
const rules = ['活动期间每日签到可参与抽奖', '分享活动页面可获得额外抽奖机会', '奖品将在活动结束后7个工作日内发放']
function join() { uni.showToast({ title: '已参与活动' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.hero { padding: 40px 20px; background: linear-gradient(135deg, #C41E3A, #C9A96E); background-size: cover; color: #fff; text-align: center; }
.hero-title { font-size: 22px; font-weight: bold; display: block; }
.hero-time { font-size: 13px; opacity: 0.8; display: block; margin-top: 8px; }
.section { background: #fff; padding: 16px; margin-top: 10px; }
.title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 8px; }
.desc { font-size: 13px; color: #666; line-height: 1.6; }
.rule { font-size: 13px; color: #666; padding: 6px 0; }
.btn-join { margin: 20px 12px; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 14px; font-size: 16px; }
</style>
