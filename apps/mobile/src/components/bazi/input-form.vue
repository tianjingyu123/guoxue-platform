<script setup lang="ts">
/** 八字排盘输入表单——从原型 input-form.tsx 迁移 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import DatePickerModal from './date-picker-modal.vue'
import LocationPickerModal from './location-picker-modal.vue'
import GroupPickerModal from './group-picker-modal.vue'

const name = ref('')
const gender = ref<'male' | 'female'>('male')
const birthDate = ref({ year: 1990, month: 1, day: 1, hour: 12, minute: 0, isLunar: false })
const birthPlace = ref({ province: '', city: '', district: '', timezone: '北京时间' })
const group = ref('全部')
const useTrueSolarTime = ref(true)
const useEarlyZiHour = ref(false)
const useDaylightSaving = ref(false)
const saveRecord = ref(true)

const showDatePicker = ref(false)
const showLocationPicker = ref(false)
const showGroupPicker = ref(false)

function pad(n: number) { return String(n).padStart(2, '0') }
const formatBirthDate = computed(() => {
  const d = birthDate.value
  const hourStr = d.hour !== null ? `${pad(d.hour)}:${pad(d.minute || 0)}` : '未知时'
  return `${d.year}-${pad(d.month)}-${pad(d.day)} ${hourStr}`
})
const formatBirthPlace = computed(() => {
  const p = birthPlace.value
  if (!p.province) return '请选择出生地点'
  if (p.province === '未知地') return '未知地 北京时间'
  return `${p.city} ${p.district}`
})

const options = [
  { key: 'trueSolar', label: '真太阳时' },
  { key: 'earlyZi', label: '早晚子时' },
  { key: 'dst', label: '夏令时' },
] as const
const optState = computed<Record<string, boolean>>(() => ({
  trueSolar: useTrueSolarTime.value, earlyZi: useEarlyZiHour.value, dst: useDaylightSaving.value,
}))
function toggleOpt(k: string) {
  if (k === 'trueSolar') useTrueSolarTime.value = !useTrueSolarTime.value
  else if (k === 'earlyZi') useEarlyZiHour.value = !useEarlyZiHour.value
  else useDaylightSaving.value = !useDaylightSaving.value
}

// 与 date-picker-modal 的 confirm 事件载荷结构一致
function onDateConfirm(d: { year: number; month: number; day: number; hour: number | null; minute: number | null; isLunar: boolean }) {
  birthDate.value = { year: d.year, month: d.month, day: d.day, hour: d.hour ?? 12, minute: d.minute ?? 0, isLunar: d.isLunar }
}

function handleSubmit() {
  const p = birthDate.value
  const q = [
    `name=${encodeURIComponent(name.value || '未知')}`,
    `gender=${gender.value === 'male' ? '男' : '女'}`,
    `year=${p.year}`, `month=${p.month}`, `day=${p.day}`, `hour=${p.hour}`, `minute=${p.minute}`,
    `isLunar=${p.isLunar}`,
    `province=${encodeURIComponent(birthPlace.value.province)}`,
    `city=${encodeURIComponent(birthPlace.value.city)}`,
    `district=${encodeURIComponent(birthPlace.value.district)}`,
    `trueSolar=${useTrueSolarTime.value}`, `earlyZi=${useEarlyZiHour.value}`, `dst=${useDaylightSaving.value}`,
  ].join('&')
  navigateTo(`/paipan/bazi/result?${q}`)
}
</script>

<template>
  <view>
    <view class="bf-card">
      <!-- 姓名 -->
      <view class="bf-row bf-bd">
        <text class="bf-label">姓名</text>
        <input v-model="name" class="bf-name-input" placeholder="请输入姓名（选填）" />
      </view>
      <!-- 性别 -->
      <view class="bf-row bf-bd">
        <text class="bf-label">性别</text>
        <view class="bf-gender">
          <view class="bf-gbtn" :class="{ 'bf-gbtn-on': gender === 'male' }" @tap="gender = 'male'"><text class="bf-gtext" :class="{ 'bf-gtext-on': gender === 'male' }">男</text></view>
          <view class="bf-gbtn" :class="{ 'bf-gbtn-on': gender === 'female' }" @tap="gender = 'female'"><text class="bf-gtext" :class="{ 'bf-gtext-on': gender === 'female' }">女</text></view>
        </view>
      </view>
      <!-- 出生时间 -->
      <view class="bf-link bf-bd" @tap="showDatePicker = true">
        <view class="bf-link-l">
          <view class="bf-icon"><app-icon name="clock" :size="28" color="#2d5a87" /></view>
          <text class="bf-label">出生时间<text class="bf-star">*</text></text>
        </view>
        <view class="bf-link-r">
          <text class="bf-value">{{ formatBirthDate }}</text>
          <app-icon name="chevron-right" :size="28" color="#9ca3af" />
        </view>
      </view>
      <!-- 出生地区 -->
      <view class="bf-link bf-bd" @tap="showLocationPicker = true">
        <view class="bf-link-l">
          <view class="bf-icon"><app-icon name="map-pin" :size="28" color="#2d5a87" /></view>
          <text class="bf-label">出生地区</text>
        </view>
        <view class="bf-link-r">
          <text class="bf-value">{{ formatBirthPlace }}</text>
          <app-icon name="chevron-right" :size="28" color="#9ca3af" />
        </view>
      </view>
      <!-- 分组 -->
      <view class="bf-link bf-bd" @tap="showGroupPicker = true">
        <view class="bf-link-l">
          <view class="bf-icon"><app-icon name="folder" :size="28" color="#2d5a87" /></view>
          <text class="bf-label">分组</text>
        </view>
        <view class="bf-link-r">
          <text class="bf-value">{{ group }}</text>
          <app-icon name="chevron-right" :size="28" color="#9ca3af" />
        </view>
      </view>
      <!-- 时间选项 -->
      <view class="bf-opts bf-bd">
        <view v-for="o in options" :key="o.key" class="bf-opt" @tap="toggleOpt(o.key)">
          <view class="bf-check" :class="{ 'bf-check-on': optState[o.key] }">
            <app-icon v-if="optState[o.key]" name="check" :size="20" color="#ffffff" />
          </view>
          <text class="bf-opt-label">{{ o.label }}</text>
        </view>
      </view>
      <!-- 真太阳时信息 + 保存 -->
      <view class="bf-solar bf-bd">
        <view class="bf-solar-info">
          <text class="bf-solar-line">真太阳时：{{ formatBirthDate }}</text>
          <text class="bf-solar-line">地址经纬：北纬39.93 东经116.42</text>
        </view>
        <view class="bf-save">
          <text class="bf-save-label">保存</text>
          <view class="bf-switch" :class="{ 'bf-switch-on': saveRecord }" @tap="saveRecord = !saveRecord">
            <view class="bf-switch-dot" :class="{ 'bf-switch-dot-on': saveRecord }" />
          </view>
        </view>
      </view>
      <!-- 开始排盘 -->
      <view class="bf-submit-wrap">
        <view class="bf-submit" @tap="handleSubmit"><text class="bf-submit-text">开始排盘</text></view>
      </view>
    </view>

    <date-picker-modal :open="showDatePicker" :initial-date="{ year: birthDate.year, month: birthDate.month, day: birthDate.day, hour: birthDate.hour, minute: birthDate.minute }" @close="showDatePicker = false" @confirm="onDateConfirm" />
    <location-picker-modal :open="showLocationPicker" :initial-location="birthPlace.province ? birthPlace : undefined" @close="showLocationPicker = false" @confirm="(v) => birthPlace = v" />
    <group-picker-modal :open="showGroupPicker" :initial-group="group" @close="showGroupPicker = false" @confirm="(v) => group = v" />
  </view>
</template>

<style scoped lang="scss">
.bf-card { background: var(--card); border-radius: 32rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); border: 2rpx solid rgba(0,0,0,0.06); overflow: hidden; }
.bf-bd { border-bottom: 2rpx solid rgba(0,0,0,0.06); }
.bf-row { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx; }
.bf-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }
.bf-star { font-size: 22rpx; color: var(--brand); margin-left: 4rpx; }
.bf-name-input { flex: 1; margin-left: 32rpx; text-align: right; font-size: 28rpx; color: var(--text-soft); }
.bf-gender { display: flex; align-items: center; background: rgba(0,0,0,0.04); border-radius: 16rpx; padding: 4rpx; }
.bf-gbtn { padding: 12rpx 48rpx; border-radius: 12rpx; }
.bf-gbtn-on { background: var(--card); box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.08); }
.bf-gtext { font-size: 28rpx; font-weight: 500; color: var(--text-soft); }
.bf-gtext-on { color: var(--brand); }
.bf-link { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx; }
.bf-link-l { display: flex; align-items: center; gap: 20rpx; }
.bf-icon { width: 56rpx; height: 56rpx; border-radius: 16rpx; background: var(--indigo-light); display: flex; align-items: center; justify-content: center; }
.bf-link-r { display: flex; align-items: center; gap: 8rpx; }
.bf-value { font-size: 28rpx; color: var(--text-soft); }
.bf-opts { display: flex; align-items: center; gap: 48rpx; padding: 24rpx 32rpx; background: rgba(0,0,0,0.02); }
.bf-opt { display: flex; align-items: center; gap: 12rpx; }
.bf-check { width: 32rpx; height: 32rpx; border-radius: 8rpx; border: 4rpx solid #d1d5db; background: var(--card); display: flex; align-items: center; justify-content: center; }
.bf-check-on { border-color: var(--brand); background: var(--brand); }
.bf-opt-label { font-size: 22rpx; color: var(--text-soft); }
.bf-solar { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; background: rgba(0,0,0,0.01); }
.bf-solar-info { display: flex; flex-direction: column; gap: 4rpx; }
.bf-solar-line { font-size: 22rpx; color: rgba(120,120,120,0.7); }
.bf-save { display: flex; align-items: center; gap: 16rpx; }
.bf-save-label { font-size: 22rpx; color: var(--text-soft); }
.bf-switch { width: 88rpx; height: 48rpx; border-radius: 999rpx; background: #d1d5db; position: relative; }
.bf-switch-on { background: var(--brand); }
.bf-switch-dot { position: absolute; top: 8rpx; left: 8rpx; width: 32rpx; height: 32rpx; background: #fff; border-radius: 999rpx; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.15); transition: transform 0.2s; }
.bf-switch-dot-on { transform: translateX(40rpx); }
.bf-submit-wrap { padding: 32rpx; }
.bf-submit { padding: 28rpx; background: var(--brand); border-radius: 24rpx; box-shadow: 0 8rpx 20rpx rgba(196,30,58,0.3); }
.bf-submit-text { display: block; text-align: center; font-size: 32rpx; font-weight: 700; color: #fff; }
</style>
