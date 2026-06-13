<template>
  <view class="flex items-center gap-2">
    <view class="flex-1 rounded-full overflow-hidden" :style="{ height: height + 'px', backgroundColor: 'var(--color-border)' }">
      <view
        class="h-full rounded-full transition-all duration-500"
        :class="colorClass"
        :style="{ width: `${Math.min(100, Math.max(0, value))}%` }"
      />
    </view>
    <text v-if="showLabel" class="text-xs text-muted-foreground flex-shrink-0 w-8 text-right">{{ value }}%</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value?: number
  color?: 'primary' | 'accent' | 'chart4' | 'danger' | 'warning'
  showLabel?: boolean
  height?: number
}>(), { value: 0, color: 'primary', showLabel: false, height: 6 })

const colorClass = computed(() => ({
  primary: 'bg-primary',
  accent:  'bg-accent',
  chart4:  'bg-chart-4',
  danger:  'bg-destructive',
  warning: 'bg-amber-500',
}[props.color]))
</script>
