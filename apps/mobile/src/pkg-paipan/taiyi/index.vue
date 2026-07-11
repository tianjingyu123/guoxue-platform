<script setup lang="ts">
/**
 * 太乙神数·起课入口页（自 V0 app/taiyi/page.tsx 还原）
 * 表单：所占事项 / 排盘时间（回到此刻）/ 盘局类型（年月日时太乙）/ 算法类型（统宗指津金镜）。
 * 起课后跳结果页本地重算；排盘记录本地存储（key: rebu:taiyi-history，上限 50）。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import DatePickerModal from '@/components/bazi/date-picker-modal.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  loadTaiyiHistory,
  clearTaiyiHistory,
  formatParamsTime,
  PAN_SHI_LABELS,
  SUAN_FA_LABELS,
  type TaiyiParams,
  type TaiyiHistoryItem,
  type TaiyiPanShi,
  type TaiyiSuanFa,
} from './taiyi-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '太乙神数'
// #ifdef MP-WEIXIN
hdrTitle = '太乙文化研究'
// #endif

const PAN_SHI = [
  { key: 'year', label: '年太乙', desc: '占国运年景' },
  { key: 'month', label: '月太乙', desc: '占月内大事' },
  { key: 'day', label: '日太乙', desc: '占一日吉凶' },
  { key: 'hour', label: '时太乙', desc: '占当下之事' },
] as const

const SUAN_FA = [
  { key: 'tongzong', label: '统宗', desc: '《太乙统宗》积年法' },
  { key: 'zhijin', label: '指津', desc: '《太乙指津》通行法' },
  { key: 'jinjing', label: '金镜', desc: '《太乙金镜》古法' },
] as const

// ── 表单 ──
const topic = ref('')
const now = new Date()
const dateTime = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: now.getMinutes(),
})
const panShi = ref<TaiyiPanShi>('hour')
const suanFa = ref<TaiyiSuanFa>('zhijin')
const showDatePicker = ref(false)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const dateTimeText = computed(() => {
  const t = dateTime.value
  return `${t.year}年${t.month}月${t.day}日 ${pad(t.hour)}时${pad(t.minute)}分`
})

/** 回到此刻 */
function refreshTime() {
  const n = new Date()
  dateTime.value = {
    year: n.getFullYear(),
    month: n.getMonth() + 1,
    day: n.getDate(),
    hour: n.getHours(),
    minute: n.getMinutes(),
  }
}

function onDateConfirm(d: { year: number; month: number; day: number; hour: number | null; minute: number | null }) {
  dateTime.value = {
    year: d.year,
    month: d.month,
    day: d.day,
    hour: d.hour ?? dateTime.value.hour,
    minute: d.minute ?? dateTime.value.minute,
  }
}

// ── 排盘记录 ──
const history = ref<TaiyiHistoryItem[]>([])
onShow(() => {
  history.value = loadTaiyiHistory()
})

function onClearHistory() {
  uni.showModal({
    title: '清空记录',
    content: '确定清空全部排盘记录？',
    success: (res) => {
      if (res.confirm) {
        clearTaiyiHistory()
        history.value = []
      }
    },
  })
}

function openRecord(h: TaiyiHistoryItem) {
  navigateTo(`/pkg-paipan/taiyi/result?payload=${encodeURIComponent(JSON.stringify(h.params))}`)
}

function historyMode(h: TaiyiHistoryItem): string {
  return `${PAN_SHI_LABELS[h.params.panShi]}·${SUAN_FA_LABELS[h.params.suanFa]}`
}

// ── 起课 ──
function handleSubmit() {
  const t = dateTime.value
  const params: TaiyiParams = {
    topic: topic.value.trim().slice(0, 30),
    year: t.year,
    month: t.month,
    day: t.day,
    hour: t.hour,
    minute: t.minute,
    panShi: panShi.value,
    suanFa: suanFa.value,
  }
  navigateTo(`/pkg-paipan/taiyi/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" subtitle="三式之尊 · 积数定局" share />

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <paper-card padding="none">
          <!-- 所占事项 -->
          <view class="row row-bd">
            <text class="row-label">所占事项<text class="row-opt">（选填）</text></text>
            <input
              v-model="topic"
              class="topic-input"
              type="text"
              :maxlength="30"
              placeholder="如：近期时局如何、此事可否推进"
              placeholder-class="input-ph"
            >
          </view>

          <!-- 排盘时间 -->
          <view class="row row-bd row-tap" @tap="showDatePicker = true">
            <view class="row-label-group">
              <text class="row-label">排盘时间</text>
              <view class="refresh-btn" @tap.stop="refreshTime">
                <app-icon name="refresh-cw" :size="26" color="var(--brand)" />
                <text class="refresh-text">回到此刻</text>
              </view>
            </view>
            <view class="row-value">
              <text class="row-value-text">{{ dateTimeText }}</text>
              <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
            </view>
          </view>

          <!-- 盘局类型 -->
          <view class="block row-bd">
            <text class="row-label">盘局类型</text>
            <view class="ps-grid">
              <view
                v-for="p in PAN_SHI"
                :key="p.key"
                class="opt-card"
                :class="{ 'opt-card-on': panShi === p.key }"
                @tap="panShi = p.key"
              >
                <text class="opt-label" :class="{ 'opt-label-on': panShi === p.key }">{{ p.label }}</text>
                <text class="opt-desc" :class="{ 'opt-desc-on': panShi === p.key }">{{ p.desc }}</text>
              </view>
            </view>
          </view>

          <!-- 算法类型 -->
          <view class="block">
            <text class="row-label">算法类型</text>
            <view class="sf-row">
              <view
                v-for="s in SUAN_FA"
                :key="s.key"
                class="opt-card opt-card-c"
                :class="{ 'opt-card-on': suanFa === s.key }"
                @tap="suanFa = s.key"
              >
                <text class="opt-label" :class="{ 'opt-label-on': suanFa === s.key }">{{ s.label }}</text>
                <text class="opt-desc" :class="{ 'opt-desc-on': suanFa === s.key }">{{ s.desc }}</text>
              </view>
            </view>
            <text class="sf-hint">时太乙以积时定局，与算法派别无关；年太乙的积年基数因派别而异，统宗与金镜结果可能不同。</text>
          </view>
        </paper-card>

        <!-- 开始排盘 -->
        <view class="submit" @tap="handleSubmit">
          <app-icon name="compass" :size="32" color="#ffffff" />
          <text class="submit-text">开始排盘</text>
        </view>

        <!-- 排盘记录 -->
        <view v-if="history.length" class="his-sec">
          <section-title title="排盘记录" subtitle="点击重看课式，最近 50 条">
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
              :class="{ 'row-bd': i < history.length - 1 }"
              @tap="openRecord(h)"
            >
              <view class="his-main">
                <view class="his-line1">
                  <text class="his-topic">{{ h.params.topic || '未命名事项' }}</text>
                  <text class="his-summary">{{ h.summary }}</text>
                </view>
                <text class="his-date">{{ formatParamsTime(h.params) }} · {{ historyMode(h) }}</text>
              </view>
              <app-icon name="chevron-right" :size="28" color="#9ca3af" />
            </view>
          </paper-card>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="太乙神数为古代式占之学，所示格局气机仅供文化研究与决策参考，切勿迷信。"
        />
      </view>
    </scroll-view>

    <!-- 日期选择弹窗 -->
    <date-picker-modal
      :open="showDatePicker"
      :initial-date="dateTime"
      initial-mode="solar"
      @close="showDatePicker = false"
      @confirm="onDateConfirm"
    />
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 28rpx; }

/* 表单行 */
.row { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; padding: 30rpx 32rpx; }
.row-bd { border-bottom: 1rpx solid var(--line); }
.row-tap:active { background: rgba(0, 0, 0, 0.02); }
.row-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.row-opt { font-size: 22rpx; font-weight: 400; color: var(--text-soft); }
.row-label-group { display: flex; align-items: center; gap: 16rpx; flex-shrink: 0; }
.refresh-btn { display: flex; align-items: center; gap: 6rpx; padding: 6rpx 12rpx; border-radius: 999rpx; background: rgba(196, 30, 58, 0.06); }
.refresh-btn:active { background: rgba(196, 30, 58, 0.12); }
.refresh-text { font-size: 22rpx; color: var(--brand); }
.row-value { display: flex; align-items: center; gap: 6rpx; min-width: 0; }
.row-value-text { font-size: 28rpx; color: var(--text-ink); }
.topic-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }
.input-ph { color: rgba(153, 153, 153, 0.5); }

/* 选项块 */
.block { display: flex; flex-direction: column; gap: 20rpx; padding: 30rpx 32rpx; }
.ps-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.sf-row { display: flex; gap: 16rpx; }
.opt-card {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  border: 2rpx solid var(--line);
  background: var(--bg-paper);
}
.opt-card:active { background: rgba(0, 0, 0, 0.02); }
.opt-card-c { flex: 1; align-items: center; text-align: center; padding: 20rpx 8rpx; }
.opt-card-on { border-color: var(--brand); background: rgba(196, 30, 58, 0.06); }
.opt-label { font-family: $serif; font-size: 28rpx; font-weight: 600; color: var(--text-soft); }
.opt-label-on { color: var(--text-ink); }
.opt-desc { font-size: 20rpx; line-height: 1.4; color: var(--text-soft); }
.opt-desc-on { color: var(--brand); }
.sf-hint { font-size: 22rpx; line-height: 1.6; color: var(--text-soft); }

/* 开始排盘 */
.submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 30rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
}
.submit:active { transform: scale(0.99); }
.submit-text { font-size: 32rpx; font-weight: 700; color: #fff; }

/* 排盘记录 */
.his-sec { display: flex; flex-direction: column; gap: 20rpx; }
.his-clear { padding: 8rpx 24rpx; border-radius: 999rpx; border: 2rpx solid var(--line); }
.his-clear-text { font-size: 24rpx; color: var(--text-soft); }
.his-item {
  display: flex; align-items: center; justify-content: space-between; gap: 20rpx;
  padding: 24rpx 32rpx;
}
.his-item:active { background: rgba(0, 0, 0, 0.02); }
.his-main { display: flex; flex-direction: column; gap: 6rpx; min-width: 0; flex: 1; }
.his-line1 { display: flex; align-items: center; gap: 16rpx; min-width: 0; }
.his-topic {
  font-size: 28rpx; font-weight: 500; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.his-summary { font-family: $serif; font-size: 24rpx; color: var(--brand); flex-shrink: 0; }
.his-date { font-size: 22rpx; color: var(--text-soft); }
</style>
