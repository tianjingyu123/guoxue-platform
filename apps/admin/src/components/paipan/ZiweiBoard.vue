<script setup lang="ts">
/**
 * ZiweiBoard — 紫微斗数命盘展示组件
 * 12宫 4x4 布局，四化高亮，星曜五行配色
 */
import { computed } from 'vue'
import type { GongWei, SiHua } from '@guoxue/ziwei-engine'
import { UI_COLORS } from '@guoxue/shared'

const props = defineProps<{
  gongWei: GongWei[]
  mingGong: GongWei
  siHua: SiHua
  shenGong?: string
  wuXingJu?: string
  geShi?: string[]
}>()

// ── 12宫网格布局（从上到下4行，每行3列）──
const gridLayout: { row: number; col: number; name: string }[] = [
  { row: 1, col: 2, name: '财帛' },
  { row: 1, col: 3, name: '子女' },
  { row: 1, col: 4, name: '夫妻' },
  { row: 2, col: 1, name: '疾厄' },
  { row: 2, col: 2, name: '命宫' },
  { row: 2, col: 3, name: '兄弟' },
  { row: 3, col: 1, name: '迁移' },
  { row: 3, col: 3, name: '父母' },
  { row: 4, col: 1, name: '交友' },
  { row: 4, col: 2, name: '官禄' },
  { row: 4, col: 3, name: '田宅' },
  { row: 4, col: 4, name: '福德' },
]

const grid = computed(() => gridLayout.map(cell => ({
  ...cell,
  gong: props.gongWei.find(g => g.name === cell.name) || null,
})))

const siHuaList = computed(() => [
  { label: '化禄', value: props.siHua?.huaLu, cls: 'si-hua-lu' },
  { label: '化权', value: props.siHua?.huaQuan, cls: 'si-hua-quan' },
  { label: '化科', value: props.siHua?.huaKe, cls: 'si-hua-ke' },
  { label: '化忌', value: props.siHua?.huaJi, cls: 'si-hua-ji' },
].filter(s => s.value))

function starColor(s: { wuXing?: string; liangJi?: string }): string {
  if (s.liangJi === '吉') return '#52C41A'
  if (s.liangJi === '凶') return '#FF4D4F'
  const m: Record<string,string> = { '金':'#FA8C16','木':'#52C41A','水':'#4A90D9','火':'#C41E3A','土':'#C9A96E' }
  return m[s.wuXing||''] || UI_COLORS.textSecondary
}
</script>

<template>
  <div class="ziwei-board">
    <!-- 头部：五行局 + 格局 -->
    <div class="board-header" v-if="wuXingJu || (geShi?.length)">
      <span v-if="wuXingJu" class="wuxing-ju">{{ wuXingJu }}</span>
      <span v-for="g in geShi" :key="g" class="ge-tag">{{ g }}</span>
    </div>

    <!-- 四化 -->
    <div class="sihua-bar" v-if="siHuaList.length">
      <span v-for="s in siHuaList" :key="s.label" class="sihua-item" :class="s.cls">
        {{ s.label }}：<b>{{ s.value }}</b>
      </span>
    </div>

    <!-- 12宫网格 -->
    <div class="gong-grid">
      <template v-for="cell in grid" :key="cell.name">
        <div
          class="gong-cell"
          :class="{ 'is-ming': cell.name === '命宫', 'is-shen': cell.name === (shenGong||'') }"
          :style="{ gridRow: cell.row, gridColumn: cell.col }"
        >
          <div class="gong-header">
            <span class="gong-name">{{ cell.name }}</span>
            <span v-if="cell.name === (shenGong||'')" class="shen-badge">身</span>
            <span v-if="cell.gong" class="gong-zhi">{{ cell.gong.zhi }}</span>
          </div>
          <div class="gong-stars" v-if="cell.gong?.stars?.length">
            <span
              v-for="star in cell.gong.stars.slice(0,6)"
              :key="star.name"
              class="star-tag"
              :style="{ color: starColor(star) }"
            >{{ star.name }}</span>
            <span v-if="cell.gong.stars.length > 6" class="star-more">
              +{{ cell.gong.stars.length - 6 }}
            </span>
          </div>
          <div class="gong-info" v-if="cell.gong">
            <span class="gong-gan">{{ cell.gong.gan }}</span>
            <span class="gong-daxian">{{ cell.gong.daXianStart }}-{{ cell.gong.daXianEnd }}岁</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ziwei-board {
  background: v-bind('UI_COLORS.cardBg');
  border: 1px solid v-bind('UI_COLORS.border');
  border-radius: 12px;
  padding: 16px;
  font-family: 'Noto Serif SC', serif;
}

.board-header { display:flex; gap:8px; margin-bottom:12px; }
.wuxing-ju { font-size:14px; font-weight:600; color: v-bind('UI_COLORS.textPrimary'); }
.ge-tag { font-size:11px; padding:2px 8px; background: rgba(196,30,58,.08); color: v-bind('UI_COLORS.brand'); border-radius:8px; }

.sihua-bar { display:flex; gap:16px; margin-bottom:16px; padding:8px 12px; background: v-bind('UI_COLORS.headerBg'); border-radius:8px; font-size:13px; }
.si-hua-lu b { color:#52C41A; } .si-hua-quan b { color:#722ED1; }
.si-hua-ke b { color:#4A90D9; } .si-hua-ji b { color:#FF4D4F; }

.gong-grid {
  display:grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, auto);
  gap:6px;
}
.gong-cell {
  background: rgba(245,241,235,.5);
  border:1px solid v-bind('UI_COLORS.borderLight');
  border-radius:8px;
  padding:8px 6px;
  min-height:80px;
}
.gong-cell.is-ming { border-color: v-bind('UI_COLORS.brand'); border-width:2px; background: rgba(196,30,58,.03); }
.gong-cell.is-shen { box-shadow: inset 0 0 0 1px #C9A96E; }

.gong-header { display:flex; align-items:center; gap:4px; margin-bottom:4px; }
.gong-name { font-size:13px; font-weight:600; color: v-bind('UI_COLORS.textPrimary'); }
.shen-badge { font-size:9px; padding:1px 4px; background:#C9A96E; color:#fff; border-radius:4px; }
.gong-zhi { font-size:11px; color: v-bind('UI_COLORS.textSecondary'); margin-left:auto; }

.gong-stars { display:flex; flex-wrap:wrap; gap:2px; margin-bottom:4px; }
.star-tag { font-size:10px; font-weight:500; }
.star-more { font-size:9px; color: v-bind('UI_COLORS.textHint'); }

.gong-info { display:flex; justify-content:space-between; font-size:10px; color: v-bind('UI_COLORS.textHint'); }
</style>
