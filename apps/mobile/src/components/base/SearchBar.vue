<template>
  <view
    class="flex items-center gap-2 px-3 rounded-xl border border-border bg-card"
    :class="focused ? 'border-primary' : 'border-border'"
    style="height: 36px;"
  >
    <svg class="w-4 h-4 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input
      class="flex-1 text-sm text-foreground bg-transparent outline-none"
      v-model="inputVal"
      :placeholder="placeholder"
      :placeholder-style="`color: var(--color-muted-foreground); font-size: 14px;`"
      @focus="focused = true"
      @blur="focused = false"
      @confirm="emit('search', inputVal)"
      confirm-type="search"
    />
    <view v-if="inputVal" class="w-4 h-4 rounded-full bg-muted-foreground/30 flex items-center justify-center flex-shrink-0" @tap="handleClear">
      <svg class="w-2.5 h-2.5 text-card" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
}>(), { modelValue: '', placeholder: '搜索' })

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  clear: []
}>()

const inputVal = ref(props.modelValue)
const focused = ref(false)

watch(() => props.modelValue, val => { inputVal.value = val })
watch(inputVal, val => emit('update:modelValue', val))

function handleClear() {
  inputVal.value = ''
  emit('clear')
}
</script>
