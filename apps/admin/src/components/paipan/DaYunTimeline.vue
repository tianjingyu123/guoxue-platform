<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * DaYunTimeline — 大运时间轴
 * 横向滚动时间轴，点击展开流年，当前运高亮
 */
import { ref, computed } from 'vue'
import type { DaYunStep, LiuNian } from '@guoxue/shared'
import {
  getTianGanColor, getDiZhiColor,
  UI_COLORS, FONT_SIZE, SPACING, DURATION,
} from '@guoxue/shared'

const props = defineProps<{
  daYun: DaYunStep[]
  startAge: number
  currentAge?: number
}>()

const emit = defineEmits<{
  'step-click': [step: DaYunStep, index: number]
}>()

const expandedIndex = ref<number | null>(null)

/** 当前所在大运索引 */
const currentStepIndex = computed(() => {
  if (props.currentAge == null) return -1
  return props.daYun.findIndex(
    d => props.currentAge! >= d.startAge && props.currentAge! <= d.endAge
  )
})

function toggleExpand(index: number) {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

function getGanColor(ganZhi: string): string {
  return getTianGanColor(ganZhi.charAt(0))
}

function getZhiColorStr(ganZhi: string): string {
  return getDiZhiColor(ganZhi.charAt(1))
}
</script>

<template>
  <div class="dayun-timeline">
    <!-- 起运信息 -->
    <div class="qiyun-info">
      <span class="qiyun-label">起运：</span>
      <span class="qiyun-value">{{ startAge }}岁</span>
    </div>

    <!-- 大运横向滚动列表 -->
    <div class="dayun-scroll">
      <div class="dayun-inner">
        <div
          v-for="(step, idx) in daYun"
          :key="idx"
          class="dayun-step"
          :class="{
            'is-current': idx === currentStepIndex,
            'is-expanded': idx === expandedIndex,
          }"
          @click="toggleExpand(idx); emit('step-click', step, idx)"
        >
          <!-- 干支 -->
          <div class="step-ganzhi">
            <span
              class="step-gan"
              :style="{ color: getGanColor(step.ganZhi) }"
            >{{ step.tianGan || step.ganZhi.charAt(0) }}</span>
            <span
              class="step-zhi"
              :style="{ color: getZhiColorStr(step.ganZhi) }"
            >{{ step.diZhi || step.ganZhi.charAt(1) }}</span>
          </div>
          <!-- 十神 -->
          <div class="step-shishen">
            {{ step.ganShiShen }}/{{ step.zhiShiShen }}
          </div>
          <!-- 年龄范围 -->
          <div class="step-age">
            {{ step.startAge }}-{{ step.endAge }}岁
          </div>
        </div>
      </div>
    </div>

    <!-- 流年展开区 -->
    <div
      v-if="expandedIndex !== null && daYun[expandedIndex]?.liuNian?.length"
      class="liunian-panel"
    >
      <div class="liunian-header">
        {{ daYun[expandedIndex].ganZhi }}大运 · 流年
      </div>
      <div class="liunian-scroll">
        <div
          v-for="ln in daYun[expandedIndex].liuNian"
          :key="ln.year"
          class="liunian-item"
        >
          <span class="ln-year">{{ ln.year }}</span>
          <span
            class="ln-gan"
            :style="{ color: getTianGanColor(ln.ganZhi.charAt(0)) }"
          >{{ ln.ganZhi.charAt(0) }}</span>
          <span
            class="ln-zhi"
            :style="{ color: getDiZhiColor(ln.ganZhi.charAt(1)) }"
          >{{ ln.ganZhi.charAt(1) }}</span>
          <span class="ln-ss">{{ ln.ganShiShen }}/{{ ln.zhiShiShen }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dayun-timeline {
  width: 100%;
}

.qiyun-info {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  padding: 0 4px;
}
.qiyun-label {
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textHint');
}
.qiyun-value {
  font-size: v-bind('FONT_SIZE.base');
  font-weight: 600;
  color: v-bind('UI_COLORS.brand');
}

/* 大运横向滚动 */
.dayun-scroll {
  overflow-x: auto;
  scrollbar-width: thin;
  padding-bottom: 8px;
}
.dayun-inner {
  display: flex;
  gap: 8px;
  min-width: max-content;
}

/* 单步大运 */
.dayun-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: v-bind('UI_COLORS.cardBg');
  border: 1px solid v-bind('UI_COLORS.border');
  border-radius: 12px;
  padding: 14px 20px;
  min-width: 90px;
  cursor: pointer;
  transition: all 150ms ease;
  flex-shrink: 0;
}
.dayun-step:hover {
  border-color: v-bind('UI_COLORS.brand');
  background: v-bind('UI_COLORS.brandLight');
}
.dayun-step.is-current {
  background: v-bind('UI_COLORS.brand');
  border-color: v-bind('UI_COLORS.brand');
}
.dayun-step.is-current .step-gan,
.dayun-step.is-current .step-zhi {
  color: #fff !important;
}
.dayun-step.is-current .step-shishen,
.dayun-step.is-current .step-age {
  color: rgba(255, 255, 255, 0.8);
}
.dayun-step.is-expanded {
  border-color: v-bind('UI_COLORS.brand');
  box-shadow: 0 0 0 2px v-bind('UI_COLORS.brandLight');
}

.step-ganzhi {
  display: flex;
  gap: 2px;
}
.step-gan,
.step-zhi {
  font-size: v-bind('FONT_SIZE.xl');
  font-weight: 700;
  font-family: 'Source Han Serif SC', 'Noto Serif CJK SC', serif;
}
.step-shishen {
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textSecondary');
}
.step-age {
  font-size: v-bind('FONT_SIZE.xs');
  color: v-bind('UI_COLORS.textHint');
}

/* 流年面板 */
.liunian-panel {
  margin-top: 12px;
  background: v-bind('UI_COLORS.cardBg');
  border: 1px solid v-bind('UI_COLORS.border');
  border-radius: 8px;
  overflow: hidden;
}
.liunian-header {
  padding: 10px 16px;
  font-size: v-bind('FONT_SIZE.sm');
  font-weight: 600;
  color: v-bind('UI_COLORS.brand');
  background: v-bind('UI_COLORS.headerBg');
  border-bottom: 1px solid v-bind('UI_COLORS.borderLight');
}
.liunian-scroll {
  display: flex;
  overflow-x: auto;
  padding: 12px 16px;
  gap: 8px;
}
.liunian-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: v-bind('UI_COLORS.bg');
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 64px;
  flex-shrink: 0;
  border: 1px solid v-bind('UI_COLORS.borderLight');
}
.ln-year {
  font-size: 10px;
  color: v-bind('UI_COLORS.textHint');
}
.ln-gan,
.ln-zhi {
  font-size: v-bind('FONT_SIZE.base');
  font-weight: 600;
  font-family: 'Source Han Serif SC', 'Noto Serif CJK SC', serif;
}
.ln-ss {
  font-size: 10px;
  color: v-bind('UI_COLORS.textSecondary');
  margin-top: 2px;
}
</style>
