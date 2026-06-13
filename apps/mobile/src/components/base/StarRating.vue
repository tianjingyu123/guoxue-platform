<template>
  <!-- 星级评分 - 严格使用 text-accent (#C9A96E)，不使用 amber-400 -->
  <view class="flex items-center gap-0.5">
    <view
      v-for="i in 5"
      :key="i"
      :class="interactive ? 'cursor-pointer' : ''"
      @tap="interactive ? emit('change', i) : undefined"
    >
      <svg
        :class="[starSizeClass, i <= Math.floor(value) ? 'text-accent' : (i === Math.ceil(value) && value % 1 >= 0.5) ? 'text-accent' : 'text-border']"
        viewBox="0 0 24 24"
        :fill="i <= Math.floor(value) ? 'currentColor' : (i === Math.ceil(value) && value % 1 >= 0.5) ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </view>
    <text v-if="showScore" class="text-accent font-medium ml-1" :class="scoreSizeClass">{{ value.toFixed(1) }}</text>
    <text v-if="showCount && count !== undefined" class="text-muted-foreground ml-0.5" :class="scoreSizeClass">({{ count }})</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showScore?: boolean
  showCount?: boolean
  count?: number
  interactive?: boolean
}>(), { value: 0, size: 'sm', showScore: false, showCount: false, interactive: false })

const emit = defineEmits<{ change: [value: number] }>()

const starSizeClass = computed(() => ({ xs: 'w-3 h-3', sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' }[props.size]))
const scoreSizeClass = computed(() => ({ xs: 'text-xs', sm: 'text-xs', md: 'text-sm', lg: 'text-base' }[props.size]))
</script>
