<script setup lang="ts">
/**
 * 小成图结果页——自 V0 app/xiaochengtu/result/page.tsx 还原
 * onLoad 解析 payload（起卦输入）本地重算 paiXiaoChengTu：
 * 盘面信息表（卦式/日期/节气/四柱/空亡/神煞）+ 本卦变卦 + 九宫格（点选看象意）+ 起卦算式 + 白话总断。
 * 取舍：AI 深断区块本批砍掉；升降箭头由 lucide 图标改「↑/↓」文字符号（图标库无 arrow-down）；
 *       V0 九宫 aspect-square 触 X5 红线（禁 aspect-ratio）改固定高度；动爻 ring 改 box-shadow 红晕；
 *       底部关联工具 V0 为梅花易数/六爻排盘，六爻页未注册路由，改为梅花易数/金钱课；
 *       排盘成功自动写入本地记录（key: rebu:xiaochengtu-history，以起卦时 ts 去重）。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import ParamError from '@/components/paipan/param-error.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import HexFigure from './components/hex-figure.vue'
import TriFigure from './components/tri-figure.vue'
import { navigateTo } from '@/utils/router'
import {
  paiXiaoChengTu,
  type XctResult,
  type XctPalace,
  type XctCastMethod,
} from '../lib/xiaochengtu-engine'

const HISTORY_KEY = 'rebu:xiaochengtu-history'

interface HistoryRecord {
  id: number
  matter: string
  dateText: string
  guaText: string
  params: Record<string, unknown>
  createdAt: number
}

/** 卦气升降：乾震艮离主升（口径同引擎） */
const RISING = new Set(['乾', '震', '艮', '离'])

/** 干支五行配色（全局 --wuxing-* token） */
const GZ_COLOR: Record<string, string> = {
  甲: 'var(--wuxing-wood)', 乙: 'var(--wuxing-wood)', 寅: 'var(--wuxing-wood)', 卯: 'var(--wuxing-wood)',
  丙: 'var(--wuxing-fire)', 丁: 'var(--wuxing-fire)', 巳: 'var(--wuxing-fire)', 午: 'var(--wuxing-fire)',
  戊: 'var(--wuxing-earth)', 己: 'var(--wuxing-earth)', 辰: 'var(--wuxing-earth)', 戌: 'var(--wuxing-earth)', 丑: 'var(--wuxing-earth)', 未: 'var(--wuxing-earth)',
  庚: 'var(--wuxing-metal)', 辛: 'var(--wuxing-metal)', 申: 'var(--wuxing-metal)', 酉: 'var(--wuxing-metal)',
  壬: 'var(--wuxing-water)', 癸: 'var(--wuxing-water)', 亥: 'var(--wuxing-water)', 子: 'var(--wuxing-water)',
}
function gzColor(ch: string) { return GZ_COLOR[ch] || 'var(--text-ink)' }

/** 四式白话（同 V0 文案） */
const PATTERN_NOTE: Record<string, string> = {
  向心式: '天降地升、二气相交，气聚于内，主事有归拢可成之象。',
  离心式: '天升地降、二气相背，气散于外，主事有分离变动之象。',
  外引式: '天地皆升，其气外发，主事向外拓展、宜主动出击。',
  内引式: '天地皆降，其气内敛，主事宜收敛守成、静待时机。',
}

const result = ref<XctResult | null>(null)
const invalid = ref(false)
const selected = ref(3)

onLoad((opts: Record<string, string> = {}) => {
  try {
    if (!opts.payload) throw new Error('missing payload')
    const p = JSON.parse(decodeURIComponent(opts.payload)) as Record<string, unknown>
    const d = new Date(
      Number(p.year), Number(p.month) - 1, Number(p.day),
      Number(p.hour) || 0, Number(p.minute) || 0,
    )
    if (Number.isNaN(d.getTime())) throw new Error('invalid date')
    const linesStr = typeof p.lines === 'string' && /^[01]{6}$/.test(p.lines) ? p.lines : ''
    const r = paiXiaoChengTu({
      date: d,
      method: String(p.m ?? 'time') as XctCastMethod,
      zhonggong: p.zg === 'zhengyu' ? 'zhengyu' : 'sizheng',
      topic: p.topic ? String(p.topic) : undefined,
      upper: p.u !== undefined ? Number(p.u) : undefined,
      lower: p.l !== undefined ? Number(p.l) : undefined,
      dong: p.dong !== undefined ? Number(p.dong) : undefined,
      lines: linesStr ? linesStr.split('').map((c) => c === '1') : undefined,
      num1: p.n1 !== undefined ? Number(p.n1) : undefined,
      num2: p.n2 !== undefined ? Number(p.n2) : undefined,
      num3: p.n3 !== undefined ? Number(p.n3) : undefined,
    })
    result.value = r
    saveRecord(Number(p.ts) || Date.now(), p, r)
  } catch {
    invalid.value = true
  }
})

/** 排盘记录自动留存（以起卦 ts 去重，重开历史不重复写） */
function saveRecord(id: number, params: Record<string, unknown>, r: XctResult) {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    const records = raw ? (JSON.parse(raw) as HistoryRecord[]) : []
    if (records.some((it) => it.id === id)) return
    records.unshift({
      id,
      matter: r.topic || '未命名事项',
      dateText: r.dateLabel,
      guaText: `${r.benGua.name} 之 ${r.bianGua.name}`,
      params,
      createdAt: Date.now(),
    })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(records.slice(0, 100)))
  } catch { /* 留存失败不影响排盘 */ }
}

const sel = computed<XctPalace | null>(() => {
  const r = result.value
  if (!r) return null
  return r.palaces.find((p) => p.luoshu === selected.value) ?? r.palaces[4]
})

const pillarList = computed(() => {
  const r = result.value
  if (!r) return []
  return [r.pillars.year, r.pillars.month, r.pillars.day, r.pillars.time]
})

const kongWangText = computed(() => {
  const r = result.value
  if (!r) return ''
  return `${r.kongWang.year}、${r.kongWang.month}、${r.kongWang.day}、${r.kongWang.time}`
})

const shenShaText = computed(() => {
  const r = result.value
  if (!r) return ''
  return r.shenSha.map((s) => `${s.name}--${s.zhi}`).join('、')
})

function isRising(gua: string) { return RISING.has(gua) }
</script>

<template>
  <view class="page">
    <tool-header
      title="小成图排盘"
      back-href="/pkg-paipan/xiaochengtu/index"
      share
      share-title="小成图排盘"
    />

    <!-- 参数无效 -->
    <param-error v-if="invalid" text="参数无效，请重新起卦" action-text="返回起卦" @action="navigateTo('/pkg-paipan/xiaochengtu/index')" />

    <scroll-view
      v-else-if="result && sel"
      scroll-y
      class="body"
    >
      <view class="inner">
        <!-- 盘面信息表 -->
        <paper-card padding="none">
          <view class="info">
            <view
              v-if="result.topic"
              class="irow"
            >
              <text class="ilabel">
                事项
              </text>
              <view class="ival">
                <text class="ival-text">
                  {{ result.topic }}
                </text>
              </view>
            </view>
            <view class="irow">
              <text class="ilabel">
                卦式
              </text>
              <view class="ival">
                <text class="ival-text">
                  【{{ result.methodLabel }}】【{{ result.zhonggongLabel }}】
                </text>
              </view>
            </view>
            <view class="irow">
              <text class="ilabel">
                日期
              </text>
              <view class="ival">
                <text class="ival-text">
                  {{ result.dateLabel }}（{{ result.lunarLabel }}）
                </text>
              </view>
            </view>
            <view class="irow">
              <text class="ilabel">
                节气
              </text>
              <view class="ival">
                <text class="ival-text ival-xs">
                  {{ result.jieqiRange }}
                </text>
              </view>
            </view>
            <view class="irow">
              <text class="ilabel">
                四柱
              </text>
              <view class="ival ival-pillars">
                <view
                  v-for="(gz, i) in pillarList"
                  :key="i"
                  class="gz"
                >
                  <text
                    class="gz-ch"
                    :style="{ color: gzColor(gz[0]) }"
                  >
                    {{ gz[0] }}
                  </text>
                  <text
                    class="gz-ch"
                    :style="{ color: gzColor(gz[1]) }"
                  >
                    {{ gz[1] }}
                  </text>
                </view>
              </view>
            </view>
            <view class="irow">
              <text class="ilabel">
                空亡
              </text>
              <view class="ival">
                <text class="ival-text ival-xs ival-soft">
                  {{ kongWangText }}
                </text>
              </view>
            </view>
            <view class="irow irow-last">
              <text class="ilabel">
                神煞
              </text>
              <view class="ival">
                <text class="ival-text ival-xs">
                  {{ shenShaText }}
                </text>
              </view>
            </view>
          </view>
        </paper-card>

        <!-- 本卦 / 变卦 -->
        <paper-card padding="md">
          <view class="guas">
            <view class="gua-col">
              <view class="gua-figure">
                <hex-figure
                  :lines="result.benGua.lines"
                  :dong="result.dongYao"
                />
                <view class="gua-arrs">
                  <text
                    class="arr"
                    :class="isRising(result.benGua.upper) ? 'arr-up' : 'arr-down'"
                  >
                    {{ isRising(result.benGua.upper) ? '↑' : '↓' }}
                  </text>
                  <text
                    class="arr"
                    :class="isRising(result.benGua.lower) ? 'arr-up' : 'arr-down'"
                  >
                    {{ isRising(result.benGua.lower) ? '↑' : '↓' }}
                  </text>
                </view>
              </view>
              <text class="gua-name">
                本卦 {{ result.benGua.name }}
              </text>
            </view>
            <view class="gua-col">
              <view class="gua-figure">
                <hex-figure :lines="result.bianGua.lines" />
                <view class="gua-arrs">
                  <text
                    class="arr"
                    :class="isRising(result.bianGua.upper) ? 'arr-up' : 'arr-down'"
                  >
                    {{ isRising(result.bianGua.upper) ? '↑' : '↓' }}
                  </text>
                  <text
                    class="arr"
                    :class="isRising(result.bianGua.lower) ? 'arr-up' : 'arr-down'"
                  >
                    {{ isRising(result.bianGua.lower) ? '↑' : '↓' }}
                  </text>
                </view>
              </view>
              <text class="gua-name">
                变卦 {{ result.bianGua.name }}
              </text>
            </view>
          </view>
          <text class="guas-tip">
            {{ result.dongYao }}爻动（红色标注）
          </text>
        </paper-card>

        <!-- 九宫格 -->
        <paper-card padding="sm">
          <view class="grid">
            <view
              v-for="p in result.palaces"
              :key="p.luoshu"
              class="cell"
              :class="{ 'cell-on': p.luoshu === selected }"
              @tap="selected = p.luoshu"
            >
              <view class="cell-main">
                <tri-figure :gua="p.tianGua" />
                <view class="cell-arrs">
                  <text
                    class="arr arr-sm"
                    :class="p.tianRising ? 'arr-up' : 'arr-down'"
                  >
                    {{ p.tianRising ? '↑' : '↓' }}
                  </text>
                  <text
                    v-if="p.luoshu !== 5"
                    class="arr arr-sm"
                    :class="p.diRising ? 'arr-up' : 'arr-down'"
                  >
                    {{ p.diRising ? '↑' : '↓' }}
                  </text>
                </view>
              </view>
              <text class="cell-label">
                {{ p.luoshu === 5 ? '中宫' : `${p.diGua}${p.luoshu}` }}
              </text>
            </view>
          </view>
          <text class="grid-tip">
            点击宫位查看象意信息
          </text>
        </paper-card>

        <!-- 宫位象意 -->
        <paper-card padding="md">
          <template v-if="sel.luoshu === 5">
            <view class="sense-p">
              <text class="sense-strong">
                中宫（{{ sel.source }}）
              </text>
              <text class="sense-text">
                ：归藏得{{ sel.tianGua }}卦，卦气主{{ sel.tianRising ? '升' : '降' }}。取数：{{ sel.numbers }}。
              </text>
            </view>
            <view class="sense-p">
              <text class="sense-text">
                {{ sel.guaci }}
              </text>
            </view>
          </template>
          <template v-else>
            <view class="sense-p">
              <text class="sense-strong">
                {{ sel.diGua }}{{ sel.luoshu }}宫
              </text>
              <text class="sense-text">
                ：先天宫为{{ sel.xiantianGong }}宫。取数：{{ sel.numbers }}。地支：{{ sel.dizhi }}。
              </text>
            </view>
            <view class="sense-p">
              <text class="sense-strong">
                {{ sel.hexName }}
              </text>
              <text class="sense-text">
                ：{{ sel.guaci }}
              </text>
            </view>
            <view class="sense-p">
              <text class="sense-gold">
                {{ sel.pattern }}
              </text>
              <text class="sense-text">
                ：{{ sel.source }}{{ sel.tianGua }}（{{ sel.tianRising ? '升' : '降' }}）临地盘{{ sel.diGua }}（{{ sel.diRising ? '升' : '降' }}），{{ PATTERN_NOTE[sel.pattern] || '' }}
              </text>
            </view>
          </template>
        </paper-card>

        <!-- 起卦算式 -->
        <paper-card padding="md">
          <section-title title="起卦算式" />
          <view class="detail-lines">
            <text
              v-for="(line, i) in result.castDetail"
              :key="i"
              class="detail-line"
            >
              {{ line }}
            </text>
          </view>
        </paper-card>

        <!-- 白话总断 -->
        <paper-card padding="md">
          <section-title title="白话总断" />
          <view class="summary-lines">
            <text
              v-for="(line, i) in result.summary"
              :key="i"
              class="summary-line"
            >
              {{ line }}
            </text>
          </view>
        </paper-card>

        <!-- 关联工具 -->
        <view class="links">
          <view
            class="link-btn"
            @tap="navigateTo('/pkg-paipan/meihua/index')"
          >
            <text class="link-btn-text">
              梅花易数
            </text>
          </view>
          <view
            class="link-btn"
            @tap="navigateTo('/pkg-paipan/jinqianke/index')"
          >
            <text class="link-btn-text">
              金钱课
            </text>
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="小成图为传统术数文化内容，结果仅供文化研究与参考，不构成任何决策建议。"
        />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; height: 0; }
.inner { padding: 24rpx 32rpx 96rpx; display: flex; flex-direction: column; gap: 28rpx; }

/* 缺参空态样式已抽至 @/components/paipan/param-error.vue */

/* ── 盘面信息表 ── */
.info { border-radius: 24rpx; overflow: hidden; }
.irow { display: flex; border-bottom: 1rpx solid var(--line); }
.irow-last { border-bottom: none; }
.ilabel {
  width: 128rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 20rpx 0;
  border-right: 1rpx solid var(--line);
  font-size: 24rpx; font-weight: 700; color: var(--gold, #8a6d3b);
}
.ival { flex: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; min-width: 0; }
.ival-text { font-size: 28rpx; line-height: 1.6; color: var(--text-ink); }
.ival-xs { font-size: 24rpx; }
.ival-soft { color: var(--text-soft); }
.ival-pillars { gap: 28rpx; }
.gz { display: flex; flex-direction: column; align-items: center; }
.gz-ch {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 32rpx; font-weight: 700; line-height: 1.25;
}

/* ── 本卦 / 变卦 ── */
.guas { display: flex; justify-content: space-around; }
.gua-col { display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.gua-figure { display: flex; align-items: center; gap: 24rpx; }
.gua-arrs { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.gua-name {
  font-size: 28rpx; font-weight: 700; color: var(--text-ink);
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.guas-tip { display: block; margin-top: 24rpx; text-align: center; font-size: 24rpx; color: var(--text-soft); }

.arr { font-size: 28rpx; font-weight: 700; line-height: 1; }
.arr-sm { font-size: 24rpx; }
.arr-up { color: #1a7f4b; }
.arr-down { color: #c2413b; }

/* ── 九宫格（V0 aspect-square 触 X5 红线，改固定高度） ── */
.grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  border: 1rpx solid var(--line); border-radius: 20rpx; overflow: hidden;
}
.cell {
  height: 210rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx;
  border: 1rpx solid var(--line);
  background: var(--card);
  &:active { opacity: 0.8; }
}
.cell-on { background: rgba(201, 169, 110, 0.22); }
.cell-main { display: flex; align-items: center; gap: 16rpx; }
.cell-arrs { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.cell-label { font-size: 20rpx; color: var(--text-soft); }
.grid-tip { display: block; margin-top: 16rpx; text-align: center; font-size: 24rpx; color: var(--text-soft); }

/* ── 宫位象意 ── */
.sense-p { line-height: 1.7; margin-bottom: 16rpx; }
.sense-p:last-child { margin-bottom: 0; }
.sense-strong { font-size: 28rpx; font-weight: 700; color: var(--brand); line-height: 1.7; }
.sense-gold { font-size: 28rpx; font-weight: 700; color: var(--gold, #8a6d3b); line-height: 1.7; }
.sense-text { font-size: 28rpx; line-height: 1.7; color: var(--text-ink); }

/* ── 起卦算式 / 白话总断 ── */
.detail-lines { margin-top: 20rpx; display: flex; flex-direction: column; gap: 8rpx; }
.detail-line { font-size: 24rpx; line-height: 1.7; color: var(--text-soft); }
.summary-lines { margin-top: 20rpx; display: flex; flex-direction: column; gap: 14rpx; }
.summary-line { font-size: 28rpx; line-height: 1.7; color: var(--text-ink); }

/* ── 关联工具 ── */
.links { display: flex; gap: 24rpx; }
.link-btn {
  flex: 1; padding: 26rpx;
  background: var(--card); border: 1rpx solid var(--line); border-radius: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  &:active { opacity: 0.8; }
}
.link-btn-text {
  display: block; text-align: center;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx; font-weight: 700; color: var(--text-ink);
}
</style>
