<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * ShenShaList — 神煞列表
 * 标签形式展示，按柱分组，支持吉/凶/平筛选
 */
import { ref, computed } from 'vue'
import type { ShenShaItem } from '@guoxue/shared'
import { JIXIONG, UI_COLORS, FONT_SIZE } from '@guoxue/shared'

const props = defineProps<{
  shenSha: ShenShaItem[]
  mode?: 'full' | 'compact'
  maxVisible?: number
}>()

const emit = defineEmits<{
  'tag-click': [item: ShenShaItem]
}>()

const filter = ref<'all' | 'ji' | 'xiong'>('all')
const showAll = ref(false)

const maxVisible = computed(() => props.maxVisible ?? (props.mode === 'compact' ? 8 : 99))

const filteredList = computed(() => {
  let list = props.shenSha
  if (filter.value !== 'all') {
    list = list.filter(s => s.type === filter.value)
  }
  return list
})

const visibleList = computed(() => {
  if (showAll.value || props.mode === 'full') return filteredList.value
  return filteredList.value.slice(0, maxVisible.value)
})

const hiddenCount = computed(() => {
  if (showAll.value) return 0
  return Math.max(0, filteredList.value.length - maxVisible.value)
})

/** 按柱分组 */
const groupedByPillar = computed(() => {
  const groups: Record<string, ShenShaItem[]> = { 年: [], 月: [], 日: [], 时: [], '': [] }
  for (const s of props.shenSha) {
    const pillar = s.pillar || ''
    const label = pillar === 'nian' ? '年' : pillar === 'yue' ? '月' : pillar === 'ri' ? '日' : pillar === 'shi' ? '时' : ''
    if (groups[label]) {
      groups[label].push(s)
    } else {
      groups[''].push(s)
    }
  }
  return groups
})

const pillarLabels = ['年', '月', '日', '时']

function getTagClass(type: string): string {
  return type === 'ji' ? 'tag-ji' : 'tag-xiong'
}

function getTagBgColor(type: string): string {
  return type === 'ji' ? '#e8f5e9' : '#fce4ec'
}

function getTagTextColor(type: string): string {
  return type === 'ji' ? JIXIONG.ji : JIXIONG.xiong
}
</script>

<template>
  <div class="shensha-list">
    <!-- 筛选栏 -->
    <div class="ss-filter">
      <button
        v-for="opt in [{ k: 'all', v: '全部' }, { k: 'ji', v: '吉神' }, { k: 'xiong', v: '凶神' }]"
        :key="opt.k"
        :class="['filter-btn', { active: filter === opt.k }]"
        @click="filter = opt.k as 'all' | 'ji' | 'xiong'"
      >
        {{ opt.v }}
      </button>
    </div>

    <!-- 按柱分组展示 -->
    <div class="ss-groups">
      <div
        v-for="label in pillarLabels"
        :key="label"
        class="ss-group"
      >
        <span class="ss-pillar-label">{{ label }}</span>
        <div class="ss-tags">
          <span
            v-for="item in visibleList.filter(s => {
              const p = s.pillar || ''
              const l = p === 'nian' ? '年' : p === 'yue' ? '月' : p === 'ri' ? '日' : p === 'shi' ? '时' : ''
              return l === label
            })"
            :key="item.name"
            class="ss-tag"
            :class="getTagClass(item.type)"
            @click="emit('tag-click', item)"
          >
            {{ item.name }}
          </span>
          <span
            v-if="!visibleList.filter(s => {
              const p = s.pillar || ''
              const l = p === 'nian' ? '年' : p === 'yue' ? '月' : p === 'ri' ? '日' : p === 'shi' ? '时' : ''
              return l === label
            }).length"
            class="ss-empty"
          >--</span>
        </div>
      </div>
    </div>

    <!-- 展开更多 -->
    <button
      v-if="hiddenCount > 0"
      class="expand-btn"
      @click="showAll = true"
    >
      + 展开剩余 {{ hiddenCount }} 个神煞
    </button>
  </div>
</template>

<style scoped>
.shensha-list {
  width: 100%;
}

/* 筛选栏 */
.ss-filter {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}
.filter-btn {
  padding: 4px 14px;
  border-radius: 14px;
  border: 1px solid v-bind('UI_COLORS.border');
  background: v-bind('UI_COLORS.cardBg');
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textSecondary');
  cursor: pointer;
  transition: all 150ms ease;
}
.filter-btn:hover {
  border-color: v-bind('UI_COLORS.brand');
  color: v-bind('UI_COLORS.brand');
}
.filter-btn.active {
  background: v-bind('UI_COLORS.brand');
  border-color: v-bind('UI_COLORS.brand');
  color: #fff;
}

/* 分组 */
.ss-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ss-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.ss-pillar-label {
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textHint');
  min-width: 24px;
  padding-top: 4px;
  flex-shrink: 0;
}
.ss-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}
.ss-empty {
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textHint');
  padding: 4px 0;
}

/* 标签 */
.ss-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: v-bind('FONT_SIZE.xs');
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 100ms ease;
}
.ss-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.tag-ji {
  background: #e8f5e9;
  color: v-bind('JIXIONG.ji');
  border-color: #c8e6c9;
}
.tag-xiong {
  background: #fce4ec;
  color: v-bind('JIXIONG.xiong');
  border-color: #f8bbd0;
}

/* 展开按钮 */
.expand-btn {
  display: block;
  margin-top: 10px;
  padding: 6px;
  width: 100%;
  text-align: center;
  background: none;
  border: 1px dashed v-bind('UI_COLORS.border');
  border-radius: 6px;
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.link');
  cursor: pointer;
}
.expand-btn:hover {
  background: v-bind('UI_COLORS.headerBg');
}
</style>
