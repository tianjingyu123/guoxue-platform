<script setup lang="ts">
/**
 * 六爻排盘·结果页（自 V0 app/liuyao/result/page.tsx 还原）
 * onLoad 解析 payload 后本地装卦（@/pkg-paipan2/lib/liuyao-engine，73/73 黄金测试通过），零后端依赖。
 * 结构：四柱旬空条 → 卦名/卦宫 → 六爻盘面（六神·纳甲六亲·爻画·世应·动爻·伏神）
 *       → 要点提示 → 解卦 → 卦辞 → 爻位详批弹层 → 合规声明。
 *
 * ⚠️ 本页替代旧的 pkg-paipan/liuyao/result.vue：旧页调 lib/liuyao-result-data.ts 的 liuyaoApi，
 *    而该文件 5 处 `if (true) return _mockLiuyaoResult` 把后端真算法短路，线上是写死的假盘。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { computeLiuyao } from '@/pkg-paipan2/lib/liuyao-engine'
import { QIGUA_METHODS, type LiuyaoResultLine, type QiguaMethodKey } from '@/pkg-paipan2/lib/liuyao-data'
import { saveLiuyaoHistory, type LiuyaoParams } from './liuyao-history'

const loadError = ref('')
const params = ref<LiuyaoParams | null>(null)
const detailLine = ref<LiuyaoResultLine | null>(null)

const result = computed(() => {
  const p = params.value
  if (!p) return null
  return computeLiuyao({
    year: p.year,
    month: p.month,
    day: p.day,
    hour: p.hour,
    minute: p.minute,
    methodKey: p.methodKey,
    coins: p.coins,
    numberInput: p.numberInput,
    guaPick: p.guaPick,
  })
})

const methodLabel = computed(
  () => QIGUA_METHODS.find((m) => m.key === params.value?.methodKey)?.label ?? '',
)

/** 盘面自上而下渲染（六爻 position 6→1） */
const lines = computed(() => {
  const r = result.value
  if (!r) return []
  return [...r.chart.lines].sort((a, b) => b.position - a.position)
})

const VALID_METHODS: QiguaMethodKey[] = ['manual', 'coin', 'guaname', 'number1', 'number2', 'time', 'auto']

onLoad((q: Record<string, string> = {}) => {
  try {
    if (!q.payload) throw new Error('缺少起卦参数')
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

    const mk = String(raw.methodKey ?? 'auto') as QiguaMethodKey
    if (!VALID_METHODS.includes(mk)) throw new Error('起卦方式无效')

    const p: LiuyaoParams = {
      matter: String(raw.matter ?? ''),
      methodKey: mk,
      year, month, day, hour, minute,
      coins: raw.coins ? String(raw.coins) : undefined,
      numberInput: raw.numberInput ? String(raw.numberInput) : undefined,
      guaPick: raw.guaPick as LiuyaoParams['guaPick'],
    }
    params.value = p

    const r = computeLiuyao({
      year, month, day, hour, minute,
      methodKey: mk,
      coins: p.coins,
      numberInput: p.numberInput,
      guaPick: p.guaPick,
    })
    const moving = r.chart.lines.filter((l) => l.movingMark).length
    saveLiuyaoHistory(
      p,
      `${r.chart.benShort} → ${r.chart.bianShort}${moving ? ` · ${moving}爻动` : ' · 静卦'}`,
    )
  } catch (e) {
    loadError.value = (e as Error).message || '起卦参数无效'
  }
})

function onShare() {
  const r = result.value
  const p = params.value
  if (!r || !p) return
  const txt = [
    `【六爻排盘${p.matter ? ` · ${p.matter}` : ''}】`,
    `${r.ganzhi.year} ${r.ganzhi.month} ${r.ganzhi.day} ${r.ganzhi.hour}（日空 ${r.kongwang.day}）`,
    `${r.chart.benName} → ${r.chart.bianName}`,
    `${r.chart.palace}宫${r.chart.seqLabel}　卦身：${r.chart.guashen}`,
    r.jieGua.title,
    ...r.jieGua.sections.map((s) => `${s.label}：${s.text}`),
  ].join('\n')
  uni.setClipboardData({
    data: txt,
    success: () => uni.showToast({ title: '卦盘已复制', icon: 'none' }),
  })
}
</script>

<template>
  <view class="page">
    <tool-header title="六爻排盘" back-href="/paipan/liuyao" share @share="onShare" />

    <!-- 错误态 -->
    <view v-if="loadError" class="status">
      <text class="status-text">{{ loadError }}</text>
      <view class="status-btn" @tap="navigateTo('/paipan/liuyao')">
        <text class="status-btn-text">返回起卦</text>
      </view>
    </view>

    <scroll-view v-else-if="result && params" scroll-y class="body">
      <view class="body-inner">
        <!-- 事项 + 起卦方式 -->
        <view class="head">
          <text class="head-matter">{{ params.matter || '未填写事项' }}</text>
          <text class="head-method">{{ methodLabel }}</text>
        </view>

        <!-- 四柱 + 旬空 -->
        <paper-card>
          <view class="gz-row">
            <view class="gz-item">
              <text class="gz-label">年</text>
              <text class="gz-val">{{ result.ganzhi.year }}</text>
            </view>
            <view class="gz-item">
              <text class="gz-label">月</text>
              <text class="gz-val">{{ result.ganzhi.month }}</text>
            </view>
            <view class="gz-item">
              <text class="gz-label">日</text>
              <text class="gz-val gz-val-day">{{ result.ganzhi.day }}</text>
            </view>
            <view class="gz-item">
              <text class="gz-label">时</text>
              <text class="gz-val">{{ result.ganzhi.hour }}</text>
            </view>
          </view>
          <view class="kw-row">
            <text class="kw-text">日空：{{ result.kongwang.day }}</text>
            <text class="kw-text">月空：{{ result.kongwang.month }}</text>
            <text class="kw-text">{{ result.lunar.text }}</text>
          </view>
        </paper-card>

        <!-- 卦名 -->
        <paper-card>
          <view class="gua-names">
            <view class="gua-col">
              <text class="gua-tag">本卦</text>
              <text class="gua-name">{{ result.chart.benName }}</text>
              <text class="gua-sub">{{ result.chart.benTag }}</text>
            </view>
            <view class="gua-arrow">
              <app-icon name="arrow-right" :size="32" color="var(--brand)" />
            </view>
            <view class="gua-col">
              <text class="gua-tag">变卦</text>
              <text class="gua-name">{{ result.chart.bianName }}</text>
              <text class="gua-sub">{{ result.chart.bianTag }}</text>
            </view>
          </view>
          <view class="gua-meta">
            <text class="gua-meta-text">{{ result.chart.palace }}宫 · {{ result.chart.seqLabel }}</text>
            <text class="gua-meta-text">卦身：{{ result.chart.guashen }}</text>
          </view>
          <view v-if="result.chart.shensha.length" class="ss-row">
            <text v-for="s in result.chart.shensha" :key="s" class="ss-tag">{{ s }}</text>
          </view>
        </paper-card>

        <!-- 六爻盘面 -->
        <paper-card padding="none">
          <view class="plate-head">
            <text class="ph-cell ph-liushen">六神</text>
            <text class="ph-cell ph-ben">本卦（纳甲六亲）</text>
            <text class="ph-cell ph-yao">爻</text>
            <text class="ph-cell ph-yao">爻</text>
            <text class="ph-cell ph-bian">变卦</text>
          </view>

          <view
            v-for="l in lines"
            :key="l.position"
            class="ln"
            @tap="detailLine = l"
          >
            <text class="ln-liushen">{{ l.liushen }}</text>

            <!-- 本卦：六亲纳甲 -->
            <view class="ln-ben">
              <text class="ln-lq">{{ l.benGan }}{{ l.benLiuqin }}</text>
              <text v-if="l.fushen" class="ln-fu">{{ l.fushen }}</text>
            </view>

            <!-- 本卦爻画 -->
            <view class="ln-fig">
              <view v-if="l.benYao === 'yang'" class="yao-yang" />
              <view v-else class="yao-yin">
                <view class="yao-half" />
                <view class="yao-half" />
              </view>
              <text v-if="l.movingMark" class="ln-move">{{ l.movingMark }}</text>
              <text v-if="l.shiying" class="ln-sy" :class="l.shiying === '世' ? 'ln-shi' : 'ln-ying'">{{ l.shiying }}</text>
            </view>

            <!-- 变卦爻画 -->
            <view class="ln-fig">
              <view v-if="l.bianYao === 'yang'" class="yao-yang yao-dim" />
              <view v-else class="yao-yin">
                <view class="yao-half yao-dim" />
                <view class="yao-half yao-dim" />
              </view>
            </view>

            <!-- 变卦六亲 -->
            <text class="ln-bian">{{ l.bianGan }}{{ l.bianLiuqin }}</text>
          </view>
        </paper-card>

        <!-- 卦身/伏神提示 -->
        <view v-if="lines.some((l) => l.guashenNote)" class="gs-note">
          <text v-for="l in lines.filter((x) => x.guashenNote)" :key="l.position" class="gs-note-text">
            {{ l.guashenNote }}
          </text>
        </view>

        <!-- 要点提示 -->
        <paper-card>
          <text class="sec-title">要点提示</text>
          <view class="kn-list">
            <view v-for="(k, i) in result.keyNotes" :key="i" class="kn-item">
              <text class="kn-label">{{ k.label }}</text>
              <text class="kn-text">{{ k.text }}</text>
            </view>
          </view>
        </paper-card>

        <!-- 解卦 -->
        <paper-card>
          <text class="sec-title">{{ result.jieGua.title }}</text>
          <view class="jg-list">
            <view v-for="(s, i) in result.jieGua.sections" :key="i" class="jg-item">
              <text class="jg-label">{{ s.label }}</text>
              <text class="jg-text">{{ s.text }}</text>
            </view>
          </view>
        </paper-card>

        <!-- 卦辞 -->
        <paper-card>
          <text class="sec-title">卦辞</text>
          <view class="gc-list">
            <view v-for="(g, i) in result.guaci" :key="i" class="gc-item">
              <text class="gc-name">{{ g.name }}</text>
              <text v-for="(t, j) in g.text" :key="j" class="gc-text">{{ t || '（暂无卦辞）' }}</text>
            </view>
          </view>
        </paper-card>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="六爻为传统易学占筮之法，所示卦象与断语仅供文化研究与参考，切勿迷信。"
        />
      </view>
    </scroll-view>

    <!-- 爻位详批弹层 -->
    <view v-if="detailLine" class="mask" @tap="detailLine = null">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <view class="sheet-title-row">
            <text class="sheet-title">
              {{ ['初', '二', '三', '四', '五', '上'][detailLine.position - 1] }}爻
            </text>
            <text class="sheet-badge">{{ detailLine.liushen }}</text>
            <text v-if="detailLine.shiying" class="sheet-badge sheet-badge-sy">{{ detailLine.shiying }}</text>
            <text v-if="detailLine.movingMark" class="sheet-badge sheet-badge-move">动爻</text>
          </view>
          <view class="sheet-close" @tap="detailLine = null">
            <app-icon name="x" :size="32" color="var(--text-soft)" />
          </view>
        </view>

        <view class="sheet-body">
          <view class="sheet-kv">
            <text class="sheet-k">本卦</text>
            <text class="sheet-v">{{ detailLine.benGan }}{{ detailLine.benLiuqin }}</text>
          </view>
          <view class="sheet-kv">
            <text class="sheet-k">变卦</text>
            <text class="sheet-v">{{ detailLine.bianGan }}{{ detailLine.bianLiuqin }}</text>
          </view>
          <view v-if="detailLine.fushen" class="sheet-kv">
            <text class="sheet-k">伏神</text>
            <text class="sheet-v sheet-v-red">{{ detailLine.fushen }}</text>
          </view>
          <view v-if="detailLine.judgment" class="sheet-judge">
            <text class="sheet-judge-label">爻辞断语</text>
            <text class="sheet-judge-text">{{ detailLine.judgment }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 24rpx 48rpx; display: flex; flex-direction: column; gap: 20rpx; }

/* 错误态 */
.status { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; padding: 80rpx 48rpx; }
.status-text { font-size: 28rpx; color: var(--text-soft); text-align: center; }
.status-btn { padding: 20rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.status-btn-text { font-size: 28rpx; color: #fff; font-weight: 600; }

/* 事项头 */
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 16rpx; padding: 0 8rpx; }
.head-matter {
  font-size: 30rpx; font-weight: 700; color: var(--text-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.head-method { font-size: 22rpx; color: var(--text-soft); flex-shrink: 0; }

/* 四柱 */
.gz-row { display: flex; gap: 12rpx; }
.gz-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.gz-label { font-size: 20rpx; color: var(--text-soft); }
.gz-val { font-family: $serif; font-size: 26rpx; font-weight: 700; color: var(--text-ink); }
.gz-val-day { color: var(--brand); }
.kw-row { display: flex; justify-content: center; gap: 24rpx; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid var(--line); flex-wrap: wrap; }
.kw-text { font-size: 22rpx; color: var(--text-soft); }

/* 卦名 */
.gua-names { display: flex; align-items: center; gap: 16rpx; }
.gua-col { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.gua-tag { font-size: 20rpx; color: var(--text-soft); }
.gua-name { font-family: $serif; font-size: 30rpx; font-weight: 700; color: var(--text-ink); text-align: center; }
.gua-sub { font-size: 20rpx; color: var(--brand); }
.gua-arrow { flex-shrink: 0; }
.gua-meta { display: flex; justify-content: center; gap: 28rpx; margin-top: 20rpx; padding-top: 16rpx; border-top: 1rpx solid var(--line); }
.gua-meta-text { font-size: 22rpx; color: var(--text-soft); }
.ss-row { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; justify-content: center; }
.ss-tag {
  padding: 4rpx 14rpx; border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.06); color: var(--brand);
  font-size: 20rpx;
}

/* 六爻盘面 */
.plate-head {
  display: flex; align-items: center;
  padding: 16rpx 20rpx;
  border-bottom: 2rpx solid var(--line);
}
.ph-cell { font-size: 20rpx; color: var(--text-soft); text-align: center; }
.ph-liushen { width: 64rpx; flex-shrink: 0; }
.ph-ben { flex: 1.4; min-width: 0; text-align: left; padding-left: 8rpx; }
.ph-yao { width: 100rpx; flex-shrink: 0; }
.ph-bian { flex: 1; min-width: 0; text-align: right; }

.ln {
  display: flex; align-items: center;
  padding: 20rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
}
.ln:active { background: rgba(0, 0, 0, 0.02); }
.ln:last-child { border-bottom: 0; }

.ln-liushen { width: 64rpx; flex-shrink: 0; font-size: 22rpx; color: var(--text-soft); text-align: center; }
.ln-ben { flex: 1.4; min-width: 0; padding-left: 8rpx; display: flex; flex-direction: column; gap: 4rpx; }
.ln-lq { font-family: $serif; font-size: 26rpx; color: var(--text-ink); }
.ln-fu { font-size: 20rpx; color: var(--brand); }

/* 爻画 */
.ln-fig {
  width: 100rpx; flex-shrink: 0;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  height: 44rpx;
}
.yao-yang { width: 72rpx; height: 12rpx; border-radius: 3rpx; background: var(--text-ink); }
.yao-yin { width: 72rpx; display: flex; justify-content: space-between; }
.yao-half { width: 30rpx; height: 12rpx; border-radius: 3rpx; background: var(--text-ink); }
.yao-dim { background: rgba(44, 44, 44, 0.35); }
.ln-move {
  position: absolute; right: -2rpx; top: 0;
  font-size: 20rpx; font-weight: 700; color: var(--brand);
}
.ln-sy {
  position: absolute; left: -2rpx; top: 0;
  font-size: 20rpx; font-weight: 700;
}
.ln-shi { color: var(--brand); }
.ln-ying { color: #2f9d6a; }

.ln-bian { flex: 1; min-width: 0; text-align: right; font-family: $serif; font-size: 24rpx; color: var(--text-soft); }

/* 卦身提示 */
.gs-note { padding: 0 8rpx; display: flex; flex-direction: column; gap: 6rpx; }
.gs-note-text { font-size: 22rpx; color: var(--brand); }

/* 分区 */
.sec-title { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }

/* 要点提示 */
.kn-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 16rpx; }
.kn-item { display: flex; flex-direction: column; gap: 4rpx; }
.kn-label { font-size: 22rpx; font-weight: 600; color: var(--brand); }
.kn-text { font-size: 24rpx; line-height: 1.6; color: var(--text-ink); }

/* 解卦 */
.jg-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 18rpx; }
.jg-item { display: flex; flex-direction: column; gap: 6rpx; }
.jg-label { font-size: 22rpx; font-weight: 600; color: var(--text-soft); }
.jg-text { font-size: 24rpx; line-height: 1.7; color: var(--text-ink); }

/* 卦辞 */
.gc-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 20rpx; }
.gc-item { display: flex; flex-direction: column; gap: 8rpx; }
.gc-name { font-size: 24rpx; font-weight: 600; color: var(--text-ink); }
.gc-text { font-family: $serif; font-size: 24rpx; line-height: 1.8; color: var(--text-soft); }

/* 爻位详批弹层 */
.mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 50; background: rgba(0, 0, 0, 0.4); display: flex; align-items: flex-end; }
.sheet {
  width: 100%; max-height: 70vh;
  padding: 32rpx 32rpx 56rpx;
  border-radius: 32rpx 32rpx 0 0;
  background: var(--bg-paper);
}
.sheet-head { display: flex; align-items: center; justify-content: space-between; }
.sheet-title-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.sheet-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.sheet-badge {
  padding: 4rpx 14rpx; border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.05); color: var(--text-soft);
  font-size: 20rpx;
}
.sheet-badge-sy { background: rgba(196, 30, 58, 0.1); color: var(--brand); }
.sheet-badge-move { background: rgba(196, 30, 58, 0.9); color: #fff; font-weight: 700; }
.sheet-close { padding: 8rpx; }

.sheet-body { margin-top: 24rpx; }
.sheet-kv { display: flex; align-items: center; gap: 20rpx; padding: 14rpx 0; border-bottom: 1rpx solid rgba(0, 0, 0, 0.05); }
.sheet-k { width: 80rpx; flex-shrink: 0; font-size: 22rpx; color: var(--text-soft); }
.sheet-v { font-family: $serif; font-size: 26rpx; color: var(--text-ink); }
.sheet-v-red { color: var(--brand); }
.sheet-judge { margin-top: 24rpx; padding: 24rpx; border-radius: 16rpx; background: rgba(0, 0, 0, 0.03); }
.sheet-judge-label { font-size: 22rpx; font-weight: 700; color: var(--text-soft); }
.sheet-judge-text { display: block; margin-top: 8rpx; font-size: 26rpx; line-height: 1.7; color: var(--text-ink); }
</style>
