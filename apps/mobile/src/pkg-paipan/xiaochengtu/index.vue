<script setup lang="ts">
/**
 * 小成图起卦入口页——自 V0 app/xiaochengtu/page.tsx 还原
 * 七种起卦方式：手动指定 / 在线摇卦 / 卦名起卦 / 数字起卦1 / 数字起卦2 / 时间起卦 / 自动起卦
 * 中宫方式：四正归藏 / 正隅归藏。输入以 payload 传结果页本地重算（同第一批惯例）。
 * 取舍：V0 datetime-local 输入改 DatePickerModal（同 meihua）；select 改原生 picker；
 *       V0「排盘记录」链接 /records 改本地存储底部弹层（key: rebu:xiaochengtu-history，同第一批惯例）；
 *       在线摇卦在本页以真随机成象六爻并定动爻后随 payload 传递，保证记录可复现。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import DatePickerModal from '@/components/bazi/date-picker-modal.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { HEX_NAMES } from '@/pkg-paipan/lib/meihua-data'
import type { XctCastMethod, ZhongGongMethod } from '@/pkg-paipan/lib/xiaochengtu-engine'
import { toSolarSafe } from '@/pkg-paipan/lib/date-convert'

const GUA_OPTIONS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']
const UPPER_LABELS = GUA_OPTIONS.map((g) => `上${g}`)
const LOWER_LABELS = GUA_OPTIONS.map((g) => `下${g}`)
const DONG_LABELS = [1, 2, 3, 4, 5, 6].map((n) => `${n}爻动`)

/** 全部 64 卦名（上卦序 × 下卦序，先天卦序乾1…坤8） */
const ALL_HEX: { name: string; upper: number; lower: number }[] = []
for (let u = 1; u <= 8; u++) {
  for (let l = 1; l <= 8; l++) {
    ALL_HEX.push({ name: HEX_NAMES[u][l], upper: u, lower: l })
  }
}
const HEX_LABELS = ALL_HEX.map((h) => h.name)

const METHOD_OPTIONS: { id: XctCastMethod; label: string }[] = [
  { id: 'manual', label: '手动指定' },
  { id: 'yao', label: '在线摇卦' },
  { id: 'guaming', label: '卦名起卦' },
  { id: 'number1', label: '数字起卦1' },
  { id: 'number2', label: '数字起卦2' },
  { id: 'time', label: '时间起卦' },
  { id: 'auto', label: '自动起卦' },
]
const METHOD_LABELS = METHOD_OPTIONS.map((o) => o.label)

const HISTORY_KEY = 'rebu:xiaochengtu-history'

interface HistoryRecord {
  id: number
  matter: string
  dateText: string
  guaText: string
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
const zhonggong = ref<ZhongGongMethod>('sizheng')
const method = ref<XctCastMethod>('time')
const methodIdx = computed(() => METHOD_OPTIONS.findIndex((o) => o.id === method.value))
const upperIdx = ref(0)
const lowerIdx = ref(0)
const dongIdx = ref(0)
const hexIdx = ref(0)
const num1 = ref('')
const num2 = ref('')
const num3 = ref('')
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

function onMethodChange(e: { detail: { value: number | string } }) {
  const o = METHOD_OPTIONS[Number(e.detail.value)]
  if (o) method.value = o.id
}
function onUpperChange(e: { detail: { value: number | string } }) { upperIdx.value = Number(e.detail.value) }
function onLowerChange(e: { detail: { value: number | string } }) { lowerIdx.value = Number(e.detail.value) }
function onDongChange(e: { detail: { value: number | string } }) { dongIdx.value = Number(e.detail.value) }
function onHexChange(e: { detail: { value: number | string } }) { hexIdx.value = Number(e.detail.value) }

/** 数字输入：仅保留数字，最多 4 位（同 V0；uni input 事件类型受限，改提交时过滤） */
function digitsOnly(v: string) { return v.replace(/\D/g, '').slice(0, 4) }

const METHOD_NOTES: Record<XctCastMethod, string[]> = {
  time: [
    '起卦算法（月日数为农历）：',
    '上卦：（年支数 + 月数 + 日数）÷ 8 所得余数为上卦',
    '下卦：（年支数 + 月数 + 日数 + 时支数）÷ 8 所得余数为下卦',
    '动爻：（年支数 + 月数 + 日数 + 时支数）÷ 6 所得余数为动爻',
  ],
  number1: ['数一除8取余为上卦，数二除8取余为下卦，两数之和除6取余为动爻。'],
  number2: ['数一为上卦、数二为下卦（除8取余），数三除6取余为动爻。'],
  yao: ['默想所问之事，点击开始排盘，系统随机成象六爻并定动爻。'],
  auto: ['系统随机生成上卦、下卦与动爻，适合快速起例学习。'],
  manual: ['直接指定卦象与动爻，适合复盘古例或已有卦象的情况。'],
  guaming: ['直接指定卦象与动爻，适合复盘古例或已有卦象的情况。'],
}

/** 随机布尔序列：优先 crypto 真随机，端上无 crypto 时退化 Math.random */
function randomBools(n: number): boolean[] {
  try {
    const c = (globalThis as { crypto?: { getRandomValues?: (b: Uint8Array) => void } }).crypto
    if (c?.getRandomValues) {
      const buf = new Uint8Array(n)
      c.getRandomValues(buf)
      return Array.from(buf, (b) => b % 2 === 0)
    }
  } catch { /* 降级 */ }
  return Array.from({ length: n }, () => Math.random() > 0.5)
}

/** 随机整数 1~n：优先 crypto，无则 Math.random */
function randInt(n: number): number {
  try {
    const c = (globalThis as { crypto?: { getRandomValues?: (b: Uint32Array) => void } }).crypto
    if (c?.getRandomValues) {
      const buf = new Uint32Array(1)
      c.getRandomValues(buf)
      return (buf[0] % n) + 1
    }
  } catch { /* 降级 */ }
  return Math.floor(Math.random() * n) + 1
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
  navigateTo(`/pkg-paipan/xiaochengtu/result?payload=${encodeURIComponent(JSON.stringify(r.params))}`)
}

function handleSubmit() {
  const t = dateTime.value
  const params: Record<string, unknown> = {
    topic: topic.value.trim(),
    year: t.year, month: t.month, day: t.day, hour: t.hour, minute: t.minute,
    m: method.value,
    zg: zhonggong.value,
    ts: Date.now(),
  }
  if (method.value === 'manual') {
    params.u = upperIdx.value + 1
    params.l = lowerIdx.value + 1
    params.dong = dongIdx.value + 1
  } else if (method.value === 'guaming') {
    const h = ALL_HEX[hexIdx.value]
    params.u = h.upper
    params.l = h.lower
    params.dong = dongIdx.value + 1
  } else if (method.value === 'number1' || method.value === 'number2') {
    const a = Number.parseInt(digitsOnly(num1.value), 10)
    const b = Number.parseInt(digitsOnly(num2.value), 10)
    const c = method.value === 'number2' ? Number.parseInt(digitsOnly(num3.value), 10) : 1
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || a < 1 || b < 1 || c < 1) {
      uni.showToast({ title: '请输入有效的起卦数字', icon: 'none' })
      return
    }
    params.n1 = a
    params.n2 = b
    if (method.value === 'number2') params.n3 = c
  } else if (method.value === 'yao') {
    // 摇卦成象在本页完成（真随机），随 payload 传递，历史记录可复现
    params.lines = randomBools(6).map((v) => (v ? '1' : '0')).join('')
    params.dong = randInt(6)
  }
  navigateTo(`/pkg-paipan/xiaochengtu/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header
      title="小成图"
      subtitle="九宫布卦 · 卦气升降"
      share
      share-title="小成图排盘"
    >
      <template #actions>
        <view
          class="th-history-btn"
          @tap="openHistory"
        >
          <app-icon
            name="history"
            :size="36"
            color="var(--text-ink)"
          />
        </view>
      </template>
    </tool-header>

    <scroll-view
      scroll-y
      class="body"
    >
      <view class="inner">
        <!-- 朱底题头 -->
        <view class="hero">
          <text class="hero-title">
            小成图排盘
          </text>
          <text class="hero-sub">
            霍氏小成图 · 九宫布卦 · 归藏中宫 · 卦气升降
          </text>
        </view>

        <!-- 表单卡片 -->
        <view class="form-card">
          <!-- 事项内容 -->
          <view class="form-row">
            <text class="form-label">
              事项内容
            </text>
            <input
              v-model="topic"
              class="topic-input"
              type="text"
              placeholder="请输入事项（选填）"
            >
          </view>

          <!-- 起卦时间 -->
          <view
            class="form-row"
            @tap="showDatePicker = true"
          >
            <view class="form-label-group">
              <text class="form-label">
                起卦时间
              </text>
              <view
                class="refresh-btn"
                @tap.stop="refreshTime"
              >
                <app-icon
                  name="refresh-cw"
                  :size="28"
                  color="var(--text-soft)"
                />
              </view>
            </view>
            <view class="form-value">
              <text class="form-value-text">
                {{ dateTimeText }}
              </text>
              <app-icon
                name="chevron-down"
                :size="28"
                color="var(--text-soft)"
              />
            </view>
          </view>

          <!-- 中宫方式 -->
          <view class="form-row">
            <text class="form-label">
              中宫方式
            </text>
            <view class="chips">
              <view
                class="chip"
                :class="{ 'chip-on': zhonggong === 'sizheng' }"
                @tap="zhonggong = 'sizheng'"
              >
                <text
                  class="chip-text"
                  :class="{ 'chip-text-on': zhonggong === 'sizheng' }"
                >
                  四正归藏
                </text>
              </view>
              <view
                class="chip"
                :class="{ 'chip-on': zhonggong === 'zhengyu' }"
                @tap="zhonggong = 'zhengyu'"
              >
                <text
                  class="chip-text"
                  :class="{ 'chip-text-on': zhonggong === 'zhengyu' }"
                >
                  正隅归藏
                </text>
              </view>
            </view>
          </view>

          <!-- 起卦方式 -->
          <view class="form-row">
            <text class="form-label">
              起卦方式
            </text>
            <picker
              mode="selector"
              :range="METHOD_LABELS"
              :value="methodIdx"
              @change="onMethodChange"
            >
              <view class="select-btn">
                <text class="select-btn-text">
                  {{ METHOD_LABELS[methodIdx] }}
                </text>
                <app-icon
                  name="chevron-down"
                  :size="28"
                  color="var(--text-soft)"
                />
              </view>
            </picker>
          </view>

          <!-- 手动指定：上卦/下卦/动爻 -->
          <view
            v-if="method === 'manual'"
            class="form-row"
          >
            <text class="form-label">
              指定卦爻
            </text>
            <view class="select-group">
              <picker
                mode="selector"
                :range="UPPER_LABELS"
                :value="upperIdx"
                @change="onUpperChange"
              >
                <view class="select-btn">
                  <text class="select-btn-text">
                    {{ UPPER_LABELS[upperIdx] }}
                  </text>
                </view>
              </picker>
              <picker
                mode="selector"
                :range="LOWER_LABELS"
                :value="lowerIdx"
                @change="onLowerChange"
              >
                <view class="select-btn">
                  <text class="select-btn-text">
                    {{ LOWER_LABELS[lowerIdx] }}
                  </text>
                </view>
              </picker>
              <picker
                mode="selector"
                :range="DONG_LABELS"
                :value="dongIdx"
                @change="onDongChange"
              >
                <view class="select-btn">
                  <text class="select-btn-text">
                    {{ DONG_LABELS[dongIdx] }}
                  </text>
                </view>
              </picker>
            </view>
          </view>

          <!-- 卦名起卦：选择卦名 + 动爻 -->
          <view
            v-if="method === 'guaming'"
            class="form-row"
          >
            <text class="form-label">
              选择卦名
            </text>
            <view class="select-group">
              <picker
                mode="selector"
                :range="HEX_LABELS"
                :value="hexIdx"
                @change="onHexChange"
              >
                <view class="select-btn select-btn-wide">
                  <text class="select-btn-text">
                    {{ HEX_LABELS[hexIdx] }}
                  </text>
                  <app-icon
                    name="chevron-down"
                    :size="28"
                    color="var(--text-soft)"
                  />
                </view>
              </picker>
              <picker
                mode="selector"
                :range="DONG_LABELS"
                :value="dongIdx"
                @change="onDongChange"
              >
                <view class="select-btn">
                  <text class="select-btn-text">
                    {{ DONG_LABELS[dongIdx] }}
                  </text>
                </view>
              </picker>
            </view>
          </view>

          <!-- 数字起卦：输入数字 -->
          <view
            v-if="method === 'number1' || method === 'number2'"
            class="form-row"
          >
            <text class="form-label">
              输入数字
            </text>
            <view class="select-group">
              <input
                v-model="num1"
                class="num-input"
                type="number"
                :maxlength="4"
                placeholder="数一"
              >
              <input
                v-model="num2"
                class="num-input"
                type="number"
                :maxlength="4"
                placeholder="数二"
              >
              <input
                v-if="method === 'number2'"
                v-model="num3"
                class="num-input"
                type="number"
                :maxlength="4"
                placeholder="数三"
              >
            </view>
          </view>

          <!-- 算法说明 -->
          <view
            class="notes-block"
            :class="{ 'notes-boxed': method === 'time' }"
          >
            <text
              v-for="(line, i) in METHOD_NOTES[method]"
              :key="i"
              class="note-line"
              :class="{ 'note-line-strong': method === 'time' && i === 0 }"
            >
              {{ line }}
            </text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="actions">
          <view
            class="submit"
            @tap="handleSubmit"
          >
            <text class="submit-text">
              开始排盘
            </text>
          </view>
          <view
            class="history-btn"
            @tap="openHistory"
          >
            <text class="history-btn-text">
              排盘记录
            </text>
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="小成图为传统术数文化内容，结果仅供文化研究与参考，不构成任何决策建议。"
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

    <!-- 排盘记录弹层（本地存储） -->
    <view
      v-if="showHistory"
      class="mask"
      @tap="showHistory = false"
    >
      <view
        class="sheet sheet-history"
        @tap.stop
      >
        <view class="sheet-hdr">
          <text
            class="sheet-cancel"
            @tap="showHistory = false"
          >
            关闭
          </text>
          <text class="sheet-title">
            排盘记录
          </text>
          <text
            class="sheet-clear"
            :class="{ 'sheet-clear-off': records.length === 0 }"
            @tap="clearHistory"
          >
            清空
          </text>
        </view>
        <scroll-view
          scroll-y
          class="history-list"
        >
          <view
            v-if="records.length === 0"
            class="history-empty"
          >
            <text class="history-empty-text">
              暂无排盘记录，起卦排盘后自动留存
            </text>
          </view>
          <view
            v-for="r in records"
            :key="r.id"
            class="history-item"
            @tap="openRecord(r)"
          >
            <view class="history-item-main">
              <text class="history-matter">
                {{ r.matter || '未命名事项' }}
              </text>
              <text class="history-gua">
                {{ r.guaText }}
              </text>
            </view>
            <text class="history-date">
              {{ r.dateText }}
            </text>
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

/* ── 表单卡片（同第一批 meihua 范式） ── */
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
.topic-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }

/* ── 中宫方式 chips ── */
.chips { display: flex; align-items: center; gap: 16rpx; }
.chip {
  padding: 12rpx 24rpx; border-radius: 999rpx;
  border: 1rpx solid var(--line); background: var(--card);
  &:active { opacity: 0.8; }
}
.chip-on { border-color: var(--brand); background: var(--brand); }
.chip-text { font-size: 24rpx; color: var(--text-soft); }
.chip-text-on { color: #fff; font-weight: 500; }

/* ── 下拉选择（原生 picker 触发钮） ── */
.select-group { display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; justify-content: flex-end; min-width: 0; }
.select-btn {
  display: flex; align-items: center; gap: 8rpx;
  padding: 14rpx 24rpx; border-radius: 16rpx;
  border: 1rpx solid var(--line); background: rgba(0, 0, 0, 0.03);
  &:active { background: rgba(0, 0, 0, 0.07); }
}
.select-btn-wide { min-width: 220rpx; justify-content: space-between; }
.select-btn-text { font-size: 28rpx; color: var(--text-ink); }

/* ── 数字输入 ── */
.num-input {
  width: 150rpx;
  padding: 14rpx 20rpx;
  border-radius: 16rpx;
  border: 1rpx solid var(--line);
  background: var(--bg-paper);
  font-size: 28rpx; text-align: right;
  color: var(--text-ink);
}

/* ── 算法说明 ── */
.notes-block { padding: 24rpx 32rpx 30rpx; display: flex; flex-direction: column; gap: 6rpx; }
.notes-boxed {
  margin: 24rpx 32rpx 30rpx; padding: 24rpx;
  border-radius: 20rpx; background: rgba(0, 0, 0, 0.03);
}
.note-line { font-size: 24rpx; color: var(--text-soft); line-height: 1.7; }
.note-line-strong { font-weight: 700; color: var(--text-ink); }

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
  padding: 28rpx;
  background: var(--card);
  border-radius: 24rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.3);
  &:active { background: rgba(196, 30, 58, 0.05); }
}
.history-btn-text { display: block; text-align: center; font-size: 30rpx; font-weight: 700; color: var(--brand); }

/* ── 底部弹层（同第一批 meihua 范式） ── */
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
.sheet-clear { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.sheet-clear-off { opacity: 0.4; }

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
