<template>
  <view :class="['flex items-baseline gap-0.5', sizeClass]">
    <text v-if="isFree" class="font-semibold text-chart-4">免费</text>
    <template v-else>
      <text class="font-medium text-primary" :class="unitClass">¥</text>
      <text class="font-bold text-primary" :class="amountClass">{{ formatPrice(price) }}</text>
      <text v-if="originalPrice && originalPrice > price" class="line-through text-muted-foreground" :class="originalClass">¥{{ formatPrice(originalPrice) }}</text>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  price?: number
  originalPrice?: number
  size?: 'sm' | 'md' | 'lg'
}>(), { price: 0, size: 'md' })

const isFree = computed(() => props.price === 0)

const sizeClass = computed(() => ({ sm: '', md: '', lg: '' }[props.size]))
const unitClass = computed(() => ({ sm: 'text-xs', md: 'text-sm', lg: 'text-base' }[props.size]))
const amountClass = computed(() => ({ sm: 'text-sm', md: 'text-base', lg: 'text-xl' }[props.size]))
const originalClass = computed(() => ({ sm: 'text-xs', md: 'text-xs', lg: 'text-sm' }[props.size]))

function formatPrice(val: number) {
  return val % 1 === 0 ? val.toString() : val.toFixed(2)
}
</script>
