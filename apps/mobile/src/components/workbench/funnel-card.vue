<template>
  <!-- 站长推广转化漏斗卡：自包含拉取；拉取失败或三个数字全为 0 时整体不渲染（新功能数据近期才开始积累，空数据不打扰） -->
  <view v-if="visible" class="funnel-card">
    <view class="funnel-head">
      <text class="funnel-title">近{{ daysLabel }}天推广转化</text>
    </view>

    <view v-for="(seg, i) in segments" :key="seg.key" class="funnel-seg">
      <!-- 相邻两段之间的转化率（分母为 0 显示 —） -->
      <view v-if="i > 0" class="funnel-rate">
        <text class="funnel-rate-txt">{{ seg.rateLabel }}</text>
      </view>
      <view class="funnel-row">
        <text class="funnel-label">{{ seg.label }}</text>
        <view class="funnel-bar-wrap">
          <view class="funnel-bar" :class="'c' + i" :style="{ width: seg.width + '%' }" />
        </view>
        <text class="funnel-value">{{ seg.value }}</text>
      </view>
    </view>

    <text class="funnel-note">数据自分享链接归因上线起累积</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { funnelApi, type StationFunnel } from '@/lib/advisor-data'

const props = withDefaults(
  defineProps<{
    /** 统计天数（后端默认30，最大90） */
    days?: number
  }>(),
  { days: 30 },
)

const data = ref<StationFunnel | null>(null)

/** 拉取失败或三个数字全为 0 → 整体不渲染 */
const visible = computed(() => {
  const d = data.value
  return !!d && (d.clicks > 0 || d.registrations > 0 || d.buyers > 0)
})

const daysLabel = computed(() => data.value?.days ?? props.days)

/** 转化率文案：分母为 0 显示 —（避免除零假象） */
function rate(num: number, den: number): string {
  if (den <= 0) return '—'
  return `${Math.round((num / den) * 1000) / 10}%`
}

/** 条宽：以首段（点击数）为基准递减；非 0 至少 10% 保证可见 */
function barWidth(v: number, base: number): number {
  if (v <= 0) return 0
  if (base <= 0) return 100
  return Math.max(10, Math.min(100, Math.round((v / base) * 100)))
}

/** 三段漏斗：链接点击 → 新用户注册 → 下单用户 */
const segments = computed(() => {
  const d = data.value
  if (!d) return []
  return [
    { key: 'clicks', label: '链接点击', value: d.clicks, width: d.clicks > 0 ? 100 : 0, rateLabel: '' },
    {
      key: 'registrations',
      label: '新用户注册',
      value: d.registrations,
      width: barWidth(d.registrations, d.clicks),
      rateLabel: `注册转化 ${rate(d.registrations, d.clicks)}`,
    },
    {
      key: 'buyers',
      label: '下单用户',
      value: d.buyers,
      width: barWidth(d.buyers, d.clicks),
      rateLabel: `下单转化 ${rate(d.buyers, d.registrations)}`,
    },
  ]
})

onMounted(async () => {
  try {
    data.value = await funnelApi.get(props.days)
  } catch {
    // 非站长（"你还没有开通分站"）或请求失败：整体不渲染，不打扰工作台主流程
    data.value = null
  }
})
</script>

<style scoped lang="scss">
.funnel-card {
  margin: 0 24rpx 24rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: #ffffff;
}

.funnel-head {
  margin-bottom: 20rpx;
}
.funnel-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.funnel-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.funnel-label {
  flex-shrink: 0;
  width: 152rpx;
  font-size: 24rpx;
  color: #666666;
}
.funnel-bar-wrap {
  flex: 1;
  min-width: 0;
  height: 36rpx;
  border-radius: 8rpx;
  background: #f5f5f5;
  overflow: hidden;
}
.funnel-bar {
  height: 100%;
  border-radius: 8rpx;
  transition: width 0.3s;

  /* 三段由深到浅递进，呼应品牌色 */
  &.c0 { background: linear-gradient(90deg, #c41e3a 0%, #d94560 100%); }
  &.c1 { background: linear-gradient(90deg, #d94560 0%, #e85d75 100%); }
  &.c2 { background: linear-gradient(90deg, #c9a96e 0%, #dcc39a 100%); }
}
.funnel-value {
  flex-shrink: 0;
  min-width: 72rpx;
  text-align: right;
  font-size: 26rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.funnel-rate {
  padding: 8rpx 0 8rpx 168rpx;
}
.funnel-rate-txt {
  font-size: 20rpx;
  color: #999999;
}

.funnel-note {
  display: block;
  margin-top: 20rpx;
  font-size: 20rpx;
  color: #bbbbbb;
}
</style>
