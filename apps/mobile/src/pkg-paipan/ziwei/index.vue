<script setup lang="ts">
/**
 * 紫微斗数·录入页（自 V0 app/ziwei/page.tsx 还原，本地真实安星引擎计算）
 * 表单：姓名/性别/公历生日/时辰；历史记录本地存储（最近 20 条）点击回填。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { loadZiweiHistory, clearZiweiHistory, shichenLabel, type ZiweiHistoryItem } from './ziwei-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '紫微斗数'
// #ifdef MP-WEIXIN
hdrTitle = '紫微文化研究'
// #endif

// ── 表单 ──
const name = ref('')
const gender = ref<'男' | '女'>('女')
const dateStr = ref('1990-01-01')

/** 时辰选项：早子/晚子分列（晚子 23 点归当日子时，与引擎口径一致） */
const SHICHEN_OPTIONS = [
  { label: '早子', range: '00-01', hour: 0 },
  { label: '丑', range: '01-03', hour: 2 },
  { label: '寅', range: '03-05', hour: 4 },
  { label: '卯', range: '05-07', hour: 6 },
  { label: '辰', range: '07-09', hour: 8 },
  { label: '巳', range: '09-11', hour: 10 },
  { label: '午', range: '11-13', hour: 12 },
  { label: '未', range: '13-15', hour: 14 },
  { label: '申', range: '15-17', hour: 16 },
  { label: '酉', range: '17-19', hour: 18 },
  { label: '戌', range: '19-21', hour: 20 },
  { label: '亥', range: '21-23', hour: 22 },
  { label: '晚子', range: '23-24', hour: 23 },
] as const
const hour = ref<number>(12)

const todayStr = (() => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
})()

function onDateChange(e: { detail: { value: string } }) {
  dateStr.value = e.detail.value
}

const parsedDate = computed(() => {
  const [y, m, d] = dateStr.value.split('-').map(Number)
  return { y: y || 1990, m: m || 1, d: d || 1 }
})

// ── 历史记录 ──
const history = ref<ZiweiHistoryItem[]>([])
onShow(() => {
  history.value = loadZiweiHistory()
})

function fillFromHistory(h: ZiweiHistoryItem) {
  name.value = h.name === '未知' ? '' : h.name
  gender.value = h.gender
  dateStr.value = `${h.y}-${String(h.m).padStart(2, '0')}-${String(h.d).padStart(2, '0')}`
  hour.value = h.hour
  uni.showToast({ title: '已回填', icon: 'none' })
}

function onClearHistory() {
  uni.showModal({
    title: '清空记录',
    content: '确定清空全部排盘记录？',
    success: (res) => {
      if (res.confirm) {
        clearZiweiHistory()
        history.value = []
      }
    },
  })
}

function formatHistoryDate(h: ZiweiHistoryItem) {
  return `${h.y}-${String(h.m).padStart(2, '0')}-${String(h.d).padStart(2, '0')} ${shichenLabel(h.hour)}`
}

// ── 起盘 ──
function handleSubmit() {
  const { y, m, d } = parsedDate.value
  const payload = { name: name.value.trim() || '未知', gender: gender.value, y, m, d, hour: hour.value }
  navigateTo(`/pkg-paipan/ziwei/result?payload=${encodeURIComponent(JSON.stringify(payload))}`)
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" />

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <!-- 录入表单 -->
        <paper-card padding="none">
          <!-- 姓名 -->
          <view class="row row-bd">
            <text class="row-label">姓名</text>
            <input v-model="name" class="row-input" placeholder="请输入姓名（选填）" placeholder-class="row-input-ph" />
          </view>
          <!-- 性别 -->
          <view class="row row-bd">
            <text class="row-label">性别</text>
            <view class="genders">
              <view class="gbtn" :class="{ 'gbtn-on': gender === '男' }" @tap="gender = '男'">
                <text class="gtext" :class="{ 'gtext-on': gender === '男' }">男</text>
              </view>
              <view class="gbtn" :class="{ 'gbtn-on': gender === '女' }" @tap="gender = '女'">
                <text class="gtext" :class="{ 'gtext-on': gender === '女' }">女</text>
              </view>
            </view>
          </view>
          <!-- 公历生日 -->
          <picker mode="date" :value="dateStr" start="1901-01-01" :end="todayStr" @change="onDateChange">
            <view class="row row-bd row-tap">
              <view class="row-left">
                <view class="row-icon"><app-icon name="calendar" :size="28" color="#2d5a87" /></view>
                <text class="row-label">公历生日<text class="row-star">*</text></text>
              </view>
              <view class="row-right">
                <text class="row-value">{{ dateStr }}</text>
                <app-icon name="chevron-right" :size="28" color="#9ca3af" />
              </view>
            </view>
          </picker>
          <!-- 时辰 -->
          <view class="shichen-block">
            <view class="row-left shichen-head">
              <view class="row-icon"><app-icon name="clock" :size="28" color="#2d5a87" /></view>
              <text class="row-label">出生时辰<text class="row-star">*</text></text>
              <text class="shichen-cur">{{ shichenLabel(hour) }}</text>
            </view>
            <view class="shichen-grid">
              <view
                v-for="s in SHICHEN_OPTIONS"
                :key="s.hour"
                class="sc-chip"
                :class="{ 'sc-chip-on': hour === s.hour }"
                @tap="hour = s.hour"
              >
                <text class="sc-name" :class="{ 'sc-name-on': hour === s.hour }">{{ s.label }}</text>
                <text class="sc-range" :class="{ 'sc-range-on': hour === s.hour }">{{ s.range }}</text>
              </view>
            </view>
          </view>
          <!-- 起盘 -->
          <view class="submit-wrap">
            <view class="submit" @tap="handleSubmit"><text class="submit-text">开始排盘</text></view>
          </view>
        </paper-card>

        <!-- 排盘记录 -->
        <view v-if="history.length" class="his-sec">
          <section-title title="排盘记录" subtitle="点击回填最近 20 条">
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
              @tap="fillFromHistory(h)"
            >
              <view class="his-main">
                <view class="his-line1">
                  <text class="his-name">{{ h.name }}</text>
                  <text class="his-gender" :class="h.gender === '男' ? 'his-gender-m' : 'his-gender-f'">{{ h.gender }}</text>
                </view>
                <text class="his-date">{{ formatHistoryDate(h) }}</text>
              </view>
              <app-icon name="chevron-right" :size="28" color="#9ca3af" />
            </view>
          </paper-card>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="本工具仅供传统文化爱好者研究学习使用，命理分析结果不构成任何预测或建议。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 32rpx; display: flex; flex-direction: column; gap: 28rpx; }

/* 表单行 */
.row { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx; }
.row-bd { border-bottom: 1rpx solid var(--line); }
.row-tap:active { background: rgba(0, 0, 0, 0.02); }
.row-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }
.row-star { font-size: 22rpx; color: var(--brand); margin-left: 4rpx; }
.row-input { flex: 1; margin-left: 32rpx; text-align: right; font-size: 28rpx; color: var(--text-ink); }
.row-input-ph { color: rgba(153, 153, 153, 0.5); }
.row-left { display: flex; align-items: center; gap: 20rpx; }
.row-icon { width: 56rpx; height: 56rpx; border-radius: 16rpx; background: var(--indigo-light, rgba(45, 90, 135, 0.08)); display: flex; align-items: center; justify-content: center; }
.row-right { display: flex; align-items: center; gap: 8rpx; }
.row-value { font-size: 28rpx; color: var(--text-ink); }

/* 性别 */
.genders { display: flex; align-items: center; background: rgba(0, 0, 0, 0.04); border-radius: 16rpx; padding: 4rpx; }
.gbtn { padding: 12rpx 48rpx; border-radius: 12rpx; }
.gbtn-on { background: var(--card); box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08); }
.gtext { font-size: 28rpx; font-weight: 500; color: var(--text-soft); }
.gtext-on { color: var(--brand); }

/* 时辰 */
.shichen-block { padding: 28rpx 32rpx; border-bottom: 1rpx solid var(--line); }
.shichen-head { margin-bottom: 20rpx; }
.shichen-cur { margin-left: auto; font-size: 26rpx; color: var(--brand); font-weight: 600; }
.shichen-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.sc-chip { display: flex; flex-direction: column; align-items: center; gap: 2rpx; padding: 14rpx 0; border-radius: 14rpx; background: rgba(0, 0, 0, 0.03); border: 2rpx solid transparent; }
.sc-chip-on { background: rgba(196, 30, 58, 0.06); border-color: var(--brand); }
.sc-name { font-family: Georgia, 'Songti SC', serif; font-size: 28rpx; font-weight: 600; color: var(--text-ink); }
.sc-name-on { color: var(--brand); }
.sc-range { font-size: 20rpx; color: var(--text-soft); }
.sc-range-on { color: var(--brand); }

/* 起盘按钮 */
.submit-wrap { padding: 32rpx; }
.submit { padding: 28rpx; background: var(--brand); border-radius: 24rpx; box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3); }
.submit:active { transform: scale(0.99); }
.submit-text { display: block; text-align: center; font-size: 32rpx; font-weight: 700; color: #fff; }

/* 历史记录 */
.his-sec { display: flex; flex-direction: column; gap: 20rpx; }
.his-clear { padding: 8rpx 24rpx; border-radius: 999rpx; border: 2rpx solid var(--line); }
.his-clear-text { font-size: 24rpx; color: var(--text-soft); }
.his-item { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; }
.his-item:active { background: rgba(0, 0, 0, 0.02); }
.his-main { display: flex; flex-direction: column; gap: 6rpx; }
.his-line1 { display: flex; align-items: center; gap: 12rpx; }
.his-name { font-size: 28rpx; font-weight: 600; color: var(--text-ink); }
.his-gender { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.his-gender-m { color: #2d5a87; background: rgba(45, 90, 135, 0.1); }
.his-gender-f { color: var(--brand); background: rgba(196, 30, 58, 0.08); }
.his-date { font-size: 24rpx; color: var(--text-soft); }
</style>
