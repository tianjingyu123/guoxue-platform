<template>
  <view class="page">
    <view class="total-card"><text class="t-label">累计收益</text><text class="t-val">¥{{ total }}</text></view>
    <view class="section"><text class="section-title">收益记录</text>
      <view v-for="r in records" :key="r.id" class="record">
        <text class="r-desc">{{ r.description }}</text>
        <text class="r-amount">+¥{{ r.amount }}</text>
        <text class="r-time">{{ r.createdAt?.slice(0, 10) }}</text>
      </view>
      <EmptyState v-if="!records.length" text="暂无收益记录" />
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import EmptyState from '../../components/EmptyState.vue'
const total = ref(5680);
const records = ref<any[]>([{ id:'1', description:'课程分成-道德经解读', amount:1280, createdAt:'2026-05-20' }, { id:'2', description:'文章打赏', amount:88, createdAt:'2026-05-18' }, { id:'3', description:'会员订阅分成', amount:365, createdAt:'2026-05-15' }])
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.total-card { background: linear-gradient(135deg, #C41E3A, #C9A96E); border-radius: 12px; padding: 24px; text-align: center; color: #fff; margin-bottom: 12px; }
.t-label { font-size: 13px; opacity: 0.8; display: block; }
.t-val { font-size: 36px; font-weight: bold; display: block; margin-top: 4px; }
.section { background: #fff; border-radius: 12px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 10px; }
.record { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8f8f8; }
.r-desc { flex: 1; font-size: 13px; }
.r-amount { font-size: 14px; color: #4CAF50; margin-right: 10px; }
.r-time { font-size: 11px; color: #ccc; }
</style>
