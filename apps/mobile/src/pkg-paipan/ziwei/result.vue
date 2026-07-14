<script setup lang="ts">
/**
 * 紫微斗数·结果页（自 V0 app/ziwei/result/page.tsx 还原）
 * onLoad 解析 payload 后本地调真实安星引擎重算（@/pkg-paipan/lib/ziwei-engine），无后端依赖。
 * 结构：命主信息卡 → 十二宫盘面 → 生年四化 → 盘面要点 → 合规声明。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import GenerateReportButton from '@/components/paipan/generate-report-button.vue'
import AppIcon from '@/components/common/app-icon.vue'
import ZiweiChartGrid from './components/ziwei-chart-grid.vue'
import { computeZiwei, toZiweiChart } from '@/pkg-paipan/lib/ziwei-engine'
import type { ZiweiChart } from '@/pkg-paipan/lib/ziwei-types'
import { saveZiweiHistory, shichenLabel } from './ziwei-history'
import { navigateTo } from '@/utils/router'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '紫微排盘'
// #ifdef MP-WEIXIN
hdrTitle = '紫微文化研究'
// #endif

const chart = ref<ZiweiChart | null>(null)

/** 报告摘要：只用引擎算出的字段 */
const ziweiSummary = computed(() => {
  const c: any = chart.value
  if (!c) return ''
  return [c.wuxingJu, c.mingzhu ? `命主${c.mingzhu}` : '', c.shenzhu ? `身主${c.shenzhu}` : '']
    .filter(Boolean)
    .join(' · ')
})

const solarText = ref('')
const loadError = ref('')

onLoad((q: Record<string, string> = {}) => {
  try {
    if (!q.payload) throw new Error('缺少排盘参数')
    const p = JSON.parse(decodeURIComponent(q.payload)) as Record<string, unknown>
    const y = Number(p.y)
    const m = Number(p.m)
    const d = Number(p.d)
    const hour = Number(p.hour)
    const gender: '男' | '女' = p.gender === '女' ? '女' : '男'
    const name = String(p.name || '未知')
    if (!y || !m || !d || Number.isNaN(hour)) throw new Error('排盘参数不完整')

    const minute = Number(p.minute) || 0
    const useTrueSolar = p.useTrueSolar === true
    const lng = typeof p.lng === 'number' ? p.lng : undefined
    const city = typeof p.city === 'string' ? p.city : undefined

    const result = computeZiwei({ year: y, month: m, day: d, hour, minute, gender, useTrueSolar, lng })
    chart.value = toZiweiChart(result, name, y)
    if (useTrueSolar && city) {
      const adj = result.adjusted
      const pad = (n: number) => String(n).padStart(2, '0')
      solarText.value = `${y}年${m}月${d}日 ${pad(hour)}:${pad(minute)} · 真太阳时 ${pad(adj.getHours())}:${pad(adj.getMinutes())}（${city}）`
    } else {
      solarText.value = `${y}年${m}月${d}日 ${shichenLabel(hour)}`
    }
    // 记入本地排盘记录（index 起盘与深链进入均覆盖）
    saveZiweiHistory({ name, gender, y, m, d, hour, minute, city, lng, useTrueSolar })
  } catch (e) {
    loadError.value = (e as Error)?.message || '排盘参数无效'
  }
})

function goInput() {
  navigateTo('/pkg-paipan/ziwei/index')
}

/** 分享：复制盘面文字摘要 */
function onShare() {
  const c = chart.value
  if (!c) return
  const summary = [
    `【紫微排盘】${c.clientName} ${c.gender}命`,
    c.lunarBirth,
    `${c.wuxingJu} · 命主${c.mingzhu} · 身主${c.shenzhu}`,
    c.sihuaNote,
    '—— 来自热卜 · 专业排盘工具',
  ].join('\n')
  uni.setClipboardData({
    data: summary,
    success: () => uni.showToast({ title: '盘面摘要已复制', icon: 'none' }),
  })
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" @share="onShare" />

    <!-- 参数错误态 -->
    <view v-if="loadError" class="status">
      <app-icon name="info" :size="64" color="#d1d5db" />
      <text class="status-text">{{ loadError }}</text>
      <view class="status-btn" @tap="goInput"><text class="status-btn-text">去重新起盘</text></view>
    </view>

    <!-- 主体 -->
    <scroll-view v-else-if="chart" scroll-y class="body">
      <view class="body-inner">
        <!-- 命主信息卡 -->
        <paper-card padding="sm">
          <view class="info">
            <view class="info-l">
              <view class="info-name-row">
                <text class="info-name">{{ chart.clientName }}</text>
                <text class="info-gender">{{ chart.gender }}命</text>
              </view>
              <text class="info-line">{{ solarText }}</text>
              <text class="info-line">{{ chart.lunarBirth }}</text>
            </view>
            <view class="info-r">
              <view class="info-ju"><text class="info-ju-text">{{ chart.wuxingJu }}</text></view>
              <text class="info-zhu">命主 {{ chart.mingzhu }} · 身主 {{ chart.shenzhu }}</text>
            </view>
          </view>
        </paper-card>

        <!-- 十二宫盘面 -->
        <ziwei-chart-grid :chart="chart" />

        <!-- 生年四化 -->
        <paper-card padding="sm">
          <section-title title="生年四化" />
          <text class="sihua-note">{{ chart.sihuaNote }}</text>
        </paper-card>

        <!-- 盘面要点 -->
        <paper-card gold padding="sm">
          <section-title title="盘面要点" subtitle="断局参考" />
          <view class="notes">
            <view v-for="n in chart.keyNotes" :key="n.label" class="note-item">
              <view class="note-tag"><text class="note-tag-text">{{ n.label }}</text></view>
              <text class="note-text">{{ n.text }}</text>
            </view>
          </view>
        </paper-card>

        <generate-report-button
          v-if="chart"
          tool-key="ziwei"
          tool-label="紫微斗数"
          :client-name="chart.clientName || ''"
          :client-birth="chart.lunarBirth || ''"
          :data="chart as any"
          :summary="ziweiSummary"
        />
        <disclaimer variant="fortune" tone="card" />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 24rpx 48rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* 错误态 */
.status { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 80rpx 40rpx; }
.status-text { font-size: 28rpx; color: var(--text-soft); }
.status-btn { padding: 20rpx 56rpx; background: var(--brand); border-radius: 20rpx; }
.status-btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }

/* 命主信息卡 */
.info { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.info-l { display: flex; flex-direction: column; gap: 6rpx; min-width: 0; }
.info-name-row { display: flex; align-items: baseline; gap: 12rpx; }
.info-name { font-family: $serif; font-size: 34rpx; font-weight: 700; color: var(--text-ink); }
.info-gender { font-size: 22rpx; color: var(--text-soft); }
.info-line { font-size: 22rpx; color: var(--text-soft); }
.info-r { display: flex; flex-direction: column; align-items: flex-end; gap: 10rpx; flex-shrink: 0; }
.info-ju { background: rgba(196, 30, 58, 0.08); border-radius: 999rpx; padding: 8rpx 26rpx; }
.info-ju-text { font-family: $serif; font-size: 24rpx; font-weight: 700; color: var(--brand); }
.info-zhu { font-size: 20rpx; color: var(--text-soft); }

/* 生年四化 */
.sihua-note { display: block; margin-top: 20rpx; font-family: $serif; font-size: 26rpx; line-height: 1.7; color: var(--text-soft); }

/* 盘面要点 */
.notes { margin-top: 20rpx; display: flex; flex-direction: column; gap: 20rpx; }
.note-item { display: flex; align-items: flex-start; gap: 12rpx; }
.note-tag { flex-shrink: 0; background: rgba(201, 169, 110, 0.18); border-radius: 8rpx; padding: 4rpx 14rpx; margin-top: 4rpx; }
.note-tag-text { font-family: $serif; font-size: 22rpx; font-weight: 700; color: var(--gold); }
.note-text { font-family: $serif; font-size: 26rpx; line-height: 1.7; color: var(--text-ink); }
</style>
