<script setup lang="ts">
/**
 * 金口诀起课入口页——自 V0 app/jinkoujue/page.tsx 还原
 * 表单：事项 / 排盘时间 / 地分（自选·报数·随机）/ 换将方式（交节·中气）/ 贵人求法两派 / 贵神昼夜
 * 排盘记录本地存储（key: rebu:jinkoujue-history，上限 50），底部弹层查看/重开。
 * 取舍：V0「随机」地分在结果页 Math.random，重开会变——改为提交时落定具体支存入 payload，历史重开结果一致。
 */
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { ZHI } from '@/pkg-paipan/lib/jinkoujue-engine'

const HISTORY_KEY = 'rebu:jinkoujue-history'

type DifenMethod = 'manual' | 'number' | 'random'

interface HistoryRecord {
  id: number
  topic: string
  dateText: string
  panText: string
  params: Record<string, unknown>
  createdAt: number
}

const topic = ref('')
const now = new Date()
const dateTime = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: now.getMinutes(),
})
const difenMethod = ref<DifenMethod>('manual')
const difenZhiIdx = ref(0)
const difenNumber = ref('')
const jiangMethod = ref<'jie' | 'zhong'>('jie')
const guirenSchool = ref<'A' | 'B'>('A')
const guiType = ref<'auto' | 'day' | 'night'>('auto')
const showHistory = ref(false)
const records = ref<HistoryRecord[]>([])

const DIFEN_OPTIONS: { id: DifenMethod; label: string }[] = [
  { id: 'manual', label: '自选' },
  { id: 'number', label: '报数' },
  { id: 'random', label: '随机' },
]
const JIANG_OPTIONS: { id: 'jie' | 'zhong'; label: string }[] = [
  { id: 'jie', label: '交节' },
  { id: 'zhong', label: '中气' },
]
const SCHOOL_OPTIONS: { id: 'A' | 'B'; label: string }[] = [
  { id: 'A', label: '甲戊庚牛羊' },
  { id: 'B', label: '甲羊戊庚牛' },
]
const GUITYPE_OPTIONS: { id: 'auto' | 'day' | 'night'; label: string }[] = [
  { id: 'auto', label: '卯酉区分' },
  { id: 'day', label: '白天' },
  { id: 'night', label: '夜晚' },
]

function pad(n: number) { return String(n).padStart(2, '0') }

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

const dateStr = computed(() => `${dateTime.value.year}-${pad(dateTime.value.month)}-${pad(dateTime.value.day)}`)
const timeStr = computed(() => `${pad(dateTime.value.hour)}:${pad(dateTime.value.minute)}`)
const dateTimeText = computed(() => {
  const t = dateTime.value
  return `${t.year}年${pad(t.month)}月${pad(t.day)}日 ${pad(t.hour)}:${pad(t.minute)}`
})

function onDateChange(e: { detail: { value: string } }) {
  const [y, m, d] = e.detail.value.split('-').map(Number)
  dateTime.value = { ...dateTime.value, year: y, month: m, day: d }
}
function onTimeChange(e: { detail: { value: string } }) {
  const [h, mi] = e.detail.value.split(':').map(Number)
  dateTime.value = { ...dateTime.value, hour: h, minute: mi }
}
function onDifenZhiChange(e: { detail: { value: string | number } }) {
  difenZhiIdx.value = Number(e.detail.value)
}
// 报数仅保留数字，最多 3 位（同 V0）
watch(difenNumber, (v) => {
  const clean = v.replace(/\D/g, '').slice(0, 3)
  if (clean !== v) difenNumber.value = clean
})

const numberValid = computed(() => {
  if (difenMethod.value !== 'number') return true
  const n = Number.parseInt(difenNumber.value, 10)
  return Number.isFinite(n) && n >= 1
})

/** 读取本地排盘记录 */
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
  navigateTo(`/pkg-paipan/jinkoujue/result?payload=${encodeURIComponent(JSON.stringify(r.params))}`)
}

function handleSubmit() {
  if (!numberValid.value) {
    uni.showToast({ title: '请输入报数（正整数）', icon: 'none' })
    return
  }
  const t = dateTime.value
  const params: Record<string, unknown> = {
    topic: topic.value.trim(),
    year: t.year, month: t.month, day: t.day, hour: t.hour, minute: t.minute,
    dm: difenMethod.value,
    jm: jiangMethod.value,
    gs: guirenSchool.value,
    gt: guiType.value,
  }
  if (difenMethod.value === 'manual') params.dz = ZHI[difenZhiIdx.value]
  if (difenMethod.value === 'number') params.dn = Number.parseInt(difenNumber.value, 10)
  // 随机：提交时落定具体支，保证结果页刷新/历史重开一致
  if (difenMethod.value === 'random') params.dz = ZHI[Math.floor(Math.random() * 12)]
  navigateTo(`/pkg-paipan/jinkoujue/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header title="金口诀" subtitle="大六壬金口诀 · 神将贵人" share share-title="金口诀排盘">
      <template #actions>
        <view class="th-history-btn" @tap="openHistory">
          <app-icon name="history" :size="36" color="var(--text-ink)" />
        </view>
      </template>
    </tool-header>

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <!-- 红底 hero -->
        <view class="hero">
          <text class="hero-title">金口诀排盘</text>
          <text class="hero-sub">大六壬金口诀 · 一课多断 · 神将贵人</text>
        </view>

        <!-- 表单卡 -->
        <view class="form-card">
          <!-- 事项内容 -->
          <view class="form-row">
            <text class="form-label">事项内容</text>
            <input
              v-model="topic"
              class="topic-input"
              type="text"
              placeholder="请输入事项（选填）"
            >
          </view>

          <!-- 排盘时间 -->
          <view class="form-row">
            <view class="form-label-group">
              <text class="form-label">排盘时间</text>
              <view class="refresh-btn" @tap.stop="refreshTime">
                <app-icon name="refresh-cw" :size="28" color="var(--text-soft)" />
              </view>
            </view>
            <view class="dt-pickers">
              <picker mode="date" :value="dateStr" @change="onDateChange">
                <text class="dt-text">{{ dateTimeText.split(' ')[0] }}</text>
              </picker>
              <picker mode="time" :value="timeStr" @change="onTimeChange">
                <text class="dt-text">{{ timeStr }}</text>
              </picker>
            </view>
          </view>

          <!-- 选择地分 -->
          <view class="form-row form-row-wrap">
            <text class="form-label">选择地分</text>
            <view class="row-right">
              <picker
                v-if="difenMethod === 'manual'"
                mode="selector"
                :range="[...ZHI]"
                :value="difenZhiIdx"
                @change="onDifenZhiChange"
              >
                <view class="zhi-select">
                  <text class="zhi-select-text">{{ ZHI[difenZhiIdx] }}</text>
                  <app-icon name="chevron-down" :size="26" color="var(--text-soft)" />
                </view>
              </picker>
              <input
                v-if="difenMethod === 'number'"
                v-model="difenNumber"
                class="number-input"
                type="text"
                placeholder="报一个数"
              >
              <view class="pill-group">
                <view
                  v-for="o in DIFEN_OPTIONS"
                  :key="o.id"
                  class="pill"
                  :class="{ 'pill-on': difenMethod === o.id }"
                  @tap="difenMethod = o.id"
                >
                  <text class="pill-text" :class="{ 'pill-text-on': difenMethod === o.id }">{{ o.label }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 换将方式 -->
          <view class="form-row">
            <text class="form-label">换将方式</text>
            <view class="pill-group">
              <view
                v-for="o in JIANG_OPTIONS"
                :key="o.id"
                class="pill"
                :class="{ 'pill-on': jiangMethod === o.id }"
                @tap="jiangMethod = o.id"
              >
                <text class="pill-text" :class="{ 'pill-text-on': jiangMethod === o.id }">{{ o.label }}</text>
              </view>
            </view>
          </view>

          <!-- 贵人求法 -->
          <view class="form-row">
            <text class="form-label">贵人求法</text>
            <view class="pill-group">
              <view
                v-for="o in SCHOOL_OPTIONS"
                :key="o.id"
                class="pill"
                :class="{ 'pill-on': guirenSchool === o.id }"
                @tap="guirenSchool = o.id"
              >
                <text class="pill-text" :class="{ 'pill-text-on': guirenSchool === o.id }">{{ o.label }}</text>
              </view>
            </view>
          </view>

          <!-- 贵神类型 -->
          <view class="form-row form-row-last">
            <text class="form-label">贵神类型</text>
            <view class="pill-group">
              <view
                v-for="o in GUITYPE_OPTIONS"
                :key="o.id"
                class="pill"
                :class="{ 'pill-on': guiType === o.id }"
                @tap="guiType = o.id"
              >
                <text class="pill-text" :class="{ 'pill-text-on': guiType === o.id }">{{ o.label }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 操作 -->
        <view class="actions">
          <view class="submit" :class="{ 'submit-disabled': !numberValid }" @tap="handleSubmit">
            <text class="submit-text">开始排盘</text>
          </view>
          <view class="history-btn" @tap="openHistory">
            <app-icon name="history" :size="32" color="var(--brand)" />
            <text class="history-btn-text">排盘记录</text>
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="金口诀为传统术数文化内容，结果仅供文化研究与参考，不构成任何决策建议。"
        />
      </view>
    </scroll-view>

    <!-- 排盘记录弹层（本地存储） -->
    <view v-if="showHistory" class="mask" @tap="showHistory = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-hdr">
          <text class="sheet-cancel" @tap="showHistory = false">关闭</text>
          <text class="sheet-title">排盘记录</text>
          <text class="sheet-clear" :class="{ 'sheet-clear-off': records.length === 0 }" @tap="clearHistory">清空</text>
        </view>
        <scroll-view scroll-y class="history-list">
          <view v-if="records.length === 0" class="history-empty">
            <text class="history-empty-text">暂无排盘记录，起课后在结果页点「保存」即可留存</text>
          </view>
          <view v-for="r in records" :key="r.id" class="history-item" @tap="openRecord(r)">
            <view class="history-item-main">
              <text class="history-topic">{{ r.topic || '未命名事项' }}</text>
              <text class="history-pan">{{ r.panText }}</text>
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
.body { flex: 1; }
.body-inner { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 28rpx; }

.th-history-btn {
  width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%;
  &:active { background: rgba(0, 0, 0, 0.05); }
}

/* 红底 hero */
.hero {
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 32rpx;
  padding: 44rpx 40rpx;
  display: flex; flex-direction: column; align-items: center; gap: 10rpx;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.25);
}
.hero-title {
  font-size: 44rpx; font-weight: 700; color: #fff;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.hero-sub { font-size: 24rpx; color: rgba(255, 255, 255, 0.8); }

/* 表单卡 */
.form-card {
  background: var(--card);
  border-radius: 32rpx;
  border: 1rpx solid var(--line);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  padding: 0 32rpx;
}
.form-row {
  display: flex; align-items: center; justify-content: space-between; gap: 20rpx;
  padding: 30rpx 0;
  border-bottom: 1rpx solid var(--line);
}
.form-row-wrap { flex-wrap: wrap; }
.form-row-last { border-bottom: none; }
.form-label { font-size: 28rpx; font-weight: 700; color: var(--text-ink); flex-shrink: 0; }
.form-label-group { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.refresh-btn { padding: 8rpx; display: flex; align-items: center; }
.topic-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }

/* 时间选择 */
.dt-pickers { display: flex; align-items: center; gap: 20rpx; }
.dt-text { font-size: 28rpx; color: var(--text-ink); }

/* 右侧组合（地分行） */
.row-right { display: flex; align-items: center; justify-content: flex-end; gap: 16rpx; flex-wrap: wrap; flex: 1; min-width: 0; }

/* 地支下拉 */
.zhi-select {
  display: flex; align-items: center; gap: 8rpx;
  border: 1rpx solid var(--line);
  background: var(--card);
  border-radius: 16rpx;
  padding: 12rpx 24rpx;
}
.zhi-select-text {
  font-size: 28rpx; color: var(--text-ink);
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}

/* 报数输入 */
.number-input {
  width: 160rpx;
  border: 1rpx solid var(--line);
  background: var(--card);
  border-radius: 16rpx;
  padding: 12rpx 24rpx;
  text-align: right;
  font-size: 28rpx;
  color: var(--text-ink);
}

/* 单选胶囊组 */
.pill-group { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 16rpx; }
.pill {
  border-radius: 999rpx;
  border: 1rpx solid var(--line);
  background: var(--card);
  padding: 12rpx 24rpx;
  &:active { opacity: 0.8; }
}
.pill-on { border-color: var(--brand); background: var(--brand); }
.pill-text { font-size: 24rpx; font-weight: 500; color: var(--text-soft); }
.pill-text-on { color: #fff; }

/* 操作按钮 */
.actions { display: flex; flex-direction: column; gap: 24rpx; }
.submit {
  padding: 30rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
  &:active { transform: scale(0.99); }
}
.submit-disabled { opacity: 0.5; }
.submit-text { display: block; text-align: center; font-size: 32rpx; font-weight: 700; color: #fff; }
.history-btn {
  padding: 26rpx;
  background: var(--card);
  border-radius: 24rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.3);
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  &:active { background: rgba(196, 30, 58, 0.05); }
}
.history-btn-text { font-size: 30rpx; font-weight: 700; color: var(--brand); }

/* 底部弹层 */
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
.history-topic {
  font-size: 28rpx; font-weight: 500; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.history-pan { font-size: 24rpx; color: var(--brand); font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif; }
.history-date { font-size: 22rpx; color: var(--text-soft); flex-shrink: 0; }
</style>
