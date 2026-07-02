<template>
  <!--
    今日宜忌轻栏：自包含拉取 /wannianli/today；拉取失败或无当日数据时整体不渲染。
    说明：全局暂无独立的万年历/黄历页面（工具目录中「万年历」仍指向 coming-soon 占位页），
    故按约定不做点击跳转；后续页面上线后可在此补 @tap 跳转。
  -->
  <view v-if="today" class="almanac-bar" :style="{ margin: margin }">
    <text class="almanac-date">{{ lunarLabel }}</text>
    <text class="almanac-yiji">
      <text class="almanac-tag yi">宜</text> {{ yiText }}
      <text class="almanac-sep">｜</text>
      <text class="almanac-tag ji">忌</text> {{ jiText }}
    </text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { almanacApi, type AlmanacToday } from '@/lib/advisor-data'

const props = withDefaults(
  defineProps<{
    /** 外边距（各工作台容器留白不一：有内边距的容器传 '0 0 24rpx' 等） */
    margin?: string
  }>(),
  { margin: '0 24rpx 24rpx' },
)

const margin = computed(() => props.margin)

const today = ref<AlmanacToday | null>(null)

onMounted(async () => {
  try {
    const res = await almanacApi.today()
    // 后端库中无当日数据返回 null；关键展示字段缺失也视为无数据
    today.value = res && (res.lunarDate || res.riGanZhi) ? res : null
  } catch {
    // 拉取失败整体不渲染，不打扰工作台主流程
    today.value = null
  }
})

/** 左侧文案：从 lunarDate（如「丙午年闰5月18日」）截取干支年之后的月日部分，拼日干支 */
const lunarLabel = computed(() => {
  const d = today.value
  if (!d) return ''
  const m = /年(.+)$/.exec(d.lunarDate || '')
  const monthDay = m ? m[1] : d.lunarDate || ''
  const gz = d.riGanZhi ? ` · ${d.riGanZhi}日` : ''
  return `农历${monthDay}${gz}`
})

/** 宜/忌兼容数组或字符串（字符串按空白/顿号/逗号切分），各取前 2 项 */
function firstTwo(v: string[] | string | undefined): string {
  const items = Array.isArray(v)
    ? v
    : typeof v === 'string'
      ? v.split(/[\s、,，]+/)
      : []
  return items.filter(Boolean).slice(0, 2).join(' ')
}

const yiText = computed(() => firstTwo(today.value?.yi) || '—')
const jiText = computed(() => firstTwo(today.value?.ji) || '—')
</script>

<style scoped lang="scss">
/* 一条横向轻栏：浅底、低调雅致、单行省略 */
.almanac-bar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: #faf7f2;
  border: 1rpx solid #f0e9dd;
  box-sizing: border-box;
}
.almanac-date {
  flex-shrink: 0;
  font-size: 26rpx;
  font-weight: 600;
  color: #6b5b45;
  white-space: nowrap;
}
.almanac-yiji {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 24rpx;
  color: #8a7a63;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.almanac-tag {
  font-weight: 700;

  &.yi { color: #4a7c59; }
  &.ji { color: #b5543a; }
}
.almanac-sep {
  color: #d8cdbb;
}
</style>
