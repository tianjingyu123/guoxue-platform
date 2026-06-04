<template>
  <div
    v-if="visible"
    class="anomaly-alert"
    :class="'anomaly-' + level"
  >
    <span class="anomaly-dot" />
    <span class="anomaly-text"><slot />{{ text }}</span>
    <span
      v-if="count > 0"
      class="anomaly-count"
    >{{ count > 99 ? '99+' : count }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  text?: string
  count?: number
  level?: 'critical' | 'warning' | 'info'
  visible?: boolean
}>(), { text: '', count: 0, level: 'warning', visible: true })
</script>

<style scoped>
.anomaly-alert { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; }
.anomaly-critical { background: rgba(255, 77, 79, 0.08); color: #FF4D4F; }
.anomaly-warning { background: rgba(250, 173, 20, 0.08); color: #FAAD14; }
.anomaly-info { background: rgba(24, 144, 255, 0.08); color: #1890FF; }
.anomaly-dot { width: 8px; height: 8px; border-radius: 50%; }
.anomaly-critical .anomaly-dot { background: #FF4D4F; animation: pulse-dot 1.2s infinite; }
.anomaly-warning .anomaly-dot { background: #FAAD14; animation: pulse-dot 1.8s infinite; }
.anomaly-info .anomaly-dot { background: #1890FF; }
.anomaly-count { margin-left: auto; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.anomaly-critical .anomaly-count { background: #FF4D4F; color: #fff; }
.anomaly-warning .anomaly-count { background: #FAAD14; color: #fff; }
.anomaly-info .anomaly-count { background: #1890FF; color: #fff; }
@keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }
</style>
