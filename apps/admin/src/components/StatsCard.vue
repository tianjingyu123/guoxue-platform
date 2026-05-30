<template>
  <el-card
    :class="['stats-card', { 'is-loading': loading }]"
    shadow="hover"
  >
    <div class="stats-inner">
      <div
        class="stats-icon"
        :style="{ background: color }"
      >
        <el-icon :size="24">
          <component :is="icon" />
        </el-icon>
      </div>
      <div class="stats-info">
        <div class="stats-value">
          {{ loading ? '-' : value }}
        </div>
        <div class="stats-title">
          {{ title }}
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  value: number | string
  icon: any
  color: string
  loading?: boolean
}>()
</script>

<style scoped>
.stats-card {
  cursor: default;
  transition: transform 0.2s, box-shadow 0.2s;
  border-radius: var(--radius-md);
}
.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.stats-inner {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}
.stats-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.stats-icon :deep(.el-icon) { font-size: 22px; }
.stats-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text-title);
  line-height: 1.2;
  font-family: var(--font-family);
}
.stats-title {
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
  margin-top: 2px;
}
.is-loading .stats-value { color: #c0c4cc; }
</style>
