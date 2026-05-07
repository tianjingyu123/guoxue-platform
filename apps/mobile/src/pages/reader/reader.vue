<template>
  <view class="page" :class="{ 'dark-mode': isDark }">
    <!-- ========== 自定义导航栏 ========== -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left">
          <text class="nav-back" @click="goBack">&#8592;</text>
        </view>
        <view class="nav-center">
          <text class="nav-title">{{ book?.title || '阅读' }}</text>
        </view>
        <view class="nav-right">
          <text class="nav-btn" @click="showSettings = !showSettings">Aa</text>
          <text class="nav-btn" @click="showToc = true">&#9776;</text>
        </view>
      </view>
    </view>

    <!-- ========== 设置面板 ========== -->
    <view v-if="showSettings" class="settings-panel" :style="{ top: (statusBarHeight + 44) + 'px' }">
      <!-- 字号 -->
      <view class="setting-row">
        <text class="setting-label">字号</text>
        <view class="font-presets">
          <text
            v-for="preset in fontPresets"
            :key="preset.size"
            :class="['font-preset-btn', { active: fontSize === preset.size }]"
            @click="setFontSize(preset.size)"
          >
            {{ preset.label }}
          </text>
        </view>
      </view>
      <!-- 译文开关 -->
      <view class="setting-row">
        <text class="setting-label">显示译文</text>
        <view :class="['toggle-switch', { on: showTranslation }]" @click="showTranslation = !showTranslation">
          <view class="toggle-knob" />
        </view>
      </view>
      <!-- 夜间模式 -->
      <view class="setting-row">
        <text class="setting-label">夜间模式</text>
        <view :class="['toggle-switch', { on: isDark }]" @click="toggleDark">
          <view class="toggle-knob" />
        </view>
      </view>
    </view>

    <!-- ========== 阅读内容 ========== -->
    <view class="reader-body" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <view v-if="loading" class="loading-section">
        <LoadingSkeleton type="detail" />
      </view>

      <view v-else-if="chapter" class="reader-content" ref="contentRef">
        <!-- 章节标题 -->
        <text class="chapter-title">{{ chapter.title }}</text>
        <view class="chapter-divider" />

        <!-- 原文 -->
        <view
          class="text-body"
          :style="{
            fontSize: fontSize + 'px',
            lineHeight: (fontSize * 2) + 'px',
          }"
        >
          <text>{{ chapter.content }}</text>
        </view>

        <!-- 译文 -->
        <view v-if="showTranslation && chapter.translation" class="translation-block">
          <view class="trans-header">
            <text class="trans-label">【译文】</text>
          </view>
          <view
            class="trans-body"
            :style="{ fontSize: (fontSize - 2) + 'px', lineHeight: ((fontSize - 2) * 2) + 'px' }"
          >
            <text>{{ chapter.translation }}</text>
          </view>
        </view>

        <!-- 注释 -->
        <view v-if="chapter.annotation" class="annotation-block">
          <view class="trans-header">
            <text class="trans-label">【注释】</text>
          </view>
          <view
            class="annotation-body"
            :style="{ fontSize: (fontSize - 2) + 'px' }"
          >
            <text>{{ chapter.annotation }}</text>
          </view>
        </view>

        <!-- 笔记区域 -->
        <view class="notes-section">
          <view class="notes-header" @click="showNotesPanel = !showNotesPanel">
            <text class="notes-title">&#128221; 笔记</text>
            <text class="notes-toggle">{{ showNotesPanel ? '收起' : '展开' }}</text>
          </view>
          <view v-if="showNotesPanel" class="notes-body">
            <textarea
              v-model="noteContent"
              placeholder="在此写下你的读书笔记..."
              class="notes-textarea"
              :style="{ fontSize: (fontSize - 2) + 'px' }"
            />
            <button class="notes-save-btn" @click="saveNote">保存笔记</button>
            <view v-if="currentNotes.length" class="notes-history">
              <text class="notes-history-title">历史笔记</text>
              <view v-for="(note, i) in currentNotes" :key="i" class="notes-history-item">
                <text class="notes-history-time">{{ note.time }}</text>
                <text class="notes-history-content">{{ note.content }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 底部留白 -->
        <view class="content-bottom-spacer" />
      </view>

      <!-- 错误状态 -->
      <view v-else-if="errorMsg" class="error-section">
        <EmptyState icon="&#9888;" :text="errorMsg">
          <button class="retry-btn" @click="initReader">重新加载</button>
        </EmptyState>
      </view>

      <view v-else class="loading-section">
        <LoadingSkeleton type="detail" />
      </view>
    </view>

    <!-- ========== 底部导航 ========== -->
    <view v-if="chapters.length > 0" class="bottom-bar">
      <view class="bottom-progress">
        <view class="progress-track">
          <view
            class="progress-fill"
            :style="{ width: ((curIdx + 1) / chapters.length * 100) + '%' }"
          />
        </view>
      </view>
      <view class="bottom-main">
        <view class="bottom-left">
          <text class="bottom-btn" @click="prevChapter" :class="{ disabled: !hasPrev }">&#9664; 上一章</text>
        </view>
        <view class="bottom-center">
          <text class="progress-text">{{ curIdx + 1 }}/{{ chapters.length }}</text>
          <text class="chapter-name" v-if="chapter">{{ chapter.title }}</text>
        </view>
        <view class="bottom-right">
          <text class="bottom-btn" @click="nextChapter" :class="{ disabled: !hasNext }">下一章 &#9654;</text>
        </view>
      </view>
      <view class="bottom-actions">
        <text class="action-item" :class="{ active: isBookmarked }" @click="toggleBookmark">
          {{ isBookmarked ? '&#128278;' : '&#128205;' }}
          <text class="action-label">{{ isBookmarked ? '已收藏' : '书签' }}</text>
        </text>
        <text class="action-item" @click="scrollToTop">
          &#8679; <text class="action-label">回顶部</text>
        </text>
        <text class="action-item" @click="showBookmarkList = !showBookmarkList">
          &#128203; <text class="action-label">书签列表</text>
        </text>
      </view>
    </view>

    <!-- ========== 章节目录（左侧抽屉） ========== -->
    <view v-if="showToc" class="toc-overlay" @click="showToc = false">
      <view class="toc-drawer" @click.stop="">
        <view class="toc-header">
          <text class="toc-title">章节目录</text>
          <text class="toc-close" @click="showToc = false">&#10005;</text>
        </view>
        <view class="toc-bookmarks-bar" v-if="bookmarkedChapters.length">
          <text class="toc-bm-title">&#128205; 已收藏</text>
          <view class="toc-bm-tags">
            <text
              v-for="bm in bookmarkedChapters"
              :key="bm.chapterId"
              class="toc-bm-tag"
              @click="switchToChapterByIndex(bm.index)"
            >{{ bm.title }}</text>
          </view>
        </view>
        <scroll-view scroll-y class="toc-list">
          <view
            v-for="(ch, idx) in chapters"
            :key="ch.id"
            :class="['toc-item', { active: idx === curIdx, bookmark: isChapterBookmarked(idx) }]"
            @click="switchToChapter(idx)"
          >
            <view class="toc-item-left">
              <text v-if="isChapterBookmarked(idx)" class="toc-bm-icon">&#128205;</text>
              <text class="toc-chapter-num">{{ idx + 1 }}</text>
            </view>
            <text class="toc-chapter-title">{{ ch.title }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ========== 书签列表弹窗 ========== -->
    <view v-if="showBookmarkList" class="toc-overlay" @click="showBookmarkList = false">
      <view class="bookmark-panel" @click.stop="">
        <view class="toc-header">
          <text class="toc-title">书签列表</text>
          <text class="toc-close" @click="showBookmarkList = false">&#10005;</text>
        </view>
        <view v-if="bookmarkedChapters.length === 0" class="bm-empty">
          <text class="bm-empty-text">暂无书签</text>
        </view>
        <scroll-view v-else scroll-y class="bm-list">
          <view
            v-for="(bm, idx) in bookmarkedChapters"
            :key="idx"
            class="bm-item"
            @click="switchToChapterByIndex(bm.index); showBookmarkList = false"
          >
            <text class="bm-chapter">第{{ bm.index + 1 }}章</text>
            <text class="bm-title">{{ bm.title }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { classicApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

// ========== 状态变量 ==========
const book = ref<any>(null)
const chapters = ref<any[]>([])
const chapter = ref<any>(null)
const curIdx = ref(0)
const loading = ref(true)
const errorMsg = ref('')

// 设置
const fontSize = ref(20)
const showTranslation = ref(true)
const isDark = ref(false)
const showSettings = ref(false)

// 目录
const showToc = ref(false)
const showBookmarkList = ref(false)

// 书签
const isBookmarked = ref(false)
const bookmarkedIds = ref<Set<string>>(new Set())
const bookmarkChapters = ref<Array<{ chapterId: string; title: string }>>([])

// 笔记
const showNotesPanel = ref(false)
const noteContent = ref('')
const currentNotes = ref<Array<{ time: string; content: string }>>([])

// 状态栏
const statusBarHeight = ref(20)
const contentRef = ref<any>(null)

// 阅读进度保存定时器
let progressTimer: ReturnType<typeof setTimeout> | null = null

// 字体预设
const fontPresets = [
  { label: '小', size: 16 },
  { label: '中', size: 20 },
  { label: '大', size: 24 },
]

// 计算属性
const hasPrev = computed(() => curIdx.value > 0)
const hasNext = computed(() => curIdx.value < chapters.value.length - 1)

const bookmarkedChapters = computed(() => {
  return bookmarkChapters.value
    .map((bm) => {
      const idx = chapters.value.findIndex((c) => c.id === bm.chapterId)
      return { ...bm, index: idx >= 0 ? idx : -1 }
    })
    .filter((bm) => bm.index >= 0)
})

// ========== 初始化 ==========
onMounted(async () => {
  try {
    const sysInfo = uni.getSystemInfoSync()
    statusBarHeight.value = sysInfo.statusBarHeight || 20
  } catch {
    statusBarHeight.value = 20
  }
  initReader()
})

onUnmounted(() => {
  if (progressTimer) clearTimeout(progressTimer)
})

function initReader() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  const bookId = opts.bookId || opts.id || ''
  const chapterId = opts.chapterId || ''

  if (!bookId) {
    errorMsg.value = '缺少书籍ID'
    loading.value = false
    return
  }

  fetchBook(bookId, chapterId)
}

// ========== 获取数据 ==========
async function fetchBook(bookId: string, targetChapterId?: string) {
  loading.value = true
  errorMsg.value = ''
  try {
    book.value = await classicApi.bookDetail(bookId)
    chapters.value = book.value?.chapters || []

    // 恢复阅读进度
    if (!targetChapterId) {
      try {
        const prog = await classicApi.getProgress(bookId)
        if (prog?.chapterId) {
          targetChapterId = prog.chapterId
        }
      } catch {
        // 忽略进度恢复失败
      }
    }

    // 设置初始章节
    if (targetChapterId) {
      const idx = chapters.value.findIndex((c: any) => c.id === targetChapterId)
      if (idx >= 0) curIdx.value = idx
    }

    if (chapters.value.length > 0) {
      await fetchChapter(chapters.value[curIdx.value].id)
    } else {
      errorMsg.value = '该书籍暂无章节'
      loading.value = false
    }

    // 加载书签
    loadBookmarks(bookId)
    // 加载笔记
    loadNotes(bookId)

    // 检查当前章节是否已收藏
    checkBookmarkStatus()
  } catch (e: any) {
    errorMsg.value = '加载失败，请检查网络连接'
    loading.value = false
  }
}

async function fetchChapter(chapterId: string) {
  try {
    chapter.value = await classicApi.chapterDetail(chapterId)
    loading.value = false

    // 延时加载笔记
    await nextTick()
    loadNotesForCurrentChapter()
    checkBookmarkStatus()
  } catch {
    chapter.value = null
    errorMsg.value = '章节加载失败'
    loading.value = false
  }
}

// ========== 章节切换 ==========
async function switchToChapter(idx: number) {
  if (idx < 0 || idx >= chapters.value.length) return
  curIdx.value = idx
  showToc.value = false
  loading.value = true
  errorMsg.value = ''

  const ch = chapters.value[idx]
  try {
    chapter.value = await classicApi.chapterDetail(ch.id)
    loading.value = false
    // 保存进度
    scheduleProgressSave()
    // 检查书签状态
    checkBookmarkStatus()
    // 加载当前章节笔记
    loadNotesForCurrentChapter()
    // 滚动到顶部
    uni.pageScrollTo({ scrollTop: 0, duration: 200 })
  } catch {
    errorMsg.value = '章节加载失败'
    loading.value = false
  }
}

function switchToChapterByIndex(idx: number) {
  if (idx >= 0) switchToChapter(idx)
}

function nextChapter() {
  if (hasNext.value) switchToChapter(curIdx.value + 1)
}

function prevChapter() {
  if (hasPrev.value) switchToChapter(curIdx.value - 1)
}

// ========== 阅读进度 ==========
function scheduleProgressSave() {
  if (progressTimer) clearTimeout(progressTimer)
  progressTimer = setTimeout(() => {
    saveProgress()
  }, 3000)
}

async function saveProgress() {
  if (!book.value?.id || !chapters.value[curIdx.value]?.id) return
  try {
    const ch = chapters.value[curIdx.value]
    await classicApi.updateProgress(
      book.value.id,
      ch.id,
      Math.round(((curIdx.value + 1) / chapters.value.length) * 100),
    )
  } catch {
    // 静默失败
  }
}

// ========== 书签 ==========
function isChapterBookmarked(chapterIndex: number): boolean {
  const ch = chapters.value[chapterIndex]
  if (!ch) return false
  return bookmarkedIds.value.has(ch.id)
}

function checkBookmarkStatus() {
  const ch = chapters.value[curIdx.value]
  if (!ch) return
  isBookmarked.value = bookmarkedIds.value.has(ch.id)
}

async function loadBookmarks(bookId: string) {
  try {
    const data = await classicApi.bookmarks(bookId)
    const list = data.bookmarks || data.list || data || []
    if (Array.isArray(list)) {
      bookmarkedIds.value = new Set(list.map((b: any) => b.chapterId || b.chapter_id))
      bookmarkChapters.value = list.map((b: any) => ({
        chapterId: b.chapterId || b.chapter_id,
        title: b.chapterTitle || b.chapter_title || '',
      }))
    }
  } catch {
    // 忽略
  }
}

async function toggleBookmark() {
  const ch = chapters.value[curIdx.value]
  if (!ch || !book.value?.id) return

  if (isBookmarked.value) {
    // 删除书签：查找书签ID
    try {
      const data = await classicApi.bookmarks(book.value.id)
      const list = data.bookmarks || data.list || data || []
      if (Array.isArray(list)) {
        const bm = list.find(
          (b: any) => (b.chapterId || b.chapter_id) === ch.id,
        )
        if (bm?.id) {
          await classicApi.deleteBookmark(bm.id)
          bookmarkedIds.value.delete(ch.id)
          bookmarkChapters.value = bookmarkChapters.value.filter(
            (b) => b.chapterId !== ch.id,
          )
          isBookmarked.value = false
          uni.showToast({ title: '已取消书签', icon: 'none' })
          return
        }
      }
    } catch {
      // 降级处理：本地状态切换
    }
    bookmarkedIds.value.delete(ch.id)
    isBookmarked.value = false
  } else {
    try {
      await classicApi.addBookmark(book.value.id, {
        chapterId: ch.id,
        chapterTitle: ch.title,
        position: 0,
      })
      bookmarkedIds.value.add(ch.id)
      bookmarkChapters.value.push({ chapterId: ch.id, title: ch.title })
      isBookmarked.value = true
      uni.showToast({ title: '已添加书签', icon: 'success' })
    } catch {
      uni.showToast({ title: '添加书签失败', icon: 'none' })
    }
  }
}

// ========== 笔记 ==========
const notesStorageKey = computed(() => {
  if (!book.value?.id) return ''
  return `reader_notes_${book.value.id}`
})

function loadNotes(bookId: string) {
  try {
    const key = `reader_notes_${bookId}`
    const stored = uni.getStorageSync(key)
    if (stored) {
      // 按章节存储笔记
    }
  } catch {
    // 忽略
  }
}

function loadNotesForCurrentChapter() {
  const ch = chapters.value[curIdx.value]
  if (!ch || !notesStorageKey.value) {
    currentNotes.value = []
    noteContent.value = ''
    return
  }
  try {
    const allNotes = uni.getStorageSync(notesStorageKey.value) || {}
    currentNotes.value = (allNotes[ch.id] || [])
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
    noteContent.value = ''
  } catch {
    currentNotes.value = []
    noteContent.value = ''
  }
}

function saveNote() {
  const content = noteContent.value.trim()
  if (!content) {
    uni.showToast({ title: '请输入笔记内容', icon: 'none' })
    return
  }
  const ch = chapters.value[curIdx.value]
  if (!ch || !notesStorageKey.value) return

  try {
    const allNotes = uni.getStorageSync(notesStorageKey.value) || {}
    const chapterNotes = allNotes[ch.id] || []
    const now = new Date()
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    chapterNotes.unshift({
      content,
      time: timeStr,
      timestamp: now.getTime(),
    })
    allNotes[ch.id] = chapterNotes
    uni.setStorageSync(notesStorageKey.value, allNotes)
    currentNotes.value = chapterNotes
    noteContent.value = ''
    uni.showToast({ title: '笔记已保存', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

// ========== 设置 ==========
function setFontSize(size: number) {
  fontSize.value = size
}

function toggleDark() {
  isDark.value = !isDark.value
}

// ========== 工具 ==========
function scrollToTop() {
  uni.pageScrollTo({ scrollTop: 0, duration: 300 })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* ========== 页面 ========== */
.page {
  background: #f5f0e6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}
.page.dark-mode {
  background: #1a1a2e;
}
.page.dark-mode .nav-bar {
  background: #16213e;
  border-bottom-color: #2a2a4a;
}
.page.dark-mode .nav-title {
  color: #e0c87d;
}
.page.dark-mode .nav-back,
.page.dark-mode .nav-btn {
  color: #ccc;
}
.page.dark-mode .settings-panel {
  background: #16213e;
  border-bottom-color: #2a2a4a;
}
.page.dark-mode .setting-label {
  color: #ccc;
}
.page.dark-mode .reader-content {
  color: #d4d4d4;
}
.page.dark-mode .chapter-title {
  color: #e0c87d;
}
.page.dark-mode .text-body {
  color: #d4d4d4;
}
.page.dark-mode .translation-block {
  background: #1a2744;
}
.page.dark-mode .annotation-block {
  border-top-color: #2a2a4a;
}
.page.dark-mode .bottom-bar {
  background: #16213e;
  border-top-color: #2a2a4a;
}
.page.dark-mode .bottom-btn {
  color: #ccc;
}
.page.dark-mode .chapter-name {
  color: #999;
}
.page.dark-mode .action-item {
  color: #999;
}
.page.dark-mode .action-item.active {
  color: #e0c87d;
}
.page.dark-mode .toc-drawer {
  background: #16213e;
}
.page.dark-mode .bookmark-panel {
  background: #16213e;
}
.page.dark-mode .toc-item {
  border-bottom-color: #2a2a4a;
}
.page.dark-mode .toc-chapter-title {
  color: #ccc;
}
.page.dark-mode .toc-item.active .toc-chapter-title {
  color: #e0c87d;
}
.page.dark-mode .notes-section {
  border-top-color: #2a2a4a;
}
.page.dark-mode .notes-textarea {
  background: #1a2744;
  color: #d4d4d4;
  border-color: #2a2a4a;
}
.page.dark-mode .notes-history-item {
  border-bottom-color: #2a2a4a;
}
.page.dark-mode .bm-chapter {
  color: #e0c87d;
}
.page.dark-mode .bm-title {
  color: #ccc;
}

/* ========== 导航栏 ========== */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #fff;
  z-index: 50;
  border-bottom: 1px solid #f0ece4;
}
.nav-inner {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 12px;
}
.nav-left {
  width: 60px;
}
.nav-back {
  font-size: 22px;
  color: #8b4513;
  padding: 4px;
}
.nav-center {
  flex: 1;
  text-align: center;
}
.nav-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
.nav-right {
  width: 60px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.nav-btn {
  font-size: 16px;
  color: #8b4513;
  font-weight: bold;
}

/* ========== 设置面板 ========== */
.settings-panel {
  position: fixed;
  left: 0;
  right: 0;
  background: #fff;
  z-index: 49;
  padding: 8px 16px 12px;
  border-bottom: 1px solid #eee;
}
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}
.setting-label {
  font-size: 14px;
  color: #333;
}
.font-presets {
  display: flex;
  gap: 6px;
}
.font-preset-btn {
  padding: 4px 16px;
  border-radius: 14px;
  font-size: 13px;
  background: #f5f0e6;
  color: #888;
  border: 1px solid transparent;
}
.font-preset-btn.active {
  background: #8b4513;
  color: #fff;
  font-weight: bold;
}
.toggle-switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: #ddd;
  padding: 2px;
  position: relative;
  transition: background 0.2s;
}
.toggle-switch.on {
  background: #8b4513;
}
.toggle-knob {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}
.toggle-switch.on .toggle-knob {
  transform: translateX(20px);
}

/* ========== 正文区 ========== */
.reader-body {
  flex: 1;
  padding-bottom: 130px;
}
.reader-content {
  padding: 24px 20px;
}
.chapter-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  color: #8b4513;
  display: block;
  margin-bottom: 12px;
}
.chapter-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #c4943a, transparent);
  margin-bottom: 20px;
}
.text-body {
  color: #333;
  white-space: pre-wrap;
  word-break: break-all;
  letter-spacing: 0.5px;
  text-indent: 2em;
}

/* 译文 */
.translation-block {
  margin-top: 24px;
  padding: 14px;
  background: #faf6ef;
  border-radius: 8px;
  border-left: 3px solid #c4943a;
}
.trans-header {
  margin-bottom: 8px;
}
.trans-label {
  font-size: 13px;
  font-weight: bold;
  color: #8b4513;
}
.trans-body {
  color: #666;
  line-height: 1.8;
}

/* 注释 */
.annotation-block {
  margin-top: 20px;
  padding: 14px;
  border-top: 1px dashed #e0d5c1;
}
.annotation-body {
  color: #777;
  line-height: 1.7;
  margin-top: 8px;
}

/* 笔记 */
.notes-section {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid #f0ece4;
}
.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}
.notes-title {
  font-size: 14px;
  font-weight: bold;
  color: #8b4513;
}
.notes-toggle {
  font-size: 12px;
  color: #999;
}
.notes-body {
  margin-top: 10px;
}
.notes-textarea {
  width: 100%;
  min-height: 80px;
  background: #f7f4ef;
  border: 1px solid #ede6d8;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  box-sizing: border-box;
}
.notes-save-btn {
  background: #8b4513;
  color: #fff;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 13px;
  border: none;
  margin-top: 8px;
  align-self: flex-end;
}
.notes-history {
  margin-top: 14px;
}
.notes-history-title {
  font-size: 13px;
  font-weight: bold;
  color: #666;
  display: block;
  margin-bottom: 8px;
}
.notes-history-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0ece4;
}
.notes-history-time {
  font-size: 11px;
  color: #bbb;
  display: block;
}
.notes-history-content {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
  display: block;
  line-height: 1.5;
}

.content-bottom-spacer {
  height: 40px;
}

/* ========== 底部栏 ========== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #f0ece4;
  z-index: 40;
}
.bottom-progress {
  height: 3px;
  background: #f0ece4;
}
.progress-track {
  height: 100%;
  background: #f0ece4;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b4513, #c4943a);
  transition: width 0.3s;
}
.bottom-main {
  display: flex;
  align-items: center;
  padding: 8px 12px 4px;
}
.bottom-left,
.bottom-right {
  width: 80px;
}
.bottom-right {
  text-align: right;
}
.bottom-btn {
  font-size: 13px;
  color: #8b4513;
}
.bottom-btn.disabled {
  color: #ddd;
  pointer-events: none;
}
.bottom-center {
  flex: 1;
  text-align: center;
}
.progress-text {
  font-size: 12px;
  color: #999;
  display: block;
}
.chapter-name {
  font-size: 11px;
  color: #bbb;
  display: block;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bottom-actions {
  display: flex;
  justify-content: space-around;
  padding: 4px 12px 8px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
}
.action-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 14px;
  color: #888;
}
.action-item.active {
  color: #c4943a;
}
.action-label {
  font-size: 11px;
}

/* ========== 目录（左侧抽屉） ========== */
.toc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 100;
  display: flex;
}
.toc-drawer {
  width: 75%;
  max-width: 320px;
  background: #fff;
  display: flex;
  flex-direction: column;
  animation: slideInLeft 0.25s ease;
}
@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
.toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f0ece4;
}
.toc-title {
  font-size: 16px;
  font-weight: bold;
  color: #8b4513;
}
.toc-close {
  font-size: 18px;
  color: #999;
  padding: 4px;
}
.toc-bookmarks-bar {
  padding: 10px 16px;
  border-bottom: 1px solid #f0ece4;
}
.toc-bm-title {
  font-size: 12px;
  font-weight: bold;
  color: #c4943a;
  display: block;
  margin-bottom: 6px;
}
.toc-bm-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.toc-bm-tag {
  font-size: 11px;
  color: #8b4513;
  background: #f5ead6;
  padding: 2px 10px;
  border-radius: 10px;
}
.toc-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 20px;
}
.toc-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #f8f5f0;
  transition: background 0.15s;
}
.toc-item.active {
  background: #f5ede2;
}
.toc-item.bookmark {
  border-left: 3px solid #c4943a;
}
.toc-item-left {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 36px;
  flex-shrink: 0;
}
.toc-bm-icon {
  font-size: 12px;
}
.toc-chapter-num {
  font-size: 12px;
  color: #bbb;
  font-weight: 500;
}
.toc-item.active .toc-chapter-num {
  color: #8b4513;
  font-weight: bold;
}
.toc-chapter-title {
  font-size: 14px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toc-item.active .toc-chapter-title {
  color: #8b4513;
  font-weight: bold;
}

/* ========== 书签列表弹窗 ========== */
.bookmark-panel {
  width: 75%;
  max-width: 320px;
  background: #fff;
  display: flex;
  flex-direction: column;
  margin-left: auto;
  animation: slideInRight 0.25s ease;
}
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.bm-empty {
  padding: 40px 0;
  text-align: center;
}
.bm-empty-text {
  font-size: 14px;
  color: #ccc;
}
.bm-list {
  flex: 1;
  overflow-y: auto;
}
.bm-item {
  padding: 14px 16px;
  border-bottom: 1px solid #f0ece4;
}
.bm-chapter {
  font-size: 12px;
  color: #8b4513;
  display: block;
  margin-bottom: 4px;
}
.bm-title {
  font-size: 14px;
  color: #333;
}

/* ========== 加载/错误 ========== */
.loading-section {
  padding: 20px 16px;
}
.error-section {
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.retry-btn {
  background: #8b4513;
  color: #fff;
  border-radius: 20px;
  padding: 8px 24px;
  font-size: 14px;
  border: none;
  margin-top: 12px;
}
</style>
