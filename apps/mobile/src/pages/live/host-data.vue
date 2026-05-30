<template>
  <view class="page">
    <view class="data-cards">
      <view v-for="c in cards" :key="c.label" class="card"><text class="card-value">{{ c.value }}</text><text class="card-label">{{ c.label }}</text></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
const cards = ref([
  { label: '累计直播', value: '0场' }, { label: '总观看', value: '0' },
  { label: '总收入', value: '¥0' }, { label: '粉丝增长', value: '0' },
])
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.data-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.card { background: #fff; border-radius: 12px; padding: 16px; text-align: center; }
.card-value { font-size: 22px; font-weight: bold; color: #C41E3A; display: block; }
.card-label { font-size: 12px; color: #999; margin-top: 4px; display: block; }
</style>
