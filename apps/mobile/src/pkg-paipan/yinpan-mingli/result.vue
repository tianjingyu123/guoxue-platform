<script setup lang="ts">
/**
 * 阴盘命理奇门·结果页（自 V0 app/yinpan-mingli/result/page.tsx 还原）
 * onLoad 解析 payload 后本地重算：qimen-engine（出生时间数理起局 mingliJu，可手调/指定局覆盖）
 * + bazi-engine（大运/流年）。结构：命主信息表 → 主盘 → 颜色说明 → 大运（展开流年，点干支
 * 落宫联动高亮）→ 流年 → 功能开关 → 移星换斗8盘 → 宫位详解 → 底部工具条。AI 区块砍除。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ToolHeader from '@/components/paipan/tool-header.vue'
import ParamError from '@/components/paipan/param-error.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import NotesPanel from '@/components/bazi/notes-panel.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  computeQimen,
  mingliJu,
  PALACE_NAMES,
  PALACE_DIZHI,
  type QimenResult,
} from '@/pkg-paipan/lib/qimen-engine'
import { computeBazi, lunarText, type BaziData } from '@/pkg-paipan/lib/bazi-engine'
import { trueSolarTime } from '@/lib/paipan/ganzhi'
import { formatJieqiRange } from '@/lib/paipan/jieqi'
import {
  type PalaceData,
  type ShenjiangMode,
  DIZHI,
  toYinpanVM,
  rotateBoard,
  buildOuterRing,
  yuejiangZhiOf,
  yearGZ,
} from '@/pkg-paipan/yinpan/yinpan-core'
import YinpanBoard from '@/pkg-paipan/yinpan/yinpan-board.vue'
import YinpanPalaceDetail from '@/pkg-paipan/yinpan/yinpan-palace-detail.vue'
import { saveMingliHistory, type MingliParams } from './yinpan-mingli-history'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '阴盘命理奇门'
// #ifdef MP-WEIXIN
hdrTitle = '命理文化研究'
// #endif

// ─── 五行配色（干支 → class）───
const WX_CLS: Record<string, string> = {
  甲: 'wx-mu', 乙: 'wx-mu', 寅: 'wx-mu', 卯: 'wx-mu',
  丙: 'wx-huo', 丁: 'wx-huo', 巳: 'wx-huo', 午: 'wx-huo',
  戊: 'wx-tu', 己: 'wx-tu', 辰: 'wx-tu', 戌: 'wx-tu', 丑: 'wx-tu', 未: 'wx-tu',
  庚: 'wx-jin', 辛: 'wx-jin', 申: 'wx-jin', 酉: 'wx-jin',
  壬: 'wx-shui', 癸: 'wx-shui', 子: 'wx-shui', 亥: 'wx-shui',
}
function wx(c: string) {
  return WX_CLS[c] || ''
}

/** 生肖（按年支） */
const SHENGXIAO: Record<string, string> = {
  子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇',
  午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// ─── 状态 ───
const params = ref<MingliParams | null>(null)
const loadError = ref('')
/** 局数覆盖（上局/下局切换；null=入参指定局或数理自动定局） */
const juOverride = ref<{ isYang: boolean; num: number } | null>(null)

// 功能开关
const showChangsheng = ref(false)
const showYixing = ref(false)
const showTianmen = ref(false)
const shenjiangMode = ref<ShenjiangMode | null>(null)
const selectedPalace = ref<number | null>(null)
const showNotes = ref(false)
const expandedDaYun = ref<number | null>(null)
/** 运年联动：点大运/流年，其干支落宫在盘面高亮 */
const linkedGanZhi = ref<{ gan: string; zhi: string; label: string } | null>(null)

onLoad((q: Record<string, string> = {}) => {
  try {
    if (!q.payload) throw new Error('缺少排盘参数')
    const p = JSON.parse(decodeURIComponent(q.payload)) as Partial<MingliParams>
    const year = Number(p.year)
    const month = Number(p.month)
    const day = Number(p.day)
    const hour = Number(p.hour)
    const minute = Number(p.minute)
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) throw new Error('排盘参数不完整')
    params.value = {
      name: String(p.name || ''),
      gender: p.gender === 'female' ? 'female' : 'male',
      year, month, day, hour, minute,
      customJu: String(p.customJu || ''),
      trueSolar: p.trueSolar !== false,
      earlyZi: p.earlyZi === true,
      lat: Number(p.lat) || 38.93,
      lng: Number(p.lng) || 115.42,
    }
    // 记入本地排盘记录
    if (qr.value) saveMingliHistory(params.value, juLabel.value)
  } catch (e) {
    loadError.value = (e as Error)?.message || '排盘参数无效'
  }
})

// ─── 真实排盘（以出生时间起局，阴盘=转盘）───
const birthDate = computed(() => {
  const p = params.value
  if (!p) return null
  const raw = new Date(p.year, p.month - 1, p.day, p.hour, p.minute)
  return p.trueSolar ? trueSolarTime(raw, p.lng) : raw
})

const qr = computed<QimenResult | null>(() => {
  const d = birthDate.value
  const p = params.value
  if (!d || !p) return null
  try {
    // 命理奇门：数理起局（农历年支+月+日+时支 mod 9），可被指定局/手调局覆盖
    const auto = mingliJu(d)
    const ov = juOverride.value
    const overrideLabel =
      (ov && `${ov.isYang ? '阳遁' : '阴遁'}${ov.num}局`) ||
      p.customJu ||
      `${auto.isYang ? '阳遁' : '阴遁'}${auto.num}局`
    return computeQimen(d, {
      panMethod: 'zhuan',
      startMethod: 'custom',
      customJu: overrideLabel,
      anganMethod: 'zhishi',
    })
  } catch {
    return null
  }
})

const bz = computed<BaziData | null>(() => {
  const p = params.value
  if (!p) return null
  try {
    return computeBazi({
      name: p.name, gender: p.gender,
      year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute,
      useTrueSolar: p.trueSolar, earlyZi: p.earlyZi,
    })
  } catch {
    return null
  }
})

const palaces = computed<Record<number, PalaceData>>(() => (qr.value ? toYinpanVM(qr.value) : {}))

// ─── 派生展示 ───
const sizhu = computed(() => {
  const r = qr.value
  if (!r) return []
  return [
    { label: '年柱', g: r.sizhu.year.gan, z: r.sizhu.year.zhi },
    { label: '月柱', g: r.sizhu.month.gan, z: r.sizhu.month.zhi },
    { label: '日柱', g: r.sizhu.day.gan, z: r.sizhu.day.zhi },
    { label: '时柱', g: r.sizhu.hour.gan, z: r.sizhu.hour.zhi },
  ]
})
const kongZhi = computed(() => qr.value?.kongwang[3]?.zhi || '')
const maZhi = computed(() => qr.value?.maXing || '')
const juLabel = computed(() => qr.value?.ju.label || '')
const shengxiao = computed(() => SHENGXIAO[qr.value?.sizhu.year.zhi || ''] || '')
const genderLabel = computed(() => (params.value?.gender === 'female' ? '女' : '男'))
const lunar = computed(() => {
  const p = params.value
  return p ? lunarText(p.year, p.month, p.day) : ''
})
const jieqiText = computed(() => (birthDate.value ? formatJieqiRange(birthDate.value) : ''))

const quickInfo = computed(() => {
  const r = qr.value
  if (!r) return []
  return [
    { h: '旬首', v: r.xunshou.name },
    { h: '值符', v: r.zhifu.star },
    { h: '值使', v: r.zhishi.men },
    { h: '马星', v: r.maXing },
    { h: '空亡', v: kongZhi.value },
  ]
})

// 月将 + 外圈神将
const yuejiangZhi = computed(() => (birthDate.value ? yuejiangZhiOf(birthDate.value) : '子'))
const yuejiangIdx = computed(() => DIZHI.indexOf(yuejiangZhi.value))
const outerRing = computed(() => buildOuterRing(showTianmen.value, shenjiangMode.value, yuejiangIdx.value))

// 大运/流年（八字引擎）
const daYunData = computed(() => bz.value?.daYun || [])
const liuNianData = computed(() => bz.value?.liuNian || [])
const expandedLiuNian = computed(() => {
  const i = expandedDaYun.value
  const dy = i === null ? null : daYunData.value[i]
  if (!dy) return []
  return Array.from({ length: 10 }, (_, k) => {
    const y = dy.year + k
    return { year: y, ...yearGZ(y) }
  })
})

// 运年联动落宫高亮
const linkedPalaces = computed<number[]>(() => {
  const l = linkedGanZhi.value
  if (!l) return []
  return Object.entries(palaces.value)
    .filter(
      ([p, d]) =>
        Number(p) !== 5 &&
        ([d.tianGan, d.diGan, d.tianGan2].includes(l.gan) || (PALACE_DIZHI[Number(p)] || []).includes(l.zhi)),
    )
    .map(([p]) => Number(p))
})

// 移星换斗
const yixingBoards = computed(() => {
  if (!showYixing.value || !qr.value) return []
  const base = palaces.value
  return Array.from({ length: 8 }, (_, i) => ({ rotate: i + 1, palaces: rotateBoard(base, i + 1) }))
})

const zhifuText = computed(() => {
  const r = qr.value
  if (!r) return ''
  return `当前：${juLabel.value} · 值符${r.zhifu.star}落${PALACE_NAMES[r.zhifu.palace]} · 值使${r.zhishi.men}落${PALACE_NAMES[r.zhishi.palace]}`
})

// ─── 交互 ───
function shiftJu(delta: 1 | -1) {
  const r = qr.value
  if (!r) return
  let num = r.ju.num + delta
  let isYang = r.ju.isYang
  if (num > 9) { num = 1; isYang = !isYang }
  if (num < 1) { num = 9; isYang = !isYang }
  juOverride.value = { isYang, num }
}

function toggleTianmen() {
  showTianmen.value = !showTianmen.value
  if (showTianmen.value) shenjiangMode.value = null
}

function toggleShenjiang(m: ShenjiangMode) {
  shenjiangMode.value = shenjiangMode.value === m ? null : m
  if (shenjiangMode.value) showTianmen.value = false
}

function onPalaceClick(p: number) {
  selectedPalace.value = selectedPalace.value === p ? null : p
}

function onDaYunTap(i: number) {
  const d = daYunData.value[i]
  if (!d) return
  expandedDaYun.value = expandedDaYun.value === i ? null : i
  linkedGanZhi.value = { gan: d.gan, zhi: d.zhi, label: `${d.year}大运` }
}

function onLiuNianTap(n: { year: number; gan: string; zhi: string }) {
  linkedGanZhi.value = { gan: n.gan, zhi: n.zhi, label: `${n.year}流年` }
}

function goToBazi() {
  const p = params.value
  if (!p) return
  const qs = [
    `name=${encodeURIComponent(p.name)}`,
    `gender=${p.gender}`,
    `year=${p.year}`, `month=${p.month}`, `day=${p.day}`,
    `hour=${p.hour}`, `minute=${p.minute}`,
  ].join('&')
  navigateTo(`/pkg-paipan/bazi/result?${qs}`)
}

function handleSave() {
  const p = params.value
  if (!p || !qr.value) return
  saveMingliHistory(p, juLabel.value)
  uni.showToast({ title: '已保存到排盘记录', icon: 'success' })
}

function handleShare() {
  const p = params.value
  const r = qr.value
  if (!p || !r) return
  const txt = [
    `【${hdrTitle}】`,
    `命主：${p.name || '未填写'}（${genderLabel.value} · 属${shengxiao.value}）`,
    `出生：${p.year}年${pad(p.month)}月${pad(p.day)}日 ${p.hour}时${p.minute}分${lunar.value ? `（农历${lunar.value}）` : ''}`,
    `${juLabel.value}【月将${yuejiangZhi.value}】· 旬首${r.xunshou.name} · 值符${r.zhifu.star} · 值使${r.zhishi.men}`,
    `四柱：${sizhu.value.map((z) => z.g + z.z).join(' ')}`,
    '—— 来自热卜 · 专业排盘工具',
  ].join('\n')
  uni.setClipboardData({
    data: txt,
    success: () => uni.showToast({ title: '盘面已复制', icon: 'none' }),
  })
}

function goInput() {
  navigateTo('/pkg-paipan/yinpan-mingli/index')
}
</script>

<template>
  <view class="page">
    <tool-header :title="hdrTitle" @share="handleShare" />

    <!-- 参数错误态 -->
    <param-error v-if="loadError || !qr" :text="loadError || '排盘计算失败，请重新排盘'" action-text="重新排盘" @action="goInput" />

    <!-- 主体 -->
    <scroll-view v-else scroll-y class="body">
      <view class="body-inner">
        <!-- ── 命主信息表 ── -->
        <view class="card">
          <view class="tr">
            <view class="td-label"><text class="td-label-text">名称</text></view>
            <view class="td-val">
              <text class="td-text">{{ params!.name || '未知' }}<text class="td-key">　性别：</text>{{ genderLabel }}<text class="td-key">　生肖：</text>{{ shengxiao }}</text>
            </view>
          </view>
          <view class="tr">
            <view class="td-label"><text class="td-label-text">出生</text></view>
            <view class="td-val">
              <text class="td-text">{{ params!.year }}年{{ params!.month }}月{{ params!.day }}日 {{ params!.hour }}时{{ pad(params!.minute) }}分<text v-if="lunar" class="td-muted">（{{ lunar }}）</text></text>
            </view>
          </view>
          <view class="tr">
            <view class="td-label"><text class="td-label-text">节气</text></view>
            <view class="td-val">
              <text class="td-text td-small">{{ jieqiText }}　月将<text class="td-strong">{{ yuejiangZhi }}</text>　<text class="td-strong">{{ juLabel }}</text></text>
            </view>
          </view>
          <!-- 旬首/值符/值使/马星/空亡 -->
          <view class="quick5">
            <view v-for="it in quickInfo" :key="it.h" class="quick5-col">
              <view class="quick5-h"><text class="quick5-h-text">{{ it.h }}</text></view>
              <view class="quick5-v"><text class="quick5-v-text">{{ it.v }}</text></view>
            </view>
          </view>
          <!-- 四柱（五行配色） -->
          <view class="sizhu-row">
            <view class="sizhu-side"><text class="sizhu-side-text">四柱</text></view>
            <view v-for="z in sizhu" :key="z.label" class="sizhu-col">
              <text class="sizhu-h">{{ z.label }}</text>
              <text class="sizhu-gz" :class="wx(z.g)">{{ z.g }}</text>
              <text class="sizhu-gz" :class="wx(z.z)">{{ z.z }}</text>
            </view>
          </view>
        </view>

        <!-- ── 运年联动提示 ── -->
        <view v-if="linkedGanZhi" class="link-tip">
          <view class="link-chip">
            <text class="link-chip-text">{{ linkedGanZhi.label }}（{{ linkedGanZhi.gan }}{{ linkedGanZhi.zhi }}）落宫高亮</text>
          </view>
          <text class="link-clear" @tap="linkedGanZhi = null">清除</text>
        </view>

        <!-- ── 主盘 ── -->
        <yinpan-board
          :palaces="palaces"
          :show-changsheng="showChangsheng"
          :kong-zhi="kongZhi"
          :ma-zhi="maZhi"
          :outer-ring="outerRing"
          :highlight="linkedPalaces"
          @palace="onPalaceClick"
        />

        <!-- ── 颜色说明 ── -->
        <view class="legend">
          <text class="legend-text">颜色说明：<text class="lg-rm">入墓</text>、<text class="lg-jx">击刑</text>、<text class="lg-mp">门迫</text>、<text class="lg-xm">刑+墓</text>；点击宫位查看信息</text>
        </view>

        <!-- ── 大运 ── -->
        <view class="card dy-card">
          <view class="dy-head">
            <text class="dy-title">大运</text>
            <text class="dy-tip">点击看落宫 · 展开流年</text>
          </view>
          <view class="dy-row dy-yrs">
            <text v-for="(d, i) in daYunData" :key="i" class="dy-yr">{{ d.year }}</text>
          </view>
          <view class="dy-row">
            <view
              v-for="(d, i) in daYunData" :key="i"
              class="dy-cell"
              :class="{ 'dy-act': d.active, 'dy-exp': expandedDaYun === i }"
              @tap="onDaYunTap(i)"
            >
              <text class="dy-gz" :class="wx(d.gan)">{{ d.gan }}</text>
              <text class="dy-ss">{{ d.shiShen }}</text>
            </view>
          </view>
          <view class="dy-row">
            <view
              v-for="(d, i) in daYunData" :key="i"
              class="dy-cell"
              :class="{ 'dy-act': d.active, 'dy-exp': expandedDaYun === i }"
              @tap="onDaYunTap(i)"
            >
              <text class="dy-gz" :class="wx(d.zhi)">{{ d.zhi }}</text>
              <text class="dy-ss">{{ d.shiShenZhi }}</text>
            </view>
          </view>
          <!-- 展开流年 -->
          <view v-if="expandedDaYun !== null && daYunData[expandedDaYun]" class="dy-expand">
            <view class="dy-expand-head">
              <text class="dy-expand-t">{{ daYunData[expandedDaYun]!.year }}-{{ daYunData[expandedDaYun]!.year + 9 }} 流年</text>
              <text class="dy-expand-close" @tap="expandedDaYun = null">收起</text>
            </view>
            <view class="dy-expand-grid">
              <view v-for="n in expandedLiuNian" :key="n.year" class="dy-expand-cell" @tap="onLiuNianTap(n)">
                <text class="dy-expand-yr">{{ n.year }}</text>
                <text class="dy-expand-gz" :class="wx(n.gan)">{{ n.gan }}</text>
                <text class="dy-expand-gz" :class="wx(n.zhi)">{{ n.zhi }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ── 流年 ── -->
        <view class="card dy-card">
          <view class="dy-head"><text class="dy-title">流年</text><text class="dy-tip">点击看落宫</text></view>
          <view class="ln-row dy-yrs">
            <text v-for="(n, i) in liuNianData" :key="i" class="ln-yr">{{ n.year }}</text>
          </view>
          <view class="ln-row">
            <view v-for="(n, i) in liuNianData" :key="i" class="ln-cell" :class="{ 'dy-act': n.active }" @tap="onLiuNianTap(n)">
              <text class="ln-gz" :class="wx(n.gan)">{{ n.gan }}</text>
              <text class="ln-ss">{{ n.shiShen }}</text>
            </view>
          </view>
          <view class="ln-row">
            <view v-for="(n, i) in liuNianData" :key="i" class="ln-cell" :class="{ 'dy-act': n.active }" @tap="onLiuNianTap(n)">
              <text class="ln-gz" :class="wx(n.zhi)">{{ n.zhi }}</text>
              <text class="ln-ss">{{ n.shiShenZhi }}</text>
            </view>
          </view>
          <view class="ln-row ln-ages">
            <!-- 竞品用虚岁：出生当年即1岁 -->
            <text v-for="(n, i) in liuNianData" :key="i" class="ln-age" :class="{ 'dy-act': n.active }">{{ n.age + 1 }}岁</text>
          </view>
        </view>

        <!-- ── 功能开关 ── -->
        <view class="toggles">
          <view class="tg" :class="{ 'tg-on': showYixing }" @tap="showYixing = !showYixing">
            <text class="tg-text">移星换斗</text>
          </view>
          <view class="tg" :class="{ 'tg-on': showTianmen }" @tap="toggleTianmen">
            <text class="tg-text">天门地户</text>
          </view>
          <view class="tg" :class="{ 'tg-on': showChangsheng }" @tap="showChangsheng = !showChangsheng">
            <text class="tg-text">长生状态</text>
          </view>
          <view class="tg" @tap="goToBazi">
            <text class="tg-text">八字排盘</text>
          </view>
          <view class="tg" :class="{ 'tg-on': shenjiangMode === 'year' }" @tap="toggleShenjiang('year')">
            <text class="tg-text">年神将</text>
          </view>
          <view class="tg" :class="{ 'tg-on': shenjiangMode === 'month' }" @tap="toggleShenjiang('month')">
            <text class="tg-text">月神将</text>
          </view>
          <view class="tg" :class="{ 'tg-on': shenjiangMode === 'day' }" @tap="toggleShenjiang('day')">
            <text class="tg-text">日神将</text>
          </view>
          <view class="tg" :class="{ 'tg-on': shenjiangMode === 'hour' }" @tap="toggleShenjiang('hour')">
            <text class="tg-text">时神将</text>
          </view>
        </view>

        <!-- ── 当前局数 + 上局/下局 ── -->
        <view class="ju-nav">
          <view class="ju-nav-btn" @tap="shiftJu(-1)">
            <app-icon name="chevron-up" :size="24" color="var(--text-ink)" />
            <text class="ju-nav-btn-text">上局</text>
          </view>
          <text class="ju-nav-text">{{ zhifuText }}</text>
          <view class="ju-nav-btn" @tap="shiftJu(1)">
            <app-icon name="chevron-down" :size="24" color="var(--text-ink)" />
            <text class="ju-nav-btn-text">下局</text>
          </view>
        </view>

        <!-- ── 移星换斗盘（顺转1-8宫）── -->
        <view v-if="showYixing" class="yixing">
          <view v-for="b in yixingBoards" :key="b.rotate" class="yixing-item">
            <text class="yixing-title">【顺转{{ b.rotate }}宫】</text>
            <yinpan-board
              :palaces="b.palaces"
              :show-changsheng="false"
              :kong-zhi="kongZhi"
              :ma-zhi="maZhi"
              :outer-ring="null"
              :interactive="false"
            />
          </view>
        </view>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="本工具仅供传统文化爱好者研究学习使用，占测结果不构成任何预测或建议。"
        />
        <view class="bottom-space" />
      </view>
    </scroll-view>

    <!-- 宫位详解 -->
    <yinpan-palace-detail
      v-if="selectedPalace !== null && palaces[selectedPalace]"
      :palace="selectedPalace"
      :data="palaces[selectedPalace]!"
      @close="selectedPalace = null"
    />

    <!-- 底部工具条（AI 解析已砍） -->
    <view v-if="!loadError && qr" class="toolbar">
      <view class="tool-item" @tap="handleShare">
        <app-icon name="share-2" :size="36" color="var(--text-soft)" />
        <text class="tool-text">分享</text>
      </view>
      <view class="tool-item" @tap="showNotes = true">
        <app-icon name="book-open" :size="36" color="var(--text-soft)" />
        <text class="tool-text">笔记</text>
      </view>
      <view class="tool-item" @tap="handleSave">
        <app-icon name="save" :size="36" color="var(--text-soft)" />
        <text class="tool-text">保存</text>
      </view>
    </view>

    <!-- 笔记面板 -->
    <notes-panel :open="showNotes" @close="showNotes = false" />
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 16rpx 0 48rpx; display: flex; flex-direction: column; gap: 20rpx; }
.bottom-space { height: 120rpx; }

/* 缺参空态样式已抽至 @/components/paipan/param-error.vue */

/* 五行色 */
.wx-mu { color: #059669; }
.wx-huo { color: #dc2626; }
.wx-tu { color: #b45309; }
.wx-jin { color: #ca8a04; }
.wx-shui { color: #2563eb; }

/* ── 信息表 ── */
.card {
  margin: 0 24rpx;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.tr { display: flex; align-items: stretch; border-bottom: 1rpx solid var(--line); }
.td-label {
  width: 112rpx; flex-shrink: 0;
  padding: 14rpx 16rpx;
  background: rgba(0, 0, 0, 0.03);
  border-right: 1rpx solid var(--line);
  display: flex; align-items: center;
}
.td-label-text { font-size: 26rpx; color: #b45309; font-weight: 500; }
.td-val { flex: 1; min-width: 0; padding: 14rpx 16rpx; display: flex; align-items: center; }
.td-text { font-size: 26rpx; color: var(--text-ink); line-height: 1.6; }
.td-small { font-size: 22rpx; }
.td-key { color: #b45309; font-weight: 500; }
.td-muted { color: var(--text-soft); }
.td-strong { font-weight: 700; }

/* 五项速览 */
.quick5 { display: flex; border-bottom: 1rpx solid var(--line); }
.quick5-col { flex: 1; border-right: 1rpx solid var(--line); &:last-child { border-right: none; } }
.quick5-h { padding: 10rpx 0; background: rgba(0, 0, 0, 0.03); border-bottom: 1rpx solid var(--line); }
.quick5-h-text { display: block; text-align: center; font-size: 24rpx; color: #b45309; font-weight: 500; }
.quick5-v { padding: 14rpx 0; }
.quick5-v-text { display: block; text-align: center; font-size: 26rpx; color: var(--text-ink); }

/* 四柱 */
.sizhu-row { display: flex; align-items: stretch; }
.sizhu-side {
  width: 112rpx; flex-shrink: 0;
  background: rgba(0, 0, 0, 0.03);
  border-right: 1rpx solid var(--line);
  display: flex; align-items: center; justify-content: center;
}
.sizhu-side-text { font-size: 26rpx; color: #b45309; font-weight: 500; }
.sizhu-col {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  padding: 10rpx 0 14rpx;
  border-right: 1rpx solid var(--line);
  &:last-child { border-right: none; }
}
.sizhu-h { font-size: 24rpx; color: #b45309; font-weight: 500; margin-bottom: 6rpx; }
.sizhu-gz { font-family: $serif; font-size: 36rpx; font-weight: 700; color: var(--text-ink); line-height: 1.25; }

/* 运年联动提示 */
.link-tip { display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; }
.link-chip { background: rgba(196, 30, 58, 0.1); border-radius: 999rpx; padding: 8rpx 20rpx; }
.link-chip-text { font-size: 22rpx; color: var(--brand); font-weight: 500; }
.link-clear { font-size: 22rpx; color: var(--text-soft); text-decoration: underline; }

/* 颜色说明 */
.legend { padding: 0 24rpx; }
.legend-text { font-size: 22rpx; color: var(--text-soft); line-height: 1.7; }
.lg-rm { color: #d97706; font-weight: 500; }
.lg-jx { color: #9333ea; font-weight: 500; }
.lg-mp { color: #dc2626; font-weight: 500; }
.lg-xm { color: #0284c7; font-weight: 500; }

/* ── 大运/流年 ── */
.dy-card { padding-bottom: 8rpx; }
.dy-head {
  padding: 18rpx 24rpx;
  border-bottom: 1rpx solid var(--line);
  display: flex; align-items: center; justify-content: space-between;
}
.dy-title { font-size: 28rpx; font-weight: 700; color: var(--brand); }
.dy-tip { font-size: 22rpx; color: var(--text-soft); }
.dy-row { display: flex; }
.dy-yrs { padding-top: 10rpx; }
.dy-yr { flex: 1; text-align: center; font-size: 20rpx; color: var(--text-soft); }
.dy-cell {
  flex: 1;
  display: flex; align-items: baseline; justify-content: center;
  padding: 6rpx 0;
}
.dy-act { background: rgba(196, 30, 58, 0.08); }
.dy-exp { background: rgba(0, 0, 0, 0.05); }
.dy-gz { font-family: $serif; font-size: 38rpx; font-weight: 900; line-height: 1; }
.dy-ss { font-size: 18rpx; color: var(--text-soft); margin-left: 2rpx; }
.dy-expand { border-top: 1rpx solid var(--line); padding: 18rpx; background: rgba(0, 0, 0, 0.02); }
.dy-expand-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.dy-expand-t { font-size: 24rpx; color: var(--text-ink); font-weight: 500; }
.dy-expand-close { font-size: 24rpx; color: var(--brand); }
.dy-expand-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12rpx; }
.dy-expand-cell {
  background: var(--card);
  border: 2rpx solid var(--line);
  border-radius: 12rpx;
  padding: 12rpx 0;
  display: flex; flex-direction: column; align-items: center;
  &:active { border-color: rgba(196, 30, 58, 0.5); }
}
.dy-expand-yr { font-size: 20rpx; color: var(--text-soft); }
.dy-expand-gz { font-family: $serif; font-size: 30rpx; font-weight: 700; line-height: 1.3; }

.ln-row { display: flex; }
.ln-yr { flex: 1; text-align: center; font-size: 18rpx; color: var(--text-soft); }
.ln-cell { flex: 1; display: flex; align-items: baseline; justify-content: center; padding: 4rpx 0; }
.ln-gz { font-family: $serif; font-size: 32rpx; font-weight: 700; line-height: 1; }
.ln-ss { font-size: 16rpx; color: var(--text-soft); margin-left: 1rpx; }
.ln-ages { padding-bottom: 10rpx; }
.ln-age { flex: 1; text-align: center; font-size: 18rpx; color: var(--text-soft); }

/* ── 功能开关 ── */
.toggles {
  padding: 0 24rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.tg {
  height: 76rpx;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.85);
  display: flex; align-items: center; justify-content: center;
  &:active { background: var(--brand); }
}
.tg-on { background: var(--brand); box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.35), inset 0 0 0 4rpx rgba(255, 255, 255, 0.3); }
.tg-text { font-size: 26rpx; font-weight: 500; color: #fff; }

/* 局数导航 */
.ju-nav { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 0 24rpx; }
.ju-nav-btn {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 2rpx;
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  background: rgba(0, 0, 0, 0.05);
  &:active { background: rgba(0, 0, 0, 0.1); }
}
.ju-nav-btn-text { font-size: 22rpx; color: var(--text-ink); }
.ju-nav-text { font-size: 22rpx; color: var(--text-soft); text-align: center; line-height: 1.5; min-width: 0; }

/* 移星换斗 */
.yixing { display: flex; flex-direction: column; gap: 40rpx; }
.yixing-item { border-top: 1rpx solid var(--line); padding-top: 28rpx; display: flex; flex-direction: column; gap: 20rpx; }
.yixing-title { display: block; text-align: center; font-size: 28rpx; font-weight: 700; color: var(--text-ink); }

/* 底部工具条 */
.toolbar {
  position: fixed; left: 0; right: 0; bottom: 0;
  z-index: 30;
  background: var(--card);
  border-top: 2rpx solid var(--line);
  display: flex;
  padding: 12rpx 0 calc(12rpx + env(safe-area-inset-bottom));
}
.tool-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 8rpx 0; }
.tool-text { font-size: 22rpx; color: var(--text-soft); }
</style>
