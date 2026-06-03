<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * SiZhuDisplay — 四柱展示组件
 * 对标热卜：表格+网格线、天干/地支上下结构、五行配色、日柱高亮
 */
import { ref, computed } from 'vue'
import type { SiZhu, Pillar, CangGanItem } from '@guoxue/shared'
import {
  getTianGanColor, getDiZhiColor,
  UI_COLORS, FONT_SIZE, SPACING, JIXIONG,
} from '@guoxue/shared'

const props = defineProps<{
  siZhu: SiZhu
  showShiShen?: boolean
  showShenSha?: boolean
  showCangGan?: boolean
  showNayin?: boolean
  showDiShi?: boolean
}>()

const emit = defineEmits<{
  'pillar-click': [key: 'nian' | 'yue' | 'ri' | 'shi']
}>()

const selectedPillar = ref<'nian' | 'yue' | 'ri' | 'shi' | null>(null)

const columns: { key: 'nian' | 'yue' | 'ri' | 'shi'; label: string }[] = [
  { key: 'nian', label: '年柱' },
  { key: 'yue', label: '月柱' },
  { key: 'ri', label: '日柱' },
  { key: 'shi', label: '时柱' },
]

function onPillarClick(key: 'nian' | 'yue' | 'ri' | 'shi') {
  selectedPillar.value = selectedPillar.value === key ? null : key
  emit('pillar-click', key)
}

function getCangGanStr(items: CangGanItem[]): string {
  if (!items?.length) return '--'
  return items.map(cg => `${cg.gan}(${cg.shiShen})`).join(' ')
}
</script>

<template>
  <div class="sizhu-display">
    <!-- 四柱表格（对标热卜：网格线 + 上下结构） -->
    <table class="sizhu-table">
      <!-- 表头：年柱 月柱 日柱 时柱 -->
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="sizhu-th"
            :class="{ 'ri-zhu-th': col.key === 'ri' }"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- 天干行（带五行颜色） -->
        <tr>
          <td
            v-for="col in columns"
            :key="'gan-' + col.key"
            class="sizhu-td gan-cell"
            :class="{
              'ri-zhu-cell': col.key === 'ri',
              'selected': selectedPillar === col.key
            }"
            :style="{ color: getTianGanColor(siZhu[col.key].gan) }"
            @click="onPillarClick(col.key)"
          >
            <span class="gan-text">{{ siZhu[col.key].gan }}</span>
          </td>
        </tr>
        <!-- 地支行 -->
        <tr>
          <td
            v-for="col in columns"
            :key="'zhi-' + col.key"
            class="sizhu-td zhi-cell"
            :class="{
              'ri-zhu-cell': col.key === 'ri',
              'selected': selectedPillar === col.key
            }"
            :style="{ color: getDiZhiColor(siZhu[col.key].zhi) }"
            @click="onPillarClick(col.key)"
          >
            <span class="zhi-text">{{ siZhu[col.key].zhi }}</span>
          </td>
        </tr>
        <!-- 十神行 -->
        <tr v-if="showShiShen !== false">
          <td
            v-for="col in columns"
            :key="'ss-' + col.key"
            class="sizhu-td shishen-cell"
            :class="{ 'ri-zhu-cell': col.key === 'ri' }"
          >
            <span class="ss-gan">{{ siZhu[col.key].ganShiShen }}</span>
            <span class="ss-sep">/</span>
            <span class="ss-zhi">{{ siZhu[col.key].zhiShiShen }}</span>
          </td>
        </tr>
        <!-- 藏干行 -->
        <tr v-if="showCangGan !== false">
          <td
            v-for="col in columns"
            :key="'cg-' + col.key"
            class="sizhu-td canggan-cell"
          >
            <template v-if="siZhu[col.key].cangGan?.length">
              <span
                v-for="(cg, i) in siZhu[col.key].cangGan"
                :key="cg.gan"
                class="cg-item"
                :style="{ color: getTianGanColor(cg.gan) }"
              >
                {{ cg.gan }}<small class="cg-ss">{{ cg.shiShen }}</small><span v-if="i < siZhu[col.key].cangGan.length - 1" />
              </span>
            </template>
            <span
              v-else
              class="cg-empty"
            >--</span>
          </td>
        </tr>
        <!-- 纳音行 -->
        <tr v-if="showNayin !== false">
          <td
            v-for="col in columns"
            :key="'ny-' + col.key"
            class="sizhu-td nayin-cell"
          >
            {{ siZhu[col.key].nayin || '--' }}
          </td>
        </tr>
        <!-- 地势/星运行 -->
        <tr v-if="showDiShi">
          <td
            v-for="col in columns"
            :key="'ds-' + col.key"
            class="sizhu-td dishi-cell"
          >
            {{ siZhu[col.key].diShi || '--' }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 选中柱详情面板 -->
    <div
      v-if="selectedPillar"
      class="pillar-detail"
    >
      <div class="detail-inner">
        <span class="detail-label">{{ columns.find(c => c.key === selectedPillar)?.label }}详情</span>
        <div class="detail-items">
          <slot
            :key="selectedPillar"
            name="pillar-detail"
            :pillar="siZhu[selectedPillar]"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sizhu-display {
  width: 100%;
}

/* 表格整体 */
.sizhu-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid v-bind('UI_COLORS.border');
  border-radius: 8px;
  overflow: hidden;
  table-layout: fixed;
}

/* 表头 */
.sizhu-th {
  background: v-bind('UI_COLORS.headerBg');
  padding: 10px 8px;
  font-size: v-bind('FONT_SIZE.sm');
  font-weight: 600;
  color: v-bind('UI_COLORS.brand');
  text-align: center;
  border-right: 1px solid v-bind('UI_COLORS.borderLight');
  border-bottom: 2px solid v-bind('UI_COLORS.border');
}
.sizhu-th:last-child {
  border-right: none;
}
.ri-zhu-th {
  background: v-bind('UI_COLORS.brandLight');
}

/* 数据单元格 */
.sizhu-td {
  padding: 10px 6px;
  text-align: center;
  border-right: 1px solid v-bind('UI_COLORS.borderLight');
  border-bottom: 1px solid v-bind('UI_COLORS.borderLight');
  cursor: pointer;
  transition: background 150ms ease;
  vertical-align: middle;
}
.sizhu-td:last-child {
  border-right: none;
}
.sizhu-td:hover {
  background: v-bind('UI_COLORS.headerBg');
}
.sizhu-td.selected {
  background: v-bind('UI_COLORS.brandLight');
}

/* 日柱高亮 */
.ri-zhu-cell {
  background: rgba(196, 30, 58, 0.03);
}

/* 天干 */
.gan-cell {
  padding: 16px 6px 6px;
}
.gan-text {
  font-size: v-bind('FONT_SIZE["4xl"]');
  font-weight: 700;
  font-family: 'Source Han Serif SC', 'Noto Serif CJK SC', serif;
}

/* 地支 */
.zhi-cell {
  padding: 4px 6px 14px;
}
.zhi-text {
  font-size: v-bind('FONT_SIZE["3xl"]');
  font-weight: 700;
  font-family: 'Source Han Serif SC', 'Noto Serif CJK SC', serif;
}

/* 十神 */
.shishen-cell {
  padding: 6px;
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.brand');
  font-weight: 600;
}
.ss-sep {
  color: v-bind('UI_COLORS.textHint');
  margin: 0 2px;
}

/* 藏干 */
.canggan-cell {
  padding: 6px;
  background: #fbf8f3;
}
.cg-item {
  font-size: v-bind('FONT_SIZE.xs');
  font-weight: 500;
}
.cg-ss {
  font-size: 10px;
  color: v-bind('UI_COLORS.textHint');
}
.cg-empty {
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textHint');
}

/* 纳音 */
.nayin-cell {
  padding: 6px;
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.brand');
  font-weight: 500;
  background: #fbf8f3;
}

/* 地势 */
.dishi-cell {
  padding: 6px;
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textSecondary');
}

/* 选中柱详情 */
.pillar-detail {
  margin-top: 12px;
  background: v-bind('UI_COLORS.brandLight');
  border: 1px solid v-bind('UI_COLORS.brand');
  border-radius: 8px;
}
.detail-inner {
  padding: 16px;
}
.detail-label {
  font-size: v-bind('FONT_SIZE.sm');
  font-weight: 600;
  color: v-bind('UI_COLORS.brand');
  display: block;
  margin-bottom: 8px;
}
.detail-items {
  font-size: v-bind('FONT_SIZE.sm');
  color: v-bind('UI_COLORS.textSecondary');
  line-height: 1.8;
}
</style>
