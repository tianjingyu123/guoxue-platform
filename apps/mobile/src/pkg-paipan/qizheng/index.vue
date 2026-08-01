<script setup lang="ts">
/**
 * 七政四余·排盘入口页（自 V0 app/qizheng/page.tsx 还原）
 * 表单：姓名 / 性别 / 出生时间（支持农历）/ 出生地点。
 * 排盘后跳结果页本地重算（lib/qizheng-engine，VSOP87 实测天度，零后端依赖）；
 * 记录本地存储（key: rebu:qizheng-history，上限 50，内嵌卡）。
 *
 * 注意：与八字/合盘不同，七政盘以实测天象为准，出生地点会真实影响命宫与星曜宫位
 *      （经纬度进 Observer 与真太阳时），故地点为必选项而非装饰。
 */
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import DatePickerModal from '@/components/bazi/date-picker-modal.vue'
import LocationPickerModal from '@/components/bazi/location-picker-modal.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { cityLongitude } from '@/pkg-paipan/lib/bazi-engine'
import {
  loadQizhengHistory,
  clearQizhengHistory,
  formatParamsTime,
  type QizhengParams,
  type QizhengHistoryItem,
} from './qizheng-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案，路由/逻辑不变）
let hdrTitle = '七政四余'
// #ifdef MP-WEIXIN
hdrTitle = '星命文化研究'
// #endif

const name = ref('')
const gender = ref<'男' | '女'>('男')
const birth = ref({ year: 1992, month: 8, day: 16, hour: 10, minute: 30 })
const isLunar = ref(false)
const location = ref({ province: '北京市', city: '北京', district: '东城区' })

const showDatePicker = ref(false)
const showLocationPicker = ref(false)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const birthText = computed(() => {
  const b = birth.value
  return `${b.year}年${b.month}月${b.day}日 ${pad(b.hour)}:${pad(b.minute)}${isLunar.value ? '（农历）' : ''}`
})

const locationText = computed(() => `${location.value.province} ${location.value.city}`)

function onDateConfirm(d: {
  year: number; month: number; day: number
  hour: number | null; minute: number | null; isLunar?: boolean
}) {
  birth.value = {
    year: d.year,
    month: d.month,
    day: d.day,
    hour: d.hour ?? 12,
    minute: d.minute ?? 0,
  }
  isLunar.value = !!d.isLunar
  showDatePicker.value = false
}

function onLocationConfirm(loc: { province: string; city: string; district: string }) {
  location.value = { province: loc.province, city: loc.city, district: loc.district }
  showLocationPicker.value = false
}

// ── 排盘记录 ──
const history = ref<QizhengHistoryItem[]>([])
onShow(() => {
  history.value = loadQizhengHistory()
})

function onClearHistory() {
  uni.showModal({
    title: '清空记录',
    content: '确定清空全部排盘记录？',
    success: (res) => {
      if (res.confirm) {
        clearQizhengHistory()
        history.value = []
      }
    },
  })
}

function openRecord(h: QizhengHistoryItem) {
  navigateTo(`/pkg-paipan/qizheng/result?payload=${encodeURIComponent(JSON.stringify(h.params))}`)
}

// ── 开始排盘 ──
function handleSubmit() {
  const city = location.value.city
  if (cityLongitude(city) === undefined) {
    uni.showToast({ title: '该城市暂无经纬度数据，请换主要城市', icon: 'none' })
    return
  }
  const b = birth.value
  const params: QizhengParams = {
    name: name.value.trim().slice(0, 20),
    gender: gender.value,
    year: b.year,
    month: b.month,
    day: b.day,
    hour: b.hour,
    minute: b.minute,
    isLunar: isLunar.value,
    city,
  }
  navigateTo(`/pkg-paipan/qizheng/result?payload=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" subtitle="十一曜实测天度 · 果老星宗" share />

    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <!-- 简介 -->
        <view class="intro">
          <text class="intro-text">
            七政四余为古代星命学之宗，以日、月、五星（七政）与紫气、月孛、罗睺、计都（四余）十一曜实测天度排盘，参《果老星宗》论命宫、化曜、恩用仇难。
          </text>
        </view>

        <paper-card padding="none">
          <!-- 姓名 -->
          <view class="row row-bd">
            <text class="row-label">姓名<text class="row-opt">（选填）</text></text>
            <input
              v-model="name"
              class="name-input"
              type="text"
              :maxlength="20"
              placeholder="请输入姓名"
              placeholder-class="input-ph"
            >
          </view>

          <!-- 性别 -->
          <view class="row row-bd">
            <text class="row-label">性别</text>
            <view class="seg">
              <view class="seg-btn" :class="{ 'seg-on': gender === '男' }" @tap="gender = '男'">
                <text class="seg-text" :class="{ 'seg-text-on': gender === '男' }">男</text>
              </view>
              <view class="seg-btn" :class="{ 'seg-on': gender === '女' }" @tap="gender = '女'">
                <text class="seg-text" :class="{ 'seg-text-on': gender === '女' }">女</text>
              </view>
            </view>
          </view>

          <!-- 出生时间 -->
          <view class="row row-bd row-tap" @tap="showDatePicker = true">
            <text class="row-label">出生时间</text>
            <view class="row-value">
              <text class="row-value-text">{{ birthText }}</text>
              <app-icon name="chevron-right" :size="28" color="var(--text-soft)" />
            </view>
          </view>

          <!-- 出生地点 -->
          <view class="row row-tap" @tap="showLocationPicker = true">
            <text class="row-label">出生地点</text>
            <view class="row-value">
              <text class="row-value-text">{{ locationText }}</text>
              <app-icon name="chevron-right" :size="28" color="var(--text-soft)" />
            </view>
          </view>
        </paper-card>

        <text class="hint">星盘以实际天象为准，出生地点影响真太阳时、命宫与星曜宫位。</text>

        <!-- 开始排盘 -->
        <view class="submit" @tap="handleSubmit">
          <app-icon name="sparkles" :size="32" color="#ffffff" />
          <text class="submit-text">开始排盘</text>
        </view>

        <!-- 排盘记录 -->
        <view v-if="history.length" class="his-sec">
          <section-title title="排盘记录" subtitle="点击重看星盘，最近 50 条">
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
                  <text class="his-topic">{{ h.params.name || '未填写' }}</text>
                  <text class="his-summary">{{ h.summary }}</text>
                </view>
                <text class="his-date">{{ formatParamsTime(h.params) }} · {{ h.params.city }}</text>
              </view>
              <app-icon name="chevron-right" :size="28" color="#9ca3af" />
            </view>
          </paper-card>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="七政四余为传统星命学说，所示星盘与断语仅供文化研究与参考，切勿迷信。"
        />
      </view>
    </scroll-view>

    <date-picker-modal
      :open="showDatePicker"
      :initial-date="birth"
      initial-mode="solar"
      @close="showDatePicker = false"
      @confirm="onDateConfirm"
    />
    <location-picker-modal
      :open="showLocationPicker"
      :initial-location="location"
      @close="showLocationPicker = false"
      @confirm="onLocationConfirm"
    />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 32rpx 48rpx; display: flex; flex-direction: column; gap: 24rpx; }

.intro { padding: 24rpx 28rpx; border-radius: 16rpx; background: rgba(0, 0, 0, 0.03); }
.intro-text { font-size: 22rpx; line-height: 1.7; color: var(--text-soft); }

.row { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; padding: 30rpx 32rpx; }
.row-bd { border-bottom: 1rpx solid var(--line); }
.row-tap:active { background: rgba(0, 0, 0, 0.02); }
.row-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.row-opt { font-size: 22rpx; font-weight: 400; color: var(--text-soft); }
.row-value { display: flex; align-items: center; gap: 6rpx; min-width: 0; }
.row-value-text { font-size: 28rpx; color: var(--text-ink); }
.name-input { flex: 1; text-align: right; font-size: 28rpx; color: var(--text-ink); min-width: 0; }
.input-ph { color: rgba(153, 153, 153, 0.5); }

.seg { display: flex; border-radius: 16rpx; border: 2rpx solid var(--line); overflow: hidden; }
.seg-btn { padding: 14rpx 40rpx; background: var(--bg-paper); }
.seg-on { background: var(--brand); }
.seg-text { font-size: 26rpx; color: var(--text-soft); }
.seg-text-on { color: #fff; font-weight: 600; }

.hint { font-size: 22rpx; line-height: 1.6; color: var(--text-soft); padding: 0 8rpx; }

.submit {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 30rpx;
  background: linear-gradient(135deg, var(--brand), #a01830);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
}
.submit:active { transform: scale(0.99); }
.submit-text { font-size: 32rpx; font-weight: 700; color: #fff; }

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
</style>
