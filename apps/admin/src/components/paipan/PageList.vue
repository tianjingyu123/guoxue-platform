<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 模板 E — 列表管理页
 * 布局：搜索筛选栏 + 表格/卡片列表 + 分页
 */
import { UI_COLORS, SPACING } from '@guoxue/shared'

defineProps<{
  title?: string
  total?: number
}>()

defineEmits<{
  search: [keyword: string]
}>()
</script>

<template>
  <div class="page-list">
    <!-- 页头 -->
    <header class="list-header">
      <div class="header-left">
        <h2
          v-if="title"
          class="list-title"
        >
          {{ title }}
        </h2>
        <span
          v-if="total !== undefined"
          class="total-count"
        >共 {{ total }} 条</span>
      </div>
      <div class="header-right">
        <slot name="header-actions" />
      </div>
    </header>

    <!-- 搜索筛选栏 -->
    <div class="filter-bar">
      <div class="search-box">
        <slot name="search" />
      </div>
      <div class="filter-actions">
        <slot name="filters" />
      </div>
    </div>

    <!-- 列表内容区 -->
    <div class="list-content">
      <slot name="list" />
    </div>

    <!-- 分页 -->
    <div
      v-if="$slots.pagination"
      class="pagination-bar"
    >
      <slot name="pagination" />
    </div>
  </div>
</template>

<style scoped>
.page-list {
  min-height: 100vh;
  background: v-bind('UI_COLORS.bg');
  padding: 24px;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.list-title {
  font-size: 20px;
  font-weight: 700;
  color: v-bind('UI_COLORS.textPrimary');
  margin: 0;
}

.total-count {
  font-size: 13px;
  color: v-bind('UI_COLORS.textHint');
}

.header-right {
  display: flex;
  gap: 8px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: v-bind('UI_COLORS.cardBg');
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid v-bind('UI_COLORS.border');
  margin-bottom: 16px;
}

.search-box {
  flex: 1;
}

.filter-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.list-content {
  background: v-bind('UI_COLORS.cardBg');
  border-radius: 8px;
  border: 1px solid v-bind('UI_COLORS.border');
  min-height: 300px;
}

.pagination-bar {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

@media (max-width: 767px) {
  .page-list {
    padding: 12px;
  }
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
