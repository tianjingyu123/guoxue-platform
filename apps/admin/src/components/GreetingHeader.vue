<template>
  <div class="greeting-header">
    <div class="greeting-main">
      <h2 class="greeting-text">{{ greeting }}，{{ username || '管理员' }}</h2>
      <p class="greeting-date">{{ dateStr }}</p>
    </div>
    <div class="greeting-extra" v-if="solarTerm">
      <el-tag type="warning" effect="plain" size="large">今日{{ solarTerm }}</el-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ username?: string }>()

const now = new Date()
const hour = now.getHours()

const greeting = computed(() => {
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了'
})

const dateStr = computed(() => {
  const weekNames = ['日', '一', '二', '三', '四', '五', '六']
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const w = weekNames[now.getDay()]
  return `${y}年${m}月${d}日 星期${w}`
})

// 简单节气判断 — 按大致日期范围
const solarTerms: [string, number, number][] = [
  ['小寒', 1, 5], ['大寒', 1, 20], ['立春', 2, 4], ['雨水', 2, 19],
  ['惊蛰', 3, 5], ['春分', 3, 20], ['清明', 4, 5], ['谷雨', 4, 20],
  ['立夏', 5, 5], ['小满', 5, 21], ['芒种', 6, 6], ['夏至', 6, 21],
  ['小暑', 7, 7], ['大暑', 7, 22], ['立秋', 8, 7], ['处暑', 8, 23],
  ['白露', 9, 7], ['秋分', 9, 23], ['寒露', 10, 8], ['霜降', 10, 23],
  ['立冬', 11, 7], ['小雪', 11, 22], ['大雪', 12, 7], ['冬至', 12, 22],
]

const solarTerm = computed(() => {
  const m = now.getMonth() + 1
  const d = now.getDate()
  for (let i = solarTerms.length - 1; i >= 0; i--) {
    const [name, sm, sd] = solarTerms[i]
    if (m > sm || (m === sm && d >= sd)) return name
  }
  return ''
})
</script>

<style scoped>
.greeting-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.greeting-text { font-size: 22px; font-weight: 600; color: #1A1A1A; margin: 0; }
.greeting-date { font-size: 13px; color: #999; margin: 4px 0 0; }
</style>
