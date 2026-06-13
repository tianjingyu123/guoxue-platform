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
.anomaly-alert {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-caption);
  font-weight: 500;
}
.anomaly-critical { background: var(--color-error-light); color: var(--color-error); }
.anomaly-warning { background: var(--color-warning-light); color: var(--color-warning); }
.anomaly-info { background: var(--color-info-light); color: var(--color-info); }
.anomaly-dot { width: 8px; height: 8px; border-radius: 50%; }
.anomaly-critical .anomaly-dot { background: var(--color-error); animation: pulse-dot 1.2s infinite; }
.anomaly-warning .anomaly-dot { background: var(--color-warning); animation: pulse-dot 1.8s infinite; }
.anomaly-info .anomaly-dot { background: var(--color-info); }
.anomaly-count {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: var(--font-size-small);
  font-weight: 600;
}
.anomaly-critical .anomaly-count { background: var(--color-error); color: #fff; }
.anomaly-warning .anomaly-count { background: var(--color-warning); color: #fff; }
.anomaly-info .anomaly-count { background: var(--color-info); color: #fff; }
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.3); }
}
</style>
