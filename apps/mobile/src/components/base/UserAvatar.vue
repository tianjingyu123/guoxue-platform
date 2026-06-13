<template>
  <view class="relative inline-flex flex-shrink-0" :class="sizeClass">
    <image
      class="w-full h-full rounded-full object-cover bg-muted"
      :src="src || defaultAvatar"
      mode="aspectFill"
    />
    <!-- 在线状态 -->
    <view
      v-if="showOnline && online"
      class="absolute bottom-0 right-0 rounded-full bg-chart-4 border-2 border-card"
      :class="dotSizeClass"
    />
    <!-- VIP 角标 -->
    <view
      v-if="isVip"
      class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center border border-card"
    >
      <text class="text-[8px] font-bold text-white">V</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showOnline?: boolean
  online?: boolean
  isVip?: boolean
}>(), { src: '', size: 'md', showOnline: false, online: false, isVip: false })

const defaultAvatar = '/static/images/default-avatar.png'

const sizeClass = computed(() => ({
  xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12', xl: 'w-16 h-16'
}[props.size]))

const dotSizeClass = computed(() => ({
  xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3', xl: 'w-3.5 h-3.5'
}[props.size]))
</script>
