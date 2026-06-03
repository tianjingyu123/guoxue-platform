<script setup lang="ts">
/**
 * QimenGongGrid — 奇门九宫格
 * 标准洛书布局 (戴九履一、左三右七、二四为肩、六八为足)
 * 每宫显示：八神/天盘干/九星/八门/地盘干 + 状态标记
 */
import { ref } from 'vue'
import type { QimenGong } from '@guoxue/shared'
import { QIMEN_COLORS, UI_COLORS, FONT_SIZE, JIXIONG } from '@guoxue/shared'

const props = defineProps<{
  gongs: QimenGong[]
  juNumber: number
  dunType: 'yang' | 'yin'
  showDetail?: boolean
}>()

const emit = defineEmits<{
  'gong-click': [gong: QimenGong]
}>()

const selectedGongIndex = ref<number | null>(null)

/** 洛书 → 宫位显示顺序（从上到下、从左到右） */
const luoshuOrder = [4, 9, 2, 3, 5, 7, 8, 1, 6]

/** 宫位→显示名称 */
const gongNameMap: Record<number, string> = {
  1: '坎', 2: '坤', 3: '震', 4: '巽',
  5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离',
}

const orderedGongs = computed(() => {
  return luoshuOrder.map(idx => props.gongs.find(g => g.index === idx)).filter(Boolean) as QimenGong[]
})

function getGongName(index: number): string {
  return gongNameMap[index] || ''
}

/** 状态标签列表 */
function getStatusLabels(gong: QimenGong): string[] {
  const labels: string[] = []
  if (gong.kongWang) labels.push('空')
  if (gong.maXing) labels.push('马')
  if (gong.isRuMu) labels.push('墓')
  if (gong.isJiXing) labels.push('刑')
  if (gong.isMenPo) labels.push('破')
  return labels
}

function onGongClick(gong: QimenGong) {
  selectedGongIndex.value = selectedGongIndex.value === gong.index ? null : gong.index
  emit('gong-click', gong)
}
</script>

<script lang="ts">
import { computed } from 'vue'
</script>

<template>
  <div class="qimen-grid-container">
    <!-- 盘面标题 -->
    <div class="pan-header">
      <span class="ju-label">
        {{ dunType === 'yang' ? '阳遁' : '阴遁' }}{{ juNumber }}局
      </span>
      <span class="pan-subtitle">值符：{{ props.gongs[0]?.shen }} · 值使：{{ props.gongs[0]?.men }}</span>
    </div>

    <!-- 九宫格 -->
    <div class="qimen-grid">
      <div
        v-for="gong in orderedGongs"
        :key="gong.index"
        class="gong-cell"
        :class="{
          'is-center': gong.index === 5,
          'is-kongwang': gong.kongWang,
          'is-selected': selectedGongIndex === gong.index,
        }"
        @click="onGongClick(gong)"
      >
        <!-- 状态角标 -->
        <div
          v-if="getStatusLabels(gong).length"
          class="gong-badges"
        >
          <span
            v-for="label in getStatusLabels(gong)"
            :key="label"
            class="gong-badge"
            :class="{
              'badge-kong': label === '空',
              'badge-ma': label === '马',
              'badge-mu': label === '墓',
              'badge-xing': label === '刑',
              'badge-po': label === '破',
            }"
          >{{ label }}</span>
        </div>

        <!-- 八神 -->
        <div
          class="gong-shen"
          :style="{ color: QIMEN_COLORS.shenColor }"
        >
          {{ gong.shen }}
        </div>

        <!-- 天盘干 + 九星 -->
        <div class="gong-tianpan">
          <span class="tianpan-gan">{{ gong.tianPan }}</span>
          <span
            class="star-name"
            :style="{ color: QIMEN_COLORS.starColor }"
          >{{ gong.star }}</span>
        </div>

        <!-- 宫位名 -->
        <div class="gong-label">
          {{ getGongName(gong.index) }}{{ gong.index }}
        </div>

        <!-- 八门 + 地盘干 -->
        <div class="gong-dipan">
          <span
            class="men-name"
            :style="{ color: QIMEN_COLORS.menColor }"
          >{{ gong.men }}</span>
          <span class="dipan-gan">{{ gong.diPan }}</span>
        </div>

        <!-- 隐干（阴盘） -->
        <div
          v-if="gong.yinGan"
          class="gong-yingan"
        >
          <span class="yingan-label">隐</span>{{ gong.yinGan }}
        </div>
      </div>
    </div>

    <!-- 选中宫位详情面板 -->
    <div
      v-if="selectedGongIndex !== null && showDetail !== false"
      class="gong-detail"
    >
      <template
        v-for="gong in gongs"
        :key="gong.index"
      >
        <div
          v-if="gong.index === selectedGongIndex"
          class="detail-card"
        >
          <div class="detail-header">
            <span class="detail-title">{{ getGongName(gong.index) }}{{ gong.index }}宫 · {{ gong.bagua }}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">九星</span>
              <span
                class="detail-value"
                :style="{ color: QIMEN_COLORS.starColor }"
              >{{ gong.star }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">八门</span>
              <span
                class="detail-value"
                :style="{ color: QIMEN_COLORS.menColor }"
              >{{ gong.men }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">八神</span>
              <span
                class="detail-value"
                :style="{ color: QIMEN_COLORS.shenColor }"
              >{{ gong.shen }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">天盘</span>
              <span class="detail-value">{{ gong.tianPan }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">地盘</span>
              <span class="detail-value">{{ gong.diPan }}</span>
            </div>
            <div
              v-if="gong.changSheng"
              class="detail-item"
            >
              <span class="detail-label">长生</span>
              <span class="detail-value">{{ gong.changSheng }}</span>
            </div>
            <div
              v-if="gong.yinGan"
              class="detail-item"
            >
              <span class="detail-label">隐干</span>
              <span class="detail-value">{{ gong.yinGan }}</span>
            </div>
          </div>
          <div
            v-if="gong.interpretation"
            class="detail-interpretation"
          >
            {{ gong.interpretation }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.qimen-grid-container {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}

/* 盘面标题 */
.pan-header {
  text-align: center;
  margin-bottom: 16px;
}
.ju-label {
  font-size: v-bind('FONT_SIZE.xl');
  font-weight: 700;
  color: v-bind('UI_COLORS.brand');
  display: block;
}
.pan-subtitle {
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textSecondary');
  margin-top: 4px;
}

/* 九宫格 — 3×3 Grid */
.qimen-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  background: v-bind('QIMEN_COLORS.gongBorder');
  border: 2px solid v-bind('QIMEN_COLORS.gongBorder');
  border-radius: 8px;
  overflow: hidden;
}

.gong-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 14px 6px;
  background: v-bind('QIMEN_COLORS.gongBg');
  min-height: 120px;
  cursor: pointer;
  transition: background 150ms ease, transform 150ms ease;
  user-select: none;
}
.gong-cell:hover {
  background: #fff8d0;
  transform: scale(1.02);
}
.gong-cell.is-center {
  background: #fdf5e6;
}
.gong-cell.is-kongwang {
  background: v-bind('QIMEN_COLORS.emptyGong');
}
.gong-cell.is-selected {
  background: #fff0d0;
  box-shadow: inset 0 0 0 2px v-bind('UI_COLORS.brand');
}

/* 状态角标 */
.gong-badges {
  position: absolute;
  top: 3px;
  right: 3px;
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.gong-badge {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
}
.badge-kong { background: #f5f5f5; color: #999; border: 1px solid #ddd; }
.badge-ma { background: v-bind('QIMEN_COLORS.maStar'); color: #fff; }
.badge-mu { background: #fce4ec; color: v-bind('JIXIONG.xiong'); }
.badge-xing { background: #fbe9e7; color: #bf360c; }
.badge-po { background: #e3f2fd; color: #1565c0; }

/* 八神 */
.gong-shen {
  font-size: v-bind('FONT_SIZE.sm');
  font-weight: 600;
}

/* 天盘 */
.gong-tianpan {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.tianpan-gan {
  font-size: v-bind("FONT_SIZE['2xl']");
  font-weight: 700;
  font-family: 'Source Han Serif SC', 'Noto Serif CJK SC', serif;
}
.star-name {
  font-size: v-bind('FONT_SIZE.xs');
  font-weight: 500;
}

/* 宫位名 */
.gong-label {
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textHint');
  margin: 2px 0;
}

/* 地盘 */
.gong-dipan {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.men-name {
  font-size: v-bind('FONT_SIZE.xs');
  font-weight: 500;
}
.dipan-gan {
  font-size: v-bind('FONT_SIZE.xl');
  font-weight: 700;
  font-family: 'Source Han Serif SC', 'Noto Serif CJK SC', serif;
}

/* 隐干 */
.gong-yingan {
  font-size: 10px;
  color: v-bind('UI_COLORS.textHint');
}
.yingan-label {
  font-size: 9px;
  color: v-bind('UI_COLORS.textHint');
  margin-right: 1px;
}

/* 详情面板 */
.gong-detail {
  margin-top: 16px;
}
.detail-card {
  background: v-bind('UI_COLORS.cardBg');
  border: 1px solid v-bind('UI_COLORS.border');
  border-radius: 8px;
  padding: 16px;
}
.detail-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid v-bind('UI_COLORS.borderLight');
}
.detail-title {
  font-size: v-bind('FONT_SIZE.base');
  font-weight: 600;
  color: v-bind('UI_COLORS.brand');
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: v-bind('UI_COLORS.headerBg');
  padding: 8px 12px;
  border-radius: 6px;
}
.detail-label {
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textHint');
}
.detail-value {
  font-size: v-bind('FONT_SIZE.base');
  font-weight: 600;
}
.detail-interpretation {
  font-size: v-bind('FONT_SIZE.sm');
  color: v-bind('UI_COLORS.textSecondary');
  line-height: 1.8;
  padding-top: 8px;
  border-top: 1px solid v-bind('UI_COLORS.borderLight');
}

@media (max-width: 480px) {
  .gong-cell {
    padding: 10px 4px;
    min-height: 100px;
  }
  .tianpan-gan {
    font-size: v-bind('FONT_SIZE.xl');
  }
  .dipan-gan {
    font-size: v-bind('FONT_SIZE.base');
  }
}
</style>
