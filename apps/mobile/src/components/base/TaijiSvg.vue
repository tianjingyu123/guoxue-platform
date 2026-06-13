<template>
  <!-- 太极图 SVG - 与 React bottom-nav.tsx TaijiIcon 100% 一致 -->
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 24 24`"
  >
    <!-- 红色底圆 -->
    <circle cx="12" cy="12" r="11" fill="#C41E3A" />
    <!-- 白色S形阴鱼 -->
    <path d="M12 1 A5.5 5.5 0 0 1 12 12 A5.5 5.5 0 0 0 12 23 A11 11 0 0 1 12 1" fill="#FAF8F5" />
    <!-- 阳中阴点 -->
    <circle cx="12" cy="6.5" r="2" fill="#C41E3A" />
    <!-- 阴中阳点 -->
    <circle cx="12" cy="17.5" r="2" fill="#FAF8F5" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 32 })
</script>
