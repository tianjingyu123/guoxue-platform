<template>
  <div class="page-header">
    <div class="header-left">
      <h2 class="header-title">
        {{ title }}
      </h2>
      <span
        v-if="description"
        class="header-desc"
      >{{ description }}</span>
    </div>
    <div
      v-if="$slots.actions"
      class="header-actions"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-title { margin: 0; font-size: 20px; font-weight: 600; color: #303133; }
.header-desc { color: #909399; font-size: 14px; margin-left: 12px; }
.header-actions { display: flex; gap: 8px; }
</style>
