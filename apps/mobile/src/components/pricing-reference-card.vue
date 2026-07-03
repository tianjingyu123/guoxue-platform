<template>
  <view class="prc">
    <!-- 标题区：强调「参考」非「规定」 -->
    <view class="prc-head">
      <view class="prc-head-l">
        <AppIcon name="trending-up" :size="16" color="#8a6d3b" />
        <text class="prc-title">定价参考</text>
      </view>
      <text class="prc-sub">基于同类市场 · 平台不干预你的定价</text>
    </view>

    <!-- 类目未选 -->
    <view v-if="!categoryLevel1" class="prc-tip">
      <AppIcon name="info" :size="14" color="#9ca3af" />
      <text class="prc-tip-txt">选择类目后查看定价参考</text>
    </view>

    <!-- 加载中 -->
    <view v-else-if="loading" class="prc-tip">
      <AppIcon name="loader" :size="14" color="#8a6d3b" />
      <text class="prc-tip-txt">正在获取同类价格分布…</text>
    </view>

    <!-- 错误 -->
    <view v-else-if="error" class="prc-tip">
      <AppIcon name="alert-circle" :size="14" color="#dc2626" />
      <text class="prc-tip-txt">{{ error }}</text>
      <text class="prc-retry" @tap="fetchReference">重试</text>
    </view>

    <!-- 正常 -->
    <template v-else-if="data">
      <!-- 样本不足：诚实降级，不展示区间 -->
      <view v-if="!data.distribution" class="prc-few">
        <text class="prc-few-txt">该类目样本较少（同类 {{ data.sampleSize }} 件），暂无法给出可靠区间，定价请谨慎参考。</text>
      </view>

      <template v-else>
        <!-- 均价 + 样本 -->
        <view class="prc-summary">
          <view class="prc-summary-main">
            <text class="prc-summary-label">同类均价</text>
            <text class="prc-summary-val">¥{{ fmt(data.distribution.avg) }}</text>
          </view>
          <text class="prc-sample">同类 {{ data.sampleSize }} 件 · 近 90 天</text>
        </view>

        <!-- 价格区间条：min~max，p25~p75 高亮为「多数定价带」，当前价标记 -->
        <view class="prc-bar-wrap">
          <view class="prc-bar">
            <view class="prc-bar-band" :style="{ left: bandLeft + '%', width: bandWidth + '%' }" />
            <view
              v-if="markerPct !== null"
              class="prc-bar-marker"
              :style="{ left: markerPct + '%' }"
            >
              <view class="prc-bar-dot" />
            </view>
          </view>
          <view class="prc-bar-scale">
            <text class="prc-scale-txt">¥{{ fmt(data.distribution.min) }}</text>
            <text class="prc-scale-mid">多数定价带 ¥{{ fmt(data.distribution.p25) }}–¥{{ fmt(data.distribution.p75) }}</text>
            <text class="prc-scale-txt">¥{{ fmt(data.distribution.max) }}</text>
          </view>
        </view>

        <!-- 当前价位置提示 -->
        <view v-if="hint" class="prc-hint" :style="{ background: hint.bg }">
          <text class="prc-hint-txt" :style="{ color: hint.color }">
            你当前定价 ¥{{ fmt(props.currentPrice as number) }} · {{ hint.label }}
          </text>
        </view>

        <!-- 叫好 / 热销定价带 -->
        <view v-if="data.qualityBand || data.salesBand" class="prc-bands">
          <view v-if="data.qualityBand" class="prc-band-item">
            <AppIcon name="star" :size="12" color="#d97706" />
            <text class="prc-band-txt">叫好商品定价带 ¥{{ fmt(data.qualityBand.min) }}–¥{{ fmt(data.qualityBand.max) }}</text>
          </view>
          <view v-if="data.salesBand" class="prc-band-item">
            <AppIcon name="flame" :size="12" color="#dc2626" />
            <text class="prc-band-txt">热销商品定价带 ¥{{ fmt(data.salesBand.min) }}–¥{{ fmt(data.salesBand.max) }}</text>
          </view>
        </view>

        <!-- 建议文案 -->
        <text class="prc-suggest">{{ data.suggestion.text }}</text>

        <!-- 采纳中位价（选填·仅填入，不自动提交） -->
        <view class="prc-adopt" @tap="onAdopt">
          <AppIcon name="check-circle" :size="14" color="#8a6d3b" />
          <text class="prc-adopt-txt">采纳中位价 ¥{{ fmt(data.distribution.median) }}</text>
        </view>
      </template>

      <!-- 免责声明常驻 -->
      <text class="prc-disclaimer">{{ data.disclaimer }}</text>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { pricingApi, priceHintConfig, type PricingBizType, type PricingReference } from '@/lib/pricing-data'

const props = defineProps<{
  bizType: PricingBizType
  categoryLevel1?: string
  categoryLevel2?: string
  /** 当前拟定价（元）；为空/0 时不做区间位置提示 */
  currentPrice?: number
}>()

const emit = defineEmits<{
  /** 用户点击「采纳中位价」，父页据此填入价格（不自动提交，定价权仍在用户） */
  (e: 'adopt', median: number): void
}>()

const loading = ref(false)
const error = ref('')
const data = ref<PricingReference | null>(null)

let timer: ReturnType<typeof setTimeout> | null = null

async function fetchReference() {
  if (!props.categoryLevel1) {
    data.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    data.value = await pricingApi.getReference({
      bizType: props.bizType,
      categoryLevel1: props.categoryLevel1,
      categoryLevel2: props.categoryLevel2 || undefined,
      currentPrice:
        props.currentPrice != null && props.currentPrice > 0 ? props.currentPrice : undefined,
    })
  } catch (e) {
    error.value = (e as Error)?.message || '获取定价参考失败'
    data.value = null
  } finally {
    loading.value = false
  }
}

/** 防频繁请求（用户改价/切类目时 debounce 600ms） */
function scheduleFetch() {
  if (timer) clearTimeout(timer)
  if (!props.categoryLevel1) {
    data.value = null
    error.value = ''
    return
  }
  timer = setTimeout(fetchReference, 600)
}

watch(
  () => [props.bizType, props.categoryLevel1, props.categoryLevel2, props.currentPrice],
  scheduleFetch,
  { immediate: true },
)

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

// ───────── 展示派生 ─────────
const hint = computed(() => {
  const h = data.value?.currentPriceHint
  return h ? priceHintConfig[h] : null
})

/** 区间条：把价格映射到 0~100% */
function pct(v: number): number {
  const d = data.value?.distribution
  if (!d || d.max <= d.min) return 0
  const r = ((v - d.min) / (d.max - d.min)) * 100
  return Math.max(0, Math.min(100, r))
}

const bandLeft = computed(() => (data.value?.distribution ? pct(data.value.distribution.p25) : 0))
const bandWidth = computed(() => {
  const d = data.value?.distribution
  if (!d) return 0
  return pct(d.p75) - pct(d.p25)
})

/** 当前价标记位置（仅在有分布 + 有正价时） */
const markerPct = computed<number | null>(() => {
  const d = data.value?.distribution
  const cp = props.currentPrice
  if (!d || cp == null || cp <= 0) return null
  return pct(cp)
})

function fmt(n: number): string {
  if (n == null || Number.isNaN(n)) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function onAdopt() {
  const m = data.value?.distribution?.median
  if (m != null) emit('adopt', m)
}
</script>

<style scoped>
.prc {
  background: #fbf8f2;
  border: 1px solid #efe6d4;
  border-radius: 12px;
  padding: 14px;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.prc-head { display: flex; flex-direction: column; gap: 2px; }
.prc-head-l { display: flex; align-items: center; gap: 6px; }
.prc-title { font-size: 14px; font-weight: 600; color: #8a6d3b; }
.prc-sub { font-size: 11px; color: #b0a48c; }

.prc-tip { display: flex; align-items: center; gap: 6px; padding: 6px 0; }
.prc-tip-txt { font-size: 12px; color: #9ca3af; flex: 1; }
.prc-retry { font-size: 12px; color: #8a6d3b; text-decoration: underline; }

.prc-few { background: #fff; border-radius: 8px; padding: 10px; }
.prc-few-txt { font-size: 12px; color: #b45309; line-height: 1.6; }

.prc-summary { display: flex; align-items: flex-end; justify-content: space-between; }
.prc-summary-main { display: flex; align-items: baseline; gap: 8px; }
.prc-summary-label { font-size: 12px; color: #6b7280; }
.prc-summary-val { font-size: 22px; font-weight: 700; color: #1a1a1a; }
.prc-sample { font-size: 11px; color: #9ca3af; }

.prc-bar-wrap { display: flex; flex-direction: column; gap: 6px; }
.prc-bar {
  position: relative;
  height: 10px;
  background: #eee4d0;
  border-radius: 5px;
}
.prc-bar-band {
  position: absolute;
  top: 0;
  height: 10px;
  background: #d9b36c;
  border-radius: 5px;
}
.prc-bar-marker {
  position: absolute;
  top: -3px;
  transform: translateX(-50%);
}
.prc-bar-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #c0392b;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
}
.prc-bar-scale { display: flex; align-items: center; justify-content: space-between; }
.prc-scale-txt { font-size: 11px; color: #9ca3af; }
.prc-scale-mid { font-size: 11px; color: #8a6d3b; font-weight: 500; }

.prc-hint { border-radius: 8px; padding: 8px 10px; }
.prc-hint-txt { font-size: 12px; font-weight: 500; }

.prc-bands { display: flex; flex-direction: column; gap: 6px; }
.prc-band-item { display: flex; align-items: center; gap: 5px; }
.prc-band-txt { font-size: 12px; color: #4b5563; }

.prc-suggest { font-size: 12px; color: #374151; line-height: 1.6; }

.prc-adopt {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f3e9d5;
  border: 1px solid #e2d2ac;
  border-radius: 8px;
  padding: 7px 14px;
}
.prc-adopt-txt { font-size: 13px; color: #8a6d3b; font-weight: 500; }

.prc-disclaimer { font-size: 11px; color: #b0a48c; line-height: 1.5; }
</style>
