<script setup lang="ts">
/**
 * 山向奇门起盘入口页——自 V0 app/shanxiang/page.tsx 还原
 * 输入：客户名称（选填）+ 山向度数（0-359 步进/直输）+ 用事年份（前后各 10 年）。
 * 实时预览当前角度对应的「X山Y向」；输入以 payload 传结果页本地重算（同前两批惯例）。
 * 取舍：V0「排盘记录」链接 /records 改本地存储底部弹层（key: rebu:shanxiang-history，上限 50，同批内惯例）；
 *       V0 select 年份改原生 picker；R4 合规：小程序端标题改文化研究表述。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { FACING_SEQ } from '@/pkg-paipan/lib/shanxiang-engine'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '山向奇门'
// #ifdef MP-WEIXIN
hdrTitle = '山向文化研究'
// #endif

const HISTORY_KEY = 'rebu:shanxiang-history'

interface HistoryRecord {
  id: number
  name: string
  label: string
  dateText: string
  params: Record<string, unknown>
  createdAt: number
}

const nowYear = new Date().getFullYear()
const name = ref('')
const deg = ref(0)

const YEARS: number[] = []
for (let y = nowYear - 10; y <= nowYear + 10; y++) YEARS.push(y)
const YEAR_LABELS = YEARS.map((y) => `${y}年`)
const yearIdx = ref(10) // 默认当年

function clampDeg(n: number) {
  return ((Math.round(n) % 360) + 360) % 360
}

/** 实时预览山向 */
const preview = computed(() => {
  const d = clampDeg(deg.value)
  const mIdx = Math.floor(d / 15)
  const facing = FACING_SEQ[mIdx]
  const sitting = FACING_SEQ[(mIdx + 12) % 24]
  return `${sitting}山${facing}向`
})

function stepDeg(dir: -1 | 1) {
  deg.value = clampDeg(deg.value + dir)
}

function onDegInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  const raw = (e as { detail: { value: string } }).detail?.value ?? ''
  const v = Number.parseInt(String(raw).replace(/\D/g, ''), 10)
  deg.value = Number.isFinite(v) ? Math.min(v, 359) : 0
}

function onYearChange(e: { detail: { value: number | string } }) {
  yearIdx.value = Number(e.detail.value)
}

// ── 本地排盘记录（结果页自动写入，此处只读展示） ──
const showHistory = ref(false)
const records = ref<HistoryRecord[]>([])

function loadRecords() {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    records.value = raw ? (JSON.parse(raw) as HistoryRecord[]) : []
  } catch {
    records.value = []
  }
}
onShow(loadRecords)

function openHistory() {
  loadRecords()
  showHistory.value = true
}
function clearHistory() {
  uni.setStorageSync(HISTORY_KEY, '[]')
  records.value = []
}
function openRecord(r: HistoryRecord) {
  showHistory.value = false
  navigateTo(`/pkg-paipan/shanxiang/result?payload=${encodeURIComponent(JSON.stringify(r.params))}`)
}

function start() {
  const params: Record<string, unknown> = {
    name: name.value.trim(),
    deg: clampDeg(deg.value),
    y: YEARS[yearIdx.value],
    ts: Date.now(),
  }
  navigateTo(`/pkg-paipan/shanxiang/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header
      :title="hdrTitle"
      subtitle="向角度定局 · 堪舆文化研究"
      share
      :share-title="hdrTitle"
    >
      <template #actions>
        <view class="th-history-btn" @tap="openHistory">
          <app-icon name="history" :size="36" color="var(--text-ink)" />
        </view>
      </template>
    </tool-header>

    <scroll-view scroll-y class="body">
      <view class="inner">
        <!-- 朱底题头 -->
        <view class="hero">
          <text class="hero-title">山向奇门排盘</text>
          <text class="hero-sub">向角度定局 · 年干五鼠遁 · 八煞劫曜黄泉</text>
        </view>

        <!-- 表单卡片 -->
        <view class="form-card">
          <view class="form-row">
            <text class="form-label">客户名称</text>
            <input
              v-model="name"
              class="name-input"
              type="text"
              placeholder="请输入客户名称（选填）"
            >
          </view>

          <view class="form-row">
            <text class="form-label">山向度数</text>
            <view class="stepper">
              <view class="stepper-btn stepper-btn-l" @tap="stepDeg(-1)">
                <app-icon name="minus" :size="30" color="var(--text-ink)" />
              </view>
              <input
                class="stepper-input"
                type="number"
                :value="String(deg)"
                @input="onDegInput"
              >
              <view class="stepper-btn stepper-btn-r" @tap="stepDeg(1)">
                <app-icon name="plus" :size="30" color="var(--text-ink)" />
              </view>
            </view>
          </view>

          <view class="form-row">
            <text class="form-label">用事年份</text>
            <picker
              mode="selector"
              :range="YEAR_LABELS"
              :value="yearIdx"
              @change="onYearChange"
            >
              <view class="select-btn">
                <text class="select-btn-text">{{ YEAR_LABELS[yearIdx] }}</text>
                <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
              </view>
            </picker>
          </view>

          <!-- 实时预览 + 说明 -->
          <view class="preview-wrap">
            <view class="preview-box">
              <text class="preview-line">
                当前角度 <text class="preview-strong">{{ clampDeg(deg) }}°</text> 对应
                <text class="preview-strong">{{ preview }}</text>
              </text>
              <text class="preview-note">
                立于宅内向外持罗盘打向，输入向上角度（0° 起每 15° 一山，每 5° 一局）。坐山配节气定局，用事年干五鼠遁向支起用事干支排盘。
              </text>
            </view>
          </view>
        </view>

        <!-- 操作 -->
        <view class="actions">
          <view class="submit" @tap="start">
            <text class="submit-text">山向排盘</text>
          </view>
          <view class="history-btn" @tap="openHistory">
            <app-icon name="history" :size="30" color="var(--brand)" />
            <text class="history-btn-text">排盘记录</text>
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="山向奇门为传统堪舆文化内容，结果仅供文化研究与参考，不构成任何决策建议。"
        />
      </view>
    </scroll-view>

    <!-- 排盘记录弹层（本地存储） -->
    <view v-if="showHistory" class="mask" @tap="showHistory = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-hdr">
          <text class="sheet-cancel" @tap="showHistory = false">关闭</text>
          <text class="sheet-title">排盘记录</text>
          <text
            class="sheet-clear"
            :class="{ 'sheet-clear-off': records.length === 0 }"
            @tap="clearHistory"
          >清空</text>
        </view>
        <scroll-view scroll-y class="history-list">
          <view v-if="records.length === 0" class="history-empty">
            <text class="history-empty-text">暂无排盘记录，排盘后自动留存</text>
          </view>
          <view
            v-for="r in records"
            :key="r.id"
            class="history-item"
            @tap="openRecord(r)"
          >
            <view class="history-item-main">
              <text class="history-name">{{ r.name || '未命名' }}</text>
              <text class="history-label">{{ r.label }}</text>
            </view>
            <text class="history-date">{{ r.dateText }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; height: 0; }
.inner { padding: 24rpx 32rpx 96rpx; display: flex; flex-direction: column; gap: 28rpx; }

.th-history-btn {
  width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%;
  &:active { background: rgba(0, 0, 0, 0.05); }
}

/* ── 朱底题头 ── */
.hero {
  padding: 48rpx 40rpx; border-radius: 32rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  display: flex; flex-direction: column; align-items: center; gap: 8rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.25);
}
.hero-title {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 44rpx; font-weight: 700; color: #fff;
}
.hero-sub { font-size: 24rpx; color: rgba(255, 255, 255, 0.8); }

/* ── 表单卡片 ── */
.form-card {
  background: var(--card);
  border-radius: 32rpx;
  border: 1rpx solid var(--line);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.form-row {
  display: flex; align-items: center; justify-content: space-between; gap: 24rpx;
  padding: 30rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.form-label { font-size: 28rpx; font-weight: 700; color: var(--text-ink); flex-shrink: 0; }
.name-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }

/* 度数步进器 */
.stepper {
  display: flex; align-items: center;
  border: 1rpx solid var(--line); border-radius: 16rpx;
  overflow: hidden;
}
.stepper-btn {
  width: 88rpx; height: 72rpx;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.03);
  &:active { background: rgba(0, 0, 0, 0.08); }
}
.stepper-btn-l { border-right: 1rpx solid var(--line); }
.stepper-btn-r { border-left: 1rpx solid var(--line); }
.stepper-input {
  width: 128rpx; height: 72rpx;
  text-align: center; font-size: 32rpx; font-weight: 700;
  color: var(--text-ink); background: var(--card);
}

.select-btn {
  display: flex; align-items: center; gap: 8rpx;
  padding: 14rpx 24rpx; border-radius: 16rpx;
  border: 1rpx solid var(--line); background: rgba(0, 0, 0, 0.03);
  &:active { background: rgba(0, 0, 0, 0.07); }
}
.select-btn-text { font-size: 28rpx; color: var(--text-ink); }

/* 预览区 */
.preview-wrap { padding: 24rpx 32rpx 30rpx; }
.preview-box {
  padding: 24rpx;
  border-radius: 20rpx;
  background: rgba(0, 0, 0, 0.03);
  display: flex; flex-direction: column; gap: 10rpx;
}
.preview-line { font-size: 24rpx; line-height: 1.7; color: var(--text-soft); }
.preview-strong { font-weight: 700; color: var(--brand); }
.preview-note { font-size: 24rpx; line-height: 1.7; color: var(--text-soft); }

/* ── 操作按钮 ── */
.actions { display: flex; flex-direction: column; gap: 24rpx; }
.submit {
  padding: 30rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
  &:active { transform: scale(0.99); }
}
.submit-text { display: block; text-align: center; font-size: 32rpx; font-weight: 700; color: #fff; }
.history-btn {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 28rpx;
  background: var(--card);
  border-radius: 24rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.3);
  &:active { background: rgba(196, 30, 58, 0.05); }
}
.history-btn-text { font-size: 30rpx; font-weight: 700; color: var(--brand); }

/* ── 底部弹层 ── */
.mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%;
  background: var(--card);
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
  max-height: 70vh;
  display: flex; flex-direction: column;
}
.sheet-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.sheet-cancel { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.sheet-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.sheet-clear { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.sheet-clear-off { opacity: 0.4; }
.history-list { max-height: 56vh; }
.history-empty { padding: 80rpx 48rpx; }
.history-empty-text { display: block; text-align: center; font-size: 26rpx; color: var(--text-soft); line-height: 1.6; }
.history-item {
  display: flex; align-items: center; justify-content: space-between; gap: 20rpx;
  padding: 26rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.history-item-main { display: flex; flex-direction: column; gap: 8rpx; min-width: 0; flex: 1; }
.history-name {
  font-size: 28rpx; font-weight: 500; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.history-label { font-size: 24rpx; color: var(--brand); font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif; }
.history-date { font-size: 22rpx; color: var(--text-soft); flex-shrink: 0; }
</style>
