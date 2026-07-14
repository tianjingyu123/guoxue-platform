<script setup lang="ts">
/**
 * 六爻排盘·起卦入口页（自 V0 app/liuyao/page.tsx 还原）
 * 七种起卦方式：手动指定 / 在线摇卦 / 卦名起卦 / 数字起卦1 / 数字起卦2 / 时间起卦 / 自动起卦。
 * 结果页本地装卦（pkg-paipan2/lib/liuyao-engine，73/73 黄金测试通过），零后端依赖。
 *
 * ⚠️ 本页替代旧的 pkg-paipan/liuyao/*：旧页走 lib/liuyao-result-data.ts 的
 *    `if (true) return _mockLiuyaoResult` 硬编码假盘（后端真算法被短路），已随本次重做删除。
 * 取舍：V0 独立 history 页砍成入口页内嵌历史卡（与玄空/太乙批次范式一致）；
 *      摇卦铜钱图片改为 CSS 绘制的铜钱（避免新增图片资源）。
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
import { QIGUA_METHODS, METHOD_NOTES, BAGUA_OPTIONS, type QiguaMethodKey } from '@/pkg-paipan2/lib/liuyao-data'
import { randomCoinThrow } from '@/pkg-paipan2/lib/liuyao-engine'
import { toSolarSafe } from '@/pkg-paipan2/lib/date-convert'
import {
  loadLiuyaoHistory,
  clearLiuyaoHistory,
  formatParamsTime,
  type LiuyaoParams,
  type LiuyaoHistoryItem,
} from './liuyao-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案，路由/逻辑不变）
let hdrTitle = '六爻排盘'
// #ifdef MP-WEIXIN
hdrTitle = '易卦文化研究'
// #endif

const matter = ref('')
const now = new Date()
const dateTime = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: now.getMinutes(),
})
const method = ref<QiguaMethodKey>('auto')
const numberInput = ref('')
const guaPick = ref({ benUp: '乾卦 ☰', benDown: '乾卦 ☰', bianUp: '乾卦 ☰', bianDown: '乾卦 ☰' })

// 摇卦：已摇次数 + 旋转中 + 六次真实掷值（6老阴/7少阳/8少阴/9老阳，自下而上）
const shakeCount = ref(0)
const spinning = ref(false)
const coinThrows = ref<number[]>([])

const showDatePicker = ref(false)
const showMethodPicker = ref(false)
const guaPickerTarget = ref<keyof typeof guaPick.value | null>(null)

const METHOD_LABELS = QIGUA_METHODS.map((m) => m.label)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const dateTimeText = computed(() => {
  const t = dateTime.value
  return `${t.year}年${t.month}月${t.day}日 ${pad(t.hour)}时${pad(t.minute)}分`
})

const methodLabel = computed(() => QIGUA_METHODS.find((m) => m.key === method.value)?.label ?? '')
const shakeDone = computed(() => shakeCount.value >= 6)
const submitDisabled = computed(() => method.value === 'coin' && !shakeDone.value)

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
  // 农历输入归一为公历：装卦的四柱恒按公历起，否则农历数字会被当公历排盘
  const { date, ok } = toSolarSafe({ year: d.year, month: d.month, day: d.day, hour, minute, isLunar: d.isLunar })
  if (!ok) {
    uni.showToast({ title: '农历日期无效，请重新选择', icon: 'none' })
    return
  }
  dateTime.value = date
}

function pickMethod(k: QiguaMethodKey) {
  method.value = k
  shakeCount.value = 0
  spinning.value = false
  coinThrows.value = []
  showMethodPicker.value = false
}

/** 摇卦：点击铜钱开始旋转，再点一次落定得一爻 */
function handleCoinTap() {
  if (shakeDone.value) return
  if (spinning.value) {
    spinning.value = false
    coinThrows.value = [...coinThrows.value, randomCoinThrow()]
    shakeCount.value = Math.min(shakeCount.value + 1, 6)
  } else {
    spinning.value = true
  }
}

const coinHint = computed(() => {
  if (shakeDone.value) return '六爻已成，请点击下方开始排盘。'
  if (spinning.value) return '铜钱旋转中，再次点击可得一爻。'
  return METHOD_NOTES.coin
})

function pickGua(g: string) {
  const t = guaPickerTarget.value
  if (!t) return
  guaPick.value = { ...guaPick.value, [t]: g }
  guaPickerTarget.value = null
}

// ── 排盘记录 ──
const history = ref<LiuyaoHistoryItem[]>([])
onShow(() => {
  history.value = loadLiuyaoHistory()
})

function onClearHistory() {
  uni.showModal({
    title: '清空记录',
    content: '确定清空全部排盘记录？',
    success: (res) => {
      if (res.confirm) {
        clearLiuyaoHistory()
        history.value = []
      }
    },
  })
}

function openRecord(h: LiuyaoHistoryItem) {
  navigateTo(`/pkg-paipan2/liuyao/result?payload=${encodeURIComponent(JSON.stringify(h.params))}`)
}

// ── 开始排盘 ──
function handleSubmit() {
  if (submitDisabled.value) return
  const t = dateTime.value
  const params: LiuyaoParams = {
    matter: matter.value.trim().slice(0, 30),
    methodKey: method.value,
    year: t.year,
    month: t.month,
    day: t.day,
    hour: t.hour,
    minute: t.minute,
  }
  if (method.value === 'coin') {
    params.coins = coinThrows.value.slice(0, 6).join(',')
  } else if (method.value === 'auto' || method.value === 'manual') {
    // 自动起卦：提交瞬间以三枚铜钱法随机成卦（固化进参数，可复现同一盘）
    params.coins = Array.from({ length: 6 }, randomCoinThrow).join(',')
  } else if (method.value === 'number1' || method.value === 'number2') {
    if (!numberInput.value.trim()) {
      uni.showToast({ title: '请输入起卦数字', icon: 'none' })
      return
    }
    params.numberInput = numberInput.value.trim()
  } else if (method.value === 'guaname') {
    params.guaPick = { ...guaPick.value }
  }
  navigateTo(`/pkg-paipan2/liuyao/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" subtitle="纳甲装卦 · 六亲六神" share />

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <paper-card padding="none">
          <!-- 事项内容 -->
          <view class="row row-bd">
            <text class="row-label">事项内容</text>
            <input
              v-model="matter"
              class="row-input"
              type="text"
              :maxlength="30"
              placeholder="请输入事项（选填）"
              placeholder-class="input-ph"
            >
          </view>

          <!-- 起卦时间 -->
          <view class="row row-bd row-tap" @tap="showDatePicker = true">
            <view class="row-label-group">
              <text class="row-label">起卦时间</text>
              <view class="refresh-btn" @tap.stop="refreshTime">
                <app-icon name="refresh-cw" :size="26" color="var(--brand)" />
                <text class="refresh-text">此刻</text>
              </view>
            </view>
            <view class="row-value">
              <text class="row-value-text">{{ dateTimeText }}</text>
              <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
            </view>
          </view>

          <!-- 起卦方式 -->
          <view class="row" :class="{ 'row-bd': method === 'coin' || method === 'guaname' || method === 'number1' || method === 'number2' }">
            <text class="row-label">起卦方式</text>
            <view class="method-btn" @tap="showMethodPicker = true">
              <text class="method-text">{{ methodLabel }}</text>
              <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
            </view>
          </view>

          <!-- 在线摇卦 -->
          <view v-if="method === 'coin'" class="coin-sec">
            <view class="coins" @tap="handleCoinTap">
              <view
                v-for="i in 3"
                :key="i"
                class="coin"
                :class="{ 'coin-spin': spinning, 'coin-done': shakeDone }"
                :style="spinning ? { animationDuration: `${0.5 + (i - 1) * 0.15}s` } : {}"
              >
                <view class="coin-hole" />
              </view>
            </view>
            <view class="dots">
              <view
                v-for="i in 6"
                :key="i"
                class="dot"
                :class="{ 'dot-on': i <= shakeCount }"
              />
            </view>
            <text class="coin-hint">{{ coinHint }}</text>
          </view>

          <!-- 卦名起卦 -->
          <view v-if="method === 'guaname'" class="gua-sec">
            <view class="gua-head">
              <text class="gua-head-cell" />
              <text class="gua-head-cell gua-head-label">本卦</text>
              <text class="gua-head-cell gua-head-label">变卦</text>
            </view>
            <view class="gua-row">
              <text class="gua-row-label">上卦</text>
              <view class="gua-btn" @tap="guaPickerTarget = 'benUp'">
                <text class="gua-btn-text">{{ guaPick.benUp }}</text>
                <app-icon name="chevron-down" :size="24" color="var(--text-soft)" />
              </view>
              <view class="gua-btn" @tap="guaPickerTarget = 'bianUp'">
                <text class="gua-btn-text">{{ guaPick.bianUp }}</text>
                <app-icon name="chevron-down" :size="24" color="var(--text-soft)" />
              </view>
            </view>
            <view class="gua-row">
              <text class="gua-row-label">下卦</text>
              <view class="gua-btn" @tap="guaPickerTarget = 'benDown'">
                <text class="gua-btn-text">{{ guaPick.benDown }}</text>
                <app-icon name="chevron-down" :size="24" color="var(--text-soft)" />
              </view>
              <view class="gua-btn" @tap="guaPickerTarget = 'bianDown'">
                <text class="gua-btn-text">{{ guaPick.bianDown }}</text>
                <app-icon name="chevron-down" :size="24" color="var(--text-soft)" />
              </view>
            </view>
          </view>

          <!-- 数字起卦 -->
          <view v-if="method === 'number1' || method === 'number2'" class="row">
            <text class="row-label">输入数字</text>
            <input
              v-model="numberInput"
              class="row-input"
              type="number"
              :placeholder="method === 'number1' ? '请输入起卦数字' : '请输入一个三位的数字'"
              placeholder-class="input-ph"
            >
          </view>
        </paper-card>

        <!-- 算法说明 -->
        <view v-if="method !== 'coin'" class="note">
          <text class="note-text">{{ METHOD_NOTES[method] }}</text>
        </view>

        <!-- 开始排盘 -->
        <view class="submit" :class="{ 'submit-off': submitDisabled }" @tap="handleSubmit">
          <text class="submit-text">开始排盘</text>
        </view>

        <!-- 排盘记录 -->
        <view v-if="history.length" class="his-sec">
          <section-title title="排盘记录" subtitle="点击重看卦盘，最近 50 条">
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
                  <text class="his-topic">{{ h.params.matter || '未填写' }}</text>
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
          text="六爻为传统易学占筮之法，所示卦象与断语仅供文化研究与参考，切勿迷信。"
        />
      </view>
    </scroll-view>

    <!-- 时间选择弹窗 -->
    <date-picker-modal
      :open="showDatePicker"
      :initial-date="dateTime"
      initial-mode="solar"
      @close="showDatePicker = false"
      @confirm="onDateConfirm"
    />

    <!-- 起卦方式弹层 -->
    <view v-if="showMethodPicker" class="mask" @tap="showMethodPicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择起卦方式</text>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view
            v-for="m in QIGUA_METHODS"
            :key="m.key"
            class="sheet-item"
            @tap="pickMethod(m.key)"
          >
            <text class="sheet-item-text" :class="{ 'sheet-item-on': method === m.key }">{{ m.label }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 八卦选择弹层 -->
    <view v-if="guaPickerTarget" class="mask" @tap="guaPickerTarget = null">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择卦象</text>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view v-for="g in BAGUA_OPTIONS" :key="g" class="sheet-item" @tap="pickGua(g)">
            <text
              class="sheet-item-text"
              :class="{ 'sheet-item-on': guaPickerTarget && guaPick[guaPickerTarget] === g }"
            >{{ g }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* 表单行 */
.row { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; padding: 30rpx 32rpx; }
.row-bd { border-bottom: 1rpx solid var(--line); }
.row-tap:active { background: rgba(0, 0, 0, 0.02); }
.row-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.row-label-group { display: flex; align-items: center; gap: 16rpx; flex-shrink: 0; }
.refresh-btn { display: flex; align-items: center; gap: 6rpx; padding: 6rpx 12rpx; border-radius: 999rpx; background: rgba(196, 30, 58, 0.06); }
.refresh-btn:active { background: rgba(196, 30, 58, 0.12); }
.refresh-text { font-size: 22rpx; color: var(--brand); }
.row-value { display: flex; align-items: center; gap: 6rpx; min-width: 0; }
.row-value-text { font-size: 28rpx; color: var(--text-ink); }
.row-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }
.input-ph { color: rgba(153, 153, 153, 0.5); }

/* 起卦方式按钮 */
.method-btn {
  display: flex; align-items: center; justify-content: space-between; gap: 12rpx;
  min-width: 260rpx;
  padding: 18rpx 24rpx;
  border-radius: 14rpx; border: 2rpx solid var(--line);
  background: var(--bg-paper);
}
.method-btn:active { background: rgba(0, 0, 0, 0.02); }
.method-text { font-size: 26rpx; color: var(--text-ink); }

/* 在线摇卦 */
.coin-sec { padding: 36rpx 32rpx; }
.coins { display: flex; align-items: center; justify-content: center; gap: 32rpx; }
.coin {
  width: 120rpx; height: 120rpx; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #e8c986, #b8985f 55%, #8a6d3b);
  border: 4rpx solid #8a6d3b;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(138, 109, 59, 0.3);
}
.coin-hole {
  width: 36rpx; height: 36rpx;
  background: var(--bg-paper);
  border: 3rpx solid #8a6d3b;
  border-radius: 4rpx;
}
.coin-spin { animation: coin-flip 0.6s linear infinite; }
.coin-done { opacity: 0.8; }
@keyframes coin-flip {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}
.dots { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 24rpx; }
.dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: var(--line); }
.dot-on { background: var(--brand); }
.coin-hint { display: block; margin-top: 24rpx; font-size: 26rpx; line-height: 1.6; color: var(--text-soft); text-align: center; }

/* 卦名起卦 */
.gua-sec { padding: 30rpx 32rpx; display: flex; flex-direction: column; gap: 20rpx; }
.gua-head, .gua-row { display: flex; align-items: center; gap: 20rpx; }
.gua-head-cell { flex: 1; }
.gua-head-cell:first-child { flex: 0 0 80rpx; }
.gua-head-label { text-align: center; font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.gua-row-label { flex: 0 0 80rpx; font-size: 26rpx; color: var(--text-ink); }
.gua-btn {
  flex: 1; min-width: 0;
  display: flex; align-items: center; justify-content: space-between; gap: 8rpx;
  padding: 16rpx 20rpx;
  border-radius: 14rpx; border: 2rpx solid var(--line);
  background: var(--bg-paper);
}
.gua-btn:active { background: rgba(0, 0, 0, 0.02); }
.gua-btn-text {
  font-size: 24rpx; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* 算法说明 */
.note { padding: 0 8rpx; }
.note-text { font-size: 24rpx; line-height: 1.7; color: var(--text-soft); }

/* 开始排盘 */
.submit {
  display: flex; align-items: center; justify-content: center;
  padding: 30rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
}
.submit:active { transform: scale(0.99); }
.submit-off {
  background: rgba(0, 0, 0, 0.08);
  box-shadow: none;
}
.submit-text { font-size: 32rpx; font-weight: 700; color: #fff; }
.submit-off .submit-text { color: var(--text-soft); }

/* 排盘记录 */
.his-sec { display: flex; flex-direction: column; gap: 20rpx; }
.his-clear { padding: 8rpx 24rpx; border-radius: 999rpx; border: 2rpx solid var(--line); }
.his-clear-text { font-size: 24rpx; color: var(--text-soft); }
.his-item { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 24rpx 32rpx; }
.his-item:active { background: rgba(0, 0, 0, 0.02); }
.his-main { display: flex; flex-direction: column; gap: 6rpx; min-width: 0; flex: 1; }
.his-line1 { display: flex; align-items: center; gap: 16rpx; min-width: 0; }
.his-topic {
  font-size: 28rpx; font-weight: 500; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.his-summary { font-family: Georgia, 'Songti SC', serif; font-size: 24rpx; color: var(--brand); flex-shrink: 0; }
.his-date { font-size: 22rpx; color: var(--text-soft); }

/* 弹层 */
.mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 50; background: rgba(0, 0, 0, 0.4); display: flex; align-items: flex-end; }
.sheet { width: 100%; max-height: 70vh; border-radius: 32rpx 32rpx 0 0; background: var(--card); overflow: hidden; }
.sheet-head { padding: 32rpx; text-align: center; border-bottom: 1rpx solid var(--line); }
.sheet-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.sheet-body { max-height: 55vh; }
.sheet-item { padding: 32rpx; text-align: center; border-bottom: 1rpx solid rgba(0, 0, 0, 0.05); }
.sheet-item:active { background: rgba(0, 0, 0, 0.02); }
.sheet-item-text { font-size: 28rpx; color: var(--text-soft); }
.sheet-item-on { font-size: 32rpx; font-weight: 600; color: var(--text-ink); }
</style>
