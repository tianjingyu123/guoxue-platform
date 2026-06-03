<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 模板 A — 工具页
 * 布局：左侧输入面板(320px) + 右侧结果区 + 底部可折叠工具栏
 */
import { ref } from 'vue'
import { UI_COLORS, SPACING, BREAKPOINTS } from '@guoxue/shared'

defineProps<{
  toolTitle?: string
  inputCollapsed?: boolean
}>()

const emit = defineEmits<{
  'toggle-input': [collapsed: boolean]
}>()

const bottomBarVisible = ref(true)
</script>

<template>
  <div class="page-tool">
    <!-- 左侧输入面板 -->
    <aside
      class="input-panel"
      :class="{ collapsed: inputCollapsed }"
    >
      <div class="input-panel-header">
        <h2
          v-if="toolTitle"
          class="tool-title"
        >
          {{ toolTitle }}
        </h2>
        <button
          class="collapse-btn"
          @click="emit('toggle-input', !inputCollapsed)"
        >
          {{ inputCollapsed ? '展开' : '收起' }}
        </button>
      </div>
      <div class="input-panel-body">
        <slot name="input" />
      </div>
    </aside>

    <!-- 右侧结果区 -->
    <main class="result-area">
      <slot name="result" />
    </main>

    <!-- 底部工具栏 -->
    <footer
      v-if="bottomBarVisible"
      class="bottom-bar"
    >
      <slot name="bottom-bar">
        <button
          class="close-bar-btn"
          @click="bottomBarVisible = false"
        >
          关闭
        </button>
      </slot>
    </footer>
  </div>
</template>

<style scoped>
.page-tool {
  display: grid;
  grid-template-columns: 320px 1fr;
  grid-template-rows: 1fr auto;
  min-height: 100vh;
  background: v-bind('UI_COLORS.bg');
}

.input-panel {
  grid-row: 1 / 3;
  background: v-bind('UI_COLORS.cardBg');
  border-right: 1px solid v-bind('UI_COLORS.border');
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transition: width 200ms ease;
}

.input-panel.collapsed {
  width: 48px;
  min-width: 48px;
}

.input-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid v-bind('UI_COLORS.borderLight');
}

.tool-title {
  font-size: 16px;
  font-weight: 700;
  color: v-bind('UI_COLORS.brand');
  margin: 0;
}

.collapse-btn {
  background: none;
  border: 1px solid v-bind('UI_COLORS.border');
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  color: v-bind('UI_COLORS.textSecondary');
  cursor: pointer;
}

.input-panel-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.result-area {
  grid-row: 1;
  padding: 24px;
  overflow-y: auto;
}

.bottom-bar {
  grid-column: 2;
  grid-row: 2;
  background: v-bind('UI_COLORS.cardBg');
  border-top: 1px solid v-bind('UI_COLORS.border');
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.close-bar-btn {
  background: none;
  border: none;
  color: v-bind('UI_COLORS.textHint');
  cursor: pointer;
  font-size: 12px;
}

@media (max-width: 1023px) {
  .page-tool {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }
  .input-panel {
    grid-row: 1;
    border-right: none;
    border-bottom: 1px solid v-bind('UI_COLORS.border');
  }
  .result-area {
    grid-column: 1;
    grid-row: 2;
    padding: 16px;
  }
  .bottom-bar {
    grid-column: 1;
    grid-row: 3;
  }
}
</style>
