<script setup lang="ts">
/**
 * 奇门穿壬·起课入口页——自 V0 app/chuanren/page.tsx 还原
 * 表单：事项（选填）/ 排盘时间 / 用神（日柱·月柱·自选六十甲子）/ 贵人（自动·阳贵·阴贵）/ 年命生肖（选填）。
 * 排盘记录本地存储（key: rebu:chuanren-history，上限 50），入口页内嵌历史卡。
 * 年命生肖沿 V0 特色交互：十二生肖 + 不选，uni 端以 picker 呈现。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { SHENGXIAO } from '@/pkg-paipan/lib/chuanren-engine'
import {
  loadChuanrenHistory,
  clearChuanrenHistory,
  formatChuanrenTime,
  type ChuanrenHistoryItem,
  type ChuanrenParams,
} from './chuanren-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '奇门穿壬'
// #ifdef MP-WEIXIN
hdrTitle = '穿壬文化研究'
// #endif

/** 六十甲子（自选用神） */
const GAN_ZHI_60: string[] = (() => {
  const G = '甲乙丙丁戊己庚辛壬癸'
  const Z = '子丑寅卯辰巳午未申酉戌亥'
  const arr: string[] = []
  for (let i = 0; i < 60; i++) arr.push(G[i % 10] + Z[i % 12])
  return arr
})()

const YS_OPTIONS: { id: 'day' | 'month' | 'custom'; label: string }[] = [
  { id: 'day', label: '日柱' },
  { id: 'month', label: '月柱' },
  { id: 'custom', label: '自选' },
]
const GUIREN_OPTIONS: { id: 'auto' | 'yang' | 'yin'; label: string }[] = [
  { id: 'auto', label: '自动（按昼夜）' },
  { id: 'yang', label: '阳贵（昼贵）' },
  { id: 'yin', label: '阴贵（夜贵）' },
]
const NIANMING_RANGE = ['不选', ...SHENGXIAO]

const topic = ref('')
const now = new Date()
const dateTime = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: now.getMinutes(),
})
const ysType = ref<'day' | 'month' | 'custom'>('day')
const customYsIdx = ref(0)
const guirenIdx = ref(0)
const nianmingIdx = ref(0)
const history = ref<ChuanrenHistoryItem[]>([])

function pad(n: number) { return String(n).padStart(2, '0') }

const dateStr = computed(() => `${dateTime.value.year}-${pad(dateTime.value.month)}-${pad(dateTime.value.day)}`)
const timeStr = computed(() => `${pad(dateTime.value.hour)}:${pad(dateTime.value.minute)}`)
const dateText = computed(() => `${dateTime.value.year}年${pad(dateTime.value.month)}月${pad(dateTime.value.day)}日`)
const dtLabel = computed(() => {
  const t = dateTime.value
  return `${t.year}年${t.month}月${t.day}日 ${t.hour}时${t.minute}分`
})

function refreshTime() {
  const t = new Date()
  dateTime.value = {
    year: t.getFullYear(),
    month: t.getMonth() + 1,
    day: t.getDate(),
    hour: t.getHours(),
    minute: t.getMinutes(),
  }
}

function onDateChange(e: { detail: { value: string } }) {
  const [y, m, d] = e.detail.value.split('-').map(Number)
  dateTime.value = { ...dateTime.value, year: y, month: m, day: d }
}
function onTimeChange(e: { detail: { value: string } }) {
  const [h, mi] = e.detail.value.split(':').map(Number)
  dateTime.value = { ...dateTime.value, hour: h, minute: mi }
}
function onCustomYsChange(e: { detail: { value: string | number } }) {
  customYsIdx.value = Number(e.detail.value)
}
function onGuirenChange(e: { detail: { value: string | number } }) {
  guirenIdx.value = Number(e.detail.value)
}
function onNianmingChange(e: { detail: { value: string | number } }) {
  nianmingIdx.value = Number(e.detail.value)
}

// ─── 排盘记录（内嵌卡） ───
function loadRecords() { history.value = loadChuanrenHistory() }
onShow(loadRecords)

function onClearHistory() {
  clearChuanrenHistory()
  history.value = []
}
function openRecord(h: ChuanrenHistoryItem) {
  navigateTo(`/pkg-paipan/chuanren/result?payload=${encodeURIComponent(JSON.stringify(h.params))}`)
}

function handleSubmit() {
  const t = dateTime.value
  const params: ChuanrenParams = {
    topic: topic.value.trim(),
    year: t.year, month: t.month, day: t.day, hour: t.hour, minute: t.minute,
    ys: ysType.value,
    gr: GUIREN_OPTIONS[guirenIdx.value].id,
  }
  if (ysType.value === 'custom') params.cys = GAN_ZHI_60[customYsIdx.value]
  if (nianmingIdx.value > 0) params.nm = NIANMING_RANGE[nianmingIdx.value]
  navigateTo(`/pkg-paipan/chuanren/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" subtitle="奇门 · 大六壬 双盘合参" share share-title="奇门穿壬排盘" />

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <!-- 排盘参数 -->
        <paper-card padding="sm">
          <view class="card-hdr">
            <app-icon name="layers" :size="30" color="var(--brand)" />
            <text class="card-hdr-text">排盘参数</text>
          </view>

          <!-- 事项 -->
          <view class="field">
            <text class="field-label">事项内容（选填）</text>
            <input
              v-model="topic"
              class="field-input"
              type="text"
              placeholder="如：求财、出行、合作…"
            >
          </view>

          <!-- 排盘时间 -->
          <view class="field">
            <view class="field-label-row">
              <text class="field-label">排盘时间</text>
              <view class="now-btn" @tap="refreshTime">
                <app-icon name="refresh-cw" :size="24" color="var(--brand)" />
                <text class="now-btn-text">此刻</text>
              </view>
            </view>
            <view class="dt-pickers">
              <picker mode="date" :value="dateStr" @change="onDateChange">
                <view class="pick-box"><text class="pick-text">{{ dateText }}</text></view>
              </picker>
              <picker mode="time" :value="timeStr" @change="onTimeChange">
                <view class="pick-box"><text class="pick-text">{{ timeStr }}</text></view>
              </picker>
            </view>
            <text class="field-hint">{{ dtLabel }}</text>
          </view>

          <!-- 用神 -->
          <view class="field">
            <text class="field-label">选择用神</text>
            <view class="ys-row">
              <view
                v-for="o in YS_OPTIONS"
                :key="o.id"
                class="pill"
                :class="{ 'pill-on': ysType === o.id }"
                @tap="ysType = o.id"
              >
                <text class="pill-text" :class="{ 'pill-text-on': ysType === o.id }">{{ o.label }}</text>
              </view>
              <picker
                v-if="ysType === 'custom'"
                class="ys-picker"
                mode="selector"
                :range="GAN_ZHI_60"
                :value="customYsIdx"
                @change="onCustomYsChange"
              >
                <view class="pick-box pick-box-sm">
                  <text class="pick-text pick-serif">{{ GAN_ZHI_60[customYsIdx] }}</text>
                  <app-icon name="chevron-down" :size="26" color="var(--text-soft)" />
                </view>
              </picker>
            </view>
          </view>

          <!-- 贵人 / 年命 -->
          <view class="field field-cols">
            <view class="col">
              <text class="field-label">选择贵人</text>
              <picker
                mode="selector"
                :range="GUIREN_OPTIONS.map((o) => o.label)"
                :value="guirenIdx"
                @change="onGuirenChange"
              >
                <view class="pick-box">
                  <text class="pick-text">{{ GUIREN_OPTIONS[guirenIdx].label }}</text>
                  <app-icon name="chevron-down" :size="26" color="var(--text-soft)" />
                </view>
              </picker>
            </view>
            <view class="col">
              <text class="field-label">选择年命（选填）</text>
              <picker
                mode="selector"
                :range="NIANMING_RANGE"
                :value="nianmingIdx"
                @change="onNianmingChange"
              >
                <view class="pick-box">
                  <text class="pick-text">{{ NIANMING_RANGE[nianmingIdx] }}</text>
                  <app-icon name="chevron-down" :size="26" color="var(--text-soft)" />
                </view>
              </picker>
            </view>
          </view>
        </paper-card>

        <!-- 开始排盘 -->
        <view class="submit" @tap="handleSubmit">
          <text class="submit-text">开始排盘</text>
        </view>

        <text class="motto">奇门看天时方位，六壬断人事进退 —— 双盘合参</text>

        <!-- 交叉跳转 -->
        <view class="cross-links">
          <view class="cross-btn" @tap="navigateTo('/pkg-paipan/qimen/index')">
            <text class="cross-btn-text">奇门遁甲 →</text>
          </view>
          <view class="cross-btn" @tap="navigateTo('/pkg-paipan/daliuren/index')">
            <text class="cross-btn-text">大六壬 →</text>
          </view>
        </view>

        <!-- 排盘记录（内嵌卡） -->
        <view v-if="history.length" class="his-sec">
          <section-title title="排盘记录" subtitle="点击重看盘面，最近 50 条">
            <template #action>
              <view class="his-clear" @tap="onClearHistory">
                <text class="his-clear-text">清空</text>
              </view>
            </template>
          </section-title>
          <paper-card padding="none">
            <view
              v-for="(h, i) in history"
              :key="h.ts"
              class="his-item"
              :class="{ 'his-item-bd': i < history.length - 1 }"
              @tap="openRecord(h)"
            >
              <view class="his-main">
                <view class="his-line1">
                  <text class="his-topic">{{ h.params.topic || '未命名事项' }}</text>
                  <text class="his-summary">{{ h.summary }}</text>
                </view>
                <text class="his-date">{{ formatChuanrenTime(h.params) }}</text>
              </view>
              <app-icon name="chevron-right" :size="28" color="#9ca3af" />
            </view>
          </paper-card>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="奇门穿壬为传统术数文化内容，结果仅供文化研究与参考，不构成任何决策建议。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 28rpx; }

/* 卡头 */
.card-hdr { display: flex; align-items: center; gap: 12rpx; }
.card-hdr-text { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }

/* 字段 */
.field { margin-top: 28rpx; display: flex; flex-direction: column; gap: 12rpx; }
.field-label { font-size: 26rpx; color: var(--text-soft); }
.field-label-row { display: flex; align-items: center; justify-content: space-between; }
.now-btn { display: flex; align-items: center; gap: 6rpx; padding: 4rpx 8rpx; &:active { opacity: 0.7; } }
.now-btn-text { font-size: 24rpx; color: var(--brand); }
.field-input {
  width: 100%;
  box-sizing: border-box;
  border: 1rpx solid var(--line);
  background: var(--bg-paper);
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  font-size: 28rpx;
  color: var(--text-ink);
}
.field-hint { font-size: 22rpx; color: var(--text-soft); }

/* 时间选择 */
.dt-pickers { display: flex; gap: 16rpx; }
.dt-pickers > :first-child { flex: 1.4; }
.dt-pickers > :last-child { flex: 1; }
.pick-box {
  display: flex; align-items: center; justify-content: space-between; gap: 8rpx;
  border: 1rpx solid var(--line);
  background: var(--bg-paper);
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
}
.pick-box-sm { padding: 12rpx 20rpx; }
.pick-text { font-size: 28rpx; color: var(--text-ink); }
.pick-serif { font-family: $serif; }

/* 用神 */
.ys-row { display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; }
.ys-picker { margin-left: auto; }
.pill {
  border-radius: 999rpx;
  border: 1rpx solid var(--line);
  background: var(--bg-paper);
  padding: 12rpx 32rpx;
  &:active { opacity: 0.8; }
}
.pill-on { border-color: var(--brand); background: var(--brand); }
.pill-text { font-size: 26rpx; color: var(--text-soft); }
.pill-text-on { color: #fff; }

/* 贵人/年命 两列 */
.field-cols { flex-direction: row; gap: 24rpx; }
.col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12rpx; }
.col .pick-text { font-size: 24rpx; }

/* 提交 */
.submit {
  padding: 28rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
  &:active { transform: scale(0.99); }
}
.submit-text { display: block; text-align: center; font-size: 32rpx; font-weight: 700; color: #fff; }

.motto { display: block; text-align: center; font-size: 24rpx; color: var(--text-soft); }

/* 交叉跳转 */
.cross-links { display: flex; justify-content: center; gap: 48rpx; }
.cross-btn { padding: 8rpx 16rpx; &:active { opacity: 0.7; } }
.cross-btn-text { font-size: 28rpx; color: var(--brand); }

/* 排盘记录内嵌卡 */
.his-sec { display: flex; flex-direction: column; gap: 20rpx; }
.his-clear { padding: 8rpx 16rpx; &:active { opacity: 0.7; } }
.his-clear-text { font-size: 24rpx; color: var(--brand); }
.his-item {
  display: flex; align-items: center; justify-content: space-between; gap: 16rpx;
  padding: 24rpx 28rpx;
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.his-item-bd { border-bottom: 1rpx solid var(--line); }
.his-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.his-line1 { display: flex; align-items: baseline; gap: 16rpx; min-width: 0; }
.his-topic {
  font-size: 28rpx; font-weight: 500; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.his-summary {
  flex-shrink: 0;
  font-size: 24rpx; color: var(--brand);
  font-family: $serif;
}
.his-date { font-size: 22rpx; color: var(--text-soft); }
</style>
