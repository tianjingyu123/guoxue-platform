<template>
  <view
    class="flex items-center gap-3 px-4 py-3 bg-card active:bg-secondary/50 transition-colors"
    :class="{ 'opacity-50 pointer-events-none': disabled }"
    @tap="!disabled && emit('click')"
  >
    <!-- 左侧图标 -->
    <view v-if="$slots.icon || icon" class="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center flex-shrink-0">
      <slot name="icon">
        <text class="text-sm text-foreground">{{ icon }}</text>
      </slot>
    </view>

    <!-- 主体 -->
    <view class="flex-1 min-w-0">
      <view class="flex items-center gap-2">
        <text class="text-sm font-medium text-foreground">{{ label }}</text>
        <view v-if="badge" class="px-1.5 py-0.5 rounded-full bg-primary">
          <text class="text-[10px] text-primary-foreground font-medium">{{ badge }}</text>
        </view>
      </view>
      <text v-if="desc" class="text-xs text-muted-foreground mt-0.5 block">{{ desc }}</text>
    </view>

    <!-- 右侧 -->
    <view class="flex items-center gap-1 flex-shrink-0">
      <slot name="right">
        <text v-if="value" class="text-sm text-muted-foreground">{{ value }}</text>
        <svg v-if="showArrow" class="w-4 h-4 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </slot>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  desc?: string
  value?: string
  icon?: string
  badge?: string | number
  showArrow?: boolean
  disabled?: boolean
}>(), { desc: '', value: '', icon: '', badge: '', showArrow: true, disabled: false })

const emit = defineEmits<{ click: [] }>()
</script>
