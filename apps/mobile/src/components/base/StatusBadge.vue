<template>
  <!-- 状态徽章 - 严格遵守设计令牌颜色规范 -->
  <text
    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
    :class="variantClass"
  ><slot>{{ label }}</slot></text>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'success' | 'active' | 'warning' | 'danger' | 'muted'
    | 'operator' | 'institute' | 'live' | 'station' | 'gold'
  label?: string
}>(), { variant: 'muted', label: '' })

const variantClass = computed(() => ({
  success:   'bg-chart-4/15 text-chart-4',
  active:    'bg-primary/10 text-primary',
  warning:   'bg-amber-500/15 text-amber-600',
  danger:    'bg-destructive/10 text-destructive',
  muted:     'bg-muted text-muted-foreground',
  operator:  'bg-purple-500/15 text-purple-600',
  institute: 'bg-blue-500/15 text-blue-600',
  live:      'bg-primary/10 text-primary',
  station:   'bg-chart-4/15 text-chart-4',
  gold:      'bg-accent/15 text-accent',
}[props.variant]))
</script>
