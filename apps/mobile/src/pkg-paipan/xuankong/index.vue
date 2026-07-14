<script setup lang="ts">
/**
 * 玄空飞星·排盘入口页（自 V0 app/xuankong/page.tsx 还原）
 * 表单：客户名称 / 排盘时间（回到此刻）/ 大运 / 山向（二十四山）/ 水口 / 下卦替卦。
 * 排盘后跳结果页本地重算；排盘记录本地存储（key: rebu:xuankong-history，上限 50，内嵌卡）。
 * 取舍：V0 独立 history 页砍成入口页内嵌历史卡（与太乙/大六壬批次范式一致）；
 *       V0 底部弹层选择器换 uni-app 原生 picker（selector）。
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
import { MOUNTAINS, CN_NUM, currentPeriod } from '@/pkg-paipan/lib/xuankong-data'
import {
  loadXuankongHistory,
  clearXuankongHistory,
  formatParamsTime,
  type XuankongParams,
  type XuankongHistoryItem,
} from './xuankong-history'
import { toSolarSafe } from '@/pkg-paipan/lib/date-convert'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '玄空飞星'
// #ifdef MP-WEIXIN
hdrTitle = '玄空文化研究'
// #endif

function shanxiangLabel(i: number): string {
  return `${MOUNTAINS[i]}山${MOUNTAINS[(i + 12) % 24]}向`
}

// ── 表单 ──
const customer = ref('')
const now = new Date()
const dateTime = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: now.getMinutes(),
})
const period = ref(currentPeriod(now.getFullYear()))
const sittingIdx = ref<number | null>(null)
const shuikouIdx = ref(0)
const useTi = ref(false)
const showDatePicker = ref(false)

// picker 选项
const PERIOD_LABELS = Array.from({ length: 9 }, (_, i) => `${CN_NUM[i + 1]}运`)
const SHANXIANG_LABELS = MOUNTAINS.map((_, i) => shanxiangLabel(i))
const SHUIKOU_LABELS = MOUNTAINS.map((m) => `水口在${m}`)

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

function onDateConfirm(d: {
  year: number; month: number; day: number
  hour: number | null; minute: number | null; isLunar?: boolean
}) {
  const hour = d.hour ?? dateTime.value.hour
  const minute = d.minute ?? dateTime.value.minute
  // 农历输入归一为公历：引擎入参恒为公历，否则农历数字会被当公历排盘
  const { date, ok } = toSolarSafe({ year: d.year, month: d.month, day: d.day, hour, minute, isLunar: d.isLunar })
  if (!ok) {
    uni.showToast({ title: '农历日期无效，请重新选择', icon: 'none' })
    return
  }
  dateTime.value = date
}

function onPeriodChange(e: { detail: { value: string | number } }) {
  period.value = Number(e.detail.value) + 1
}
function onSittingChange(e: { detail: { value: string | number } }) {
  sittingIdx.value = Number(e.detail.value)
}
function onShuikouChange(e: { detail: { value: string | number } }) {
  shuikouIdx.value = Number(e.detail.value)
}

// ── 排盘记录 ──
const history = ref<XuankongHistoryItem[]>([])
onShow(() => {
  history.value = loadXuankongHistory()
})

function onClearHistory() {
  uni.showModal({
    title: '清空记录',
    content: '确定清空全部排盘记录？',
    success: (res) => {
      if (res.confirm) {
        clearXuankongHistory()
        history.value = []
      }
    },
  })
}

function openRecord(h: XuankongHistoryItem) {
  navigateTo(`/pkg-paipan/xuankong/result?payload=${encodeURIComponent(JSON.stringify(h.params))}`)
}

// ── 开始排盘 ──
function handleSubmit() {
  if (sittingIdx.value === null) {
    uni.showToast({ title: '请先选择山向', icon: 'none' })
    return
  }
  const t = dateTime.value
  const params: XuankongParams = {
    customer: customer.value.trim().slice(0, 20),
    year: t.year,
    month: t.month,
    day: t.day,
    hour: t.hour,
    minute: t.minute,
    period: period.value,
    sitting: sittingIdx.value,
    shuikou: shuikouIdx.value,
    ti: useTi.value,
  }
  navigateTo(`/pkg-paipan/xuankong/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header history-href="/paipan/xuankong/history" :title="hdrTitle" subtitle="三元九运 · 挨星飞布" share />

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <paper-card padding="none">
          <!-- 客户名称 -->
          <view class="row row-bd">
            <text class="row-label">客户名称<text class="row-opt">（选填）</text></text>
            <input
              v-model="customer"
              class="name-input"
              type="text"
              :maxlength="20"
              placeholder="请输入客户名称"
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

          <!-- 大运 / 山向 / 水口 -->
          <view class="sel-row row-bd">
            <picker mode="selector" :range="PERIOD_LABELS" :value="period - 1" class="sel-picker" @change="onPeriodChange">
              <view class="sel-btn">
                <text class="sel-btn-text">{{ CN_NUM[period] }}运</text>
                <app-icon name="chevron-down" :size="26" color="var(--text-soft)" />
              </view>
            </picker>
            <picker
              mode="selector"
              :range="SHANXIANG_LABELS"
              :value="sittingIdx ?? 0"
              class="sel-picker"
              @change="onSittingChange"
            >
              <view class="sel-btn" :class="{ 'sel-btn-on': sittingIdx !== null }">
                <text class="sel-btn-text" :class="{ 'sel-btn-text-off': sittingIdx === null }">
                  {{ sittingIdx === null ? '选择山向' : shanxiangLabel(sittingIdx) }}
                </text>
                <app-icon name="chevron-down" :size="26" color="var(--text-soft)" />
              </view>
            </picker>
            <picker mode="selector" :range="SHUIKOU_LABELS" :value="shuikouIdx" class="sel-picker" @change="onShuikouChange">
              <view class="sel-btn">
                <text class="sel-btn-text">水口在{{ MOUNTAINS[shuikouIdx] }}</text>
                <app-icon name="chevron-down" :size="26" color="var(--text-soft)" />
              </view>
            </picker>
          </view>

          <!-- 下卦 / 替卦 -->
          <view class="gua-row">
            <view class="radio" @tap="useTi = false">
              <view class="radio-dot" :class="{ 'radio-dot-on': !useTi }">
                <app-icon v-if="!useTi" name="check" :size="24" color="#ffffff" />
              </view>
              <text class="radio-text" :class="{ 'radio-text-on': !useTi }">下卦</text>
            </view>
            <view class="radio" @tap="useTi = true">
              <view class="radio-dot" :class="{ 'radio-dot-on': useTi }">
                <app-icon v-if="useTi" name="check" :size="24" color="#ffffff" />
              </view>
              <text class="radio-text" :class="{ 'radio-text-on': useTi }">替卦</text>
            </view>
          </view>
        </paper-card>

        <!-- 开始排盘 -->
        <view class="submit" @tap="handleSubmit">
          <app-icon name="compass" :size="32" color="#ffffff" />
          <text class="submit-text">开始排盘</text>
        </view>

        <!-- 排盘记录（V0 独立 history 页砍成内嵌卡） -->
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
              :class="{ 'row-bd': i < history.length - 1 }"
              @tap="openRecord(h)"
            >
              <view class="his-main">
                <view class="his-line1">
                  <text class="his-topic">{{ h.params.customer || '未填写' }}</text>
                  <text class="his-summary">{{ h.summary }}</text>
                </view>
                <text class="his-date">{{ formatParamsTime(h.params) }}</text>
              </view>
              <app-icon name="chevron-right" :size="28" color="#9ca3af" />
            </view>
          </paper-card>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="玄空飞星为传统堪舆学说，所示格局气机仅供文化研究与参考，切勿迷信。"
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
.name-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }
.input-ph { color: rgba(153, 153, 153, 0.5); }

/* 大运/山向/水口 三格 */
.sel-row { display: flex; gap: 16rpx; padding: 30rpx 32rpx; }
.sel-picker { flex: 1; min-width: 0; }
.sel-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4rpx;
  padding: 20rpx 20rpx;
  border-radius: 16rpx;
  border: 2rpx solid var(--line);
  background: var(--bg-paper);
}
.sel-btn:active { background: rgba(0, 0, 0, 0.02); }
.sel-btn-on { border-color: rgba(196, 30, 58, 0.5); }
.sel-btn-text {
  font-size: 26rpx;
  color: var(--text-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sel-btn-text-off { color: var(--text-soft); }

/* 下卦/替卦单选 */
.gua-row { display: flex; align-items: center; justify-content: center; gap: 80rpx; padding: 30rpx 32rpx; }
.radio { display: flex; align-items: center; gap: 14rpx; }
.radio-dot {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(153, 153, 153, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.radio-dot-on { border-color: var(--brand); background: var(--brand); }
.radio-text { font-size: 30rpx; color: var(--text-soft); }
.radio-text-on { color: var(--text-ink); font-weight: 600; }

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
.his-summary { font-family: Georgia, 'Songti SC', serif; font-size: 24rpx; color: var(--brand); flex-shrink: 0; }
.his-date { font-size: 22rpx; color: var(--text-soft); }
</style>
