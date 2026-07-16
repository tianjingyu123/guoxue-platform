<script setup lang="ts">
/**
 * 山向奇门结果页——自 V0 app/shanxiang/result/page.tsx 还原
 * onLoad 解析 payload（deg/y/name）本地重算 paiShanxiang：
 * 盘面信息表（山向/干支/黄泉/局 + 旬首值符值使空亡马星）+ 洛书九宫盘 + 白话总断 + 关联工具导流。
 * 取舍：AI 深断区块本批砍掉；V0 九宫 aspect-square 触 X5 红线（禁 aspect-ratio）改固定高度；
 *       排盘成功自动写入本地记录（key: rebu:shanxiang-history，以 ts 去重，上限 50）；
 *       R4 合规：小程序端标题改文化研究表述。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import ParamError from '@/components/paipan/param-error.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { paiShanxiang, type ShanxiangResult } from '@/pkg-paipan/lib/shanxiang-engine'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '山向奇门排盘'
// #ifdef MP-WEIXIN
hdrTitle = '山向文化研究'
// #endif

const HISTORY_KEY = 'rebu:shanxiang-history'

interface HistoryRecord {
  id: number
  name: string
  label: string
  dateText: string
  params: Record<string, unknown>
  createdAt: number
}

/* 展示序：4,9,2 / 3,5,7 / 8,1,6（洛书九宫） */
const GRID_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6]

const result = ref<ShanxiangResult | null>(null)
const custName = ref('')
const useYear = ref(new Date().getFullYear())
const invalid = ref(false)

onLoad((opts: Record<string, string> = {}) => {
  try {
    if (!opts.payload) throw new Error('missing payload')
    const p = JSON.parse(decodeURIComponent(opts.payload)) as Record<string, unknown>
    const deg = Number(p.deg)
    const year = Number(p.y)
    if (!Number.isFinite(deg) || !Number.isFinite(year)) throw new Error('invalid params')
    custName.value = p.name ? String(p.name) : ''
    useYear.value = year
    const r = paiShanxiang(deg, year)
    result.value = r
    saveRecord(Number(p.ts) || Date.now(), p, r)
  } catch {
    invalid.value = true
  }
})

/** 排盘记录自动留存（以 ts 去重，重开历史不重复写；上限 50） */
function saveRecord(id: number, params: Record<string, unknown>, r: ShanxiangResult) {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    const records = raw ? (JSON.parse(raw) as HistoryRecord[]) : []
    if (records.some((it) => it.id === id)) return
    records.unshift({
      id,
      name: custName.value,
      label: `${r.label} · ${r.ju.label}`,
      dateText: `${useYear.value}年用事 · 向${r.degree}°`,
      params,
      createdAt: Date.now(),
    })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(records.slice(0, 50)))
  } catch { /* 留存失败不影响排盘 */ }
}

interface CellVM {
  key: number
  palace: number
  center: boolean
  huangquan: boolean
  shen: string
  kong: boolean
  ma: boolean
  tian: string
  tianRed: boolean
  star: string
  di: string
  men: string
  menRed: boolean
  noR: boolean
  noB: boolean
}

/** 九宫格单元视图模型（星去「天」字、门去「门」字，同 V0） */
const cells = computed<CellVM[]>(() => {
  const r = result.value
  if (!r) return []
  return GRID_ORDER.map((palace, i) => {
    const p = r.chart.palaces[palace]
    return {
      key: palace,
      palace,
      center: palace === 5,
      huangquan: palace === r.huangquan.yaoPalace && palace !== 5,
      shen: p.shen,
      kong: p.kongWang,
      ma: p.maXing,
      tian: `${p.tianGan}${p.tianGan2 ?? ''}`,
      tianRed: p.isZhifu,
      star: `${p.star.replace('天', '')}${p.star2 ? p.star2.replace('天', '') : ''}`,
      di: p.diGan,
      men: p.men ? p.men.replace('门', '') : '',
      menRed: p.menPo,
      noR: i % 3 === 2,
      noB: i >= 6,
    }
  })
})

const xunshouText = computed(() => result.value?.chart.xunshou.name.slice(0, 2) ?? '')
</script>

<template>
  <view class="page">
    <tool-header
      :title="hdrTitle"
      back-href="/pkg-paipan/shanxiang/index"
      share
      :share-title="hdrTitle"
    />

    <!-- 参数无效 -->
    <param-error v-if="invalid" text="参数无效，请重新排盘" action-text="返回起盘" @action="navigateTo('/pkg-paipan/shanxiang/index')" />

    <scroll-view v-else-if="result" scroll-y class="body">
      <!-- 盘面信息表 -->
      <view class="info">
        <view v-if="custName" class="info-row">
          <text class="info-k">项目</text>
          <text class="info-v">{{ custName }}</text>
        </view>
        <view class="info-row">
          <text class="info-k">山向</text>
          <text class="info-v info-v-grow">{{ result.label }}　度数({{ result.degreeBand }})</text>
          <text class="info-v">{{ useYear }}年</text>
        </view>
        <view class="info-row">
          <text class="info-k">干支</text>
          <view class="info-gz">
            <text class="info-gz-serif">{{ result.yearGZ }}　</text>
            <text class="info-gz-serif info-gz-red">{{ result.useGZ }}</text>
            <text class="info-gz-extra">黄泉<text class="info-gz-b">{{ result.huangquan.label }}</text>　{{ result.ju.label }}</text>
          </view>
        </view>
        <view class="info-grid5">
          <text class="info-grid5-k">旬首</text>
          <text class="info-grid5-k">值符</text>
          <text class="info-grid5-k">值使</text>
          <text class="info-grid5-k">空亡</text>
          <text class="info-grid5-k">马星</text>
        </view>
        <view class="info-grid5 info-grid5-vals">
          <text class="info-grid5-v">{{ xunshouText }}</text>
          <text class="info-grid5-v">{{ result.chart.zhifu.star }}星</text>
          <text class="info-grid5-v">{{ result.chart.zhishi.men }}</text>
          <text class="info-grid5-v">{{ result.chart.xunshou.kong }}</text>
          <text class="info-grid5-v">{{ result.chart.maXing }}</text>
        </view>
      </view>

      <!-- 九宫盘 -->
      <view class="grid-wrap">
        <view class="grid">
          <view
            v-for="c in cells"
            :key="c.key"
            class="cell"
            :class="{ 'cell-no-r': c.noR, 'cell-no-b': c.noB, 'cell-hq': c.huangquan, 'cell-center': c.center }"
          >
            <template v-if="c.center">
              <text class="cell-center-tag">中宫</text>
              <text class="cell-center-gan">{{ c.di }}</text>
            </template>
            <template v-else>
              <view v-if="c.huangquan" class="hq-badge">
                <text class="hq-badge-text">黄泉</text>
              </view>
              <view class="cell-line">
                <text class="cell-shen">{{ c.shen }}</text>
                <view class="cell-marks">
                  <text v-if="c.kong" class="cell-kong">◎</text>
                  <text v-if="c.ma" class="cell-ma">马</text>
                </view>
              </view>
              <view class="cell-line">
                <text class="cell-serif" :class="{ 'cell-red': c.tianRed }">{{ c.tian }}</text>
                <text class="cell-star">{{ c.star }}</text>
              </view>
              <view class="cell-line">
                <text class="cell-serif">{{ c.di }}</text>
                <text class="cell-men" :class="{ 'cell-red': c.menRed }">{{ c.men }}</text>
              </view>
            </template>
          </view>
        </view>
        <text class="grid-legend">红字=值符干/门迫　◎=空亡　马=马星　红底=黄泉劫曜宫</text>
      </view>

      <!-- 白话总断 -->
      <view class="verdicts">
        <section-title title="白话总断" subtitle="盘面格局逐项释义" />
        <view
          v-for="v in result.plainVerdicts"
          :key="v.title"
          class="verdict-card"
        >
          <text class="verdict-title">{{ v.title }}</text>
          <text class="verdict-text">{{ v.text }}</text>
        </view>
      </view>

      <!-- 关联工具导流 -->
      <view class="links">
        <view class="link-btn" @tap="navigateTo('/pkg-paipan/qimen/index')">
          <app-icon name="qimen" :size="30" color="var(--text-ink)" />
          <text class="link-btn-text">时家奇门排盘</text>
        </view>
        <view class="link-btn" @tap="navigateTo('/pkg-paipan/xiaochengtu/index')">
          <app-icon name="xiaocheng" :size="30" color="var(--text-ink)" />
          <text class="link-btn-text">小成图排盘</text>
        </view>
      </view>

      <disclaimer
        variant="custom"
        tone="subtle"
        text="山向奇门为传统堪舆文化内容，结果仅供文化研究与参考，不构成任何决策建议。"
      />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; height: 0; }

/* 缺参空态样式已抽至 @/components/paipan/param-error.vue */

/* ── 盘面信息表 ── */
.info { background: var(--card); border-bottom: 1rpx solid var(--line); }
.info-row {
  display: flex; align-items: baseline; gap: 8rpx;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.info-k { width: 128rpx; flex-shrink: 0; font-size: 28rpx; color: var(--brand); }
.info-v { font-size: 28rpx; color: var(--text-ink); }
.info-v-grow { flex: 1; }
.info-gz { flex: 1; display: flex; align-items: baseline; flex-wrap: wrap; gap: 4rpx; }
.info-gz-serif {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx; color: var(--text-ink);
}
.info-gz-red { color: var(--brand); }
.info-gz-extra { margin-left: 24rpx; font-size: 26rpx; color: var(--text-ink); }
.info-gz-b { font-weight: 700; }
.info-grid5 {
  display: flex;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.info-grid5-k { width: 20%; text-align: center; font-size: 26rpx; color: var(--brand); }
.info-grid5-vals { border-bottom: none; }
.info-grid5-v {
  width: 20%; text-align: center;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx; color: var(--text-ink);
}

/* ── 九宫盘 ── */
.grid-wrap { padding: 32rpx; }
.grid {
  display: flex; flex-wrap: wrap;
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  overflow: hidden;
  background: var(--card);
}
.cell {
  position: relative;
  width: 33.3333%;
  height: 216rpx;
  box-sizing: border-box;
  padding: 14rpx 16rpx;
  border-right: 1rpx solid var(--line);
  border-bottom: 1rpx solid var(--line);
  display: flex; flex-direction: column; justify-content: space-between;
  background: var(--card);
}
.cell-no-r { border-right: none; }
.cell-no-b { border-bottom: none; }
.cell-hq { background: rgba(196, 30, 58, 0.08); }
.cell-center { align-items: center; justify-content: center; gap: 10rpx; background: rgba(0, 0, 0, 0.04); }
.cell-center-tag { font-size: 24rpx; color: var(--text-soft); }
.cell-center-gan {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx; color: var(--text-ink);
}
.hq-badge {
  position: absolute; right: 8rpx; top: 8rpx;
  padding: 0 8rpx; border-radius: 8rpx;
  background: var(--brand);
}
.hq-badge-text { font-size: 20rpx; line-height: 32rpx; color: #fff; }
.cell-line { display: flex; align-items: center; justify-content: space-between; }
.cell-shen { font-size: 24rpx; color: var(--text-soft); }
.cell-marks { display: flex; align-items: center; gap: 4rpx; }
.cell-kong { font-size: 20rpx; color: var(--text-soft); }
.cell-ma { font-size: 20rpx; color: var(--brand); }
.cell-serif {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx; color: var(--text-ink);
}
.cell-star { font-size: 28rpx; color: var(--text-ink); }
.cell-men { font-size: 28rpx; color: var(--text-ink); }
.cell-red { color: var(--brand); }
.grid-legend {
  display: block;
  margin-top: 16rpx;
  text-align: center;
  font-size: 24rpx; color: var(--text-soft);
}

/* ── 白话总断 ── */
.verdicts { padding: 0 32rpx 32rpx; display: flex; flex-direction: column; gap: 20rpx; }
.verdict-card {
  padding: 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid var(--line);
  background: var(--card);
  display: flex; flex-direction: column; gap: 8rpx;
}
.verdict-title { font-size: 28rpx; font-weight: 500; color: var(--brand); }
.verdict-text { font-size: 28rpx; line-height: 1.7; color: var(--text-ink); }

/* ── 导流 ── */
.links { display: flex; gap: 16rpx; padding: 0 32rpx 32rpx; }
.link-btn {
  flex: 1;
  display: flex; align-items: center; justify-content: center; gap: 10rpx;
  padding: 22rpx 0;
  border-radius: 16rpx;
  border: 1rpx solid var(--line);
  background: var(--card);
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.link-btn-text { font-size: 28rpx; color: var(--text-ink); }
</style>
