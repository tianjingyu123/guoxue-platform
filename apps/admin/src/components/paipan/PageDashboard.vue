<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 模板 D — 仪表盘页
 * 布局：卡片网格 + 图表区
 */
import { UI_COLORS, SPACING } from '@guoxue/shared'

defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="page-dashboard">
    <header class="dashboard-header">
      <h2
        v-if="title"
        class="dashboard-title"
      >
        {{ title }}
      </h2>
      <div class="header-actions">
        <slot name="header-actions" />
      </div>
    </header>

    <!-- 概览卡片网格 -->
    <section class="stats-grid">
      <slot name="stats" />
    </section>

    <!-- 图表区 -->
    <section class="charts-area">
      <slot name="charts" />
    </section>

    <!-- 详细数据区 -->
    <section class="detail-area">
      <slot name="detail" />
    </section>
  </div>
</template>

<style scoped>
.page-dashboard {
  min-height: 100vh;
  background: v-bind('UI_COLORS.bg');
  padding: 24px;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.dashboard-title {
  font-size: 20px;
  font-weight: 700;
  color: v-bind('UI_COLORS.textPrimary');
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.charts-area {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.detail-area {
  background: v-bind('UI_COLORS.cardBg');
  border-radius: 8px;
  padding: 24px;
  border: 1px solid v-bind('UI_COLORS.border');
}

@media (max-width: 767px) {
  .page-dashboard {
    padding: 16px;
  }
  .charts-area {
    grid-template-columns: 1fr;
  }
}
</style>
