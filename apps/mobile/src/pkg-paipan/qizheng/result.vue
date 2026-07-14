<script setup lang="ts">
/**
 * 七政四余·结果页（自 V0 app/qizheng/result/page.tsx 还原）
 * onLoad 解析 payload 后本地重算（@/pkg-paipan/lib/qizheng-engine，VSOP87 实测天度），无后端依赖。
 * 结构：命主信息条 → 星盘（canvas 多环）→ 盘面控制（本命/流年 + 日期/小时步进）
 *       → 四页签（四柱 / 化曜 / 相位 / 星格）→ 方法说明。
 *
 * 农历：入口页可能传农历生辰（isLunar），引擎入参恒为公历，故此处先转换再排盘。
 * 取舍：分享收口到顶栏（复制盘面摘要）；进入即自动存本地历史（改名原位覆盖）。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import GenerateReportButton from '@/components/paipan/generate-report-button.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { cityLongitude, cityLatitude } from '@/pkg-paipan/lib/bazi-engine'
import { computeQizheng } from '@/pkg-paipan/lib/qizheng-engine'
import { Lunar } from '@/pkg-paipan/lib/lunar/index.js'
import ChartWheel from './components/chart-wheel.vue'
import StarTable from './components/star-table.vue'
import { saveQizhengHistory, type QizhengParams } from './qizheng-history'

type TabKey = 'sizhu' | 'huayao' | 'xiangwei' | 'xingge'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'sizhu', label: '四柱' },
  { key: 'huayao', label: '化曜' },
  { key: 'xiangwei', label: '相位' },
  { key: 'xingge', label: '星格' },
]

interface ViewTime { year: number; month: number; day: number; hour: number; minute: number }

const loadError = ref('')
const params = ref<QizhengParams | null>(null)
/** 出生时刻（公历，已由农历转换而来） */
const birth = ref<ViewTime | null>(null)
const mode = ref<'natal' | 'annual'>('natal')
const viewTime = ref<ViewTime | null>(null)
const tab = ref<TabKey>('sizhu')

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function fmtTime(t: ViewTime): string {
  return `${t.year}-${pad(t.month)}-${pad(t.day)} ${pad(t.hour)}:${pad(t.minute)}`
}

/** 本命盘（恒以出生时刻排） */
const natal = computed(() => {
  const p = params.value
  const b = birth.value
  if (!p || !b) return null
  return computeQizheng({
    ...b,
    gender: p.gender,
    longitude: cityLongitude(p.city),
    latitude: cityLatitude(p.city),
  })
})

/** 当前展示盘（本命 or 流年推盘） */
const result = computed(() => {
  const p = params.value
  if (!p) return null
  if (mode.value === 'natal') return natal.value
  const t = viewTime.value
  if (!t) return natal.value
  return computeQizheng({
    ...t,
    gender: p.gender,
    longitude: cityLongitude(p.city),
    latitude: cityLatitude(p.city),
  })
})

/** 报告摘要：命宫/身宫（引擎算的） */
const qizhengSummary = computed(() => {
  const r: any = result.value
  if (!r) return ''
  return [r.mingGong ? `命宫${r.mingGong}` : '', r.shenGong ? `身宫${r.shenGong}` : ''].filter(Boolean).join(' · ')
})

const highlightYear = computed(() => (mode.value === 'annual' ? viewTime.value?.year : undefined))

onLoad((q: Record<string, string> = {}) => {
  try {
    if (!q.payload) throw new Error('缺少排盘参数')
    const raw = JSON.parse(decodeURIComponent(q.payload)) as Record<string, unknown>

    const num = (k: string) => {
      const v = Number(raw[k])
      if (!Number.isFinite(v)) throw new Error(`${k} 无效`)
      return v
    }
    const year = num('year')
    const month = num('month')
    const day = num('day')
    const hour = num('hour')
    const minute = num('minute')
    if (year < 1900 || year > 2100) throw new Error('年份超出范围（1900-2100）')
    if (month < 1 || month > 12) throw new Error('月份无效')
    if (day < 1 || day > 31) throw new Error('日期无效')
    if (hour < 0 || hour > 23) throw new Error('小时无效')
    if (minute < 0 || minute > 59) throw new Error('分钟无效')

    const p: QizhengParams = {
      name: String(raw.name ?? ''),
      gender: raw.gender === '女' ? '女' : '男',
      year, month, day, hour, minute,
      isLunar: !!raw.isLunar,
      city: String(raw.city ?? '北京'),
    }
    params.value = p

    // 农历 → 公历（引擎入参恒为公历）
    let b: ViewTime = { year, month, day, hour, minute }
    if (p.isLunar) {
      try {
        const solar = Lunar.fromYmdHms(year, month, day, hour, minute, 0).getSolar()
        b = { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay(), hour, minute }
      } catch {
        throw new Error('农历日期无效，请检查后重排')
      }
    }
    birth.value = b
    viewTime.value = { ...b }

    const r = computeQizheng({
      ...b,
      gender: p.gender,
      longitude: cityLongitude(p.city),
      latitude: cityLatitude(p.city),
    })
    saveQizhengHistory(
      p,
      `立命${r.ming.zhi}宫${r.ming.mansion}宿 · 恩${r.enYongChouNan.en}用${r.enYongChouNan.yong}`,
    )
  } catch (e) {
    loadError.value = (e as Error).message || '排盘参数无效'
  }
})

/** 流年步进：逐字段构造 Date，规避各端字符串解析差异 */
function step(days: number, hours: number) {
  if (mode.value !== 'annual' || !viewTime.value) return
  const t = viewTime.value
  const d = new Date(t.year, t.month - 1, t.day, t.hour, t.minute)
  d.setDate(d.getDate() + days)
  d.setHours(d.getHours() + hours)
  viewTime.value = {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  }
}

function switchMode(m: 'natal' | 'annual') {
  mode.value = m
  if (m === 'natal' && birth.value) viewTime.value = { ...birth.value }
}

function houseOf(zhi: string): string {
  return result.value?.palaces.find((p) => p.zhi === zhi)?.house ?? ''
}

function onShare() {
  const r = result.value
  const p = params.value
  if (!r || !p) return
  const txt = [
    `【七政四余 · ${p.name || '缘主'}】`,
    `${p.gender}命 · 属${r.meta.zodiac} · ${r.meta.dayNight}`,
    `${r.meta.solarText}　${r.meta.lunarText}`,
    `四柱：${r.meta.ganzhi.join(' ')}`,
    `立命 ${r.ming.zhi}宫 ${r.ming.mansion}宿${r.ming.mansionDeg.toFixed(2)}°`,
    `安身 ${r.shen.zhi}宫 ${r.shen.mansion}宿${r.shen.mansionDeg.toFixed(2)}°`,
    `恩${r.enYongChouNan.en} 用${r.enYongChouNan.yong} 仇${r.enYongChouNan.chou} 难${r.enYongChouNan.nan}`,
  ].join('\n')
  uni.setClipboardData({
    data: txt,
    success: () => uni.showToast({ title: '盘面已复制', icon: 'none' }),
  })
}
</script>

<template>
  <view class="page">
    <tool-header title="七政四余星盘" back-href="/paipan/qizheng" share @share="onShare" />

    <!-- 错误态 -->
    <view v-if="loadError" class="status">
      <text class="status-text">{{ loadError }}</text>
      <view class="status-btn" @tap="navigateTo('/paipan/qizheng')">
        <text class="status-btn-text">返回排盘</text>
      </view>
    </view>

    <scroll-view v-else-if="result && params && birth" scroll-y class="body">
      <view class="body-inner">
        <!-- 命主信息 -->
        <view class="meta">
          <view class="meta-head">
            <view class="meta-name-row">
              <text class="meta-name">{{ params.name || '缘主' }}</text>
              <text class="meta-sub">
                {{ params.gender }}命 · 属{{ result.meta.zodiac }} · {{ result.meta.dayNight }}
              </text>
            </view>
            <view class="meta-redo" @tap="navigateTo('/paipan/qizheng')">
              <app-icon name="refresh-cw" :size="24" color="var(--brand)" />
              <text class="meta-redo-text">重排</text>
            </view>
          </view>
          <view class="meta-dates">
            <text class="meta-date">{{ result.meta.solarText }}</text>
            <text class="meta-date">{{ result.meta.lunarText }}</text>
          </view>
        </view>

        <!-- 星盘 -->
        <view class="wheel-sec">
          <chart-wheel :result="result" :highlight-year="highlightYear" />
        </view>

        <!-- 盘面控制：本命 / 流年 -->
        <view class="ctrl">
          <view class="ctrl-row">
            <view class="ctrl-time">
              <text class="ctrl-time-text">{{ fmtTime(mode === 'natal' ? birth : (viewTime || birth)) }}</text>
            </view>
            <view class="ctrl-seg">
              <view class="ctrl-seg-btn" :class="{ 'ctrl-seg-on': mode === 'natal' }" @tap="switchMode('natal')">
                <text class="ctrl-seg-text" :class="{ 'ctrl-seg-text-on': mode === 'natal' }">本命</text>
              </view>
              <view class="ctrl-seg-btn" :class="{ 'ctrl-seg-on': mode === 'annual' }" @tap="switchMode('annual')">
                <text class="ctrl-seg-text" :class="{ 'ctrl-seg-text-on': mode === 'annual' }">流年</text>
              </view>
            </view>
          </view>

          <view v-if="mode === 'annual' && viewTime" class="stepper-row">
            <view class="stepper">
              <text class="stepper-label">日期</text>
              <view class="stepper-ctl">
                <view class="stepper-btn" @tap="step(-1, 0)"><text class="stepper-sign">−</text></view>
                <text class="stepper-val">{{ viewTime.day }}</text>
                <view class="stepper-btn" @tap="step(1, 0)"><text class="stepper-sign">+</text></view>
              </view>
            </view>
            <view class="stepper">
              <text class="stepper-label">小时</text>
              <view class="stepper-ctl">
                <view class="stepper-btn" @tap="step(0, -1)"><text class="stepper-sign">−</text></view>
                <text class="stepper-val">{{ viewTime.hour }}</text>
                <view class="stepper-btn" @tap="step(0, 1)"><text class="stepper-sign">+</text></view>
              </view>
            </view>
          </view>
        </view>

        <!-- 四页签 -->
        <view class="tabs">
          <view
            v-for="t in TABS"
            :key="t.key"
            class="tab"
            :class="{ 'tab-on': tab === t.key }"
            @tap="tab = t.key"
          >
            <text class="tab-text" :class="{ 'tab-text-on': tab === t.key }">{{ t.label }}</text>
          </view>
        </view>

        <!-- 四柱 -->
        <template v-if="tab === 'sizhu' && natal">
          <paper-card>
            <text class="card-title card-title-center">命盘详情</text>
            <view class="dl">
              <view class="dl-row">
                <text class="dt">节气：</text>
                <text class="dd">{{ result.meta.jieqiPrev }} {{ result.meta.jieqiNext }}</text>
              </view>
              <view class="dl-row">
                <text class="dt">阳历：</text>
                <text class="dd">{{ result.meta.solarText }}</text>
              </view>
              <view class="dl-row">
                <text class="dt">农历：</text>
                <text class="dd">{{ result.meta.lunarText }}</text>
              </view>
              <view class="dl-row">
                <text class="dt dt-bold">{{ params.gender === '男' ? '乾造' : '坤造' }}：</text>
                <text class="dd dd-bold">{{ result.meta.ganzhi.join(' ') }}</text>
              </view>
              <view class="dl-row dl-row-last">
                <text class="dt">童限：</text>
                <text class="dd">
                  {{ natal.tongxian.years }}年{{ natal.tongxian.months }}个月{{ natal.tongxian.days }}天
                  出限：{{ natal.tongxian.endDate }}
                </text>
              </view>
            </view>
          </paper-card>

          <paper-card>
            <view class="card-head">
              <text class="card-title">大限排布</text>
              <text class="card-sub">宫限 · 命宫顺行</text>
            </view>
            <view class="dx-grid">
              <view v-for="d in natal.daxian" :key="`${d.palaceZhi}-${d.startYear}`" class="dx-item">
                <text class="dx-house">{{ d.house }}<text class="dx-zhi">{{ d.palaceZhi }}</text></text>
                <text class="dx-years">{{ d.startYear }}-{{ d.endYear }}</text>
              </view>
            </view>
          </paper-card>
        </template>

        <!-- 化曜 -->
        <template v-if="tab === 'huayao'">
          <paper-card>
            <view class="card-head">
              <text class="card-title">天星化曜</text>
              <text class="card-sub">{{ result.meta.yearGan }}年生人 · 化曜对应十神</text>
            </view>
            <view class="hy-grid">
              <view v-for="h in result.huayaoTable" :key="h.yao" class="hy-item">
                <text class="hy-star">{{ h.star.replace('星', '') }}</text>
                <text class="hy-yao">{{ h.yao }}</text>
                <text class="hy-shishen">{{ h.shishen }}</text>
              </view>
            </view>
          </paper-card>

          <paper-card>
            <text class="card-title">本盘化曜落宫</text>
            <view class="hy-list">
              <view v-for="b in result.bodies.filter((x) => x.huayao)" :key="b.key" class="hy-row">
                <text class="hy-row-name">{{ b.name }} 化{{ b.huayao?.slice(-1) }}</text>
                <text class="hy-row-pos">{{ b.palaceZhi }}宫 · {{ houseOf(b.palaceZhi) }} · {{ b.shishen }}</text>
              </view>
            </view>
          </paper-card>
        </template>

        <!-- 相位 -->
        <template v-if="tab === 'xiangwei'">
          <paper-card>
            <view class="ms-row">
              <text class="ms-text">
                立命：{{ result.ming.zhi }}{{ result.ming.palaceDeg.toFixed(2) }}
                {{ result.ming.mansion }}{{ result.ming.mansionDeg.toFixed(2) }}
              </text>
              <text class="ms-text">
                安身：{{ result.shen.zhi }}{{ result.shen.palaceDeg.toFixed(2) }}
                {{ result.shen.mansion }}{{ result.shen.mansionDeg.toFixed(2) }}
              </text>
            </view>
          </paper-card>

          <paper-card>
            <text class="card-title">{{ mode === 'natal' ? '本命星相' : '流年星相' }}</text>
            <view class="st-wrap">
              <star-table :result="result" />
            </view>
          </paper-card>

          <paper-card>
            <view class="card-head">
              <text class="card-title">星曜相位</text>
              <text class="card-sub">会合0° 三合120° 对照180° 刑90°</text>
            </view>
            <text v-if="!result.aspects.length" class="empty">无显著相位。</text>
            <view v-else class="asp-list">
              <view v-for="(a, i) in result.aspects" :key="i" class="asp-row">
                <text class="asp-pair">{{ a.a }} {{ a.kind }} {{ a.b }}</text>
                <text class="asp-orb">角距 {{ a.angle.toFixed(1) }}° · 容许 {{ a.orb.toFixed(1) }}°</text>
              </view>
            </view>
          </paper-card>
        </template>

        <!-- 星格 -->
        <template v-if="tab === 'xingge'">
          <paper-card>
            <view class="pat-cols">
              <view class="pat-col">
                <text class="card-title">政余喜格</text>
                <view class="pat-list">
                  <view v-for="p in result.patterns.filter((x) => x.kind === '喜')" :key="p.name" class="pat-item">
                    <text class="pat-name pat-name-good">{{ p.name }}</text>
                    <text class="pat-desc">{{ p.desc }}</text>
                  </view>
                  <text v-if="!result.patterns.some((x) => x.kind === '喜')" class="empty">本盘无成喜格。</text>
                </view>
              </view>
              <view class="pat-col">
                <text class="card-title">政余忌格</text>
                <view class="pat-list">
                  <view v-for="p in result.patterns.filter((x) => x.kind === '忌')" :key="p.name" class="pat-item">
                    <text class="pat-name pat-name-bad">{{ p.name }}</text>
                    <text class="pat-desc">{{ p.desc }}</text>
                  </view>
                  <text v-if="!result.patterns.some((x) => x.kind === '忌')" class="empty">本盘无犯忌格。</text>
                </view>
              </view>
            </view>
          </paper-card>

          <paper-card>
            <text class="card-title">盘面提要</text>
            <view class="note-list">
              <view v-for="(n, i) in result.notes" :key="i" class="note-item">
                <view class="note-dot" />
                <text class="note-text">{{ n }}</text>
              </view>
            </view>
          </paper-card>
        </template>

        <!-- 方法说明 -->
        <text class="method">
          本盘依真实天文星历（VSOP87/ELP2000）排布，宿度采用现代天测宿钤（J2000 岁差修正至生时，回归今宿），立命安身参《果老星宗》古法，已与主流排盘软件逐项校准。星命之学，义理为上，数术为辅。
        </text>

        <generate-report-button
          v-if="result && params"
          tool-key="qizheng"
          tool-label="七政四余"
          :client-name="params.name || ''"
          :client-birth="`${params.year}-${params.month}-${params.day}`"
          :data="result as any"
          :summary="qizhengSummary"
        />

        <disclaimer
          variant="custom"
          tone="subtle"
          text="七政四余为传统星命学说，所示星盘与断语仅供文化研究与参考，切勿迷信。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 0 0 48rpx; display: flex; flex-direction: column; gap: 20rpx; }

/* 错误态 */
.status { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; padding: 80rpx 48rpx; }
.status-text { font-size: 28rpx; color: var(--text-soft); text-align: center; }
.status-btn { padding: 20rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.status-btn-text { font-size: 28rpx; color: #fff; font-weight: 600; }

/* 命主信息 */
.meta { padding: 20rpx 32rpx; border-bottom: 1rpx solid var(--line); }
.meta-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16rpx; }
.meta-name-row { display: flex; align-items: baseline; gap: 12rpx; min-width: 0; }
.meta-name { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.meta-sub { font-size: 22rpx; color: var(--text-soft); }
.meta-redo { display: flex; align-items: center; gap: 6rpx; flex-shrink: 0; }
.meta-redo-text { font-size: 22rpx; color: var(--brand); }
.meta-dates { margin-top: 8rpx; display: flex; flex-wrap: wrap; gap: 8rpx 28rpx; }
.meta-date { font-size: 22rpx; color: var(--text-soft); }

/* 星盘 */
.wheel-sec { padding: 12rpx 0 4rpx; background: linear-gradient(180deg, rgba(212, 160, 23, 0.06), var(--card) 60%); }

/* 盘面控制 */
.ctrl { margin: 0 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.ctrl-row { display: flex; align-items: center; gap: 16rpx; }
.ctrl-time {
  flex: 1; min-width: 0;
  padding: 16rpx 24rpx; border-radius: 999rpx;
  border: 2rpx solid rgba(184, 134, 11, 0.3);
  background: rgba(212, 160, 23, 0.08);
  text-align: center;
}
.ctrl-time-text { font-size: 22rpx; font-weight: 700; color: #8a6d1b; }
.ctrl-seg {
  display: flex; border-radius: 999rpx; overflow: hidden;
  border: 2rpx solid rgba(184, 134, 11, 0.4);
  flex-shrink: 0;
}
.ctrl-seg-btn { padding: 16rpx 32rpx; background: var(--card); }
.ctrl-seg-on { background: #8a6d1b; }
.ctrl-seg-text { font-size: 22rpx; font-weight: 700; color: rgba(138, 109, 27, 0.7); }
.ctrl-seg-text-on { color: #fdf6e3; }

/* 流年步进 */
.stepper-row { display: flex; gap: 20rpx; }
.stepper {
  flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 12rpx;
  padding: 10rpx 16rpx; border-radius: 14rpx;
  border: 2rpx solid rgba(184, 134, 11, 0.25);
  background: var(--card);
}
.stepper-label { font-size: 22rpx; font-weight: 500; color: rgba(138, 109, 27, 0.8); }
.stepper-ctl { display: flex; align-items: center; gap: 8rpx; }
.stepper-btn {
  width: 48rpx; height: 48rpx; border-radius: 10rpx;
  background: rgba(184, 134, 11, 0.9);
  display: flex; align-items: center; justify-content: center;
}
.stepper-btn:active { background: #8a6d1b; }
.stepper-sign { font-size: 26rpx; font-weight: 700; color: #fdf6e3; line-height: 1; }
.stepper-val { width: 52rpx; text-align: center; font-size: 26rpx; font-weight: 700; color: var(--text-ink); }

/* 四页签 */
.tabs {
  margin: 8rpx 24rpx 0;
  display: flex; gap: 6rpx;
  padding: 6rpx; border-radius: 18rpx;
  background: rgba(0, 0, 0, 0.05);
}
.tab { flex: 1; padding: 16rpx 0; border-radius: 14rpx; text-align: center; }
.tab-on { background: var(--brand); box-shadow: 0 2rpx 8rpx rgba(196, 30, 58, 0.2); }
.tab-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.tab-text-on { color: #fff; font-weight: 700; }

/* 卡片内容（paper-card 已带外边距，此处补横向 margin） */
:deep(.paper-card) { margin: 0 24rpx; }

.card-head { display: flex; align-items: baseline; gap: 12rpx; flex-wrap: wrap; }
.card-title { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.card-title-center { display: block; text-align: center; }
.card-sub { font-size: 20rpx; color: var(--text-soft); }
.empty { font-size: 22rpx; color: var(--text-soft); }

/* 命盘详情 dl */
.dl { margin-top: 20rpx; display: flex; flex-direction: column; }
.dl-row {
  display: flex; gap: 12rpx; align-items: baseline;
  padding-bottom: 14rpx; margin-bottom: 14rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
}
.dl-row-last { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
.dt { flex-shrink: 0; font-size: 22rpx; color: var(--text-soft); }
.dt-bold { font-weight: 700; color: var(--text-ink); }
.dd { flex: 1; font-size: 22rpx; color: var(--text-ink); }
.dd-bold { font-family: $serif; font-weight: 700; letter-spacing: 2rpx; }

/* 大限排布 */
.dx-grid { margin-top: 16rpx; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10rpx 16rpx; }
.dx-item {
  display: flex; align-items: center; justify-content: space-between; gap: 8rpx;
  padding: 10rpx 14rpx; border-radius: 8rpx;
  background: rgba(0, 0, 0, 0.03);
}
.dx-house { font-size: 22rpx; font-weight: 500; color: var(--text-ink); }
.dx-zhi { font-size: 20rpx; color: var(--text-soft); margin-left: 6rpx; }
.dx-years { font-size: 20rpx; color: var(--text-soft); }

/* 化曜 */
.hy-grid { margin-top: 20rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.hy-item {
  display: flex; flex-direction: column; align-items: center;
  padding: 14rpx 0; border-radius: 12rpx;
  background: rgba(0, 0, 0, 0.04);
}
.hy-star { font-size: 26rpx; font-weight: 700; color: var(--text-ink); }
.hy-yao { font-size: 20rpx; color: var(--brand); margin-top: 4rpx; }
.hy-shishen { font-size: 20rpx; color: var(--text-soft); }
.hy-list { margin-top: 16rpx; display: flex; flex-direction: column; }
.hy-row {
  display: flex; align-items: center; justify-content: space-between; gap: 16rpx;
  padding-bottom: 12rpx; margin-bottom: 12rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
}
.hy-row:last-child { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
.hy-row-name { font-size: 22rpx; font-weight: 500; color: var(--text-ink); }
.hy-row-pos { font-size: 22rpx; color: var(--text-soft); }

/* 相位 */
.ms-row { display: flex; justify-content: space-between; gap: 16rpx; flex-wrap: wrap; }
.ms-text { font-size: 22rpx; font-weight: 700; color: var(--text-ink); }
.st-wrap { margin-top: 16rpx; }
.asp-list { margin-top: 16rpx; display: flex; flex-direction: column; }
.asp-row {
  display: flex; align-items: center; justify-content: space-between; gap: 16rpx;
  padding-bottom: 12rpx; margin-bottom: 12rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
}
.asp-row:last-child { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
.asp-pair { font-size: 22rpx; font-weight: 500; color: var(--text-ink); }
.asp-orb { font-size: 22rpx; color: var(--text-soft); }

/* 星格 */
.pat-cols { display: flex; gap: 24rpx; }
.pat-col { flex: 1; min-width: 0; }
.pat-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 14rpx; }
.pat-item { display: flex; flex-direction: column; gap: 4rpx; }
.pat-name { font-size: 22rpx; font-weight: 500; }
.pat-name-good { color: #15803d; }
.pat-name-bad { color: #dc2626; }
.pat-desc { font-size: 20rpx; line-height: 1.5; color: var(--text-soft); }

/* 盘面提要 */
.note-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 12rpx; }
.note-item { display: flex; align-items: flex-start; gap: 12rpx; }
.note-dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: var(--brand); margin-top: 12rpx; flex-shrink: 0; }
.note-text { flex: 1; font-size: 22rpx; line-height: 1.6; color: var(--text-soft); }

/* 方法说明 */
.method { padding: 0 32rpx; font-size: 20rpx; line-height: 1.7; color: rgba(138, 138, 138, 0.8); }
</style>
