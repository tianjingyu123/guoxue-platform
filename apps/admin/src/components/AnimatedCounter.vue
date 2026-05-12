<template>
  <span class="animated-counter" :class="{ 'pulse': highlight }">{{ displayValue }}</span>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  duration?: number
  highlight?: boolean
  format?: 'number' | 'currency'
}>(), { duration: 800, highlight: false, format: 'number' })

const displayValue = ref('0')

function formatNum(n: number) {
  if (props.format === 'currency') return '¥' + n.toLocaleString()
  return n.toLocaleString()
}

function animate(from: number, to: number) {
  const start = performance.now()
  const dur = props.duration
  function tick(now: number) {
    const elapsed = now - start
    const progress = Math.min(elapsed / dur, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
    const current = Math.round(from + (to - from) * eased)
    displayValue.value = formatNum(current)
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

onMounted(() => { displayValue.value = formatNum(props.value) })
watch(() => props.value, (nv, ov) => { animate(ov ?? 0, nv ?? 0) })
</script>

<style scoped>
.animated-counter { font-feature-settings: "tnum"; }
.pulse { animation: pulse 0.6s ease-in-out; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); color: #FF6B6B; } }
</style>
