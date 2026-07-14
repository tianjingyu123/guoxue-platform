<script setup lang="ts">
/**
 * 大六壬·起课入口页（自 V0 app/daliuren/page.tsx 还原）
 * 表单：事项 / 起课时间 / 出生年份+性别 / 换将方式 / 贵人求法 / 贵神类型 / 涉害类型。
 * 起课后跳结果页本地重算；排盘记录本地存储（key: rebu:daliuren-history，上限 50）。
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
import { toSolarSafe } from '@/pkg-paipan/lib/date-convert'
import {
  loadDaliurenHistory,
  clearDaliurenHistory,
  formatParamsTime,
  type DaliurenParams,
  type DaliurenHistoryItem,
} from './daliuren-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '大六壬'
// #ifdef MP-WEIXIN
hdrTitle = '六壬文化研究'
// #endif

type JiangMethod = 'zhongqi' | 'jiaojie'
type GuirenMethod = 'standard' | 'alt'
type GuishenType = 'auto' | 'day' | 'night'
type ShehaiType = 'mengzhongji' | 'shenqian'

const YEAR_LIST = Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - i)
const YEAR_LABELS = YEAR_LIST.map((y) => `${y}年`)

// ── 表单 ──
const matter = ref('')
const now = new Date()
const dateTime = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: now.getMinutes(),
})
const birthYear = ref(1990)
const gender = ref<'男' | '女'>('男')
const jiangMethod = ref<JiangMethod>('zhongqi')
const guirenMethod = ref<GuirenMethod>('standard')
const guishenType = ref<GuishenType>('auto')
const shehaiType = ref<ShehaiType>('mengzhongji')
const showDatePicker = ref(false)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const dateTimeText = computed(() => {
  const t = dateTime.value
  return `${t.year}年${t.month}月${t.day}日 ${pad(t.hour)}时${pad(t.minute)}分`
})

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

function onBirthYearChange(e: { detail: { value: number | string } }) {
  const y = YEAR_LIST[Number(e.detail.value)]
  if (y) birthYear.value = y
}

// ── 排盘记录 ──
const history = ref<DaliurenHistoryItem[]>([])
onShow(() => {
  history.value = loadDaliurenHistory()
})

function onClearHistory() {
  uni.showModal({
    title: '清空记录',
    content: '确定清空全部排盘记录？',
    success: (res) => {
      if (res.confirm) {
        clearDaliurenHistory()
        history.value = []
      }
    },
  })
}

function openRecord(h: DaliurenHistoryItem) {
  navigateTo(`/pkg-paipan/daliuren/result?payload=${encodeURIComponent(JSON.stringify(h.params))}`)
}

function formatHistoryTime(h: DaliurenHistoryItem) {
  return formatParamsTime(h.params)
}

// ── 起课 ──
function handleSubmit() {
  const t = dateTime.value
  const params: DaliurenParams = {
    matter: matter.value.trim(),
    year: t.year,
    month: t.month,
    day: t.day,
    hour: t.hour,
    minute: t.minute,
    birthYear: birthYear.value,
    gender: gender.value,
    jiangMethod: jiangMethod.value,
    guirenMethod: guirenMethod.value,
    guishenType: guishenType.value,
    shehaiType: shehaiType.value,
  }
  navigateTo(`/pkg-paipan/daliuren/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" subtitle="三式之首 · 月将加时" share />

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <paper-card padding="none">
          <!-- 事项内容 -->
          <view class="row row-bd">
            <text class="row-label">事项内容</text>
            <input
              v-model="matter"
              class="matter-input"
              type="text"
              placeholder="请输入事项(选填)"
              placeholder-class="input-ph"
            >
          </view>

          <!-- 起课时间 -->
          <view class="row row-bd row-tap" @tap="showDatePicker = true">
            <view class="row-label-group">
              <text class="row-label">起课时间</text>
              <view class="refresh-btn" @tap.stop="refreshTime">
                <app-icon name="refresh-cw" :size="28" color="var(--text-soft)" />
              </view>
            </view>
            <view class="row-value">
              <text class="row-value-text">{{ dateTimeText }}</text>
              <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
            </view>
          </view>

          <!-- 出生年份 + 性别 -->
          <view class="row-col row-bd">
            <view class="row-line">
              <text class="row-label">出生年份</text>
              <view class="row-ctrl">
                <picker
                  mode="selector"
                  :range="YEAR_LABELS"
                  :value="YEAR_LIST.indexOf(birthYear)"
                  @change="onBirthYearChange"
                >
                  <view class="year-btn">
                    <text class="year-btn-text">{{ birthYear }}年</text>
                    <app-icon name="chevron-down" :size="26" color="var(--text-soft)" />
                  </view>
                </picker>
                <view class="chips">
                  <view class="chip" :class="{ 'chip-on': gender === '男' }" @tap="gender = '男'">
                    <text class="chip-text" :class="{ 'chip-text-on': gender === '男' }">男命</text>
                  </view>
                  <view class="chip" :class="{ 'chip-on': gender === '女' }" @tap="gender = '女'">
                    <text class="chip-text" :class="{ 'chip-text-on': gender === '女' }">女命</text>
                  </view>
                </view>
              </view>
            </view>
            <text class="row-hint">用于推算年命与行年（男一岁起丙寅顺行，女一岁起壬申逆行）</text>
          </view>

          <!-- 换将方式 -->
          <view class="row row-bd">
            <text class="row-label">换将方式</text>
            <view class="chips">
              <view class="chip" :class="{ 'chip-on': jiangMethod === 'jiaojie' }" @tap="jiangMethod = 'jiaojie'">
                <text class="chip-text" :class="{ 'chip-text-on': jiangMethod === 'jiaojie' }">交节</text>
              </view>
              <view class="chip" :class="{ 'chip-on': jiangMethod === 'zhongqi' }" @tap="jiangMethod = 'zhongqi'">
                <text class="chip-text" :class="{ 'chip-text-on': jiangMethod === 'zhongqi' }">中气</text>
              </view>
            </view>
          </view>

          <!-- 贵人求法 -->
          <view class="row row-bd">
            <text class="row-label">贵人求法</text>
            <view class="chips">
              <view class="chip" :class="{ 'chip-on': guirenMethod === 'standard' }" @tap="guirenMethod = 'standard'">
                <text class="chip-text" :class="{ 'chip-text-on': guirenMethod === 'standard' }">甲戊庚牛羊</text>
              </view>
              <view class="chip" :class="{ 'chip-on': guirenMethod === 'alt' }" @tap="guirenMethod = 'alt'">
                <text class="chip-text" :class="{ 'chip-text-on': guirenMethod === 'alt' }">甲羊戊庚牛</text>
              </view>
            </view>
          </view>

          <!-- 贵神类型 -->
          <view class="row row-bd">
            <text class="row-label">贵神类型</text>
            <view class="chips">
              <view class="chip" :class="{ 'chip-on': guishenType === 'auto' }" @tap="guishenType = 'auto'">
                <text class="chip-text" :class="{ 'chip-text-on': guishenType === 'auto' }">卯酉区分</text>
              </view>
              <view class="chip" :class="{ 'chip-on': guishenType === 'day' }" @tap="guishenType = 'day'">
                <text class="chip-text" :class="{ 'chip-text-on': guishenType === 'day' }">白天</text>
              </view>
              <view class="chip" :class="{ 'chip-on': guishenType === 'night' }" @tap="guishenType = 'night'">
                <text class="chip-text" :class="{ 'chip-text-on': guishenType === 'night' }">夜晚</text>
              </view>
            </view>
          </view>

          <!-- 涉害类型 -->
          <view class="row">
            <text class="row-label">涉害类型</text>
            <view class="chips">
              <view class="chip" :class="{ 'chip-on': shehaiType === 'mengzhongji' }" @tap="shehaiType = 'mengzhongji'">
                <text class="chip-text" :class="{ 'chip-text-on': shehaiType === 'mengzhongji' }">孟仲季</text>
              </view>
              <view class="chip" :class="{ 'chip-on': shehaiType === 'shenqian' }" @tap="shehaiType = 'shenqian'">
                <text class="chip-text" :class="{ 'chip-text-on': shehaiType === 'shenqian' }">深浅</text>
              </view>
            </view>
          </view>
        </paper-card>

        <!-- 开始起课 -->
        <view class="submit" @tap="handleSubmit">
          <text class="submit-text">开始起课</text>
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
                  <text class="his-matter">{{ h.params.matter || '未命名事项' }}</text>
                  <text class="his-summary">{{ h.summary }}</text>
                </view>
                <text class="his-date">{{ formatHistoryTime(h) }}</text>
              </view>
              <app-icon name="chevron-right" :size="28" color="#9ca3af" />
            </view>
          </paper-card>
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
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 28rpx; }

/* 表单行 */
.row { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; padding: 30rpx 32rpx; }
.row-col { display: flex; flex-direction: column; gap: 14rpx; padding: 30rpx 32rpx; }
.row-line { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; }
.row-bd { border-bottom: 1rpx solid var(--line); }
.row-tap:active { background: rgba(0, 0, 0, 0.02); }
.row-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.row-label-group { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.refresh-btn { padding: 8rpx; display: flex; align-items: center; }
.row-value { display: flex; align-items: center; gap: 6rpx; }
.row-value-text { font-size: 28rpx; color: var(--text-ink); }
.row-hint { font-size: 22rpx; color: var(--text-soft); line-height: 1.6; }
.row-ctrl { display: flex; align-items: center; gap: 20rpx; }
.matter-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }
.input-ph { color: rgba(153, 153, 153, 0.5); }

/* 出生年份按钮 */
.year-btn {
  display: flex; align-items: center; gap: 8rpx;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 16rpx;
  padding: 14rpx 24rpx;
  &:active { background: rgba(0, 0, 0, 0.08); }
}
.year-btn-text { font-size: 28rpx; color: var(--text-ink); }

/* 选项 chips */
.chips { display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; justify-content: flex-end; }
.chip {
  padding: 12rpx 24rpx;
  border-radius: 16rpx;
  background: rgba(0, 0, 0, 0.04);
  &:active { background: rgba(0, 0, 0, 0.08); }
}
.chip-on { background: var(--brand); box-shadow: 0 2rpx 6rpx rgba(196, 30, 58, 0.25); }
.chip-text { font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.chip-text-on { color: #fff; }

/* 开始起课 */
.submit {
  padding: 30rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
  &:active { transform: scale(0.99); }
}
.submit-text { display: block; text-align: center; font-size: 32rpx; font-weight: 700; color: #fff; }

/* 排盘记录 */
.his-sec { display: flex; flex-direction: column; gap: 20rpx; }
.his-clear { padding: 8rpx 24rpx; border-radius: 999rpx; border: 2rpx solid var(--line); }
.his-clear-text { font-size: 24rpx; color: var(--text-soft); }
.his-item {
  display: flex; align-items: center; justify-content: space-between; gap: 20rpx;
  padding: 24rpx 32rpx;
  &:active { background: rgba(0, 0, 0, 0.02); }
}
.his-main { display: flex; flex-direction: column; gap: 6rpx; min-width: 0; flex: 1; }
.his-line1 { display: flex; align-items: center; gap: 16rpx; min-width: 0; }
.his-matter {
  font-size: 28rpx; font-weight: 500; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.his-summary { font-family: $serif; font-size: 24rpx; color: var(--brand); flex-shrink: 0; }
.his-date { font-size: 22rpx; color: var(--text-soft); }
</style>
