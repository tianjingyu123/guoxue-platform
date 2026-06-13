<template>
  <view class="flex border-b border-border">
    <view
      v-for="tab in tabs"
      :key="tab.value"
      class="flex-1 flex flex-col items-center pb-2 pt-2 relative"
      :class="modelValue === tab.value ? 'text-primary' : 'text-muted-foreground'"
      @tap="emit('update:modelValue', tab.value)"
    >
      <text class="text-sm font-medium">{{ tab.label }}</text>
      <view
        v-if="modelValue === tab.value"
        class="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  tabs: { label: string; value: string | number }[]
  modelValue: string | number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
</script>
