<script setup lang="ts">
/**
 * 姓名解析 · 录入页——自 V0 app/xingming/page.tsx 还原
 * 表单：姓名/性别/出生时间/出生地点/真太阳时 + 功能说明
 * 取舍：①V0 history 独立页砍掉 → 解析记录内嵌卡（本地 rebu:xingming-history · 上限 50）
 *       ②真太阳时开关与 V0 一致仅作展示口径（生肖按出生年判定，不受分钟级修正影响）
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import DatePickerModal from '@/components/bazi/date-picker-modal.vue'
import LocationPickerModal from '@/components/bazi/location-picker-modal.vue'
import { navigateTo } from '@/utils/router'
import { toSolarSafe } from '@/pkg-paipan2/lib/date-convert'
import { loadXingmingHistory, clearXingmingHistory, type XingmingHistoryRecord } from './history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '姓名解析'
// #ifdef MP-WEIXIN
hdrTitle = '姓名文化研究'
// #endif

// ── 表单 ──
const fullName = ref('')
const gender = ref<'男' | '女'>('男')
const trueSolar = ref(true)
const birthDate = ref({ year: 1990, month: 1, day: 1, hour: 12, minute: 0 })
const birthPlace = ref({ province: '', city: '', district: '', timezone: '北京时间' })
const dateOpen = ref(false)
const locationOpen = ref(false)

const pad = (n: number) => String(n).padStart(2, '0')
const dateText = computed(() =>
  `${birthDate.value.year}-${pad(birthDate.value.month)}-${pad(birthDate.value.day)} ${pad(birthDate.value.hour)}:${pad(birthDate.value.minute)}`)
const placeText = computed(() =>
  birthPlace.value.province ? `${birthPlace.value.city} ${birthPlace.value.district}` : '请选择出生地点')

const canSubmit = computed(() => [...fullName.value.trim()].length >= 2)

function onDateConfirm(v: {
  year: number; month: number; day: number
  hour: number | null; minute: number | null; isLunar?: boolean
}) {
  // 农历输入归一为公历：computeBazi 入参恒为公历，否则农历数字会被当公历排四柱
  const { date, ok } = toSolarSafe({
    year: v.year, month: v.month, day: v.day,
    hour: v.hour ?? 12, minute: v.minute ?? 0, isLunar: v.isLunar,
  })
  if (!ok) {
    uni.showToast({ title: '农历日期无效，请重新选择', icon: 'none' })
    return
  }
  birthDate.value = date
}

function handleSubmit() {
  if (!canSubmit.value) return
  const payload = {
    name: fullName.value.trim(),
    gender: gender.value,
    birth: dateText.value,
    city: birthPlace.value.city.replace(/市$/, ''),
    district: birthPlace.value.district,
  }
  navigateTo(`/pkg-paipan2/xingming/result?payload=${encodeURIComponent(JSON.stringify(payload))}`)
}

// ── 解析记录（内嵌卡·本地存储） ──
const history = ref<XingmingHistoryRecord[]>([])
onShow(() => {
  history.value = loadXingmingHistory()
})

function openRecord(r: XingmingHistoryRecord) {
  const payload = {
    name: r.name,
    gender: r.gender,
    birth: r.birth,
    city: r.city ?? '',
    district: r.district ?? '',
  }
  navigateTo(`/pkg-paipan2/xingming/result?payload=${encodeURIComponent(JSON.stringify(payload))}`)
}

function onClearHistory() {
  uni.showModal({
    title: '清空记录',
    content: '确定清空全部解析记录？',
    success: (res) => {
      if (res.confirm) {
        clearXingmingHistory()
        history.value = []
      }
    },
  })
}
</script>

<template>
  <view class="page">
    <tool-header history-href="/paipan/xingming/history" :title="hdrTitle" />

    <scroll-view scroll-y class="body">
      <view class="inner">
        <!-- 录入表单 -->
        <paper-card padding="none">
          <!-- 姓名 -->
          <view class="row row-bd">
            <text class="row-label">姓名<text class="row-star">*</text></text>
            <input
              v-model="fullName"
              class="row-input"
              type="text"
              :maxlength="4"
              placeholder="请输入姓名全名"
              placeholder-class="row-input-ph"
            >
          </view>

          <!-- 性别 -->
          <view class="row row-bd">
            <text class="row-label">性别</text>
            <view class="seg">
              <view class="seg-btn" :class="{ 'seg-btn-on': gender === '男' }" @tap="gender = '男'">
                <text class="seg-text" :class="{ 'seg-text-on': gender === '男' }">男</text>
              </view>
              <view class="seg-btn" :class="{ 'seg-btn-on': gender === '女' }" @tap="gender = '女'">
                <text class="seg-text" :class="{ 'seg-text-on': gender === '女' }">女</text>
              </view>
            </view>
          </view>

          <!-- 出生时间（用于八字契合分析） -->
          <view class="row row-bd row-tap" @tap="dateOpen = true">
            <view class="row-left">
              <view class="row-icon">
                <app-icon name="clock" :size="28" color="#2d5a87" />
              </view>
              <text class="row-label">出生时间<text class="row-star">*</text></text>
            </view>
            <view class="row-right">
              <text class="row-value">{{ dateText }}</text>
              <app-icon name="chevron-right" :size="28" color="#9ca3af" />
            </view>
          </view>

          <!-- 出生地点 -->
          <view class="row row-bd row-tap" @tap="locationOpen = true">
            <view class="row-left">
              <view class="row-icon">
                <app-icon name="map-pin" :size="28" color="#2d5a87" />
              </view>
              <text class="row-label">出生地点</text>
            </view>
            <view class="row-right">
              <text class="row-value" :class="{ 'row-value-ph': !birthPlace.province }">{{ placeText }}</text>
              <app-icon name="chevron-right" :size="28" color="#9ca3af" />
            </view>
          </view>

          <!-- 真太阳时 -->
          <view class="row">
            <text class="row-label">时间类型</text>
            <view class="ts" @tap="trueSolar = !trueSolar">
              <text class="ts-label">真太阳时</text>
              <view class="ts-track" :class="{ 'ts-track-on': trueSolar }">
                <view class="ts-knob" :class="{ 'ts-knob-on': trueSolar }" />
              </view>
            </view>
          </view>
        </paper-card>

        <!-- 说明 -->
        <text class="intro">
          输入现有姓名与生辰，即可获得完整姓名详解：八字契合、音律字义、三才五格、数理卦象、姓名卦象、生肖用字与重名热度。
        </text>

        <!-- 提交 -->
        <view class="submit" :class="{ 'submit-off': !canSubmit }" @tap="handleSubmit">
          <text class="submit-text">开始解析</text>
        </view>

        <!-- 解析记录（V0 history 页砍成内嵌卡） -->
        <view v-if="history.length" class="his-sec">
          <section-title title="解析记录" subtitle="点击重新解析最近记录">
            <template #action>
              <view class="his-clear" @tap="onClearHistory">
                <text class="his-clear-text">清空</text>
              </view>
            </template>
          </section-title>
          <paper-card padding="none">
            <view
              v-for="(r, i) in history"
              :key="r.id"
              class="his-item"
              :class="{ 'row-bd': i < history.length - 1 }"
              @tap="openRecord(r)"
            >
              <view class="his-main">
                <view class="his-line1">
                  <view class="his-name"><text class="his-name-text">{{ r.name }}</text></view>
                  <text class="his-gender">{{ r.gender }}</text>
                </view>
                <text class="his-date">{{ r.dateText }}</text>
              </view>
              <view class="his-right">
                <text class="his-score">{{ r.score }}分</text>
                <app-icon name="chevron-right" :size="28" color="#9ca3af" />
              </view>
            </view>
          </paper-card>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="本工具仅供传统文化爱好者研究学习使用，姓名分析结果不构成任何预测或建议。"
        />
      </view>
    </scroll-view>

    <date-picker-modal
      :open="dateOpen"
      :initial-date="birthDate"
      initial-mode="solar"
      @close="dateOpen = false"
      @confirm="onDateConfirm"
    />
    <location-picker-modal
      :open="locationOpen"
      :initial-location="birthPlace.province ? birthPlace : undefined"
      @close="locationOpen = false"
      @confirm="(v) => birthPlace = v"
    />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; height: 0; }
.inner { padding: 24rpx 32rpx 96rpx; display: flex; flex-direction: column; gap: 28rpx; }

/* ── 表单行 ── */
.row { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; padding: 26rpx 32rpx; }
.row-bd { border-bottom: 1rpx solid var(--line); }
.row-tap:active { background: rgba(0, 0, 0, 0.02); }
.row-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.row-star { font-size: 22rpx; color: var(--brand); margin-left: 4rpx; }
.row-input { flex: 1; min-width: 0; text-align: right; font-size: 28rpx; color: var(--text-ink); }
.row-input-ph { color: rgba(153, 153, 153, 0.5); }
.row-left { display: flex; align-items: center; gap: 20rpx; min-width: 0; }
.row-icon {
  width: 56rpx; height: 56rpx; border-radius: 16rpx; flex-shrink: 0;
  background: rgba(45, 90, 135, 0.08);
  display: flex; align-items: center; justify-content: center;
}
.row-right { display: flex; align-items: center; gap: 8rpx; min-width: 0; }
.row-value { font-size: 28rpx; color: var(--text-ink); }
.row-value-ph { color: var(--text-soft); }

/* ── 分段选择 ── */
.seg { display: flex; align-items: center; background: rgba(0, 0, 0, 0.04); border-radius: 16rpx; padding: 4rpx; flex-shrink: 0; }
.seg-btn { padding: 12rpx 48rpx; border-radius: 12rpx; }
.seg-btn-on { background: var(--card); box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08); }
.seg-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.seg-text-on { color: var(--brand); }

/* ── 真太阳时开关 ── */
.ts { display: flex; align-items: center; gap: 16rpx; }
.ts-label { font-size: 24rpx; color: var(--text-soft); }
.ts-track {
  width: 88rpx; height: 48rpx; border-radius: 999rpx; position: relative;
  background: var(--line); transition: background 0.2s;
}
.ts-track-on { background: var(--brand); }
.ts-knob {
  position: absolute; top: 8rpx; left: 8rpx;
  width: 32rpx; height: 32rpx; border-radius: 50%;
  background: #fff; box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}
.ts-knob-on { transform: translateX(40rpx); }

/* ── 说明 ── */
.intro { padding: 0 8rpx; font-size: 22rpx; line-height: 1.7; color: var(--text-soft); }

/* ── 提交 ── */
.submit {
  padding: 28rpx; background: var(--brand); border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
  &:active { transform: scale(0.99); }
}
.submit-off { opacity: 0.4; box-shadow: none; }
.submit-text { display: block; text-align: center; font-size: 32rpx; font-weight: 700; color: #fff; }

/* ── 解析记录 ── */
.his-sec { display: flex; flex-direction: column; gap: 20rpx; }
.his-clear { padding: 8rpx 24rpx; border-radius: 999rpx; border: 2rpx solid var(--line); }
.his-clear-text { font-size: 24rpx; color: var(--text-soft); }
.his-item { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 24rpx 32rpx; }
.his-item:active { background: rgba(0, 0, 0, 0.02); }
.his-main { display: flex; flex-direction: column; gap: 8rpx; min-width: 0; flex: 1; }
.his-line1 { display: flex; align-items: center; gap: 12rpx; }
.his-name { border-radius: 8rpx; background: rgba(196, 30, 58, 0.08); padding: 4rpx 12rpx; }
.his-name-text { font-size: 24rpx; font-weight: 600; color: var(--brand); }
.his-gender { font-size: 24rpx; color: var(--text-soft); }
.his-date { font-size: 22rpx; color: var(--text-soft); }
.his-right { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.his-score { font-family: Georgia, 'Songti SC', serif; font-size: 28rpx; font-weight: 700; color: var(--brand); }
</style>
