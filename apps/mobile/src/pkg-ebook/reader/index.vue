<template>
  <view class="reader" :style="{ background: cfg.bg }">
    <!-- 顶栏 -->
    <view
      class="r-topbar"
      :class="{ 'r-bar--hidden-top': !showControls }"
      :style="{ background: theme === 'dark' ? 'rgba(36,34,32,0.95)' : 'rgba(255,255,255,0.95)', borderColor: cfg.border }"
    >
      <view class="r-topbar-inner" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="r-icon-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" :color="cfg.text" />
        </view>
        <text class="r-title" :style="{ color: cfg.text }">{{ chapterTitle || bookTitle }}</text>
        <view class="r-top-actions">
          <view class="r-icon-btn" @tap="toggleBookmark">
            <app-icon :name="isBookmarked ? 'bookmark-check' : 'bookmark'" :size="38" :color="isBookmarked ? '#2563eb' : cfg.text" />
          </view>
          <view class="r-icon-btn r-icon-btn--dot" @tap="openComments">
            <app-icon name="message-circle" :size="38" :color="cfg.text" />
            <view class="r-dot" />
          </view>
          <view class="r-icon-btn" @tap="onDownload">
            <app-icon name="download" :size="38" :color="cfg.text" />
          </view>
        </view>
      </view>
    </view>

    <!-- 正文 -->
    <scroll-view scroll-y class="r-scroll" @tap="toggleControls" @scroll="onScroll">
      <!-- 加载态 -->
      <view v-if="loading" class="r-content">
        <text class="r-chapter-title" :style="{ color: cfg.text }">正在翻开书页…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="r-content">
        <text class="r-chapter-title" :style="{ color: cfg.text }">{{ error }}</text>
        <view class="r-nav-btn r-nav-btn--primary" style="margin:32rpx auto;display:inline-flex" @tap="fetchData(bookId)">
          <text class="r-nav-btn-primary-text">重试</text>
        </view>
      </view>
      <!-- 正常内容 -->
      <view v-else class="r-content">
        <text class="r-chapter-title" :style="{ color: cfg.text }">{{ chapterTitle }}</text>

        <!-- 章节级错误（如未购买/空内容） -->
        <view v-if="chapterError" class="r-chapter-locked">
          <app-icon name="lock" :size="64" :color="cfg.secondary" />
          <text class="r-locked-txt" :style="{ color: cfg.secondary }">{{ chapterError }}</text>
          <view v-if="/购买/.test(chapterError)" class="r-nav-btn r-nav-btn--primary" style="display:inline-flex" @tap="goCheckout">
            <text class="r-nav-btn-primary-text">去购买</text>
          </view>
        </view>

        <!-- 分段正文：轻点任意句即可 AI 解读 -->
        <template v-else>
          <view class="r-body-wrap">
            <text
              v-for="(p, i) in paragraphs"
              :key="i"
              class="r-para"
              :style="{ color: cfg.text, fontSize: fontSize + 'px', lineHeight: lineHeight }"
              @tap.stop="explain(p)"
            >{{ p }}</text>
          </view>
          <view class="r-ai-tip">
            <app-icon name="sparkles" :size="26" :color="cfg.secondary" />
            <text class="r-ai-tip-txt" :style="{ color: cfg.secondary }">读到不懂之处，轻点该句即可获得 AI 白话对照与注释</text>
          </view>
        </template>

        <!-- 章节切换 -->
        <view class="r-chapter-nav" :style="{ borderColor: cfg.border }">
          <view
            class="r-nav-btn"
            :class="{ 'r-nav-btn--disabled': !hasPrev }"
            :style="{ borderColor: cfg.border, color: cfg.text }"
            @tap="goPrev"
          >
            <app-icon name="chevron-left" :size="32" :color="cfg.text" />
            <text :style="{ color: cfg.text }">上一章</text>
          </view>
          <text class="r-nav-count" :style="{ color: cfg.secondary }">{{ curIndex + 1 }} / {{ chapters.length }}</text>
          <view class="r-nav-btn r-nav-btn--primary" @tap="goNext">
            <text class="r-nav-btn-primary-text">{{ hasNext ? '下一章' : '读完' }}</text>
            <app-icon name="chevron-right" :size="32" color="#ffffff" />
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- H5 选中文字即时解读 -->
    <view v-if="selectedText" class="r-sel-bar" @tap="explainSelection">
      <app-icon name="sparkles" :size="30" color="#ffffff" />
      <text class="r-sel-txt">解读选中内容</text>
    </view>

    <!-- 底栏 -->
    <view
      class="r-bottombar"
      :class="{ 'r-bar--hidden-bottom': !showControls }"
      :style="{ background: theme === 'dark' ? 'rgba(36,34,32,0.95)' : 'rgba(255,255,255,0.95)', borderColor: cfg.border }"
    >
      <!-- 进度 -->
      <view class="r-progress-row">
        <text class="r-progress-pct" :style="{ color: cfg.secondary }">{{ progressPct }}%</text>
        <view class="r-slider">
          <view class="r-slider-track" :style="{ background: cfg.border }">
            <view class="r-slider-filled" :style="{ width: progressPct + '%' }" />
            <view class="r-slider-thumb" :style="{ left: progressPct + '%' }" />
          </view>
        </view>
        <text class="r-progress-chap" :style="{ color: cfg.secondary }">{{ curIndex + 1 }}/{{ chapters.length }}章</text>
      </view>
      <!-- 工具 -->
      <view class="r-tools" :style="{ paddingBottom: safeBottom + 'px' }">
        <view class="r-tool" @tap="openMenu">
          <app-icon name="list" :size="40" :color="cfg.secondary" />
          <text class="r-tool-label" :style="{ color: cfg.secondary }">目录</text>
        </view>
        <view class="r-tool" @tap="openSettings">
          <app-icon name="settings" :size="40" :color="cfg.secondary" />
          <text class="r-tool-label" :style="{ color: cfg.secondary }">设置</text>
        </view>
        <view class="r-tool" @tap="openDict">
          <app-icon name="search" :size="40" :color="cfg.secondary" />
          <text class="r-tool-label" :style="{ color: cfg.secondary }">查词</text>
        </view>
        <view class="r-tool" @tap="openNote">
          <app-icon name="message-square" :size="40" :color="cfg.secondary" />
          <text class="r-tool-label" :style="{ color: cfg.secondary }">笔记</text>
        </view>
        <view class="r-tool" @tap="onShare">
          <app-icon name="share-2" :size="40" :color="cfg.secondary" />
          <text class="r-tool-label" :style="{ color: cfg.secondary }">分享</text>
        </view>
      </view>
    </view>

    <!-- 目录抽屉 -->
    <view v-if="showMenu" class="r-mask" @tap="closeAll" />
    <view v-if="showMenu" class="r-drawer" :style="{ background: theme === 'dark' ? '#1a1815' : '#ffffff' }">
      <view class="r-drawer-head" :style="{ paddingTop: statusBarHeight + 'px', borderColor: cfg.border }">
        <text class="r-drawer-title" :style="{ color: cfg.text }">目录 · 共 {{ chapters.length }} 章</text>
        <view class="r-icon-btn" @tap="closeAll">
          <app-icon name="x" :size="36" :color="cfg.text" />
        </view>
      </view>
      <scroll-view scroll-y class="r-drawer-list">
        <view
          v-for="ch in chapters"
          :key="ch.id"
          class="r-chap-item"
          :style="chapItemStyle(ch)"
          @tap="selectChapter(ch)"
        >
          <text :style="{ color: ch.current ? '#2563eb' : cfg.text, fontWeight: ch.current ? '600' : '400' }">{{ ch.title }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 设置面板 -->
    <view v-if="showSettings" class="r-mask" @tap="closeAll" />
    <view v-if="showSettings" class="r-sheet" :style="{ background: theme === 'dark' ? '#1a1815' : '#ffffff' }">
      <view class="r-sheet-handle" />
      <view class="r-sheet-body" :style="{ paddingBottom: safeBottom + 'px' }">
        <!-- 字号 -->
        <text class="r-sheet-label" :style="{ color: cfg.secondary }">字号</text>
        <view class="r-fontsize-row">
          <view class="r-circle-btn" :style="{ background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }" @tap="decFont">
            <app-icon name="minus" :size="36" :color="cfg.text" />
          </view>
          <text class="r-fontsize-val" :style="{ color: cfg.text }">{{ fontSize }}px</text>
          <view class="r-circle-btn" :style="{ background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }" @tap="incFont">
            <app-icon name="plus" :size="36" :color="cfg.text" />
          </view>
        </view>
        <!-- 行距 -->
        <text class="r-sheet-label" :style="{ color: cfg.secondary }">行距</text>
        <view class="r-lh-row">
          <view
            v-for="lh in lineHeights"
            :key="lh.value"
            class="r-lh-btn"
            :style="lhBtnStyle(lh.value)"
            @tap="pickLineHeight(lh.value)"
          >
            <text :style="{ color: lineHeight === lh.value ? '#ffffff' : theme === 'dark' ? '#d1d5db' : '#4b5563' }">{{ lh.label }}</text>
          </view>
        </view>
        <!-- 主题 -->
        <text class="r-sheet-label" :style="{ color: cfg.secondary }">主题</text>
        <view class="r-theme-row">
          <view
            v-for="t in themeOptions"
            :key="t.id"
            class="r-theme-btn"
            :style="{ background: t.bg, borderColor: theme === t.id ? '#2563eb' : 'transparent' }"
            @tap="pickTheme(t.id)"
          >
            <app-icon :name="t.icon" :size="32" :color="t.iconColor" />
            <text class="r-theme-label" :style="{ color: t.textColor }">{{ t.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- AI 文白对照抽屉 -->
    <view v-if="showAi" class="r-mask" @tap="showAi = false" />
    <view v-if="showAi" class="r-sheet" :style="{ background: theme === 'dark' ? '#1a1815' : '#ffffff' }">
      <view class="r-sheet-handle" />
      <view class="r-ai-head">
        <view class="r-ai-badge"><app-icon name="sparkles" :size="24" color="#fff" /></view>
        <text class="r-ai-title" :style="{ color: cfg.text }">AI 白话对照</text>
      </view>
      <scroll-view scroll-y class="r-ai-scroll" :style="{ paddingBottom: safeBottom + 'px' }">
        <view class="r-ai-orig" :style="{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc' }">
          <text class="r-ai-orig-txt" :style="{ color: cfg.text }">{{ aiSeg }}</text>
        </view>
        <view v-if="aiLoading" class="r-ai-state"><text :style="{ color: cfg.secondary }">AI 正在解读…</text></view>
        <view v-else-if="aiError" class="r-ai-state"><text class="r-ai-err">{{ aiError }}</text></view>
        <template v-else-if="aiResult">
          <view class="r-ai-sec">
            <text class="r-ai-label">白话译文</text>
            <text class="r-ai-trans" :style="{ color: cfg.text }">{{ aiResult.translation }}</text>
          </view>
          <view v-if="aiResult.notes.length" class="r-ai-sec">
            <text class="r-ai-label">字词注释</text>
            <view v-for="(n, i) in aiResult.notes" :key="i" class="r-ai-note"><text :style="{ color: cfg.text }">· {{ n }}</text></view>
          </view>
        </template>
      </scroll-view>
    </view>

    <!-- 查词抽屉 -->
    <view v-if="showDict" class="r-mask" @tap="showDict = false" />
    <view v-if="showDict" class="r-sheet" :style="{ background: theme === 'dark' ? '#1a1815' : '#ffffff' }">
      <view class="r-sheet-handle" />
      <view class="r-ai-head">
        <text class="r-ai-title" :style="{ color: cfg.text }">古汉语查词</text>
      </view>
      <view class="r-dict-input">
        <input
          v-model="dictWord"
          class="r-dict-field"
          :style="{ background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: cfg.text }"
          placeholder="输入要查的字或词"
          placeholder-class="r-ph"
          confirm-type="search"
          @confirm="doLookup"
        />
        <view class="r-dict-go" @tap="doLookup"><text>查询</text></view>
      </view>
      <scroll-view scroll-y class="r-ai-scroll" :style="{ paddingBottom: safeBottom + 'px' }">
        <view v-if="dictLoading" class="r-ai-state"><text :style="{ color: cfg.secondary }">查询中…</text></view>
        <view v-else-if="dictError" class="r-ai-state"><text class="r-ai-err">{{ dictError }}</text></view>
        <template v-else-if="dictResult">
          <view class="r-dict-head" :style="{ borderColor: cfg.border }">
            <text class="r-dict-word" :style="{ color: cfg.text }">{{ dictResult.word }}</text>
            <text v-if="dictResult.english" class="r-dict-en">{{ dictResult.english }}</text>
          </view>
          <view v-if="dictResult.relatedKeywords?.length" class="r-ai-sec">
            <text class="r-ai-label">相关词</text>
            <view class="r-dict-tags">
              <text v-for="(k, i) in dictResult.relatedKeywords" :key="i" class="r-dict-tag">{{ k }}</text>
            </view>
          </view>
        </template>
        <view v-else class="r-ai-state"><text :style="{ color: cfg.secondary }">输入字词，探寻古汉语的本义与流变</text></view>
      </scroll-view>
    </view>

    <!-- 笔记输入抽屉 -->
    <view v-if="showNote" class="r-mask" @tap="showNote = false" />
    <view v-if="showNote" class="r-sheet" :style="{ background: theme === 'dark' ? '#1a1815' : '#ffffff' }">
      <view class="r-sheet-handle" />
      <view class="r-ai-head">
        <text class="r-ai-title" :style="{ color: cfg.text }">写笔记 · {{ chapterTitle }}</text>
      </view>
      <textarea
        v-model="noteText"
        class="r-note-area"
        :style="{ background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f8fafc', color: cfg.text }"
        placeholder="记下此刻的所思所悟…"
        placeholder-class="r-ph"
        :maxlength="2000"
      />
      <view
        class="r-note-submit"
        :class="{ 'r-note-disabled': !noteText.trim() || noteSubmitting }"
        :style="{ marginBottom: safeBottom + 'px' }"
        @tap="submitNote"
      >
        <text>{{ noteSubmitting ? '保存中…' : '保存笔记' }}</text>
      </view>
    </view>

    <!-- 读完弹窗 -->
    <view v-if="showFinish" class="r-mask r-mask--center" @tap="closeAll">
      <view class="r-modal" :style="{ background: theme === 'dark' ? '#242220' : '#ffffff' }" @tap.stop>
        <view class="r-modal-icon">
          <app-icon name="check-circle" :size="64" color="#2563eb" />
        </view>
        <text class="r-modal-title" :style="{ color: cfg.text }">恭喜读完本书！</text>
        <text class="r-modal-desc" :style="{ color: cfg.secondary }">读完全部 {{ chapters.length }} 章，期待你的读书心得</text>
        <view class="r-modal-actions">
          <view class="r-modal-btn r-modal-btn--outline" :style="{ borderColor: cfg.border, color: cfg.text }" @tap="closeAll">
            <text :style="{ color: cfg.text }">稍后再说</text>
          </view>
          <view class="r-modal-btn r-modal-btn--primary" @tap="openComments">
            <app-icon name="share-2" :size="30" color="#ffffff" />
            <text class="r-modal-btn-primary-text">分享心得</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 章节讨论（复用母版） -->
    <discussion-sheet
      :open="showComments"
      :config="discussionConfig"
      :items="discussions"
      :enable-a-i-assist="true"
      @close="showComments = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad, onHide, onUnload } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import DiscussionSheet from '@/components/common/discussion-sheet.vue'
import {
  ebookApi,
  ebookReaderThemes,
  type EbookReaderChapter,
} from '@/lib/ebook-data'
import { getToken } from '@/utils/storage'
import type { DiscussionConfig } from '@/lib/discussion-types'
import type { DiscussionItem as DiscussionItemType } from '@/lib/discussion-types'

type Theme = 'light' | 'sepia' | 'dark'

const sys = uni.getSystemInfoSync()
const statusBarHeight = sys.statusBarHeight || 20
const safeBottom = sys.safeAreaInsets?.bottom ?? 0

// ── 数据状态 ──
const loading = ref(true)
const error = ref('')
const bookId = ref('1')
const bookTitle = ref('')
const chapters = ref<EbookReaderChapter[]>([])
const curIndex = ref(0)
const chapterTitle = ref('')
const paragraphs = ref<string[]>([])
const chapterError = ref('')
const discussions = ref<DiscussionItemType[]>([])

const curChapter = computed(() => chapters.value[curIndex.value] || null)
const hasPrev = computed(() => curIndex.value > 0)
const hasNext = computed(() => curIndex.value < chapters.value.length - 1)
const progressPct = computed(() =>
  chapters.value.length ? Math.round(((curIndex.value + 1) / chapters.value.length) * 100) : 0,
)

// 阅读时长统计（秒）
let sessionStart = Date.now()
let reportedDuration = 0

// ── UI 开关 ──
const showControls = ref(true)
const showMenu = ref(false)
const showSettings = ref(false)
const showFinish = ref(false)
const showComments = ref(false)
const showAi = ref(false)
const showDict = ref(false)
const showNote = ref(false)
const theme = ref<Theme>('light')
const fontSize = ref(18)
const lineHeight = ref(1.8)
const isBookmarked = ref(false)
const bookmarking = ref(false)

// ── AI 文白对照 ──
const aiSeg = ref('')
const aiLoading = ref(false)
const aiError = ref('')
const aiResult = ref<{ translation: string; notes: string[] } | null>(null)

// ── 查词 ──
const dictWord = ref('')
const dictLoading = ref(false)
const dictError = ref('')
const dictResult = ref<any>(null)

// ── 笔记 ──
const noteText = ref('')
const noteSubmitting = ref(false)

// ── 选区 ──
const selectedText = ref('')

const cfg = computed(() => ebookReaderThemes[theme.value])

const lineHeights = [
  { label: '紧凑', value: 1.5 },
  { label: '适中', value: 1.8 },
  { label: '宽松', value: 2.2 },
]
const themeOptions: { id: Theme; label: string; bg: string; icon: string; iconColor: string; textColor: string }[] = [
  { id: 'light', label: '日间', bg: '#ffffff', icon: 'sun', iconColor: '#f59e0b', textColor: '#1f2937' },
  { id: 'sepia', label: '护眼', bg: '#f5f0e5', icon: 'type', iconColor: '#8b7355', textColor: '#5c4a3a' },
  { id: 'dark', label: '夜间', bg: '#1a1815', icon: 'moon', iconColor: '#9ca3af', textColor: '#d1d5db' },
]

const discussionConfig = computed<DiscussionConfig>(() => ({
  scene: 'classic' as const,
  mode: 'comment' as const,
  title: chapterTitle.value || '章节讨论',
  accentColor: '#2563eb',
  placeholder: '分享你对本章的理解…',
}))

// ── 阅读偏好持久化 ──
const PREF_KEY = 'ebook_reader_pref'
function loadPref() {
  try {
    const p = uni.getStorageSync(PREF_KEY)
    if (p && typeof p === 'object') {
      if (p.theme) theme.value = p.theme
      if (typeof p.fontSize === 'number') fontSize.value = p.fontSize
      if (typeof p.lineHeight === 'number') lineHeight.value = p.lineHeight
    }
  } catch { /* ignore */ }
}
function savePref() {
  try { uni.setStorageSync(PREF_KEY, { theme: theme.value, fontSize: fontSize.value, lineHeight: lineHeight.value }) } catch { /* ignore */ }
}

function isLoggedIn() { return !!getToken() }
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
    parts = text.replace(/([。！？；])/g, '$1\n').split('\n').map((s) => s.trim()).filter(Boolean)
  }
  return parts
}

async function fetchData(bkId: string, chId?: string) {
  loading.value = true
  error.value = ''
  bookId.value = bkId || '1'
  try {
    const [detail, chaps] = await Promise.all([
      ebookApi.detail(bookId.value),
      ebookApi.readerChapters(bookId.value),
    ])
    bookTitle.value = detail.book.title
    chapters.value = chaps
    if (!chapters.value.length) throw new Error('本书暂无可阅读章节')
    let idx = chId ? chapters.value.findIndex((c) => c.id === chId) : 0
    if (idx < 0) idx = 0
    await loadChapter(idx)
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadChapter(idx: number) {
  const ch = chapters.value[idx]
  if (!ch) return
  curIndex.value = idx
  chapterTitle.value = ch.title
  chapterError.value = ''
  chapters.value = chapters.value.map((c, i) => ({ ...c, current: i === idx }))
  try {
    const data = await ebookApi.readerChapter(bookId.value, ch.id)
    paragraphs.value = splitParagraphs(data?.content || '')
    if (!paragraphs.value.length) chapterError.value = '本章暂无正文内容'
  } catch (e: any) {
    paragraphs.value = []
    chapterError.value = e?.message || '本章需购买后阅读'
  }
  // 重置阅读位置与书签态（按章独立）
  isBookmarked.value = false
  uni.pageScrollTo?.({ scrollTop: 0, duration: 0 })
  saveProgress()
}

function goPrev() { if (hasPrev.value) { closeAll(); loadChapter(curIndex.value - 1) } }
function goNext() {
  if (hasNext.value) { closeAll(); loadChapter(curIndex.value + 1) }
  else openFinish()
}
function selectChapter(ch: EbookReaderChapter) {
  const idx = chapters.value.findIndex((c) => c.id === ch.id)
  closeAll()
  if (idx >= 0) loadChapter(idx)
}
function goCheckout() {
  uni.navigateTo({ url: `/pkg-ebook/checkout/index?id=${bookId.value}` })
}

// ── 点句 / 选区 AI 文白对照 ──
async function explain(seg: string) {
  if (!isLoggedIn()) { needLogin(); return }
  closeAll()
  showAi.value = true
  aiSeg.value = seg
  aiResult.value = null
  aiError.value = ''
  aiLoading.value = true
  try {
    const r = await ebookApi.translate(seg)
    aiResult.value = {
      translation: r?.translated || r?.translation || '暂无翻译',
      notes: Array.isArray(r?.notes) ? r.notes : [],
    }
  } catch (e: any) {
    aiError.value = e?.message || 'AI 解读失败，请稍后重试'
  } finally {
    aiLoading.value = false
  }
}
function handleSelection() {
  if (typeof window === 'undefined') return
  const t = (((window as any).getSelection && (window as any).getSelection())?.toString() || '').trim()
  selectedText.value = t.length >= 2 && t.length <= 200 ? t : ''
}
function explainSelection() {
  const t = selectedText.value
  selectedText.value = ''
  if (t) explain(t)
}

// ── 查词 ──
async function doLookup() {
  const w = dictWord.value.trim()
  if (!w) return
  if (!isLoggedIn()) { needLogin(); return }
  dictLoading.value = true
  dictError.value = ''
  dictResult.value = null
  try {
    dictResult.value = await ebookApi.lookup(w)
  } catch (e: any) {
    dictError.value = e?.message || '查询失败'
  } finally {
    dictLoading.value = false
  }
}

// ── 书签 ──
async function toggleBookmark() {
  if (!isLoggedIn()) { needLogin(); return }
  if (bookmarking.value || !curChapter.value) return
  bookmarking.value = true
  try {
    await ebookApi.addBookmark(bookId.value, { chapterId: curChapter.value.id, page: progressPct.value })
    isBookmarked.value = true
    uni.showToast({ title: '已添加书签', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '添加失败', icon: 'none' })
  } finally {
    bookmarking.value = false
  }
}

// ── 笔记 ──
function openNote() {
  if (!isLoggedIn()) { needLogin(); return }
  closeAll()
  noteText.value = ''
  showNote.value = true
}
async function submitNote() {
  const c = noteText.value.trim()
  if (!c || noteSubmitting.value || !curChapter.value) return
  noteSubmitting.value = true
  try {
    await ebookApi.addNote(bookId.value, { chapterId: curChapter.value.id, content: c })
    showNote.value = false
    uni.showToast({ title: '笔记已保存', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    noteSubmitting.value = false
  }
}

// ── 进度 / 时长上报（登录态才有意义；静默失败不打扰阅读）──
function saveProgress() {
  if (!isLoggedIn() || !curChapter.value) return
  ebookApi.saveProgress(bookId.value, { chapterId: curChapter.value.id, progress: progressPct.value }).catch(() => {})
}
function reportSession() {
  if (!isLoggedIn()) return
  const elapsed = Math.floor((Date.now() - sessionStart) / 1000) - reportedDuration
  if (elapsed < 5) return
  reportedDuration += elapsed
  ebookApi.recordSession(bookId.value, elapsed, 1).catch(() => {})
}

// ── UI helpers ──
function onScroll() { /* 预留：滚动位置上报 */ }
function toggleControls() { showControls.value = !showControls.value }
function closeAll() {
  showMenu.value = false
  showSettings.value = false
  showFinish.value = false
  showAi.value = false
  showDict.value = false
  showNote.value = false
}
function openMenu() { closeAll(); showMenu.value = true }
function openSettings() { closeAll(); showSettings.value = true }
function openFinish() { closeAll(); showFinish.value = true }
function openComments() { closeAll(); showComments.value = true }
function openDict() { closeAll(); showDict.value = true }
function onDownload() { uni.showToast({ title: '离线下载即将上线', icon: 'none' }) }
function onShare() { uni.showToast({ title: '分享功能即将上线', icon: 'none' }) }
function decFont() { fontSize.value = Math.max(14, fontSize.value - 2); savePref() }
function incFont() { fontSize.value = Math.min(28, fontSize.value + 2); savePref() }
function pickLineHeight(v: number) { lineHeight.value = v; savePref() }
function pickTheme(t: Theme) { theme.value = t; savePref() }
function goBack() {
  reportSession()
  uni.navigateBack({ fail: () => uni.navigateTo({ url: '/pkg-ebook/store/index' }) })
}
function chapItemStyle(ch: { current: boolean }) {
  return ch.current ? { background: 'rgba(37,99,235,0.08)' } : {}
}
function lhBtnStyle(value: number) {
  if (lineHeight.value === value) return { background: '#2563eb' }
  return { background: theme.value === 'dark' ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }
}

onMounted(() => {
  if (typeof document !== 'undefined') document.addEventListener('selectionchange', handleSelection)
})
onUnmounted(() => {
  if (typeof document !== 'undefined') document.removeEventListener('selectionchange', handleSelection)
})
onHide(() => { reportSession(); saveProgress() })
onUnload(() => { reportSession(); saveProgress() })

onLoad((q: any = {}) => {
  loadPref()
  sessionStart = Date.now()
  fetchData(q?.id || '1', q?.chapter)
})
</script>

<style lang="scss" scoped>
.reader {
  min-height: 100vh;
  position: relative;
}

/* 顶栏 */
.r-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  border-bottom: 1rpx solid;
  backdrop-filter: blur(8px);
  transition: transform 0.3s ease;
}
.r-bar--hidden-top {
  transform: translateY(-100%);
}
.r-topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12rpx;
  height: 88rpx;
  box-sizing: content-box;
}
.r-title {
  font-size: 28rpx;
  font-weight: 500;
  max-width: 50%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.r-top-actions {
  display: flex;
  align-items: center;
  gap: 2rpx;
}
.r-icon-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.r-icon-btn--dot {
  position: relative;
}
.r-dot {
  position: absolute;
  top: 14rpx;
  right: 14rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #0ea5e9;
}

/* 正文 */
.r-scroll {
  height: 100vh;
}
.r-content {
  padding: 180rpx 48rpx 200rpx;
}
.r-chapter-title {
  display: block;
  font-size: 40rpx;
  font-weight: 600;
  text-align: center;
  margin-bottom: 64rpx;
}
.r-body-wrap {
  display: flex;
  flex-direction: column;
}
.r-para {
  display: block;
  font-family: 'Noto Serif SC', serif;
  text-indent: 2em;
  margin-bottom: 16rpx;
  white-space: pre-line;
  user-select: text;
  -webkit-user-select: text;
}
.r-para:active {
  background: rgba(37, 99, 235, 0.1);
  border-radius: 8rpx;
}
.r-ai-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  margin: 48rpx 0 0;
  opacity: 0.7;
}
.r-ai-tip-txt {
  font-size: 22rpx;
}
.r-chapter-locked {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 120rpx 0;
}
.r-locked-txt {
  font-size: 28rpx;
}
.r-chapter-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 100rpx;
  padding-top: 48rpx;
  border-top: 1rpx solid;
}
.r-nav-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 28rpx;
  border: 1rpx solid;
  border-radius: 16rpx;
  font-size: 26rpx;
}
.r-nav-btn--disabled {
  opacity: 0.4;
}
.r-nav-btn--primary {
  background: #2563eb;
  border: none;
}
.r-nav-btn-primary-text {
  color: #ffffff;
  font-size: 26rpx;
}
.r-nav-count {
  font-size: 26rpx;
}

/* 选区浮条 */
.r-sel-bar {
  position: fixed;
  left: 50%;
  bottom: 220rpx;
  transform: translateX(-50%);
  z-index: 45;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 80rpx;
  padding: 0 36rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 6rpx 20rpx rgba(37, 99, 235, 0.35);
}
.r-sel-txt {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}

/* 底栏 */
.r-bottombar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  border-top: 1rpx solid;
  backdrop-filter: blur(8px);
  transition: transform 0.3s ease;
}
.r-bar--hidden-bottom {
  transform: translateY(100%);
}
.r-progress-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 32rpx 8rpx;
}
.r-progress-pct {
  font-size: 22rpx;
  width: 56rpx;
}
.r-progress-chap {
  font-size: 22rpx;
  width: 96rpx;
  text-align: right;
}
.r-slider {
  flex: 1;
  height: 32rpx;
  display: flex;
  align-items: center;
}
.r-slider-track {
  position: relative;
  width: 100%;
  height: 6rpx;
  border-radius: 999rpx;
}
.r-slider-filled {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: #2563eb;
  border-radius: 999rpx;
}
.r-slider-thumb {
  position: absolute;
  top: 50%;
  width: 28rpx;
  height: 28rpx;
  background: #2563eb;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.r-tools {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8rpx 0 16rpx;
}
.r-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 24rpx;
}
.r-tool-label {
  font-size: 20rpx;
}

/* 遮罩/抽屉/面板 */
.r-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 50;
}
.r-mask--center {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 48rpx;
}
.r-drawer {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 576rpx;
  z-index: 51;
  display: flex;
  flex-direction: column;
}
.r-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid;
}
.r-drawer-title {
  font-size: 32rpx;
  font-weight: 600;
}
.r-drawer-list {
  flex: 1;
  padding: 16rpx 0;
}
.r-chap-item {
  padding: 24rpx 32rpx;
  font-size: 28rpx;
}

/* 底部弹层（设置/AI/查词/笔记） */
.r-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 51;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 76vh;
  display: flex;
  flex-direction: column;
}
.r-sheet-handle {
  width: 96rpx;
  height: 8rpx;
  background: #d1d5db;
  border-radius: 999rpx;
  margin: 24rpx auto 0;
  flex-shrink: 0;
}
.r-sheet-body {
  padding: 24rpx 40rpx 40rpx;
}
.r-sheet-label {
  display: block;
  font-size: 24rpx;
  margin: 24rpx 0 16rpx;
}
.r-fontsize-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.r-circle-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.r-fontsize-val {
  flex: 1;
  text-align: center;
  font-size: 36rpx;
  font-weight: 600;
}
.r-lh-row {
  display: flex;
  gap: 16rpx;
}
.r-lh-btn {
  flex: 1;
  padding: 20rpx 0;
  border-radius: 16rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 500;
}
.r-theme-row {
  display: flex;
  gap: 16rpx;
}
.r-theme-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx 0;
  border-radius: 16rpx;
  border: 4rpx solid;
}
.r-theme-label {
  font-size: 24rpx;
}

/* AI / 查词 / 笔记 抽屉内容 */
.r-ai-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 40rpx 20rpx;
  flex-shrink: 0;
}
.r-ai-badge {
  width: 44rpx;
  height: 44rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(150deg, #2563eb, #1d4ed8);
}
.r-ai-title {
  font-size: 32rpx;
  font-weight: 700;
}
.r-ai-scroll {
  padding: 0 40rpx 40rpx;
  flex: 1;
}
.r-ai-orig {
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.r-ai-orig-txt {
  font-family: 'Noto Serif SC', serif;
  font-size: 30rpx;
  line-height: 1.8;
}
.r-ai-state {
  padding: 40rpx 0;
  text-align: center;
  font-size: 26rpx;
}
.r-ai-err {
  color: #ef4444;
}
.r-ai-sec {
  margin-bottom: 28rpx;
}
.r-ai-label {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #2563eb;
  margin-bottom: 12rpx;
}
.r-ai-trans {
  font-size: 30rpx;
  line-height: 1.9;
}
.r-ai-note {
  font-size: 26rpx;
  line-height: 1.7;
  margin-bottom: 6rpx;
}

/* 查词 */
.r-dict-input {
  display: flex;
  gap: 16rpx;
  padding: 0 40rpx 20rpx;
  flex-shrink: 0;
}
.r-dict-field {
  flex: 1;
  height: 76rpx;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.r-ph {
  color: #94a3b8;
}
.r-dict-go {
  width: 130rpx;
  height: 76rpx;
  border-radius: 16rpx;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}
.r-dict-head {
  display: flex;
  align-items: baseline;
  gap: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid;
  margin-bottom: 20rpx;
}
.r-dict-word {
  font-family: 'Noto Serif SC', serif;
  font-size: 52rpx;
  font-weight: 700;
}
.r-dict-en {
  font-size: 28rpx;
  color: #2563eb;
}
.r-dict-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.r-dict-tag {
  font-size: 24rpx;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
}

/* 笔记 */
.r-note-area {
  margin: 0 40rpx;
  padding: 24rpx;
  height: 280rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  line-height: 1.7;
  width: auto;
  box-sizing: border-box;
}
.r-note-submit {
  margin: 28rpx 40rpx 16rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
}
.r-note-disabled {
  opacity: 0.5;
}

/* 读完弹窗 */
.r-modal {
  width: 100%;
  max-width: 600rpx;
  border-radius: 32rpx;
  padding: 48rpx 40rpx 40rpx;
}
.r-modal-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24rpx;
}
.r-modal-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  text-align: center;
  margin-bottom: 12rpx;
}
.r-modal-desc {
  display: block;
  font-size: 26rpx;
  text-align: center;
  margin-bottom: 40rpx;
}
.r-modal-actions {
  display: flex;
  gap: 20rpx;
}
.r-modal-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx 0;
  border-radius: 16rpx;
  font-size: 28rpx;
}
.r-modal-btn--outline {
  border: 1rpx solid;
}
.r-modal-btn--primary {
  background: #2563eb;
}
.r-modal-btn-primary-text {
  color: #ffffff;
  font-size: 28rpx;
}
</style>
