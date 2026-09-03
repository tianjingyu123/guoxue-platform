<template>
  <el-card
    :class="['stats-card', { 'is-loading': loading }]"
    shadow="never"
    :style="{ '--stats-color': color }"
  >
    <div class="stats-inner">
      <div
        class="stats-icon"
      >
        <el-icon :size="22">
          <component :is="icon" />
        </el-icon>
      </div>
      <div class="stats-info">
        <AnimatedCounter
          v-if="typeof value === 'number' && !loading"
          :value="value"
          class="stats-value"
        />
        <div
          v-else
          class="stats-value"
        >
          {{ loading ? '-' : value }}
        </div>
        <div class="stats-title">
          {{ title }}
        </div>
      </div>
      <div
        v-if="trend !== undefined"
        :class="['stats-trend', trend >= 0 ? 'is-up' : 'is-down']"
      >
        <span class="trend-icon">{{ trend >= 0 ? '↑' : '↓' }}</span>
        <span class="trend-value">{{ Math.abs(trend) }}%</span>
      </div>
    </div>
    <div
      v-if="subtitle"
      class="stats-subtitle"
    >
      {{ subtitle }}
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import AnimatedCounter from './AnimatedCounter.vue'

defineProps<{
  title: string
  value: number | string
  icon: Component
  color: string
  loading?: boolean
  trend?: number
  subtitle?: string
}>()
</script>

<style scoped>
.stats-card {
  cursor: default;
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
  border-radius: var(--radius-lg) !important;
  position: relative;
  overflow: hidden;
  min-height: 122px;
  background: rgba(255,255,255,.92);
}
.stats-card::before {
  content: '';
  position: absolute;
  top: 18px;
  right: 18px;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--stats-color) 10%, transparent);
  filter: blur(1px);
}
.stats-card:hover {
  border-color: color-mix(in srgb, var(--stats-color) 24%, var(--color-divider)) !important;
  box-shadow: var(--shadow-md) !important;
}

.stats-inner {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* ── 图标 ── */
.stats-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--stats-color);
  background: color-mix(in srgb, var(--stats-color) 11%, #fff);
  flex-shrink: 0;
  position: relative;
}
/* 图标发光 */

/* ── 信息 ── */
.stats-info {
  flex: 1;
  min-width: 0;
}
.stats-value {
  font-size: 28px;
  font-weight: 650;
  color: var(--color-text-title);
  line-height: 1.2;
  font-family: var(--font-family-number);
  letter-spacing: -.035em;
  font-variant-numeric: tabular-nums;
}
.stats-title {
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
  margin-top: 4px;
}
.is-loading .stats-value {
  color: var(--color-text-placeholder);
}

/* ── 趋势 ── */
.stats-trend {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-small);
  font-weight: 600;
  flex-shrink: 0;
}
.stats-trend.is-up {
  color: var(--color-success);
  background: var(--color-success-light);
}
.stats-trend.is-down {
  color: var(--color-error);
  background: var(--color-error-light);
}
.trend-icon { font-size: 12px; }

/* ── 副标题 ── */
.stats-subtitle {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
}
</style>
