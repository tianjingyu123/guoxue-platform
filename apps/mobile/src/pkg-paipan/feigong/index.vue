<script setup lang="ts">
/**
 * 飞宫小奇门·起局入口页——自 V0 app/feigong/page.tsx 还原
 * 表单：事项（选填）/ 排盘时间（回到此刻）/ 起局方式（时辰·报数·随机）。
 * 排盘记录本地存储（key: rebu:feigong-history，上限 50），入口页内嵌历史卡。
 * 取舍：V0「随机起局」在引擎内 Math.random，重开会变——改为提交时落定具体数存入 payload，
 *       结果页按已定数重算（展示口径仍标「随机起局」），历史重开结果一致。
 */
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  loadFeigongHistory,
  clearFeigongHistory,
  formatFeigongTime,
  type FeigongHistoryItem,
  type FeigongParams,
} from './feigong-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '飞宫小奇门'
// #ifdef MP-WEIXIN
hdrTitle = '飞宫文化研究'
// #endif

type Method = 'hour' | 'number' | 'random'

const METHODS: { key: Method; label: string; desc: string }[] = [
  { key: 'hour', label: '时辰起局', desc: '以时支起青龙' },
  { key: 'number', label: '报数起局', desc: '心中默念报一数' },
  { key: 'random', label: '随机起局', desc: '天机自取一数' },
]

const topic = ref('')
const now = new Date()
const dateTime = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: now.getMinutes(),
})
const method = ref<Method>('hour')
const num = ref('')
const history = ref<FeigongHistoryItem[]>([])

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
const dateText = computed(() => `${dateTime.value.year}年${pad(dateTime.value.month)}月${pad(dateTime.value.day)}日`)

function onDateChange(e: { detail: { value: string } }) {
  const [y, m, d] = e.detail.value.split('-').map(Number)
  dateTime.value = { ...dateTime.value, year: y, month: m, day: d }
}
function onTimeChange(e: { detail: { value: string } }) {
  const [h, mi] = e.detail.value.split(':').map(Number)
  dateTime.value = { ...dateTime.value, hour: h, minute: mi }
}

// 报数仅保留数字，最多 3 位
watch(num, (v) => {
  const clean = v.replace(/\D/g, '').slice(0, 3)
  if (clean !== v) num.value = clean
})

const numberValid = computed(() => {
  if (method.value !== 'number') return true
  const n = Number.parseInt(num.value, 10)
  return Number.isFinite(n) && n >= 1
})

// ─── 排盘记录（内嵌卡） ───
function loadRecords() { history.value = loadFeigongHistory() }
onShow(loadRecords)

function onClearHistory() {
  clearFeigongHistory()
  history.value = []
}
function openRecord(h: FeigongHistoryItem) {
  navigateTo(`/pkg-paipan/feigong/result?payload=${encodeURIComponent(JSON.stringify(h.params))}`)
}

function handleSubmit() {
  if (!numberValid.value) {
    uni.showToast({ title: '请输入报数（正整数）', icon: 'none' })
    return
  }
  const t = dateTime.value
  const params: FeigongParams = {
    topic: topic.value.trim().slice(0, 30),
    year: t.year, month: t.month, day: t.day, hour: t.hour, minute: t.minute,
    m: method.value,
  }
  if (method.value === 'number') params.n = Number.parseInt(num.value, 10)
  // 随机：提交时落定具体数（1~12），保证结果页刷新/历史重开一致
  if (method.value === 'random') params.n = Math.floor(Math.random() * 12) + 1
  navigateTo(`/pkg-paipan/feigong/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" subtitle="民间快占 · 时上起青龙" share share-title="飞宫小奇门排盘" />

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <!-- 事项 -->
        <paper-card padding="sm">
          <text class="form-label">事项内容 <text class="form-label-sub">(选填)</text></text>
          <input
            v-model="topic"
            class="topic-input"
            type="text"
            :maxlength="30"
            placeholder="如：今日出行方位、此事吉凶"
          >
        </paper-card>

        <!-- 排盘时间 -->
        <paper-card padding="sm">
          <view class="row-between">
            <text class="form-label">排盘时间</text>
            <view class="now-btn" @tap="refreshTime">
              <app-icon name="refresh-cw" :size="24" color="var(--brand)" />
              <text class="now-btn-text">回到此刻</text>
            </view>
          </view>
          <view class="dt-pickers">
            <picker class="date-picker" mode="date" :value="dateStr" @change="onDateChange">
              <view class="dt-box"><text class="dt-text">{{ dateText }}</text></view>
            </picker>
            <picker class="time-picker" mode="time" :value="timeStr" @change="onTimeChange">
              <view class="dt-box dt-box-time"><text class="dt-text">{{ timeStr }}</text></view>
            </picker>
          </view>
        </paper-card>

        <!-- 起局方式 -->
        <paper-card padding="sm">
          <text class="form-label">起局方式</text>
          <view class="method-grid">
            <view
              v-for="mm in METHODS"
              :key="mm.key"
              class="method-cell"
              :class="{ 'method-cell-on': method === mm.key }"
              @tap="method = mm.key"
            >
              <text class="method-label" :class="{ 'method-label-on': method === mm.key }">{{ mm.label }}</text>
              <text class="method-desc">{{ mm.desc }}</text>
            </view>
          </view>
          <view v-if="method === 'number'" class="num-block">
            <text class="num-label">心中所报之数（1 起，按 12 取支）</text>
            <input
              v-model="num"
              class="num-input"
              type="number"
              placeholder="请输入一个数字"
            >
          </view>
          <text class="method-hint">时辰起局以排盘时间的时支起青龙；报数与随机起局以数取支，同一时辰可另起新局。</text>
        </paper-card>

        <!-- 开始排盘 -->
        <view class="submit" :class="{ 'submit-disabled': !numberValid }" @tap="handleSubmit">
          <app-icon name="compass" :size="32" color="#fff" />
          <text class="submit-text">开始排盘</text>
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
                <text class="his-date">{{ formatFeigongTime(h.params) }}</text>
              </view>
              <app-icon name="chevron-right" :size="28" color="#9ca3af" />
            </view>
          </paper-card>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="飞宫小奇门为民间快占之术，所示宫位象意仅供文化研究与决策参考，切勿迷信。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 28rpx; }

.form-label { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.form-label-sub { font-size: 22rpx; font-weight: 400; color: var(--text-soft); }

/* 事项输入 */
.topic-input {
  margin-top: 16rpx;
  width: 100%;
  box-sizing: border-box;
  border: 1rpx solid var(--line);
  background: var(--bg-paper);
  border-radius: 20rpx;
  padding: 18rpx 24rpx;
  font-size: 28rpx;
  color: var(--text-ink);
}

/* 排盘时间 */
.row-between { display: flex; align-items: center; justify-content: space-between; }
.now-btn { display: flex; align-items: center; gap: 8rpx; padding: 8rpx; &:active { opacity: 0.7; } }
.now-btn-text { font-size: 24rpx; color: var(--brand); }
.dt-pickers { margin-top: 16rpx; display: flex; gap: 16rpx; }
.date-picker { flex: 1.4; }
.time-picker { flex: 1; }
.dt-box {
  border: 1rpx solid var(--line);
  background: var(--bg-paper);
  border-radius: 20rpx;
  padding: 18rpx 24rpx;
}
.dt-text { font-size: 28rpx; color: var(--text-ink); }

/* 起局方式 */
.method-grid { margin-top: 20rpx; display: flex; gap: 16rpx; }
.method-cell {
  flex: 1;
  border: 1rpx solid var(--line);
  background: var(--bg-paper);
  border-radius: 20rpx;
  padding: 20rpx 8rpx;
  display: flex; flex-direction: column; align-items: center; gap: 6rpx;
  &:active { opacity: 0.85; }
}
.method-cell-on { border-color: var(--brand); background: rgba(196, 30, 58, 0.08); }
.method-label { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.method-label-on { color: var(--text-ink); }
.method-desc { font-size: 20rpx; line-height: 1.3; color: var(--text-soft); text-align: center; }

.num-block { margin-top: 20rpx; display: flex; flex-direction: column; gap: 10rpx; }
.num-label { font-size: 24rpx; color: var(--text-soft); }
.num-input {
  width: 100%;
  box-sizing: border-box;
  border: 1rpx solid var(--line);
  background: var(--bg-paper);
  border-radius: 20rpx;
  padding: 18rpx 24rpx;
  font-size: 28rpx;
  color: var(--text-ink);
}
.method-hint { display: block; margin-top: 20rpx; font-size: 22rpx; line-height: 1.6; color: var(--text-soft); }

/* 提交 */
.submit {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
  &:active { transform: scale(0.99); }
}
.submit-disabled { opacity: 0.5; }
.submit-text { font-size: 32rpx; font-weight: 700; color: #fff; }

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
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.his-date { font-size: 22rpx; color: var(--text-soft); }
</style>
