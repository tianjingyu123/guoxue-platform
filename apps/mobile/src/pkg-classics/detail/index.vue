<template>
  <view class="cd-page">
    <customer-service-fab />
    <classics-header v-if="book" :title="book.title" right-type="share" @back="goBack" @right="onShare" />

    <view class="cd-main">
      <!-- 加载态 -->
      <view v-if="loading" class="cd-sec" style="text-align:center;padding:128rpx 0;">
        <text style="color:var(--muted-foreground);font-size:28rpx;">加载中...</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="cd-sec" style="text-align:center;padding:128rpx 0;">
        <text style="color:#c41e3a;font-size:28rpx;">{{ error }}</text>
        <view style="margin-top:24rpx;" @tap="fetchData(bookId)">
          <text style="color:var(--muted-foreground);">重试</text>
        </view>
      </view>
      <template v-else-if="book">
      <!-- 封面区 -->
      <view class="cd-cover-sec">
        <view class="cd-cover-row">
          <flat-cover
            :title="book.title"
            :label="dynastyLabel"
            :footer="book.author.split('/')[0]"
            :cover-color="coverColorForBook(book.title)"
            title-size="36rpx"
            class="cd-cover"
          />
          <view class="cd-info">
            <view>
              <text class="cd-title">{{ book.title }}</text>
              <text class="cd-author">{{ dynastyLabel ? `[${dynastyLabel}] ` : '' }}{{ book.author }}</text>
              <view class="cd-tags">
                <text class="cd-tag cd-tag-muted">{{ book.version }}</text>
                <text v-if="book.hasTranslation" class="cd-tag cd-tag-amber">译文</text>
                <text v-if="book.isFree" class="cd-tag cd-tag-green">免费</text>
              </view>
            </view>
            <view class="cd-stats">
              <view class="cd-stat">
                <app-icon name="eye" :size="26" color="#999999" />
                <text class="cd-stat-text">{{ readsText }}</text>
              </view>
              <view class="cd-stat">
                <app-icon name="file-text" :size="26" color="#999999" />
                <text class="cd-stat-text">{{ book.totalChapters }}篇</text>
              </view>
              <view class="cd-stat cd-fav" @tap="toggleFavorite">
                <app-icon name="heart" :size="26" :color="isFavorited ? '#c41e3a' : '#999999'" :fill="isFavorited" />
                <text class="cd-stat-text" :style="{ color: isFavorited ? '#c41e3a' : '' }">{{ isFavorited ? '已收藏' : '收藏' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- AI 智能导读（后端生成摘要后显示，无摘要则隐藏，避免空壳） -->
      <view v-if="book.aiSummary" class="cd-sec">
        <view class="cd-card cd-ai">
          <view class="cd-ai-head">
            <view class="cd-ai-badge">
              <app-icon name="sparkles" :size="22" color="#ffffff" />
            </view>
            <text class="cd-ai-title">经典导读</text>
          </view>
          <text class="cd-ai-text">{{ book.aiSummary }}</text>
        </view>
      </view>

      <!-- AI 功能亮点 -->
      <view v-if="book.hasAI" class="cd-sec">
        <view class="cd-features">
          <view v-for="feat in AI_FEATURES" :key="feat.label" class="cd-feature">
            <view class="cd-feature-icon">
              <app-icon :name="feat.icon" :size="34" color="#c41e3a" />
            </view>
            <text class="cd-feature-label">{{ feat.label }}</text>
          </view>
        </view>
      </view>

      <!-- 听书入口 -->
      <view v-if="book.hasAudio" class="cd-sec">
        <view class="cd-card cd-audio" @tap="toReader('audio')">
          <view class="cd-audio-icon">
            <app-icon name="headphones" :size="38" color="#ffffff" />
          </view>
          <view class="cd-audio-body">
            <text class="cd-audio-title">听书版本</text>
            <text class="cd-audio-sub">名家朗读 · 全本</text>
          </view>
          <app-icon name="chevron-right" :size="36" color="#cccccc" />
        </view>
      </view>

      <!-- 发起共读拼团（结伴同修·纯学习激励） -->
      <view class="cd-sec">
        <view class="cd-card cd-coread" @tap="toSharedReading">
          <view class="cd-coread-icon">
            <app-icon name="users" :size="38" color="#ffffff" />
          </view>
          <view class="cd-coread-body">
            <text class="cd-coread-title">发起共读拼团</text>
            <text class="cd-coread-sub">邀 3-5 位书友结伴共读 · 达成得学分与结业卡</text>
          </view>
          <app-icon name="chevron-right" :size="36" color="#cccccc" />
        </view>
      </view>

      <!-- 目录 -->
      <view class="cd-sec">
        <view class="cd-sec-head">
          <text class="cd-sec-title">目录</text>
          <text class="cd-sec-meta">共 {{ book.totalChapters }} 卷</text>
        </view>
        <view class="cd-card cd-toc">
          <view v-for="(chapter, index) in displayedChapters" :key="chapter.id" :class="{ 'cd-toc-divider': index > 0 }">
            <view class="cd-toc-item" @tap="chapter.hasChildren ? toggleChapter(chapter.id) : toReader(chapter.id)">
              <app-icon
                v-if="chapter.hasChildren"
                name="chevron-down"
                :size="28"
                color="#999999"
                class="cd-toc-chevron"
                :class="{ 'cd-toc-chevron-open': expandedChapters.has(chapter.id) }"
              />
              <view v-else class="cd-toc-spacer" />
              <text class="cd-toc-title">{{ chapter.title }}</text>
            </view>
            <view v-if="chapter.hasChildren && chapter.children && expandedChapters.has(chapter.id)" class="cd-toc-children">
              <view v-for="child in chapter.children" :key="child.id" class="cd-toc-child" @tap="toReader(child.id)">
                <text class="cd-toc-child-text">{{ child.title }}</text>
              </view>
            </view>
          </view>
          <view v-if="!showAllChapters && book.chapters.length > 6" class="cd-toc-more" @tap="showAllChapters = true">
            查看全部 {{ book.chapters.length }} 个章节
          </view>
        </view>
      </view>

      <!-- 书友评论（统一评论组件·targetType=CLASSIC_BOOK·吸底输入条随处可评） -->
      <view class="cd-sec cd-comments">
        <view class="cd-sec-head">
          <text class="cd-sec-title">书友评论</text>
          <text v-if="commentCount > 0" class="cd-sec-meta">{{ commentCount }} 条</text>
        </view>
        <view class="cd-card cd-comments-card">
          <comment-section
            target-type="CLASSIC_BOOK"
            :target-id="book.id"
            @count-change="commentCount = $event"
          />
        </view>
      </view>

      <!-- 相关推荐（空列表整块不渲染，避免「标题+空横滚」空壳） -->
      <view v-if="book.relatedBooks && book.relatedBooks.length" class="cd-sec cd-related-sec">
        <text class="cd-sec-title cd-related-title">相关推荐</text>
        <scroll-view scroll-x class="cd-related-scroll">
          <view class="cd-related-row">
            <view v-for="rb in book.relatedBooks" :key="rb.id" class="cd-related-item" @tap="toBook(rb.id)">
              <flat-cover :title="rb.title" :cover-color="coverColorForBook(rb.title)" title-size="30rpx" class="cd-related-cover" />
              <text class="cd-related-name">{{ rb.title }}</text>
              <text class="cd-related-author">{{ rb.author }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
      </template>
    <!-- 底部固定操作栏 -->
    <view class="cd-bottom">
      <view class="cd-bottom-row">
        <view class="cd-shelf-btn" :class="{ 'cd-shelf-on': isInBookshelf }" @tap="toggleShelf">
          <app-icon :name="isInBookshelf ? 'bookmark-check' : 'bookmark-plus'" :size="34" :color="isInBookshelf ? '#c41e3a' : '#2c2c2c'" />
          <text class="cd-shelf-text" :style="{ color: isInBookshelf ? '#c41e3a' : '#2c2c2c' }">{{ isInBookshelf ? '已在书架' : '加入书架' }}</text>
        </view>
        <view class="cd-read-btn" @tap="toReader()">
          <app-icon name="play" :size="34" color="#ffffff" :fill="true" />
          <text class="cd-read-text">{{ lastChapterId ? '继续阅读' : '开始阅读' }}</text>
        </view>
      </view>
    </view>

  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useShare } from '@/composables/useShare'
import { withRef } from '@/utils/referral'
import ClassicsHeader from '@/components/classics/classics-header.vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import CommentSection from '@/components/comment/comment-section.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { classicsApi, _mockAI_FEATURES, type BookInfo } from '@/lib/classics-data'
import { getToken } from '@/utils/storage'

const bookId = ref('1')
const book = ref<BookInfo | null>(null)
const AI_FEATURES = _mockAI_FEATURES
const loading = ref(true)
const error = ref('')

const isInBookshelf = ref(false)
// 上次读到的章节（阅读进度记录 chapterId）·有值时「开始阅读」变「继续阅读」并续读该章
const lastChapterId = ref('')
// 书友评论总数（由统一评论组件 count-change 回传，用于小节头「N 条」）
const commentCount = ref(0)
const expandedChapters = ref<Set<string>>(new Set())
const showAllChapters = ref(false)

const displayedChapters = computed(() =>
  book.value ? (showAllChapters.value ? book.value.chapters : book.value.chapters.slice(0, 6)) : [],
)

// 阅读量：万级才用「万」，小数尾零去掉；0 直接显示「0」而非「0.0万」
const readsText = computed(() => {
  const n = book.value?.reads ?? 0
  return n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '万' : String(n)
})
// 朝代：空/占位（—、未知）不显示方括号，避免「[—]佚名」
const dynastyLabel = computed(() => {
  const d = (book.value?.dynasty || '').trim()
  return d && d !== '—' && d !== '未知' && d !== '佚名' ? d : ''
})

async function fetchData(id: string) {
  loading.value = true
  error.value = ''
  try {
    const data = await classicsApi.detail(id)
    book.value = data.book
    isInBookshelf.value = data.book?.isInBookshelf ?? false
    lastChapterId.value = ''
    // 真实在架状态：登录用户查阅读进度，有记录即在书架（记录内 chapterId 用于续读）
    if (getToken() && data.book?.id) {
      try {
        const prog = (await classicsApi.getProgress(data.book.id)) as { chapterId?: string } | null
        isInBookshelf.value = !!prog
        lastChapterId.value = (prog && typeof prog.chapterId === 'string') ? prog.chapterId : ''
      } catch { /* 未登录或无记录 */ }
      try { isFavorited.value = (await classicsApi.favoriteStatus(data.book.id)).favorited } catch { /* 忽略 */ }
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((q) => {
  if (q && q.id) bookId.value = String(q.id)
  fetchData(bookId.value)
})

// 从阅读器返回时轻量刷新续读章节（只查进度不重拉整页），保证「继续阅读」指向最新章
let shownOnce = false
onShow(async () => {
  if (!shownOnce) { shownOnce = true; return } // 首次 onShow 紧随 onLoad，fetchData 已在查
  if (!getToken() || !book.value) return
  try {
    const prog = (await classicsApi.getProgress(book.value.id)) as { chapterId?: string } | null
    if (prog) {
      isInBookshelf.value = true
      lastChapterId.value = typeof prog.chapterId === 'string' ? prog.chapterId : ''
    }
  } catch { /* 忽略 */ }
})

// 微信原生分享（好友 / 朋友圈）；古籍封面为生成色块，无图片字段，故省略 cover
const { toAppMessage, toTimeline } = useShare()
onShareAppMessage(() => toAppMessage({
  title: book.value?.title || '古籍典藏',
  path: `/classics/${book.value?.id || bookId.value}`,
}))
onShareTimeline(() => toTimeline({
  title: book.value?.title || '古籍典藏',
  path: `/classics/${book.value?.id || bookId.value}`,
}))

function toggleChapter(id: string) {
  const next = new Set(expandedChapters.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expandedChapters.value = next
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
/**
 * 顶栏分享（H5 无原生转发面板·照短视频 buildShareUrl/withRef 范式）：
 * 构造本书 H5 深链（携带分享者 ref 推荐归因）→ 复制到剪贴板 + toast 引导转发。
 * 小程序端仍走 onShareAppMessage/onShareTimeline 原生转发。
 */
function buildShareUrl(): string {
  const id = book.value?.id || bookId.value
  // import.meta.env 在 uni-app 下缺少类型声明，保留 as any
  let base = (import.meta as any).env?.VITE_H5_URL || 'https://api.rebugx.cn/h5'
  // #ifdef H5
  base = window.location.origin + ((import.meta as any).env?.BASE_URL || '/h5/')
  // #endif
  if (!base.endsWith('/')) base += '/'
  return withRef(`${base}pkg-classics/detail/index?id=${id}`)
}
function onShare() {
  uni.setClipboardData({
    data: buildShareUrl(),
    success: () => uni.showToast({ title: '链接已复制，粘贴给好友吧', icon: 'none' }),
  })
}
function toSharedReading() {
  if (!book.value) return
  uni.navigateTo({
    url: `/pkg-classics/shared-reading/create?bookId=${book.value.id}&bookTitle=${encodeURIComponent(book.value.title)}`,
  })
}
function toReader(chapterId?: string) {
  if (!book.value) return
  if (chapterId === 'audio') {
    uni.navigateTo({ url: `/pkg-classics/audiobooks/player?id=${book.value.id}` })
    return
  }
  const base = `/pkg-classics/reader/index?bookId=${book.value.id}`
  // 未指定章节且有阅读进度：续读上次章节（resume=1 触发阅读器「已定位到上次读到的章节」提示）
  const url = chapterId
    ? `${base}&chapterId=${chapterId}`
    : lastChapterId.value
      ? `${base}&chapterId=${lastChapterId.value}&resume=1`
      : base
  uni.navigateTo({ url })
}

const isFavorited = ref(false)
const favSubmitting = ref(false)
async function toggleFavorite() {
  if (!getToken()) {
    uni.showModal({
      title: '需要登录', content: '登录后即可收藏古籍', confirmText: '去登录',
      success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pkg-auth/login/index' }) },
    })
    return
  }
  if (favSubmitting.value || !book.value) return
  favSubmitting.value = true
  try {
    if (isFavorited.value) {
      await classicsApi.removeFavorite(book.value.id)
      isFavorited.value = false
      uni.showToast({ title: '已取消收藏', icon: 'none' })
    } else {
      await classicsApi.addFavorite(book.value.id)
      isFavorited.value = true
      uni.showToast({ title: '已收藏', icon: 'success' })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    favSubmitting.value = false
  }
}

const shelfSubmitting = ref(false)
async function toggleShelf() {
  if (!getToken()) {
    uni.showModal({
      title: '需要登录', content: '登录后即可加入书架、同步阅读进度', confirmText: '去登录',
      success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pkg-auth/login/index' }) },
    })
    return
  }
  if (shelfSubmitting.value || !book.value) return
  // 已在书架：直接进「我的书房」查看，提供可见入口
  if (isInBookshelf.value) { uni.navigateTo({ url: '/pkg-classics/bookshelf/index' }); return }
  const first = book.value.chapters?.[0]
  if (!first) { uni.showToast({ title: '本书暂无章节', icon: 'none' }); return }
  shelfSubmitting.value = true
  try {
    await classicsApi.saveProgress(book.value.id, first.id, 1)
    isInBookshelf.value = true
    // 加入成功后告知入口，避免「加了却找不到书架」
    uni.showModal({
      title: '已加入书架',
      content: '可在「我的书房」查看已收藏的古籍，再次点按此处即可前往。',
      confirmText: '去书房', cancelText: '继续浏览',
      success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pkg-classics/bookshelf/index' }) },
    })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    shelfSubmitting.value = false
  }
}
async function toBook(id: string) {
  bookId.value = id
  showAllChapters.value = false
  expandedChapters.value = new Set()
  commentCount.value = 0 // 切书先清计数，评论组件 watch targetId 重载后回传新值
  await fetchData(id)
  uni.pageScrollTo({ scrollTop: 0, duration: 0 })
}
</script>

<style scoped>
.cd-page {
  min-height: 100vh;
  background: var(--classics-bg);
  /* 底部两层固定条（操作栏 ~128rpx+安全区 + 评论输入条 ~106rpx）都要让出来 */
  padding-bottom: calc(280rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(280rpx + env(safe-area-inset-bottom));
}
.cd-main {
  max-width: 1280rpx;
  margin: 0 auto;
}
.cd-cover-sec {
  padding: 12rpx 40rpx 40rpx;
}
.cd-cover-row {
  display: flex;
  gap: 40rpx;
}
.cd-cover {
  width: 224rpx;
  flex-shrink: 0;
  /* 防 flex stretch 拉高封面（.cd-cover-row 未设 align-items，默认 stretch 会拉长变形） */
  align-self: flex-start;
}
.cd-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8rpx 0;
}
.cd-title {
  font-family: var(--font-serif, serif);
  font-size: 48rpx;
  font-weight: 700;
  color: var(--foreground);
  line-height: 1.2;
}
.cd-author {
  display: block;
  font-size: 28rpx;
  color: var(--muted-foreground);
  margin-top: 12rpx;
}
.cd-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 24rpx;
}
.cd-tag {
  font-size: 22rpx;
  padding: 2rpx 16rpx;
  border-radius: 8rpx;
}
.cd-tag-muted {
  background: var(--muted);
  color: var(--muted-foreground);
}
.cd-tag-amber {
  background: #fef3c7;
  color: #b45309;
}
.cd-tag-green {
  background: #d1fae5;
  color: #047857;
}
.cd-stats {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 24rpx;
}
.cd-stat {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.cd-stat-text {
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.cd-sec {
  padding: 0 40rpx 32rpx;
}
.cd-card {
  border-radius: 32rpx;
  background: var(--card);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.cd-ai {
  padding: 32rpx;
}
.cd-ai-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.cd-ai-badge {
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(150deg, #c8324c, #9e1b30);
}
.cd-ai-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--brand);
}
.cd-ai-text {
  font-size: 28rpx;
  color: var(--foreground);
  line-height: 1.7;
}
.cd-features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}
.cd-feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 28rpx 0;
  border-radius: 32rpx;
  background: var(--card);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.cd-feature-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cd-feature-label {
  font-size: 22rpx;
  color: var(--muted-foreground);
}
.cd-audio {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
}
.cd-audio-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 999rpx;
  background: #a06a38;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cd-audio-body {
  flex: 1;
  min-width: 0;
}
.cd-audio-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--foreground);
}
.cd-audio-sub {
  display: block;
  font-size: 24rpx;
  color: var(--muted-foreground);
  margin-top: 4rpx;
}
.cd-coread {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
}
.cd-coread-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 999rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cd-coread-body {
  flex: 1;
  min-width: 0;
}
.cd-coread-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--foreground);
}
.cd-coread-sub {
  display: block;
  font-size: 24rpx;
  color: var(--muted-foreground);
  margin-top: 4rpx;
}
.cd-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.cd-sec-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--foreground);
}
.cd-sec-meta {
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.cd-toc {
  overflow: hidden;
}
.cd-toc-divider {
  border-top: 2rpx solid var(--border);
}
.cd-toc-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
}
.cd-toc-chevron {
  transition: transform 0.2s;
}
.cd-toc-chevron-open {
  transform: rotate(180deg);
}
.cd-toc-spacer {
  width: 28rpx;
}
.cd-toc-title {
  font-size: 28rpx;
  flex: 1;
  color: var(--foreground);
}
.cd-toc-children {
  background: var(--muted);
}
.cd-toc-child {
  padding: 20rpx 32rpx 20rpx 88rpx;
}
.cd-toc-child-text {
  font-size: 26rpx;
  color: var(--muted-foreground);
}
.cd-toc-more {
  padding: 28rpx 0;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--brand);
  border-top: 2rpx solid var(--border);
}
.cd-related-sec {
  padding-left: 0;
  padding-right: 0;
}
.cd-related-title {
  display: block;
  margin-bottom: 24rpx;
  padding: 0 40rpx;
}
.cd-related-scroll {
  white-space: nowrap;
}
.cd-related-row {
  display: inline-flex;
  gap: 32rpx;
  padding: 0 40rpx;
}
.cd-related-item {
  width: 176rpx;
  flex-shrink: 0;
}
.cd-related-cover {
  width: 100%;
  margin-bottom: 16rpx;
}
.cd-related-name {
  display: block;
  font-size: 24rpx;
  text-align: center;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cd-related-author {
  display: block;
  font-size: 20rpx;
  text-align: center;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* ── 统一评论组件与页面固定操作栏共存 ──
 * comment-section 的吸底输入条恒为 fixed（组件未透传 :fixed），而本页已有
 * .cd-bottom 固定操作栏（z-index 40）压在同一 bottom:0 上。
 * 处理：把输入条整体抬到操作栏之上（bottom = 操作栏高 128rpx + 安全区），
 * z-index 39 低于操作栏——「开始阅读/加入书架」始终在最底层完整可点，不被输入条盖住。 */
.cd-comments-card {
  padding: 8rpx 28rpx 20rpx;
}
.cd-comments :deep(.cib--fixed) {
  bottom: calc(128rpx + constant(safe-area-inset-bottom));
  bottom: calc(128rpx + env(safe-area-inset-bottom));
  z-index: 39;
  /* 不再贴屏幕底缘，安全区由下方操作栏承担，避免双重加高 */
  padding-bottom: 16rpx;
}
/* 组件内自带的「给吸底输入条让位」垫片按贴屏底算高（140rpx+安全区），
 * 且评论区后还有相关推荐，垫片会变成版心中段空洞——清零，让位改由 .cd-page 底部留白统一承担 */
.cd-comments :deep(.csec__pad) {
  height: 0;
}

.cd-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  background: color-mix(in srgb, var(--classics-bg) 90%, transparent);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-top: 2rpx solid var(--border);
  padding: 16rpx 40rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.cd-bottom-row {
  display: flex;
  gap: 24rpx;
  max-width: 1280rpx;
  margin: 0 auto;
}
.cd-shelf-btn {
  flex: 1;
  height: 96rpx;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  background: var(--card);
  border: 2rpx solid rgba(0, 0, 0, 0.06);
}
.cd-shelf-on {
  background: rgba(196, 30, 58, 0.1);
  border-color: rgba(196, 30, 58, 0.3);
}
.cd-shelf-text {
  font-size: 30rpx;
  font-weight: 600;
}
.cd-read-btn {
  flex: 1;
  height: 96rpx;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  background: var(--brand);
  box-shadow: 0 2rpx 12rpx rgba(196, 30, 58, 0.2);
}
.cd-read-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}
</style>
