<template>
  <view class="page">
    <view class="fortune-card">
      <text class="date">{{ today }}</text>
      <text class="title">今日运势</text>
      <text class="level" :class="levelKey">{{ levelText }}</text>
      <text class="score">{{ score }}分</text>
    </view>
    <view class="section" v-if="detail">
      <view class="aspect" v-for="a in aspects" :key="a.key"><text class="a-label">{{ a.label }}</text><text class="a-val">{{ a.value }}</text></view>
      <text class="advice">今日建议：{{ detail.advice || '' }}</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const today = ref(new Date().toISOString().slice(0, 10))
const levelText = ref('吉'); const levelKey = ref('good'); const score = ref(85); const detail = ref<any>(null)
const aspects = ref<any[]>([{ key:'love', label:'爱情', value:'良好' }, { key:'career', label:'事业', value:'顺利' }, { key:'wealth', label:'财运', value:'平稳' }, { key:'health', label:'健康', value:'良好' }])
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.fortune-card { background: linear-gradient(135deg, #C41E3A, #C9A96E); border-radius: 16px; padding: 30px 20px; text-align: center; color: #fff; margin-bottom: 12px; }
.date { font-size: 12px; opacity: 0.8; display: block; }
.title { font-size: 16px; display: block; margin: 6px 0; }
.level { font-size: 36px; font-weight: bold; display: block; }
.score { font-size: 14px; opacity: 0.9; display: block; margin-top: 4px; }
.section { background: #fff; border-radius: 12px; padding: 16px; }
.aspect { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f8f8f8; font-size: 14px; }
.a-label { color: #666; }
.a-val { color: #C9A96E; font-weight: 500; }
.advice { font-size: 13px; color: #666; display: block; margin-top: 12px; padding-top: 10px; border-top: 1px dashed #eee; }
</style>
