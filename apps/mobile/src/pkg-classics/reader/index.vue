<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { onLoad, onUnload, onHide } from '@dcloudio/uni-app'
import { classicsApi, type BookmarkItem, type NoteItem } from '@/lib/classics-data'
import { getToken } from '@/utils/storage'
import TouchpointCard from '@/components/common/touchpoint-card.vue'
import AiThinking from '@/components/classics/ai-thinking.vue'
import { touchpointApi, type TouchpointResult } from '@/lib/touchpoint-data'

interface ChapterRef { id: string; title: string }

const bookId = ref('')
const bookTitle = ref('')
const chapters = ref<ChapterRef[]>([])
const curIndex = ref(0)
const paragraphs = ref<string[]>([])
const loading = ref(true)
const error = ref('')

const curChapter = computed(() => chapters.value[curIndex.value] || null)
const hasPrev = computed(() => curIndex.value > 0)
const hasNext = computed(() => curIndex.value < chapters.value.length - 1)
const progressPct = computed(() =>
  chapters.value.length ? Math.round(((curIndex.value + 1) / chapters.value.length) * 100) : 0,
)

// ── 阅读偏好（持久化）──
type Theme = 'yangpi' | 'hugu' | 'white' | 'night'
const FONT_STEPS = [30, 34, 38, 44, 50]
const theme = ref<Theme>('yangpi')
const fontIdx = ref(1)
const fontSize = computed(() => FONT_STEPS[fontIdx.value])

// app-icon 需具体色值（非 CSS 变量），随主题切换
const THEME_COLORS: Record<Theme, { fg: string; sub: string; brand: string }> = {
  yangpi: { fg: '#3b2f1c', sub: '#998a6b', brand: '#a06a38' },
  hugu: { fg: '#2c3a26', sub: '#6f7d66', brand: '#3f8560' },
  white: { fg: '#2c2c2c', sub: '#999999', brand: '#c41e3a' },
  night: { fg: '#c9c2b4', sub: '#6f6a60', brand: '#c8945a' },
}
const iconColor = computed(() => THEME_COLORS[theme.value].fg)
const subColor = computed(() => THEME_COLORS[theme.value].sub)
const brandColor = computed(() => THEME_COLORS[theme.value].brand)
const PREF_KEY = 'classics_reader_pref'
function loadPref() {
  try {
    const p = uni.getStorageSync(PREF_KEY)
    if (p && typeof p === 'object') {
      if (p.theme) theme.value = p.theme
      if (typeof p.fontIdx === 'number') fontIdx.value = Math.min(Math.max(p.fontIdx, 0), FONT_STEPS.length - 1)
    }
  } catch { /* ignore */ }
}
function savePref() {
  try { uni.setStorageSync(PREF_KEY, { theme: theme.value, fontIdx: fontIdx.value }) } catch { /* ignore */ }
}

// ── 弹层开关 ──
const tocOpen = ref(false)
const setOpen = ref(false)
const noteOpen = ref(false)
const dictOpen = ref(false)

// ── 目录抽屉页签（目录 / 书签 / 笔记·本书维度） ──
const tocTab = ref<'toc' | 'marks' | 'notes'>('toc')
const bookMarks = ref<BookmarkItem[]>([])
const bookNotes = ref<NoteItem[]>([])
const marksLoading = ref(false)
const marksLoaded = ref(false)
async function loadMarksAndNotes(force = false) {
  if (!isLoggedIn()) return
  if (marksLoading.value || (marksLoaded.value && !force)) return
  marksLoading.value = true
  try {
    const [bms, nts] = await Promise.all([
      classicsApi.bookmarks(bookId.value).catch(() => [] as BookmarkItem[]),
      classicsApi.notes(bookId.value).catch(() => [] as NoteItem[]),
    ])
    bookMarks.value = bms
    bookNotes.value = nts
    marksLoaded.value = true
  } finally {
    marksLoading.value = false
  }
}
watch([tocOpen, tocTab], ([open, tab]) => {
  if (open && (tab === 'marks' || tab === 'notes')) loadMarksAndNotes()
})

// ── 回跳定位：书签/笔记列表跳转带 chapterId+pos，滚动到段落并短暂高亮 ──
const pendingPos = ref<number | null>(null)
const highlightIdx = ref(-1)
let hlTimer: ReturnType<typeof setTimeout> | null = null
function scrollToParagraph(pos: number) {
  if (pos == null || pos < 0) return
  nextTick(() => {
    setTimeout(() => {
      // 旧书签存的是滚动像素（超出段数视为 legacy scrollTop）
      if (pos >= paragraphs.value.length) {
        uni.pageScrollTo({ scrollTop: pos, duration: 300 })
        return
      }
      const q = uni.createSelectorQuery()
      q.selectAll('.rd-para').boundingClientRect()
      q.selectViewport().scrollOffset(() => {}) // 类型声明要求回调；结果仍经 exec 聚合返回
      q.exec((res) => {
        const rects = (res?.[0] || []) as { top: number }[]
        const scroll = (res?.[1] || {}) as { scrollTop?: number }
        const rect = rects[pos]
        if (!rect) return
        const target = Math.max(0, (scroll.scrollTop || 0) + rect.top - 120)
        uni.pageScrollTo({ scrollTop: target, duration: 300 })
        highlightIdx.value = pos
        if (hlTimer) clearTimeout(hlTimer)
        hlTimer = setTimeout(() => { highlightIdx.value = -1 }, 3000)
      })
    }, 250)
  })
}
function jumpToBookmark(bm: BookmarkItem) {
  tocOpen.value = false
  const idx = chapters.value.findIndex((c) => c.id === bm.chapterId)
  const pos = bm.position ?? 0
  if (idx < 0) { uni.showToast({ title: '未找到对应章节', icon: 'none' }); return }
  if (idx === curIndex.value) { scrollToParagraph(pos); return }
  loadChapter(idx).then(() => scrollToParagraph(pos))
}
function jumpToNote(n: NoteItem) {
  tocOpen.value = false
  const idx = chapters.value.findIndex((c) => c.id === n.chapterId)
  if (idx < 0) { uni.showToast({ title: '未找到对应章节', icon: 'none' }); return }
  if (idx !== curIndex.value) loadChapter(idx)
}
function goAllBookmarks() { tocOpen.value = false; uni.navigateTo({ url: '/pkg-classics/bookmarks/index' }) }
function goAllNotes() { tocOpen.value = false; uni.navigateTo({ url: '/pkg-classics/notes/index' }) }

// ── AI 文白对照抽屉 ──
const aiOpen = ref(false)
const aiSeg = ref('')
const aiLoading = ref(false)
const aiError = ref('')
const aiResult = ref<{ translation: string; notes: string[]; source?: string } | null>(null)

// ── 查词 ──
const dictWord = ref('')
const dictLoading = ref(false)
const dictResult = ref<any>(null) // 查词结果对象结构随后端，保留 any
const dictError = ref('')

// ── 笔记 ──
const noteText = ref('')
const noteSubmitting = ref(false)

const bookmarking = ref(false)

function isLoggedIn() {
  return !!getToken()
}
function needLogin() {
  uni.showModal({
    title: '需要登录',
    content: '登录后即可使用 AI 解读、书签、笔记等功能',
    confirmText: '去登录',
    success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pkg-auth/login/index' }) },
  })
}

/** 把章节正文切成可点击的段/句，便于「点哪句解读哪句」 */
function splitParagraphs(text: string): string[] {
  if (!text) return []
  let parts = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 1) {
    parts = text
      .replace(/([。！？；])/g, '$1\n')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return parts
}

async function fetchBook(id: string, chapterId?: string) {
  loading.value = true
  error.value = ''
  try {
    const data = await classicsApi.detail(id)
    if (!data.book) throw new Error('书籍不存在')
    bookTitle.value = data.book.title
    chapters.value = (data.book.chapters || []).map((c: { id: string; title: string }) => ({ id: c.id, title: c.title }))
    if (!chapters.value.length) throw new Error('本书暂无可阅读章节')
    let idx = chapterId ? chapters.value.findIndex((c) => c.id === chapterId) : 0
    if (idx < 0) idx = 0
    await loadChapter(idx, false)
    if (pendingPos.value != null) {
      scrollToParagraph(pendingPos.value)
      pendingPos.value = null
    }
    loadTouchpoint()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

// ── 无痕商业化触点 #1 古籍精讲课（classic_course·场景标签上线前服务端返回空→v-if 天然隐藏） ──
// 每次进书拉一次（静默降级）；卡为章末文档流内静态小卡，不悬浮不弹出，不打断阅读
const tp = ref<TouchpointResult | null>(null)
async function loadTouchpoint() {
  tp.value = await touchpointApi.get('classic_course', { bookId: bookId.value, bookTitle: bookTitle.value })
}

async function loadChapter(idx: number, scrollTop = true) {
  const ch = chapters.value[idx]
  if (!ch) return
  curIndex.value = idx
  try {
    const data = await classicsApi.chapter(ch.id)
    paragraphs.value = splitParagraphs(data?.content || '')
  } catch {
    paragraphs.value = []
  }
  if (scrollTop) uni.pageScrollTo({ scrollTop: 0, duration: 0 })
  saveProgress()
}

// ── 古籍伴读（带当前章节上下文进入伴读对话） ──
function goCompanion() {
  const ch = chapters.value[curIndex.value]
  if (!ch) { uni.showToast({ title: '请先选择章节', icon: 'none' }); return }
  const params = `chapterId=${ch.id}&bookTitle=${encodeURIComponent(bookTitle.value || '')}&chapterTitle=${encodeURIComponent(ch.title || '')}`
  uni.navigateTo({ url: `/pkg-classics/companion/index?${params}` })
}

function goPrev() { if (hasPrev.value) { tocOpen.value = false; loadChapter(curIndex.value - 1) } }
function goNext() { if (hasNext.value) { tocOpen.value = false; loadChapter(curIndex.value + 1) } }
function jumpTo(idx: number) { tocOpen.value = false; loadChapter(idx) }

// ── 点句即时 AI 白话对照 ──
const aiThinkStart = ref(0) // 请求发起时刻：关抽屉重开时动态卡续接进度
let aiSeq = 0
async function explain(seg: string) {
  if (!isLoggedIn()) { needLogin(); return }
  // 同一句已出结果（如等待中关过抽屉）：直接重开呈现，不重复请求
  if (seg === aiSeg.value && (aiResult.value || aiLoading.value)) { aiOpen.value = true; return }
  aiOpen.value = true
  aiSeg.value = seg
  aiResult.value = null
  aiError.value = ''
  aiThinkStart.value = Date.now()
  aiLoading.value = true
  const seq = ++aiSeq // 并发防串台：等待中又点了别句时，旧响应作废不覆盖新句结果
  try {
    const r = await classicsApi.translate(seg, bookTitle.value)
    if (seq !== aiSeq) return
    aiResult.value = { translation: r?.translation || '暂无翻译', notes: Array.isArray(r?.notes) ? r.notes : [], source: r?.source }
  } catch (e) {
    if (seq !== aiSeq) return
    aiError.value = (e as Error)?.message || 'AI 解读失败，请稍后重试'
  } finally {
    if (seq === aiSeq) aiLoading.value = false
  }
}

// ── H5 选中任意文字 → 即时解读（在「点句」基础上支持自由划选片段）──
const selectedText = ref('')
function handleSelection() {
  if (typeof window === 'undefined') return
  // uni 类型缺 Web Speech/DOM，保留 as any
  const t = (((window as any).getSelection && (window as any).getSelection())?.toString() || '').trim()
  selectedText.value = t.length >= 2 && t.length <= 200 ? t : ''
}
function explainSelection() {
  const t = selectedText.value
  selectedText.value = ''
  if (t) explain(t)
}
onMounted(() => {
  if (typeof document !== 'undefined') document.addEventListener('selectionchange', handleSelection)
})
onUnmounted(() => {
  if (typeof document !== 'undefined') document.removeEventListener('selectionchange', handleSelection)
})

// ── 查词 ──
async function doLookup() {
  const w = dictWord.value.trim()
  if (!w) return
  if (!isLoggedIn()) { needLogin(); return }
  dictLoading.value = true
  dictError.value = ''
  dictResult.value = null
  try {
    dictResult.value = await classicsApi.lookupWord(w)
  } catch (e) {
    dictError.value = (e as Error)?.message || '查询失败'
  } finally {
    dictLoading.value = false
  }
}

// ── 书签 ──
/** 找到当前视口顶部的段落索引（存段落索引而非滚动像素，换字号/设备也能精确回跳） */
function getTopParagraphIdx(): Promise<number> {
  return new Promise((resolve) => {
    const q = uni.createSelectorQuery()
    q.selectAll('.rd-para').boundingClientRect()
    q.exec((res) => {
      const rects = (res?.[0] || []) as { bottom: number }[]
      if (!rects.length) { resolve(0); return }
      const idx = rects.findIndex((r) => r.bottom > 100)
      resolve(idx < 0 ? 0 : idx)
    })
  })
}
async function addBookmark() {
  if (!isLoggedIn()) { needLogin(); return }
  if (bookmarking.value || !curChapter.value) return
  bookmarking.value = true
  try {
    const idx = await getTopParagraphIdx()
    const excerpt = (paragraphs.value[idx] || '').slice(0, 60)
    await classicsApi.addBookmark(bookId.value, { chapterId: curChapter.value.id, position: idx, note: excerpt })
    marksLoaded.value = false // 目录抽屉书签页签下次打开时刷新
    // 告知查看入口，避免「加了书签却不知在哪看」
    uni.showModal({
      title: '已加书签',
      content: `已记下「${excerpt.slice(0, 16)}…」的位置。可在阅读器目录的「书签」页签或「我的书签」中一键回跳。`,
      confirmText: '查看书签', cancelText: '继续阅读',
      success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pkg-classics/bookmarks/index' }) },
    })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '添加失败', icon: 'none' })
  } finally {
    bookmarking.value = false
  }
}

// ── 笔记 ──
function openNote() {
  if (!isLoggedIn()) { needLogin(); return }
  noteText.value = ''
  noteOpen.value = true
}
async function submitNote() {
  const c = noteText.value.trim()
  if (!c || noteSubmitting.value || !curChapter.value) return
  noteSubmitting.value = true
  try {
    await classicsApi.addNote(bookId.value, { chapterId: curChapter.value.id, content: c })
    noteOpen.value = false
    marksLoaded.value = false // 目录抽屉笔记页签下次打开时刷新
    // 告知查看入口，避免「写了笔记却找不到在哪」
    uni.showModal({
      title: '笔记已保存',
      content: '可在阅读器目录的「笔记」页签或「我的笔记」中查看、编辑和回跳。',
      confirmText: '查看笔记', cancelText: '继续阅读',
      success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pkg-classics/notes/index' }) },
    })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    noteSubmitting.value = false
  }
}

// ── 进度上报（登录态才有意义；静默失败不打扰阅读）──
function saveProgress() {
  if (!isLoggedIn() || !curChapter.value) return
  classicsApi.saveProgress(bookId.value, curChapter.value.id, progressPct.value).catch(() => {})
}

function pickTheme(t: Theme) { theme.value = t; savePref() }
function fontDown() { if (fontIdx.value > 0) { fontIdx.value--; savePref() } }
function fontUp() { if (fontIdx.value < FONT_STEPS.length - 1) { fontIdx.value++; savePref() } }

function goBack() {
  uni.navigateBack({ fail: () => uni.navigateTo({ url: '/pkg-classics/home/index' }) })
}

onHide(() => saveProgress())
onUnload(() => saveProgress())

onLoad((q) => {
  loadPref()
  bookId.value = String(q?.bookId || q?.id || '')
  const chapterId = q?.chapterId ? String(q.chapterId) : undefined
  // 书签/笔记回跳定位：?pos=段落索引（旧数据为滚动像素·scrollToParagraph 内兼容）
  const rawPos = Number(q?.pos)
  if (Number.isFinite(rawPos) && rawPos >= 0) pendingPos.value = Math.round(rawPos)
  if (!bookId.value) { error.value = '缺少书籍参数'; loading.value = false; return }
  fetchBook(bookId.value, chapterId)
})
</script>

<template>
  <view class="rd" :class="`rd-theme-${theme}`">
    <!-- 顶栏 -->
    <view class="rd-top">
      <view class="rd-statusbar" />
      <view class="rd-top-inner">
        <view class="rd-icon-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" :color="iconColor" /></view>
        <view class="rd-top-mid">
          <text class="rd-top-title">{{ bookTitle }}</text>
          <text v-if="curChapter" class="rd-top-sub">{{ curChapter.title }}</text>
        </view>
        <view class="rd-icon-btn" @tap="dictOpen = true"><app-icon name="search" :size="36" :color="iconColor" /></view>
      </view>
    </view>

    <!-- 正文 -->
    <view class="rd-body">
      <view v-if="loading" class="rd-state"><text class="rd-state-txt">正在翻开书页…</text></view>
      <view v-else-if="error" class="rd-state">
        <text class="rd-state-txt">{{ error }}</text>
        <view class="rd-retry" @tap="fetchBook(bookId)"><text>重试</text></view>
      </view>
      <template v-else>
        <view class="rd-chapter-head">
          <text class="rd-chapter-title">{{ curChapter?.title }}</text>
          <text class="rd-chapter-from">{{ bookTitle }}</text>
        </view>
        <view v-if="!paragraphs.length" class="rd-state">
          <text class="rd-state-txt">本章暂无正文内容</text>
        </view>
        <view v-else class="rd-content" :style="{ fontSize: fontSize + 'rpx' }">
          <text
            v-for="(p, i) in paragraphs"
            :key="i"
            class="rd-para"
            :class="{ 'rd-para-hl': i === highlightIdx }"
            @tap="explain(p)"
          >{{ p }}</text>
        </view>
        <view class="rd-tip">
          <app-icon name="sparkles" :size="26" :color="subColor" />
          <text class="rd-tip-txt">读到不懂之处，轻点该句即可获得 AI 白话对照与注释</text>
        </view>
        <!-- 触点 #1 古籍精讲课：章末读完位·文档流内静态卡（不悬浮不遮挡）·服务端无卡则不渲染 -->
        <touchpoint-card v-if="tp?.card" :card="tp.card" scene="classic_course" />
        <!-- 章节切换 -->
        <view class="rd-chapter-nav">
          <view class="rd-cn-btn" :class="{ 'rd-cn-disabled': !hasPrev }" @tap="goPrev">
            <app-icon name="chevron-left" :size="32" :color="hasPrev ? brandColor : subColor" />
            <text class="rd-cn-txt" :style="{ color: hasPrev ? brandColor : subColor }">上一章</text>
          </view>
          <text class="rd-cn-page">{{ curIndex + 1 }} / {{ chapters.length }}</text>
          <view class="rd-cn-btn" :class="{ 'rd-cn-disabled': !hasNext }" @tap="goNext">
            <text class="rd-cn-txt" :style="{ color: hasNext ? brandColor : subColor }">下一章</text>
            <app-icon name="chevron-right" :size="32" :color="hasNext ? brandColor : subColor" />
          </view>
        </view>
      </template>
    </view>

    <!-- H5 选中文字即时解读 -->
    <view v-if="selectedText" class="rd-sel-bar" @tap="explainSelection">
      <app-icon name="sparkles" :size="30" color="#ffffff" />
      <text class="rd-sel-txt">解读选中内容</text>
    </view>

    <!-- 底部工具栏 -->
    <view class="rd-bottom">
      <view class="rd-prog"><view class="rd-prog-fill" :style="{ width: progressPct + '%' }" /></view>
      <view class="rd-tools">
        <view class="rd-tool" @tap="goCompanion"><app-icon name="sparkles" :size="38" :color="brandColor" /><text class="rd-tool-txt" :style="{ color: brandColor }">伴读</text></view>
        <view class="rd-tool" @tap="tocOpen = true"><app-icon name="list" :size="38" :color="iconColor" /><text class="rd-tool-txt">目录</text></view>
        <view class="rd-tool" @tap="addBookmark"><app-icon name="bookmark-plus" :size="38" :color="iconColor" /><text class="rd-tool-txt">书签</text></view>
        <view class="rd-tool" @tap="openNote"><app-icon name="edit" :size="38" :color="iconColor" /><text class="rd-tool-txt">笔记</text></view>
        <view class="rd-tool" @tap="setOpen = true"><app-icon name="type" :size="38" :color="iconColor" /><text class="rd-tool-txt">设置</text></view>
      </view>
    </view>

    <!-- AI 文白对照抽屉 -->
    <view v-if="aiOpen" class="rd-mask" @tap="aiOpen = false">
      <view class="rd-sheet" @tap.stop>
        <view class="rd-sheet-bar"><view class="rd-sheet-handle" /></view>
        <view class="rd-sheet-head">
          <view class="rd-ai-badge"><app-icon name="sparkles" :size="24" color="#fff" /></view>
          <text class="rd-sheet-title">AI 白话对照</text>
        </view>
        <scroll-view scroll-y class="rd-sheet-body">
          <view class="rd-orig"><text class="rd-orig-txt">{{ aiSeg }}</text></view>
          <!-- AI 研读中动态卡（阶段文案+墨点晕开+伪进度·关抽屉不中断请求，重开续接进度） -->
          <view v-if="aiLoading" class="rd-ai-wait"><ai-thinking mode="translate" :since="aiThinkStart" /></view>
          <view v-else-if="aiError" class="rd-ai-loading"><text class="rd-ai-err">{{ aiError }}</text></view>
          <template v-else-if="aiResult">
            <view class="rd-ai-sec">
              <text class="rd-ai-label">白话译文</text>
              <text class="rd-ai-trans">{{ aiResult.translation }}</text>
            </view>
            <view v-if="aiResult.notes.length" class="rd-ai-sec">
              <text class="rd-ai-label">字词注释</text>
              <view v-for="(n, i) in aiResult.notes" :key="i" class="rd-ai-note"><text>· {{ n }}</text></view>
            </view>
            <view v-if="aiResult.source" class="rd-ai-src"><text>出处推测：{{ aiResult.source }}</text></view>
          </template>
        </scroll-view>
      </view>
    </view>

    <!-- 目录抽屉（目录 / 书签 / 笔记） -->
    <view v-if="tocOpen" class="rd-mask" @tap="tocOpen = false">
      <view class="rd-sheet rd-sheet-tall" @tap.stop>
        <view class="rd-sheet-bar"><view class="rd-sheet-handle" /></view>
        <view class="rd-toc-tabs">
          <view class="rd-toc-tab" :class="{ 'rd-toc-tab-on': tocTab === 'toc' }" @tap="tocTab = 'toc'">
            <text class="rd-toc-tab-txt" :style="{ color: tocTab === 'toc' ? brandColor : subColor }">目录</text>
          </view>
          <view class="rd-toc-tab" :class="{ 'rd-toc-tab-on': tocTab === 'marks' }" @tap="tocTab = 'marks'">
            <text class="rd-toc-tab-txt" :style="{ color: tocTab === 'marks' ? brandColor : subColor }">书签</text>
          </view>
          <view class="rd-toc-tab" :class="{ 'rd-toc-tab-on': tocTab === 'notes' }" @tap="tocTab = 'notes'">
            <text class="rd-toc-tab-txt" :style="{ color: tocTab === 'notes' ? brandColor : subColor }">笔记</text>
          </view>
        </view>
        <!-- 目录 -->
        <scroll-view v-if="tocTab === 'toc'" scroll-y class="rd-toc-body">
          <view
            v-for="(c, i) in chapters"
            :key="c.id"
            class="rd-toc-item"
            :class="{ 'rd-toc-active': i === curIndex }"
            @tap="jumpTo(i)"
          >
            <text class="rd-toc-idx">{{ i + 1 }}</text>
            <text class="rd-toc-name">{{ c.title }}</text>
            <app-icon v-if="i === curIndex" name="book-open" :size="28" :color="brandColor" />
          </view>
        </scroll-view>
        <!-- 本书书签 -->
        <scroll-view v-else-if="tocTab === 'marks'" scroll-y class="rd-toc-body">
          <view v-if="!isLoggedIn()" class="rd-mk-empty"><text class="rd-mk-empty-txt">登录后可查看本书书签</text></view>
          <view v-else-if="marksLoading && !marksLoaded" class="rd-mk-empty"><text class="rd-mk-empty-txt">加载中…</text></view>
          <template v-else>
            <view v-if="!bookMarks.length" class="rd-mk-empty">
              <text class="rd-mk-empty-txt">本书还没有书签</text>
              <text class="rd-mk-empty-sub">点底部「书签」记下此刻读到的位置</text>
            </view>
            <view v-for="bm in bookMarks" :key="bm.id" class="rd-mk-item" @tap="jumpToBookmark(bm)">
              <view class="rd-mk-ribbon" />
              <view class="rd-mk-main">
                <text class="rd-mk-chapter">{{ bm.chapter }}</text>
                <text v-if="bm.content" class="rd-mk-excerpt">{{ bm.content }}</text>
                <text class="rd-mk-time">{{ bm.createdAt }}</text>
              </view>
              <app-icon name="chevron-right" :size="28" :color="subColor" />
            </view>
            <view v-if="bookMarks.length" class="rd-mk-all" @tap="goAllBookmarks"><text class="rd-mk-all-txt" :style="{ color: brandColor }">管理全部书签</text></view>
          </template>
        </scroll-view>
        <!-- 本书笔记 -->
        <scroll-view v-else scroll-y class="rd-toc-body">
          <view v-if="!isLoggedIn()" class="rd-mk-empty"><text class="rd-mk-empty-txt">登录后可查看本书笔记</text></view>
          <view v-else-if="marksLoading && !marksLoaded" class="rd-mk-empty"><text class="rd-mk-empty-txt">加载中…</text></view>
          <template v-else>
            <view v-if="!bookNotes.length" class="rd-mk-empty">
              <text class="rd-mk-empty-txt">本书还没有笔记</text>
              <text class="rd-mk-empty-sub">点底部「笔记」记下所思所悟</text>
            </view>
            <view v-for="n in bookNotes" :key="n.id" class="rd-mk-item" @tap="jumpToNote(n)">
              <view class="rd-mk-ribbon rd-mk-ribbon-note" />
              <view class="rd-mk-main">
                <text class="rd-mk-chapter">{{ n.chapter }}</text>
                <text class="rd-mk-excerpt">{{ n.noteContent }}</text>
                <text class="rd-mk-time">{{ n.updatedAt }}</text>
              </view>
              <app-icon name="chevron-right" :size="28" :color="subColor" />
            </view>
            <view v-if="bookNotes.length" class="rd-mk-all" @tap="goAllNotes"><text class="rd-mk-all-txt" :style="{ color: brandColor }">管理全部笔记</text></view>
          </template>
        </scroll-view>
      </view>
    </view>

    <!-- 设置抽屉 -->
    <view v-if="setOpen" class="rd-mask" @tap="setOpen = false">
      <view class="rd-sheet" @tap.stop>
        <view class="rd-sheet-bar"><view class="rd-sheet-handle" /></view>
        <view class="rd-sheet-head"><text class="rd-sheet-title">阅读设置</text></view>
        <view class="rd-set-row">
          <text class="rd-set-label">字号</text>
          <view class="rd-set-font">
            <view class="rd-font-btn" @tap="fontDown"><text>A-</text></view>
            <text class="rd-font-cur">{{ fontSize }}</text>
            <view class="rd-font-btn" @tap="fontUp"><text>A+</text></view>
          </view>
        </view>
        <view class="rd-set-row">
          <text class="rd-set-label">背景</text>
          <view class="rd-set-themes">
            <view class="rd-theme-dot rd-dot-yangpi" :class="{ 'rd-dot-on': theme === 'yangpi' }" @tap="pickTheme('yangpi')" />
            <view class="rd-theme-dot rd-dot-hugu" :class="{ 'rd-dot-on': theme === 'hugu' }" @tap="pickTheme('hugu')" />
            <view class="rd-theme-dot rd-dot-white" :class="{ 'rd-dot-on': theme === 'white' }" @tap="pickTheme('white')" />
            <view class="rd-theme-dot rd-dot-night" :class="{ 'rd-dot-on': theme === 'night' }" @tap="pickTheme('night')" />
          </view>
        </view>
      </view>
    </view>

    <!-- 查词抽屉 -->
    <view v-if="dictOpen" class="rd-mask" @tap="dictOpen = false">
      <view class="rd-sheet rd-sheet-tall" @tap.stop>
        <view class="rd-sheet-bar"><view class="rd-sheet-handle" /></view>
        <view class="rd-sheet-head"><text class="rd-sheet-title">古汉语查词</text></view>
        <view class="rd-dict-input">
          <input v-model="dictWord" class="rd-dict-field" placeholder="输入要查的字或词，如「仁」「逍遥」" confirm-type="search" @confirm="doLookup" />
          <view class="rd-dict-go" @tap="doLookup"><text>查询</text></view>
        </view>
        <scroll-view scroll-y class="rd-sheet-body">
          <view v-if="dictLoading" class="rd-ai-wait"><ai-thinking mode="lookup" /></view>
          <view v-else-if="dictError" class="rd-ai-loading"><text class="rd-ai-err">{{ dictError }}</text></view>
          <template v-else-if="dictResult">
            <view class="rd-dict-head">
              <text class="rd-dict-word">{{ dictResult.word }}</text>
              <text v-if="dictResult.pinyin" class="rd-dict-pinyin">{{ dictResult.pinyin }}</text>
              <text v-if="dictResult.radicals" class="rd-dict-radical">部首 {{ dictResult.radicals }}</text>
            </view>
            <view v-if="dictResult.meanings?.length" class="rd-ai-sec">
              <text class="rd-ai-label">释义</text>
              <view v-for="(m, i) in dictResult.meanings" :key="i" class="rd-ai-note"><text>{{ i + 1 }}. {{ m }}</text></view>
            </view>
            <view v-if="dictResult.classicalUsages?.length" class="rd-ai-sec">
              <text class="rd-ai-label">古籍用例</text>
              <view v-for="(u, i) in dictResult.classicalUsages" :key="i" class="rd-ai-note"><text>· {{ u }}</text></view>
            </view>
            <view v-if="dictResult.explanation" class="rd-ai-sec">
              <text class="rd-ai-label">详解</text>
              <text class="rd-ai-trans">{{ dictResult.explanation }}</text>
            </view>
          </template>
          <view v-else class="rd-dict-empty"><text>输入字词，探寻古汉语的本义与流变</text></view>
        </scroll-view>
      </view>
    </view>

    <!-- 笔记输入 -->
    <view v-if="noteOpen" class="rd-mask" @tap="noteOpen = false">
      <view class="rd-sheet" @tap.stop>
        <view class="rd-sheet-bar"><view class="rd-sheet-handle" /></view>
        <view class="rd-sheet-head"><text class="rd-sheet-title">写笔记 · {{ curChapter?.title }}</text></view>
        <textarea v-model="noteText" class="rd-note-area" placeholder="记下此刻的所思所悟…" :maxlength="2000" />
        <view class="rd-note-submit" :class="{ 'rd-note-disabled': !noteText.trim() || noteSubmitting }" @tap="submitNote">
          <text>{{ noteSubmitting ? '保存中…' : '保存笔记' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
export default { options: { styleIsolation: 'shared' } }
</script>

<style scoped lang="scss">
.rd {
  min-height: 100vh;
  padding-bottom: 160rpx;
  transition: background 0.3s;
}
/* 主题 */
.rd-theme-yangpi { background: #f5ecd8; --rd-fg: #3b2f1c; --rd-sub: #998a6b; --rd-card: #fdf6e8; --rd-brand: #a06a38; }
.rd-theme-hugu { background: #dce9d5; --rd-fg: #2c3a26; --rd-sub: #6f7d66; --rd-card: #eaf3e4; --rd-brand: #3f8560; }
.rd-theme-white { background: #fbfbfb; --rd-fg: #2c2c2c; --rd-sub: #999; --rd-card: #fff; --rd-brand: var(--brand); }
.rd-theme-night { background: #1a1a1c; --rd-fg: #c9c2b4; --rd-sub: #6f6a60; --rd-card: #26262a; --rd-brand: #c8945a; }

/* 顶栏 */
.rd-top {
  position: sticky; top: 0; z-index: 30;
  background: inherit;
}
.rd-statusbar { height: var(--status-bar-height, 0px); }
.rd-top-inner { display: flex; align-items: center; gap: 16rpx; height: 92rpx; padding: 0 16rpx; }
.rd-icon-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rd-top-mid { flex: 1; min-width: 0; text-align: center; }
.rd-top-title { display: block; font-size: 30rpx; font-weight: 600; color: var(--rd-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rd-top-sub { display: block; font-size: 22rpx; color: var(--rd-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 正文 */
.rd-body { padding: 16rpx 48rpx 0; max-width: 1000rpx; margin: 0 auto; }
.rd-state { text-align: center; padding: 160rpx 0; }
.rd-state-txt { color: var(--rd-sub); font-size: 28rpx; }
.rd-retry { margin-top: 24rpx; }
.rd-retry text { color: var(--rd-brand); font-size: 28rpx; }
.rd-chapter-head { padding: 40rpx 0 32rpx; text-align: center; border-bottom: 2rpx solid rgba(150,130,90,0.18); margin-bottom: 40rpx; }
.rd-chapter-title { display: block; font-family: 'Songti SC','STSong',serif; font-size: 46rpx; font-weight: 700; color: var(--rd-fg); }
.rd-chapter-from { display: block; margin-top: 12rpx; font-size: 24rpx; color: var(--rd-sub); }
.rd-content { }
.rd-para {
  display: block;
  font-family: 'Songti SC','STSong','Noto Serif SC',serif;
  line-height: 2;
  color: var(--rd-fg);
  text-indent: 2em;
  margin-bottom: 12rpx;
  letter-spacing: 1rpx;
  user-select: text;
  -webkit-user-select: text;
  &:active { background: rgba(160,106,56,0.10); border-radius: 8rpx; }
}
.rd-sel-bar {
  position: fixed;
  left: 50%;
  bottom: 200rpx;
  transform: translateX(-50%);
  z-index: 45;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 80rpx;
  padding: 0 36rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #c8324c, #9e1b30);
  box-shadow: 0 6rpx 20rpx rgba(196, 30, 58, 0.35);
}
.rd-sel-txt { color: #fff; font-size: 28rpx; font-weight: 600; }
.rd-tip { display: flex; align-items: center; justify-content: center; gap: 10rpx; margin: 40rpx 0; opacity: 0.7; }
.rd-tip-txt { font-size: 22rpx; color: var(--rd-sub); }
.rd-chapter-nav { display: flex; align-items: center; justify-content: space-between; padding: 32rpx 0 48rpx; border-top: 2rpx solid rgba(150,130,90,0.18); }
.rd-cn-btn { display: flex; align-items: center; gap: 8rpx; }
.rd-cn-disabled { opacity: 0.4; }
.rd-cn-txt { font-size: 28rpx; font-weight: 500; }
.rd-cn-page { font-size: 24rpx; color: var(--rd-sub); }

/* 底栏 */
.rd-bottom {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  background: var(--rd-card);
  border-top: 2rpx solid rgba(150,130,90,0.18);
  padding-bottom: env(safe-area-inset-bottom);
}
.rd-prog { height: 6rpx; background: rgba(150,130,90,0.15); }
.rd-prog-fill { height: 100%; background: var(--rd-brand); transition: width 0.3s; }
.rd-tools { display: flex; }
.rd-tool { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 16rpx 0; &:active { opacity: 0.6; } }
.rd-tool-txt { font-size: 20rpx; color: var(--rd-sub); }

/* 抽屉通用 */
.rd-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.45); display: flex; flex-direction: column; justify-content: flex-end; }
.rd-sheet { background: var(--rd-card, #fff); border-radius: 32rpx 32rpx 0 0; max-height: 70vh; display: flex; flex-direction: column; padding-bottom: env(safe-area-inset-bottom); }
.rd-sheet-tall { max-height: 82vh; }
.rd-sheet-bar { display: flex; justify-content: center; padding: 16rpx 0 8rpx; }
.rd-sheet-handle { width: 64rpx; height: 8rpx; border-radius: 999rpx; background: rgba(150,130,90,0.3); }
.rd-sheet-head { display: flex; align-items: center; gap: 16rpx; padding: 12rpx 40rpx 20rpx; }
.rd-sheet-title { font-size: 32rpx; font-weight: 700; color: var(--rd-fg, #2c2c2c); }
.rd-ai-badge { width: 44rpx; height: 44rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(150deg,#c8324c,#9e1b30); }
.rd-sheet-body { padding: 0 40rpx 40rpx; }

/* AI 对照 */
.rd-orig { background: rgba(160,106,56,0.08); border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.rd-orig-txt { font-family: 'Songti SC',serif; font-size: 30rpx; line-height: 1.8; color: var(--rd-fg, #2c2c2c); }
.rd-ai-loading { padding: 40rpx 0; text-align: center; color: var(--rd-sub, #999); font-size: 26rpx; }
/* AI 研读中动态卡容器（替代原纯文字等待） */
.rd-ai-wait { padding: 28rpx 8rpx 20rpx; }
.rd-ai-err { color: var(--brand); }
.rd-ai-sec { margin-bottom: 28rpx; }
.rd-ai-label { display: block; font-size: 24rpx; font-weight: 600; color: var(--rd-brand,#a06a38); margin-bottom: 12rpx; }
.rd-ai-trans { font-size: 30rpx; line-height: 1.9; color: var(--rd-fg,#2c2c2c); }
.rd-ai-note { font-size: 26rpx; line-height: 1.7; color: var(--rd-fg,#444); margin-bottom: 6rpx; }
.rd-ai-src { margin-top: 12rpx; font-size: 22rpx; color: var(--rd-sub,#999); }

/* 回跳高亮（书签定位后短暂点亮该段） */
.rd-para-hl { background: rgba(196, 30, 58, 0.10); border-radius: 8rpx; transition: background 0.6s; }

/* 目录抽屉页签 */
.rd-toc-tabs { display: flex; padding: 4rpx 40rpx 16rpx; gap: 8rpx; }
.rd-toc-tab { flex: 1; display: flex; justify-content: center; padding: 16rpx 0; border-radius: 16rpx; }
.rd-toc-tab-on { background: rgba(150, 130, 90, 0.12); }
.rd-toc-tab-txt { font-size: 28rpx; font-weight: 600; }

/* 本书书签/笔记条目 */
.rd-mk-item { display: flex; align-items: center; gap: 20rpx; padding: 26rpx 16rpx; border-bottom: 2rpx solid rgba(150, 130, 90, 0.12); &:active { opacity: 0.6; } }
.rd-mk-ribbon { width: 8rpx; align-self: stretch; border-radius: 4rpx; background: var(--rd-brand, #a06a38); flex-shrink: 0; }
.rd-mk-ribbon-note { background: rgba(150, 130, 90, 0.55); }
.rd-mk-main { flex: 1; min-width: 0; }
.rd-mk-chapter { display: block; font-size: 26rpx; font-weight: 600; color: var(--rd-fg, #2c2c2c); }
.rd-mk-excerpt {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin-top: 8rpx; font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif;
  font-size: 26rpx; line-height: 1.7; color: var(--rd-fg, #2c2c2c); opacity: 0.85;
}
.rd-mk-time { display: block; margin-top: 8rpx; font-size: 22rpx; color: var(--rd-sub, #999); }
.rd-mk-empty { text-align: center; padding: 96rpx 0 48rpx; }
.rd-mk-empty-txt { display: block; font-size: 28rpx; color: var(--rd-fg, #2c2c2c); }
.rd-mk-empty-sub { display: block; margin-top: 12rpx; font-size: 24rpx; color: var(--rd-sub, #999); }
.rd-mk-all { padding: 28rpx 0 12rpx; text-align: center; &:active { opacity: 0.6; } }
.rd-mk-all-txt { font-size: 28rpx; font-weight: 600; }

/* 目录 */
/* 滚动穿透修复：scroll-view 在 H5 无约束高度时不产生内部滚动，触摸会落到底层正文页。
   flex:1 + min-height:0 让它在抽屉（max-height 定界的 flex 列）内拿到确定高度自己滚；
   overscroll-behavior: contain 阻断滚到边界后把滚动链回传给底层页面。 */
.rd-toc-body { padding: 0 24rpx 40rpx; flex: 1; min-height: 0; }
.rd-toc-body :deep(.uni-scroll-view),
.rd-toc-body :deep(.uni-scroll-view-content) { overscroll-behavior: contain; }
.rd-toc-item { display: flex; align-items: center; gap: 20rpx; padding: 26rpx 16rpx; border-bottom: 2rpx solid rgba(150,130,90,0.12); &:active { opacity: 0.6; } }
.rd-toc-active { background: rgba(160,106,56,0.08); border-radius: 12rpx; }
.rd-toc-idx { width: 48rpx; text-align: center; font-size: 24rpx; color: var(--rd-sub,#999); flex-shrink: 0; }
.rd-toc-name { flex: 1; font-size: 28rpx; color: var(--rd-fg,#2c2c2c); }

/* 设置 */
.rd-set-row { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 40rpx; }
.rd-set-label { font-size: 28rpx; color: var(--rd-fg,#2c2c2c); }
.rd-set-font { display: flex; align-items: center; gap: 24rpx; }
.rd-font-btn { width: 88rpx; height: 64rpx; border-radius: 16rpx; background: rgba(150,130,90,0.12); display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: var(--rd-fg,#2c2c2c); &:active { opacity: 0.6; } }
.rd-font-cur { font-size: 28rpx; color: var(--rd-fg,#2c2c2c); min-width: 56rpx; text-align: center; }
.rd-set-themes { display: flex; gap: 24rpx; }
.rd-theme-dot { width: 64rpx; height: 64rpx; border-radius: 999rpx; border: 4rpx solid transparent; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1); }
.rd-dot-yangpi { background: #f5ecd8; }
.rd-dot-hugu { background: #dce9d5; }
.rd-dot-white { background: #fff; }
.rd-dot-night { background: #1a1a1c; }
.rd-dot-on { border-color: var(--rd-brand,#a06a38); }

/* 查词 */
.rd-dict-input { display: flex; gap: 16rpx; padding: 0 40rpx 20rpx; }
.rd-dict-field { flex: 1; height: 76rpx; background: rgba(150,130,90,0.1); border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; color: var(--rd-fg,#2c2c2c); }
.rd-dict-go { width: 130rpx; height: 76rpx; border-radius: 16rpx; background: var(--rd-brand,#a06a38); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; &:active { opacity: 0.8; } }
.rd-dict-head { display: flex; align-items: baseline; gap: 20rpx; padding-bottom: 20rpx; border-bottom: 2rpx solid rgba(150,130,90,0.15); margin-bottom: 20rpx; }
.rd-dict-word { font-family: 'Songti SC',serif; font-size: 56rpx; font-weight: 700; color: var(--rd-fg,#2c2c2c); }
.rd-dict-pinyin { font-size: 28rpx; color: var(--rd-brand,#a06a38); }
.rd-dict-radical { font-size: 24rpx; color: var(--rd-sub,#999); }
.rd-dict-empty { text-align: center; padding: 80rpx 0; color: var(--rd-sub,#999); font-size: 26rpx; }

/* 笔记 */
.rd-note-area { margin: 0 40rpx; padding: 24rpx; height: 280rpx; background: rgba(150,130,90,0.08); border-radius: 16rpx; font-size: 28rpx; line-height: 1.7; color: var(--rd-fg,#2c2c2c); width: auto; box-sizing: border-box; }
.rd-note-submit { margin: 28rpx 40rpx 16rpx; height: 88rpx; border-radius: 20rpx; background: var(--rd-brand,#a06a38); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; &:active { opacity: 0.85; } }
.rd-note-disabled { opacity: 0.5; }
</style>
