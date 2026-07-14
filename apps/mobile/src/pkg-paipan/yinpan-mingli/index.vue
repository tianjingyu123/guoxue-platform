<script setup lang="ts">
/**
 * 阴盘命理奇门·排盘入口页（自 V0 app/yinpan-mingli/page.tsx 还原）
 * 表单：客户名称 / 性别 / 出生时间（未选不可排）/ 局数（自动或指定）/ 真太阳时·早晚子时。
 * V0 独立 history 页砍成本页内嵌记录卡（key: rebu:yinpan-mingli-history，上限 50）。
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
import { JU_OPTIONS } from '@/pkg-paipan/yinpan/yinpan-core'
import {
  loadMingliHistory,
  clearMingliHistory,
  formatParamsTime,
  type MingliParams,
  type MingliHistoryItem,
} from './yinpan-mingli-history'
import { toSolarSafe } from '@/pkg-paipan/lib/date-convert'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '阴盘命理奇门'
// #ifdef MP-WEIXIN
hdrTitle = '命理文化研究'
// #endif

// ── 表单 ──
const name = ref('')
const gender = ref<'male' | 'female'>('male')
const dateTime = ref({ year: 1990, month: 1, day: 1, hour: 12, minute: 0 })
const dateTouched = ref(false)
const customJu = ref('自动定局')
const useTrueSolar = ref(true)
const earlyZi = ref(false)
const coordinates = { lat: 38.93, lng: 115.42 }

const showDatePicker = ref(false)
const showJuPicker = ref(false)

function pad(n: number) {
  return String(n).padStart(2, '0')
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

function pickJu(ju: string) {
  customJu.value = ju
  showJuPicker.value = false
}

// ── 排盘记录（V0 独立 history 页砍成内嵌卡）──
const history = ref<MingliHistoryItem[]>([])
onShow(() => {
  history.value = loadMingliHistory()
})

function onClearHistory() {
  uni.showModal({
    title: '清空记录',
    content: '确定清空全部排盘记录？',
    success: (res) => {
      if (res.confirm) {
        clearMingliHistory()
        history.value = []
      }
    },
  })
}

function openRecord(h: MingliHistoryItem) {
  navigateTo(`/pkg-paipan/yinpan-mingli/result?payload=${encodeURIComponent(JSON.stringify(h.params))}`)
}

// ── 开始排盘 ──
function handleSubmit() {
  if (!dateTouched.value) {
    uni.showToast({ title: '请先选择出生时间', icon: 'none' })
    return
  }
  const t = dateTime.value
  const params: MingliParams = {
    name: name.value.trim(),
    gender: gender.value,
    year: t.year,
    month: t.month,
    day: t.day,
    hour: t.hour,
    minute: t.minute,
    customJu: customJu.value === '自动定局' ? '' : customJu.value,
    trueSolar: useTrueSolar.value,
    earlyZi: earlyZi.value,
    lat: coordinates.lat,
    lng: coordinates.lng,
  }
  navigateTo(`/pkg-paipan/yinpan-mingli/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" subtitle="以生辰起局 · 命理遁甲" share />

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <paper-card padding="none">
          <!-- 客户名称 -->
          <view class="row row-bd">
            <text class="row-label">客户名称</text>
            <input
              v-model="name"
              class="name-input"
              type="text"
              placeholder="请输入名称(选填)"
              placeholder-class="input-ph"
            >
          </view>

          <!-- 选择性别 -->
          <view class="row row-bd">
            <text class="row-label">选择性别</text>
            <view class="chips">
              <view class="chip" :class="{ 'chip-on': gender === 'male' }" @tap="gender = 'male'">
                <text class="chip-text" :class="{ 'chip-text-on': gender === 'male' }">男</text>
              </view>
              <view class="chip" :class="{ 'chip-on': gender === 'female' }" @tap="gender = 'female'">
                <text class="chip-text" :class="{ 'chip-text-on': gender === 'female' }">女</text>
              </view>
            </view>
          </view>

          <!-- 出生时间 -->
          <view class="row row-bd row-tap" @tap="showDatePicker = true">
            <text class="row-label">出生时间</text>
            <view class="row-value">
              <text class="row-value-text" :class="{ ph: !dateTouched }">{{ dateTouched ? dateTimeText : '请输入出生时间' }}</text>
              <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
            </view>
          </view>

          <!-- 局数选择 -->
          <view class="row row-bd row-tap" @tap="showJuPicker = true">
            <text class="row-label">局数</text>
            <view class="ju-btn">
              <text class="ju-btn-text">{{ customJu }}</text>
              <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
            </view>
          </view>

          <!-- 时间选项 -->
          <view class="row row-wrap">
            <view class="switch-group" @tap="useTrueSolar = !useTrueSolar">
              <text v-if="useTrueSolar" class="coord-text">北纬{{ coordinates.lat }}东经{{ coordinates.lng }}</text>
              <text class="switch-label">真太阳时</text>
              <view class="switch" :class="{ 'switch-on': useTrueSolar }">
                <view class="switch-dot" :class="{ 'switch-dot-on': useTrueSolar }" />
              </view>
            </view>
            <view class="switch-group" @tap="earlyZi = !earlyZi">
              <text class="switch-label">早晚子时</text>
              <view class="switch" :class="{ 'switch-on': earlyZi }">
                <view class="switch-dot" :class="{ 'switch-dot-on': earlyZi }" />
              </view>
            </view>
          </view>
        </paper-card>

        <!-- 开始排盘 -->
        <view class="submit" :class="{ 'submit-disabled': !dateTouched }" @tap="handleSubmit">
          <text class="submit-text">开始排盘</text>
        </view>

        <!-- 排盘记录 -->
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
                  <text class="his-matter">{{ h.params.name || '未命名' }}（{{ h.params.gender === 'female' ? '女' : '男' }}）</text>
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

    <!-- 局数选择弹窗 -->
    <view v-if="showJuPicker" class="ju-modal" @tap="showJuPicker = false">
      <view class="ju-sheet" @tap.stop>
        <view class="ju-head">
          <text class="ju-cancel" @tap="showJuPicker = false">取消</text>
          <text class="ju-title">选择局数</text>
          <text class="ju-ok" @tap="showJuPicker = false">确定</text>
        </view>
        <scroll-view scroll-y class="ju-list">
          <view
            v-for="ju in JU_OPTIONS"
            :key="ju"
            class="ju-item"
            :class="{ 'ju-item-on': customJu === ju }"
            @tap="pickJu(ju)"
          >
            <text class="ju-item-text" :class="{ 'ju-item-text-on': customJu === ju }">{{ ju }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 28rpx; }

/* 表单行 */
.row { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; padding: 30rpx 32rpx; }
.row-wrap { flex-wrap: wrap; }
.row-bd { border-bottom: 1rpx solid var(--line); }
.row-tap:active { background: rgba(0, 0, 0, 0.02); }
.row-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.row-value { display: flex; align-items: center; gap: 6rpx; }
.row-value-text { font-size: 28rpx; color: var(--text-ink); }
.row-value-text.ph { color: rgba(153, 153, 153, 0.5); }
.name-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }
.input-ph { color: rgba(153, 153, 153, 0.5); }

/* 选项 chips */
.chips { display: flex; align-items: center; gap: 16rpx; }
.chip {
  padding: 12rpx 24rpx;
  border-radius: 16rpx;
  background: rgba(0, 0, 0, 0.04);
  &:active { background: rgba(0, 0, 0, 0.08); }
}
.chip-on { background: var(--brand); box-shadow: 0 2rpx 6rpx rgba(196, 30, 58, 0.25); }
.chip-text { font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.chip-text-on { color: #fff; }

/* 局数按钮 */
.ju-btn {
  display: flex; align-items: center; gap: 10rpx;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 16rpx;
  padding: 12rpx 24rpx;
  &:active { background: rgba(0, 0, 0, 0.08); }
}
.ju-btn-text { font-size: 28rpx; color: var(--text-ink); }

/* 开关 */
.switch-group { display: flex; align-items: center; gap: 16rpx; }
.coord-text { font-size: 22rpx; color: var(--text-soft); }
.switch-label { font-size: 28rpx; color: var(--text-ink); }
.switch {
  width: 76rpx; height: 40rpx; border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.12);
  display: flex; align-items: center; padding: 0 4rpx;
  transition: background 0.2s;
}
.switch-on { background: var(--brand); }
.switch-dot {
  width: 32rpx; height: 32rpx; border-radius: 999rpx; background: #fff;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}
.switch-dot-on { transform: translateX(36rpx); }

/* 开始排盘 */
.submit {
  padding: 30rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
  &:active { transform: scale(0.99); }
}
.submit-disabled { opacity: 0.5; box-shadow: none; }
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

/* 局数选择弹窗 */
.ju-modal {
  position: fixed; left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 50;
  display: flex; flex-direction: column; justify-content: flex-end;
}
.ju-sheet { background: var(--card); border-radius: 24rpx 24rpx 0 0; overflow: hidden; }
.ju-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 2rpx solid var(--line);
}
.ju-cancel { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.ju-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.ju-ok { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.ju-list { max-height: 50vh; }
.ju-item {
  padding: 26rpx 0;
  border-bottom: 1rpx solid var(--line);
  &:last-child { border-bottom: none; }
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.ju-item-on { background: rgba(196, 30, 58, 0.05); }
.ju-item-text { display: block; text-align: center; font-size: 28rpx; color: var(--text-soft); }
.ju-item-text-on { color: var(--brand); font-weight: 600; font-size: 32rpx; }
</style>
