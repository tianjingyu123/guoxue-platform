<script setup lang="ts">
/**
 * 地区选择弹窗——从原型 location-picker-modal.tsx 迁移。
 * 省/市/区三级级联：原型自定义滚轮 → uni picker-view 三列联动。
 * 数据抽至 lib/region-data.ts 复用。海外可选「换算北京时间」。
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { chinaData, overseasData } from '@/lib/region-data'

interface InitLoc { province: string; city: string; district: string }
const props = defineProps<{ open: boolean; initialLocation?: InitLoc }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', v: { province: string; city: string; district: string; timezone: string; convertToBeijing?: boolean }): void
}>()

const region = ref<'domestic' | 'overseas'>('domestic')
const searchQuery = ref('')
const convertToBeijing = ref(false)
const showExplain = ref(false)

const data = computed(() => (region.value === 'domestic' ? chinaData : overseasData))
const provinces = computed(() => {
  const all = Object.keys(data.value)
  return searchQuery.value ? all.filter((p) => p.includes(searchQuery.value)) : all
})
const pIdx = ref(0)
const cIdx = ref(0)
const dIdx = ref(0)

const province = computed(() => provinces.value[pIdx.value] || '')
const cities = computed(() => (data.value[province.value] ? Object.keys(data.value[province.value]) : []))
const city = computed(() => cities.value[cIdx.value] || '')
const districts = computed(() => data.value[province.value]?.[city.value] || [])
const district = computed(() => districts.value[dIdx.value] || '')

function initFromProps() {
  region.value = 'domestic'
  searchQuery.value = ''
  const init = props.initialLocation
  const all = Object.keys(chinaData)
  let p = init?.province && all.includes(init.province) ? all.indexOf(init.province) : all.indexOf('未知地')
  if (p < 0) p = 0
  pIdx.value = p
  const cs = Object.keys(chinaData[all[p]] || {})
  let c = init?.city ? cs.indexOf(init.city) : 0
  cIdx.value = c < 0 ? 0 : c
  const ds = chinaData[all[p]]?.[cs[cIdx.value]] || []
  let d = init?.district ? ds.indexOf(init.district) : 0
  dIdx.value = d < 0 ? 0 : d
}
watch(() => props.open, (v) => { if (v) initFromProps() })
watch(region, () => { pIdx.value = 0; cIdx.value = 0; dIdx.value = 0 })

const pvValue = computed(() => [pIdx.value, cIdx.value, dIdx.value])
function onChange(e: { detail: { value: number[] } }) {
  const [p, c, d] = e.detail.value
  if (p !== pIdx.value) { pIdx.value = p; cIdx.value = 0; dIdx.value = 0 }
  else if (c !== cIdx.value) { cIdx.value = c; dIdx.value = 0 }
  else dIdx.value = d
}

function confirm() {
  emit('confirm', {
    province: province.value, city: city.value, district: district.value,
    timezone: '北京时间',
    convertToBeijing: region.value === 'overseas' ? convertToBeijing.value : undefined,
  })
  emit('close')
}
</script>

<template>
  <view v-if="open" class="lp-root">
    <view class="lp-mask" @tap="emit('close')" />
    <view class="lp-panel">
      <view class="lp-top">
        <view class="lp-region">
          <view class="lp-rbtn" :class="{ 'lp-rbtn-on': region === 'domestic' }" @tap="region = 'domestic'"><text class="lp-rtext" :class="{ 'lp-rtext-on': region === 'domestic' }">国内</text></view>
          <view class="lp-rbtn" :class="{ 'lp-rbtn-on': region === 'overseas' }" @tap="region = 'overseas'"><text class="lp-rtext" :class="{ 'lp-rtext-on': region === 'overseas' }">海外</text></view>
        </view>
        <view class="lp-confirm" @tap="confirm"><text class="lp-confirm-text">确定</text></view>
      </view>

      <view class="lp-search">
        <view class="lp-search-box">
          <app-icon name="search" :size="28" color="#9ca3af" />
          <input v-model="searchQuery" class="lp-input" :placeholder="region === 'domestic' ? '搜索全国城市及地区' : '搜索海外城市及地区'" />
        </view>
      </view>

      <view class="lp-current">
        <text class="lp-cur-item">{{ province }}</text>
        <text class="lp-cur-item">{{ city }}</text>
        <text class="lp-cur-item">{{ district || '--' }}</text>
      </view>

      <view class="lp-wheel">
        <picker-view class="lp-pv" :value="pvValue" :indicator-style="'height: 88rpx;'" @change="onChange">
          <picker-view-column>
            <view v-for="(p, i) in provinces" :key="i" class="lp-pv-item">{{ p }}</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="(c, i) in cities" :key="i" class="lp-pv-item">{{ c }}</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="(d, i) in districts" :key="i" class="lp-pv-item">{{ d }}</view>
          </picker-view-column>
        </picker-view>
      </view>

      <view v-if="region === 'overseas'" class="lp-overseas">
        <view class="lp-os-row">
          <view class="lp-os-l">
            <text class="lp-os-label">换算北京时间</text>
            <view class="lp-os-info" @tap="showExplain = true"><app-icon name="info" :size="28" color="#9ca3af" /></view>
          </view>
          <view class="lp-switch" :class="{ 'lp-switch-on': convertToBeijing }" @tap="convertToBeijing = !convertToBeijing">
            <view class="lp-switch-dot" :class="{ 'lp-switch-dot-on': convertToBeijing }" />
          </view>
        </view>
        <view class="lp-os-tip">
          <app-icon name="info" :size="22" color="#d97706" /><text class="lp-os-tip-text">仅支持北半球地区</text>
        </view>
      </view>

      <view class="lp-cancel" @tap="emit('close')"><text class="lp-cancel-text">取消</text></view>
    </view>

    <!-- 北京时间说明 -->
    <view v-if="showExplain" class="lp-explain" @tap="showExplain = false">
      <view class="lp-explain-card" @tap.stop>
        <text class="lp-explain-title">换算北京时间</text>
        <text class="lp-explain-body">海外出生者排盘时，可选择将当地时间换算为北京时间。开启后系统按经度差自动折算，仅支持北半球地区。</text>
        <view class="lp-explain-ok" @tap="showExplain = false"><text class="lp-explain-ok-text">我知道了</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.lp-root { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; }
.lp-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
.lp-panel { position: relative; width: 100%; background: #fff; border-radius: 48rpx 48rpx 0 0; overflow: hidden; }
.lp-top { display: flex; align-items: center; justify-content: space-between; padding: 40rpx 40rpx 24rpx; }
.lp-region { display: flex; background: #f3f4f6; border-radius: 999rpx; padding: 4rpx; }
.lp-rbtn { padding: 12rpx 32rpx; border-radius: 999rpx; }
.lp-rbtn-on { background: #fff; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.08); }
.lp-rtext { font-size: 26rpx; font-weight: 500; color: #6b7280; }
.lp-rtext-on { color: #111827; }
.lp-confirm { padding: 12rpx 40rpx; background: #111827; border-radius: 999rpx; }
.lp-confirm-text { font-size: 26rpx; font-weight: 500; color: #fff; }
.lp-search { padding: 0 40rpx 24rpx; }
.lp-search-box { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 24rpx; background: #f3f4f6; border-radius: 16rpx; }
.lp-input { flex: 1; font-size: 26rpx; color: #374151; }
.lp-current { display: flex; padding: 24rpx 40rpx; background: rgba(196,30,58,0.05); border-bottom: 2rpx solid rgba(196,30,58,0.1); }
.lp-cur-item { flex: 1; text-align: center; font-size: 32rpx; font-weight: 700; color: var(--brand); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.lp-wheel { border-bottom: 2rpx solid #f3f4f6; padding: 8rpx 16rpx; }
.lp-pv { height: 400rpx; }
.lp-pv-item { display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #1f2937; text-align: center; }
.lp-overseas { padding: 24rpx 40rpx; border-bottom: 2rpx solid #f3f4f6; }
.lp-os-row { display: flex; align-items: center; justify-content: space-between; }
.lp-os-l { display: flex; align-items: center; gap: 12rpx; }
.lp-os-label { font-size: 26rpx; color: #374151; }
.lp-os-tip { display: flex; align-items: center; gap: 8rpx; margin-top: 16rpx; }
.lp-os-tip-text { font-size: 22rpx; color: #d97706; }
.lp-switch { width: 72rpx; height: 40rpx; border-radius: 999rpx; background: #d1d5db; position: relative; }
.lp-switch-on { background: var(--brand); }
.lp-switch-dot { position: absolute; top: 4rpx; left: 4rpx; width: 32rpx; height: 32rpx; background: #fff; border-radius: 999rpx; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.15); transition: transform 0.2s; }
.lp-switch-dot-on { transform: translateX(32rpx); }
.lp-cancel { padding: 24rpx 40rpx; }
.lp-cancel-text { display: block; text-align: center; font-size: 26rpx; color: #6b7280; }
.lp-explain { position: absolute; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); padding: 0 64rpx; }
.lp-explain-card { background: #fff; border-radius: 32rpx; padding: 48rpx 40rpx; width: 100%; }
.lp-explain-title { display: block; text-align: center; font-size: 32rpx; font-weight: 700; color: #111827; margin-bottom: 24rpx; }
.lp-explain-body { display: block; font-size: 26rpx; line-height: 1.6; color: #6b7280; margin-bottom: 32rpx; }
.lp-explain-ok { padding: 20rpx; background: var(--brand); border-radius: 16rpx; }
.lp-explain-ok-text { display: block; text-align: center; font-size: 28rpx; font-weight: 500; color: #fff; }
</style>
