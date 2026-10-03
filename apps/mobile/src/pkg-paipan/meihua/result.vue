<script setup lang="ts">
/**
 * 梅花易数结果页——自 V0 app/meihua/result/page.tsx 还原
 * onLoad 解析 payload（起卦输入）；卦象交服务端计算（POST /paipan/engine/meihua，算法只在服务端），四柱/农历/节气本地展示：四柱/农历/节气/神煞 + 本互变错综五卦 + 体用生克 + 卦辞断语。
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
import { saveMeihuaHistory } from './meihua-history'
import { aiReportApi } from '@/lib/paipan/ai-report-data'
import { getToken } from '@/utils/storage'
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
import type { Hexagram } from '@guoxue/shared/paipan/meihua-engine'
import { computePaipan } from '@/lib/paipan/engine-client'

/** 引擎结果类型（import type 推导，编译时擦除，不把 shared 推算代码打进包） */
type MeihuaResult = ReturnType<typeof import('@guoxue/shared/paipan/meihua-engine').computeMeihua>

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
const loading = ref(false)
/** 服务端请求失败（区别于参数失效：前者可「重新起卦」重试） */
const netError = ref(false)
let rawPayload: Record<string, unknown> | null = null

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
    rawPayload = p
    compute()
  } catch {
    invalid.value = true
  }
})

/** payload 原样交服务端（服务端做同样的归一化与农历换算）；拿到结果才进入展示 */
async function compute() {
  if (!rawPayload) return
  loading.value = true
  netError.value = false
  try {
    engine.value = await computePaipan<MeihuaResult>('meihua', rawPayload)
    ready.value = true
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (msg.startsWith('参数')) invalid.value = true
    else netError.value = true
  } finally {
    loading.value = false
  }
}

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

// ─── 卦象计算：算法真源在 @guoxue/shared/paipan/meihua-engine，本页只做展示 ───

// 起卦与五卦、体用：调用共用引擎（packages/shared/src/paipan/meihua-engine.ts）
// 农历由本页的 lunar 库算出后显式传入，保证服务端报告重算时与这里完全一致
/** 服务端卦象结果；以下派生量只在 ready（已取到结果）后被模板/操作读取 */
const engine = ref<MeihuaResult | null>(null)

const ben = computed(() => engine.value!.ben)
const moving = computed(() => engine.value!.moving)
const hexes = computed(() => ({ hu: engine.value!.hu, bian: engine.value!.bian, cuo: engine.value!.cuo, zong: engine.value!.zong }))

const hexColumns = computed<{ label: string; hex: Hexagram; red?: boolean; showMoving?: boolean }[]>(() => [
  { label: '本卦', hex: ben.value, showMoving: true },
  { label: '互卦', hex: hexes.value.hu },
  { label: '变卦', hex: hexes.value.bian, red: true },
  { label: '错卦', hex: hexes.value.cuo },
  { label: '综卦', hex: hexes.value.zong },
])

const tiyong = computed(() => engine.value!.tiyong)

const judge = computed(() => TIYONG_JUDGE[tiyong.value.relation])
const judgeGood = computed(() => judge.value.level.includes('吉') && !judge.value.level.includes('凶'))
const ceShu = computed(() => engine.value!.ceShu)
const movingText = computed(() => (moving.value >= 1 ? `动爻在${YAO_LABEL[moving.value - 1]}爻` : '无动爻'))

// 生成卦书：卦象由共用引擎按同一参数重算，页面与报告必然一致，故只传参数
const generating = ref(false)
async function openGuaShu() {
  if (!getToken()) {
    uni.showModal({
      title: '需要登录',
      content: '登录后即可生成有依据的卦书',
      confirmText: '去登录',
      success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pkg-auth/login/index' }) },
    })
    return
  }
  if (generating.value) return
  generating.value = true
  try {
    const rec = await aiReportApi.saveMeihuaRecord({
      matter: q.value.matter,
      year: q.value.year, month: q.value.month, day: q.value.day, hour: q.value.hour, minute: q.value.minute,
      mode: q.value.mode,
      numbers: q.value.numbers,
      plusHour: q.value.plusHour,
      yaos: q.value.yaosParam,
      moving: q.value.movingParam,
      // 农历用本页 lunar 库的结果，服务端重算时直接复用，避免闰月口径差异
      lunarMonth: lunar.value.m,
      lunarDay: lunar.value.d,
      lunarText: lunar.value.text,
      ganzhi: `${sizhu.value.year.gan}${sizhu.value.year.zhi}年 ${sizhu.value.month.gan}${sizhu.value.month.zhi}月 ${sizhu.value.day.gan}${sizhu.value.day.zhi}日 ${sizhu.value.hour.gan}${sizhu.value.hour.zhi}时`,
      jieqi: jieqiText.value,
    })
    navigateTo(`/pkg-paipan/bazi/ai-report?recordId=${rec.id}`)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '生成失败，请稍后重试', icon: 'none' })
  } finally {
    generating.value = false
  }
}

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

/** 保存排盘记录（统一走 meihua-history 模块，记录页/入口弹层同一份数据） */
function handleSave() {
  if (saved.value) return
  saveMeihuaHistory({
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
  })
  saved.value = true
  uni.showToast({ title: '已保存到排盘记录', icon: 'success' })
}

/** 分享：H5 系统分享/复制链接，其余端复制卦象摘要 */
function handleShare() {
  const summary = `梅花易数：${ben.value.name} 之 ${hexes.value.bian.name}（${tiyong.value.relation} · ${judge.value.level}）`
  // #ifdef H5
  const url = window.location.href
  const nav = navigator as Navigator & { share?: (data: { title?: string; url?: string }) => Promise<void> }
  if (nav.share) {
    nav.share({ title: summary, url }).catch(() => {})
  } else {
    uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) })
  }
  // #endif
  // #ifndef H5
  uni.setClipboardData({ data: summary, success: () => uni.showToast({ title: '卦象已复制', icon: 'none' }) })
  // #endif
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

    <view v-else-if="netError" class="err">
      <text class="err-text">起卦服务暂时不可用，请稍后重试</text>
      <view class="err-btn" @tap="compute">
        <text class="err-btn-text">重新起卦</text>
      </view>
    </view>
    <view v-else-if="loading" class="err"><text class="err-text">正在起卦…</text></view>

    <scroll-view v-else-if="ready && engine" scroll-y class="body">
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
            <view class="td-value"><text class="td-text">【{{ engine.formula }}】</text></view>
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

        <!-- 生成卦书：体用生克、类象、互变与断语，带门派与典籍依据 -->
        <view class="guashu" @tap="openGuaShu">
          <view class="guashu-main">
            <text class="guashu-title">{{ generating ? '正在准备…' : '生成小卜卦书' }}</text>
            <text class="guashu-sub">按体用生克逐条解读，讲清类象、过程与结果，并注明依据出处</text>
          </view>
          <app-icon name="chevron-right" :size="30" color="#ffffff" />
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
.guashu { display: flex; align-items: center; gap: 16rpx; margin: 12rpx 0 4rpx; padding: 26rpx 28rpx; border-radius: 20rpx; background: var(--brand); }
.guashu-main { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.guashu-title { font-size: 30rpx; font-weight: 700; color: #fff; }
.guashu-sub { font-size: 22rpx; color: rgba(255, 255, 255, 0.85); line-height: 1.5; }
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
