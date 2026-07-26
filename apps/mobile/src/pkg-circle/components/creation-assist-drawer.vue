<template>
  <view v-if="visible" class="assist-mask" @tap="emit('close')" @touchmove.self.prevent>
    <view class="assist-sheet" @tap.stop @touchmove.stop>
      <!-- 头部 -->
      <view class="sheet-header">
        <view class="header-close" @tap="emit('close')">
          <app-icon name="x" :size="20" color="#1a1a1a" />
        </view>
        <view class="header-title">
          <app-icon name="sparkles" :size="16" color="#C41E3A" />
          <text class="header-title-text">创作助手</text>
        </view>
        <view class="header-spacer" />
      </view>

      <!-- 四 tab：引用 / 命盘 / 案例 / 润色 -->
      <view class="tab-bar">
        <view
          v-for="t in TABS"
          :key="t.key"
          class="tab-item"
          :class="{ active: activeTab === t.key }"
          @tap="switchTab(t.key)"
        >
          <app-icon :name="t.icon" :size="16" :color="activeTab === t.key ? '#C41E3A' : '#8a8a8a'" />
          <text class="tab-text" :class="{ active: activeTab === t.key }">{{ t.label }}</text>
        </view>
      </view>

      <scroll-view scroll-y class="sheet-body">
        <!-- TODO(创-P3 留口·分佣场景种子未拍板)：内容带货插卡第五 tab —— 商品/课程选择器 + CONTENT_REFERRAL 分佣场景，拍板后新增 -->

        <!-- ═════ Tab 1 古籍引用 ═════ -->
        <view v-if="activeTab === 'quotes'" class="tab-pane">
          <view v-if="!hasContent" class="pane-hint">
            <text class="pane-hint-text">请先在编辑器输入内容，再来找古籍出处</text>
          </view>
          <template v-else>
            <view v-if="quotesLoading" class="pane-loading">
              <app-icon name="loader-2" :size="32" color="#C41E3A" class="spin" />
              <text class="pane-loading-text">正在检索 46 万章古籍…</text>
            </view>
            <view v-else-if="quotesError" class="pane-error">
              <text class="pane-error-text">{{ quotesError }}</text>
              <view class="btn-retry" @tap="loadQuotes"><text class="btn-retry-text">重试</text></view>
            </view>
            <template v-else-if="quotesResult">
              <view v-if="quotesResult.items.length === 0" class="pane-hint">
                <text class="pane-hint-text">未找到贴切的古籍引用，换个说法或补充内容再试试</text>
                <view class="btn-retry" @tap="loadQuotes"><text class="btn-retry-text">重新分析</text></view>
              </view>
              <template v-else>
                <view v-if="quotesResult.keywords.length" class="kw-row">
                  <text class="kw-label">关键词</text>
                  <text v-for="kw in quotesResult.keywords" :key="kw" class="kw-tag">{{ kw }}</text>
                </view>
                <view v-for="(q, i) in quotesResult.items" :key="q.chapterId + i" class="quote-card">
                  <text class="quote-text">「{{ q.quote }}」</text>
                  <text class="quote-source">——《{{ q.bookTitle }}·{{ q.chapterTitle }}》</text>
                  <view class="card-actions">
                    <view class="btn-insert" @tap="insertQuote(q)"><text class="btn-insert-text">插入引文</text></view>
                    <view class="btn-ghost" @tap="toClassicReader(q)">
                      <app-icon name="book-open" :size="14" color="#8a8a8a" />
                      <text class="btn-ghost-text">查看原文</text>
                    </view>
                  </view>
                </view>
                <view class="btn-refresh-row" @tap="loadQuotes">
                  <app-icon name="refresh-cw" :size="14" color="#8a8a8a" />
                  <text class="btn-ghost-text">重新分析</text>
                </view>
              </template>
            </template>
            <view v-else class="pane-hint">
              <text class="pane-hint-text">AI 将分析全文主旨，从古籍库为你推荐贴切的引用出处</text>
              <view class="btn-primary" @tap="loadQuotes"><text class="btn-primary-text">分析全文找出处</text></view>
            </view>
          </template>
        </view>

        <!-- ═════ Tab 2 命盘卡 ═════ -->
        <view v-if="activeTab === 'paipan'" class="tab-pane">
          <!-- 来源切换：手动四柱 / 我的排盘记录 -->
          <view class="seg-bar">
            <view class="seg-item" :class="{ active: paipanMode === 'manual' }" @tap="paipanMode = 'manual'">
              <text class="seg-text" :class="{ active: paipanMode === 'manual' }">手动输入四柱</text>
            </view>
            <view class="seg-item" :class="{ active: paipanMode === 'record' }" @tap="switchToRecords">
              <text class="seg-text" :class="{ active: paipanMode === 'record' }">我的排盘记录</text>
            </view>
          </view>

          <!-- 手动四柱输入 -->
          <view v-if="paipanMode === 'manual'" class="ganzhi-form">
            <view v-for="p in PILLARS" :key="p.key" class="ganzhi-item">
              <text class="ganzhi-label">{{ p.label }}</text>
              <input
                v-model="ganZhiInput[p.key]"
                class="ganzhi-input"
                :class="{ invalid: ganZhiInput[p.key].trim().length === 2 && !isValidGanZhi(ganZhiInput[p.key]) }"
                maxlength="2"
                placeholder="如 甲子"
                placeholder-class="ph"
              />
            </view>
            <text class="ganzhi-tip">每柱为一组干支（天干＋地支），如「甲子」「丙寅」</text>
            <view
              class="btn-primary"
              :class="{ disabled: !manualReady || cardLoading }"
              @tap="genCardFromGanZhi"
            >
              <text class="btn-primary-text">{{ cardLoading ? '生成中…' : '生成命盘卡' }}</text>
            </view>
          </view>

          <!-- 从我的排盘记录选（GET /paipan/bazi·仅本人八字记录） -->
          <view v-else class="record-list">
            <view v-if="recordsLoading" class="pane-loading">
              <app-icon name="loader-2" :size="32" color="#C41E3A" class="spin" />
              <text class="pane-loading-text">加载排盘记录…</text>
            </view>
            <view v-else-if="recordsError" class="pane-error">
              <text class="pane-error-text">{{ recordsError }}</text>
              <view class="btn-retry" @tap="loadRecords"><text class="btn-retry-text">重试</text></view>
            </view>
            <view v-else-if="records.length === 0" class="pane-hint">
              <text class="pane-hint-text">暂无八字排盘记录，可先去排盘工具起一盘，或切换手动输入四柱</text>
            </view>
            <template v-else>
              <view
                v-for="r in records"
                :key="r.id"
                class="record-row"
                :class="{ active: pickedRecordId === r.id }"
                @tap="genCardFromRecord(r.id)"
              >
                <app-icon name="compass" :size="18" color="#C41E3A" />
                <view class="record-info">
                  <text class="record-name">{{ r.clientName || '未命名' }}</text>
                  <text class="record-time">{{ formatDate(r.createdAt) }}</text>
                </view>
                <app-icon v-if="pickedRecordId === r.id && cardLoading" name="loader-2" :size="16" color="#C41E3A" class="spin" />
                <app-icon v-else-if="pickedRecordId === r.id && card" name="check" :size="16" color="#C41E3A" />
              </view>
            </template>
          </view>

          <view v-if="cardError" class="pane-error slim">
            <text class="pane-error-text">{{ cardError }}</text>
          </view>

          <!-- 命盘卡预览 -->
          <view v-if="card" class="paipan-card">
            <view class="paipan-grid">
              <view v-for="p in PILLARS" :key="p.key" class="paipan-col">
                <text class="paipan-col-label">{{ p.label }}</text>
                <text class="paipan-col-gz">{{ card.siZhu[p.key].ganZhi }}</text>
                <text class="paipan-col-ss">{{ card.siZhu[p.key].ganShiShen }}/{{ card.siZhu[p.key].zhiShiShen }}</text>
                <text class="paipan-col-ny">{{ card.siZhu[p.key].nayin }}</text>
              </view>
            </view>
            <text class="paipan-wuxing">{{ card.wuXing.desc }}</text>
            <view class="card-actions">
              <view class="btn-insert" @tap="showDesenConfirm = true"><text class="btn-insert-text">插入帖文</text></view>
            </view>
          </view>
        </view>

        <!-- ═════ Tab 3 相似案例 ═════ -->
        <view v-if="activeTab === 'cases'" class="tab-pane">
          <view v-if="!hasContent" class="pane-hint">
            <text class="pane-hint-text">请先在编辑器输入内容，再来找相似案例</text>
          </view>
          <template v-else>
            <view v-if="casesLoading" class="pane-loading">
              <app-icon name="loader-2" :size="32" color="#C41E3A" class="spin" />
              <text class="pane-loading-text">正在检索你的历史帖与全站公开案例…</text>
            </view>
            <view v-else-if="casesError" class="pane-error">
              <text class="pane-error-text">{{ casesError }}</text>
              <view class="btn-retry" @tap="loadCases"><text class="btn-retry-text">重试</text></view>
            </view>
            <template v-else-if="casesResult">
              <view v-if="casesResult.items.length === 0" class="pane-hint">
                <text class="pane-hint-text">未找到相似案例，补充盘型/主题描述后再试试</text>
                <view class="btn-retry" @tap="loadCases"><text class="btn-retry-text">重新检索</text></view>
              </view>
              <template v-else>
                <view v-for="c in casesResult.items" :key="c.postId" class="case-card">
                  <view class="case-head">
                    <text class="case-title">{{ c.title }}</text>
                    <text v-if="c.isOwn" class="case-badge own">我的</text>
                    <text v-if="c.qualityScore > 0" class="case-badge score">质量 {{ c.qualityScore }}</text>
                  </view>
                  <text v-if="c.excerpt" class="case-excerpt">{{ c.excerpt }}</text>
                  <view class="card-actions">
                    <view class="btn-insert" @tap="insertCase(c)"><text class="btn-insert-text">插入案例</text></view>
                  </view>
                </view>
                <view class="btn-refresh-row" @tap="loadCases">
                  <app-icon name="refresh-cw" :size="14" color="#8a8a8a" />
                  <text class="btn-ghost-text">重新检索</text>
                </view>
              </template>
            </template>
            <view v-else class="pane-hint">
              <text class="pane-hint-text">基于当前帖主题检索你的历史帖与全站公开帖，引用优质案例（不触达任何私有客户数据）</text>
              <view class="btn-primary" @tap="loadCases"><text class="btn-primary-text">找相似案例</text></view>
            </view>
          </template>
        </view>

        <!-- ═════ Tab 4 润色（复用已有 /ai/publish/polish） ═════ -->
        <view v-if="activeTab === 'polish'" class="tab-pane">
          <view v-if="!hasContent" class="pane-hint">
            <text class="pane-hint-text">请先在编辑器输入内容，再来润色</text>
          </view>
          <template v-else>
            <view v-if="polishLoading" class="pane-loading">
              <app-icon name="loader-2" :size="32" color="#C41E3A" class="spin" />
              <text class="pane-loading-text">AI 正在润色…</text>
            </view>
            <view v-else-if="polishError" class="pane-error">
              <text class="pane-error-text">{{ polishError }}</text>
              <view class="btn-retry" @tap="loadPolish"><text class="btn-retry-text">重试</text></view>
            </view>
            <template v-else-if="polished">
              <view class="polish-box"><text class="polish-text">{{ polished }}</text></view>
              <view class="card-actions">
                <view class="btn-insert" @tap="applyPolish"><text class="btn-insert-text">应用润色</text></view>
                <view class="btn-ghost" @tap="loadPolish">
                  <app-icon name="refresh-cw" :size="14" color="#8a8a8a" />
                  <text class="btn-ghost-text">再来一版</text>
                </view>
              </view>
            </template>
            <view v-else class="pane-hint">
              <text class="pane-hint-text">AI 将在保留原意的基础上优化全文表达</text>
              <view class="btn-primary" @tap="loadPolish"><text class="btn-primary-text">AI 润色全文</text></view>
            </view>
          </template>
        </view>
      </scroll-view>

      <!-- 发布前脱敏确认（R3）：命盘卡插入二次确认 -->
      <view v-if="showDesenConfirm" class="confirm-mask" @tap="showDesenConfirm = false">
        <view class="confirm-box" @tap.stop>
          <view class="confirm-head">
            <app-icon name="shield-check" :size="20" color="#C41E3A" />
            <text class="confirm-title">脱敏确认</text>
          </view>
          <text class="confirm-text">命盘卡仅包含四柱干支、十神与五行，不含姓名与生辰。</text>
          <text class="confirm-text warn">请确认帖文正文中也不要透露当事人姓名、精确生辰等可识别信息，保护他人隐私。</text>
          <view class="confirm-actions">
            <view class="btn-ghost center" @tap="showDesenConfirm = false"><text class="btn-ghost-text">再想想</text></view>
            <view class="btn-insert" @tap="confirmInsertPaipan"><text class="btn-insert-text">确认插入</text></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 创作助手抽屉（创-P3 编辑器融合）
 * 四 tab：引用（古籍引用推荐）/ 命盘（命盘卡）/ 案例（相似案例）/ 润色（复用 /ai/publish/polish）。
 * 插入均为文本化 Markdown 引用块（帖子渲染端 parseMarkdown 无链接/自定义块能力·诚实降级）。
 */
import { computed, reactive, ref } from 'vue'
import {
  creationAssistApi,
  isValidGanZhi,
  buildQuoteInsertText,
  buildPaipanInsertText,
  buildCaseInsertText,
  type ClassicQuoteItem,
  type ClassicQuotesResult,
  type PaipanCard,
  type SimilarCaseItem,
  type SimilarCasesResult,
  type BaziRecordItem,
} from '@/lib/creation-assist-data'
import { publishAssistApi } from '@/pkg-circle/lib/publish-assist-data'

const props = defineProps<{
  visible: boolean
  /** 编辑器当前正文（分析/润色的输入源） */
  content: string
  /** 已选标签（相似案例检索辅助·可空） */
  tags?: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'insert', text: string): void
  (e: 'apply-polish', text: string): void
}>()

type TabKey = 'quotes' | 'paipan' | 'cases' | 'polish'
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'quotes', label: '引用', icon: 'scroll-text' },
  { key: 'paipan', label: '命盘', icon: 'compass' },
  { key: 'cases', label: '案例', icon: 'layers' },
  { key: 'polish', label: '润色', icon: 'sparkles' },
]
const PILLARS = [
  { key: 'nian', label: '年柱' },
  { key: 'yue', label: '月柱' },
  { key: 'ri', label: '日柱' },
  { key: 'shi', label: '时柱' },
] as const

const activeTab = ref<TabKey>('quotes')
const hasContent = computed(() => props.content.trim().length > 0)

function switchTab(key: TabKey) { activeTab.value = key }

// ─────── Tab 1 古籍引用 ───────
const quotesLoading = ref(false)
const quotesError = ref('')
const quotesResult = ref<ClassicQuotesResult | null>(null)

async function loadQuotes() {
  if (quotesLoading.value) return
  const text = props.content.trim()
  if (text.length < 4) { uni.showToast({ title: '内容太短（至少4字）', icon: 'none' }); return }
  quotesLoading.value = true
  quotesError.value = ''
  try {
    quotesResult.value = await creationAssistApi.classicQuotes(text)
  } catch (e) {
    quotesResult.value = null
    quotesError.value = (e as Error)?.message || '检索失败'
  } finally { quotesLoading.value = false }
}

function insertQuote(item: ClassicQuoteItem) {
  emit('insert', buildQuoteInsertText(item))
  uni.showToast({ title: '引文已插入', icon: 'success' })
}

function toClassicReader(item: ClassicQuoteItem) {
  uni.navigateTo({ url: `/pkg-classics/reader/index?bookId=${item.bookId}&chapterId=${item.chapterId}` })
}

// ─────── Tab 2 命盘卡 ───────
const paipanMode = ref<'manual' | 'record'>('manual')
const ganZhiInput = reactive<Record<'nian' | 'yue' | 'ri' | 'shi', string>>({ nian: '', yue: '', ri: '', shi: '' })
const manualReady = computed(() =>
  (['nian', 'yue', 'ri', 'shi'] as const).every((k) => isValidGanZhi(ganZhiInput[k])),
)

const records = ref<BaziRecordItem[]>([])
const recordsLoading = ref(false)
const recordsError = ref('')
const recordsLoaded = ref(false)
const pickedRecordId = ref('')

const card = ref<PaipanCard | null>(null)
const cardLoading = ref(false)
const cardError = ref('')
const showDesenConfirm = ref(false)

function switchToRecords() {
  paipanMode.value = 'record'
  if (!recordsLoaded.value) loadRecords()
}

async function loadRecords() {
  if (recordsLoading.value) return
  recordsLoading.value = true
  recordsError.value = ''
  try {
    const res = await creationAssistApi.myBaziRecords()
    records.value = res.records
    recordsLoaded.value = true
  } catch (e) {
    recordsError.value = (e as Error)?.message || '加载失败'
  } finally { recordsLoading.value = false }
}

async function genCardFromGanZhi() {
  if (cardLoading.value || !manualReady.value) return
  cardLoading.value = true
  cardError.value = ''
  card.value = null
  pickedRecordId.value = ''
  try {
    card.value = await creationAssistApi.paipanCardFromGanZhi({
      nian: ganZhiInput.nian.trim(),
      yue: ganZhiInput.yue.trim(),
      ri: ganZhiInput.ri.trim(),
      shi: ganZhiInput.shi.trim(),
    })
  } catch (e) {
    cardError.value = (e as Error)?.message || '生成失败'
  } finally { cardLoading.value = false }
}

async function genCardFromRecord(recordId: string) {
  if (cardLoading.value) return
  cardLoading.value = true
  cardError.value = ''
  card.value = null
  pickedRecordId.value = recordId
  try {
    card.value = await creationAssistApi.paipanCardFromRecord(recordId)
  } catch (e) {
    cardError.value = (e as Error)?.message || '生成失败'
  } finally { cardLoading.value = false }
}

function confirmInsertPaipan() {
  if (!card.value) return
  showDesenConfirm.value = false
  emit('insert', buildPaipanInsertText(card.value))
  uni.showToast({ title: '命盘卡已插入', icon: 'success' })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─────── Tab 3 相似案例 ───────
const casesLoading = ref(false)
const casesError = ref('')
const casesResult = ref<SimilarCasesResult | null>(null)

async function loadCases() {
  if (casesLoading.value) return
  const text = props.content.trim()
  if (text.length < 2) { uni.showToast({ title: '内容太短', icon: 'none' }); return }
  casesLoading.value = true
  casesError.value = ''
  try {
    casesResult.value = await creationAssistApi.similarCases(text, props.tags)
  } catch (e) {
    casesResult.value = null
    casesError.value = (e as Error)?.message || '检索失败'
  } finally { casesLoading.value = false }
}

function insertCase(item: SimilarCaseItem) {
  emit('insert', buildCaseInsertText(item))
  uni.showToast({ title: '案例已插入', icon: 'success' })
}

// ─────── Tab 4 润色（复用已有 publish-assist 端点） ───────
const polishLoading = ref(false)
const polishError = ref('')
const polished = ref('')

async function loadPolish() {
  if (polishLoading.value) return
  polishLoading.value = true
  polishError.value = ''
  try {
    const res = await publishAssistApi.polish(props.content)
    polished.value = res.polished
  } catch (e) {
    polished.value = ''
    polishError.value = (e as Error)?.message || '润色失败'
  } finally { polishLoading.value = false }
}

function applyPolish() {
  if (!polished.value) return
  emit('apply-polish', polished.value)
  emit('close')
}
</script>

<style scoped>
.assist-mask {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(0, 0, 0, 0.5);
}
.assist-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #ececec;
}
.header-close { padding: 8rpx; }
.header-title { display: flex; align-items: center; gap: 12rpx; }
.header-title-text { font-size: 30rpx; font-weight: 600; color: #1a1a1a; }
.header-spacer { width: 44rpx; }

.tab-bar {
  display: flex;
  border-bottom: 1rpx solid #ececec;
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx 0;
  border-bottom: 4rpx solid transparent;
}
.tab-item.active { border-bottom-color: #C41E3A; }
.tab-text { font-size: 26rpx; color: #8a8a8a; }
.tab-text.active { color: #C41E3A; font-weight: 600; }

.sheet-body { flex: 1; height: 0; min-height: 320rpx; max-height: 58vh; }
.sheet-body :deep(.uni-scroll-view),
.sheet-body :deep(.uni-scroll-view-content) { overscroll-behavior: contain; }
.tab-pane { padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* 三态 */
.pane-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 48rpx 24rpx;
}
.pane-hint-text { font-size: 26rpx; color: #8a8a8a; line-height: 1.6; text-align: center; }
.pane-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 72rpx 0;
}
.pane-loading-text { font-size: 26rpx; color: #8a8a8a; }
.pane-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 48rpx 24rpx;
}
.pane-error.slim { padding: 8rpx 0; }
.pane-error-text { font-size: 26rpx; color: #dc2626; text-align: center; }
.btn-retry { padding: 12rpx 40rpx; border: 1rpx solid #ececec; border-radius: 999rpx; }
.btn-retry-text { font-size: 26rpx; color: #1a1a1a; }

/* 按钮 */
.btn-primary {
  align-self: center;
  padding: 20rpx 56rpx;
  background: #C41E3A;
  border-radius: 999rpx;
}
.btn-primary.disabled { opacity: 0.4; }
.btn-primary-text { font-size: 28rpx; color: #fff; }
.card-actions { display: flex; align-items: center; gap: 16rpx; }
.btn-insert {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  background: #C41E3A;
  border-radius: 16rpx;
}
.btn-insert-text { font-size: 26rpx; color: #fff; }
.btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  border: 1rpx solid #ececec;
  border-radius: 16rpx;
}
.btn-ghost.center { flex: 1; }
.btn-ghost-text { font-size: 24rpx; color: #8a8a8a; }
.btn-refresh-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 16rpx;
}

/* 引用卡 */
.kw-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12rpx; }
.kw-label { font-size: 22rpx; color: #8a8a8a; }
.kw-tag {
  padding: 4rpx 16rpx;
  background: rgba(196, 30, 58, 0.08);
  color: #C41E3A;
  font-size: 22rpx;
  border-radius: 999rpx;
}
.quote-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;
  background: #faf7f2;
  border-radius: 20rpx;
}
.quote-text { font-size: 28rpx; color: #1a1a1a; line-height: 1.7; }
.quote-source { font-size: 24rpx; color: #8a6f4e; align-self: flex-end; }

/* 命盘 */
.seg-bar {
  display: flex;
  background: #f4f4f5;
  border-radius: 16rpx;
  padding: 6rpx;
}
.seg-item { flex: 1; text-align: center; padding: 14rpx 0; border-radius: 12rpx; }
.seg-item.active { background: #fff; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06); }
.seg-text { font-size: 26rpx; color: #8a8a8a; }
.seg-text.active { color: #C41E3A; font-weight: 600; }
.ganzhi-form { display: flex; flex-direction: column; gap: 20rpx; }
.ganzhi-item { display: flex; align-items: center; gap: 24rpx; }
.ganzhi-label { font-size: 26rpx; color: #1a1a1a; width: 96rpx; }
.ganzhi-input {
  flex: 1;
  padding: 16rpx 24rpx;
  background: #f4f4f5;
  border-radius: 16rpx;
  font-size: 28rpx;
  border: 1rpx solid transparent;
}
.ganzhi-input.invalid { border-color: #dc2626; }
.ganzhi-tip { font-size: 22rpx; color: #8a8a8a; }
.ph { color: #b0b0b0; }
.record-list { display: flex; flex-direction: column; gap: 16rpx; }
.record-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: #f4f4f5;
  border-radius: 20rpx;
}
.record-row.active { background: rgba(196, 30, 58, 0.08); }
.record-info { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.record-name { font-size: 28rpx; color: #1a1a1a; }
.record-time { font-size: 22rpx; color: #8a8a8a; }
.paipan-card {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 24rpx;
  background: #faf7f2;
  border-radius: 20rpx;
}
.paipan-grid { display: flex; }
.paipan-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.paipan-col-label { font-size: 22rpx; color: #8a8a8a; }
.paipan-col-gz { font-size: 34rpx; font-weight: 600; color: #1a1a1a; }
.paipan-col-ss { font-size: 22rpx; color: #8a6f4e; }
.paipan-col-ny { font-size: 20rpx; color: #b0a08a; }
.paipan-wuxing { font-size: 24rpx; color: #1a1a1a; text-align: center; }

/* 案例卡 */
.case-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;
  background: #f8f8f8;
  border-radius: 20rpx;
}
.case-head { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.case-title { font-size: 28rpx; font-weight: 600; color: #1a1a1a; flex: 1; }
.case-badge { padding: 2rpx 14rpx; font-size: 20rpx; border-radius: 999rpx; }
.case-badge.own { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
.case-badge.score { background: rgba(5, 150, 105, 0.1); color: #059669; }
.case-excerpt { font-size: 24rpx; color: #666; line-height: 1.6; }

/* 润色 */
.polish-box { padding: 24rpx; background: rgba(196, 30, 58, 0.05); border-radius: 20rpx; }
.polish-text { font-size: 28rpx; color: #1a1a1a; line-height: 1.7; white-space: pre-wrap; }

/* 脱敏确认弹窗（R3） */
.confirm-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-box {
  width: 78%;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.confirm-head { display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.confirm-title { font-size: 30rpx; font-weight: 600; color: #1a1a1a; }
.confirm-text { font-size: 26rpx; color: #666; line-height: 1.6; }
.confirm-text.warn { color: #C41E3A; }
.confirm-actions { display: flex; gap: 16rpx; margin-top: 8rpx; }

.spin { animation: assist-spin 1s linear infinite; }
@keyframes assist-spin { to { transform: rotate(360deg); } }
</style>
