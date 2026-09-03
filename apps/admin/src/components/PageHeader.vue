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
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
  padding: 2px 2px 4px;
}
.header-left {
  display: flex;
  min-width: 0;
  align-items: stretch;
  gap: 13px;
}
.header-accent {
  width: 4px;
  min-height: 44px;
  border-radius: var(--radius-full);
  background: linear-gradient(180deg, var(--color-primary) 0 42%, var(--color-gold) 42% 100%);
  flex-shrink: 0;
}
.header-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
}
.header-title {
  margin: 0;
  font-size: 25px;
  font-weight: 680;
  letter-spacing: -.025em;
  color: var(--color-text-title);
}
.header-desc {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
  line-height: 1.6;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}
@media (max-width: 900px) {
  .page-header { align-items: flex-start; flex-direction: column; }
  .header-actions { width: 100%; flex-wrap: wrap; }
  .header-title { font-size: 22px; }
}
</style>
