<script setup lang="ts">
/**
 * 日期选择弹窗——从原型 date-picker-modal.tsx 迁移。
 * 公历/农历：原型自定义滚轮 → uni 原生 picker-view（跨端最佳实践，手感更稳）。
 * 四柱：天干地支键盘，逐列(年/月/日/时)逐行(干/支)填写，保留五行配色。
 * 注：农历日数沿用原型简化口径(按公历当月天数截取)，非天文精确，与原型一致。
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

type Mode = 'solar' | 'lunar' | 'sizhu'
interface InitDate { year: number; month: number; day: number; hour: number; minute: number }
const props = withDefaults(defineProps<{ open: boolean; initialDate?: InitDate; initialMode?: Mode }>(), {
  initialMode: 'solar',
})
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', v: { year: number; month: number; day: number; hour: number | null; minute: number | null; isLunar: boolean }): void
}>()

const years = Array.from({ length: 201 }, (_, i) => 1900 + i)
const months = Array.from({ length: 12 }, (_, i) => i + 1)
const lunarMonthsShort = ['正','二','三','四','五','六','七','八','九','十','冬','腊']
const lunarDays = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十']
const tianGan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const diZhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const wx: Record<string,string> = {
  甲:'wood',乙:'wood',寅:'wood',卯:'wood',丙:'fire',丁:'fire',巳:'fire',午:'fire',
  戊:'earth',己:'earth',辰:'earth',戌:'earth',丑:'earth',未:'earth',
  庚:'metal',辛:'metal',申:'metal',酉:'metal',壬:'water',癸:'water',亥:'water',子:'water',
}
const wxColor = (c: string) => (wx[c] ? `var(--wuxing-${wx[c]})` : '#d1d5db')
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }

const mode = ref<Mode>(props.initialMode)
const year = ref(props.initialDate?.year || 1990)
const month = ref(props.initialDate?.month || 1)
const day = ref(props.initialDate?.day || 1)
const hour = ref<number | null>(props.initialDate?.hour ?? null)
const minute = ref<number | null>(props.initialDate?.minute ?? null)
const useDST = ref(false)

const sizhu = ref<Record<string,string>>({ yearGan:'',yearZhi:'',monthGan:'',monthZhi:'',dayGan:'',dayZhi:'',hourGan:'',hourZhi:'' })
const activeCol = ref<'year'|'month'|'day'|'hour'>('year')
const activeRow = ref<'gan'|'zhi'>('gan')

watch(() => props.open, (v) => {
  if (v) {
    mode.value = props.initialMode
    year.value = props.initialDate?.year || 1990
    month.value = props.initialDate?.month || 1
    day.value = props.initialDate?.day || 1
    hour.value = props.initialDate?.hour ?? null
    minute.value = props.initialDate?.minute ?? null
  }
})

const dayCount = computed(() => daysInMonth(year.value, month.value))
const dayItems = computed(() => mode.value === 'lunar' ? lunarDays.slice(0, dayCount.value) : Array.from({ length: dayCount.value }, (_, i) => i + 1))
const monthItems = computed(() => mode.value === 'lunar' ? lunarMonthsShort : months)
const hourItems = computed(() => ['未知', ...Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))])
const minuteItems = computed(() => ['未知', ...Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))])

// picker-view 选中索引数组
const pvValue = computed(() => [
  Math.max(0, years.indexOf(year.value)),
  month.value - 1,
  Math.min(day.value - 1, dayCount.value - 1),
  hour.value === null ? 0 : hour.value + 1,
  minute.value === null ? 0 : minute.value + 1,
])
function onPvChange(e: { detail: { value: number[] } }) {
  const [yi, mi, di, hi, mni] = e.detail.value
  year.value = years[yi]
  month.value = mi + 1
  day.value = Math.min(di + 1, daysInMonth(year.value, month.value))
  hour.value = hi === 0 ? null : hi - 1
  minute.value = mni === 0 ? null : mni - 1
}

function setToday() {
  const n = new Date()
  year.value = n.getFullYear(); month.value = n.getMonth() + 1; day.value = n.getDate()
  hour.value = n.getHours(); minute.value = n.getMinutes()
}
function clearSizhu() { sizhu.value = { yearGan:'',yearZhi:'',monthGan:'',monthZhi:'',dayGan:'',dayZhi:'',hourGan:'',hourZhi:'' } }
function selectGanZhi(c: string, isGan: boolean) {
  sizhu.value[`${activeCol.value}${isGan ? 'Gan' : 'Zhi'}`] = c
  if (isGan) { activeRow.value = 'zhi' }
  else {
    if (activeCol.value === 'year') activeCol.value = 'month'
    else if (activeCol.value === 'month') activeCol.value = 'day'
    else if (activeCol.value === 'day') activeCol.value = 'hour'
    activeRow.value = 'gan'
  }
}

const displayDate = computed(() => {
  if (mode.value === 'sizhu') return '四柱排盘'
  const hs = hour.value === null ? '未知时' : `${hour.value}时`
  const ms = minute.value === null ? '' : `${minute.value}分`
  if (mode.value === 'lunar') return `农历:${year.value}年${['正','二','三','四','五','六','七','八','九','十','冬','腊'][month.value-1]}月${lunarDays[day.value-1]} ${hs}${ms}`
  return `公历:${year.value}年${month.value}月${day.value}日 ${hs}${ms}`
})

const cols = ['year','month','day','hour'] as const
const colNames = ['年柱','月柱','日柱','时柱']

function confirm() {
  emit('confirm', {
    year: year.value, month: month.value, day: day.value,
    hour: hour.value, minute: minute.value, isLunar: mode.value === 'lunar',
  })
  emit('close')
}
</script>

<template>
  <view v-if="open" class="dp-root">
    <view class="dp-mask" @tap="emit('close')" />
    <view class="dp-panel">
      <!-- 顶部显示 + 模式切换 -->
      <view class="dp-top">
        <text class="dp-display">{{ displayDate }}</text>
        <view class="dp-ctrl">
          <view class="dp-modes">
            <view v-for="m in (['solar','lunar','sizhu'] as Mode[])" :key="m"
              class="dp-mode" :class="{ 'dp-mode-on': mode === m }" @tap="mode = m">
              <text class="dp-mode-text" :class="{ 'dp-mode-text-on': mode === m }">{{ m === 'solar' ? '公历' : m === 'lunar' ? '农历' : '四柱' }}</text>
            </view>
          </view>
          <view v-if="mode !== 'sizhu'" class="dp-today" @tap="setToday"><text class="dp-today-text">今</text></view>
          <view class="dp-confirm" @tap="confirm"><text class="dp-confirm-text">确定</text></view>
        </view>
      </view>

      <!-- 四柱键盘 -->
      <view v-if="mode === 'sizhu'" class="dp-sizhu">
        <view class="dp-sz-labels">
          <text v-for="n in colNames" :key="n" class="dp-sz-label">{{ n }}</text>
        </view>
        <view class="dp-sz-cells">
          <view v-for="col in cols" :key="col" class="dp-sz-col">
            <view class="dp-sz-cell" :class="{ 'dp-sz-cell-on': activeCol === col && activeRow === 'gan' }"
              @tap="activeCol = col; activeRow = 'gan'">
              <text class="dp-sz-char" :style="{ color: sizhu[col + 'Gan'] ? wxColor(sizhu[col + 'Gan']) : '#d1d5db' }">{{ sizhu[col + 'Gan'] }}</text>
            </view>
            <view class="dp-sz-cell" :class="{ 'dp-sz-cell-on': activeCol === col && activeRow === 'zhi' }"
              @tap="activeCol = col; activeRow = 'zhi'">
              <text class="dp-sz-char" :style="{ color: sizhu[col + 'Zhi'] ? wxColor(sizhu[col + 'Zhi']) : '#d1d5db' }">{{ sizhu[col + 'Zhi'] }}</text>
            </view>
          </view>
        </view>
        <view class="dp-sz-range">
          <text class="dp-sz-range-text">查找范围：1801~2099年</text>
          <view class="dp-sz-clear" @tap="clearSizhu">
            <app-icon name="trash-2" :size="26" color="#9ca3af" /><text class="dp-sz-clear-text">清除</text>
          </view>
        </view>
        <view v-if="activeRow === 'gan'" class="dp-kb dp-kb-5">
          <view v-for="g in tianGan" :key="g" class="dp-key" @tap="selectGanZhi(g, true)">
            <text class="dp-key-char" :style="{ color: wxColor(g) }">{{ g }}</text>
          </view>
        </view>
        <view v-else class="dp-kb dp-kb-6">
          <view v-for="z in diZhi" :key="z" class="dp-key" @tap="selectGanZhi(z, false)">
            <text class="dp-key-char" :style="{ color: wxColor(z) }">{{ z }}</text>
          </view>
        </view>
      </view>

      <!-- 公历/农历滚轮 -->
      <view v-else class="dp-wheel">
        <picker-view class="dp-pv" :value="pvValue" :indicator-style="'height: 88rpx;'" @change="onPvChange">
          <picker-view-column>
            <view v-for="y in years" :key="y" class="dp-pv-item">{{ y }}</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="(m, i) in monthItems" :key="i" class="dp-pv-item">{{ m }}{{ mode === 'lunar' ? '' : '月' }}</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="(d, i) in dayItems" :key="i" class="dp-pv-item">{{ d }}{{ mode === 'lunar' ? '' : '日' }}</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="(h, i) in hourItems" :key="i" class="dp-pv-item">{{ h }}</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="(mn, i) in minuteItems" :key="i" class="dp-pv-item">{{ mn }}</view>
          </picker-view-column>
        </picker-view>
      </view>

      <!-- 底部夏令时 -->
      <view class="dp-bottom">
        <text class="dp-dst-label">夏令时</text>
        <view class="dp-switch" :class="{ 'dp-switch-on': useDST }" @tap="useDST = !useDST">
          <view class="dp-switch-dot" :class="{ 'dp-switch-dot-on': useDST }" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.dp-root { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; }
.dp-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
.dp-panel { position: relative; width: 100%; background: #fff; border-radius: 48rpx 48rpx 0 0; overflow: hidden; }
.dp-top { padding: 40rpx 40rpx 24rpx; border-bottom: 2rpx solid #f3f4f6; }
.dp-display { display: block; text-align: center; font-size: 32rpx; font-weight: 500; color: #1f2937; margin-bottom: 32rpx; }
.dp-ctrl { display: flex; align-items: center; justify-content: space-between; }
.dp-modes { display: flex; background: #f3f4f6; border-radius: 999rpx; padding: 4rpx; }
.dp-mode { padding: 12rpx 32rpx; border-radius: 999rpx; }
.dp-mode-on { background: #fff; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.08); }
.dp-mode-text { font-size: 26rpx; color: #6b7280; }
.dp-mode-text-on { color: #111827; font-weight: 500; }
.dp-today { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; background: #f3f4f6; }
.dp-today-text { font-size: 26rpx; font-weight: 500; color: #4b5563; }
.dp-confirm { padding: 16rpx 40rpx; background: #111827; border-radius: 999rpx; }
.dp-confirm-text { font-size: 26rpx; font-weight: 500; color: #fff; }
/* 四柱 */
.dp-sizhu { padding: 32rpx; }
.dp-sz-labels { display: flex; margin-bottom: 24rpx; }
.dp-sz-label { width: 128rpx; text-align: center; font-size: 22rpx; color: #9ca3af; }
.dp-sz-cells { display: flex; gap: 16rpx; margin-bottom: 32rpx; }
.dp-sz-col { display: flex; flex-direction: column; gap: 8rpx; }
.dp-sz-cell { width: 112rpx; height: 96rpx; border-radius: 16rpx; border: 4rpx solid #e5e7eb; background: #f9fafb; display: flex; align-items: center; justify-content: center; }
.dp-sz-cell-on { border-color: var(--brand); background: rgba(196,30,58,0.05); }
.dp-sz-char { font-size: 40rpx; font-weight: 700; }
.dp-sz-range { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; padding: 0 8rpx; }
.dp-sz-range-text { font-size: 22rpx; color: #9ca3af; }
.dp-sz-clear { display: flex; align-items: center; gap: 8rpx; }
.dp-sz-clear-text { font-size: 22rpx; color: #9ca3af; }
.dp-kb { display: grid; gap: 16rpx; }
.dp-kb-5 { grid-template-columns: repeat(5, 1fr); }
.dp-kb-6 { grid-template-columns: repeat(6, 1fr); }
.dp-key { height: 96rpx; border-radius: 16rpx; border: 2rpx solid #e5e7eb; display: flex; align-items: center; justify-content: center; }
.dp-key-char { font-size: 40rpx; font-weight: 700; }
/* 滚轮 */
.dp-wheel { padding: 16rpx 24rpx; }
.dp-pv { height: 440rpx; }
.dp-pv-item { display: flex; align-items: center; justify-content: center; font-size: 30rpx; color: #1f2937; }
/* 底部 */
.dp-bottom { display: flex; align-items: center; justify-content: flex-end; gap: 16rpx; padding: 24rpx 40rpx; border-top: 2rpx solid #f3f4f6; }
.dp-dst-label { font-size: 22rpx; color: #9ca3af; }
.dp-switch { width: 72rpx; height: 36rpx; border-radius: 999rpx; background: #e5e7eb; position: relative; transition: background 0.2s; }
.dp-switch-on { background: var(--brand); }
.dp-switch-dot { position: absolute; top: 4rpx; left: 4rpx; width: 28rpx; height: 28rpx; background: #fff; border-radius: 999rpx; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.15); transition: transform 0.2s; }
.dp-switch-dot-on { transform: translateX(36rpx); }
</style>
