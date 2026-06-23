<script setup lang="ts">
/**
 * 文章详情页（从原型 app/articles/[id]/page.tsx 1:1 高保真迁移，A级）
 * 结构：导航 + 封面 + 标题/标签/作者(关注)/元信息 + AI摘要 + 音频播放器 +
 *       正文块渲染(text/heading/quote/list/image/5种内联推荐卡) +
 *       作者其他文章 + 猜你喜欢 + 评论区(楼中楼) + 底部圈子引流 + 底部互动栏
 * 音频经 uni.createInnerAudioContext 跨端适配。
 */
import { ref, reactive, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import {
  articleApi,
  type ArticleData,
  type ContentBlock, type ArticleComment,
} from '@/lib/article-data'

const articleId = ref('1')
const article = reactive<ArticleData>({} as ArticleData)
const comments = reactive<ArticleComment[]>([])

// 互动状态
const isFollowed = ref(false)
const isLiked = ref(false)
const isCollected = ref(false)
const likeCount = ref(0)
const collectCount = ref(0)
const joinedCircle = ref(false)

// 加载状态
const isLoading = ref(true)

// AI 摘要展开
const summaryExpanded = ref(false)

// 评论展开
const expandedReplies = reactive<Record<string, boolean>>({})
const commentText = ref('')
const replyTo = ref<ArticleComment | null>(null)

// 音频
const isPlaying = ref(false)
const progress = ref(0)
const duration = ref(0)
let audioCtx: any = null

const showJoinGuide = computed(() => !joinedCircle.value)

onLoad(async (q) => {
  if (q && q.id) articleId.value = String(q.id)
  try {
    const [a, c] = await Promise.all([
      articleApi.getDetail(articleId.value),
      articleApi.getComments(articleId.value),
    ])
    Object.assign(article, a)
    comments.splice(0, comments.length, ...c)
    isFollowed.value = a.author.isFollowed
    isLiked.value = a.isLiked
    isCollected.value = a.isCollected
    likeCount.value = a.likes
    collectCount.value = a.collects
    joinedCircle.value = a.sourceCircle.isJoined
  } catch { /* 使用空数据 */ }
  } finally {
    isLoading.value = false
  }
})

function toggleFollow() {
  isFollowed.value = !isFollowed.value
}
function toggleLike() {
  isLiked.value = !isLiked.value
  likeCount.value += isLiked.value ? 1 : -1
}
function toggleCollect() {
  isCollected.value = !isCollected.value
  collectCount.value += isCollected.value ? 1 : -1
}
function toggleCommentLike(c: ArticleComment) {
  c.isLiked = !c.isLiked
  c.likes += c.isLiked ? 1 : -1
}
function toggleReplies(id: string) {
  expandedReplies[id] = !expandedReplies[id]
}
function joinCircle() {
  joinedCircle.value = true
}

// 音频播放
function togglePlay() {
  if (!article.audioUrl) return
  if (!audioCtx) {
    audioCtx = uni.createInnerAudioContext()
    audioCtx.src = article.audioUrl
    audioCtx.onTimeUpdate(() => {
      progress.value = audioCtx.currentTime
      duration.value = audioCtx.duration
    })
    audioCtx.onEnded(() => { isPlaying.value = false; progress.value = 0 })
  }
  if (isPlaying.value) audioCtx.pause()
  else audioCtx.play()
  isPlaying.value = !isPlaying.value
}
function fmtTime(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
onUnmounted(() => { if (audioCtx) { audioCtx.destroy() } })

// 嵌入卡内部状态（圈子加入）
const embedCircleJoined = reactive<Record<number, boolean>>({})
function toggleEmbedCircle(i: number, init: boolean) {
  embedCircleJoined[i] = !(embedCircleJoined[i] ?? init)
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view
        class="nav-btn"
        @tap="goBack"
      >
        <AppIcon
          name="arrow-left"
          :size="20"
          color="#2C2C2C"
        />
      </view>
      <text class="nav-title">
        文章详情
      </text>
      <view class="nav-right">
        <view
          class="nav-btn"
          @tap="toastComingSoon"
        >
          <AppIcon
            name="share-2"
            :size="20"
            color="#2C2C2C"
          />
        </view>
        <view
          class="nav-btn"
          @tap="toastComingSoon"
        >
          <AppIcon
            name="more-horizontal"
            :size="20"
            color="#2C2C2C"
          />
        </view>
      </view>
    </view>

    <view
      v-if="isLoading"
      class="scroll"
      style="display:flex;align-items:center;justify-content:center;"
    >
      <text style="color:#999;font-size:28rpx;">
        加载中…
      </text>
    </view>
    <scroll-view
      v-else
      scroll-y
      class="scroll"
      :style="{ paddingBottom: showJoinGuide ? '264rpx' : '144rpx' }"
    >
      <!-- 封面图 -->
      <view
        v-if="article.cover"
        class="cover-wrap"
      >
        <view
          class="cover"
          :class="article.coverRatio === '3:4' ? 'cover-34' : 'cover-169'"
        >
          <image
            class="cover-img"
            :src="article.cover"
            mode="aspectFill"
          />
        </view>
      </view>

      <!-- 内容卡片 -->
      <view
        class="content-card"
        :class="{ 'has-cover': article.cover }"
      >
        <!-- 标题 + 标签 + 作者 -->
        <view class="head">
          <text class="title">
            {{ article.title }}
          </text>

          <view
            v-if="article.tags.length"
            class="tags"
          >
            <view
              v-for="tag in article.tags"
              :key="tag"
              class="tag"
              @tap="toastComingSoon"
            >
              <text class="tag-text">
                #{{ tag }}
              </text>
            </view>
          </view>

          <view class="author-row">
            <view
              class="author-info"
              @tap="toastComingSoon"
            >
              <image
                class="author-avatar"
                :src="article.author.avatar"
                mode="aspectFill"
              />
              <view class="author-meta">
                <view class="author-name-row">
                  <text class="author-name">
                    {{ article.author.name }}
                  </text>
                  <AppIcon
                    name="check-circle-2"
                    :size="14"
                    color="#C41E3A"
                  />
                </view>
                <text class="author-title">
                  {{ article.author.title }}
                </text>
              </view>
            </view>
            <view
              class="follow-btn"
              :class="{ followed: isFollowed }"
              @tap="toggleFollow"
            >
              <text class="follow-text">
                {{ isFollowed ? '已关注' : '+ 关注' }}
              </text>
            </view>
          </view>

          <view class="meta-row">
            <view class="meta-item">
              <AppIcon
                name="eye"
                :size="12"
                color="#999999"
              />
              <text class="meta-text">
                {{ article.views }} 阅读
              </text>
            </view>
            <view class="meta-item">
              <AppIcon
                name="clock"
                :size="12"
                color="#999999"
              />
              <text class="meta-text">
                {{ article.publishedAt }}
              </text>
            </view>
          </view>
        </view>

        <!-- AI 智能摘要 -->
        <view
          v-if="article.aiSummary"
          class="ai-summary"
        >
          <view class="ai-head">
            <view class="ai-icon">
              <AppIcon
                name="sparkles"
                :size="12"
                color="#ffffff"
              />
            </view>
            <text class="ai-label">
              AI 智能摘要
            </text>
          </view>
          <text
            class="ai-text"
            :class="{ clamp2: !summaryExpanded }"
          >
            {{ article.aiSummary }}
          </text>
          <text
            v-if="article.aiSummary.length > 60"
            class="ai-toggle"
            @tap="summaryExpanded = !summaryExpanded"
          >
            {{ summaryExpanded ? '收起' : '展开全部' }}
          </text>
        </view>

        <!-- 语音朗读 -->
        <view
          v-if="article.audioUrl"
          class="audio"
        >
          <view
            class="audio-btn"
            @tap="togglePlay"
          >
            <AppIcon
              :name="isPlaying ? 'pause' : 'play'"
              :size="20"
              color="#ffffff"
            />
          </view>
          <view class="audio-body">
            <view class="audio-time">
              <text class="audio-time-text">
                {{ fmtTime(progress) }}
              </text>
              <text class="audio-time-text">
                {{ fmtTime(duration) }}
              </text>
            </view>
            <view class="audio-track">
              <view
                class="audio-fill"
                :style="{ width: duration > 0 ? (progress / duration * 100) + '%' : '0%' }"
              />
            </view>
          </view>
          <view class="audio-label">
            <AppIcon
              name="volume-2"
              :size="14"
              color="#C9A96E"
            />
            <text class="audio-label-text">
              朗读
            </text>
          </view>
        </view>

        <!-- 正文块渲染 -->
        <view class="body">
          <template
            v-for="(block, i) in article.blocks"
            :key="i"
          >
            <!-- heading -->
            <text
              v-if="block.type === 'heading'"
              class="b-heading"
            >
              {{ block.content }}
            </text>
            <!-- text -->
            <text
              v-else-if="block.type === 'text'"
              class="b-text"
            >
              {{ block.content }}
            </text>
            <!-- quote -->
            <view
              v-else-if="block.type === 'quote'"
              class="b-quote"
            >
              <text class="b-quote-text">
                {{ block.content }}
              </text>
            </view>
            <!-- list -->
            <view
              v-else-if="block.type === 'list'"
              class="b-list"
            >
              <view
                v-for="(it, k) in block.items"
                :key="k"
                class="b-list-item"
              >
                <view class="b-list-dot" />
                <text class="b-list-text">
                  {{ it }}
                </text>
              </view>
            </view>
            <!-- image -->
            <view
              v-else-if="block.type === 'image'"
              class="b-image"
            >
              <image
                class="b-image-img"
                :src="block.src"
                mode="widthFix"
              />
              <text
                v-if="block.caption"
                class="b-image-cap"
              >
                {{ block.caption }}
              </text>
            </view>
            <!-- embed: circle -->
            <view
              v-else-if="block.type === 'embed' && block.embedType === 'circle'"
              class="em-circle"
            >
              <view class="em-circle-icon">
                <AppIcon
                  name="users"
                  :size="24"
                  color="#C41E3A"
                />
              </view>
              <view class="em-circle-body">
                <view class="em-circle-name-row">
                  <text class="em-circle-name">
                    {{ block.data.name }}
                  </text>
                  <text class="em-badge em-badge-purple">
                    圈子
                  </text>
                </view>
                <text class="em-circle-desc">
                  {{ block.data.description }}
                </text>
                <view class="em-circle-foot">
                  <text class="em-circle-members">
                    {{ block.data.members }} 成员
                  </text>
                  <view
                    class="em-join-btn"
                    :class="{ joined: embedCircleJoined[i] ?? block.data.isJoined }"
                    @tap="toggleEmbedCircle(i, !!block.data.isJoined)"
                  >
                    <text class="em-join-text">
                      {{ (embedCircleJoined[i] ?? block.data.isJoined) ? '已加入' : '加入圈子' }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
            <!-- embed: course -->
            <view
              v-else-if="block.type === 'embed' && block.embedType === 'course'"
              class="em-card"
              @tap="toastComingSoon"
            >
              <image
                class="em-card-cover"
                :src="block.data.cover"
                mode="aspectFill"
              />
              <view class="em-card-body">
                <view class="em-card-tag">
                  <AppIcon
                    name="book-open"
                    :size="12"
                    color="#3B82F6"
                  />
                  <text class="em-card-tag-text em-tag-info">
                    相关课程
                  </text>
                </view>
                <text class="em-card-title">
                  {{ block.data.title }}
                </text>
                <view class="em-card-foot">
                  <text class="em-card-price">
                    ¥{{ block.data.price }}
                  </text>
                  <text class="em-card-sub">
                    {{ block.data.students }}人学习
                  </text>
                </view>
              </view>
              <view class="em-card-arrow">
                <AppIcon
                  name="chevron-right"
                  :size="16"
                  color="#999999"
                />
              </view>
            </view>
            <!-- embed: product -->
            <view
              v-else-if="block.type === 'embed' && block.embedType === 'product'"
              class="em-card"
              @tap="toastComingSoon"
            >
              <image
                class="em-card-cover"
                :src="block.data.cover"
                mode="aspectFill"
              />
              <view class="em-card-body">
                <view class="em-card-tag">
                  <AppIcon
                    name="shopping-bag"
                    :size="12"
                    color="#C41E3A"
                  />
                  <text class="em-card-tag-text em-tag-brand">
                    相关商品
                  </text>
                </view>
                <text class="em-card-title">
                  {{ block.data.name }}
                </text>
                <view class="em-card-foot em-card-foot-between">
                  <view class="em-price-group">
                    <text class="em-card-price">
                      ¥{{ block.data.price }}
                    </text>
                    <text
                      v-if="block.data.originalPrice"
                      class="em-card-origin"
                    >
                      ¥{{ block.data.originalPrice }}
                    </text>
                  </view>
                  <view class="em-buy-btn">
                    <text class="em-buy-text">
                      立即购买
                    </text>
                  </view>
                </view>
              </view>
            </view>
            <!-- embed: paipan -->
            <view
              v-else-if="block.type === 'embed' && block.embedType === 'paipan'"
              class="em-action em-action-paipan"
              @tap="toastComingSoon"
            >
              <view class="em-action-icon em-icon-brand">
                <AppIcon
                  name="compass"
                  :size="24"
                  color="#ffffff"
                />
              </view>
              <view class="em-action-body">
                <text class="em-action-title">
                  {{ block.data.title }}
                </text>
                <text class="em-action-desc">
                  {{ block.data.description }}
                </text>
              </view>
              <view class="em-action-btn em-btn-brand">
                <text class="em-action-btn-text">
                  免费排盘
                </text>
              </view>
            </view>
            <!-- embed: agent -->
            <view
              v-else-if="block.type === 'embed' && block.embedType === 'agent'"
              class="em-action em-action-agent"
              @tap="toastComingSoon"
            >
              <view class="em-action-icon em-icon-purple">
                <AppIcon
                  name="bot"
                  :size="24"
                  color="#ffffff"
                />
              </view>
              <view class="em-action-body">
                <view class="em-action-name-row">
                  <text class="em-action-title">
                    {{ block.data.name }}
                  </text>
                  <text class="em-badge em-badge-purple">
                    AI
                  </text>
                </view>
                <text class="em-action-desc">
                  {{ block.data.description }}
                </text>
              </view>
              <view class="em-action-btn em-btn-purple">
                <text class="em-action-btn-text">
                  体验
                </text>
              </view>
            </view>
          </template>
        </view>

        <!-- 作者其他文章 -->
        <view
          v-if="article.authorOtherArticles.length"
          class="section section-border"
        >
          <view class="section-head">
            <text class="section-title">
              {{ article.author.name }}的其他文章
            </text>
            <view
              class="section-more"
              @tap="toastComingSoon"
            >
              <text class="section-more-text">
                更多
              </text>
              <AppIcon
                name="chevron-right"
                :size="12"
                color="#C41E3A"
              />
            </view>
          </view>
          <view class="rec-list">
            <view
              v-for="a in article.authorOtherArticles.slice(0, 3)"
              :key="a.id"
              class="rec-item"
              @tap="navigateTo('/articles/' + a.id)"
            >
              <view class="rec-body">
                <text class="rec-title">
                  {{ a.title }}
                </text>
                <view class="rec-meta">
                  <view class="rec-meta-item">
                    <AppIcon
                      name="eye"
                      :size="12"
                      color="#999999"
                    /><text class="rec-meta-text">
                      {{ a.views }}
                    </text>
                  </view>
                  <view class="rec-meta-item">
                    <AppIcon
                      name="heart"
                      :size="12"
                      color="#999999"
                    /><text class="rec-meta-text">
                      {{ a.likes }}
                    </text>
                  </view>
                </view>
              </view>
              <image
                v-if="a.cover"
                class="rec-cover"
                :src="a.cover"
                mode="aspectFill"
              />
            </view>
          </view>
        </view>

        <!-- 猜你喜欢 -->
        <view
          v-if="article.relatedArticles.length"
          class="section section-border"
        >
          <text class="section-title section-title-block">
            猜你喜欢
          </text>
          <view class="rec-list">
            <view
              v-for="a in article.relatedArticles"
              :key="a.id"
              class="rec-item"
              @tap="navigateTo('/articles/' + a.id)"
            >
              <image
                v-if="a.cover"
                class="rec-cover"
                :src="a.cover"
                mode="aspectFill"
              />
              <view class="rec-body">
                <text class="rec-title">
                  {{ a.title }}
                </text>
                <view class="rec-meta">
                  <text class="rec-meta-text">
                    {{ a.author }}
                  </text>
                  <view class="rec-meta-item">
                    <AppIcon
                      name="heart"
                      :size="12"
                      color="#999999"
                    /><text class="rec-meta-text">
                      {{ a.likes }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 评论区 -->
        <view class="comments section-border">
          <view class="comments-head">
            <text class="comments-title">
              评论 ({{ article.comments }})
            </text>
            <text class="comments-sort">
              按热度
            </text>
          </view>
          <view class="comment-list">
            <view
              v-for="c in comments"
              :key="c.id"
              class="comment"
            >
              <image
                class="comment-avatar"
                :src="c.author.avatar"
                mode="aspectFill"
              />
              <view class="comment-body">
                <view class="comment-top">
                  <text class="comment-name">
                    {{ c.author.name }}
                  </text>
                  <text class="comment-time">
                    {{ c.createdAt }}
                  </text>
                </view>
                <text class="comment-content">
                  {{ c.content }}
                </text>
                <view class="comment-actions">
                  <view
                    class="comment-act"
                    :class="{ liked: c.isLiked }"
                    @tap="toggleCommentLike(c)"
                  >
                    <AppIcon
                      name="heart"
                      :size="14"
                      :color="c.isLiked ? '#C41E3A' : '#999999'"
                    />
                    <text
                      v-if="c.likes > 0"
                      class="comment-act-text"
                      :class="{ liked: c.isLiked }"
                    >
                      {{ c.likes }}
                    </text>
                  </view>
                  <view
                    class="comment-act"
                    @tap="toastComingSoon"
                  >
                    <AppIcon
                      name="message-circle"
                      :size="14"
                      color="#999999"
                    />
                    <text class="comment-act-text">
                      回复
                    </text>
                  </view>
                  <view
                    class="comment-more"
                    @tap="toastComingSoon"
                  >
                    <AppIcon
                      name="more-horizontal"
                      :size="14"
                      color="#999999"
                    />
                  </view>
                </view>

                <!-- 楼中楼 -->
                <view
                  v-if="c.replies && c.replies.length"
                  class="replies"
                >
                  <view
                    v-for="r in (expandedReplies[c.id] ? c.replies : c.replies.slice(0, 2))"
                    :key="r.id"
                    class="reply"
                  >
                    <image
                      class="reply-avatar"
                      :src="r.author.avatar"
                      mode="aspectFill"
                    />
                    <view class="reply-body">
                      <text class="reply-line">
                        <text class="reply-name">
                          {{ r.author.name }}
                        </text><text class="reply-colon">
                          ：
                        </text><text class="reply-content">
                          {{ r.content }}
                        </text>
                      </text>
                      <view class="reply-foot">
                        <text class="reply-time">
                          {{ r.createdAt }}
                        </text>
                        <text
                          class="reply-act"
                          @tap="toastComingSoon"
                        >
                          回复
                        </text>
                      </view>
                    </view>
                  </view>
                  <view
                    v-if="c.replyCount && c.replyCount > 2"
                    class="reply-expand"
                    @tap="toggleReplies(c.id)"
                  >
                    <text class="reply-expand-text">
                      {{ expandedReplies[c.id] ? '收起回复' : '展开' + (c.replyCount - 2) + '条回复' }}
                    </text>
                    <AppIcon
                      v-if="!expandedReplies[c.id]"
                      name="chevron-down"
                      :size="12"
                      color="#C41E3A"
                    />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部来源圈子引流（非成员可见） -->
    <view
      v-if="showJoinGuide"
      class="join-guide"
    >
      <view
        class="join-info"
        @tap="toastComingSoon"
      >
        <image
          class="join-cover"
          :src="article.sourceCircle.cover"
          mode="aspectFill"
        />
        <view class="join-meta">
          <text class="join-name">
            {{ article.sourceCircle.name }}
          </text>
          <text class="join-sub">
            {{ article.sourceCircle.members }}成员 · 今日{{ article.sourceCircle.postsToday }}条动态
          </text>
        </view>
      </view>
      <view
        class="join-btn"
        @tap="joinCircle"
      >
        <text class="join-btn-text">
          加入圈子
        </text>
      </view>
    </view>

    <!-- 底部互动栏 -->
    <view class="action-bar">
      <view
        class="ab-comment"
        @tap="toastComingSoon"
      >
        <AppIcon
          name="message-circle"
          :size="16"
          color="#999999"
        />
        <text class="ab-comment-text">
          写评论...
        </text>
      </view>
      <view
        class="ab-item"
        @tap="toggleLike"
      >
        <AppIcon
          name="heart"
          :size="24"
          :color="isLiked ? '#C41E3A' : '#666666'"
        />
        <text class="ab-count">
          {{ likeCount }}
        </text>
      </view>
      <view
        class="ab-item"
        @tap="toggleCollect"
      >
        <AppIcon
          name="star"
          :size="24"
          :color="isCollected ? '#C9A96E' : '#666666'"
        />
        <text class="ab-count">
          {{ collectCount }}
        </text>
      </view>
      <view
        class="ab-item"
        @tap="toastComingSoon"
      >
        <AppIcon
          name="share-2"
          :size="24"
          color="#666666"
        />
        <text class="ab-count">
          分享
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}
/* 导航 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 88rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1rpx solid #f0ebe3;
}
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.nav-right {
  display: flex;
  align-items: center;
}
.scroll {
  height: 100vh;
  box-sizing: border-box;
}
/* 封面 */
.cover-wrap {
  padding-top: 88rpx;
}
.cover {
  width: 100%;
  background: #f5f0e8;
}
.cover-169 {
  aspect-ratio: 16 / 9;
}
.cover-34 {
  aspect-ratio: 3 / 4;
}
.cover-img {
  width: 100%;
  height: 100%;
}
/* 内容卡 */
.content-card {
  position: relative;
  z-index: 10;
  background: #ffffff;
}
.content-card.has-cover {
  border-top-left-radius: 40rpx;
  border-top-right-radius: 40rpx;
  margin-top: -32rpx;
}
.content-card:not(.has-cover) {
  margin-top: 88rpx;
}
.head {
  padding: 40rpx 32rpx 24rpx;
}
.title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #2c2c2c;
  line-height: 1.25;
  margin-bottom: 24rpx;
  font-family: 'Songti SC', serif;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.tag {
  padding: 4rpx 16rpx;
  background: #f5f0e8;
  border-radius: 999rpx;
}
.tag-text {
  font-size: 22rpx;
  color: #999999;
}
.author-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.author-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
  min-width: 0;
}
.author-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 1rpx solid #f0ebe3;
  flex-shrink: 0;
}
.author-meta {
  min-width: 0;
}
.author-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.author-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.author-title {
  font-size: 22rpx;
  color: #999999;
}
.follow-btn {
  flex-shrink: 0;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: #c41e3a;
}
.follow-btn.followed {
  background: #f5f0e8;
  border: 1rpx solid #f0ebe3;
}
.follow-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #ffffff;
}
.follow-btn.followed .follow-text {
  color: #999999;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 24rpx;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.meta-text {
  font-size: 22rpx;
  color: #999999;
}
/* AI 摘要 */
.ai-summary {
  margin: 0 32rpx 32rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  border: 1rpx solid #f0ebe3;
  background: #f5f0e8;
}
.ai-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.ai-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-label {
  font-size: 24rpx;
  font-weight: 700;
  color: #c41e3a;
}
.ai-text {
  display: block;
  font-size: 26rpx;
  color: #333333;
  line-height: 1.7;
}
.ai-text.clamp2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.ai-toggle {
  display: block;
  font-size: 24rpx;
  color: #c41e3a;
  margin-top: 8rpx;
}
/* 音频 */
.audio {
  margin: 0 32rpx 32rpx;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  border: 1rpx solid #f0ebe3;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.audio-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.3);
  flex-shrink: 0;
}
.audio-body {
  flex: 1;
}
.audio-time {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.audio-time-text {
  font-size: 22rpx;
  color: #999999;
}
.audio-track {
  height: 12rpx;
  background: #f5f0e8;
  border-radius: 999rpx;
  overflow: hidden;
}
.audio-fill {
  height: 100%;
  background: #c41e3a;
  border-radius: 999rpx;
}
.audio-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.audio-label-text {
  font-size: 22rpx;
  color: #999999;
}
/* 正文 */
.body {
  padding: 0 32rpx 16rpx;
}
.b-heading {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-top: 56rpx;
  margin-bottom: 24rpx;
  line-height: 1.35;
}
.b-text {
  display: block;
  font-size: 30rpx;
  color: #333333;
  line-height: 1.9;
  margin-bottom: 32rpx;
  letter-spacing: 0.3rpx;
}
.b-quote {
  margin: 40rpx 0;
  padding: 24rpx 24rpx 24rpx 32rpx;
  border-left: 6rpx solid #c9a96e;
  background: #f5f0e8;
  border-top-right-radius: 16rpx;
  border-bottom-right-radius: 16rpx;
}
.b-quote-text {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.7;
}
.b-list {
  margin: 32rpx 0;
}
.b-list-item {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.b-list-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #c41e3a;
  margin-top: 14rpx;
  flex-shrink: 0;
}
.b-list-text {
  flex: 1;
  font-size: 30rpx;
  color: #333333;
  line-height: 1.7;
}
.b-image {
  margin: 48rpx 0;
}
.b-image-img {
  width: 100%;
  border-radius: 24rpx;
  background: #f5f0e8;
}
.b-image-cap {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #999999;
  margin-top: 16rpx;
}
/* 嵌入卡通用 */
.em-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.em-badge-purple {
  background: rgba(139, 123, 184, 0.15);
  color: #8b7bb8;
}
/* 嵌入：圈子 */
.em-circle {
  margin: 40rpx 0;
  padding: 32rpx;
  border-radius: 24rpx;
  border: 1rpx solid #f0ebe3;
  background: #f5f0e8;
  display: flex;
  gap: 24rpx;
}
.em-circle-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: rgba(196, 30, 58, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.em-circle-body {
  flex: 1;
  min-width: 0;
}
.em-circle-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.em-circle-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.em-circle-desc {
  display: block;
  font-size: 26rpx;
  color: #999999;
  margin-top: 8rpx;
  line-height: 1.5;
}
.em-circle-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
}
.em-circle-members {
  font-size: 24rpx;
  color: #999999;
}
.em-join-btn {
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: #c41e3a;
}
.em-join-btn.joined {
  background: #f5f0e8;
  border: 1rpx solid #f0ebe3;
}
.em-join-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
.em-join-btn.joined .em-join-text {
  color: #999999;
}
/* 嵌入：课程/商品卡 */
.em-card {
  margin: 40rpx 0;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  border: 1rpx solid #f0ebe3;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  display: flex;
  gap: 24rpx;
}
.em-card-cover {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  background: #f5f0e8;
  flex-shrink: 0;
}
.em-card-body {
  flex: 1;
  min-width: 0;
}
.em-card-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}
.em-card-tag-text {
  font-size: 20rpx;
  font-weight: 500;
}
.em-tag-info {
  color: #3b82f6;
}
.em-tag-brand {
  color: #c41e3a;
}
.em-card-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
  margin-bottom: 8rpx;
}
.em-card-foot {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.em-card-foot-between {
  justify-content: space-between;
}
.em-card-price {
  font-size: 30rpx;
  font-weight: 700;
  color: #c41e3a;
}
.em-card-sub {
  font-size: 22rpx;
  color: #999999;
}
.em-price-group {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.em-card-origin {
  font-size: 22rpx;
  color: #999999;
  text-decoration: line-through;
}
.em-buy-btn {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  background: #c41e3a;
}
.em-buy-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #ffffff;
}
.em-card-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
/* 嵌入：排盘/智能体行动卡 */
.em-action {
  margin: 40rpx 0;
  padding: 32rpx;
  border-radius: 24rpx;
  background: #f5f0e8;
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.em-action-paipan {
  border: 1rpx solid rgba(196, 30, 58, 0.3);
}
.em-action-agent {
  border: 1rpx solid rgba(139, 123, 184, 0.3);
}
.em-action-icon {
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}
.em-icon-brand {
  border-radius: 50%;
  background: #c41e3a;
}
.em-icon-purple {
  border-radius: 24rpx;
  background: #8b7bb8;
}
.em-action-body {
  flex: 1;
  min-width: 0;
}
.em-action-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.em-action-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.em-action-desc {
  display: block;
  font-size: 26rpx;
  color: #999999;
  margin-top: 4rpx;
}
.em-action-btn {
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.em-btn-brand {
  background: #c41e3a;
}
.em-btn-purple {
  background: #8b7bb8;
}
.em-action-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
/* 区块（其他文章/猜你喜欢） */
.section {
  padding: 32rpx;
}
.section-border {
  border-top: 1rpx solid #f0ebe3;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.section-title-block {
  display: block;
  margin-bottom: 24rpx;
}
.section-more {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.section-more-text {
  font-size: 24rpx;
  color: #c41e3a;
}
.rec-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.rec-item {
  display: flex;
  gap: 24rpx;
}
.rec-body {
  flex: 1;
  min-width: 0;
}
.rec-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
  margin-bottom: 16rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.rec-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.rec-meta-item {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.rec-meta-text {
  font-size: 22rpx;
  color: #999999;
}
.rec-cover {
  width: 128rpx;
  height: 128rpx;
  border-radius: 16rpx;
  background: #f5f0e8;
  flex-shrink: 0;
}
/* 评论区 */
.comments {
  background: #ffffff;
}
.comments-head {
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #f0ebe3;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.comments-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.comments-sort {
  font-size: 24rpx;
  color: #999999;
}
.comment {
  padding: 24rpx 32rpx;
  display: flex;
  gap: 24rpx;
  border-bottom: 1rpx solid #f5f0e8;
}
.comment-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f5f0e8;
}
.comment-body {
  flex: 1;
  min-width: 0;
}
.comment-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.comment-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.comment-time {
  font-size: 22rpx;
  color: #999999;
}
.comment-content {
  display: block;
  font-size: 28rpx;
  color: #333333;
  line-height: 1.6;
  margin-bottom: 16rpx;
}
.comment-actions {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.comment-act {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.comment-act-text {
  font-size: 24rpx;
  color: #999999;
}
.comment-act-text.liked {
  color: #c41e3a;
}
.comment-more {
  margin-left: auto;
}
/* 楼中楼 */
.replies {
  margin-top: 24rpx;
  background: #faf8f5;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.reply {
  display: flex;
  gap: 16rpx;
}
.reply-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f5f0e8;
}
.reply-body {
  flex: 1;
  min-width: 0;
}
.reply-line {
  font-size: 26rpx;
  line-height: 1.5;
}
.reply-name {
  font-weight: 500;
  color: #2c2c2c;
}
.reply-colon {
  color: #666666;
  margin: 0 4rpx;
}
.reply-content {
  color: #333333;
}
.reply-foot {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 8rpx;
}
.reply-time {
  font-size: 22rpx;
  color: #999999;
}
.reply-act {
  font-size: 22rpx;
  color: #999999;
}
.reply-expand {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.reply-expand-text {
  font-size: 24rpx;
  color: #c41e3a;
}
/* 底部圈子引流 */
.join-guide {
  position: fixed;
  bottom: 120rpx;
  left: 0;
  right: 0;
  z-index: 40;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid #f0ebe3;
  padding: 20rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.join-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex: 1;
  min-width: 0;
}
.join-cover {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: #f5f0e8;
  flex-shrink: 0;
}
.join-meta {
  flex: 1;
  min-width: 0;
}
.join-name {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.join-sub {
  display: block;
  font-size: 22rpx;
  color: #999999;
}
.join-btn {
  padding: 16rpx 40rpx;
  border-radius: 999rpx;
  background: #c41e3a;
  flex-shrink: 0;
}
.join-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}
/* 底部互动栏 */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #ffffff;
  border-top: 1rpx solid #f0ebe3;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 16rpx 32rpx;
}
.ab-comment {
  flex: 1;
  height: 72rpx;
  background: #f5f0e8;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.ab-comment-text {
  font-size: 26rpx;
  color: #999999;
}
.ab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 0 24rpx;
}
.ab-count {
  font-size: 20rpx;
  color: #999999;
}
</style>
