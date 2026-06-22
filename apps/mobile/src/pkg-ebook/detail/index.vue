<template>
  <view v-if="isLoading" class="ed-page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="80rpx" radius="16rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="60rpx" radius="16rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="300rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="180rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无书籍信息" />
  <view v-else class="ed-page">
    <!-- 顶部导航 毛玻璃 -->
    <view class="ed-header">
      <view class="ed-bar">
        <view
          class="ed-iconbtn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#1e293b"
          />
        </view>
        <text class="ed-header-title">
          书籍详情
        </text>
        <view
          class="ed-iconbtn"
          @tap="onShare"
        >
          <app-icon
            name="share-2"
            :size="40"
            color="#1e293b"
          />
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="ed-main"
    >
      <!-- Hero -->
      <view class="ed-hero">
        <view class="ed-hero-top">
          <flat-book-cover
            class="ed-hero-cover"
            :color="coverFromHex"
            :gradient-to="coverToHex"
            :title="book.title"
            :author="book.author"
            title-size="30rpx"
          />
          <view class="ed-hero-info">
            <text class="ed-hero-title">
              {{ book.title }}
            </text>
            <text class="ed-hero-sub">
              {{ book.subtitle }}
            </text>
            <view class="ed-hero-author">
              <view class="ed-author-dot">
                {{ book.author.charAt(0) }}
              </view>
              <text class="ed-author-name">
                {{ book.author }}
              </text>
            </view>
            <view class="ed-hero-rate">
              <app-icon
                name="star"
                :size="32"
                color="#fbbf24"
                :fill="true"
              />
              <text class="ed-rate-num">
                {{ book.rating }}
              </text>
              <text class="ed-rate-cnt">
                {{ book.reviewCount }}条评价
              </text>
            </view>
          </view>
        </view>

        <!-- 数据条 -->
        <view class="ed-stats">
          <view
            v-for="(s, i) in stats"
            :key="s.l"
            class="ed-stat"
          >
            <view
              v-if="i > 0"
              class="ed-stat-div"
            />
            <view class="ed-stat-box">
              <text class="ed-stat-v">
                {{ s.v }}
              </text>
              <text class="ed-stat-l">
                {{ s.l }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 简介 -->
      <view class="ed-section">
        <text class="ed-sec-title">
          书籍简介
        </text>
        <view class="ed-card ed-desc-card">
          <text
            class="ed-desc"
            :class="{ 'ed-desc-clamp': !descExpanded }"
          >
            {{ book.description }}
          </text>
          <view
            class="ed-desc-toggle"
            @tap="descExpanded = !descExpanded"
          >
            <text class="ed-desc-toggle-txt">
              {{ descExpanded ? '收起' : '展开全部' }}
            </text>
            <app-icon
              name="chevron-right"
              :size="28"
              color="#2563eb"
              :class="{ 'ed-rot': descExpanded }"
            />
          </view>
        </view>
      </view>

      <!-- 作者 -->
      <view class="ed-section">
        <view class="ed-card ed-author-card">
          <view class="ed-author-avatar">
            {{ book.author.charAt(0) }}
          </view>
          <view class="ed-author-meta">
            <text class="ed-author-meta-name">
              {{ book.author }}
            </text>
            <text class="ed-author-meta-title">
              {{ book.authorTitle }}
            </text>
          </view>
          <view class="ed-author-follow">
            <text class="ed-author-follow-txt">
              关注
            </text>
          </view>
        </view>
      </view>

      <!-- 目录 -->
      <view class="ed-section">
        <text class="ed-sec-title">
          目录 · {{ book.chapters.length }}章
        </text>
        <view class="ed-card ed-toc">
          <view
            v-for="(ch, index) in book.chapters"
            :key="ch.id"
            class="ed-toc-item"
            :class="{ 'ed-toc-locked': !(ch.isFree || book.isPurchased) }"
            @tap="goChapter(ch)"
          >
            <view class="ed-toc-left">
              <text class="ed-toc-idx">
                {{ index + 1 }}
              </text>
              <text class="ed-toc-title">
                {{ ch.title }}
              </text>
            </view>
            <view class="ed-toc-right">
              <text
                v-if="ch.isFree"
                class="ed-toc-tag"
              >
                试读
              </text>
              <app-icon
                v-else-if="!book.isPurchased"
                name="lock"
                :size="28"
                color="#64748b"
              />
              <text class="ed-toc-pages">
                {{ ch.pageCount }}页
              </text>
            </view>
          </view>
        </view>
        <text
          v-if="!book.isPurchased"
          class="ed-toc-hint"
        >
          购买后可阅读全部 {{ book.chapters.length }} 章
        </text>
      </view>

      <!-- 书友讨论 -->
      <view class="ed-section">
        <view class="ed-disc-head">
          <text class="ed-sec-title ed-sec-title-inline">
            书友讨论
          </text>
          <text class="ed-disc-cnt">
            {{ commentCount }} 条
          </text>
        </view>
        <view
          class="ed-card ed-disc"
          @tap="showComments = true"
        >
          <view class="ed-disc-top">
            <view class="ed-disc-avatar">
              {{ firstDiscussion.author.name.charAt(0) }}
            </view>
            <view class="ed-disc-body">
              <text class="ed-disc-name">
                {{ firstDiscussion.author.name }}
              </text>
              <text class="ed-disc-content">
                {{ firstDiscussion.content }}
              </text>
              <view class="ed-disc-like">
                <app-icon
                  name="heart"
                  :size="28"
                  color="#64748b"
                />
                <text class="ed-disc-like-txt">
                  {{ firstDiscussion.likeCount }}
                </text>
              </view>
            </view>
          </view>
          <view class="ed-disc-all">
            <app-icon
              name="message-square"
              :size="32"
              color="#2563eb"
            />
            <text class="ed-disc-all-txt">
              查看全部 {{ commentCount }} 条讨论
            </text>
          </view>
        </view>
      </view>

      <!-- 相关推荐 -->
      <view class="ed-section">
        <text class="ed-sec-title">
          相关推荐
        </text>
        <scroll-view
          scroll-x
          class="ed-related"
          :show-scrollbar="false"
        >
          <view class="ed-related-row">
            <view
              v-for="rb in book.relatedBooks"
              :key="rb.id"
              class="ed-related-item"
              @tap="goDetail(rb.id)"
            >
              <flat-book-cover
                class="ed-related-cover"
                :color="hexFrom(rb.coverColor)"
                :gradient-to="hexTo(rb.coverColor)"
                :title="rb.title"
                :author="rb.author"
                title-size="26rpx"
              />
              <text class="ed-related-name">
                {{ rb.title }}
              </text>
              <text class="ed-related-price">
                ¥{{ rb.price }}
              </text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 平台标识 -->
      <view class="ed-platform">
        <app-icon
          name="file-text"
          :size="32"
          color="#2563eb"
        />
        <text class="ed-platform-txt">
          本书由平台官方提供，内容经专业审核
        </text>
      </view>
      <view class="ed-bottom-space" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="ed-actionbar">
      <view
        class="ed-act-icon"
        @tap="isFavorite = !isFavorite"
      >
        <app-icon
          name="heart"
          :size="40"
          :color="isFavorite ? '#ef4444' : '#64748b'"
          :fill="isFavorite"
        />
        <text class="ed-act-icon-txt">
          收藏
        </text>
      </view>
      <view
        class="ed-act-icon"
        @tap="showComments = true"
      >
        <app-icon
          name="message-square"
          :size="40"
          color="#64748b"
        />
        <text class="ed-act-icon-txt">
          评论
        </text>
      </view>
      <view class="ed-act-main">
        <template v-if="book.isPurchased">
          <view
            class="ed-btn ed-btn-primary"
            @tap="goReader()"
          >
            <app-icon
              name="book-open"
              :size="32"
              color="#ffffff"
            />
            <text class="ed-btn-txt-light">
              继续阅读
            </text>
          </view>
        </template>
        <template v-else>
          <view
            v-if="book.hasPreview"
            class="ed-btn ed-btn-outline"
            @tap="goReader(true)"
          >
            <app-icon
              name="play"
              :size="32"
              color="#2563eb"
            />
            <text class="ed-btn-txt-primary">
              试读
            </text>
          </view>
          <view
            v-if="book.isMemberFree"
            class="ed-btn ed-btn-member"
            @tap="goCheckout('member')"
          >
            <app-icon
              name="crown"
              :size="32"
              color="#ffffff"
            />
            <text class="ed-btn-txt-light">
              会员免费领取
            </text>
          </view>
          <view
            v-else-if="book.isFree"
            class="ed-btn ed-btn-free"
            @tap="goReader()"
          >
            <app-icon
              name="book-open"
              :size="32"
              color="#ffffff"
            />
            <text class="ed-btn-txt-light">
              免费阅读
            </text>
          </view>
          <view
            v-else
            class="ed-btn ed-btn-primary"
            @tap="goCheckout()"
          >
            <text class="ed-btn-txt-light">
              ¥{{ book.price }} 立即购买
            </text>
          </view>
        </template>
      </view>
    </view>

    <!-- 书友讨论抽屉 -->
    <discussion-sheet
      :open="showComments"
      :config="discussionConfig"
      :items="ebookDiscussions"
      :enable-a-i-assist="true"
      @close="showComments = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import FlatBookCover from '@/components/ebook/flat-book-cover.vue'
import DiscussionSheet from '@/components/common/discussion-sheet.vue'
import type { DiscussionConfig } from '@/lib/discussion-types'
import {
  ebookDetailData,
  ebookDiscussions,
  ebookColorFromHex,
  EBOOK_COVER,
  type EbookChapter,
} from '@/lib/ebook-data'

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const isEmpty = computed(() => false)
function reload() {
  loadError.value = null
}

const book = ebookDetailData
const isFavorite = ref(false)
const showComments = ref(false)
const descExpanded = ref(false)

const firstDiscussion = ebookDiscussions[0]
const commentCount = ebookDiscussions.reduce((n, c) => n + 1 + c.replies.length, 0)

const coverFromHex = computed(() => EBOOK_COVER[ebookColorFromHex(book.coverColor)].from)
const coverToHex = computed(() => EBOOK_COVER[ebookColorFromHex(book.coverColor)].to)
function hexFrom(hex: string) {
  return EBOOK_COVER[ebookColorFromHex(hex)].from
}
function hexTo(hex: string) {
  return EBOOK_COVER[ebookColorFromHex(hex)].to
}

const stats = [
  { v: `${(book.wordCount / 10000).toFixed(1)}万`, l: '字数' },
  { v: String(book.pageCount), l: '页数' },
  { v: `${(book.salesCount / 1000).toFixed(1)}k`, l: '已购' },
  { v: String(book.chapters.length), l: '章节' },
]

const discussionConfig: DiscussionConfig = {
  scene: 'classic',
  mode: 'comment',
  title: '书友讨论',
  accentColor: '#2563eb',
  placeholder: '分享你的读书心得…',
}

onLoad(() => {})

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
function onShare() {
  uni.showToast({ title: '分享功能即将上线', icon: 'none' })
}
function goChapter(ch: EbookChapter) {
  const canRead = ch.isFree || book.isPurchased
  if (canRead) {
    uni.navigateTo({ url: `/pkg-ebook/reader/index?id=${book.id}&chapter=${ch.id}` })
  } else {
    goCheckout()
  }
}
function goReader(preview = false) {
  const q = preview ? '&preview=true' : ''
  uni.navigateTo({ url: `/pkg-ebook/reader/index?id=${book.id}${q}` })
}
function goCheckout(type?: string) {
  const q = type ? `&type=${type}` : ''
  uni.navigateTo({ url: `/pkg-ebook/checkout/index?id=${book.id}${q}` })
}
function goDetail(id: string) {
  uni.navigateTo({ url: `/pkg-ebook/detail/index?id=${id}` })
}
</script>

<style scoped>
.ed-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ebook-bg);
}
.ed-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(248, 250, 252, 0.85);
  backdrop-filter: blur(20rpx);
}
.ed-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.ed-iconbtn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 9999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ed-header-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--ebook-text);
}
.ed-main {
  flex: 1;
  padding: 0 40rpx;
}
.ed-hero {
  padding: 32rpx 0 48rpx;
}
.ed-hero-top {
  display: flex;
  gap: 40rpx;
}
.ed-hero-cover {
  width: 224rpx;
  height: 298rpx;
  flex-shrink: 0;
}
.ed-hero-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ed-hero-title {
  font-weight: 700;
  font-size: 40rpx;
  line-height: 1.3;
  color: var(--ebook-text);
}
.ed-hero-sub {
  font-size: 26rpx;
  color: var(--ebook-text-soft);
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ed-hero-author {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 20rpx;
}
.ed-author-dot {
  width: 40rpx;
  height: 40rpx;
  border-radius: 9999rpx;
  background: #2563eb;
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ed-author-name {
  font-size: 26rpx;
  color: var(--ebook-text-soft);
}
.ed-hero-rate {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
}
.ed-rate-num {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ebook-text);
}
.ed-rate-cnt {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.ed-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-top: 40rpx;
  padding: 28rpx 0;
  background: var(--ebook-card);
  border-radius: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}
.ed-stat {
  display: flex;
  align-items: center;
}
.ed-stat-div {
  width: 1rpx;
  height: 56rpx;
  background: rgba(0, 0, 0, 0.05);
  margin-right: 32rpx;
}
.ed-stat-box {
  text-align: center;
  display: flex;
  flex-direction: column;
  padding-right: 32rpx;
}
.ed-stat-v {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--ebook-text);
}
.ed-stat-l {
  font-size: 22rpx;
  color: var(--ebook-text-soft);
  margin-top: 4rpx;
}
.ed-section {
  padding-bottom: 48rpx;
}
.ed-sec-title {
  font-size: 36rpx;
  font-weight: 700;
  letter-spacing: -0.5rpx;
  color: var(--ebook-text);
  margin-bottom: 24rpx;
  display: block;
}
.ed-sec-title-inline {
  margin-bottom: 0;
}
.ed-card {
  border-radius: 32rpx;
  background: var(--ebook-card);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}
.ed-desc-card {
  padding: 32rpx;
}
.ed-desc {
  font-size: 28rpx;
  color: var(--ebook-text-soft);
  line-height: 1.7;
  white-space: pre-line;
}
.ed-desc-clamp {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}
.ed-desc-toggle {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 16rpx;
}
.ed-desc-toggle-txt {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--ebook-primary);
}
.ed-rot {
  transform: rotate(90deg);
}
.ed-author-card {
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.ed-author-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #3b6fd4, #27488f);
  color: #ffffff;
  font-size: 40rpx;
  font-weight: 700;
  font-family: var(--font-serif), serif;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ed-author-meta {
  flex: 1;
  min-width: 0;
}
.ed-author-meta-name {
  font-weight: 600;
  font-size: 30rpx;
  color: var(--ebook-text);
  display: block;
}
.ed-author-meta-title {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
  margin-top: 4rpx;
  display: block;
}
.ed-author-follow {
  flex-shrink: 0;
  background: var(--ebook-primary-soft);
  border-radius: 9999rpx;
  padding: 12rpx 32rpx;
}
.ed-author-follow-txt {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--ebook-primary);
}
.ed-toc {
  overflow: hidden;
}
.ed-toc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}
.ed-toc-item:last-child {
  border-bottom: none;
}
.ed-toc-locked {
  opacity: 0.55;
}
.ed-toc-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
  min-width: 0;
}
.ed-toc-idx {
  width: 48rpx;
  font-size: 26rpx;
  color: var(--ebook-text-soft);
  font-weight: 500;
  flex-shrink: 0;
}
.ed-toc-title {
  font-size: 28rpx;
  color: var(--ebook-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ed-toc-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}
.ed-toc-tag {
  font-size: 20rpx;
  color: var(--ebook-free);
  background: rgba(22, 163, 74, 0.12);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.ed-toc-pages {
  font-size: 22rpx;
  color: var(--ebook-text-soft);
}
.ed-toc-hint {
  text-align: center;
  font-size: 24rpx;
  color: var(--ebook-text-soft);
  margin-top: 24rpx;
  display: block;
}
.ed-disc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.ed-disc-cnt {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.ed-disc {
  overflow: hidden;
}
.ed-disc-top {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 32rpx;
}
.ed-disc-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 9999rpx;
  background: #a06a38;
  color: #ffffff;
  font-weight: 500;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ed-disc-body {
  flex: 1;
  min-width: 0;
}
.ed-disc-name {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--ebook-text);
  display: block;
}
.ed-disc-content {
  font-size: 26rpx;
  color: rgba(30, 41, 59, 0.8);
  line-height: 1.6;
  margin-top: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.ed-disc-like {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
}
.ed-disc-like-txt {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.ed-disc-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.04);
}
.ed-disc-all-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--ebook-primary);
}
.ed-related {
  margin: 0 -40rpx;
  white-space: nowrap;
}
.ed-related-row {
  display: inline-flex;
  gap: 32rpx;
  padding: 0 40rpx 8rpx;
}
.ed-related-item {
  flex-shrink: 0;
  width: 192rpx;
  display: flex;
  flex-direction: column;
}
.ed-related-cover {
  width: 192rpx;
  height: 256rpx;
  margin-bottom: 16rpx;
}
.ed-related-name {
  font-size: 24rpx;
  font-weight: 500;
  color: var(--ebook-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ed-related-price {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--ebook-price);
  margin-top: 4rpx;
}
.ed-platform {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-bottom: 16rpx;
}
.ed-platform-txt {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.ed-bottom-space {
  height: 40rpx;
}
.ed-actionbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(248, 250, 252, 0.92);
  backdrop-filter: blur(20rpx);
  border-top: 1rpx solid rgba(0, 0, 0, 0.06);
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
}
.ed-act-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 0 12rpx;
}
.ed-act-icon-txt {
  font-size: 20rpx;
  color: var(--ebook-text-soft);
}
.ed-act-main {
  flex: 1;
  display: flex;
  gap: 16rpx;
  margin-left: 8rpx;
}
.ed-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 9999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.ed-btn-primary {
  background: #2563eb;
}
.ed-btn-member {
  background: var(--ebook-member);
}
.ed-btn-free {
  background: var(--ebook-free);
}
.ed-btn-outline {
  background: transparent;
  border: 1rpx solid var(--ebook-primary);
}
.ed-btn-txt-light {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}
.ed-btn-txt-primary {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--ebook-primary);
}
</style>
