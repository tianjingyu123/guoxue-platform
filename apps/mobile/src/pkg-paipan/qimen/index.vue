<script setup lang="ts">
/** 奇门遁甲排盘入口页（输入）——从原型 app/paipan/qimen/page.tsx 1:1 迁移 */
import { ref, reactive, onMounted, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import DatePickerModal from '@/components/bazi/date-picker-modal.vue'
import { navigateTo } from '@/utils/router'
import { toSolarSafe } from '@/pkg-paipan/lib/date-convert'
import { BRAND } from '@/lib/brand'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案·路由/逻辑不变）
let hdrTitle = `${BRAND.nameShort}奇门遁甲`
let bannerTitle = '奇门遁甲'
// #ifdef MP-WEIXIN
hdrTitle = '奇门文化研究'
bannerTitle = '奇门文化研究'
// #endif

type PanMethod = 'zhuan' | 'fei'
type FlyMethod = 'yangshun' | 'yinyang'
type StartMethod = 'chaibu' | 'maoshan' | 'zhirun' | 'custom'
type AnganMethod = 'zhishi' | 'dipan'

const JU_OPTIONS = [
  '阳遁1局', '阳遁2局', '阳遁3局', '阳遁4局', '阳遁5局',
  '阳遁6局', '阳遁7局', '阳遁8局', '阳遁9局',
  '阴遁1局', '阴遁2局', '阴遁3局', '阴遁4局', '阴遁5局',
  '阴遁6局', '阴遁7局', '阴遁8局', '阴遁9局',
]

const matter = ref('')
const dateTime = reactive({ year: 2026, month: 5, day: 17, hour: 13, minute: 38 })
const panMethod = ref<PanMethod>('fei')
const flyMethod = ref<FlyMethod>('yinyang')
const startMethod = ref<StartMethod>('chaibu')
const customJu = ref('阳遁1局')
const anganMethod = ref<AnganMethod>('dipan')
const useTrueSolar = ref(false)
const coordinates = reactive({ lat: 38.93, lng: 115.42 })

const showJuPicker = ref(false)
const showDatePicker = ref(false)

function syncNow() {
  const now = new Date()
  dateTime.year = now.getFullYear()
  dateTime.month = now.getMonth() + 1
  dateTime.day = now.getDate()
  dateTime.hour = now.getHours()
  dateTime.minute = now.getMinutes()
}
onMounted(syncNow)

const formatDateTime = computed(() =>
  `${dateTime.year}年${dateTime.month}月${dateTime.day}日 ${String(dateTime.hour).padStart(2, '0')}时${String(dateTime.minute).padStart(2, '0')}分`,
)

function onDateConfirm(d: {
  year: number; month: number; day: number
  hour: number | null; minute: number | null; isLunar?: boolean
}) {
  const hour = d.hour ?? dateTime.hour
  const minute = d.minute ?? dateTime.minute
  // 农历输入归一为公历：引擎入参恒为公历，否则农历数字会被当公历排盘
  const { date, ok } = toSolarSafe({ year: d.year, month: d.month, day: d.day, hour, minute, isLunar: d.isLunar })
  if (!ok) {
    uni.showToast({ title: '农历日期无效，请重新选择', icon: 'none' })
    return
  }
  dateTime.year = date.year
  dateTime.month = date.month
  dateTime.day = date.day
  dateTime.hour = date.hour
  dateTime.minute = date.minute
  showDatePicker.value = false
}

function pickJu(ju: string) {
  customJu.value = ju
  showJuPicker.value = false
}

function handleSubmit() {
  const params: Record<string, string> = {
    matter: matter.value,
    year: String(dateTime.year),
    month: String(dateTime.month),
    day: String(dateTime.day),
    hour: String(dateTime.hour),
    minute: String(dateTime.minute),
    panMethod: panMethod.value,
    flyMethod: flyMethod.value,
    startMethod: startMethod.value,
    customJu: startMethod.value === 'custom' ? customJu.value : '',
    anganMethod: anganMethod.value,
    // 🔴 参数名必须叫 useTrueSolar：result.vue 读的是 opts.useTrueSolar（历史页也发 useTrueSolar=1）。
    // 此前这里发 trueSolar= → 结果页恒 false，开关形同虚设。
    useTrueSolar: String(useTrueSolar.value),
    lat: String(coordinates.lat),
    lng: String(coordinates.lng),
  }
  const qs = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
  navigateTo(`/paipan/qimen/result?${qs}`)
}

/** 分享：H5 系统分享/复制链接，其余端复制标题（照 jinkoujue/meihua 范式） */
function handleShare() {
  const title = `${bannerTitle} - ${BRAND.nameShort}`
  // #ifdef H5
  const url = window.location.href
  const nav = navigator as Navigator & { share?: (data: { title?: string; url?: string }) => Promise<void> }
  if (nav.share) { nav.share({ title, url }).catch(() => {}); return }
  uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) })
  return
  // #endif
  // eslint-disable-next-line no-unreachable
  uni.setClipboardData({ data: title, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
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
        <text class="hdr-title">{{ hdrTitle }}</text>
        <view class="hdr-spacer" />
      </view>
    </view>

    <!-- 标题横幅 -->
    <view class="banner">
      <text class="banner-title">{{ bannerTitle }}</text>
      <view class="banner-share" @tap="handleShare">
        <app-icon name="share-2" :size="28" color="rgba(255,255,255,0.9)" />
        <text class="banner-share-text">分享</text>
      </view>
    </view>

    <!-- 表单 -->
    <scroll-view scroll-y class="body">
      <view class="body-inner">
        <view class="card">
          <!-- 事项内容 -->
          <view class="row row-border">
            <text class="row-label">事项内容</text>
            <input v-model="matter" class="row-input" placeholder="请输入事项(选填)" placeholder-class="row-input-ph" />
          </view>

          <!-- 排盘时间 -->
          <view class="row row-border row-tap" @tap="showDatePicker = true">
            <view class="row-left">
              <text class="row-label">排盘时间</text>
              <view class="row-refresh" @tap.stop="syncNow">
                <app-icon name="refresh-cw" :size="28" color="var(--text-soft)" />
              </view>
            </view>
            <view class="row-right">
              <text class="row-value">{{ formatDateTime }}</text>
              <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
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

          <!-- 飞宫方式 -->
          <view class="row row-border">
            <text class="row-label">飞宫方式</text>
            <view class="opts">
              <view class="opt" :class="{ on: flyMethod === 'yangshun' }" @tap="flyMethod = 'yangshun'"><text class="opt-t" :class="{ on: flyMethod === 'yangshun' }">阳顺阴逆</text></view>
              <view class="opt" :class="{ on: flyMethod === 'yinyang' }" @tap="flyMethod = 'yinyang'"><text class="opt-t" :class="{ on: flyMethod === 'yinyang' }">阴阳皆顺</text></view>
            </view>
          </view>

          <!-- 起局方式 -->
          <view class="row row-border row-col">
            <text class="row-label">起局方式</text>
            <view class="opts opts-wrap">
              <view class="opt" :class="{ on: startMethod === 'chaibu' }" @tap="startMethod = 'chaibu'"><text class="opt-t" :class="{ on: startMethod === 'chaibu' }">拆补</text></view>
              <view class="opt" :class="{ on: startMethod === 'maoshan' }" @tap="startMethod = 'maoshan'"><text class="opt-t" :class="{ on: startMethod === 'maoshan' }">茅山</text></view>
              <view class="opt" :class="{ on: startMethod === 'zhirun' }" @tap="startMethod = 'zhirun'"><text class="opt-t" :class="{ on: startMethod === 'zhirun' }">置闰</text></view>
              <view class="opt" :class="{ on: startMethod === 'custom' }" @tap="startMethod = 'custom'"><text class="opt-t" :class="{ on: startMethod === 'custom' }">自选局数</text></view>
            </view>
          </view>

          <!-- 自选局数下拉 -->
          <view v-if="startMethod === 'custom'" class="ju-wrap">
            <view class="ju-trigger" @tap="showJuPicker = true">
              <text class="ju-val">{{ customJu }}</text>
              <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
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

          <!-- 时间类型 -->
          <view class="row">
            <text class="row-label">时间类型</text>
            <view class="row-right">
              <text v-if="useTrueSolar" class="row-coord">北纬{{ coordinates.lat }}东经{{ coordinates.lng }}</text>
              <view class="check" @tap="useTrueSolar = !useTrueSolar">
                <text class="check-label">真太阳时</text>
                <view class="switch" :class="{ on: useTrueSolar }">
                  <view class="switch-dot" :class="{ on: useTrueSolar }" />
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 底部按钮 -->
        <view class="actions">
          <view class="btn-primary" @tap="handleSubmit"><text class="btn-primary-t">开始排盘</text></view>
          <view class="btn-ghost" @tap="navigateTo('/paipan/qimen/history')"><text class="btn-ghost-t">排盘记录</text></view>
        </view>
      </view>
    </scroll-view>

    <!-- 时间选择器 -->
    <date-picker-modal
      :open="showDatePicker"
      :initial-date="dateTime"
      initial-mode="solar"
      @confirm="onDateConfirm"
      @close="showDatePicker = false"
    />

    <!-- 局数选择弹窗 -->
    <view v-if="showJuPicker" class="ju-modal" @tap="showJuPicker = false">
      <view class="ju-sheet" @tap.stop>
        <view class="ju-head">
          <text class="ju-cancel" @tap="showJuPicker = false">取消</text>
          <text class="ju-head-title">选择局数</text>
          <text class="ju-confirm" @tap="showJuPicker = false">确定</text>
        </view>
        <scroll-view scroll-y class="ju-list">
          <view
            v-for="ju in JU_OPTIONS"
            :key="ju"
            class="ju-item"
            @tap="pickJu(ju)"
          >
            <text class="ju-item-t" :class="{ on: customJu === ju }">{{ ju }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
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
.body-inner { padding: 0 32rpx; margin-top: -16rpx; }

.card { background: var(--card); border-radius: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); border: 2rpx solid rgba(0,0,0,0.04); overflow: hidden; }

.row { padding: 28rpx 32rpx; display: flex; align-items: center; justify-content: space-between; }
.row-border { border-bottom: 2rpx solid rgba(0,0,0,0.06); }
.row-tap:active { background: rgba(0,0,0,0.02); }
.row-col { flex-direction: column; align-items: flex-start; gap: 24rpx; }
.row-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink); flex-shrink: 0; }
.row-input { flex: 1; margin-left: 24rpx; text-align: right; font-size: 28rpx; color: var(--text-soft); }
.row-input-ph { color: rgba(153,153,153,0.5); }
.row-left { display: flex; align-items: center; gap: 12rpx; }
.row-refresh { padding: 4rpx; }
.row-right { display: flex; align-items: center; gap: 6rpx; }
.row-value { font-size: 28rpx; color: var(--text-ink); }
.row-coord { font-size: 22rpx; color: var(--text-soft); }

.opts { display: flex; align-items: center; gap: 16rpx; }
.opts-wrap { flex-wrap: wrap; }
.opt { padding: 12rpx 24rpx; border-radius: 16rpx; background: var(--secondary, rgba(0,0,0,0.04)); }
.opt.on { background: var(--brand); box-shadow: 0 2rpx 6rpx rgba(196,30,58,0.2); }
.opt-t { font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.opt-t.on { color: #fff; }

.ju-wrap { padding: 24rpx 32rpx; background: rgba(0,0,0,0.02); border-bottom: 2rpx solid rgba(0,0,0,0.06); }
.ju-trigger { display: flex; align-items: center; justify-content: space-between; background: var(--card); border-radius: 16rpx; padding: 24rpx 32rpx; border: 2rpx solid var(--border); }
.ju-val { font-size: 28rpx; color: var(--text-ink); }

.check { display: flex; align-items: center; gap: 16rpx; }
.check-label { font-size: 28rpx; color: var(--text-ink); }
.switch { width: 76rpx; height: 40rpx; border-radius: 999rpx; background: var(--secondary, rgba(0,0,0,0.12)); display: flex; align-items: center; padding: 0 4rpx; transition: background .2s; }
.switch.on { background: var(--brand); }
.switch-dot { width: 32rpx; height: 32rpx; border-radius: 999rpx; background: #fff; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.2); transition: transform .2s; }
.switch-dot.on { transform: translateX(36rpx); }

.actions { margin-top: 48rpx; padding-bottom: 64rpx; display: flex; flex-direction: column; gap: 24rpx; }
.btn-primary { padding: 32rpx; background: var(--brand); border-radius: 24rpx; box-shadow: 0 8rpx 20rpx rgba(196,30,58,0.3); display: flex; align-items: center; justify-content: center; }
.btn-primary:active { transform: scale(0.99); }
.btn-primary-t { font-size: 30rpx; font-weight: 700; color: #fff; }
.btn-ghost { padding: 32rpx; background: var(--card); border: 2rpx solid rgba(196,30,58,0.3); border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.btn-ghost-t { font-size: 30rpx; font-weight: 700; color: var(--brand); }

.ju-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 50; display: flex; align-items: flex-end; }
.ju-sheet { background: var(--card); width: 100%; border-radius: 32rpx 32rpx 0 0; overflow: hidden; }
.ju-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx; border-bottom: 2rpx solid var(--border); }
.ju-cancel, .ju-confirm { font-size: 28rpx; font-weight: 500; color: var(--brand); }
.ju-head-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.ju-list { max-height: 50vh; }
.ju-item { padding: 28rpx 0; text-align: center; border-bottom: 2rpx solid rgba(0,0,0,0.06); }
.ju-item-t { font-size: 28rpx; color: var(--text-soft); }
.ju-item-t.on { font-size: 34rpx; font-weight: 600; color: var(--text-ink); }
</style>
