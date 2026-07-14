<script setup lang="ts">
/** 奇门遁甲排盘结果页——接 qimenApi.calculate 真实算法，三态驱动 */
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import QimenNotesPanel from '@/components/qimen/notes-panel.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { qimenApi, type QimenResult, type QimenInput } from '@/lib/qimen-data'
import { computeQimenLocal } from '@/pkg-paipan/lib/qimen-adapter'
import { saveQimenHistory } from './qimen-history'
import { BRAND } from '@/lib/brand'

// ─── 奇门常量 ───
const PALACE_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6] // 洛书九宫: 巽离坤/震中兑/艮坎乾
const PALACE_NAMES = ['', '坎1宫', '坤2宫', '震3宫', '巽4宫', '中5宫', '乾6宫', '兑7宫', '艮8宫', '离9宫']

const GEJU_MEANINGS: Record<string, string> = {
  '癸+己': '华盖地户。男女测之，音信皆阻，此格躲灾避难方为吉。得吉门尚可为之。',
  '戊+己': '青龙相合。主有财运，婚姻之喜，若门生宫及比合，则主百事吉，门克宫则好事成蹉跎，有始无终。',
  '惊+生': '主因女人生产或求财事惊忧，皆吉。',
  '丙+辛': '天狱。主官司败诉，有牢狱之灾。',
  '庚+庚': '太白同宫。主卜事多阻，不利经商，行人难归。',
}

interface PalaceCell {
  bashen: string; jiuxing: string; bamen: string
  tianGan: string; diGan: string; anGan: string
  dipanShen: string
  changsheng: { di: string; an: string }
  isZhifu: boolean; isZhishi: boolean
  ruMu: boolean; jiXing: boolean; menPo: boolean
  kongWang: boolean; maXing: boolean
}

// ─── 路由参数 ───
const q = reactive({
  matter: '', year: 2026, month: 5, day: 17, hour: 13, minute: 59,
  panMethod: 'zhuan', flyMethod: 'yinyang', startMethod: 'zhirun', anganMethod: 'dipan', customJu: '',
  useTrueSolar: false, lat: 0, lng: 0,
})

// ─── 三态 ───
const loading = ref(true)
const errMsg = ref('')
const result = ref<QimenResult | null>(null)
const saving = ref(false)

function buildInput(): QimenInput {
  return {
    matter: q.matter,
    year: q.year, month: q.month, day: q.day, hour: q.hour, minute: q.minute,
    panMethod: q.panMethod as QimenInput['panMethod'],
    flyMethod: q.flyMethod as QimenInput['flyMethod'],
    startMethod: q.startMethod as QimenInput['startMethod'],
    customJu: q.customJu || undefined,
    anganMethod: q.anganMethod as QimenInput['anganMethod'],
    useTrueSolar: q.useTrueSolar,
    lat: q.lat || undefined,
    lng: q.lng || undefined,
  }
}

/**
 * 本地重算（2026-07-14 去伪存真）：改用 pkg-paipan/lib/qimen-engine（84/84 黄金测试）。
 * 此前走 qimenApi.calculate → 后端 qimen.calculator 只有转盘法，飞盘被错误委托给阴盘引擎
 * （阴盘是另一流派，以月柱推局），导致选「飞盘」时拿到的是阴盘。
 */
function load() {
  loading.value = true
  errMsg.value = ''
  try {
    result.value = computeQimenLocal(buildInput())
    saveRecord(result.value)
  } catch (e) {
    errMsg.value = (e as Error)?.message || '排盘失败，请检查起局参数'
  } finally {
    loading.value = false
  }
}

/**
 * 起局成功后落本地记录（无需登录）——记录页读的就是它。
 * 与下方 onSave（登录后存后端、供 AI 解盘/从业者调阅）是两码事，不要合并。
 */
function saveRecord(r: QimenResult | null) {
  if (!r) return
  saveQimenHistory({
    ...buildInput(),
    matter: q.matter || '',
    juLabel: `${r.dunType === 'yang' ? '阳遁' : '阴遁'}${r.juNumber}局`,
    zhiFu: r.zhiFu,
    zhiShiMen: r.zhiShiMen,
    jieQi: r.jieQi,
  })
}

/** 保存排盘记录（需登录，防重复提交） */
async function onSave() {
  if (saving.value) return
  if (!getToken()) { uni.showToast({ title: '请先登录后保存', icon: 'none' }); return }
  saving.value = true
  try {
    await qimenApi.save(buildInput())
    uni.showToast({ title: '已保存到排盘记录', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

/** AI 智能解析（后端时家奇门 AI 端点尚未提供，暂占位） */
function onAnalyze() {
  uni.showToast({ title: 'AI 智能解析即将上线', icon: 'none' })
}

onLoad((opts: Record<string, string> = {}) => {
  q.matter = opts.matter ? decodeURIComponent(opts.matter) : ''
  q.year = Number(opts.year) || 2026
  q.month = Number(opts.month) || 5
  q.day = Number(opts.day) || 17
  q.hour = Number(opts.hour) || 13
  q.minute = Number(opts.minute) || 59
  q.panMethod = opts.panMethod || 'zhuan'
  q.flyMethod = opts.flyMethod || 'yinyang'
  q.startMethod = opts.startMethod || 'zhirun'
  q.anganMethod = opts.anganMethod || 'dipan'
  q.customJu = opts.customJu ? decodeURIComponent(opts.customJu) : ''
  q.useTrueSolar = opts.useTrueSolar === 'true'
  q.lat = Number(opts.lat) || 0
  q.lng = Number(opts.lng) || 0
  editedMatter.value = q.matter
  load()
})

// ─── 适配层：QimenResult → 页面结构 ───
const meta = computed(() => result.value?.meta)
const hasData = computed(() => !!result.value && (result.value.gongs?.length ?? 0) > 0)
const isFei = computed(() => q.panMethod === 'fei') // 飞盘暂无安干/地盘神/长生，诚实降级

// 值符/值使所在宫（按数组位置=洛书宫，避免阴盘中宫寄坤2的 index 碰撞）
const zhifuPos = computed(() => {
  const gongs = result.value?.gongs || []
  const i = gongs.findIndex(g => g.star === result.value?.zhiFu)
  return i >= 0 ? i + 1 : -1
})
const zhishiPos = computed(() => {
  const m = result.value?.zhiShiMen || ''
  const full = m && !m.endsWith('门') ? m + '门' : m
  const gongs = result.value?.gongs || []
  const i = gongs.findIndex(g => (g.men?.endsWith('门') ? g.men : (g.men || '') + '门') === full)
  return i >= 0 ? i + 1 : -1
})

// 九宫按数组位置(i+1=坎1..离9)映射：阳盘/阴盘数组恒为此序；阴盘中宫寄坤2其 index=2 但位置仍是5
const palaceData = computed<Record<number, PalaceCell>>(() => {
  const map: Record<number, PalaceCell> = {}
  const gongs = result.value?.gongs || []
  gongs.forEach((g, i) => {
    const palace = i + 1
    map[palace] = {
      bashen: g.shen || '',
      jiuxing: g.star,
      bamen: palace === 5 ? '中门' : (g.men?.endsWith('门') ? g.men : (g.men || '') + '门'),
      tianGan: g.tianPan,          // 天盘干（奇门格局 天盘+地盘）
      diGan: g.diPan,              // 地盘干
      anGan: g.anGan || g.yinGan || '',   // 阴盘隐干即安干
      dipanShen: g.dipanShen || '',
      changsheng: { di: g.changsheng?.di || '', an: g.changsheng?.an || '' },
      isZhifu: palace === zhifuPos.value,
      isZhishi: palace === zhishiPos.value,
      ruMu: g.isRuMu, jiXing: g.isJiXing, menPo: g.isMenPo,
      kongWang: g.kongWang, maXing: g.maXing,
    }
  })
  return map
})

const sizhu = computed(() => {
  const s = meta.value?.siZhu
  if (!s) return []
  return [
    { label: '年柱', g: s.nian.gan, z: s.nian.zhi },
    { label: '月柱', g: s.yue.gan, z: s.yue.zhi },
    { label: '日柱', g: s.ri.gan, z: s.ri.zhi },
    { label: '时柱', g: s.shi.gan, z: s.shi.zhi },
  ]
})
const kongwangData = computed(() => {
  const k = meta.value?.kongWang
  if (!k) return []
  return [
    { label: '年', zhi: k.nian },
    { label: '月', zhi: k.yue },
    { label: '日', zhi: k.ri },
    { label: '时', zhi: k.shi },
  ]
})
const maXing = computed(() => meta.value?.maXingZhi || '')

const juLabel = computed(() => {
  const r = result.value
  return r ? `${r.dunType === 'yang' ? '阳' : '阴'}${r.juNumber}局` : ''
})
const zhiShiMenLabel = computed(() => {
  const m = result.value?.zhiShiMen || ''
  return m && !m.endsWith('门') ? m + '门' : m
})

// ─── 交互状态 ───
const showChangsheng = ref(false)
const showDipanShen = ref(false)
const selectedPalace = ref<number | null>(null)
const showNotes = ref(false)
const showEditMatter = ref(false)
const editedMatter = ref('')

const startLabel = computed(() =>
  q.startMethod === 'zhirun' ? '置闰' : q.startMethod === 'chaibu' ? '拆补' : q.startMethod === 'maoshan' ? '茅山' : '自选')
const panshi = computed(() =>
  `${q.panMethod === 'fei' ? '飞盘' : '转盘'}奇门 - ${q.flyMethod === 'yinyang' ? '阴阳皆顺' : '阳顺阴逆'} - ${startLabel.value} - ${q.anganMethod === 'dipan' ? '门地盘起' : '值使门起'}`)

// 上一局/下一局：以 customJu 重新向后端排盘（真实换局，非前端臆造）
function shiftJu(delta: number) {
  if (!result.value) return
  let num = result.value.juNumber
  let isYang = result.value.dunType === 'yang'
  num += delta
  if (num > 9) { num = 1; isYang = !isYang }
  if (num < 1) { num = 9; isYang = !isYang }
  q.startMethod = 'custom'
  q.customJu = `${isYang ? '阳遁' : '阴遁'}${num}局`
  selectedPalace.value = null
  load()
}

function pad(n: number) { return String(n).padStart(2, '0') }

// 详情格局
const detail = computed(() => {
  const p = selectedPalace.value
  if (!p || !palaceData.value[p]) return null
  const d = palaceData.value[p]
  const xiantianGong = ['', '震', '艮', '坎', '巽', '', '离', '坤', '乾', '兑']
  const dizhi = ['', '子', '丑未', '卯', '辰巳', '', '戌亥', '酉', '丑寅', '午']
  const nums = [p, p + 2, p + 4, p + 6].filter(n => n <= 10).join('，')
  const rawCombos = [
    { k: `${d.tianGan}+${d.diGan}`, l: `${d.tianGan}+${d.diGan}` },
    { k: d.anGan ? `${d.tianGan}+${d.anGan}` : '', l: d.anGan ? `${d.tianGan}+${d.anGan}` : '' },
    { k: `${d.bamen.replace('门', '')}+${d.jiuxing.replace('天', '')}`, l: `${d.bamen}+${d.jiuxing}` },
  ]
  const combos = rawCombos
    .filter(c => c.k && !c.k.startsWith('+') && !c.k.endsWith('+'))
    .map(c => ({ ...c, text: GEJU_MEANINGS[c.k] || '此格局需结合用神具体分析。' }))
  return { name: PALACE_NAMES[p], xiantian: xiantianGong[p], nums, dizhi: dizhi[p], combos }
})

function saveMatter() { q.matter = editedMatter.value; showEditMatter.value = false }
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-inner">
        <view class="hdr-back" @tap="navigateTo('/paipan/qimen')"><app-icon name="chevron-left" :size="40" color="var(--text-ink)" /></view>
        <text class="hdr-title">{{ BRAND.nameShort }}奇门遁甲</text>
        <view class="hdr-share"><app-icon name="share-2" :size="32" color="var(--text-soft)" /></view>
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- Loading -->
      <view v-if="loading" class="state">
        <view class="spinner" />
        <text class="state-t">正在排盘…</text>
      </view>
      <!-- Error -->
      <view v-else-if="errMsg" class="state">
        <app-icon name="alert-circle" :size="56" color="var(--text-soft)" />
        <text class="state-t">{{ errMsg }}</text>
        <view class="state-btn" @tap="load"><text class="state-btn-t">重试</text></view>
      </view>
      <!-- Empty -->
      <view v-else-if="!hasData" class="state">
        <app-icon name="inbox" :size="56" color="var(--text-soft)" />
        <text class="state-t">暂无排盘数据</text>
        <view class="state-btn" @tap="navigateTo('/paipan/qimen')"><text class="state-btn-t">返回重排</text></view>
      </view>
      <!-- 内容 -->
      <template v-else>
      <!-- 信息表格 -->
      <view class="info-wrap">
        <view class="info-card">
          <view class="info-row">
            <text class="info-key">事项</text>
            <view class="info-val-edit">
              <text class="info-val">{{ editedMatter || '-' }}</text>
              <view class="info-pencil" @tap="showEditMatter = true"><app-icon name="pencil" :size="24" color="var(--text-soft)" /></view>
            </view>
          </view>
          <view class="info-row">
            <text class="info-key">盘式</text><text class="info-val sm">{{ panshi }}</text>
          </view>
          <view class="info-row">
            <text class="info-key">日期</text>
            <text class="info-val">{{ q.year }}年{{ pad(q.month) }}月{{ pad(q.day) }}日 {{ q.hour }}时{{ pad(q.minute) }}分</text>
          </view>
          <view v-if="meta?.trueSolar" class="info-row">
            <text class="info-key">真太阳时</text>
            <text class="info-val">{{ q.year }}年{{ pad(q.month) }}月{{ pad(q.day) }}日 {{ meta.trueSolar.hour }}时{{ pad(meta.trueSolar.minute) }}分</text>
          </view>
          <!-- 四柱 -->
          <view class="info-row col">
            <text class="info-key">四柱</text>
            <view class="grid4">
              <view v-for="z in sizhu" :key="z.label" class="sz-cell">
                <text class="sz-label">{{ z.label }}</text>
                <text class="sz-gz">{{ z.g }}</text>
                <text class="sz-gz">{{ z.z }}</text>
              </view>
            </view>
          </view>
          <!-- 空亡（每柱旬空） -->
          <view class="info-row col">
            <text class="info-key">空亡</text>
            <view class="grid4">
              <view v-for="(k, i) in kongwangData" :key="i" class="kw-cell">
                <text class="kw-text">{{ k.label }} {{ k.zhi }}</text>
              </view>
            </view>
          </view>
          <view v-if="result?.jieQi" class="info-row">
            <text class="info-key">节气</text>
            <text v-if="meta?.jieQi" class="info-val sm"><text class="hl">{{ meta.jieQi.name }}</text> {{ meta.jieQi.start }} ~ <text class="hl">{{ meta.jieQi.nextName }}</text> {{ meta.jieQi.end }}</text>
            <text v-else class="info-val sm"><text class="hl">{{ result.jieQi }}</text> 用事</text>
          </view>
          <!-- 用事表头 -->
          <view class="info-row shade">
            <text class="info-key">用事</text>
            <view class="grid4 center">
              <text class="xh-h">局数</text><text class="xh-h">值符</text><text class="xh-h">值使</text><text class="xh-h">马星</text>
            </view>
          </view>
          <view class="info-row noborder">
            <text class="info-key dark">{{ result?.yongShi }}</text>
            <view class="grid4 center mid">
              <text class="xh-v">{{ juLabel }}</text>
              <text class="xh-v green">{{ result?.zhiFu }}</text>
              <text class="xh-v green">{{ zhiShiMenLabel }}</text>
              <view v-if="maXing" class="ma-badge"><text class="ma-badge-t">{{ maXing }}</text></view>
              <text v-else class="xh-v">—</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 九宫格 -->
      <view class="grid-wrap">
        <view class="grid9">
          <view
            v-for="palace in PALACE_ORDER" :key="palace"
            class="cell"
            :class="{ sel: selectedPalace === palace, center: palace === 5 }"
            @tap="selectedPalace = selectedPalace === palace ? null : palace"
          >
            <view v-if="palaceData[palace].maXing" class="cell-ma"><text class="cell-ma-t">马</text></view>
            <view class="cell-grid">
              <!-- 列1 -->
              <view class="cell-c1">
                <view class="cell-slot">
                  <view v-if="palaceData[palace].kongWang" class="kw-circle" />
                </view>
                <view class="cell-slot"><text class="cell-tg">{{ palaceData[palace].tianGan }}</text></view>
                <view class="cell-slot"><text v-if="showDipanShen" class="cell-dps">{{ palaceData[palace].dipanShen }}</text></view>
              </view>
              <!-- 列2 -->
              <view class="cell-c2">
                <view class="cell-slot left"><text class="cell-main">{{ palaceData[palace].bashen }}</text></view>
                <view class="cell-slot left"><text class="cell-main">{{ palaceData[palace].jiuxing }}</text></view>
                <view class="cell-slot left"><text class="cell-main">{{ palaceData[palace].bamen }}</text></view>
              </view>
              <!-- 列3 -->
              <view class="cell-c3">
                <view class="cell-slot end" />
                <view class="cell-slot end">
                  <text v-if="showChangsheng" class="cell-cs">{{ palaceData[palace].changsheng.di.slice(0,2) }}</text>
                  <text class="cell-gan">{{ palaceData[palace].diGan }}</text>
                </view>
                <view class="cell-slot end">
                  <text v-if="showChangsheng" class="cell-cs">{{ palaceData[palace].changsheng.an.slice(0,2) }}</text>
                  <text class="cell-gan">{{ palaceData[palace].anGan }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 颜色说明 -->
        <view class="legend">
          <text class="legend-t">颜色说明：<text class="lg-green">符使</text>、<text class="lg-orange">入墓</text>、<text class="lg-blue">击刑</text>、<text class="lg-pink">门迫</text>、<text class="lg-purple">刑+墓</text></text>
        </view>

        <!-- 操作按钮 -->
        <view class="ops">
          <view class="op" :class="{ on: showChangsheng }" @tap="showChangsheng = !showChangsheng"><text class="op-t" :class="{ on: showChangsheng }">长生状态</text></view>
          <view class="op" @tap="shiftJu(-1)"><text class="op-t">上一局</text></view>
          <view class="op" @tap="shiftJu(1)"><text class="op-t">下一局</text></view>
          <view class="op" :class="{ on: showDipanShen }" @tap="showDipanShen = !showDipanShen"><text class="op-t" :class="{ on: showDipanShen }">地盘九神</text></view>
        </view>
        <text class="hint">点击宫位查看详细信息</text>
      </view>

      <!-- 宫位详情 -->
      <view v-if="detail" class="detail">
        <view class="detail-head">
          <text class="detail-title">{{ detail.name }}</text>
          <view class="detail-close" @tap="selectedPalace = null"><app-icon name="x" :size="34" color="var(--text-soft)" /></view>
        </view>
        <view class="detail-base">
          <text><text class="hl bold">{{ detail.name }}</text>：先天宫为{{ detail.xiantian }}宫。取数：{{ detail.nums }}。地支：{{ detail.dizhi }}。</text>
        </view>
        <view v-for="(c, i) in detail.combos" :key="i" class="detail-combo">
          <text><text class="hl bold">{{ c.l }}</text>：{{ c.text }}</text>
        </view>
      </view>

      <!-- AI解析/保存 -->
      <view class="cta">
        <view class="cta-ai" @tap="onAnalyze"><app-icon name="sparkles" :size="32" color="#ffffff" /><text class="cta-ai-t">AI智能解析</text></view>
        <view class="cta-save" :class="{ disabled: saving }" @tap="onSave"><app-icon name="save" :size="30" color="var(--text-ink)" /><text class="cta-save-t">{{ saving ? '保存中…' : '保存' }}</text></view>
      </view>

      <!-- 免责声明 -->
      <view class="dc-wrap">
        <disclaimer variant="fortune" tone="card" />
      </view>
      </template>
    </scroll-view>

    <!-- 悬浮笔记按钮 -->
    <view class="fab" @tap="showNotes = true">
      <app-icon name="book-open" :size="32" color="var(--brand)" />
      <text class="fab-t">笔记</text>
    </view>

    <!-- 笔记面板 -->
    <qimen-notes-panel :open="showNotes" @close="showNotes = false" />

    <!-- 修改事项弹窗 -->
    <view v-if="showEditMatter" class="em-mask" @tap="showEditMatter = false">
      <view class="em-card" @tap.stop>
        <text class="em-title">修改事项</text>
        <input v-model="editedMatter" class="em-input" placeholder="请输入事项" />
        <view class="em-actions">
          <view class="em-btn cancel" @tap="showEditMatter = false"><text class="em-btn-t soft">取消</text></view>
          <view class="em-btn ok" @tap="saveMatter"><text class="em-btn-t light">确定</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }

.hdr { position: sticky; top: 0; z-index: 10; background: var(--bg-paper); border-bottom: 2rpx solid var(--border); padding-top: var(--status-bar-height, 0); }
.hdr-inner { height: 84rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; }
.hdr-back { padding: 8rpx; margin-left: -8rpx; }
.hdr-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.hdr-share { padding: 8rpx; margin-right: -8rpx; }

.body { flex: 1; }

/* 三态 */
.state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20rpx; padding: 160rpx 48rpx; }
.state-t { font-size: 26rpx; color: var(--text-soft); text-align: center; line-height: 1.6; }
.state-btn { margin-top: 8rpx; padding: 18rpx 56rpx; background: var(--brand); border-radius: 999rpx; box-shadow: 0 4rpx 12rpx rgba(196,30,58,0.25); }
.state-btn-t { font-size: 26rpx; font-weight: 500; color: #fff; }
.spinner { width: 56rpx; height: 56rpx; border-radius: 999rpx; border: 6rpx solid rgba(196,30,58,0.18); border-top-color: var(--brand); animation: qm-spin 0.8s linear infinite; }
@keyframes qm-spin { to { transform: rotate(360deg); } }

/* 信息表格 */
.info-wrap { padding: 16rpx 24rpx 0; }
.info-card { background: var(--card); border-radius: 24rpx; border: 2rpx solid rgba(0,0,0,0.06); overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.info-row { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 2rpx solid rgba(0,0,0,0.05); }
.info-row.col { flex-direction: column; align-items: stretch; gap: 8rpx; }
.info-row.shade { background: rgba(0,0,0,0.02); padding: 10rpx 0; }
.info-row.noborder { border-bottom: none; }
.info-key { width: 132rpx; flex-shrink: 0; padding: 0 24rpx; font-size: 26rpx; color: var(--brand); font-weight: 500; }
.info-key.dark { color: var(--text-ink); font-weight: 500; }
.info-val { flex: 1; padding-right: 24rpx; font-size: 26rpx; color: var(--text-ink); }
.info-val.sm { font-size: 24rpx; }
.info-muted { color: var(--text-soft); margin-left: 8rpx; }
.info-val-edit { flex: 1; display: flex; align-items: center; gap: 12rpx; padding-right: 24rpx; }
.info-pencil { padding: 4rpx; }
.hl { color: var(--brand); font-weight: 500; }
.hl.bold { font-weight: 600; }

.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; padding: 0 24rpx; }
.grid4.center { text-align: center; }
.grid4.mid { align-items: center; }
.sz-cell { display: flex; flex-direction: column; align-items: center; padding: 10rpx 0; background: rgba(196,30,58,0.06); border-radius: 12rpx; border: 2rpx solid rgba(196,30,58,0.1); }
.sz-label { font-size: 18rpx; color: var(--text-soft); margin-bottom: 4rpx; }
.sz-gz { font-size: 34rpx; font-weight: 700; color: var(--brand); line-height: 1.1; }
.kw-cell { padding: 12rpx 0; text-align: center; border-radius: 12rpx; background: rgba(0,0,0,0.04); }
.kw-cell.on { background: var(--brand); box-shadow: 0 2rpx 6rpx rgba(196,30,58,0.2); }
.kw-text { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }
.kw-text.on { color: #fff; }
.xh-h { font-size: 20rpx; color: var(--brand); font-weight: 500; }
.xh-v { font-size: 26rpx; color: var(--text-ink); font-weight: 500; }
.xh-v.green { color: #059669; font-weight: 600; }
.ma-badge { justify-self: center; padding: 2rpx 16rpx; background: #f59e0b; border-radius: 8rpx; }
.ma-badge-t { font-size: 22rpx; font-weight: 700; color: #fff; }

/* 九宫格 */
.grid-wrap { padding: 16rpx 24rpx; }
.grid9 { border: 2rpx solid rgba(0,0,0,0.4); border-radius: 16rpx; overflow: hidden; background: var(--card); display: grid; grid-template-columns: repeat(3, 1fr); box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.cell { position: relative; height: 236rpx; border-right: 2rpx solid rgba(0,0,0,0.3); border-bottom: 2rpx solid rgba(0,0,0,0.3); }
.cell:nth-child(3n) { border-right: none; }
.cell:nth-child(n+7) { border-bottom: none; }
.cell.sel { background: rgba(196,30,58,0.1); }
.cell.center { background: rgba(245,158,11,0.06); }
.cell-ma { position: absolute; top: 10rpx; right: 10rpx; z-index: 2; padding: 2rpx 12rpx; background: #f59e0b; border-radius: 6rpx; }
.cell-ma-t { font-size: 18rpx; font-weight: 700; color: #fff; }
.cell-grid { position: absolute; inset: 0; padding: 16rpx; display: flex; }
.cell-c1 { display: flex; flex-direction: column; justify-content: space-between; width: 40rpx; flex-shrink: 0; }
.cell-c2 { display: flex; flex-direction: column; justify-content: space-between; flex: 1; margin-left: 8rpx; }
.cell-c3 { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; }
.cell-slot { height: 60rpx; display: flex; align-items: center; justify-content: center; }
.cell-slot.left { justify-content: flex-start; }
.cell-slot.end { justify-content: flex-end; gap: 4rpx; }
.kw-circle { width: 26rpx; height: 26rpx; border-radius: 999rpx; border: 3rpx dashed var(--brand); box-sizing: border-box; }
.cell-tg { font-size: 22rpx; color: var(--text-soft); }
.cell-dps { font-size: 20rpx; color: var(--text-soft); }
.cell-main { font-size: 30rpx; font-weight: 500; color: var(--text-ink); letter-spacing: 2rpx; }
.cell-cs { font-size: 20rpx; color: var(--text-soft); }
.cell-gan { font-size: 30rpx; color: var(--text-ink); }

.legend { margin-top: 12rpx; text-align: center; }
.legend-t { font-size: 22rpx; color: var(--text-soft); }
.lg-green { color: #059669; } .lg-orange { color: #f97316; } .lg-blue { color: #3b82f6; } .lg-pink { color: #ec4899; } .lg-purple { color: #a855f7; }

.ops { display: flex; gap: 16rpx; margin-top: 24rpx; }
.op { flex: 1; padding: 20rpx 0; border-radius: 12rpx; background: var(--card); border: 2rpx solid var(--border); text-align: center; }
.op.on { background: var(--brand); border-color: var(--brand); box-shadow: 0 2rpx 8rpx rgba(196,30,58,0.2); }
.op-t { font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.op-t.on { color: #fff; }
.hint { display: block; text-align: center; font-size: 22rpx; color: var(--text-soft); margin-top: 16rpx; }

/* 详情 */
.detail { margin: 8rpx 24rpx; background: var(--card); border: 2rpx solid var(--border); border-radius: 20rpx; padding: 24rpx; }
.detail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.detail-title { font-size: 34rpx; font-weight: 700; color: var(--brand); }
.detail-close { padding: 6rpx; }
.detail-base { background: rgba(0,0,0,0.03); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: var(--text-ink); line-height: 1.6; }
.detail-combo { border-top: 2rpx solid rgba(0,0,0,0.06); padding-top: 16rpx; margin-top: 16rpx; font-size: 26rpx; color: var(--text-ink); line-height: 1.6; }

/* CTA */
.cta { display: flex; gap: 24rpx; padding: 24rpx 24rpx 0; }
.cta-ai { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 26rpx 0; background: var(--brand); border-radius: 20rpx; box-shadow: 0 8rpx 20rpx rgba(196,30,58,0.25); }
.cta-ai-t { font-size: 28rpx; font-weight: 500; color: #fff; }
.cta-save { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 26rpx 48rpx; background: var(--card); border: 2rpx solid var(--border); border-radius: 20rpx; }
.cta-save.disabled { opacity: 0.55; }
.cta-save-t { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }

.dc-wrap { padding: 24rpx; }

/* FAB */
.fab { position: fixed; right: 32rpx; bottom: 48rpx; z-index: 10; width: 96rpx; height: 96rpx; background: var(--card); border-radius: 999rpx; box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.12); border: 2rpx solid var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rpx; }
.fab-t { font-size: 18rpx; font-weight: 500; color: var(--brand); }

/* 修改事项弹窗 */
.em-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: 0 48rpx; }
.em-card { width: 100%; max-width: 600rpx; background: var(--card); border-radius: 32rpx; padding: 40rpx; }
.em-title { display: block; font-size: 34rpx; font-weight: 700; color: var(--text-ink); margin-bottom: 32rpx; }
.em-input { width: 100%; box-sizing: border-box; padding: 24rpx 32rpx; border-radius: 20rpx; border: 2rpx solid var(--border); background: rgba(0,0,0,0.03); font-size: 28rpx; color: var(--text-ink); }
.em-actions { display: flex; gap: 24rpx; margin-top: 32rpx; }
.em-btn { flex: 1; padding: 22rpx 0; border-radius: 999rpx; text-align: center; }
.em-btn.cancel { background: rgba(0,0,0,0.05); }
.em-btn.ok { background: var(--brand); }
.em-btn-t { font-size: 28rpx; font-weight: 500; }
.em-btn-t.soft { color: var(--text-soft); }
.em-btn-t.light { color: #fff; }
</style>
