<template>
  <el-card
    :class="['stats-card', { 'is-loading': loading }]"
    shadow="hover"
  >
    <div class="stats-inner">
      <div
        class="stats-icon"
        :style="{ background: color }"
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
import AnimatedCounter from './AnimatedCounter.vue'

defineProps<{
  title: string
  value: number | string
  icon: any
  color: string
  loading?: boolean
  trend?: number
  subtitle?: string
}>()
</script>

<style scoped>
.stats-card {
  cursor: default;
  transition: transform var(--transition-spring), box-shadow var(--transition-base);
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
}
/* 顶部金线装饰 */
.stats-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-gold-light), transparent);
  opacity: 0;
  transition: opacity var(--transition-base);
}
.stats-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}
.stats-card:hover::before {
  opacity: 1;
}

.stats-inner {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

/* ── 图标 ── */
.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  position: relative;
}
/* 图标发光 */
.stats-icon::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 14px;
  background: inherit;
  opacity: 0.12;
  z-index: -1;
}

/* ── 信息 ── */
.stats-info {
  flex: 1;
  min-width: 0;
}
.stats-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text-title);
  line-height: 1.2;
  font-family: var(--font-family);
  font-variant-numeric: tabular-nums;
}
.stats-title {
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
  margin-top: 2px;
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
  border-radius: var(--radius-sm);
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
