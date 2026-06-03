<script setup lang="ts">
/**
 * 模板 B — 工作台页
 * 布局：左侧客户列表(220px) + 中间排盘结果 + 右侧详情面板
 */
import { ref } from 'vue'
import { UI_COLORS } from '@guoxue/shared'

defineProps<{
  sidebarTitle?: string
}>()

const detailOpen = ref(false)
</script>

<template>
  <div class="page-workspace">
    <!-- 左侧客户/命例列表 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h3 class="sidebar-title">
          {{ sidebarTitle || '客户列表' }}
        </h3>
      </div>
      <div class="sidebar-body">
        <slot name="sidebar" />
      </div>
    </aside>

    <!-- 中间主区域 -->
    <main class="main-area">
      <!-- 顶部操作栏 -->
      <div class="topbar">
        <slot name="topbar" />
      </div>
      <!-- 内容区 -->
      <div class="content">
        <slot name="content" />
      </div>
    </main>

    <!-- 右侧详情面板（可关闭） -->
    <aside
      v-if="detailOpen"
      class="detail-panel"
    >
      <div class="detail-header">
        <span class="detail-title">详情</span>
        <button
          class="close-btn"
          @click="detailOpen = false"
        >
          ×
        </button>
      </div>
      <div class="detail-body">
        <slot name="detail" />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.page-workspace {
  display: grid;
  grid-template-columns: 220px 1fr auto;
  min-height: 100vh;
  background: v-bind('UI_COLORS.bg');
}

.sidebar {
  background: v-bind('UI_COLORS.cardBg');
  border-right: 1px solid v-bind('UI_COLORS.border');
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid v-bind('UI_COLORS.borderLight');
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: v-bind('UI_COLORS.textPrimary');
  margin: 0;
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.main-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  padding: 12px 24px;
  background: v-bind('UI_COLORS.cardBg');
  border-bottom: 1px solid v-bind('UI_COLORS.border');
  display: flex;
  align-items: center;
  gap: 12px;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.detail-panel {
  width: 320px;
  background: v-bind('UI_COLORS.cardBg');
  border-left: 1px solid v-bind('UI_COLORS.border');
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.detail-header {
  padding: 16px;
  border-bottom: 1px solid v-bind('UI_COLORS.borderLight');
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-title {
  font-size: 14px;
  font-weight: 600;
  color: v-bind('UI_COLORS.textPrimary');
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: v-bind('UI_COLORS.textHint');
  cursor: pointer;
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

@media (max-width: 1023px) {
  .page-workspace {
    grid-template-columns: 1fr;
  }
  .sidebar {
    display: none;
  }
  .detail-panel {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
  }
}
</style>
