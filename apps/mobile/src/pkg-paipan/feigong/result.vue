<script setup lang="ts">
/**
 * 飞宫小奇门·结果页——自 V0 app/feigong/result/page.tsx 还原
 * onLoad 解析 payload 本地重算：盘局信息表 / 九宫盘（点宫看象意）/ 宫位象意面板 / 白话总断。
 * 取舍：AI 深断区块本批砍掉；随机起局按入口页落定之数重算（展示口径仍标「随机」），
 *       起局成功自动写入本地排盘记录（key: rebu:feigong-history）。
 *       V0 九宫格 aspect-square 触 X5 红线，改固定 min-height。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  paiFeigong,
  type FeigongResult,
  GAN_XIANGYI,
  MEN_XIANGYI,
  HUANGDAO_XIANGYI,
  JIANCHU_XIANGYI,
} from '@/pkg-paipan/lib/feigong-engine'
import { saveFeigongHistory, type FeigongParams } from './feigong-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '飞宫小奇门'
// #ifdef MP-WEIXIN
hdrTitle = '飞宫文化研究'
// #endif

/** 九宫渲染顺序（竞品同款：上4-9-2 中3-5-7 下8-1-6） */
const GRID_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6]

// ─── 五行配色（干支按五行着色，用全局 --wuxing-* token） ───
const CH_WX: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}
const WX_COLOR: Record<string, string> = {
  木: 'var(--wuxing-wood)',
  火: 'var(--wuxing-fire)',
  土: 'var(--wuxing-earth)',
  金: 'var(--wuxing-metal)',
  水: 'var(--wuxing-water)',
}
function wxColor(ch: string) {
  return WX_COLOR[CH_WX[ch] ?? ''] ?? 'var(--text-ink)'
}

const JI_MEN = ['休门', '生门', '开门']

const PILLAR_KEYS = ['year', 'month', 'day', 'time'] as const
const PILLAR_LABELS = ['年柱', '月柱', '日柱', '时柱']

// ─── 状态 ───
const q = ref<FeigongParams | null>(null)
const r = ref<FeigongResult | null>(null)
const invalid = ref(false)
const selected = ref<number | null>(null)

onLoad((opts: Record<string, string> = {}) => {
  try {
    if (!opts.payload) throw new Error('missing payload')
    const p = JSON.parse(decodeURIComponent(opts.payload)) as Record<string, unknown>
    const params: FeigongParams = {
      topic: String(p.topic ?? ''),
      year: Number(p.year), month: Number(p.month), day: Number(p.day),
      hour: Number(p.hour) || 0, minute: Number(p.minute) || 0,
      m: p.m === 'number' ? 'number' : p.m === 'random' ? 'random' : 'hour',
      n: p.n === undefined ? undefined : Number(p.n),
    }
    const d = new Date(params.year, params.month - 1, params.day, params.hour, params.minute)
    if (Number.isNaN(d.getTime()) || !params.year) throw new Error('bad date')
    if (params.m !== 'hour' && !(Number.isFinite(params.n) && (params.n as number) >= 1)) throw new Error('bad number')
    // 随机在入口页已落定为数，此处按报数口径重算，保证重开一致
    const res = paiFeigong({
      date: d,
      method: params.m === 'hour' ? 'hour' : 'number',
      reportNumber: params.n,
    })
    // 展示口径仍按原起法
    if (params.m === 'random') res.methodLabel = `随机起局（${params.n}）`
    r.value = res
    q.value = params
    saveFeigongHistory(params, `青龙落${res.qinglongZhi} · ${res.methodLabel.slice(0, 4)}`)
  } catch {
    invalid.value = true
  }
})

// ─── 宫位象意面板 ───
const detailRows = computed(() => {
  const res = r.value
  const p = selected.value
  if (!res || p === null || p === 5) return []
  const o = res.palaces[p]
  const gejuCls = o.geju.ji === '吉' ? 'row-good' : o.geju.ji === '凶' ? 'row-bad' : 'row-mid'
  const rows: { label: string; text: string; cls?: string }[] = [
    {
      label: o.name,
      text: `先天宫为${o.xiantianGua}宫。取数：${o.quShu.join('，')}。地支：${o.zhis.join('，')}。方位：${o.fangwei}。${o.kongWang ? '本宫临日空。' : ''}`,
      cls: 'row-bad',
    },
    { label: `${o.gan}+${o.name.slice(0, 1)}宫`, text: `${o.geju.name}（${o.geju.ji}）：${o.geju.text}`, cls: gejuCls },
    { label: o.gan, text: GAN_XIANGYI[o.gan] ?? '' },
    { label: o.men, text: MEN_XIANGYI[o.men] ?? '' },
    ...o.huangdao.map((s) => ({ label: s, text: HUANGDAO_XIANGYI[s] ?? '' })),
    ...o.jianchu.map((s) => ({ label: s, text: JIANCHU_XIANGYI[s] ?? '' })),
  ]
  return rows
})

function onSelect(p: number) {
  if (p === 5) return
  selected.value = selected.value === p ? null : p
}

/** 分享：复制盘面文字摘要 */
function onShare() {
  const res = r.value
  if (!res) return
  uni.setClipboardData({
    data: `【飞宫小奇门】\n${res.aiSummary}\n—— 来自热卜 · 专业排盘工具`,
    success: () => uni.showToast({ title: '盘面摘要已复制', icon: 'none' }),
  })
}

function goInput() {
  navigateTo('/pkg-paipan/feigong/index')
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" back-href="/pkg-paipan/feigong/index" @share="onShare">
      <template #actions>
        <view class="th-btn" @tap="goInput">
          <app-icon name="refresh-cw" :size="32" color="var(--text-ink)" />
        </view>
      </template>
    </tool-header>

    <!-- 参数错误态 -->
    <view v-if="invalid" class="status">
      <app-icon name="info" :size="64" color="#d1d5db" />
      <text class="status-text">排盘参数缺失或已失效</text>
      <view class="status-btn" @tap="goInput"><text class="status-btn-text">重新起局</text></view>
    </view>

    <scroll-view v-else-if="r" scroll-y class="body">
      <view class="body-inner">
        <!-- ── 盘局信息表 ── -->
        <view class="card tbl">
          <view class="tr">
            <view class="th-cell"><text class="th-text">事项</text></view>
            <view class="td"><text class="td-text">{{ q && q.topic ? q.topic : '—' }}</text></view>
          </view>
          <view class="tr">
            <view class="th-cell"><text class="th-text">盘式</text></view>
            <view class="td"><text class="td-text">{{ r.methodLabel }}</text></view>
          </view>
          <view class="tr">
            <view class="th-cell"><text class="th-text">日期</text></view>
            <view class="td"><text class="td-text">{{ r.dateLabel }}（{{ r.lunarLabel }}）</text></view>
          </view>
          <view class="tr">
            <view class="th-cell"><text class="th-text">节气</text></view>
            <view class="td"><text class="td-text td-sm">{{ r.jieqiLabel }}</text></view>
          </view>
          <view class="tr">
            <view class="th-cell"><text class="th-text">四柱</text></view>
            <view class="td-cols">
              <view v-for="(k, i) in PILLAR_KEYS" :key="k" class="pillar-col">
                <text class="pillar-label">{{ PILLAR_LABELS[i] }}</text>
                <text class="pillar-ch" :style="{ color: wxColor(r.pillars[k][0]) }">{{ r.pillars[k][0] }}</text>
                <text class="pillar-ch" :style="{ color: wxColor(r.pillars[k][1]) }">{{ r.pillars[k][1] }}</text>
              </view>
            </view>
          </view>
          <view class="tr tr-last">
            <view class="th-cell"><text class="th-text">空亡</text></view>
            <view class="td-cols">
              <view v-for="k in PILLAR_KEYS" :key="k" class="pillar-col">
                <text class="kw-text">{{ r.kongWang[k] }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ── 九宫盘 ── -->
        <view class="pan">
          <view
            v-for="p in GRID_ORDER"
            :key="p"
            class="cell"
            :class="{ 'cell-center': p === 5, 'cell-on': selected === p }"
            @tap="onSelect(p)"
          >
            <!-- 中宫 -->
            <template v-if="p === 5">
              <text class="center-gans">{{ r.center.gans.join('') }}</text>
              <text class="center-label">中宫</text>
            </template>
            <!-- 八宫 -->
            <template v-else>
              <view class="cell-top">
                <view class="hd-col">
                  <text
                    v-for="s in r.palaces[p].huangdao"
                    :key="s"
                    class="hd-text"
                    :class="{ 'hd-long': s === '青龙' }"
                  >{{ s }}</text>
                </view>
                <view class="jc-col">
                  <text v-for="s in r.palaces[p].jianchu" :key="s" class="jc-text">{{ s }}</text>
                  <view v-if="r.palaces[p].kongWang" class="kong-ring" />
                </view>
              </view>
              <view class="cell-bottom">
                <text class="men-text" :class="{ 'men-ji': JI_MEN.includes(r.palaces[p].men) }">{{ r.palaces[p].men }}</text>
                <text class="gan-text" :style="{ color: wxColor(r.palaces[p].gan) }">{{ r.palaces[p].gan }}</text>
              </view>
            </template>
          </view>
        </view>
        <text class="pan-note">点击宫位查看象意信息</text>

        <!-- ── 宫位象意 ── -->
        <view v-if="detailRows.length" class="card detail">
          <view
            v-for="(row, i) in detailRows"
            :key="row.label + i"
            class="detail-row"
            :class="{ 'detail-row-bd': i < detailRows.length - 1 }"
          >
            <text class="detail-text">
              <text class="detail-label" :class="row.cls">{{ row.label }}</text>：{{ row.text }}
            </text>
          </view>
        </view>

        <!-- ── 白话总断 ── -->
        <view class="verdict-sec">
          <text class="sec-title">白话总断</text>
          <view class="card verdicts">
            <view v-for="v in r.verdicts" :key="v.title" class="verdict-item">
              <text class="verdict-text">
                <text class="verdict-title">{{ v.title }}</text>：{{ v.text }}
              </text>
            </view>
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="飞宫小奇门为民间快占之术，所示宫位象意仅供文化研究与决策参考，切勿迷信。"
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

.th-btn {
  width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%;
  &:active { background: rgba(0, 0, 0, 0.05); }
}

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

/* ── 盘局信息表 ── */
.tr { display: flex; align-items: stretch; border-bottom: 1rpx solid var(--line); }
.tr-last { border-bottom: none; }
.th-cell {
  width: 128rpx; flex-shrink: 0;
  padding: 16rpx;
  background: rgba(0, 0, 0, 0.03);
  border-right: 1rpx solid var(--line);
  display: flex; align-items: center;
}
.th-text { font-size: 24rpx; color: var(--text-soft); }
.td { flex: 1; min-width: 0; padding: 16rpx 20rpx; display: flex; align-items: center; }
.td-text { font-size: 26rpx; color: var(--text-ink); line-height: 1.6; }
.td-sm { font-size: 22rpx; }
.td-cols { flex: 1; display: flex; }
.pillar-col {
  flex: 1;
  padding: 12rpx 4rpx;
  display: flex; flex-direction: column; align-items: center; gap: 2rpx;
}
.pillar-label { font-size: 20rpx; color: var(--text-soft); }
.pillar-ch { font-family: $serif; font-size: 30rpx; font-weight: 700; line-height: 1.3; }
.kw-text { font-size: 22rpx; color: var(--text-soft); }

/* ── 九宫盘 ── */
.pan {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 2rpx solid var(--line);
  border-radius: 20rpx;
  overflow: hidden;
  background: var(--line);
  gap: 1rpx;
}
.cell {
  min-height: 220rpx;
  background: var(--card);
  padding: 16rpx;
  display: flex; flex-direction: column; justify-content: space-between;
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.cell-on { background: rgba(196, 30, 58, 0.08); }
.cell-center {
  background: rgba(0, 0, 0, 0.025);
  align-items: center; justify-content: center; gap: 12rpx;
}
.center-gans {
  font-family: $serif;
  font-size: 40rpx; font-weight: 700; color: var(--text-ink);
  letter-spacing: 0.3em;
}
.center-label { font-size: 24rpx; color: var(--text-soft); }

.cell-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 4rpx; }
.hd-col { display: flex; flex-direction: column; }
.hd-text { font-size: 24rpx; line-height: 1.5; color: var(--text-soft); }
.hd-long { font-weight: 500; color: var(--brand); }
.jc-col { display: flex; flex-direction: column; align-items: flex-end; }
.jc-text { font-size: 24rpx; line-height: 1.5; color: var(--wuxing-wood); }
.kong-ring {
  margin-top: 8rpx;
  width: 26rpx; height: 26rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(0, 0, 0, 0.5);
}
.cell-bottom { display: flex; align-items: flex-end; justify-content: space-between; }
.men-text { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.men-ji { color: var(--brand); }
.gan-text { font-family: $serif; font-size: 30rpx; font-weight: 700; }
.pan-note { display: block; margin-top: -8rpx; text-align: center; font-size: 22rpx; color: var(--text-soft); }

/* ── 宫位象意 ── */
.detail-row { padding: 20rpx 24rpx; }
.detail-row-bd { border-bottom: 1rpx solid var(--line); }
.detail-text { font-size: 26rpx; line-height: 1.7; color: var(--text-soft); }
.detail-label { font-weight: 700; color: var(--brand); }
.row-good { color: var(--wuxing-wood); }
.row-bad { color: #dc2626; }
.row-mid { color: var(--wuxing-earth); }

/* ── 白话总断 ── */
.verdict-sec { display: flex; flex-direction: column; gap: 16rpx; }
.sec-title {
  font-family: $serif;
  font-size: 30rpx; font-weight: 700; color: var(--text-ink);
}
.verdicts { padding: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.verdict-item { display: flex; }
.verdict-text { font-size: 26rpx; line-height: 1.7; color: var(--text-soft); }
.verdict-title { font-weight: 700; color: var(--brand); }
</style>
