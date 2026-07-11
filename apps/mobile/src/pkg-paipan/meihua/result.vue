<script setup lang="ts">
/**
 * 梅花易数结果页——自 V0 app/meihua/result/page.tsx 还原
 * onLoad 解析 payload（起卦输入）本地重算：四柱/农历/节气/神煞 + 本互变错综五卦 + 体用生克 + 卦辞断语。
 * V0 的「AI解析」按钮本批砍掉（不接假数据）；笔记复用 QimenNotesPanel；保存写本地存储。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { Solar } from '@/pkg-paipan/lib/lunar/index.js'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import AppIcon from '@/components/common/app-icon.vue'
import QimenNotesPanel from '@/components/qimen/notes-panel.vue'
import HexFigure from './components/hex-figure.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { fourPillars, GAN_WUXING, ZHI_WUXING, ZHIS, type FourPillars } from '@/lib/paipan/ganzhi'
import { formatJieqiRange } from '@/lib/paipan/jieqi'
import {
  BAGUA_NAMES,
  BAGUA_WX,
  BAGUA_LINES,
  HEX_NAMES,
  getPalace,
  GUACI,
  getTiyongRelation,
  TIYONG_JUDGE,
  CATEGORY_JUDGE,
  getCeShu,
  type TiyongRelation,
} from '@/pkg-paipan/lib/meihua-data'

const HISTORY_KEY = 'rebu:meihua:history'
const YAO_LABEL = ['初', '二', '三', '四', '五', '上']

// 五行配色（全局 --wuxing-* token）
const WX_COLOR: Record<string, string> = {
  木: 'var(--wuxing-wood)',
  火: 'var(--wuxing-fire)',
  土: 'var(--wuxing-earth)',
  金: 'var(--wuxing-metal)',
  水: 'var(--wuxing-water)',
}
function ganColor(g: string) { return WX_COLOR[GAN_WUXING[g]] || 'var(--text-ink)' }
function zhiColor(z: string) { return WX_COLOR[ZHI_WUXING[z]] || 'var(--text-ink)' }

// ─── 起卦输入（payload 解析） ───
const q = ref({
  matter: '',
  year: 2026, month: 7, day: 10, hour: 12, minute: 0,
  mode: 'time',
  numbers: '',
  plusHour: false,
  yaosParam: '',
  movingParam: '',
})
const ready = ref(false)
const invalid = ref(false)

onLoad((opts: Record<string, string> = {}) => {
  try {
    if (!opts.payload) throw new Error('missing payload')
    const p = JSON.parse(decodeURIComponent(opts.payload)) as Record<string, unknown>
    q.value = {
      matter: String(p.matter ?? ''),
      year: Number(p.year) || 2026,
      month: Number(p.month) || 1,
      day: Number(p.day) || 1,
      hour: Number(p.hour) || 0,
      minute: Number(p.minute) || 0,
      mode: String(p.mode ?? 'time'),
      numbers: String(p.numbers ?? ''),
      plusHour: p.plusHour === '1' || p.plusHour === true,
      yaosParam: String(p.yaos ?? ''),
      movingParam: p.moving === undefined || p.moving === null ? '' : String(p.moving),
    }
    matterText.value = q.value.matter
    ready.value = true
  } catch {
    invalid.value = true
  }
})

function onBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) { navigateBack(); return }
  navigateTo('/pkg-paipan/meihua/index')
}

// ─── 四柱 / 农历 / 节气 / 空亡 / 神煞 ───
const sizhu = computed<FourPillars>(() => fourPillars(q.value.year, q.value.month, q.value.day, q.value.hour, q.value.minute))
const PILLAR_KEYS = ['year', 'month', 'day', 'hour'] as const
const PILLAR_LABELS = ['年', '月', '日', '时']

const lunar = computed(() => {
  try {
    const l = Solar.fromYmd(q.value.year, q.value.month, q.value.day).getLunar()
    const rawM = l.getMonth() // 负数=闰月
    return { m: Math.abs(rawM), d: l.getDay(), text: `${rawM < 0 ? '闰' : ''}${l.getMonthInChinese()}月${l.getDayInChinese()}` }
  } catch {
    return { m: q.value.month, d: q.value.day, text: '' }
  }
})

const jieqiText = computed(() =>
  formatJieqiRange(new Date(q.value.year, q.value.month - 1, q.value.day, q.value.hour, q.value.minute)),
)

// 神煞：驿马/桃花/日禄/月德（口径同 V0）
const shensha = computed(() => {
  const dz = sizhu.value.day.zhi as string
  const dg = sizhu.value.day.gan as string
  const mz = sizhu.value.month.zhi as string
  const YIMA: Record<string, string> = { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' }
  const TAOHUA: Record<string, string> = { 申: '酉', 子: '酉', 辰: '酉', 寅: '卯', 午: '卯', 戌: '卯', 巳: '午', 酉: '午', 丑: '午', 亥: '子', 卯: '子', 未: '子' }
  const RILU: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' }
  const YUEDE: Record<string, string> = { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' }
  return [
    { name: '驿马', val: YIMA[dz] || '-' },
    { name: '桃花', val: TAOHUA[dz] || '-' },
    { name: '日禄', val: RILU[dg] || '-' },
    { name: '月德', val: YUEDE[mz] || '-' },
  ]
})

// ─── 卦象计算（口径同 V0） ───
// lines: 自下而上6爻，true=阳
interface Hexagram { upper: number; lower: number; lines: boolean[]; name: string; palace: string }

function trigramFromLines(lines: boolean[]): number {
  for (let n = 1; n <= 8; n++) {
    const bl = BAGUA_LINES[BAGUA_NAMES[n]]
    if (bl[0] === lines[0] && bl[1] === lines[1] && bl[2] === lines[2]) return n
  }
  return 1
}
function hexFromTrigrams(upper: number, lower: number): Hexagram {
  const lines = [...BAGUA_LINES[BAGUA_NAMES[lower]], ...BAGUA_LINES[BAGUA_NAMES[upper]]]
  const name = HEX_NAMES[upper][lower]
  return { upper, lower, lines, name, palace: getPalace(name) }
}
function hexFromLines(lines: boolean[]): Hexagram {
  const lower = trigramFromLines(lines.slice(0, 3))
  const upper = trigramFromLines(lines.slice(3, 6))
  const name = HEX_NAMES[upper][lower]
  return { upper, lower, lines, name, palace: getPalace(name) }
}
const mod = (n: number, m: number) => {
  const r = n % m
  return r === 0 ? m : r
}

const gua = computed<{ ben: Hexagram; moving: number; formula: string }>(() => {
  const { mode, numbers, plusHour, yaosParam, movingParam } = q.value
  const yearZhiNum = ZHIS.indexOf(sizhu.value.year.zhi) + 1
  const hourZhiNum = ZHIS.indexOf(sizhu.value.hour.zhi) + 1

  if (mode === 'manual' && yaosParam.length === 6) {
    // 参数自上而下 → 转自下而上
    const topDown = yaosParam.split('').map((c) => c === '1')
    const lines = [...topDown].reverse()
    const movingIdx = movingParam !== '' ? Number(movingParam) : -1
    // movingParam 是自上而下索引(0=上爻) → 转为自下而上爻位1~6
    const moving = movingIdx >= 0 ? 6 - movingIdx : 0
    return { ben: hexFromLines(lines), moving, formula: '手动指定' }
  }

  if (mode === 'number1' && numbers) {
    const digits = numbers.replace(/\D/g, '').split('').map(Number)
    if (digits.length > 0) {
      const half = Math.floor(digits.length / 2)
      const front = digits.slice(0, half)
      const back = digits.slice(half)
      const frontSum = front.reduce((a, b) => a + b, 0) || back.reduce((a, b) => a + b, 0)
      const backSum = back.reduce((a, b) => a + b, 0)
      const upper = mod(frontSum, 8)
      const lower = mod(backSum, 8)
      let dongSum = frontSum + backSum
      if (plusHour) dongSum += hourZhiNum
      const moving = mod(dongSum, 6)
      return { ben: hexFromTrigrams(upper, lower), moving, formula: `数字起卦1 (${numbers})${plusHour ? '+时辰' : ''}` }
    }
  }

  if (mode === 'number2' && /^\d{3}$/.test(numbers)) {
    const [d1, d2, d3] = numbers.split('').map(Number)
    const upper = mod(d1 === 0 ? 8 : d1, 8)
    const lower = mod(d2 === 0 ? 8 : d2, 8)
    let dong = d3
    if (plusHour) dong += hourZhiNum
    const moving = mod(dong === 0 ? 6 : dong, 6)
    return { ben: hexFromTrigrams(upper, lower), moving, formula: `数字起卦2 (${numbers})${plusHour ? '+时辰' : ''}` }
  }

  if (mode === 'auto') {
    // 以时间参数为种子的伪随机，保证同一链接结果一致
    let s = q.value.year * 10000 + q.value.month * 100 + q.value.day + q.value.hour * 60 + q.value.minute
    const rand = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    const upper = Math.floor(rand() * 8) + 1
    const lower = Math.floor(rand() * 8) + 1
    const moving = Math.floor(rand() * 6) + 1
    return { ben: hexFromTrigrams(upper, lower), moving, formula: '自动起卦' }
  }

  // 默认时间起卦（月日数为农历）
  const upperSum = yearZhiNum + lunar.value.m + lunar.value.d
  const lowerSum = upperSum + hourZhiNum
  const upper = mod(upperSum, 8)
  const lower = mod(lowerSum, 8)
  const moving = mod(lowerSum, 6)
  return {
    ben: hexFromTrigrams(upper, lower),
    moving,
    formula: `时间起卦 (${yearZhiNum}+${lunar.value.m}+${lunar.value.d}+${hourZhiNum})`,
  }
})

const ben = computed(() => gua.value.ben)
const moving = computed(() => gua.value.moving)

// 五卦：互（234为下/345为上）、变（动爻翻转）、错（全爻取反）、综（上下颠倒）
const hexes = computed(() => {
  const b = ben.value
  const hu = hexFromLines([b.lines[1], b.lines[2], b.lines[3], b.lines[2], b.lines[3], b.lines[4]])
  const bianLines = b.lines.map((l, i) => (moving.value === i + 1 ? !l : l))
  const bian = hexFromLines(bianLines)
  const cuo = hexFromLines(b.lines.map((l) => !l))
  const zong = hexFromLines([...b.lines].reverse())
  return { hu, bian, cuo, zong }
})

const hexColumns = computed<{ label: string; hex: Hexagram; red?: boolean; showMoving?: boolean }[]>(() => [
  { label: '本卦', hex: ben.value, showMoving: true },
  { label: '互卦', hex: hexes.value.hu },
  { label: '变卦', hex: hexes.value.bian, red: true },
  { label: '错卦', hex: hexes.value.cuo },
  { label: '综卦', hex: hexes.value.zong },
])

// 体用：动爻在下卦(1~3) → 下卦为用、上卦为体；否则相反
const tiyong = computed(() => {
  const movingInLower = moving.value >= 1 && moving.value <= 3
  const tiTri = movingInLower ? ben.value.upper : ben.value.lower
  const yongTri = movingInLower ? ben.value.lower : ben.value.upper
  const tiName = BAGUA_NAMES[tiTri]
  const yongName = BAGUA_NAMES[yongTri]
  const tiWx = BAGUA_WX[tiName]
  const yongWx = BAGUA_WX[yongName]
  const relation = getTiyongRelation(tiWx, yongWx)
  return { movingInLower, tiName, yongName, tiWx, yongWx, relation }
})

const judge = computed(() => TIYONG_JUDGE[tiyong.value.relation])
const judgeGood = computed(() => judge.value.level.includes('吉') && !judge.value.level.includes('凶'))
const ceShu = computed(() => getCeShu(ben.value.lines))
const movingText = computed(() => (moving.value >= 1 ? `动爻在${YAO_LABEL[moving.value - 1]}爻` : '无动爻'))

// 分类断语（accordion）
const categoryList = Object.entries(CATEGORY_JUDGE).map(([cat, texts]) => ({ cat, texts }))
const openCategory = ref<string | null>('运势')
function toggleCategory(cat: string) {
  openCategory.value = openCategory.value === cat ? null : cat
}
function categoryText(texts: Record<TiyongRelation, string>): string {
  return texts[tiyong.value.relation]
}

// ─── 页面交互态 ───
const matterText = ref('')
const editingMatter = ref(false)
const saved = ref(false)
const showNotes = ref(false)
const selectedHex = ref<{ hex: Hexagram; label: string } | null>(null)

function pad(n: number) { return String(n).padStart(2, '0') }
const dateText = computed(() =>
  `${q.value.year}年${pad(q.value.month)}月${pad(q.value.day)}日 ${pad(q.value.hour)}:${pad(q.value.minute)}`,
)

/** 保存排盘记录（本地存储，与入口页「排盘记录」弹层共用） */
function handleSave() {
  if (saved.value) return
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    const records = raw ? (JSON.parse(raw) as unknown[]) : []
    records.unshift({
      id: Date.now(),
      matter: matterText.value || '未命名事项',
      dateText: dateText.value,
      guaText: `${ben.value.name} 之 ${hexes.value.bian.name}`,
      params: {
        matter: matterText.value,
        year: q.value.year, month: q.value.month, day: q.value.day, hour: q.value.hour, minute: q.value.minute,
        mode: q.value.mode,
        numbers: q.value.numbers,
        plusHour: q.value.plusHour ? '1' : '0',
        yaos: q.value.yaosParam,
        moving: q.value.movingParam,
      },
      createdAt: Date.now(),
    })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(records.slice(0, 100)))
    saved.value = true
    uni.showToast({ title: '已保存到排盘记录', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

/** 分享：H5 系统分享/复制链接，其余端复制卦象摘要 */
function handleShare() {
  const summary = `梅花易数：${ben.value.name} 之 ${hexes.value.bian.name}（${tiyong.value.relation} · ${judge.value.level}）`
  // #ifdef H5
  const url = window.location.href
  const nav = navigator as Navigator & { share?: (data: { title?: string; url?: string }) => Promise<void> }
  if (nav.share) { nav.share({ title: summary, url }).catch(() => {}); return }
  uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) })
  return
  // #endif
  // eslint-disable-next-line no-unreachable
  uni.setClipboardData({ data: summary, success: () => uni.showToast({ title: '卦象已复制', icon: 'none' }) })
}
</script>

<template>
  <view class="page">
    <tool-header title="梅花易数" subtitle="观物取象 · 体用生克" @back="onBack" />

    <!-- 参数缺失/损坏：错误态 -->
    <view v-if="invalid" class="err">
      <text class="err-text">排盘参数缺失或已失效</text>
      <view class="err-btn" @tap="navigateTo('/pkg-paipan/meihua/index')">
        <text class="err-btn-text">重新起卦</text>
      </view>
    </view>

    <scroll-view v-else-if="ready" scroll-y class="body">
      <view class="body-inner">
        <!-- 信息表 -->
        <view class="card info-table">
          <view class="tr">
            <text class="td-label">事项</text>
            <view class="td-value">
              <input
                v-if="editingMatter"
                v-model="matterText"
                class="matter-edit"
                type="text"
                :focus="true"
                @blur="editingMatter = false"
                @confirm="editingMatter = false"
              >
              <view v-else class="matter-show" @tap="editingMatter = true">
                <text class="td-text">{{ matterText || '未填写' }}</text>
                <app-icon name="pencil" :size="26" color="var(--text-soft)" />
              </view>
            </view>
          </view>
          <view class="tr">
            <text class="td-label">日期</text>
            <view class="td-value">
              <text class="td-text">{{ dateText }}{{ lunar.text ? `（${lunar.text}）` : '' }}</text>
            </view>
          </view>
          <view class="tr">
            <text class="td-label">卦式</text>
            <view class="td-value"><text class="td-text">【{{ gua.formula }}】</text></view>
          </view>
          <view class="tr">
            <text class="td-label">节气</text>
            <view class="td-value"><text class="td-text td-sm">{{ jieqiText }}</text></view>
          </view>
          <view class="tr">
            <text class="td-label">干支</text>
            <view class="td-grid">
              <view v-for="(k, i) in PILLAR_KEYS" :key="k" class="td-cell" :class="{ 'td-cell-line': i < 3 }">
                <text class="ganzhi-text">
                  <text :style="{ color: ganColor(sizhu[k].gan) }">{{ sizhu[k].gan }}</text>
                  <text :style="{ color: zhiColor(sizhu[k].zhi) }">{{ sizhu[k].zhi }}</text>
                </text>
                <text class="cell-suffix">{{ PILLAR_LABELS[i] }}</text>
              </view>
            </view>
          </view>
          <view class="tr">
            <text class="td-label">空亡</text>
            <view class="td-grid">
              <view v-for="(k, i) in PILLAR_KEYS" :key="k" class="td-cell" :class="{ 'td-cell-line': i < 3 }">
                <text class="kong-text">{{ sizhu[k].kong.join('') }}</text>
              </view>
            </view>
          </view>
          <view class="tr">
            <text class="td-label">卦数</text>
            <view class="td-value">
              <text class="td-text">上卦 {{ ben.upper }}（{{ BAGUA_NAMES[ben.upper] }}）　下卦 {{ ben.lower }}（{{ BAGUA_NAMES[ben.lower] }}）　动爻 {{ moving }}　策 {{ ceShu }}</text>
            </view>
          </view>
          <view class="tr tr-last">
            <text class="td-label">神煞</text>
            <view class="td-value">
              <text v-for="s in shensha" :key="s.name" class="td-text shensha-item">{{ s.name }}--{{ s.val }}</text>
            </view>
          </view>
        </view>

        <!-- 五卦并列 -->
        <view class="card hexes-card">
          <view class="hexes-grid">
            <view
              v-for="col in hexColumns"
              :key="col.label"
              class="hex-col"
              @tap="selectedHex = { hex: col.hex, label: col.label }"
            >
              <text class="hex-col-label" :class="{ 'hex-red': col.red }">【{{ col.label }}】</text>
              <view class="hex-col-name">
                <text class="hex-name-text" :class="{ 'hex-red': col.red }">{{ col.hex.name }}</text>
                <text class="hex-palace-text" :class="{ 'hex-red': col.red }">（{{ col.hex.palace }}）</text>
              </view>
              <view class="hex-fig-wrap">
                <hex-figure :lines="col.hex.lines" :moving="col.showMoving ? moving : 0" size="sm" />
              </view>
            </view>
          </view>
          <!-- 体用标注 -->
          <view class="tiyong-row">
            <view class="tiyong-item">
              <text class="tiyong-badge tiyong-badge-ti">体</text>
              <text class="tiyong-text">{{ tiyong.movingInLower ? '上卦' : '下卦' }} {{ tiyong.tiName }}（{{ tiyong.tiWx }}）</text>
            </view>
            <view class="tiyong-item">
              <text class="tiyong-badge tiyong-badge-yong">用</text>
              <text class="tiyong-text">{{ tiyong.movingInLower ? '下卦' : '上卦' }} {{ tiyong.yongName }}（{{ tiyong.yongWx }}）</text>
            </view>
            <text class="tiyong-moving">{{ movingText }}</text>
          </view>
          <text class="hexes-tip">点击卦身查看卦辞详解</text>
        </view>

        <!-- 体用生克断 -->
        <view class="card">
          <view class="card-hdr">
            <text class="card-hdr-title">体用生克断</text>
            <text class="judge-level" :class="judgeGood ? 'judge-good' : 'judge-bad'">{{ tiyong.relation }} · {{ judge.level }}</text>
          </view>
          <view class="card-body">
            <text class="body-text">体卦{{ tiyong.tiName }}属{{ tiyong.tiWx }}，用卦{{ tiyong.yongName }}属{{ tiyong.yongWx }}，{{ tiyong.relation }}。{{ judge.text }}</text>
          </view>
        </view>

        <!-- 卦辞 -->
        <view class="card">
          <view class="card-hdr">
            <text class="card-hdr-title">卦辞</text>
          </view>
          <view class="card-body guaci-body">
            <view class="guaci-block">
              <text class="guaci-name guaci-ben">本卦 · {{ ben.name }}</text>
              <text class="body-text guaci-text">{{ GUACI[ben.name] }}</text>
            </view>
            <view class="guaci-block guaci-block-line">
              <text class="guaci-name guaci-bian">变卦 · {{ hexes.bian.name }}</text>
              <text class="body-text guaci-text">{{ GUACI[hexes.bian.name] }}</text>
            </view>
          </view>
        </view>

        <!-- 分类断语 -->
        <view class="card">
          <view class="card-hdr">
            <text class="card-hdr-title">分类断语</text>
            <text class="card-hdr-sub">依体用{{ tiyong.relation }}推断，仅供参考</text>
          </view>
          <view>
            <view v-for="item in categoryList" :key="item.cat" class="cat-item">
              <view class="cat-hdr" @tap="toggleCategory(item.cat)">
                <text class="cat-name">{{ item.cat }}</text>
                <view class="cat-arrow" :class="{ 'cat-arrow-open': openCategory === item.cat }">
                  <app-icon name="chevron-down" :size="28" color="var(--text-soft)" />
                </view>
              </view>
              <view v-if="openCategory === item.cat" class="cat-body">
                <text class="body-text">{{ categoryText(item.texts) }}</text>
              </view>
            </view>
          </view>
        </view>

        <text class="footer-note">断语仅供参考，吉凶论断请根据具体所测之人事而定。</text>

        <disclaimer
          variant="custom"
          tone="subtle"
          text="本工具仅供传统文化爱好者研究学习使用，占测结果不构成任何预测或建议。"
        />
      </view>
    </scroll-view>

    <!-- 底部工具栏 -->
    <view v-if="ready && !invalid" class="toolbar">
      <view class="toolbar-inner">
        <view class="tool-btn" @tap="handleShare">
          <app-icon name="share-2" :size="38" color="var(--text-soft)" />
          <text class="tool-btn-text">分享</text>
        </view>
        <view class="tool-btn" @tap="showNotes = true">
          <app-icon name="book-open" :size="38" color="var(--text-soft)" />
          <text class="tool-btn-text">笔记</text>
        </view>
        <view class="tool-btn" @tap="handleSave">
          <app-icon name="save" :size="38" :color="saved ? 'var(--brand)' : 'var(--text-soft)'" />
          <text class="tool-btn-text" :class="{ 'tool-btn-text-on': saved }">{{ saved ? '已保存' : '保存' }}</text>
        </view>
      </view>
    </view>

    <!-- 卦详解抽屉 -->
    <view v-if="selectedHex" class="mask" @tap="selectedHex = null">
      <view class="drawer" @tap.stop>
        <view class="drawer-hdr">
          <text class="drawer-title">【{{ selectedHex.label }}】{{ selectedHex.hex.name }}</text>
          <text class="drawer-close" @tap="selectedHex = null">关闭</text>
        </view>
        <scroll-view scroll-y class="drawer-body">
          <view class="drawer-top">
            <view class="drawer-fig">
              <hex-figure :lines="selectedHex.hex.lines" :moving="selectedHex.label === '本卦' ? moving : 0" size="md" />
            </view>
            <view class="drawer-meta">
              <text class="drawer-meta-text">所属宫位：{{ selectedHex.hex.palace }}宫</text>
              <text class="drawer-meta-text">上卦 {{ BAGUA_NAMES[selectedHex.hex.upper] }}（{{ BAGUA_WX[BAGUA_NAMES[selectedHex.hex.upper]] }}）　下卦 {{ BAGUA_NAMES[selectedHex.hex.lower] }}（{{ BAGUA_WX[BAGUA_NAMES[selectedHex.hex.lower]] }}）</text>
            </view>
          </view>
          <view class="drawer-guaci">
            <text class="body-text">{{ GUACI[selectedHex.hex.name] }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 笔记面板（复用奇门笔记组件） -->
    <qimen-notes-panel :open="showNotes" @close="showNotes = false" />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.body { flex: 1; }
.body-inner { padding: 24rpx 24rpx 200rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* 错误态 */
.err { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; padding: 120rpx 48rpx; }
.err-text { font-size: 28rpx; color: var(--text-soft); }
.err-btn { padding: 20rpx 64rpx; background: var(--brand); border-radius: 999rpx; }
.err-btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }

/* 通用卡片 */
.card {
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  overflow: hidden;
}
.card-hdr {
  display: flex; align-items: center; justify-content: space-between; gap: 16rpx;
  padding: 18rpx 24rpx;
  background: rgba(0, 0, 0, 0.03);
  border-bottom: 1rpx solid var(--line);
}
.card-hdr-title { font-size: 28rpx; font-weight: 700; color: var(--text-ink); }
.card-hdr-sub { font-size: 22rpx; color: var(--text-soft); }
.card-body { padding: 24rpx; }
.body-text { font-size: 28rpx; color: var(--text); line-height: 1.7; }

/* 信息表 */
.tr { display: flex; align-items: stretch; border-bottom: 1rpx solid var(--line); }
.tr-last { border-bottom: none; }
.td-label {
  width: 128rpx; flex-shrink: 0;
  padding: 18rpx 0 18rpx 24rpx;
  font-size: 26rpx; font-weight: 500;
  color: #b45309;
}
.td-value { flex: 1; padding: 18rpx 16rpx; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4rpx 20rpx; }
.td-text { font-size: 26rpx; color: var(--text-ink); line-height: 1.5; }
.td-sm { font-size: 24rpx; }
.shensha-item { margin-right: 8rpx; }
.matter-show { display: flex; align-items: center; gap: 10rpx; width: 100%; }
.matter-edit {
  width: 100%; font-size: 26rpx; color: var(--text-ink);
  background: rgba(0, 0, 0, 0.04); border-radius: 8rpx; padding: 8rpx 16rpx;
}

/* 干支/空亡四列 */
.td-grid { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); }
.td-cell { display: flex; align-items: baseline; justify-content: center; gap: 4rpx; padding: 14rpx 0; }
.td-cell-line { border-right: 1rpx solid var(--line); }
.ganzhi-text { font-size: 28rpx; font-weight: 700; }
.cell-suffix { font-size: 22rpx; color: var(--text-soft); }
.kong-text { font-size: 26rpx; color: var(--text-soft); }

/* 五卦并列 */
.hexes-card { padding: 24rpx; }
.hexes-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16rpx; }
.hex-col { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.hex-col-label {
  font-size: 26rpx; font-weight: 700; color: var(--brand);
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.hex-col-name { min-height: 68rpx; display: flex; flex-direction: column; align-items: center; }
.hex-name-text {
  font-size: 24rpx; color: var(--text-ink); text-align: center; line-height: 1.3;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.hex-palace-text { font-size: 20rpx; color: var(--text-soft); }
.hex-red { color: #dc2626; }
.hex-fig-wrap { width: 100%; padding: 0 4rpx; box-sizing: border-box; }

/* 体用标注 */
.tiyong-row {
  margin-top: 24rpx; padding-top: 24rpx;
  border-top: 1rpx solid var(--line);
  display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 16rpx 28rpx;
}
.tiyong-item { display: flex; align-items: center; gap: 10rpx; }
.tiyong-badge {
  padding: 4rpx 12rpx; border-radius: 8rpx;
  font-size: 24rpx; font-weight: 700;
}
.tiyong-badge-ti { background: rgba(196, 30, 58, 0.1); color: var(--brand); }
.tiyong-badge-yong { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
.tiyong-text { font-size: 26rpx; color: var(--text-ink); }
.tiyong-moving { font-size: 22rpx; color: var(--text-soft); }
.hexes-tip { display: block; text-align: center; font-size: 22rpx; color: var(--text-soft); margin-top: 16rpx; }

/* 体用生克断 */
.judge-level { font-size: 28rpx; font-weight: 700; }
.judge-good { color: #16a34a; }
.judge-bad { color: #dc2626; }

/* 卦辞 */
.guaci-body { display: flex; flex-direction: column; gap: 24rpx; }
.guaci-block { display: flex; flex-direction: column; gap: 8rpx; }
.guaci-block-line { padding-top: 20rpx; border-top: 1rpx solid var(--line); }
.guaci-name {
  font-size: 28rpx; font-weight: 700;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.guaci-ben { color: var(--brand); }
.guaci-bian { color: #dc2626; }
.guaci-text { font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif; }

/* 分类断语 */
.cat-item { border-bottom: 1rpx solid var(--line); }
.cat-item:last-child { border-bottom: none; }
.cat-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22rpx 24rpx;
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.cat-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }
.cat-arrow { transition: transform 0.2s; }
.cat-arrow-open { transform: rotate(180deg); }
.cat-body { padding: 0 24rpx 24rpx; }

/* 底部提示 */
.footer-note { display: block; text-align: center; font-size: 22rpx; color: #d97706; }

/* 底部工具栏 */
.toolbar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 30;
  background: var(--card);
  border-top: 1rpx solid var(--line);
  padding-bottom: env(safe-area-inset-bottom);
}
.toolbar-inner { display: grid; grid-template-columns: repeat(3, 1fr); padding: 12rpx 0; }
.tool-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4rpx;
  padding: 8rpx 0;
  &:active { opacity: 0.7; }
}
.tool-btn-text { font-size: 22rpx; color: var(--text-soft); }
.tool-btn-text-on { color: var(--brand); }

/* 抽屉（卦详解） */
.mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex; align-items: flex-end;
}
.drawer {
  width: 100%;
  background: var(--card);
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
}
.drawer-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 26rpx 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.drawer-title {
  font-size: 30rpx; font-weight: 700; color: var(--text-ink);
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
}
.drawer-close { font-size: 26rpx; color: var(--text-soft); padding: 8rpx; }
.drawer-body { max-height: 60vh; }
.drawer-top { display: flex; align-items: center; gap: 32rpx; padding: 32rpx; }
.drawer-fig { width: 128rpx; flex-shrink: 0; }
.drawer-meta { display: flex; flex-direction: column; gap: 10rpx; min-width: 0; }
.drawer-meta-text { font-size: 26rpx; color: var(--text-ink); line-height: 1.5; }
.drawer-guaci { margin: 0 32rpx; padding: 24rpx 0 40rpx; border-top: 1rpx solid var(--line); }
.drawer-guaci .body-text { font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif; }
</style>
