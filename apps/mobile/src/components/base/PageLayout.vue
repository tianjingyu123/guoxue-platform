<template>
  <view
    class="min-h-screen"
    :class="[
      bgColor === 'card' ? 'bg-card' : bgColor === 'transparent' ? 'bg-transparent' : 'bg-background',
      safeBottom ? 'pb-safe' : ''
    ]"
  >
    <view v-if="showStatusBar" class="h-11" />
    <slot />
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  bgColor?: 'base' | 'card' | 'transparent'
  safeBottom?: boolean
  showStatusBar?: boolean
}>(), { bgColor: 'base', safeBottom: true, showStatusBar: false })
</script>
