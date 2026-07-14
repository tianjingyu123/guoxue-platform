<script setup lang="ts">
/** 阳盘命理奇门排盘入口页（输入）——从原型 app/paipan/yangpan/page.tsx 1:1 迁移 */
import { ref, reactive, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import DatePickerModal from '@/components/bazi/date-picker-modal.vue'
import LocationPickerModal from '@/components/bazi/location-picker-modal.vue'
import { navigateTo } from '@/utils/router'
import { toSolarSafe } from '@/pkg-paipan/lib/date-convert'

// R4 合规：小程序端无占卜类目，标题改历法研究表述（仅展示文案·路由/逻辑不变）
let yangpanTitle = '阳盘命理奇门'
// #ifdef MP-WEIXIN
yangpanTitle = '阳盘历法研究'
// #endif

type Gender = 'male' | 'female'
type PanMethod = 'zhuan' | 'fei'
type JigongMethod = 'kungong' | 'yanggenyin'
type StartMethod = 'chaibu' | 'maoshan' | 'zhirun'
type AnganMethod = 'zhishi' | 'dipan'

const customerName = ref('')
const gender = ref<Gender>('male')
const birth = reactive({ year: 1990, month: 1, day: 1, hour: 12, minute: 0 })
const panMethod = ref<PanMethod>('zhuan')
const jigongMethod = ref<JigongMethod>('kungong')
const startMethod = ref<StartMethod>('chaibu')
const anganMethod = ref<AnganMethod>('zhishi')
const birthPlace = ref('')
const coordinates = reactive({ province: '', city: '', district: '' })
const trueSolar = ref(true)
const earlyLateZi = ref(false)
const daylightSaving = ref(false)

const showDatePicker = ref(false)
const showPlacePicker = ref(false)
const showSizhuCheck = ref(false)

const formatDateTime = computed(() =>
  `${birth.year}年${birth.month}月${birth.day}日 ${birth.hour}时${birth.minute}分`,
)

function onDateConfirm(d: {
  year: number; month: number; day: number
  hour: number | null; minute: number | null; isLunar?: boolean
}) {
  const hour = d.hour ?? birth.hour
  const minute = d.minute ?? birth.minute
  // 农历输入归一为公历：引擎入参恒为公历，否则农历数字会被当公历排盘
  const { date, ok } = toSolarSafe({ year: d.year, month: d.month, day: d.day, hour, minute, isLunar: d.isLunar })
  if (!ok) {
    uni.showToast({ title: '农历日期无效，请重新选择', icon: 'none' })
    return
  }
  birth.year = date.year
  birth.month = date.month
  birth.day = date.day
  birth.hour = date.hour
  birth.minute = date.minute
  showDatePicker.value = false
}

function onPlaceConfirm(loc: { province: string; city: string; district: string }) {
  coordinates.province = loc.province
  coordinates.city = loc.city
  coordinates.district = loc.district
  birthPlace.value = `${loc.province} ${loc.city} ${loc.district}`.trim()
  showPlacePicker.value = false
}

function handleSubmit() {
  const params: Record<string, string> = {
    name: customerName.value,
    gender: gender.value,
    year: String(birth.year),
    month: String(birth.month),
    day: String(birth.day),
    hour: String(birth.hour),
    minute: String(birth.minute),
    panMethod: panMethod.value,
    jigongMethod: jigongMethod.value,
    startMethod: startMethod.value,
    anganMethod: anganMethod.value,
    place: birthPlace.value,
    trueSolar: String(trueSolar.value),
    earlyLateZi: String(earlyLateZi.value),
    daylightSaving: String(daylightSaving.value),
  }
  const qs = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
  navigateTo(`/paipan/yangpan/result?${qs}`)
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-inner">
        <view class="hdr-back" @tap="navigateTo('/paipan')">
          <app-icon name="chevron-left" :size="40" color="var(--text-ink)" />
        </view>
        <text class="hdr-title">{{ yangpanTitle }}</text>
        <view class="hdr-spacer" />
      </view>
    </view>

    <!-- 标题横幅 -->
    <view class="banner">
      <text class="banner-title">{{ yangpanTitle }}</text>
      <view class="banner-share">
        <app-icon name="share-2" :size="28" color="rgba(255,255,255,0.9)" />
        <text class="banner-share-text">分享</text>
      </view>
    </view>

    <!-- 表单 -->
    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <view class="card">
          <!-- 客户名称 -->
          <view class="row row-border">
            <text class="row-label">客户名称</text>
            <input v-model="customerName" class="row-input" placeholder="请输入客户名称(选填)" placeholder-class="row-input-ph" />
          </view>

          <!-- 选择性别 -->
          <view class="row row-border">
            <text class="row-label">选择性别</text>
            <view class="opts">
              <view class="opt" :class="{ on: gender === 'male' }" @tap="gender = 'male'"><text class="opt-t" :class="{ on: gender === 'male' }">男</text></view>
              <view class="opt" :class="{ on: gender === 'female' }" @tap="gender = 'female'"><text class="opt-t" :class="{ on: gender === 'female' }">女</text></view>
            </view>
          </view>

          <!-- 出生时间 -->
          <view class="row row-border row-tap" @tap="showDatePicker = true">
            <text class="row-label">出生时间</text>
            <view class="row-right">
              <text class="row-value">{{ formatDateTime }}</text>
              <app-icon name="chevron-right" :size="28" color="var(--text-soft)" />
            </view>
          </view>

          <!-- 排盘方式 -->
          <view class="row row-border">
            <text class="row-label">排盘方式</text>
            <view class="opts">
              <view class="opt" :class="{ on: panMethod === 'zhuan' }" @tap="panMethod = 'zhuan'"><text class="opt-t" :class="{ on: panMethod === 'zhuan' }">转盘</text></view>
              <view class="opt" :class="{ on: panMethod === 'fei' }" @tap="panMethod = 'fei'"><text class="opt-t" :class="{ on: panMethod === 'fei' }">飞盘</text></view>
            </view>
          </view>

          <!-- 寄宫方式 -->
          <view class="row row-border">
            <text class="row-label">寄宫方式</text>
            <view class="opts">
              <view class="opt" :class="{ on: jigongMethod === 'kungong' }" @tap="jigongMethod = 'kungong'"><text class="opt-t" :class="{ on: jigongMethod === 'kungong' }">坤宫</text></view>
              <view class="opt" :class="{ on: jigongMethod === 'yanggenyin' }" @tap="jigongMethod = 'yanggenyin'"><text class="opt-t" :class="{ on: jigongMethod === 'yanggenyin' }">阳艮阴坤</text></view>
            </view>
          </view>

          <!-- 起局方式 -->
          <view class="row row-border row-col">
            <text class="row-label">起局方式</text>
            <view class="opts opts-wrap">
              <view class="opt" :class="{ on: startMethod === 'chaibu' }" @tap="startMethod = 'chaibu'"><text class="opt-t" :class="{ on: startMethod === 'chaibu' }">拆补</text></view>
              <view class="opt" :class="{ on: startMethod === 'maoshan' }" @tap="startMethod = 'maoshan'"><text class="opt-t" :class="{ on: startMethod === 'maoshan' }">茅山</text></view>
              <view class="opt" :class="{ on: startMethod === 'zhirun' }" @tap="startMethod = 'zhirun'"><text class="opt-t" :class="{ on: startMethod === 'zhirun' }">置闰</text></view>
            </view>
          </view>

          <!-- 暗干起法 -->
          <view class="row row-border">
            <text class="row-label">暗干起法</text>
            <view class="opts">
              <view class="opt" :class="{ on: anganMethod === 'zhishi' }" @tap="anganMethod = 'zhishi'"><text class="opt-t" :class="{ on: anganMethod === 'zhishi' }">值使门起</text></view>
              <view class="opt" :class="{ on: anganMethod === 'dipan' }" @tap="anganMethod = 'dipan'"><text class="opt-t" :class="{ on: anganMethod === 'dipan' }">门地盘起</text></view>
            </view>
          </view>

          <!-- 出生地点 -->
          <view class="row row-border row-tap" @tap="showPlacePicker = true">
            <text class="row-label">出生地点</text>
            <view class="row-right">
              <text class="row-value" :class="{ ph: !birthPlace }">{{ birthPlace || '请选择出生地点' }}</text>
              <app-icon name="chevron-right" :size="28" color="var(--text-soft)" />
            </view>
          </view>

          <!-- 底部选项 -->
          <view class="row foot-row">
            <view class="switches">
              <view class="check" @tap="trueSolar = !trueSolar">
                <view class="switch" :class="{ on: trueSolar }"><view class="switch-dot" :class="{ on: trueSolar }" /></view>
                <text class="check-label">真太阳时</text>
              </view>
              <view class="check" @tap="earlyLateZi = !earlyLateZi">
                <view class="switch" :class="{ on: earlyLateZi }"><view class="switch-dot" :class="{ on: earlyLateZi }" /></view>
                <text class="check-label">早晚子时</text>
              </view>
              <view class="check" @tap="daylightSaving = !daylightSaving">
                <view class="switch" :class="{ on: daylightSaving }"><view class="switch-dot" :class="{ on: daylightSaving }" /></view>
                <text class="check-label">夏令时</text>
              </view>
            </view>
            <view class="fanche-btn" @tap="showSizhuCheck = true"><text class="fanche-t">四柱反查</text></view>
          </view>
        </view>

        <!-- 底部按钮 -->
        <view class="actions">
          <view class="btn-primary" @tap="handleSubmit"><text class="btn-primary-t">开始排盘</text></view>
          <view class="btn-ghost" @tap="navigateTo('/paipan/yangpan/history')"><text class="btn-ghost-t">排盘记录</text></view>
        </view>
      </view>
    </scroll-view>

    <!-- 四柱反查弹窗 -->
    <view v-if="showSizhuCheck" class="modal" @tap="showSizhuCheck = false">
      <view class="modal-card" @tap.stop>
        <view class="modal-head"><text class="modal-title">四柱反查</text></view>
        <view class="modal-body">
          <text class="modal-desc">通过已知的四柱八字反推出生时间</text>
          <view class="sizhu-grid">
            <view v-for="label in ['年柱','月柱','日柱','时柱']" :key="label" class="sizhu-col">
              <text class="sizhu-label">{{ label }}</text>
              <input class="sizhu-input" placeholder="甲子" />
            </view>
          </view>
        </view>
        <view class="modal-foot">
          <view class="modal-btn modal-btn-cancel" @tap="showSizhuCheck = false"><text class="modal-btn-t">取消</text></view>
          <view class="modal-btn modal-btn-ok" @tap="showSizhuCheck = false"><text class="modal-btn-t ok">确定</text></view>
        </view>
      </view>
    </view>

    <!-- 时间选择器 -->
    <date-picker-modal
      :open="showDatePicker"
      :initial-date="birth"
      initial-mode="solar"
      @confirm="onDateConfirm"
      @close="showDatePicker = false"
    />

    <!-- 地点选择器 -->
    <location-picker-modal
      :open="showPlacePicker"
      :initial-location="coordinates"
      @confirm="onPlaceConfirm"
      @close="showPlacePicker = false"
    />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }

.hdr { position: sticky; top: 0; z-index: 10; background: var(--bg-paper); border-bottom: 2rpx solid var(--border); padding-top: var(--status-bar-height, 0); }
.hdr-inner { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; }
.hdr-back { padding: 8rpx; margin-left: -8rpx; }
.hdr-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.hdr-spacer { width: 40rpx; }

.banner { background: var(--brand); padding: 40rpx 32rpx; display: flex; align-items: center; justify-content: space-between; }
.banner-title { font-size: 44rpx; font-weight: 700; color: #fff; letter-spacing: 4rpx; }
.banner-share { display: flex; align-items: center; gap: 6rpx; }
.banner-share-text { font-size: 26rpx; color: rgba(255,255,255,0.9); }

.body { flex: 1; }
.body-inner { padding: 24rpx; }

.card { background: var(--card); border-radius: 24rpx; border: 2rpx solid var(--border); overflow: hidden; }

.row { padding: 28rpx 32rpx; display: flex; align-items: center; justify-content: space-between; }
.row-border { border-bottom: 2rpx solid rgba(0,0,0,0.06); }
.row-tap:active { background: rgba(0,0,0,0.02); }
.row-col { flex-direction: column; align-items: flex-start; gap: 24rpx; }
.row-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.row-input { flex: 1; margin-left: 24rpx; text-align: right; font-size: 28rpx; color: var(--text-ink); }
.row-input-ph { color: var(--text-soft); }
.row-right { display: flex; align-items: center; gap: 6rpx; }
.row-value { font-size: 28rpx; color: var(--text-soft); }
.row-value.ph { color: var(--text-soft); }

.opts { display: flex; align-items: center; gap: 16rpx; }
.opts-wrap { flex-wrap: wrap; }
.opt { padding: 12rpx 24rpx; border-radius: 16rpx; background: var(--secondary, rgba(0,0,0,0.04)); }
.opt.on { background: var(--brand); box-shadow: 0 2rpx 6rpx rgba(196,30,58,0.2); }
.opt-t { font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.opt-t.on { color: #fff; }

.foot-row { flex-wrap: wrap; gap: 24rpx; }
.switches { display: flex; align-items: center; gap: 32rpx; flex-wrap: wrap; }
.check { display: flex; align-items: center; gap: 12rpx; }
.check-label { font-size: 26rpx; color: var(--text-ink); }
.switch { width: 76rpx; height: 40rpx; border-radius: 999rpx; background: var(--secondary, rgba(0,0,0,0.12)); display: flex; align-items: center; padding: 0 4rpx; transition: background .2s; }
.switch.on { background: var(--brand); }
.switch-dot { width: 32rpx; height: 32rpx; border-radius: 999rpx; background: #fff; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.2); transition: transform .2s; }
.switch-dot.on { transform: translateX(36rpx); }
.fanche-btn { padding: 12rpx 24rpx; border-radius: 16rpx; background: rgba(196,30,58,0.1); }
.fanche-t { font-size: 26rpx; font-weight: 500; color: var(--brand); }

.actions { margin-top: 48rpx; padding-bottom: 64rpx; display: flex; flex-direction: column; gap: 24rpx; }
.btn-primary { padding: 32rpx; background: var(--brand); border-radius: 24rpx; box-shadow: 0 8rpx 20rpx rgba(196,30,58,0.3); display: flex; align-items: center; justify-content: center; }
.btn-primary:active { transform: scale(0.99); }
.btn-primary-t { font-size: 30rpx; font-weight: 700; color: #fff; }
.btn-ghost { padding: 32rpx; background: var(--card); border: 2rpx solid rgba(196,30,58,0.3); border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.btn-ghost-t { font-size: 30rpx; font-weight: 700; color: var(--brand); }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 32rpx; }
.modal-card { background: var(--card); width: 100%; max-width: 600rpx; border-radius: 24rpx; overflow: hidden; }
.modal-head { padding: 32rpx; border-bottom: 2rpx solid var(--border); }
.modal-title { font-size: 34rpx; font-weight: 700; color: var(--text-ink); text-align: center; display: block; }
.modal-body { padding: 32rpx; display: flex; flex-direction: column; gap: 32rpx; }
.modal-desc { font-size: 26rpx; color: var(--text-soft); text-align: center; }
.sizhu-grid { display: flex; gap: 16rpx; }
.sizhu-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.sizhu-label { font-size: 22rpx; color: var(--text-soft); }
.sizhu-input { width: 100%; height: 80rpx; border-radius: 16rpx; border: 2rpx solid var(--border); text-align: center; font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.modal-foot { padding: 32rpx; display: flex; gap: 16rpx; }
.modal-btn { flex: 1; padding: 20rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.modal-btn-cancel { border: 2rpx solid var(--border); }
.modal-btn-ok { background: var(--brand); }
.modal-btn-t { font-size: 28rpx; color: var(--text-ink); }
.modal-btn-t.ok { color: #fff; }
</style>
