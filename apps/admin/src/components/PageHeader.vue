<template>
  <div class="page-header">
    <div class="header-left">
      <div class="header-accent" />
      <div class="header-content">
        <h2 class="header-title">
          {{ title }}
        </h2>
        <span
          v-if="description"
          class="header-desc"
        >{{ description }}</span>
      </div>
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
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg) var(--spacing-xl);
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-divider);
  box-shadow: var(--shadow-sm);
}
.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}
/* 左侧金线装饰条 */
.header-accent {
  width: 3px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--gradient-gold);
  flex-shrink: 0;
}
.header-content {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-md);
}
.header-title {
  margin: 0;
  font-size: var(--font-size-title);
  font-weight: 600;
  color: var(--color-text-title);
}
.header-desc {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}
</style>
