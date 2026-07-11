<script setup lang="ts">
/**
 * 奇门穿壬·结果页——自 V0 app/chuanren/result/page.tsx 还原
 * onLoad 解析 payload 本地重算：信息表 → 双盘（外圈十二支 + 内九宫）→ 四课三传 → 白话总断。
 * 取舍：AI 双盘深断区块本批砍掉；起课成功自动写入本地排盘记录（key: rebu:chuanren-history）。
 *       双盘外圈 V0 用 grid [auto_1fr_auto]，改嵌套 flex（角位留白 + 侧列纵排）等效还原。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  paiChuanren,
  OUTER_LAYOUT,
  SHENGXIAO,
  type ChuanrenResult,
  type Shengxiao,
} from '@/pkg-paipan/lib/chuanren-engine'
import type { QimenPalace } from '@/pkg-paipan/lib/qimen-engine'
import { saveChuanrenHistory, type ChuanrenParams } from './chuanren-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '奇门穿壬 · 盘面'
// #ifdef MP-WEIXIN
hdrTitle = '穿壬文化研究'
// #endif

/* 九宫展示序（洛书）：上 4 9 2 / 中 3 5 7 / 下 8 1 6 */
const GRID_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6]
const CHUAN_NAMES = ['初传', '中传', '末传']

// ─── 状态 ───
const q = ref<ChuanrenParams | null>(null)
const r = ref<ChuanrenResult | null>(null)
const invalid = ref(false)

function pad(n: number) { return String(n).padStart(2, '0') }

onLoad((opts: Record<string, string> = {}) => {
  try {
    if (!opts.payload) throw new Error('missing payload')
    const p = JSON.parse(decodeURIComponent(opts.payload)) as Record<string, unknown>
    const params: ChuanrenParams = {
      topic: String(p.topic ?? ''),
      year: Number(p.year), month: Number(p.month), day: Number(p.day),
      hour: Number(p.hour) || 0, minute: Number(p.minute) || 0,
      ys: p.ys === 'month' ? 'month' : p.ys === 'custom' ? 'custom' : 'day',
      cys: p.cys === undefined ? undefined : String(p.cys),
      gr: p.gr === 'yang' ? 'yang' : p.gr === 'yin' ? 'yin' : 'auto',
      nm: p.nm === undefined ? undefined : String(p.nm),
    }
    const d = new Date(params.year, params.month - 1, params.day, params.hour, params.minute)
    if (Number.isNaN(d.getTime()) || !params.year) throw new Error('bad date')
    const nianming = params.nm && (SHENGXIAO as readonly string[]).includes(params.nm)
      ? (params.nm as Shengxiao)
      : undefined
    const res = paiChuanren({
      date: d,
      yongshenType: params.ys,
      customYongshen: params.cys,
      guiren: params.gr,
      nianming,
      topic: params.topic || undefined,
    })
    r.value = res
    q.value = params
    saveChuanrenHistory(
      params,
      `${res.qimen.ju.label} · ${res.liuren.yuejiang.zhi}将${res.liuren.sizhu.hour.zhi}时`,
    )
  } catch {
    invalid.value = true
  }
})

// ─── 派生展示 ───
const infoRows = computed<[string, string][]>(() => {
  const res = r.value
  const p = q.value
  if (!res || !p) return []
  const { qimen, liuren } = res
  return [
    ['日期', `${p.year}年${pad(p.month)}月${pad(p.day)}日 ${pad(p.hour)}:${pad(p.minute)}（${liuren.lunarText}）`],
    ['局数', qimen.ju.label],
    ['值符 / 值使', `${qimen.zhifu.star}${qimen.zhifu.palace}宫 / ${qimen.zhishi.men}${qimen.zhishi.palace}宫`],
    ['旬首 / 空亡 / 马星', `${qimen.xunshou.name} / ${qimen.xunshou.kong} / ${qimen.maXing}`],
    ['月将 / 贵人', `${liuren.yuejiang.zhi}（${liuren.yuejiang.name}）/ ${res.guirenLabel}临${liuren.guiren.zhi}`],
    ['用神 / 年命', `${res.yongshen}${res.nianming ? ` / ${res.nianming}` : ' / —'}`],
  ]
})

const pillarCols = computed(() => {
  const res = r.value
  if (!res) return []
  const s = res.liuren.sizhu
  return [
    { label: '年柱', gan: s.year.gan, zhi: s.year.zhi },
    { label: '月柱', gan: s.month.gan, zhi: s.month.zhi },
    { label: '日柱', gan: s.day.gan, zhi: s.day.zhi },
    { label: '时柱', gan: s.hour.gan, zhi: s.hour.zhi },
  ]
})

/** 四课传统自右向左（V0 flex-row-reverse 等效：四三二一） */
const sikeCols = computed(() => {
  const res = r.value
  if (!res) return []
  return [...res.liuren.sike].reverse()
})

/** 天盘干着色：击刑紫 / 入墓黄 */
function ganCls(p: QimenPalace, g: string): string {
  if (!g) return ''
  if (p.jiXing.includes(g)) return 'g-xing'
  if (p.ruMu.includes(g)) return 'g-mu'
  return ''
}

/** 分享：复制盘面文字摘要 */
function onShare() {
  const res = r.value
  if (!res) return
  uni.setClipboardData({
    data: `【奇门穿壬】\n${res.summary}\n—— 来自热卜 · 专业排盘工具`,
    success: () => uni.showToast({ title: '盘面摘要已复制', icon: 'none' }),
  })
}

function goInput() {
  navigateTo('/pkg-paipan/chuanren/index')
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" back-href="/pkg-paipan/chuanren/index" @share="onShare" />

    <!-- 参数错误态 -->
    <view v-if="invalid" class="status">
      <app-icon name="info" :size="64" color="#d1d5db" />
      <text class="status-text">参数无效，请重新排盘。</text>
      <view class="status-btn" @tap="goInput"><text class="status-btn-text">返回奇门穿壬</text></view>
    </view>

    <scroll-view v-else-if="r" scroll-y class="body">
      <view class="body-inner">
        <!-- ── 信息表 ── -->
        <view class="card tbl">
          <view v-for="(row, i) in infoRows" :key="row[0]" class="tr" :class="{ 'tr-bd': i < infoRows.length - 1 }">
            <view class="th-cell"><text class="th-text">{{ row[0] }}</text></view>
            <view class="td"><text class="td-text">{{ row[1] }}</text></view>
          </view>
          <view class="pillar-row">
            <view v-for="(p, i) in pillarCols" :key="p.label" class="pillar-col" :class="{ 'pillar-col-bd': i < 3 }">
              <text class="pillar-gz">{{ p.gan }}</text>
              <text class="pillar-gz">{{ p.zhi }}</text>
              <text class="pillar-label">{{ p.label }}</text>
            </view>
          </view>
        </view>
        <view class="legend">
          <text class="legend-text">
            颜色说明：<text class="g-mu">入墓</text>、<text class="g-xing">击刑</text>、<text class="men-po">门迫</text>、◎空亡、<text class="g-mu">贵人</text>、<text class="ma-red">马星</text>
          </text>
        </view>

        <!-- ── 双盘：外圈十二支 + 内九宫 ── -->
        <view class="card board">
          <!-- 顶行 -->
          <view class="board-row">
            <view class="corner" />
            <view class="outer-h-group">
              <view v-for="z in OUTER_LAYOUT.top" :key="z" class="outer-cell outer-h">
                <text class="oc-dun">{{ r.outer[z].dunGan }}</text>
                <text class="oc-jiang" :class="{ 'oc-jiang-gui': r.outer[z].gui }">{{ r.outer[z].jiang }}</text>
                <text class="oc-zhi" :class="{ 'oc-zhi-kong': r.outer[z].kong }">{{ r.outer[z].zhi }}</text>
                <text class="oc-jc">{{ r.outer[z].jianChu }}</text>
                <text class="oc-house">{{ r.outer[z].house }}</text>
                <text v-if="r.outer[z].ma" class="oc-ma">马</text>
              </view>
            </view>
            <view class="corner" />
          </view>

          <!-- 中段：左列 + 九宫 + 右列 -->
          <view class="board-mid">
            <view class="outer-v-group">
              <view v-for="z in OUTER_LAYOUT.left" :key="z" class="outer-cell outer-v">
                <text class="oc-dun">{{ r.outer[z].dunGan }}</text>
                <text class="oc-jiang" :class="{ 'oc-jiang-gui': r.outer[z].gui }">{{ r.outer[z].jiang }}</text>
                <text class="oc-zhi" :class="{ 'oc-zhi-kong': r.outer[z].kong }">{{ r.outer[z].zhi }}</text>
                <text class="oc-jc">{{ r.outer[z].jianChu }}</text>
                <text class="oc-house">{{ r.outer[z].house }}</text>
                <text v-if="r.outer[z].ma" class="oc-ma">马</text>
              </view>
            </view>

            <view class="pan">
              <view
                v-for="n in GRID_ORDER"
                :key="n"
                class="pcell"
                :class="{ 'pcell-zhifu': r.qimen.palaces[n].isZhifu }"
              >
                <template v-if="n === 5">
                  <text class="pcell-mid-mark">中</text>
                </template>
                <template v-else>
                  <view class="pline">
                    <text class="p-shen">{{ r.qimen.palaces[n].shen }}</text>
                    <view class="p-flags">
                      <text v-if="r.qimen.palaces[n].maXing" class="ma-red">马</text>
                      <view v-if="r.qimen.palaces[n].kongWang" class="kong-ring" />
                    </view>
                  </view>
                  <view class="pline">
                    <view class="p-gans">
                      <text class="p-gan" :class="ganCls(r.qimen.palaces[n], r.qimen.palaces[n].tianGan)">{{ r.qimen.palaces[n].tianGan }}</text>
                      <text
                        v-if="r.qimen.palaces[n].tianGan2"
                        class="p-gan"
                        :class="ganCls(r.qimen.palaces[n], r.qimen.palaces[n].tianGan2 || '')"
                      >{{ r.qimen.palaces[n].tianGan2 }}</text>
                    </view>
                    <text class="p-star" :class="{ 'p-star-zhifu': r.qimen.palaces[n].isZhifu }">
                      {{ r.qimen.palaces[n].star.replace('天', '') }}{{ r.qimen.palaces[n].star2 ? '禽' : '' }}
                    </text>
                  </view>
                  <view class="pline">
                    <text class="p-gan" :class="ganCls(r.qimen.palaces[n], r.qimen.palaces[n].diGan)">{{ r.qimen.palaces[n].diGan }}</text>
                    <text
                      class="p-men"
                      :class="{ 'men-po': r.qimen.palaces[n].menPo, 'p-men-zhishi': !r.qimen.palaces[n].menPo && r.qimen.palaces[n].isZhishi }"
                    >{{ r.qimen.palaces[n].men.replace('门', '') }}</text>
                  </view>
                </template>
              </view>
            </view>

            <view class="outer-v-group">
              <view v-for="z in OUTER_LAYOUT.right" :key="z" class="outer-cell outer-v">
                <text class="oc-dun">{{ r.outer[z].dunGan }}</text>
                <text class="oc-jiang" :class="{ 'oc-jiang-gui': r.outer[z].gui }">{{ r.outer[z].jiang }}</text>
                <text class="oc-zhi" :class="{ 'oc-zhi-kong': r.outer[z].kong }">{{ r.outer[z].zhi }}</text>
                <text class="oc-jc">{{ r.outer[z].jianChu }}</text>
                <text class="oc-house">{{ r.outer[z].house }}</text>
                <text v-if="r.outer[z].ma" class="oc-ma">马</text>
              </view>
            </view>
          </view>

          <!-- 底行 -->
          <view class="board-row">
            <view class="corner" />
            <view class="outer-h-group">
              <view v-for="z in OUTER_LAYOUT.bottom" :key="z" class="outer-cell outer-h">
                <text class="oc-dun">{{ r.outer[z].dunGan }}</text>
                <text class="oc-jiang" :class="{ 'oc-jiang-gui': r.outer[z].gui }">{{ r.outer[z].jiang }}</text>
                <text class="oc-zhi" :class="{ 'oc-zhi-kong': r.outer[z].kong }">{{ r.outer[z].zhi }}</text>
                <text class="oc-jc">{{ r.outer[z].jianChu }}</text>
                <text class="oc-house">{{ r.outer[z].house }}</text>
                <text v-if="r.outer[z].ma" class="oc-ma">马</text>
              </view>
            </view>
            <view class="corner" />
          </view>
        </view>
        <text class="board-note">外圈：遁干 · 天将 · 地支 · 建除 · 十二宫 ｜ 内盘：八神 · 天盘干 · 九星 · 地盘干 · 八门</text>

        <!-- ── 四课三传 ── -->
        <view class="sec">
          <text class="sec-title">四课三传</text>
          <view class="sike-sanchuan">
            <view class="card half-card">
              <text class="half-title">四课（自右向左）</text>
              <view class="sike-row">
                <view v-for="(k, i) in sikeCols" :key="i" class="sike-col">
                  <text class="sike-shang">{{ k.shang }}</text>
                  <text class="sike-xia">{{ k.xia }}</text>
                </view>
              </view>
            </view>
            <view class="card half-card">
              <text class="half-title">三传（{{ r.liuren.keti.join('、') }}）</text>
              <view class="chuan-list">
                <view v-for="(c, i) in r.liuren.sanchuan" :key="i" class="chuan-row">
                  <text class="chuan-name">{{ CHUAN_NAMES[i] }}</text>
                  <text class="chuan-zhi">{{ c.zhi }}{{ c.kong ? '◎' : '' }}</text>
                  <text class="chuan-qin">{{ c.qin }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- ── 白话总断 ── -->
        <view class="sec">
          <text class="sec-title">白话总断</text>
          <view class="verdicts">
            <view v-for="v in r.verdicts" :key="v.title" class="card verdict-card">
              <text class="verdict-title">{{ v.title }}</text>
              <text class="verdict-text">{{ v.text }}</text>
            </view>
          </view>
        </view>

        <!-- 交叉跳转 -->
        <view class="cross-links">
          <view class="cross-btn" @tap="goInput">
            <text class="cross-btn-text">再排一盘</text>
          </view>
          <view class="cross-btn" @tap="navigateTo('/pkg-paipan/qimen/index')">
            <text class="cross-btn-text">奇门遁甲</text>
          </view>
          <view class="cross-btn" @tap="navigateTo('/pkg-paipan/daliuren/index')">
            <text class="cross-btn-text">大六壬</text>
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="奇门穿壬为传统术数文化内容，断语仅供文化研究与参考，不构成任何决策建议。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 24rpx 48rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* 错误态 */
.status { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 80rpx 40rpx; }
.status-text { font-size: 28rpx; color: var(--text-soft); }
.status-btn { padding: 20rpx 56rpx; background: var(--brand); border-radius: 20rpx; }
.status-btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }

/* 通用卡片 */
.card {
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 20rpx;
  overflow: hidden;
}

/* 语义色 */
.g-xing { color: #c026d3; }
.g-mu { color: #d97706; }
.men-po { color: #dc2626; font-weight: 500; }
.ma-red { color: #ef4444; font-weight: 500; }

/* ── 信息表 ── */
.tr { display: flex; align-items: stretch; }
.tr-bd { border-bottom: 1rpx solid var(--line); }
.th-cell {
  width: 256rpx; flex-shrink: 0;
  padding: 16rpx 24rpx;
  background: rgba(0, 0, 0, 0.03);
  display: flex; align-items: center;
}
.th-text { font-size: 24rpx; color: var(--text-soft); }
.td { flex: 1; min-width: 0; padding: 16rpx 24rpx; display: flex; align-items: center; }
.td-text { font-size: 26rpx; color: var(--text-ink); line-height: 1.6; }
.pillar-row { display: flex; border-top: 1rpx solid var(--line); }
.pillar-col {
  flex: 1;
  padding: 16rpx 0;
  display: flex; flex-direction: column; align-items: center; gap: 2rpx;
}
.pillar-col-bd { border-right: 1rpx solid var(--line); }
.pillar-gz { font-family: $serif; font-size: 32rpx; font-weight: 700; line-height: 1.3; color: var(--text-ink); }
.pillar-label { margin-top: 4rpx; font-size: 20rpx; color: var(--text-soft); }
.legend { margin-top: -8rpx; }
.legend-text { font-size: 22rpx; line-height: 1.6; color: var(--text-soft); }

/* ── 双盘 ── */
.board { padding: 16rpx; display: flex; flex-direction: column; gap: 8rpx; box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04); }
.board-row { display: flex; gap: 8rpx; }
.corner { width: 56rpx; flex-shrink: 0; }
.outer-h-group { flex: 1; display: flex; gap: 8rpx; }
.board-mid { display: flex; gap: 8rpx; align-items: stretch; }
.outer-v-group { width: 56rpx; flex-shrink: 0; display: flex; flex-direction: column; gap: 8rpx; }

/* 外圈格 */
.outer-cell {
  border: 1rpx solid var(--line);
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12rpx;
  display: flex; align-items: center; justify-content: center;
}
.outer-h { flex: 1; height: 56rpx; flex-direction: row; gap: 8rpx; padding: 0 8rpx; }
.outer-v { flex: 1; flex-direction: column; gap: 2rpx; padding: 8rpx 0; }
.oc-dun { font-size: 20rpx; line-height: 1.2; color: var(--text-soft); }
.oc-jiang { font-size: 20rpx; line-height: 1.2; color: var(--brand); }
.oc-jiang-gui { color: #d97706; font-weight: 500; }
.oc-zhi { font-family: $serif; font-size: 24rpx; line-height: 1.2; font-weight: 700; color: var(--text-ink); }
.oc-zhi-kong { color: var(--text-soft); opacity: 0.7; }
.oc-jc { font-size: 20rpx; line-height: 1.2; color: var(--wuxing-wood); }
.oc-house { font-size: 20rpx; line-height: 1.2; color: var(--wuxing-water); }
.oc-ma { font-size: 20rpx; line-height: 1.2; color: #ef4444; }

/* 内九宫 */
.pan {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rpx;
  background: var(--line);
  border: 1rpx solid var(--line);
}
.pcell {
  min-height: 192rpx;
  background: var(--card);
  padding: 10rpx 12rpx;
  display: flex; flex-direction: column; justify-content: space-between;
}
.pcell-zhifu { background: rgba(196, 30, 58, 0.05); }
.pcell-mid-mark { margin: auto; font-size: 24rpx; color: rgba(153, 153, 153, 0.5); }
.pline { display: flex; align-items: center; justify-content: space-between; gap: 4rpx; }
.p-shen { font-size: 22rpx; color: var(--text-soft); }
.p-flags { display: flex; align-items: center; gap: 6rpx; font-size: 22rpx; }
.kong-ring {
  width: 24rpx; height: 24rpx; flex-shrink: 0;
  border-radius: 50%;
  border: 3rpx solid rgba(0, 0, 0, 0.5);
}
.p-gans { display: flex; align-items: center; }
.p-gan { font-size: 26rpx; color: var(--text-ink); }
.p-star { font-size: 24rpx; color: var(--text-ink); }
.p-star-zhifu { color: var(--brand); font-weight: 500; }
.p-men { font-size: 24rpx; color: var(--text-ink); }
.p-men-zhishi { color: var(--brand); font-weight: 500; }
.board-note { display: block; margin-top: -8rpx; text-align: center; font-size: 22rpx; line-height: 1.6; color: var(--text-soft); }

/* ── 四课三传 ── */
.sec { display: flex; flex-direction: column; gap: 16rpx; }
.sec-title { font-family: $serif; font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.sike-sanchuan { display: flex; gap: 20rpx; }
.half-card { flex: 1; min-width: 0; padding: 20rpx 24rpx; }
.half-title { display: block; font-size: 22rpx; color: var(--text-soft); }
.sike-row { margin-top: 16rpx; display: flex; }
.sike-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.sike-shang { font-family: $serif; font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.sike-xia { font-family: $serif; font-size: 26rpx; color: var(--text-soft); }
.chuan-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 8rpx; }
.chuan-row { display: flex; align-items: center; gap: 12rpx; }
.chuan-name { width: 72rpx; flex-shrink: 0; font-size: 22rpx; color: var(--text-soft); }
.chuan-zhi { font-family: $serif; font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.chuan-qin { font-size: 22rpx; color: var(--text-soft); }

/* ── 白话总断 ── */
.verdicts { display: flex; flex-direction: column; gap: 16rpx; }
.verdict-card { padding: 24rpx; display: flex; flex-direction: column; gap: 8rpx; }
.verdict-title { font-size: 26rpx; font-weight: 500; color: var(--brand); }
.verdict-text { font-size: 26rpx; line-height: 1.7; color: var(--text-ink); }

/* 交叉跳转 */
.cross-links { display: flex; justify-content: center; gap: 48rpx; padding: 8rpx 0; }
.cross-btn { padding: 8rpx 16rpx; &:active { opacity: 0.7; } }
.cross-btn-text { font-size: 28rpx; color: var(--brand); }
</style>
