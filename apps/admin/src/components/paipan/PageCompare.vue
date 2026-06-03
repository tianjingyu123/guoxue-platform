<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 模板 C — 对比页
 * 布局：左右等宽双栏 + 差异列（可折叠）
 */
import { ref } from 'vue'
import { UI_COLORS, JIXIONG } from '@guoxue/shared'

defineProps<{
  leftLabel?: string
  rightLabel?: string
  diffCount?: number
}>()

const diffOpen = ref(false)
</script>

<template>
  <div class="page-compare">
    <!-- 顶部标题栏 -->
    <header class="compare-header">
      <div class="header-left">
        <slot name="header-left" />
      </div>
      <div class="header-center">
        <button
          v-if="diffCount"
          class="diff-toggle"
          @click="diffOpen = !diffOpen"
        >
          差异项 ({{ diffCount }})
        </button>
      </div>
      <div class="header-right">
        <slot name="header-right" />
      </div>
    </header>

    <!-- 双栏对比区 -->
    <div class="compare-body">
      <section class="compare-column left-col">
        <div class="col-label">
          {{ leftLabel || '方案 A' }}
        </div>
        <div class="col-content">
          <slot name="left" />
        </div>
      </section>

      <!-- 差异列 -->
      <aside
        v-if="diffOpen"
        class="diff-column"
      >
        <div class="diff-header">
          <span>差异项</span>
          <button
            class="close-btn"
            @click="diffOpen = false"
          >
            ×
          </button>
        </div>
        <div class="diff-list">
          <slot name="diffs" />
        </div>
      </aside>

      <section class="compare-column right-col">
        <div class="col-label">
          {{ rightLabel || '方案 B' }}
        </div>
        <div class="col-content">
          <slot name="right" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-compare {
  min-height: 100vh;
  background: v-bind('UI_COLORS.bg');
  display: flex;
  flex-direction: column;
}

.compare-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: v-bind('UI_COLORS.cardBg');
  border-bottom: 1px solid v-bind('UI_COLORS.border');
}

.header-left,
.header-right {
  flex: 1;
}

.header-center {
  flex: 0;
}

.diff-toggle {
  background: v-bind('UI_COLORS.brandLight');
  border: 1px solid v-bind('UI_COLORS.brand');
  border-radius: 6px;
  padding: 6px 16px;
  color: v-bind('UI_COLORS.brand');
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
}

.compare-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.compare-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.left-col {
  border-right: 2px solid v-bind('UI_COLORS.border');
}

.col-label {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: v-bind('UI_COLORS.textPrimary');
  background: v-bind('UI_COLORS.headerBg');
  border-bottom: 1px solid v-bind('UI_COLORS.borderLight');
  text-align: center;
}

.col-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.diff-column {
  width: 260px;
  min-width: 260px;
  background: v-bind('UI_COLORS.cardBg');
  border-left: 1px solid v-bind('UI_COLORS.border');
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.diff-header {
  padding: 12px 16px;
  border-bottom: 1px solid v-bind('UI_COLORS.borderLight');
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  color: v-bind('UI_COLORS.textPrimary');
}

.diff-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: v-bind('UI_COLORS.textHint');
  cursor: pointer;
}

@media (max-width: 1023px) {
  .compare-body {
    flex-direction: column;
  }
  .left-col {
    border-right: none;
    border-bottom: 2px solid v-bind('UI_COLORS.border');
  }
  .diff-column {
    width: 100%;
    min-width: unset;
    max-height: 200px;
  }
}
</style>
