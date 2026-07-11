<script setup lang="ts">
/**
 * 梅花易数起卦入口页——自 V0 app/meihua/page.tsx 还原
 * 五种起卦方式：时间起卦 / 手动指定 / 数字起卦1 / 数字起卦2 / 自动起卦
 * 排盘记录本地存储（key: rebu:meihua:history），底部弹层查看/重开。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import DatePickerModal from '@/components/bazi/date-picker-modal.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

type QiguaMode = 'time' | 'manual' | 'number1' | 'number2' | 'auto'

const MODE_LABELS: Record<QiguaMode, string> = {
  time: '时间起卦',
  manual: '手动指定',
  number1: '数字起卦1',
  number2: '数字起卦2',
  auto: '自动起卦',
}
const MODE_KEYS = Object.keys(MODE_LABELS) as QiguaMode[]

const MODE_NOTES: Record<QiguaMode, string[]> = {
  time: [
    '起卦方法（月日数为农历）：',
    '上卦：（年支数+月数+日数）÷8 所得余数为上卦',
    '下卦：（年支数+月数+日数+时支数）÷8 所得余数为下卦',
    '动爻：（年支数+月数+日数+时支数）÷6 所得余数',
  ],
  manual: [],
  number1: [
    '起卦算法：一组数字个数为偶数，则平分为二，以前一半数字之和除以8取余数得上卦，以后一半数字之和除以8取余数得下卦，上下卦数相加除以6取余数为动爻数。若一组数其数字个数为奇，划分时前部分数字比后部分少一个数字。',
  ],
  number2: ['起卦算法：第1数÷8 所得余数为上卦，第2数÷8 所得余数为下卦，第3数÷6 所得余数为动爻。'],
  auto: ['自动起卦：系统随机生成卦象与动爻，适合心中默念所测之事后起卦。'],
}

// 爻位名（自上而下展示）
const YAO_NAMES = ['上爻', '五爻', '四爻', '三爻', '二爻', '初爻']

const HISTORY_KEY = 'rebu:meihua:history'

interface HistoryRecord {
  id: number
  matter: string
  dateText: string
  guaText: string
  params: Record<string, unknown>
  createdAt: number
}

const matter = ref('')
const now = new Date()
const dateTime = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: now.getMinutes(),
})
const mode = ref<QiguaMode>('time')
const numbers = ref('')
const dongYaoPlusHour = ref(false)
// 手动指定：yaos[0]=上爻 ... yaos[5]=初爻，true=阳
const yaos = ref<boolean[]>([true, true, true, true, true, true])
const movingYao = ref<number | null>(null) // 索引 0=上爻
const showModePicker = ref(false)
const showDatePicker = ref(false)
const showHistory = ref(false)
const records = ref<HistoryRecord[]>([])

function pad(n: number) { return String(n).padStart(2, '0') }

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

const dateTimeText = computed(() => {
  const t = dateTime.value
  return `${t.year}年${t.month}月${t.day}日 ${pad(t.hour)}时${pad(t.minute)}分`
})

const numbersValid = computed(() => {
  if (mode.value === 'number1') {
    const nums = numbers.value.split(/[,，\s]+/).filter((n) => /^\d+$/.test(n))
    return nums.length >= 1
  }
  if (mode.value === 'number2') {
    return /^\d{3}$/.test(numbers.value.trim())
  }
  return true
})

function onDateConfirm(d: { year: number; month: number; day: number; hour: number | null; minute: number | null }) {
  dateTime.value = {
    year: d.year,
    month: d.month,
    day: d.day,
    hour: d.hour ?? dateTime.value.hour,
    minute: d.minute ?? dateTime.value.minute,
  }
}

function setYao(i: number, yang: boolean) {
  yaos.value = yaos.value.map((y, j) => (j === i ? yang : y))
}
function toggleMoving(i: number) {
  movingYao.value = movingYao.value === i ? null : i
}

function pickMode(m: QiguaMode) {
  mode.value = m
  showModePicker.value = false
}

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
  navigateTo(`/pkg-paipan/meihua/result?payload=${encodeURIComponent(JSON.stringify(r.params))}`)
}

function handleSubmit() {
  if (!numbersValid.value) {
    uni.showToast({ title: mode.value === 'number2' ? '请输入一个三位的数字' : '请输入起卦数字', icon: 'none' })
    return
  }
  const t = dateTime.value
  const params: Record<string, unknown> = {
    matter: matter.value,
    year: t.year, month: t.month, day: t.day, hour: t.hour, minute: t.minute,
    mode: mode.value,
  }
  if (mode.value === 'number1' || mode.value === 'number2') {
    params.numbers = numbers.value.trim()
    params.plusHour = dongYaoPlusHour.value ? '1' : '0'
  }
  if (mode.value === 'manual') {
    // 自上而下：1=阳 0=阴
    params.yaos = yaos.value.map((y) => (y ? '1' : '0')).join('')
    if (movingYao.value !== null) params.moving = String(movingYao.value)
  }
  navigateTo(`/pkg-paipan/meihua/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header title="梅花易数" subtitle="观物取象 · 体用生克" share>
      <template #actions>
        <view class="th-history-btn" @tap="openHistory">
          <app-icon name="history" :size="36" color="var(--text-ink)" />
        </view>
      </template>
    </tool-header>

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <view class="form-card">
          <!-- 事项内容 -->
          <view class="form-row">
            <text class="form-label">事项内容</text>
            <input
              v-model="matter"
              class="matter-input"
              type="text"
              placeholder="请输入事项内容(选填)"
            >
          </view>

          <!-- 起卦时间 -->
          <view class="form-row" @tap="showDatePicker = true">
            <view class="form-label-group">
              <text class="form-label">起卦时间</text>
              <view class="refresh-btn" @tap.stop="refreshTime">
                <app-icon name="refresh-cw" :size="28" color="var(--text-soft)" />
              </view>
            </view>
            <view class="form-value">
              <text class="form-value-text">{{ dateTimeText }}</text>
              <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
            </view>
          </view>

          <!-- 起卦方式 -->
          <view class="form-row">
            <text class="form-label">起卦方式</text>
            <view class="mode-btn" @tap="showModePicker = true">
              <text class="mode-btn-text">{{ MODE_LABELS[mode] }}</text>
              <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
            </view>
          </view>

          <!-- 数字起卦输入 -->
          <view v-if="mode === 'number1' || mode === 'number2'" class="form-row">
            <input
              v-model="numbers"
              class="numbers-input"
              type="text"
              :placeholder="mode === 'number1' ? '请输入起卦数字' : '请输入一个三位的数字'"
            >
            <view class="radio-item" @tap="dongYaoPlusHour = !dongYaoPlusHour">
              <view class="radio-circle" :class="{ 'radio-on': dongYaoPlusHour }">
                <view v-if="dongYaoPlusHour" class="radio-dot" />
              </view>
              <text class="radio-text">动爻加时辰</text>
            </view>
          </view>

          <!-- 手动指定六爻 -->
          <view v-if="mode === 'manual'" class="yaos-block">
            <view v-for="(name, i) in YAO_NAMES" :key="name" class="yao-row">
              <text class="yao-name">{{ name }}</text>
              <view class="yao-choices">
                <view class="yao-choice" :class="{ 'yao-choice-on': yaos[i] }" @tap="setYao(i, true)">
                  <text class="yao-choice-text" :class="{ 'yao-choice-text-on': yaos[i] }">少阳</text>
                  <view class="yao-bar-yang" :class="{ 'yao-bar-on': yaos[i] }" />
                </view>
                <view class="yao-choice" :class="{ 'yao-choice-on': !yaos[i] }" @tap="setYao(i, false)">
                  <text class="yao-choice-text" :class="{ 'yao-choice-text-on': !yaos[i] }">少阴</text>
                  <view class="yao-bar-yin">
                    <view class="yao-bar-seg" :class="{ 'yao-bar-on': !yaos[i] }" />
                    <view class="yao-bar-seg" :class="{ 'yao-bar-on': !yaos[i] }" />
                  </view>
                </view>
              </view>
              <view class="radio-item" @tap="toggleMoving(i)">
                <view class="radio-circle" :class="{ 'radio-on': movingYao === i }">
                  <view v-if="movingYao === i" class="radio-dot" />
                </view>
                <text class="radio-text">{{ name.charAt(0) }}爻动</text>
              </view>
            </view>
          </view>

          <!-- 算法说明 -->
          <view v-if="MODE_NOTES[mode].length > 0" class="notes-block">
            <text v-for="(line, i) in MODE_NOTES[mode]" :key="i" class="note-line">{{ line }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="actions">
          <view class="submit" :class="{ 'submit-disabled': !numbersValid }" @tap="handleSubmit">
            <text class="submit-text">开始排盘</text>
          </view>
          <view class="history-btn" @tap="openHistory">
            <text class="history-btn-text">排盘记录</text>
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="本工具仅供传统文化爱好者研究学习使用，占测结果不构成任何预测或建议。"
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

    <!-- 起卦方式选择弹层 -->
    <view v-if="showModePicker" class="mask" @tap="showModePicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-hdr">
          <text class="sheet-cancel" @tap="showModePicker = false">取消</text>
          <text class="sheet-title">起卦方式</text>
          <text class="sheet-ok" @tap="showModePicker = false">确定</text>
        </view>
        <view
          v-for="m in MODE_KEYS"
          :key="m"
          class="sheet-option"
          :class="{ 'sheet-option-on': mode === m }"
          @tap="pickMode(m)"
        >
          <text class="sheet-option-text" :class="{ 'sheet-option-text-on': mode === m }">{{ MODE_LABELS[m] }}</text>
        </view>
      </view>
    </view>

    <!-- 排盘记录弹层（本地存储） -->
    <view v-if="showHistory" class="mask" @tap="showHistory = false">
      <view class="sheet sheet-history" @tap.stop>
        <view class="sheet-hdr">
          <text class="sheet-cancel" @tap="showHistory = false">关闭</text>
          <text class="sheet-title">排盘记录</text>
          <text class="sheet-clear" :class="{ 'sheet-clear-off': records.length === 0 }" @tap="clearHistory">清空</text>
        </view>
        <scroll-view scroll-y class="history-list">
          <view v-if="records.length === 0" class="history-empty">
            <text class="history-empty-text">暂无排盘记录，起卦后在结果页点「保存」即可留存</text>
          </view>
          <view v-for="r in records" :key="r.id" class="history-item" @tap="openRecord(r)">
            <view class="history-item-main">
              <text class="history-matter">{{ r.matter || '未命名事项' }}</text>
              <text class="history-gua">{{ r.guaText }}</text>
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

/* 表单卡片 */
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
.form-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.form-label-group { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.refresh-btn { padding: 8rpx; display: flex; align-items: center; }
.form-value { display: flex; align-items: center; gap: 6rpx; }
.form-value-text { font-size: 28rpx; color: var(--text-ink); }
.matter-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text); min-width: 0; }

/* 起卦方式按钮 */
.mode-btn {
  display: flex; align-items: center; gap: 10rpx;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 16rpx;
  padding: 14rpx 24rpx;
  &:active { background: rgba(0, 0, 0, 0.08); }
}
.mode-btn-text { font-size: 28rpx; color: var(--text-ink); }

/* 数字起卦 */
.numbers-input {
  flex: 1; min-width: 0;
  padding: 18rpx 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid var(--line);
  background: var(--bg-paper);
  font-size: 28rpx;
  color: var(--text-ink);
}

/* 单选圈 */
.radio-item { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.radio-circle {
  width: 40rpx; height: 40rpx; border-radius: 50%;
  border: 4rpx solid rgba(0, 0, 0, 0.25);
  display: flex; align-items: center; justify-content: center;
  box-sizing: border-box;
}
.radio-on { border-color: var(--brand); background: var(--brand); }
.radio-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #fff; }
.radio-text { font-size: 26rpx; color: var(--text-ink); }

/* 手动指定六爻 */
.yaos-block { display: flex; flex-direction: column; gap: 24rpx; padding: 30rpx 32rpx; border-bottom: 1rpx solid var(--line); }
.yao-row { display: flex; align-items: center; gap: 20rpx; }
.yao-name { width: 80rpx; font-size: 26rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.yao-choices { flex: 1; display: flex; gap: 16rpx; min-width: 0; }
.yao-choice {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 16rpx 0;
  border-radius: 16rpx;
  border: 1rpx solid var(--line);
}
.yao-choice-on { border-color: var(--brand); background: rgba(196, 30, 58, 0.08); }
.yao-choice-text { font-size: 26rpx; color: var(--text-soft); }
.yao-choice-text-on { color: var(--brand); font-weight: 500; }
.yao-bar-yang { width: 64rpx; height: 10rpx; border-radius: 4rpx; background: var(--text-soft); }
.yao-bar-yin { display: flex; gap: 8rpx; width: 64rpx; }
.yao-bar-seg { flex: 1; height: 10rpx; border-radius: 4rpx; background: var(--text-soft); }
.yao-bar-on { background: var(--brand); }

/* 算法说明 */
.notes-block { padding: 24rpx 32rpx; display: flex; flex-direction: column; gap: 6rpx; }
.note-line { font-size: 24rpx; color: var(--text-soft); line-height: 1.6; }

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
  padding: 28rpx;
  background: var(--card);
  border-radius: 24rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.3);
  &:active { background: rgba(196, 30, 58, 0.05); }
}
.history-btn-text { display: block; text-align: center; font-size: 30rpx; font-weight: 700; color: var(--brand); }

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
}
.sheet-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.sheet-cancel { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.sheet-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.sheet-ok { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.sheet-clear { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.sheet-clear-off { opacity: 0.4; }
.sheet-option {
  padding: 28rpx 0;
  text-align: center;
  border-bottom: 1rpx solid var(--line);
  &:last-child { border-bottom: none; }
}
.sheet-option-on { background: rgba(196, 30, 58, 0.05); }
.sheet-option-text { font-size: 28rpx; color: var(--text-soft); }
.sheet-option-text-on { font-size: 32rpx; color: var(--brand); font-weight: 600; }

/* 排盘记录 */
.sheet-history { max-height: 70vh; display: flex; flex-direction: column; }
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
.history-matter {
  font-size: 28rpx; font-weight: 500; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.history-gua { font-size: 24rpx; color: var(--brand); font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif; }
.history-date { font-size: 22rpx; color: var(--text-soft); flex-shrink: 0; }
</style>
