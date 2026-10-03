<script setup lang="ts">
/**
 * 【万年历子组件】古今纪年转换（自 V0 components/yijing/wannianli/era-converter.tsx 还原）
 * 日期选择 + 公农历/干支/生肖/纪元/儒略日多制式对照（引擎实时换算）。
 * 交互适配：input[type=date] → uni-app picker mode="date"。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import StatTile from './stat-tile.vue'
import { convertEra } from '@/pkg-paipan/lib/wannianli-engine'

const props = defineProps<{
  date: Date
}>()

function toInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const value = ref<string>(toInputValue(props.date))

const parsed = computed<Date>(() => {
  const [y, m, dd] = value.value.split('-').map(Number)
  if (!y || !m || !dd) return props.date
  return new Date(y, m - 1, dd)
})

const e = computed(() => convertEra(parsed.value))

const detailRows = computed(() => [
  { label: '公历', value: e.value.gregorian },
  { label: '农历', value: e.value.lunar },
  { label: '干支纪年', value: e.value.ganzhiYear },
  { label: '干支纪月', value: e.value.ganzhiMonth },
  { label: '干支纪日', value: e.value.ganzhiDay },
  { label: '生肖', value: e.value.zodiac },
  { label: '传统纪元', value: e.value.reignEra },
  { label: '儒略日', value: e.value.julianDay },
  { label: '星期', value: e.value.weekday },
])

function onDateChange(ev: { detail: { value: string } }) {
  value.value = ev.detail.value
}
</script>

<template>
  <view class="ec">
    <!-- 输入区 -->
    <paper-card padding="lg">
      <view class="ec-sec"><section-title title="选择日期" subtitle="输入公历日期 · 实时换算多制式纪年" /></view>
      <picker mode="date" :value="value" start="1900-01-01" end="2100-12-31" @change="onDateChange">
        <view class="ec-field">
          <app-icon name="calendar-days" :size="36" color="var(--brand)" />
          <text class="ec-field-label">公历</text>
          <text class="ec-field-value">{{ value }}</text>
        </view>
      </picker>
    </paper-card>

    <!-- 速览对照 -->
    <view class="ec-quick">
      <stat-tile v-for="row in e.quickList" :key="row.label" :label="row.label" :value="row.value" />
    </view>

    <!-- 详尽纪年 -->
    <paper-card gold padding="lg">
      <view class="ec-sec"><section-title title="纪年对照" subtitle="同一时刻的多种表述" /></view>
      <view class="ec-rows">
        <view v-for="(row, i) in detailRows" :key="row.label" class="ec-row" :class="{ 'ec-row-line': i !== 0 }">
          <text class="ec-row-label">{{ row.label }}</text>
          <text class="ec-row-value">{{ row.value }}</text>
        </view>
      </view>
    </paper-card>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;

.ec {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding: 32rpx 32rpx 48rpx;
}
.ec-sec { margin-bottom: 24rpx; }
.ec-field {
  display: flex;
  align-items: center;
  gap: 24rpx;
  border-radius: 20rpx;
  border: 1rpx solid var(--line);
  background: var(--card);
  padding: 24rpx 32rpx;
}
.ec-field-label { font-size: 28rpx; color: var(--text-soft); }
.ec-field-value {
  margin-left: auto;
  font-family: $serif;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-ink);
}
.ec-quick { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24rpx; }
.ec-rows { display: flex; flex-direction: column; }
.ec-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 20rpx 0;
}
.ec-row-line { border-top: 1rpx solid var(--line); }
.ec-row-label { flex-shrink: 0; font-size: 28rpx; color: var(--text-soft); }
.ec-row-value {
  min-width: 0;
  text-align: right;
  font-family: $serif;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-ink);
  line-height: 1.5;
}
</style>
