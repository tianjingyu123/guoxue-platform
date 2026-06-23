<template>
  <view class="cd-page">
    <classics-header :title="book.title" right-type="share" @back="goBack" @right="onShare" />

    <view class="cd-main">
      <!-- 封面区 -->
      <view class="cd-cover-sec">
        <view class="cd-cover-row">
          <flat-cover
            :title="book.title"
            :label="book.dynasty"
            :footer="book.author.split('/')[0]"
            :cover-color="coverColorForBook(book.title)"
            title-size="36rpx"
            class="cd-cover"
          />
          <view class="cd-info">
            <view>
              <text class="cd-title">{{ book.title }}</text>
              <text class="cd-author">[{{ book.dynasty }}] {{ book.author }}</text>
              <view class="cd-tags">
                <text class="cd-tag cd-tag-muted">{{ book.version }}</text>
                <text v-if="book.hasTranslation" class="cd-tag cd-tag-amber">译文</text>
                <text v-if="book.isFree" class="cd-tag cd-tag-green">免费</text>
              </view>
            </view>
            <view class="cd-stats">
              <view class="cd-stat">
                <app-icon name="star" :size="26" color="#f59e0b" :fill="true" />
                <text class="cd-stat-text">{{ book.rating }}</text>
              </view>
              <view class="cd-stat">
                <app-icon name="eye" :size="26" color="#999999" />
                <text class="cd-stat-text">{{ (book.reads / 10000).toFixed(1) }}万</text>
              </view>
              <view class="cd-stat">
                <app-icon name="file-text" :size="26" color="#999999" />
                <text class="cd-stat-text">{{ book.totalChapters }}篇</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- AI 智能导读 -->
      <view class="cd-sec">
        <view class="cd-card cd-ai">
          <view class="cd-ai-head">
            <view class="cd-ai-badge">
              <app-icon name="sparkles" :size="22" color="#ffffff" />
            </view>
            <text class="cd-ai-title">AI 智能导读</text>
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

      <!-- 书友讨论 -->
      <view class="cd-sec">
        <view class="cd-sec-head">
          <text class="cd-sec-title">书友讨论</text>
          <text class="cd-sec-meta">{{ commentCount }} 条</text>
        </view>
        <view class="cd-card cd-disc" @tap="showComments = true">
          <view class="cd-disc-preview">
            <view class="cd-disc-avatar" :style="{ background: '#a06a38' }">{{ firstDiscussion.author.name.charAt(0) }}</view>
            <view class="cd-disc-body">
              <text class="cd-disc-name">{{ firstDiscussion.author.name }}</text>
              <text class="cd-disc-content">{{ firstDiscussion.content }}</text>
              <view class="cd-disc-like">
                <app-icon name="heart" :size="26" color="#999999" />
                <text class="cd-disc-like-text">{{ firstDiscussion.likeCount }}</text>
              </view>
            </view>
          </view>
          <view class="cd-disc-all">
            <app-icon name="message-square" :size="28" color="#c41e3a" />
            <text class="cd-disc-all-text">查看全部 {{ commentCount }} 条讨论</text>
          </view>
        </view>
      </view>

      <!-- 相关推荐 -->
      <view class="cd-sec cd-related-sec">
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
    </view>

    <!-- 底部固定操作栏 -->
    <view class="cd-bottom">
      <view class="cd-bottom-row">
        <view class="cd-shelf-btn" :class="{ 'cd-shelf-on': isInBookshelf }" @tap="isInBookshelf = !isInBookshelf">
          <app-icon :name="isInBookshelf ? 'bookmark-check' : 'bookmark-plus'" :size="34" :color="isInBookshelf ? '#c41e3a' : '#2c2c2c'" />
          <text class="cd-shelf-text" :style="{ color: isInBookshelf ? '#c41e3a' : '#2c2c2c' }">{{ isInBookshelf ? '已在书架' : '加入书架' }}</text>
        </view>
        <view class="cd-read-btn" @tap="toReader()">
          <app-icon name="play" :size="34" color="#ffffff" :fill="true" />
          <text class="cd-read-text">开始阅读</text>
        </view>
      </view>
    </view>

    <!-- 书友讨论抽屉 -->
    <discussion-sheet
      :open="showComments"
      :config="discussionConfig"
      :items="BOOK_DISCUSSIONS"
      :enable-a-i-assist="true"
      @close="showComments = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ClassicsHeader from '@/components/classics/classics-header.vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import DiscussionSheet from '@/components/common/discussion-sheet.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import type { DiscussionConfig, DiscussionItem } from '@/lib/discussion-types'
import type { CoverColor } from '@/lib/classics-cover'

interface Chapter {
  id: string
  title: string
  hasChildren?: boolean
  children?: { id: string; title: string }[]
}
interface BookInfo {
  id: string
  title: string
  author: string
  dynasty: string
  version: string
  description: string
  aiSummary: string
  reads: number
  rating: number
  totalChapters: number
  hasAI: boolean
  hasAudio: boolean
  hasTranslation: boolean
  isFree: boolean
  isInBookshelf: boolean
  color: CoverColor
  chapters: Chapter[]
  relatedBooks: { id: string; title: string; author: string; dynasty: string; color: CoverColor }[]
}

const bookData: Record<string, BookInfo> = {
  '1': {
    id: '1', title: '周易', author: '伏羲/周文王/孔子', dynasty: '周', version: '通行本', color: 'cream',
    description: '《周易》即《易经》，是传统经典之一，相传系周文王姬昌所作，内容包括《经》和《传》两个部分。',
    aiSummary: '群经之首，大道之源。《周易》以六十四卦推演天地万物的变化之理，既是占筮之书，更是一部蕴含宇宙观与处世智慧的哲学经典，读懂它便读懂了中国人的思维底层。',
    reads: 128600, rating: 4.9, totalChapters: 64, hasAI: true, hasAudio: true, hasTranslation: true, isFree: true, isInBookshelf: false,
    chapters: [
      { id: 'c1', title: '扉页' },
      { id: 'c2', title: '序跋', hasChildren: true, children: [{ id: 'c2-1', title: '周易序' }, { id: 'c2-2', title: '周易正义序' }] },
      { id: 'c3', title: '周易卷首目次' },
      { id: 'c4', title: '周易卷首', hasChildren: true },
      { id: 'c5', title: '周易上经', hasChildren: true, children: [{ id: 'c5-1', title: '乾卦第一' }, { id: 'c5-2', title: '坤卦第二' }, { id: 'c5-3', title: '屯卦第三' }] },
      { id: 'c6', title: '周易下经', hasChildren: true },
      { id: 'c7', title: '系辞上传' },
      { id: 'c8', title: '系辞下传' },
      { id: 'c9', title: '说卦传' },
      { id: 'c10', title: '序卦传' },
      { id: 'c11', title: '杂卦传' },
      { id: 'c12', title: '结束页' },
    ],
    relatedBooks: [
      { id: '2', title: '道德经', author: '老子', dynasty: '春秋', color: 'brown' },
      { id: '6', title: '论语', author: '孔子门人', dynasty: '春秋', color: 'red' },
      { id: '4', title: '易传', author: '孔子', dynasty: '春秋', color: 'green' },
    ],
  },
  '2': {
    id: '2', title: '道德经', author: '老子', dynasty: '春秋', version: '王弼注本', color: 'brown',
    description: '《道德经》又称《老子》，是道家学派的经典著作，分《道经》和《德经》上下两篇，共八十一章。',
    aiSummary: '道法自然，无为而治。老子用五千字道出宇宙至理，引领人们探寻生命本真，是道家思想的源头活水。',
    reads: 145600, rating: 4.9, totalChapters: 81, hasAI: true, hasAudio: true, hasTranslation: true, isFree: true, isInBookshelf: true,
    chapters: [
      { id: 'c1', title: '扉页' },
      { id: 'c2', title: '序跋' },
      { id: 'c3', title: '道经（第一至第三十七章）', hasChildren: true },
      { id: 'c4', title: '德经（第三十八至第八十一章）', hasChildren: true },
      { id: 'c5', title: '结束页' },
    ],
    relatedBooks: [
      { id: '1', title: '周易', author: '伏羲', dynasty: '周', color: 'cream' },
      { id: '30', title: '庄子', author: '庄周', dynasty: '战国', color: 'green' },
    ],
  },
}

const AI_FEATURES = [
  { icon: 'file-text', label: '文白翻译' },
  { icon: 'sparkles', label: '智能查词' },
  { icon: 'headphones', label: 'AI 听书' },
  { icon: 'network', label: '知识图谱' },
]

const BOOK_DISCUSSIONS: DiscussionItem[] = [
  {
    id: 'b1',
    author: { id: 1, name: '山间煮茶', badge: 'master' },
    content: '读了三遍才慢慢咂摸出味道。古人讲『书读百遍其义自见』，诚不我欺。建议配合注疏一起看，单读原文容易囫囵吞枣。',
    time: '3天前', likeCount: 128, featured: true,
    quote: { text: '书读百遍，其义自见。', source: '读后总评' },
    replies: [
      { id: 'b1r1', author: { id: 11, name: '知秋' }, content: '同感，第一遍真的看不懂，坚持下来豁然开朗。', time: '2天前', likeCount: 12, replyToName: '山间煮茶' },
      { id: 'b1r2', author: { id: 12, name: '未名' }, content: '请问您看的是哪个注本？', time: '2天前', likeCount: 3, replyToName: '山间煮茶' },
    ],
    replyCount: 2,
  },
  {
    id: 'b2',
    author: { id: 2, name: '竹影清风', badge: 'teacher' },
    content: '这个版本的排版和句读做得很用心，AI 译文也比较克制，没有过度发挥，对初学者很友好。',
    time: '5天前', likeCount: 86, replies: [],
  },
  {
    id: 'b3',
    author: { id: 3, name: '归园田居', level: 5 },
    content: '开篇即是高峰。能把如此深奥的道理用这般简练的文字道出，足见先贤功力。每读一次都有新的体会。',
    time: '1周前', likeCount: 54,
    quote: { text: '大道至简。', source: '卷首' },
    replies: [
      { id: 'b3r1', author: { id: 31, name: '听雨轩主' }, content: '『大道至简』四个字概括得好。', time: '6天前', likeCount: 8, replyToName: '归园田居' },
    ],
    replyCount: 1,
  },
]

const bookId = ref('1')
const book = computed(() => bookData[bookId.value] || bookData['1'])

const isInBookshelf = ref(false)
const expandedChapters = ref<Set<string>>(new Set())
const showAllChapters = ref(false)
const showComments = ref(false)

const firstDiscussion = BOOK_DISCUSSIONS[0]
const commentCount = BOOK_DISCUSSIONS.reduce((n, c) => n + 1 + c.replies.length, 0)

const displayedChapters = computed(() =>
  showAllChapters.value ? book.value.chapters : book.value.chapters.slice(0, 6),
)

const discussionConfig: DiscussionConfig = {
  scene: 'classic',
  mode: 'comment',
  title: '书友讨论',
  accentColor: '#c41e3a',
  placeholder: '各抒己见，友善交流…',
}

onLoad((q) => {
  if (q && q.id) bookId.value = String(q.id)
  isInBookshelf.value = book.value.isInBookshelf
})

function toggleChapter(id: string) {
  const next = new Set(expandedChapters.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expandedChapters.value = next
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
function onShare() {
  uni.showToast({ title: '分享', icon: 'none' })
}
function toReader(_chapter?: string) {
  uni.showToast({ title: '阅读器即将上线', icon: 'none' })
}
function toBook(id: string) {
  bookId.value = id
  isInBookshelf.value = book.value.isInBookshelf
  showAllChapters.value = false
  expandedChapters.value = new Set()
  uni.pageScrollTo({ scrollTop: 0, duration: 0 })
}
</script>

<style scoped>
.cd-page {
  min-height: 100vh;
  background: var(--classics-bg);
  padding-bottom: 180rpx;
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
  color: #c41e3a;
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
  color: #c41e3a;
  border-top: 2rpx solid var(--border);
}
.cd-disc {
  overflow: hidden;
}
.cd-disc-preview {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 32rpx;
}
.cd-disc-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 500;
  font-size: 28rpx;
  flex-shrink: 0;
}
.cd-disc-body {
  flex: 1;
  min-width: 0;
}
.cd-disc-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: var(--foreground);
}
.cd-disc-content {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 26rpx;
  color: var(--foreground);
  line-height: 1.6;
  margin-top: 4rpx;
}
.cd-disc-like {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
}
.cd-disc-like-text {
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.cd-disc-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx 0;
  border-top: 2rpx solid var(--border);
  font-size: 28rpx;
  font-weight: 500;
  color: #c41e3a;
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
  background: #c41e3a;
  box-shadow: 0 2rpx 12rpx rgba(196, 30, 58, 0.2);
}
.cd-read-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}
</style>
