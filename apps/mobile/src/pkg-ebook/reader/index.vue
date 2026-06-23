<template>
  <view
    class="reader"
    :style="{ background: cfg.bg }"
  >
    <!-- 顶栏 -->
    <view
      class="r-topbar"
      :class="{ 'r-bar--hidden-top': !showControls }"
      :style="{ background: theme === 'dark' ? 'rgba(36,34,32,0.95)' : 'rgba(255,255,255,0.95)', borderColor: cfg.border }"
    >
      <view
        class="r-topbar-inner"
        :style="{ paddingTop: statusBarHeight + 'px' }"
      >
        <view
          class="r-icon-btn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            :color="cfg.text"
          />
        </view>
        <text
          class="r-title"
          :style="{ color: cfg.text }"
        >
          {{ chapter.title }}
        </text>
        <view class="r-top-actions">
          <view
            class="r-icon-btn"
            @tap="toggleBookmark"
          >
            <app-icon
              :name="isBookmarked ? 'bookmark-check' : 'bookmark'"
              :size="38"
              :color="isBookmarked ? '#2563eb' : cfg.text"
            />
          </view>
          <view
            class="r-icon-btn r-icon-btn--dot"
            @tap="openComments"
          >
            <app-icon
              name="message-circle"
              :size="38"
              :color="cfg.text"
            />
            <view class="r-dot" />
          </view>
          <view
            class="r-icon-btn"
            @tap="onDownload"
          >
            <app-icon
              name="download"
              :size="38"
              :color="cfg.text"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 正文 -->
    <scroll-view
      scroll-y
      class="r-scroll"
      @tap="toggleControls"
    >
      <view class="r-content">
        <text
          class="r-chapter-title"
          :style="{ color: cfg.text }"
        >
          {{ chapter.title }}
        </text>
        <text
          class="r-body"
          :style="{ color: cfg.text, fontSize: fontSize + 'px', lineHeight: lineHeight }"
        >
          {{ chapter.content }}
        </text>
        <!-- 章节切换 -->
        <view
          class="r-chapter-nav"
          :style="{ borderColor: cfg.border }"
        >
          <view
            class="r-nav-btn"
            :class="{ 'r-nav-btn--disabled': chapter.currentChapter <= 1 }"
            :style="{ borderColor: cfg.border, color: cfg.text }"
          >
            <app-icon
              name="chevron-left"
              :size="32"
              :color="cfg.text"
            />
            <text :style="{ color: cfg.text }">
              上一章
            </text>
          </view>
          <text
            class="r-nav-count"
            :style="{ color: cfg.secondary }"
          >
            {{ chapter.currentChapter }} / {{ chapter.totalChapters }}
          </text>
          <view
            class="r-nav-btn r-nav-btn--primary"
            @tap="openFinish"
          >
            <text class="r-nav-btn-primary-text">
              下一章
            </text>
            <app-icon
              name="chevron-right"
              :size="32"
              color="#ffffff"
            />
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底栏 -->
    <view
      class="r-bottombar"
      :class="{ 'r-bar--hidden-bottom': !showControls }"
      :style="{ background: theme === 'dark' ? 'rgba(36,34,32,0.95)' : 'rgba(255,255,255,0.95)', borderColor: cfg.border }"
    >
      <!-- 进度 -->
      <view class="r-progress-row">
        <text
          class="r-progress-pct"
          :style="{ color: cfg.secondary }"
        >
          {{ progressPct }}%
        </text>
        <view
          class="r-slider"
          @tap="onTrackTap"
        >
          <view
            class="r-slider-track"
            :style="{ background: cfg.border }"
          >
            <view
              class="r-slider-filled"
              :style="{ width: progressPct + '%' }"
            />
            <view
              class="r-slider-thumb"
              :style="{ left: progressPct + '%' }"
            />
          </view>
        </view>
        <text
          class="r-progress-chap"
          :style="{ color: cfg.secondary }"
        >
          {{ chapter.currentChapter }}/{{ chapter.totalChapters }}章
        </text>
      </view>
      <!-- 工具 -->
      <view
        class="r-tools"
        :style="{ paddingBottom: safeBottom + 'px' }"
      >
        <view
          class="r-tool"
          @tap="openMenu"
        >
          <app-icon
            name="list"
            :size="40"
            :color="cfg.secondary"
          />
          <text
            class="r-tool-label"
            :style="{ color: cfg.secondary }"
          >
            目录
          </text>
        </view>
        <view
          class="r-tool"
          @tap="openSettings"
        >
          <app-icon
            name="settings"
            :size="40"
            :color="cfg.secondary"
          />
          <text
            class="r-tool-label"
            :style="{ color: cfg.secondary }"
          >
            设置
          </text>
        </view>
        <view
          class="r-tool"
          @tap="onSelectAction"
        >
          <app-icon
            name="highlighter"
            :size="40"
            :color="cfg.secondary"
          />
          <text
            class="r-tool-label"
            :style="{ color: cfg.secondary }"
          >
            划线
          </text>
        </view>
        <view
          class="r-tool"
          @tap="onSelectAction"
        >
          <app-icon
            name="message-square"
            :size="40"
            :color="cfg.secondary"
          />
          <text
            class="r-tool-label"
            :style="{ color: cfg.secondary }"
          >
            笔记
          </text>
        </view>
        <view
          class="r-tool"
          @tap="onShare"
        >
          <app-icon
            name="share-2"
            :size="40"
            :color="cfg.secondary"
          />
          <text
            class="r-tool-label"
            :style="{ color: cfg.secondary }"
          >
            分享
          </text>
        </view>
      </view>
    </view>

    <!-- 目录抽屉 -->
    <view
      v-if="showMenu"
      class="r-mask"
      @tap="closeAll"
    />
    <view
      v-if="showMenu"
      class="r-drawer"
      :style="{ background: theme === 'dark' ? '#1a1815' : '#ffffff' }"
    >
      <view
        class="r-drawer-head"
        :style="{ paddingTop: statusBarHeight + 'px', borderColor: cfg.border }"
      >
        <text
          class="r-drawer-title"
          :style="{ color: cfg.text }"
        >
          目录
        </text>
        <view
          class="r-icon-btn"
          @tap="closeAll"
        >
          <app-icon
            name="x"
            :size="36"
            :color="cfg.text"
          />
        </view>
      </view>
      <scroll-view
        scroll-y
        class="r-drawer-list"
      >
        <view
          v-for="ch in chapters"
          :key="ch.id"
          class="r-chap-item"
          :style="chapItemStyle(ch)"
          @tap="selectChapter(ch)"
        >
          <text :style="{ color: ch.current ? '#2563eb' : cfg.text, fontWeight: ch.current ? '600' : '400' }">
            {{ ch.title }}
          </text>
        </view>
      </scroll-view>
    </view>

    <!-- 设置面板 -->
    <view
      v-if="showSettings"
      class="r-mask"
      @tap="closeAll"
    />
    <view
      v-if="showSettings"
      class="r-sheet"
      :style="{ background: theme === 'dark' ? '#1a1815' : '#ffffff' }"
    >
      <view class="r-sheet-handle" />
      <view
        class="r-sheet-body"
        :style="{ paddingBottom: safeBottom + 'px' }"
      >
        <!-- 字号 -->
        <text
          class="r-sheet-label"
          :style="{ color: cfg.secondary }"
        >
          字号
        </text>
        <view class="r-fontsize-row">
          <view
            class="r-circle-btn"
            :style="{ background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }"
            @tap="decFont"
          >
            <app-icon
              name="minus"
              :size="36"
              :color="cfg.text"
            />
          </view>
          <text
            class="r-fontsize-val"
            :style="{ color: cfg.text }"
          >
            {{ fontSize }}px
          </text>
          <view
            class="r-circle-btn"
            :style="{ background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }"
            @tap="incFont"
          >
            <app-icon
              name="plus"
              :size="36"
              :color="cfg.text"
            />
          </view>
        </view>
        <!-- 行距 -->
        <text
          class="r-sheet-label"
          :style="{ color: cfg.secondary }"
        >
          行距
        </text>
        <view class="r-lh-row">
          <view
            v-for="lh in lineHeights"
            :key="lh.value"
            class="r-lh-btn"
            :style="lhBtnStyle(lh.value)"
            @tap="lineHeight = lh.value"
          >
            <text :style="{ color: lineHeight === lh.value ? '#ffffff' : theme === 'dark' ? '#d1d5db' : '#4b5563' }">
              {{ lh.label }}
            </text>
          </view>
        </view>
        <!-- 主题 -->
        <text
          class="r-sheet-label"
          :style="{ color: cfg.secondary }"
        >
          主题
        </text>
        <view class="r-theme-row">
          <view
            v-for="t in themeOptions"
            :key="t.id"
            class="r-theme-btn"
            :style="{ background: t.bg, borderColor: theme === t.id ? '#2563eb' : 'transparent' }"
            @tap="theme = t.id"
          >
            <app-icon
              :name="t.icon"
              :size="32"
              :color="t.iconColor"
            />
            <text
              class="r-theme-label"
              :style="{ color: t.textColor }"
            >
              {{ t.label }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 读完弹窗 -->
    <view
      v-if="showFinish"
      class="r-mask r-mask--center"
      @tap="closeAll"
    >
      <view
        class="r-modal"
        :style="{ background: theme === 'dark' ? '#242220' : '#ffffff' }"
        @tap.stop
      >
        <view class="r-modal-icon">
          <app-icon
            name="check-circle"
            :size="64"
            color="#2563eb"
          />
        </view>
        <text
          class="r-modal-title"
          :style="{ color: cfg.text }"
        >
          恭喜读完本章！
        </text>
        <text
          class="r-modal-desc"
          :style="{ color: cfg.secondary }"
        >
          继续阅读下一章，开启新的知识之旅
        </text>
        <view class="r-modal-actions">
          <view
            class="r-modal-btn r-modal-btn--outline"
            :style="{ borderColor: cfg.border, color: cfg.text }"
            @tap="closeAll"
          >
            <text :style="{ color: cfg.text }">
              稍后再说
            </text>
          </view>
          <view
            class="r-modal-btn r-modal-btn--primary"
            @tap="closeAll"
          >
            <app-icon
              name="share-2"
              :size="30"
              color="#ffffff"
            />
            <text class="r-modal-btn-primary-text">
              分享心得
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 章节讨论（复用母版） -->
    <discussion-sheet
      :open="showComments"
      :config="discussionConfig"
      :items="discussions"
      @close="showComments = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import DiscussionSheet from '@/components/common/discussion-sheet.vue'
import {
  ebookApi,
  ebookReaderThemes,
  type EbookReaderChapter,
} from '@/lib/ebook-data'
import type { DiscussionConfig, DiscussionItemType } from '@/lib/discussion-types'

/** 阅读器章节完整数据的类型（匹配 ebookReaderChapter 结构） */
interface ReaderChapterData {
  id: string
  bookId: string
  title: string
  totalChapters: number
  currentChapter: number
  content: string
}

type Theme = 'light' | 'sepia' | 'dark'

const sys = uni.getSystemInfoSync()
const statusBarHeight = sys.statusBarHeight || 20
const safeBottom = (sys.safeAreaInsets?.bottom ?? 0)

const chapter = ref<ReaderChapterData>({
  id: '', bookId: '', title: '', totalChapters: 0, currentChapter: 0, content: '',
})
const chapters = ref<EbookReaderChapter[]>([])
const discussions = ref<DiscussionItemType[]>([])

onMounted(async () => {
  const [ch, chs, dcs] = await Promise.all([
    ebookApi.getReaderChapter('1'),
    ebookApi.getReaderChapters('1'),
    ebookApi.getDiscussions('1'),
  ])
  chapter.value = ch
  chapters.value = chs
  discussions.value = dcs
})

const showControls = ref(true)
const showMenu = ref(false)
const showSettings = ref(false)
const showFinish = ref(false)
const showComments = ref(false)
const theme = ref<Theme>('light')
const fontSize = ref(18)
const lineHeight = ref(1.8)
const isBookmarked = ref(false)
const progressPct = ref(15)

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
  scene: 'classic',
  mode: 'comment',
  title: chapter.value.title,
  accentColor: '#2563eb',
  placeholder: '分享你对本章的理解…',
}))

function toggleControls() {
  showControls.value = !showControls.value
}
function closeAll() {
  showMenu.value = false
  showSettings.value = false
  showFinish.value = false
}
function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/ebook/index' }) })
}
function toggleBookmark() {
  isBookmarked.value = !isBookmarked.value
  uni.showToast({ title: isBookmarked.value ? '已添加书签' : '已取消书签', icon: 'none' })
}
function openMenu() {
  closeAll()
  showMenu.value = true
}
function openSettings() {
  closeAll()
  showSettings.value = true
}
function openFinish() {
  closeAll()
  showFinish.value = true
}
function openComments() {
  closeAll()
  showComments.value = true
}
function onDownload() {
  uni.showToast({ title: '已缓存到本地', icon: 'none' })
}
function onSelectAction() {
  uni.showToast({ title: '请先在正文中选择文字', icon: 'none' })
}
function onShare() {
  uni.showToast({ title: '分享功能即将上线', icon: 'none' })
}
function decFont() {
  fontSize.value = Math.max(14, fontSize.value - 2)
}
function incFont() {
  fontSize.value = Math.min(28, fontSize.value + 2)
}
function selectChapter(ch: { id: string; title: string }) {
  closeAll()
  uni.showToast({ title: `跳转：${ch.title}`, icon: 'none' })
}
function onTrackTap() {
  // 进度条静态展示，点击不改变（与原型一致：原型为只读展示）
}
function chapItemStyle(ch: { current: boolean }) {
  if (ch.current) {
    return { background: 'rgba(37,99,235,0.08)' }
  }
  return {}
}
function lhBtnStyle(value: number) {
  if (lineHeight.value === value) {
    return { background: '#2563eb' }
  }
  return { background: theme.value === 'dark' ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }
}
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
.r-body {
  display: block;
  font-family: 'Noto Serif SC', serif;
  white-space: pre-line;
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

/* 设置面板 */
.r-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 51;
  border-radius: 32rpx 32rpx 0 0;
}
.r-sheet-handle {
  width: 96rpx;
  height: 8rpx;
  background: #d1d5db;
  border-radius: 999rpx;
  margin: 24rpx auto 0;
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
