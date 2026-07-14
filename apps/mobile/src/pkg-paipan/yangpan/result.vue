<script setup lang="ts">
/** 阳盘命理奇门排盘结果页——接 yangpanApi.calculate 真实算法，三态驱动 */
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import NotesPanel from '@/components/bazi/notes-panel.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { yangpanApi, type YangpanResult, type YangpanInput } from '@/lib/yangpan-data'
import { saveYangpanHistory } from './yangpan-history'

// ─── 五行颜色映射 ───
const wuxingColors: Record<string, string> = {
  '甲': 'wx-wood', '乙': 'wx-wood', '丙': 'wx-fire', '丁': 'wx-fire',
  '戊': 'wx-earth', '己': 'wx-earth', '庚': 'wx-metal', '辛': 'wx-metal',
  '壬': 'wx-water', '癸': 'wx-water',
  '子': 'wx-water', '丑': 'wx-earth', '寅': 'wx-wood', '卯': 'wx-wood',
  '辰': 'wx-earth', '巳': 'wx-fire', '午': 'wx-fire', '未': 'wx-earth',
  '申': 'wx-metal', '酉': 'wx-metal', '戌': 'wx-earth', '亥': 'wx-water',
}
function wx(c: string) { return wuxingColors[c] || '' }

const PALACE_NAMES: Record<number, string> = {
  4: '巽四宫', 9: '离九宫', 2: '坤二宫', 3: '震三宫', 5: '中五宫',
  7: '兑七宫', 8: '艮八宫', 1: '坎一宫', 6: '乾六宫',
}
const PALACE_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6]

interface Cell {
  bashen: string; jiuxing: string; bamen: string
  tianGan: string; diGan: string; anGan: string; dipanShen: string
  kongwang: boolean; maXing: boolean
  changsheng: { tian: string; an: string }
}

// ─── 路由参数 ───
const q = reactive({
  name: '', gender: 'male', year: 1990, month: 1, day: 1, hour: 12, minute: 0,
  panMethod: 'zhuan', jigongMethod: 'kungong', startMethod: 'chaibu', anganMethod: 'zhishi',
  place: '', trueSolar: true, earlyLateZi: false, daylightSaving: false,
})

// ─── 三态 ───
const loading = ref(true)
const errMsg = ref('')
const result = ref<YangpanResult | null>(null)
const saving = ref(false)

function buildInput(): YangpanInput {
  return {
    name: q.name,
    gender: q.gender as 'male' | 'female',
    year: q.year, month: q.month, day: q.day, hour: q.hour, minute: q.minute,
    panMethod: q.panMethod as YangpanInput['panMethod'],
    jigongMethod: q.jigongMethod as YangpanInput['jigongMethod'],
    startMethod: q.startMethod as YangpanInput['startMethod'],
    anganMethod: q.anganMethod as YangpanInput['anganMethod'],
    place: q.place || undefined,
    trueSolar: q.trueSolar,
    earlyLateZi: q.earlyLateZi,
    daylightSaving: q.daylightSaving,
  }
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    result.value = await yangpanApi.calculate(buildInput())
    saveRecord(result.value)
  } catch (e) {
    errMsg.value = (e as Error)?.message || '排盘失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

/** 排盘成功后落本地记录（无需登录）——记录页读的就是它；onSave 存后端是另一回事 */
function saveRecord(r: YangpanResult | null) {
  if (!r) return
  saveYangpanHistory({
    ...buildInput(),
    name: q.name || '未命名',
    juLabel: `${r.dunType === 'yang' ? '阳遁' : '阴遁'}${r.juNumber}局`,
    zhiFu: r.zhiFu,
    zhiShiMen: r.zhiShiMen,
  })
}

/** 保存排盘记录（需登录，防重复提交） */
async function onSave() {
  if (saving.value) return
  if (!getToken()) { uni.showToast({ title: '请先登录后保存', icon: 'none' }); return }
  saving.value = true
  try {
    await yangpanApi.save(buildInput())
    uni.showToast({ title: '已保存到排盘记录', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

/** AI 智能解析（后端阳盘奇门 AI 端点尚未提供，暂占位） */
function onAnalyze() {
  uni.showToast({ title: 'AI 智能解析即将上线', icon: 'none' })
}

onLoad((opts: Record<string, string> = {}) => {
  q.name = opts.name ? decodeURIComponent(opts.name) : ''
  q.gender = opts.gender || 'male'
  q.year = Number(opts.year) || 1990
  q.month = Number(opts.month) || 1
  q.day = Number(opts.day) || 1
  q.hour = Number(opts.hour) || 12
  q.minute = Number(opts.minute) || 0
  q.panMethod = opts.panMethod || 'zhuan'
  q.jigongMethod = opts.jigongMethod || 'kungong'
  q.startMethod = opts.startMethod || 'chaibu'
  q.anganMethod = opts.anganMethod || 'zhishi'
  q.place = opts.place ? decodeURIComponent(opts.place) : ''
  q.trueSolar = opts.trueSolar !== 'false'   // 默认开启真太阳时，仅显式 false 关闭
  q.earlyLateZi = opts.earlyLateZi === 'true'
  q.daylightSaving = opts.daylightSaving === 'true'
  load()
})

// ─── 适配层：后端 YangpanResult → 页面结构 ───
const mingli = computed(() => result.value?.mingli)
const hasData = computed(() => !!result.value && (result.value.gongs?.length ?? 0) > 0)

// 九宫（注意：原型 tianGan 实为地盘干、diGan 实为天盘干，照原型视觉映射）
const palaceData = computed<Record<number, Cell>>(() => {
  const map: Record<number, Cell> = {}
  for (const g of result.value?.gongs || []) {
    map[g.index] = {
      bashen: g.shen || '',
      jiuxing: g.star,
      bamen: g.index === 5 ? '中宫' : (g.men?.endsWith('门') ? g.men : (g.men || '') + '门'),
      tianGan: g.diPan,                 // 视觉顶部/详情「地盘」
      diGan: g.tianPan,                 // 视觉c3/详情「天盘」，配长生tian
      anGan: g.anGan || '',
      dipanShen: g.dipanShen || '',
      kongwang: g.kongWang,
      maXing: g.maXing,
      changsheng: g.changsheng || { tian: '', an: '' },
    }
  }
  return map
})

const sizhu = computed(() => {
  const s = mingli.value?.siZhu
  if (!s) return []
  return [
    { label: '年柱', g: s.nian.gan, z: s.nian.zhi },
    { label: '月柱', g: s.yue.gan, z: s.yue.zhi },
    { label: '日柱', g: s.ri.gan, z: s.ri.zhi },
    { label: '时柱', g: s.shi.gan, z: s.shi.zhi },
  ]
})
const kongWangStr = computed(() => mingli.value?.kongWang || '')
const kongwangData = computed(() =>
  sizhu.value.map(p => ({ label: p.label[0], zhi: p.z, kong: kongWangStr.value.includes(p.z) })))
const maXing = computed(() => mingli.value?.maXingZhi || '')

const juLabel = computed(() => {
  const r = result.value
  return r ? `${r.dunType === 'yang' ? '阳' : '阴'}${r.juNumber}局` : ''
})
const zhiShiMenLabel = computed(() => {
  const m = result.value?.zhiShiMen || ''
  return m && !m.endsWith('门') ? m + '门' : m
})

const daYunData = computed(() =>
  (mingli.value?.daYun || []).map(d => ({
    year: d.startYear ?? 0, gan: d.gan, zhi: d.zhi,
    shiShen: d.ganShiShen || '', shiShenZhi: d.zhiShiShen || '',
    age: d.startAge, active: !!d.active,
  })))

function dayunLiuNian(idx: number) {
  const step = (mingli.value?.daYun || [])[idx]
  return (step?.liuNian || []).map(n => ({
    year: n.year, gan: n.gan, zhi: n.zhi,
    shiShen: n.ganShiShen || '', shiShenZhi: n.zhiShiShen || '',
    age: n.age, active: !!n.active,
  }))
}
// 流年卡：默认当前大运（active），无则首运
const liuNianData = computed(() => {
  const dy = mingli.value?.daYun || []
  const idx = dy.findIndex(d => d.active)
  return dayunLiuNian(idx >= 0 ? idx : 0)
})

// ─── 交互状态 ───
const showNotes = ref(false)
const selectedPalace = ref<number | null>(null)
const showChangsheng = ref(false)
const showDipanShen = ref(false)
const expandedDaYun = ref<number | null>(null)
const expandedLiuNian = computed(() =>
  expandedDaYun.value === null ? [] : dayunLiuNian(expandedDaYun.value))
const expandedDaYunItem = computed(() =>
  expandedDaYun.value === null ? null : daYunData.value[expandedDaYun.value] ?? null)

const panshi = computed(() =>
  `${q.panMethod === 'zhuan' ? '转盘' : '飞盘'} ${q.jigongMethod === 'kungong' ? '坤宫' : '阳艮阴坤'} ${q.startMethod === 'chaibu' ? '拆补' : q.startMethod === 'maoshan' ? '茅山' : '置闰'}`)

function pad(n: number) { return String(n).padStart(2, '0') }

const detail = computed(() => {
  const p = selectedPalace.value
  if (!p || !palaceData.value[p]) return null
  return { name: PALACE_NAMES[p], d: palaceData.value[p] }
})

function goToBazi() {
  const params: Record<string, string> = {
    name: q.name, gender: q.gender, year: String(q.year), month: String(q.month),
    day: String(q.day), hour: String(q.hour), minute: String(q.minute),
  }
  const qs = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
  navigateTo(`/paipan/bazi/result?${qs}`)
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-inner">
        <view class="hdr-back" @tap="navigateTo('/paipan/yangpan')"><app-icon name="chevron-left" :size="40" color="var(--text-ink)" /></view>
        <text class="hdr-title">阳盘命理奇门</text>
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
        <view class="state-btn" @tap="navigateTo('/paipan/yangpan')"><text class="state-btn-t">返回重排</text></view>
      </view>
      <!-- 内容 -->
      <template v-else>
      <!-- 信息表格 -->
      <view class="info-wrap">
        <view class="info-card">
          <view class="info-row"><text class="info-key">姓名</text><text class="info-val">{{ q.name || '未填写' }}</text></view>
          <view class="info-row"><text class="info-key">性别</text><text class="info-val">{{ q.gender === 'male' ? '男' : '女' }}</text></view>
          <view class="info-row"><text class="info-key">盘式</text><text class="info-val sm">{{ panshi }}</text></view>
          <view class="info-row"><text class="info-key">出生</text><text class="info-val">{{ q.year }}年{{ pad(q.month) }}月{{ pad(q.day) }}日 {{ q.hour }}时{{ pad(q.minute) }}分</text></view>
          <view v-if="mingli?.trueSolar" class="info-row"><text class="info-key">真太阳时</text><text class="info-val">{{ q.year }}年{{ pad(q.month) }}月{{ pad(q.day) }}日 {{ mingli.trueSolar.hour }}时{{ pad(mingli.trueSolar.minute) }}分</text></view>
          <!-- 四柱 -->
          <view class="info-row col">
            <text class="info-key">四柱</text>
            <view class="grid4">
              <view v-for="z in sizhu" :key="z.label" class="sz-cell">
                <text class="sz-label">{{ z.label }}</text>
                <text class="sz-gz" :class="wx(z.g)">{{ z.g }}</text>
                <text class="sz-gz" :class="wx(z.z)">{{ z.z }}</text>
              </view>
            </view>
          </view>
          <!-- 空亡 -->
          <view class="info-row col">
            <text class="info-key">空亡</text>
            <view class="grid4">
              <view v-for="(k, i) in kongwangData" :key="i" class="kw-cell" :class="{ on: k.kong }">
                <text class="kw-text" :class="{ on: k.kong }">{{ k.label }}{{ k.zhi }}</text>
              </view>
            </view>
          </view>
          <view v-if="result?.jieQi" class="info-row">
            <text class="info-key">节气</text>
            <text v-if="mingli?.jieQi" class="info-val sm"><text class="hl">{{ mingli.jieQi.name }}</text> {{ mingli.jieQi.start }} ~ <text class="hl">{{ mingli.jieQi.nextName }}</text> {{ mingli.jieQi.end }}</text>
            <text v-else class="info-val sm"><text class="hl">{{ result.jieQi }}</text> 用事</text>
          </view>
          <!-- 用事表头 -->
          <view class="info-row shade">
            <text class="info-key">用事</text>
            <view class="grid4 center"><text class="xh-h">局数</text><text class="xh-h">值符</text><text class="xh-h">值使</text><text class="xh-h">马星</text></view>
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
              <view class="cell-c1">
                <view class="cell-slot"><view v-if="palaceData[palace].kongwang" class="kw-circle" /></view>
                <view class="cell-slot"><text class="cell-tg">{{ palaceData[palace].tianGan }}</text></view>
                <view class="cell-slot"><text v-if="showDipanShen" class="cell-dps">{{ palaceData[palace].dipanShen }}</text></view>
              </view>
              <view class="cell-c2">
                <view class="cell-slot left"><text class="cell-main">{{ palaceData[palace].bashen }}</text></view>
                <view class="cell-slot left"><text class="cell-main">{{ palaceData[palace].jiuxing }}</text></view>
                <view class="cell-slot left"><text class="cell-main">{{ palaceData[palace].bamen }}</text></view>
              </view>
              <view class="cell-c3">
                <view class="cell-slot end" />
                <view class="cell-slot end">
                  <text v-if="showChangsheng" class="cell-cs">{{ palaceData[palace].changsheng.tian.slice(0,2) }}</text>
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

        <!-- 操作按钮 -->
        <view class="ops">
          <view class="op" :class="{ on: showChangsheng }" @tap="showChangsheng = !showChangsheng"><text class="op-t" :class="{ on: showChangsheng }">长生状态</text></view>
          <view class="op op-blue" @tap="goToBazi"><text class="op-t light">切换到八字</text></view>
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
          <text><text class="hl bold">{{ detail.name }}</text>：八神{{ detail.d.bashen }}，九星{{ detail.d.jiuxing }}，八门{{ detail.d.bamen }}，天盘{{ detail.d.diGan }}，地盘{{ detail.d.tianGan }}。</text>
        </view>
      </view>

      <!-- 大运 -->
      <view class="dy-wrap">
        <view class="dy-card">
          <view class="dy-head"><text class="dy-title">大运</text><text class="dy-tip">点击展开流年</text></view>
          <view class="dy-table">
            <view class="dy-trow yrs">
              <text v-for="(d, i) in daYunData" :key="i" class="dy-yr">{{ d.year }}</text>
            </view>
            <view class="dy-trow gans">
              <view v-for="(d, i) in daYunData" :key="i" class="dy-cell" :class="{ act: d.active, exp: expandedDaYun === i }" @tap="expandedDaYun = expandedDaYun === i ? null : i">
                <text class="dy-gz" :class="wx(d.gan)">{{ d.gan }}</text><text class="dy-ss">{{ d.shiShen }}</text>
              </view>
            </view>
            <view class="dy-trow gans">
              <view v-for="(d, i) in daYunData" :key="i" class="dy-cell" :class="{ act: d.active, exp: expandedDaYun === i }" @tap="expandedDaYun = expandedDaYun === i ? null : i">
                <text class="dy-gz" :class="wx(d.zhi)">{{ d.zhi }}</text><text class="dy-ss">{{ d.shiShenZhi }}</text>
              </view>
            </view>
          </view>
          <view v-if="expandedDaYun !== null" class="dy-exp">
            <view class="dy-exp-head">
              <text class="dy-exp-t">{{ expandedDaYunItem?.year }}-{{ (expandedDaYunItem?.year ?? 0) + 9 }} 流年</text>
              <text class="dy-exp-close" @tap="expandedDaYun = null">收起</text>
            </view>
            <view class="dy-exp-grid">
              <view v-for="(n, i) in expandedLiuNian" :key="i" class="dy-exp-cell">
                <text class="dy-exp-yr">{{ n.year }}</text>
                <text class="dy-exp-gan" :class="wx(n.gan)">{{ n.gan }}</text>
                <text class="dy-exp-gan" :class="wx(n.zhi)">{{ n.zhi }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 流年 -->
      <view class="ln-wrap">
        <view class="ln-card">
          <view class="ln-head"><text class="ln-title">流年</text></view>
          <view class="ln-table">
            <view class="ln-trow yrs">
              <text v-for="(n, i) in liuNianData" :key="i" class="ln-yr">{{ n.year }}</text>
            </view>
            <view class="ln-trow">
              <view v-for="(n, i) in liuNianData" :key="i" class="ln-cell" :class="{ act: n.active }">
                <text class="ln-gz" :class="wx(n.gan)">{{ n.gan }}</text><text class="ln-ss">{{ n.shiShen }}</text>
              </view>
            </view>
            <view class="ln-trow">
              <view v-for="(n, i) in liuNianData" :key="i" class="ln-cell" :class="{ act: n.active }">
                <text class="ln-gz" :class="wx(n.zhi)">{{ n.zhi }}</text><text class="ln-ss">{{ n.shiShenZhi }}</text>
              </view>
            </view>
            <view class="ln-trow ages">
              <text v-for="(n, i) in liuNianData" :key="i" class="ln-age" :class="{ act: n.active }">{{ n.age }}岁</text>
            </view>
          </view>
        </view>
      </view>

      <!-- AI解析/保存 -->
      <view class="cta">
        <view class="cta-ai" @tap="onAnalyze"><app-icon name="sparkles" :size="32" color="#ffffff" /><text class="cta-ai-t">AI智能解析</text></view>
        <view class="cta-save" :class="{ disabled: saving }" @tap="onSave"><app-icon name="save" :size="30" color="var(--text-ink)" /><text class="cta-save-t">{{ saving ? '保存中…' : '保存' }}</text></view>
      </view>

      <!-- 免责声明 -->
      <view class="dc-wrap"><disclaimer variant="fortune" tone="card" /></view>
      </template>
    </scroll-view>

    <!-- 悬浮笔记按钮 -->
    <view class="fab" @tap="showNotes = true">
      <app-icon name="book-open" :size="32" color="var(--brand)" />
      <text class="fab-t">笔记</text>
    </view>

    <!-- 笔记面板 -->
    <notes-panel :open="showNotes" @close="showNotes = false" />
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
.spinner { width: 56rpx; height: 56rpx; border-radius: 999rpx; border: 6rpx solid rgba(196,30,58,0.18); border-top-color: var(--brand); animation: yp-spin 0.8s linear infinite; }
@keyframes yp-spin { to { transform: rotate(360deg); } }

/* 五行色 */
.wx-wood { color: #16a34a; } .wx-fire { color: #dc2626; } .wx-earth { color: #ca8a04; }
.wx-metal { color: #d97706; } .wx-water { color: #2563eb; }

/* 信息表格 */
.info-wrap { padding: 16rpx 24rpx 0; }
.info-card { background: var(--card); border-radius: 24rpx; border: 2rpx solid rgba(0,0,0,0.06); overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.info-row { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 2rpx solid rgba(0,0,0,0.05); }
.info-row.col { flex-direction: column; align-items: stretch; gap: 8rpx; }
.info-row.shade { background: rgba(0,0,0,0.02); padding: 10rpx 0; }
.info-row.noborder { border-bottom: none; }
.info-key { width: 120rpx; flex-shrink: 0; padding: 0 24rpx; font-size: 26rpx; color: var(--brand); font-weight: 500; }
.info-key.dark { color: var(--text-ink); }
.info-val { flex: 1; padding-right: 24rpx; font-size: 26rpx; color: var(--text-ink); }
.info-val.sm { font-size: 24rpx; }
.hl { color: var(--brand); font-weight: 500; }
.hl.bold { font-weight: 600; }

.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; padding: 0 24rpx; }
.grid4.center { text-align: center; }
.grid4.mid { align-items: center; }
.sz-cell { display: flex; flex-direction: column; align-items: center; padding: 10rpx 0; background: rgba(196,30,58,0.05); border-radius: 12rpx; border: 2rpx solid rgba(196,30,58,0.1); }
.sz-label { font-size: 18rpx; color: var(--text-soft); margin-bottom: 4rpx; }
.sz-gz { font-size: 34rpx; font-weight: 700; line-height: 1.1; }
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

.ops { display: flex; gap: 16rpx; margin-top: 24rpx; }
.op { flex: 1; padding: 20rpx 0; border-radius: 12rpx; background: var(--card); border: 2rpx solid var(--border); text-align: center; }
.op.on { background: var(--brand); border-color: var(--brand); box-shadow: 0 2rpx 8rpx rgba(196,30,58,0.2); }
.op.op-blue { background: #3b82f6; border-color: #3b82f6; box-shadow: 0 2rpx 8rpx rgba(59,130,246,0.3); }
.op-t { font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.op-t.on, .op-t.light { color: #fff; }
.hint { display: block; text-align: center; font-size: 22rpx; color: var(--text-soft); margin-top: 16rpx; }

/* 详情 */
.detail { margin: 8rpx 24rpx; background: var(--card); border: 2rpx solid var(--border); border-radius: 20rpx; padding: 24rpx; }
.detail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.detail-title { font-size: 34rpx; font-weight: 700; color: var(--brand); }
.detail-close { padding: 6rpx; }
.detail-base { background: rgba(0,0,0,0.03); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: var(--text-ink); line-height: 1.6; }

/* 大运 */
.dy-wrap { padding: 24rpx 24rpx 0; }
.dy-card { background: var(--card); border-radius: 24rpx; border: 2rpx solid var(--border); overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.dy-head { padding: 18rpx 24rpx; border-bottom: 2rpx solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.dy-title { font-size: 28rpx; font-weight: 700; color: var(--brand); }
.dy-tip { font-size: 22rpx; color: var(--text-soft); }
.dy-table { padding: 8rpx 0; }
.dy-trow { display: grid; grid-template-columns: repeat(8, 1fr); text-align: center; }
.dy-trow.yrs { padding-top: 8rpx; }
.dy-yr { font-size: 20rpx; color: var(--text-soft); }
.dy-cell { display: flex; align-items: baseline; justify-content: center; padding: 4rpx 0; }
.dy-cell.act { background: rgba(196,30,58,0.08); }
.dy-cell.exp { background: rgba(0,0,0,0.05); }
.dy-gz { font-size: 36rpx; font-weight: 900; line-height: 1; }
.dy-ss { font-size: 18rpx; color: var(--text-soft); margin-left: 2rpx; }
.dy-exp { border-top: 2rpx solid var(--border); padding: 18rpx; background: rgba(0,0,0,0.02); }
.dy-exp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.dy-exp-t { font-size: 24rpx; color: var(--text-ink); font-weight: 500; }
.dy-exp-close { font-size: 24rpx; color: var(--brand); }
.dy-exp-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12rpx; }
.dy-exp-cell { background: var(--card); border-radius: 8rpx; padding: 12rpx 0; text-align: center; border: 2rpx solid var(--border); display: flex; flex-direction: column; align-items: center; }
.dy-exp-yr { font-size: 20rpx; color: var(--text-soft); }
.dy-exp-gan { font-size: 30rpx; font-weight: 700; }

/* 流年 */
.ln-wrap { padding: 20rpx 24rpx 0; }
.ln-card { background: var(--card); border-radius: 24rpx; border: 2rpx solid var(--border); overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.ln-head { padding: 18rpx 24rpx; border-bottom: 2rpx solid var(--border); }
.ln-title { font-size: 28rpx; font-weight: 700; color: var(--brand); }
.ln-table { padding: 8rpx 0; }
.ln-trow { display: grid; grid-template-columns: repeat(10, 1fr); text-align: center; }
.ln-trow.yrs { padding-top: 8rpx; }
.ln-trow.ages { padding-bottom: 8rpx; }
.ln-yr { font-size: 18rpx; color: var(--text-soft); }
.ln-cell { display: flex; align-items: baseline; justify-content: center; padding: 2rpx 0; }
.ln-cell.act { background: rgba(196,30,58,0.08); }
.ln-gz { font-size: 32rpx; font-weight: 700; line-height: 1; }
.ln-ss { font-size: 16rpx; color: var(--text-soft); margin-left: 1rpx; }
.ln-age { font-size: 18rpx; color: var(--text-soft); }
.ln-age.act { background: rgba(196,30,58,0.08); }

/* CTA */
.cta { display: flex; gap: 24rpx; padding: 24rpx 24rpx 0; }
.cta-ai { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 26rpx 0; background: var(--brand); border-radius: 20rpx; box-shadow: 0 8rpx 20rpx rgba(196,30,58,0.25); }
.cta-ai-t { font-size: 28rpx; font-weight: 500; color: #fff; }
.cta-save { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 26rpx 48rpx; background: var(--secondary, rgba(0,0,0,0.04)); border: 2rpx solid var(--border); border-radius: 20rpx; }
.cta-save.disabled { opacity: 0.55; }
.cta-save-t { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }

.dc-wrap { padding: 24rpx; }

/* FAB */
.fab { position: fixed; right: 32rpx; bottom: 48rpx; z-index: 10; width: 96rpx; height: 96rpx; background: var(--card); border-radius: 999rpx; box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.12); border: 2rpx solid var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rpx; }
.fab-t { font-size: 18rpx; font-weight: 500; color: var(--brand); }
</style>
