<template>
  <!-- Toggle 开关 - 滑块用 bg-card（暗色模式兼容），不用 bg-white -->
  <view
    class="relative inline-flex items-center rounded-full transition-colors duration-200 flex-shrink-0"
    :class="[
      modelValue ? 'bg-primary' : 'bg-border',
      disabled ? 'opacity-50' : 'cursor-pointer',
      size === 'sm' ? 'w-8 h-4' : 'w-11 h-6'
    ]"
    @tap="handleToggle"
    role="switch"
    :aria-checked="modelValue"
  >
    <view
      class="absolute rounded-full bg-card shadow-sm transition-transform duration-200"
      :class="[
        size === 'sm' ? 'w-3 h-3' : 'w-5 h-5',
        modelValue
          ? (size === 'sm' ? 'translate-x-4' : 'translate-x-5')
          : (size === 'sm' ? 'translate-x-0.5' : 'translate-x-0.5')
      ]"
    />
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
}>(), { modelValue: false, disabled: false, size: 'md' })

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

function handleToggle() {
  if (props.disabled) return
  const newVal = !props.modelValue
  emit('update:modelValue', newVal)
  emit('change', newVal)
}
</script>
