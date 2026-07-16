<script setup lang="ts">
/**
 * 八字合盘·结果页（自 V0 app/hepan/result/page.tsx 还原）
 * onLoad 解析 payload 后本地重算（@/pkg-paipan/lib/hepan-engine），无后端依赖。
 * 结构：双柱对照 → 两造合冲害标签 → 契合总分环 + 五维分项条 → 总评 → 综合判词
 *       → 五维契合雷达（canvas）→ 五行互补对照 → 相合亮点 / 相处提醒 → 古籍论合
 *       → 经营建议 → 分项详批弹层 → 合规声明。
 * 取舍：V0 的 SVG 雷达图 → canvas 适配层（@/utils/canvas/adapter，小程序无 SVG）；
 *       V0 的 SVG 分数环 → conic-gradient（与 pkg-mine/security 圆环范式一致）；
 *       语音笔记面板 / AI 辅助分析按批次规范砍掉，分享收口到顶栏（复制盘面摘要）；
 *       进入即自动存本地历史（改名原位覆盖）。
 */
import { ref, computed, watch, nextTick } from 'vue'
import { onLoad, onReady } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import ParamError from '@/components/paipan/param-error.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import GenerateReportButton from '@/components/paipan/generate-report-button.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { renderToCanvas } from '@/utils/canvas/adapter'
import { HEPAN_SCENES, type HepanAspect } from '@/pkg-paipan/lib/hepan-data'
import { computeHepan } from '@/pkg-paipan/lib/hepan-engine'
import { saveHepanHistory, type HepanParams } from './hepan-history'

const PILLAR_LABELS = ['年柱', '月柱', '日柱', '时柱']
const WUXING_LABELS = ['金', '木', '水', '火', '土']
// 五行色：与项目 wuxing token 对齐（金/木/水/火/土）
const WUXING_COLORS = ['#d4a017', '#2f9d6a', '#3b82f6', '#c41e3a', '#a0522d']

const RADAR_W = 300
const RADAR_H = 240

const loadError = ref('')
const params = ref<HepanParams | null>(null)
const detailAspect = ref<HepanAspect | null>(null)

const result = computed(() => {
  const p = params.value
  if (!p) return null
  return computeHepan(p.scene, p.a, p.b)
})

const scene = computed(() => HEPAN_SCENES.find((s) => s.key === params.value?.scene) ?? HEPAN_SCENES[0])

/** 报告摘要：契合总分（引擎算的，不编） */
const hepanSummary = computed(() => {
  const r: any = result.value
  const p = params.value
  if (!r || !p) return ''
  return `${p.a.name || '男'} × ${p.b.name || '女'} · 契合 ${r.totalScore ?? '--'} 分`
})

/** 契合总分环（conic-gradient，小程序无 SVG） */
const ringStyle = computed(() => {
  const pct = result.value?.totalScore ?? 0
  return `background: conic-gradient(var(--brand) ${pct}%, rgba(0,0,0,0.06) ${pct}% 100%);`
})

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** 逐字段校验一方生辰（不用 new Date(string)，规避各端字符串解析差异） */
function normPerson(raw: unknown, role: string) {
  const p = raw as Record<string, unknown>
  if (!p || typeof p !== 'object') throw new Error(`${role}信息缺失`)
  const num = (k: string) => {
    const v = Number(p[k])
    if (!Number.isFinite(v)) throw new Error(`${role}${k} 无效`)
    return v
  }
  const year = num('year')
  const month = num('month')
  const day = num('day')
  const hour = num('hour')
  const minute = num('minute')
  if (year < 1900 || year > 2100) throw new Error(`${role}年份超出范围（1900-2100）`)
  if (month < 1 || month > 12) throw new Error(`${role}月份无效`)
  if (day < 1 || day > 31) throw new Error(`${role}日期无效`)
  if (hour < 0 || hour > 23) throw new Error(`${role}小时无效`)
  if (minute < 0 || minute > 59) throw new Error(`${role}分钟无效`)
  const gender = p.gender === '女' ? '女' : '男'
  return { name: String(p.name ?? ''), gender: gender as '男' | '女', year, month, day, hour, minute }
}

onLoad((q: Record<string, string> = {}) => {
  try {
    if (!q.payload) throw new Error('缺少合盘参数')
    const raw = JSON.parse(decodeURIComponent(q.payload)) as Record<string, unknown>
    const sceneKey = String(raw.scene ?? 'marriage')
    if (!HEPAN_SCENES.some((s) => s.key === sceneKey)) throw new Error('合盘场景无效')
    const p: HepanParams = {
      scene: sceneKey,
      a: normPerson(raw.a, '甲方'),
      b: normPerson(raw.b, '乙方'),
    }
    params.value = p
    const r = computeHepan(p.scene, p.a, p.b)
    const grade = r.totalScore >= 85 ? '上上之配' : r.totalScore >= 75 ? '上乘之配' : r.totalScore >= 62 ? '中上之配' : r.totalScore >= 50 ? '中平之配' : '须多经营之配'
    saveHepanHistory(p, `${grade} · ${r.totalScore}分`)
  } catch (e) {
    loadError.value = (e as Error).message || '合盘参数无效'
  }
})

/** 五维契合雷达（canvas 绘制：三层网格 + 五轴 + 数据多边形 + 顶点 + 标签） */
async function drawRadar() {
  const r = result.value
  if (!r) return
  try {
    await renderToCanvas('#hepan-radar', { width: RADAR_W, height: RADAR_H }, (ctx) => {
      const cx = RADAR_W / 2
      const cy = RADAR_H / 2 - 6
      const R = 74
      const n = r.aspects.length
      const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
      const pt = (i: number, ratio: number): [number, number] => [
        cx + R * ratio * Math.cos(angle(i)),
        cy + R * ratio * Math.sin(angle(i)),
      ]

      ctx.clearRect(0, 0, RADAR_W, RADAR_H)

      // 三层网格五边形
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'
      ctx.lineWidth = 1
      for (const ratio of [0.33, 0.66, 1]) {
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const [x, y] = pt(i, ratio)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.stroke()
      }

      // 五轴
      for (let i = 0; i < n; i++) {
        const [x, y] = pt(i, 1)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(x, y)
        ctx.stroke()
      }

      // 数据多边形
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const [x, y] = pt(i, r.aspects[i].score / 100)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(196,30,58,0.2)'
      ctx.fill()
      ctx.strokeStyle = '#c41e3a'
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.stroke()

      // 顶点
      ctx.fillStyle = '#c41e3a'
      for (let i = 0; i < n; i++) {
        const [x, y] = pt(i, r.aspects[i].score / 100)
        ctx.beginPath()
        ctx.arc(x, y, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }

      // 标签
      ctx.fillStyle = '#8a8a8a'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < n; i++) {
        const [x, y] = pt(i, 1.26)
        ctx.fillText(`${r.aspects[i].label.slice(0, 4)} ${r.aspects[i].score}`, x, y)
      }
    })
  } catch {
    /* canvas 不可用时静默降级：分项条已完整表达同一信息 */
  }
}

onReady(() => {
  nextTick(drawRadar)
})
watch(result, () => {
  nextTick(drawRadar)
})

function onShare() {
  const r = result.value
  if (!r) return
  const nameA = r.personA.name || '甲方'
  const nameB = r.personB.name || '乙方'
  const txt = [
    `【八字合盘 · ${scene.value.label}】`,
    `${nameA}（属${r.personA.zodiac} ${r.personA.dayMaster}） × ${nameB}（属${r.personB.zodiac} ${r.personB.dayMaster}）`,
    `契合总分：${r.totalScore} 分`,
    r.totalBrief,
    ...r.aspects.map((a) => `${a.label} ${a.score}分：${a.brief}`),
  ].join('\n')
  uni.setClipboardData({
    data: txt,
    success: () => uni.showToast({ title: '盘面已复制', icon: 'none' }),
  })
}
</script>

<template>
  <view class="page">
    <tool-header title="八字合盘" back-href="/paipan/hepan" share @share="onShare" />

    <!-- 错误态 -->
    <param-error v-if="loadError" :text="loadError" action-text="返回合盘" @action="navigateTo('/paipan/hepan')" />

    <scroll-view v-else-if="result" scroll-y class="body">
      <view class="body-inner">
        <!-- ── 主盘面：场景 + 双柱对照 + 合害标签 + 总分 + 分项条 ── -->
        <paper-card padding="none">
          <view class="banner">
            <text class="banner-tag">{{ scene.label }}</text>
            <text class="banner-sub">{{ scene.desc }}</text>
          </view>

          <view class="plate">
            <!-- 双柱对照 -->
            <view class="duo">
              <view class="col">
                <view class="col-head">
                  <text class="col-name">{{ result.personA.name || scene.roleA }}</text>
                  <text class="col-meta">属{{ result.personA.zodiac }} · {{ result.personA.dayMaster }}</text>
                </view>
                <text class="col-lunar">{{ result.personA.birthLunar }}</text>
                <view class="pillars">
                  <view v-for="(p, i) in result.personA.pillars" :key="i" class="pillar">
                    <text class="pillar-label">{{ PILLAR_LABELS[i] }}</text>
                    <view class="pillar-box" :class="{ 'pillar-day': i === 2 }">
                      <text class="pillar-gz" :class="{ 'pillar-gz-day': i === 2 }">{{ p.gan }}</text>
                      <text class="pillar-gz" :class="{ 'pillar-gz-day': i === 2 }">{{ p.zhi }}</text>
                    </view>
                  </view>
                </view>
              </view>

              <text class="duo-x">×</text>

              <view class="col col-right">
                <view class="col-head col-head-right">
                  <text class="col-name">{{ result.personB.name || scene.roleB }}</text>
                  <text class="col-meta">属{{ result.personB.zodiac }} · {{ result.personB.dayMaster }}</text>
                </view>
                <text class="col-lunar col-lunar-right">{{ result.personB.birthLunar }}</text>
                <view class="pillars pillars-right">
                  <view v-for="(p, i) in result.personB.pillars" :key="i" class="pillar">
                    <text class="pillar-label">{{ PILLAR_LABELS[i] }}</text>
                    <view class="pillar-box" :class="{ 'pillar-day': i === 2 }">
                      <text class="pillar-gz" :class="{ 'pillar-gz-day': i === 2 }">{{ p.gan }}</text>
                      <text class="pillar-gz" :class="{ 'pillar-gz-day': i === 2 }">{{ p.zhi }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 两造干支合冲害标签 -->
            <view class="links">
              <text
                v-for="(l, i) in result.pillarLinks"
                :key="i"
                class="link-tag"
                :class="`link-${l.luck}`"
              >
                {{ l.label }}
              </text>
            </view>

            <!-- 总分环 + 五维分项条 -->
            <view class="score-row">
              <view class="ring" :style="ringStyle">
                <view class="ring-inner">
                  <text class="ring-score">{{ result.totalScore }}</text>
                  <text class="ring-label">契合总分</text>
                </view>
              </view>
              <view class="bars">
                <view v-for="a in result.aspects" :key="a.key" class="bar-row" @tap="detailAspect = a">
                  <text class="bar-label">{{ a.label }}</text>
                  <view class="bar-track">
                    <view class="bar-fill" :style="{ width: `${a.score}%` }" />
                  </view>
                  <text class="bar-score">{{ a.score }}</text>
                  <app-icon name="chevron-right" :size="22" color="var(--text-soft)" />
                </view>
              </view>
            </view>

            <!-- 总评 -->
            <view class="brief">
              <text class="brief-text">{{ result.totalBrief }}</text>
            </view>
          </view>
        </paper-card>

        <!-- 综合判词 -->
        <view class="judge-card">
          <view class="judge-head">
            <view class="judge-bar" />
            <text class="judge-title">综合判词</text>
          </view>
          <text class="judge-text">{{ result.totalJudgment }}</text>
          <view class="judge-foot">
            <text class="judge-foot-text">判词依《三命通会》《渊海子平》《子平真诠》体例合参而成</text>
          </view>
        </view>

        <!-- 五维契合雷达 -->
        <paper-card>
          <text class="sec-title">五维契合雷达</text>
          <view class="radar-wrap">
            <canvas
              id="hepan-radar"
              canvas-id="hepan-radar"
              type="2d"
              class="radar-canvas"
              :style="{ width: RADAR_W + 'px', height: RADAR_H + 'px' }"
            />
          </view>
        </paper-card>

        <!-- 五行互补对照 -->
        <paper-card>
          <text class="sec-title">五行互补</text>
          <view class="wx-list">
            <view v-for="(w, i) in WUXING_LABELS" :key="w" class="wx-row">
              <text class="wx-pct wx-pct-left">{{ result.personA.wuxing[i] }}%</text>
              <view class="wx-track wx-track-left">
                <view
                  class="wx-fill"
                  :style="{ width: `${result.personA.wuxing[i]}%`, background: WUXING_COLORS[i], opacity: 0.7 }"
                />
              </view>
              <text class="wx-name">{{ w }}</text>
              <view class="wx-track">
                <view
                  class="wx-fill"
                  :style="{ width: `${result.personB.wuxing[i]}%`, background: WUXING_COLORS[i] }"
                />
              </view>
              <text class="wx-pct">{{ result.personB.wuxing[i] }}%</text>
            </view>
          </view>
          <view class="wx-legend">
            <text class="wx-legend-text">{{ result.personA.name || scene.roleA }}</text>
            <text class="wx-legend-text">{{ result.personB.name || scene.roleB }}</text>
          </view>
        </paper-card>

        <!-- 相合亮点 -->
        <paper-card>
          <text class="sec-title sec-title-good">相合亮点</text>
          <view class="item-list">
            <view v-for="(h, i) in result.highlights" :key="i" class="item">
              <view class="item-dot item-dot-good" />
              <view class="item-body">
                <text class="item-text">{{ h.text }}</text>
                <text v-if="h.source" class="item-src">《{{ h.source }}》：「{{ h.quote }}」</text>
              </view>
            </view>
          </view>
        </paper-card>

        <!-- 相处提醒 -->
        <paper-card>
          <text class="sec-title sec-title-bad">相处提醒</text>
          <view class="item-list">
            <view v-for="(r, i) in result.risks" :key="i" class="item">
              <view class="item-dot item-dot-bad" />
              <view class="item-body">
                <text class="item-text">{{ r.text }}</text>
                <text v-if="r.source" class="item-src">《{{ r.source }}》：「{{ r.quote }}」</text>
              </view>
            </view>
          </view>
        </paper-card>

        <!-- 古籍论合 -->
        <paper-card>
          <view class="sec-head">
            <app-icon name="book-open" :size="30" color="#b8985f" />
            <text class="sec-title">古籍论合</text>
          </view>
          <view class="gu-list">
            <view v-for="(g, i) in result.gudianRefs" :key="i" class="gu-item">
              <text class="gu-src">《{{ g.source }}》</text>
              <text class="gu-quote">{{ g.quote }}</text>
              <view class="gu-note">
                <text class="gu-note-text"><text class="gu-note-key">应于本盘：</text>{{ g.note }}</text>
              </view>
            </view>
          </view>
        </paper-card>

        <!-- 经营建议 -->
        <paper-card>
          <text class="sec-title">经营建议</text>
          <view class="adv-list">
            <view v-for="(a, i) in result.advice" :key="i" class="adv-item">
              <text class="adv-idx">{{ i + 1 }}</text>
              <text class="adv-text">{{ a }}</text>
            </view>
          </view>
        </paper-card>

        <generate-report-button
          v-if="result && params"
          tool-key="hepan"
          tool-label="八字合盘"
          :client-name="`${params.a.name || '男方'} · ${params.b.name || '女方'}`"
          client-birth=""
          :data="result as any"
          :summary="hepanSummary"
        />

        <disclaimer
          variant="custom"
          tone="subtle"
          text="八字合盘为传统命理学说，所示契合分数与断语仅供文化研究与参考，不构成任何婚恋、合作决策建议。"
        />
      </view>
    </scroll-view>

    <!-- 分项详批弹层 -->
    <view v-if="detailAspect" class="mask" @tap="detailAspect = null">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <view class="sheet-title-row">
            <text class="sheet-title">{{ detailAspect.label }}</text>
            <text class="sheet-score">{{ detailAspect.score }} 分</text>
          </view>
          <view class="sheet-close" @tap="detailAspect = null">
            <app-icon name="x" :size="32" color="var(--text-soft)" />
          </view>
        </view>
        <text class="sheet-brief">{{ detailAspect.brief }}</text>
        <scroll-view scroll-y class="sheet-body">
          <view class="sheet-judge">
            <text class="sheet-judge-label">断语参考</text>
            <text class="sheet-judge-text">{{ detailAspect.judgment }}</text>
          </view>
          <view class="sheet-gu">
            <text class="sheet-gu-label">《{{ detailAspect.gudian.source }}》古籍参考</text>
            <text class="sheet-gu-text">{{ detailAspect.gudian.text }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 24rpx 48rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* 缺参空态样式已抽至 @/components/paipan/param-error.vue */

/* 场景横幅 */
.banner {
  display: flex; align-items: center; gap: 16rpx;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.08), rgba(196, 30, 58, 0.02));
  border-bottom: 1rpx solid var(--line);
}
.banner-tag {
  padding: 6rpx 20rpx; border-radius: 999rpx;
  background: var(--brand); color: #fff;
  font-size: 24rpx; font-weight: 700; flex-shrink: 0;
}
.banner-sub { font-size: 22rpx; color: var(--text-soft); }

.plate { padding: 28rpx; }

/* 双柱对照 */
.duo { display: flex; align-items: flex-start; gap: 12rpx; }
.col { flex: 1; min-width: 0; }
.col-right { align-items: flex-end; }
.col-head { display: flex; align-items: baseline; gap: 10rpx; }
.col-head-right { justify-content: flex-end; }
.col-name { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.col-meta { font-size: 20rpx; color: var(--text-soft); }
.col-lunar { display: block; margin-top: 4rpx; font-size: 20rpx; color: var(--text-soft); }
.col-lunar-right { text-align: right; }
.pillars { display: flex; gap: 8rpx; margin-top: 16rpx; }
.pillars-right { justify-content: flex-end; }
.pillar { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.pillar-label { font-size: 18rpx; color: var(--text-soft); }
.pillar-box {
  display: flex; flex-direction: column; align-items: center;
  padding: 10rpx 12rpx; border-radius: 10rpx;
  background: rgba(0, 0, 0, 0.03);
}
.pillar-day { background: rgba(196, 30, 58, 0.1); border: 2rpx solid rgba(196, 30, 58, 0.3); }
.pillar-gz { font-family: $serif; font-size: 28rpx; font-weight: 700; color: var(--text-ink); line-height: 1.2; }
.pillar-gz-day { color: var(--brand); }
.duo-x { margin-top: 56rpx; font-family: $serif; font-size: 32rpx; font-weight: 700; color: rgba(196, 30, 58, 0.6); flex-shrink: 0; }

/* 合冲害标签 */
.links { display: flex; flex-wrap: wrap; justify-content: center; gap: 12rpx; margin-top: 24rpx; }
.link-tag { padding: 6rpx 16rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 500; border: 2rpx solid; }
.link-good { border-color: rgba(47, 157, 106, 0.4); background: rgba(47, 157, 106, 0.08); color: #2f9d6a; }
.link-bad { border-color: rgba(196, 30, 58, 0.4); background: rgba(196, 30, 58, 0.06); color: var(--brand); }
.link-neutral { border-color: rgba(212, 160, 23, 0.4); background: rgba(212, 160, 23, 0.08); color: #b8860b; }

/* 总分环 + 分项条 */
.score-row {
  display: flex; align-items: center; gap: 24rpx;
  margin-top: 28rpx; padding-top: 28rpx;
  border-top: 1rpx solid var(--line);
}
.ring {
  width: 160rpx; height: 160rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ring-inner {
  width: 128rpx; height: 128rpx; border-radius: 50%;
  background: var(--card);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.ring-score { font-size: 44rpx; font-weight: 700; color: var(--brand); line-height: 1; }
.ring-label { font-size: 18rpx; color: var(--text-soft); margin-top: 4rpx; }
.bars { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12rpx; }
.bar-row { display: flex; align-items: center; gap: 10rpx; }
.bar-row:active { opacity: 0.7; }
.bar-label { width: 112rpx; flex-shrink: 0; font-size: 22rpx; color: var(--text-soft); }
.bar-track { flex: 1; height: 12rpx; border-radius: 999rpx; background: rgba(0, 0, 0, 0.06); overflow: hidden; min-width: 0; }
.bar-fill { height: 100%; border-radius: 999rpx; background: var(--brand); }
.bar-score { width: 48rpx; flex-shrink: 0; text-align: right; font-size: 22rpx; font-weight: 700; color: var(--brand); }

/* 总评 */
.brief { margin-top: 24rpx; padding: 20rpx 24rpx; border-radius: 12rpx; background: rgba(0, 0, 0, 0.03); }
.brief-text { font-size: 24rpx; line-height: 1.6; color: var(--text-ink); }

/* 综合判词 */
.judge-card {
  padding: 28rpx;
  border-radius: 20rpx;
  background: var(--card);
  border: 2rpx solid rgba(212, 160, 23, 0.4);
}
.judge-head { display: flex; align-items: center; gap: 12rpx; }
.judge-bar { width: 8rpx; height: 28rpx; border-radius: 999rpx; background: #b8860b; }
.judge-title { font-size: 28rpx; font-weight: 700; color: #8a6d1b; }
.judge-text { display: block; margin-top: 16rpx; font-family: $serif; font-size: 26rpx; line-height: 1.9; color: var(--text-ink); }
.judge-foot { margin-top: 16rpx; padding-top: 12rpx; border-top: 2rpx dashed rgba(212, 160, 23, 0.3); }
.judge-foot-text { font-size: 20rpx; color: var(--text-soft); }

/* 分区标题 */
.sec-title { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.sec-title-good { color: #2f9d6a; }
.sec-title-bad { color: var(--brand); }
.sec-head { display: flex; align-items: center; gap: 12rpx; }

/* 雷达 */
.radar-wrap { display: flex; justify-content: center; margin-top: 16rpx; }
.radar-canvas { display: block; }

/* 五行互补 */
.wx-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 12rpx; }
.wx-row { display: flex; align-items: center; gap: 10rpx; }
.wx-pct { width: 60rpx; flex-shrink: 0; font-size: 20rpx; color: var(--text-soft); }
.wx-pct-left { text-align: right; }
.wx-track { flex: 1; height: 14rpx; border-radius: 999rpx; background: rgba(0, 0, 0, 0.06); overflow: hidden; min-width: 0; display: flex; }
.wx-track-left { justify-content: flex-end; }
.wx-fill { height: 100%; border-radius: 999rpx; }
.wx-name { width: 40rpx; flex-shrink: 0; text-align: center; font-size: 24rpx; font-weight: 700; color: var(--text-ink); }
.wx-legend { display: flex; justify-content: space-between; margin-top: 12rpx; }
.wx-legend-text { font-size: 20rpx; color: var(--text-soft); }

/* 亮点/提醒 */
.item-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 18rpx; }
.item { display: flex; align-items: flex-start; gap: 12rpx; }
.item-dot { width: 10rpx; height: 10rpx; border-radius: 50%; margin-top: 12rpx; flex-shrink: 0; }
.item-dot-good { background: #2f9d6a; }
.item-dot-bad { background: var(--brand); }
.item-body { flex: 1; min-width: 0; }
.item-text { font-size: 24rpx; line-height: 1.6; color: var(--text-ink); }
.item-src { display: block; margin-top: 6rpx; font-family: $serif; font-size: 20rpx; line-height: 1.5; color: var(--text-soft); }

/* 古籍论合 */
.gu-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 24rpx; }
.gu-item { padding-left: 20rpx; border-left: 4rpx solid rgba(212, 160, 23, 0.5); }
.gu-src { font-size: 20rpx; font-weight: 700; color: #8a6d1b; }
.gu-quote { display: block; margin-top: 6rpx; font-family: $serif; font-size: 24rpx; line-height: 1.7; color: var(--text-ink); }
.gu-note { margin-top: 12rpx; padding: 14rpx 18rpx; border-radius: 12rpx; background: rgba(0, 0, 0, 0.03); }
.gu-note-text { font-size: 22rpx; line-height: 1.6; color: var(--text-soft); }
.gu-note-key { font-weight: 700; color: var(--text-ink); }

/* 经营建议 */
.adv-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 14rpx; }
.adv-item { display: flex; align-items: flex-start; gap: 14rpx; }
.adv-idx {
  width: 32rpx; height: 32rpx; border-radius: 50%; flex-shrink: 0;
  background: rgba(196, 30, 58, 0.1); color: var(--brand);
  font-size: 20rpx; font-weight: 700; text-align: center; line-height: 32rpx;
  margin-top: 4rpx;
}
.adv-text { flex: 1; font-size: 24rpx; line-height: 1.6; color: var(--text-ink); }

/* 分项详批弹层 */
.mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 50; background: rgba(0, 0, 0, 0.4); display: flex; align-items: flex-end; }
.sheet {
  width: 100%; max-height: 75vh;
  padding: 32rpx 32rpx 56rpx;
  border-radius: 32rpx 32rpx 0 0;
  background: var(--bg-paper);
  display: flex; flex-direction: column;
}
.sheet-head { display: flex; align-items: center; justify-content: space-between; }
.sheet-title-row { display: flex; align-items: center; gap: 16rpx; }
.sheet-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.sheet-score {
  padding: 4rpx 16rpx; border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.1); color: var(--brand);
  font-size: 22rpx; font-weight: 700;
}
.sheet-close { padding: 8rpx; }
.sheet-brief { display: block; margin-top: 8rpx; font-size: 22rpx; color: var(--text-soft); }
.sheet-body { flex: 1; margin-top: 24rpx; }
.sheet-judge { padding: 24rpx; border-radius: 16rpx; border: 2rpx solid rgba(212, 160, 23, 0.5); background: rgba(212, 160, 23, 0.06); }
.sheet-judge-label { font-size: 22rpx; font-weight: 700; color: #8a6d1b; }
.sheet-judge-text { display: block; margin-top: 8rpx; font-size: 26rpx; line-height: 1.7; color: var(--text-ink); }
.sheet-gu { margin-top: 24rpx; padding: 24rpx; border-radius: 16rpx; background: rgba(0, 0, 0, 0.03); }
.sheet-gu-label { font-size: 22rpx; font-weight: 700; color: var(--text-soft); }
.sheet-gu-text { display: block; margin-top: 8rpx; font-family: $serif; font-size: 26rpx; line-height: 1.7; color: var(--text-ink); }
</style>
