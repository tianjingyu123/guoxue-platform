<template>
  <view v-if="show" class="fixed inset-0 z-50">
    <view class="absolute inset-0 bg-black/60" @tap="emit('close')" />
    <view class="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl overflow-hidden">
      <view class="flex justify-center pt-3 pb-1">
        <view class="w-10 h-1 rounded-full bg-border" />
      </view>
      <view v-if="title" class="px-4 py-3 border-b border-border">
        <text class="text-base font-semibold text-foreground text-center block">{{ title }}</text>
      </view>
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  show?: boolean
  title?: string
}>(), { show: false, title: '' })

const emit = defineEmits<{ close: [] }>()
</script>
