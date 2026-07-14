<script setup lang="ts">
/**
 * 国学字典 · 查字 + 选字广场——自 V0 app/zidian/page.tsx 还原
 *
 * 数据分工：释义/繁体走后端（新华字典 14809 字，5.2MB 塞不进分包）；
 * 康熙笔画/字形五行/81 数理/生肖宜忌/结构/五音/三才等 24 字段前端本地算。
 * 取舍：①V0 的 CSV 导出（Blob + a.download）小程序无从落地 → 改为「复制表格文本」到剪贴板；
 *       ②AI 解读走自家 DeepSeek（POST /zidian/ai），返回结构与 V0 的 zod schema 一致。
 */
import { ref, computed } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import StrokeOrder from './components/stroke-order.vue'
import { navigateTo } from '@/utils/router'
import { apiPost } from '@/utils/request'
import { queryText, type ZidianResult } from '../lib/zidian-data'
import { filterChars, plazaFacets, type PlazaChar } from '../lib/zidian-engine'

// R4 合规：小程序端无占卜类目，标题改文化研究表述（仅展示文案）
let hdrTitle = '国学字典'
// #ifdef MP-WEIXIN
hdrTitle = '汉字文化字典'
// #endif

const WX_COLOR: Record<string, string> = {
  木: '#3f7d3a', 火: '#b5432a', 土: '#8a6d3b', 金: '#a8742c', 水: '#33628c',
}
const LUCK_COLOR: Record<string, string> = {
  大吉: '#3f7d3a', 吉: '#3f7d3a', 半吉: '#8a6d3b', 凶: '#b5432a', 大凶: '#b5432a', 平: '#8a6d3b', 慎用: '#b5432a',
}
const HOT_CHARS = ['福', '宸', '睿', '泽', '萱', '梓', '瑾', '昊', '熙', '岚', '翊', '晏']

const mode = ref<'lookup' | 'plaza'>('lookup')

/* ── 查字 ── */
const input = ref('')
const query = ref('')
const active = ref(0)
const loading = ref(false)
const errMsg = ref('')
const results = ref<ZidianResult[]>([])
const r = computed<ZidianResult | null>(() => results.value[Math.min(active.value, results.value.length - 1)] ?? null)

async function submit(q?: string) {
  const text = (q ?? input.value).trim()
  if (!text) return
  if (q) input.value = q
  mode.value = 'lookup'
  active.value = 0
  ai.value = null
  aiError.value = ''
  query.value = text
  loading.value = true
  errMsg.value = ''
  try {
    const list = await queryText(text)
    results.value = list
    if (!list.length) errMsg.value = '未识别到汉字，请输入中文字符'
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : '查询失败'
    results.value = []
  } finally {
    loading.value = false
  }
}

function pickChar(i: number) {
  active.value = i
  ai.value = null
  aiError.value = ''
}

/** V0 的 CSV 下载在小程序无处可落 → 复制成表格文本，可粘贴进任何表格软件 */
function copyTable() {
  const head = '汉字\t繁体\t拼音\t康熙部首\t康熙笔画\t字形五行\t数理五行\t五音\t数理吉凶\t数理名称\t宜生肖\t忌生肖\t统一码'
  const rows = results.value.map((x) =>
    [
      x.char, x.traditional, x.pinyins.join('/'), x.radical, x.strokesKangxi,
      x.wuxing, x.wuxingShuli, x.wuyin.yin, x.shuli.luck, x.shuli.name,
      x.zodiacYi.join('/') || '无', x.zodiacJi.map((z) => z.zodiac).join('/') || '无', x.unicode,
    ].join('\t'),
  )
  uni.setClipboardData({
    data: [head, ...rows].join('\n'),
    success: () => uni.showToast({ title: '表格已复制', icon: 'none' }),
  })
}

/* ── AI 解读 ── */
interface AiResult {
  nameExamples: { name: string; gender: string; meaning: string }[]
  poetic: string
  shuowen: string
  classicUse: string
  relatedChars: { char: string; reason: string }[]
  baziAdvice?: string
}
const aiFor = ref('')
const ai = ref<AiResult | null>(null)
const aiLoading = ref(false)
const aiError = ref('')
const birth = ref('')

async function runAi(char: string) {
  aiLoading.value = true
  aiError.value = ''
  ai.value = null
  aiFor.value = char
  try {
    const res = await apiPost<{ ai: AiResult }>('/zidian/ai', { char, birth: birth.value.trim() || undefined })
    ai.value = res.ai
  } catch (e) {
    aiError.value = e instanceof Error ? e.message : 'AI 解读失败'
  } finally {
    aiLoading.value = false
  }
}

/* ── 选字广场 ── */
const fWuxing = ref('')
const fLuck = ref('')
const fGender = ref('')
const fStructure = ref('')
const fRadical = ref('')
const facets = plazaFacets() // 纯本地字库统计，无需请求

const plazaChars = computed<PlazaChar[]>(() =>
  filterChars({
    wuxing: fWuxing.value || undefined,
    luck: fLuck.value || undefined,
    gender: fGender.value || undefined,
    structure: fStructure.value || undefined,
    radical: fRadical.value || undefined,
  }),
)
const hasFilter = computed(() => !!(fWuxing.value || fLuck.value || fGender.value || fStructure.value || fRadical.value))
function resetFilter() {
  fWuxing.value = ''
  fLuck.value = ''
  fGender.value = ''
  fStructure.value = ''
  fRadical.value = ''
}
</script>

<template>
  <view class="page">
    <ToolHeader :title="hdrTitle" />

    <!-- 模式切换 -->
    <view class="tabs">
      <view :class="['tab', mode === 'lookup' && 'tab-on']" @tap="mode = 'lookup'">查字</view>
      <view :class="['tab', mode === 'plaza' && 'tab-on']" @tap="mode = 'plaza'">选字广场</view>
    </view>

    <!-- ══════════ 查字 ══════════ -->
    <template v-if="mode === 'lookup'">
      <view class="search-row">
        <view class="search-box">
          <text class="search-ico">🔍</text>
          <input
            v-model="input"
            class="search-input"
            type="text"
            placeholder="输入汉字或名字（最多8字，可批量）"
            placeholder-class="ph"
            confirm-type="search"
            @confirm="submit()"
          />
        </view>
        <view class="btn-search" @tap="submit()">查询</view>
      </view>

      <view v-if="!query" class="hot">
        <text class="hot-label">起名热门字</text>
        <view class="hot-grid">
          <view v-for="c in HOT_CHARS" :key="c" class="hot-char" @tap="submit(c)">{{ c }}</view>
        </view>
      </view>

      <view v-if="loading" class="hint">查询中…</view>
      <view v-else-if="errMsg" class="hint hint-err">{{ errMsg }}</view>

      <!-- 多字切换 + 导出 -->
      <view v-if="results.length > 1" class="multi">
        <scroll-view class="multi-scroll" scroll-x>
          <view class="multi-row">
            <view
              v-for="(item, i) in results"
              :key="item.char + i"
              :class="['multi-char', i === active && 'multi-on']"
              @tap="pickChar(i)"
            >
              {{ item.char }}
            </view>
          </view>
        </scroll-view>
        <view class="btn-export" @tap="copyTable">复制表格</view>
      </view>

      <view v-if="r" class="body">
        <!-- 字头卡：笔顺动画 + 基础信息 -->
        <view class="card head-card">
          <view class="head-row">
            <view class="head-left">
              <StrokeOrder :char="r.char" :size="120" />
              <text class="unicode">{{ r.unicode }}</text>
            </view>
            <view class="head-right">
              <text class="py">{{ r.pinyins.join(' / ') }}</text>
              <view v-if="r.traditional !== r.char" class="kv">
                <text class="k">繁体</text><text class="v serif">{{ r.traditional }}</text>
              </view>
              <view class="kv">
                <text class="k">部首</text><text class="v">{{ r.radical || '—' }}</text>
              </view>
              <view class="kv">
                <text class="k">结构</text><text class="v">{{ r.structure }}</text>
              </view>
              <view class="kv">
                <text class="k">康熙</text><text class="v strong">{{ r.strokesKangxi }}</text><text class="k"> 画</text>
              </view>
              <view class="kv">
                <text class="k">五行</text>
                <text class="wx-dot" :style="{ backgroundColor: WX_COLOR[r.wuxing] }">{{ r.wuxing }}</text>
                <text v-if="r.wuxingShuli !== r.wuxing" class="k sm">（数理属{{ r.wuxingShuli }}）</text>
                <text class="sep">|</text>
                <text class="k">五音</text><text class="v">{{ r.wuyin.yin }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 五行命理分析 -->
        <view class="card">
          <text class="card-title">五行命理分析</text>
          <text class="para">{{ r.wuxingReason }}</text>
          <view class="luck-row">
            <text class="luck-tag" :style="{ backgroundColor: LUCK_COLOR[r.nameLuck.level] || '#8a6d3b' }">{{ r.nameLuck.level }}</text>
            <text class="luck-cmt">{{ r.nameLuck.comment }}</text>
          </view>
          <view class="kv">
            <text class="k">适用性别：</text><text class="v strong">{{ r.genderFit.fit }}</text>
            <text class="k sm">（{{ r.genderFit.reason }}）</text>
          </view>
          <view class="tip-box"><text class="tip-text">{{ r.sancaiAdvice }}</text></view>
        </view>

        <!-- 姓名学数理 -->
        <view class="card">
          <text class="card-title">姓名学数理</text>
          <view class="kv">
            <text class="k">数理（{{ r.shuli.num }} 画）：</text>
            <text class="v strong" :style="{ color: LUCK_COLOR[r.shuli.luck] || '#3d2f22' }">{{ r.shuli.luck }}</text>
            <text class="v"> {{ r.shuli.name }}</text>
          </view>
          <text class="para">{{ r.shuli.judgment }}</text>
          <view v-if="r.zodiacYi.length" class="kv">
            <text class="k">宜生肖：</text><text class="v strong" style="color: #3f7d3a">{{ r.zodiacYi.join('、') }}</text>
          </view>
          <view v-if="r.zodiacJi.length">
            <view class="kv">
              <text class="k">忌生肖：</text>
              <text class="v strong" style="color: #b5432a">{{ r.zodiacJi.map((x) => x.zodiac).join('、') }}</text>
            </view>
            <view class="ji-list">
              <text v-for="x in r.zodiacJi.slice(0, 3)" :key="x.zodiac" class="ji-item">{{ x.zodiac }}：{{ x.reason }}</text>
            </view>
          </view>
        </view>

        <!-- AI 智能解读 -->
        <view class="card ai-card">
          <view class="ai-head">
            <text class="card-title">✦ AI 智能解读</text>
            <view v-if="!aiLoading && (!ai || aiFor !== r.char)" class="btn-ai" @tap="runAi(r.char)">解读此字</view>
          </view>
          <input
            v-model="birth"
            class="ai-birth"
            type="text"
            placeholder="选填出生时间（如 1992-08-16 10:30）做五行补益分析"
            placeholder-class="ph"
          />
          <text v-if="aiLoading" class="hint">AI 正在研读「{{ aiFor }}」字，约需 10 秒…</text>
          <text v-if="aiError" class="hint hint-err">{{ aiError }}</text>
          <view v-if="ai && aiFor === r.char" class="ai-body">
            <view class="poetic"><text class="poetic-text">{{ ai.poetic }}</text></view>
            <view class="ai-sec">
              <text class="ai-h">说文解字</text>
              <text class="ai-p">{{ ai.shuowen }}</text>
            </view>
            <view class="ai-sec">
              <text class="ai-h">典籍用例</text>
              <text class="ai-p">{{ ai.classicUse }}</text>
            </view>
            <view class="ai-sec">
              <text class="ai-h">起名用例</text>
              <view v-for="n in ai.nameExamples" :key="n.name" class="name-item">
                <text class="name-tag">{{ n.name }}</text>
                <text class="gender-tag">{{ n.gender }}</text>
                <text class="ai-p flex1">{{ n.meaning }}</text>
              </view>
            </view>
            <view v-if="ai.baziAdvice" class="bazi-box">
              <text class="ai-h" style="color: #7c2d12">五行补益参考</text>
              <text class="ai-p" style="color: #7c2d12">{{ ai.baziAdvice }}</text>
            </view>
            <view class="ai-sec">
              <text class="ai-h">关联推荐</text>
              <view class="rel-row">
                <view v-for="c in ai.relatedChars" :key="c.char" class="rel-item" @tap="submit(c.char)">
                  <text class="rel-char">{{ c.char }}</text>
                  <text class="rel-why">{{ c.reason }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 释义 -->
        <view class="card">
          <text class="card-title">新华字典释义</text>
          <scroll-view class="explain" scroll-y>
            <text class="explain-text">{{ r.explanation }}</text>
          </scroll-view>
        </view>

        <!-- 服务导流 -->
        <view class="links">
          <view class="link-card" @tap="navigateTo('/paipan/qiming')">
            <view>
              <text class="link-t">宝宝起名</text>
              <text class="link-d">八字喜用智能起名</text>
            </view>
            <text class="link-arrow">›</text>
          </view>
          <view class="link-card" @tap="navigateTo('/paipan/xingming')">
            <view>
              <text class="link-t">姓名详批</text>
              <text class="link-d">五格三才全面解析</text>
            </view>
            <text class="link-arrow">›</text>
          </view>
        </view>
      </view>
    </template>

    <!-- ══════════ 选字广场 ══════════ -->
    <template v-else>
      <view class="filters">
        <view class="f-row">
          <text class="f-label">五行</text>
          <view class="f-opts">
            <view
              v-for="w in ['', '木', '火', '土', '金', '水']"
              :key="w || 'all'"
              :class="['f-opt', fWuxing === w && 'f-on']"
              :style="fWuxing === w ? { backgroundColor: w ? WX_COLOR[w] : '#78350f', borderColor: 'transparent' } : {}"
              @tap="fWuxing = w"
            >
              {{ w || '全部' }}
            </view>
          </view>
        </view>
        <view class="f-row">
          <text class="f-label">吉凶</text>
          <view class="f-opts">
            <view
              v-for="l in ['', '吉', '大吉']"
              :key="l || 'all'"
              :class="['f-opt', fLuck === l && 'f-on f-amber']"
              @tap="fLuck = l"
            >
              {{ l || '全部' }}
            </view>
          </view>
        </view>
        <view class="f-row">
          <text class="f-label">性别</text>
          <view class="f-opts">
            <view
              v-for="g in ['', '男', '女']"
              :key="g || 'all'"
              :class="['f-opt', fGender === g && 'f-on f-amber']"
              @tap="fGender = g"
            >
              {{ g || '不限' }}
            </view>
          </view>
        </view>

        <view class="f-row f-row-top">
          <text class="f-label">结构</text>
          <scroll-view class="f-scroll" scroll-x>
            <view class="f-chips">
              <view :class="['f-chip', fStructure === '' && 'f-on f-amber']" @tap="fStructure = ''">全部</view>
              <view
                v-for="s in facets.structures"
                :key="s.code"
                :class="['f-chip', fStructure === s.code && 'f-on f-amber']"
                @tap="fStructure = s.code"
              >
                {{ s.label.replace('结构', '') }}<text class="f-cnt">{{ s.count }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="f-row f-row-top">
          <text class="f-label">部首</text>
          <scroll-view class="f-scroll" scroll-x>
            <view class="f-chips">
              <view :class="['f-chip', fRadical === '' && 'f-on f-amber']" @tap="fRadical = ''">全部</view>
              <view
                v-for="rd in facets.radicals"
                :key="rd.radical"
                :class="['f-chip', 'serif', fRadical === rd.radical && 'f-on f-amber']"
                @tap="fRadical = rd.radical"
              >
                {{ rd.radical }}<text class="f-cnt">{{ rd.count }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <text v-if="hasFilter" class="f-reset" @tap="resetFilter">重置全部筛选</text>
      </view>

      <view class="plaza">
        <view v-for="c in plazaChars" :key="c.char" class="p-card" @tap="submit(c.char)">
          <view class="p-top">
            <text class="p-char">{{ c.char }}</text>
            <text class="p-wx" :style="{ backgroundColor: WX_COLOR[c.wuxing] }">{{ c.wuxing }}</text>
          </view>
          <text class="p-meta">
            {{ c.primaryPinyin }} · 康熙 {{ c.strokesKangxi }} 画 ·
            <text :style="{ color: LUCK_COLOR[c.shuli.luck] || '#8a7a68' }">{{ c.shuli.luck }}</text>
          </text>
          <text class="p-meta2">{{ c.structure }} · {{ c.radicalModern }}部</text>
          <text class="p-mean">{{ c.meaning }}</text>
          <text v-if="c.poem" class="p-poem">「{{ c.poem.quote }}」</text>
        </view>
      </view>
      <view v-if="!plazaChars.length" class="hint">无符合条件的字，请放宽筛选</view>
    </template>

    <Disclaimer
      variant="custom"
      text="本工具仅供传统文化研习参考，不构成任何预测或建议。字义数据源自《新华字典》开源语料，姓名学内容为传统民俗文化整理。"
    />
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 48rpx;
}
.serif {
  font-family: 'Songti SC', 'STSong', serif;
}

/* 模式切换 */
.tabs {
  display: flex;
  margin: 24rpx 32rpx 0;
  padding: 8rpx;
  border-radius: 24rpx;
  background: #f0ebe3;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #8a7a68;
}
.tab-on {
  background: #b45309;
  color: #fffbeb;
  font-weight: 700;
}

/* 查字 */
.search-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 28rpx 32rpx 0;
}
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 76rpx;
  padding: 0 28rpx;
  border: 1rpx solid rgba(180, 83, 9, 0.3);
  border-radius: 999rpx;
  background: #fff;
}
.search-ico {
  font-size: 24rpx;
}
.search-input {
  flex: 1;
  height: 76rpx;
  font-size: 26rpx;
  color: #3d2f22;
}
.ph {
  color: #b0a494;
}
.btn-search {
  padding: 0 34rpx;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 999rpx;
  background: #b45309;
  color: #fffbeb;
  font-size: 26rpx;
  font-weight: 700;
}

.hot {
  padding: 28rpx 32rpx 0;
}
.hot-label {
  font-size: 22rpx;
  color: #8a7a68;
}
.hot-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}
.hot-char {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #fff;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 34rpx;
  color: #3d2f22;
}

.hint {
  display: block;
  padding: 40rpx 32rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #8a7a68;
}
.hint-err {
  color: #b5432a;
}

.multi {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 28rpx 32rpx 0;
}
.multi-scroll {
  flex: 1;
  white-space: nowrap;
}
.multi-row {
  display: inline-flex;
  gap: 16rpx;
}
.multi-char {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #fff;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 38rpx;
  color: #3d2f22;
}
.multi-on {
  border-color: #b45309;
  background: #b45309;
  color: #fffbeb;
  font-weight: 700;
}
.btn-export {
  flex-shrink: 0;
  padding: 14rpx 18rpx;
  border: 1rpx solid rgba(180, 83, 9, 0.4);
  border-radius: 16rpx;
  background: #fff;
  color: #92400e;
  font-size: 22rpx;
}

.body {
  padding: 0 32rpx;
}
.card {
  margin-top: 24rpx;
  padding: 32rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 32rpx;
  background: #fff;
}
.head-card {
  border-color: rgba(180, 83, 9, 0.2);
  background: linear-gradient(180deg, #fdf6e9 0%, #fff 100%);
}
.head-row {
  display: flex;
  gap: 28rpx;
}
.head-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.unicode {
  font-size: 20rpx;
  color: #8a7a68;
}
.head-right {
  flex: 1;
  padding-top: 6rpx;
}
.py {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #7c2d12;
  margin-bottom: 10rpx;
}
.kv {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 8rpx;
  font-size: 26rpx;
}
.k {
  color: #8a7a68;
}
.k.sm {
  font-size: 22rpx;
}
.v {
  color: #3d2f22;
  margin-left: 8rpx;
}
.v.strong {
  font-weight: 700;
}
.sep {
  color: #e7e0d5;
  margin: 0 12rpx;
}
.wx-dot {
  width: 44rpx;
  height: 44rpx;
  margin-left: 8rpx;
  border-radius: 50%;
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  text-align: center;
  line-height: 44rpx;
}

.card-title {
  display: block;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 28rpx;
  font-weight: 700;
  color: #3d2f22;
  margin-bottom: 16rpx;
}
.para {
  display: block;
  font-size: 26rpx;
  line-height: 1.7;
  color: #6b5d4d;
  margin-bottom: 12rpx;
}
.luck-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.luck-tag {
  padding: 4rpx 14rpx;
  border-radius: 10rpx;
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
}
.luck-cmt {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.6;
  color: #8a7a68;
}
.tip-box {
  margin-top: 12rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: #f5f1ea;
}
.tip-text {
  font-size: 22rpx;
  line-height: 1.7;
  color: #6b5d4d;
}
.ji-list {
  margin-top: 8rpx;
}
.ji-item {
  display: block;
  font-size: 22rpx;
  line-height: 1.6;
  color: #8a7a68;
}

/* AI */
.ai-card {
  border-color: rgba(180, 83, 9, 0.25);
}
.ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.ai-head .card-title {
  margin-bottom: 0;
  color: #7c2d12;
}
.btn-ai {
  padding: 10rpx 26rpx;
  border-radius: 999rpx;
  background: #b45309;
  color: #fffbeb;
  font-size: 22rpx;
  font-weight: 700;
}
.ai-birth {
  height: 68rpx;
  padding: 0 20rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #f5f1ea;
  font-size: 22rpx;
  color: #3d2f22;
}
.ai-body {
  margin-top: 20rpx;
}
.poetic {
  padding: 22rpx;
  border-radius: 16rpx;
  background: #fdf6e9;
}
.poetic-text {
  display: block;
  text-align: center;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 26rpx;
  line-height: 1.7;
  color: #7c2d12;
}
.ai-sec {
  margin-top: 20rpx;
}
.ai-h {
  display: block;
  font-size: 22rpx;
  font-weight: 700;
  color: #8a7a68;
  margin-bottom: 8rpx;
}
.ai-p {
  font-size: 22rpx;
  line-height: 1.7;
  color: #6b5d4d;
}
.name-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.name-tag {
  padding: 4rpx 14rpx;
  border-radius: 10rpx;
  background: #f0ebe3;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 26rpx;
  font-weight: 700;
  color: #3d2f22;
}
.gender-tag {
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  background: #f0ebe3;
  font-size: 18rpx;
  color: #8a7a68;
}
.flex1 {
  flex: 1;
}
.bazi-box {
  margin-top: 20rpx;
  padding: 22rpx;
  border: 1rpx solid rgba(180, 83, 9, 0.25);
  border-radius: 16rpx;
  background: rgba(253, 246, 233, 0.6);
}
.rel-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.rel-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 18rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #f5f1ea;
}
.rel-char {
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 30rpx;
  font-weight: 700;
  color: #3d2f22;
}
.rel-why {
  font-size: 22rpx;
  color: #8a7a68;
}

.explain {
  max-height: 640rpx;
}
.explain-text {
  font-size: 26rpx;
  line-height: 1.8;
  color: #6b5d4d;
  white-space: pre-line;
}

.links {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.link-card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border: 1rpx solid rgba(180, 83, 9, 0.25);
  border-radius: 24rpx;
  background: #fff;
}
.link-t {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #3d2f22;
}
.link-d {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #8a7a68;
}
.link-arrow {
  font-size: 32rpx;
  color: #b45309;
}

/* 选字广场 */
.filters {
  padding: 28rpx 32rpx 0;
}
.f-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 18rpx;
}
.f-row-top {
  align-items: flex-start;
}
.f-label {
  width: 72rpx;
  flex-shrink: 0;
  font-size: 22rpx;
  color: #8a7a68;
  line-height: 56rpx;
}
.f-opts {
  flex: 1;
  display: flex;
  gap: 12rpx;
}
.f-opt {
  flex: 1;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #fff;
  font-size: 22rpx;
  color: #8a7a68;
}
.f-on {
  color: #fffbeb;
  border-color: transparent;
}
.f-amber {
  background: #b45309;
}
.f-scroll {
  flex: 1;
  white-space: nowrap;
}
.f-chips {
  display: inline-flex;
  gap: 12rpx;
  padding-bottom: 8rpx;
}
.f-chip {
  flex-shrink: 0;
  padding: 0 20rpx;
  height: 56rpx;
  line-height: 56rpx;
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #fff;
  font-size: 22rpx;
  color: #8a7a68;
}
.f-cnt {
  margin-left: 6rpx;
  opacity: 0.6;
  font-size: 20rpx;
}
.f-reset {
  font-size: 22rpx;
  color: #b45309;
  text-decoration: underline;
}

.plaza {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 28rpx 32rpx 0;
}
.p-card {
  width: calc(50% - 10rpx);
  padding: 24rpx;
  box-sizing: border-box;
  border: 1rpx solid #e7e0d5;
  border-radius: 24rpx;
  background: #fff;
}
.p-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.p-char {
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 56rpx;
  color: #3d2f22;
}
.p-wx {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  text-align: center;
  line-height: 44rpx;
}
.p-meta {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #8a7a68;
}
.p-meta2 {
  display: block;
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #a89b8a;
}
.p-mean {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #6b5d4d;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.p-poem {
  display: block;
  margin-top: 12rpx;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 20rpx;
  line-height: 1.6;
  color: rgba(146, 64, 14, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
