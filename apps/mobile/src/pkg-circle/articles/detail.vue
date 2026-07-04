<script setup lang="ts">
/**
 * 文章详情页（真连后端 GET /articles/:id）
 * 正文为后端富文本 HTML，用 rich-text 渲染；内联推荐卡来自后端 recommends（5 类型，降级仅标题/封面/跳转）。
 * 互动（点赞/收藏/关注/评论）真连 interaction 端点，乐观更新 + 失败回滚 + 防重复。
 * 后端无的字段（AI摘要/语音/作者头衔粉丝/作者其他文章）按真实数据 v-if 降级隐藏。三态齐全。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import {
  articleApi, recommendRoute,
  type ArticleDetail, type ArticleComment, type ArticleRecommendCard,
} from '@/lib/article-data'

const articleId = ref('')
const loading = ref(true)
const error = ref('')
const article = ref<ArticleDetail | null>(null)
const comments = ref<ArticleComment[]>([])

// 互动状态
const isFollowed = ref(false)
const isLiked = ref(false)
const isCollected = ref(false)
const likeCount = ref(0)
const collectCount = ref(0)
const likeActing = ref(false)
const collectActing = ref(false)
const followActing = ref(false)
const commentSubmitting = ref(false)
const commentLikeActing = reactive<Record<string, boolean>>({})

// 评论展开 / 输入
const expandedReplies = reactive<Record<string, boolean>>({})
const commentText = ref('')
const replyTo = ref<ArticleComment | null>(null)
const commentFocus = ref(false)

const showJoinGuide = computed(() => !!article.value?.sourceCircle)

async function load() {
  if (!articleId.value) { error.value = '缺少文章参数'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    const a = await articleApi.detail(articleId.value)
    article.value = a
    likeCount.value = a.likes
    collectCount.value = a.collects
    // 评论 + 我的互动态并行拉取（失败不阻断主体）
    const [cs, chk] = await Promise.all([
      articleApi.getComments(articleId.value).catch(() => []),
      articleApi.checkInteraction(articleId.value).catch(() => ({ liked: false, collected: false })),
    ])
    comments.value = cs
    isLiked.value = chk.liked
    isCollected.value = chk.collected
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((q) => { if (q && q.id) articleId.value = String(q.id) })
onMounted(load)

function openArticle(id: string) { navigateTo('/articles/' + id) }
function openCircle() { if (article.value?.sourceCircle) navigateTo('/circles/' + article.value.sourceCircle.id) }
function openRecommend(c: ArticleRecommendCard) {
  const r = recommendRoute(c)
  if (r) navigateTo(r); else toastComingSoon()
}
const REC_LABEL: Record<ArticleRecommendCard['recommendType'], string> = {
  CIRCLE: '相关圈子', COURSE: '相关课程', PRODUCT: '相关商品', PAIPAN: '智能排盘', BOT: 'AI 智能体',
}
const REC_ICON: Record<ArticleRecommendCard['recommendType'], string> = {
  CIRCLE: 'users', COURSE: 'book-open', PRODUCT: 'shopping-bag', PAIPAN: 'compass', BOT: 'bot',
}
function recLabel(t: ArticleRecommendCard['recommendType']) { return REC_LABEL[t] || '相关推荐' }
function recIcon(t: ArticleRecommendCard['recommendType']) { return REC_ICON[t] || 'link' }

// ─── 互动（乐观更新 + 失败回滚 + 防重复）───
async function toggleLike() {
  if (likeActing.value || !article.value) return
  likeActing.value = true
  const pl = isLiked.value, pc = likeCount.value
  isLiked.value = !pl
  likeCount.value = pc + (isLiked.value ? 1 : -1)
  try { await articleApi.toggleLike(articleId.value) }
  catch { isLiked.value = pl; likeCount.value = pc; uni.showToast({ title: '操作失败，请重试', icon: 'none' }) }
  finally { likeActing.value = false }
}
async function toggleCollect() {
  if (collectActing.value || !article.value) return
  collectActing.value = true
  const pc = isCollected.value, pn = collectCount.value
  isCollected.value = !pc
  collectCount.value = pn + (isCollected.value ? 1 : -1)
  try { await articleApi.toggleCollect(articleId.value) }
  catch { isCollected.value = pc; collectCount.value = pn; uni.showToast({ title: '操作失败，请重试', icon: 'none' }) }
  finally { collectActing.value = false }
}
async function toggleFollow() {
  if (followActing.value || !article.value) return
  const authorId = article.value.author.id
  if (!authorId) return
  followActing.value = true
  const prev = isFollowed.value
  isFollowed.value = !prev
  try { await articleApi.toggleFollow(authorId) }
  catch { isFollowed.value = prev; uni.showToast({ title: '操作失败，请重试', icon: 'none' }) }
  finally { followActing.value = false }
}
async function toggleCommentLike(c: ArticleComment) {
  if (commentLikeActing[c.id]) return
  commentLikeActing[c.id] = true
  const pl = c.isLiked, pn = c.likes
  c.isLiked = !pl
  c.likes = pn + (c.isLiked ? 1 : -1)
  try { await articleApi.toggleCommentLike(c.id) }
  catch { c.isLiked = pl; c.likes = pn; uni.showToast({ title: '操作失败，请重试', icon: 'none' }) }
  finally { commentLikeActing[c.id] = false }
}
function toggleReplies(id: string) { expandedReplies[id] = !expandedReplies[id] }
function startReply(c: ArticleComment) { replyTo.value = c }

async function submitComment() {
  if (commentSubmitting.value) return
  const content = commentText.value.trim()
  if (!content) return
  commentSubmitting.value = true
  try {
    await articleApi.createComment(articleId.value, content, replyTo.value?.id)
    commentText.value = ''
    replyTo.value = null
    comments.value = await articleApi.getComments(articleId.value)
    if (article.value) article.value.comments = comments.value.length
    uni.showToast({ title: '评论已发送', icon: 'success' })
  } catch {
    uni.showToast({ title: '发送失败，请重试', icon: 'none' })
  } finally {
    commentSubmitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="nav-btn" @tap="goBack">
        <AppIcon name="arrow-left" :size="20" color="#2C2C2C" />
      </view>
      <text class="nav-title">文章详情</text>
      <view class="nav-right">
        <view class="nav-btn" @tap="toastComingSoon">
          <AppIcon name="share-2" :size="20" color="#2C2C2C" />
        </view>
        <!-- 死入口大扫除：原「更多」按钮无任何菜单实现，属残留占位已删除 -->
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading && !article" class="state-box">
      <text class="state-text">加载中…</text>
    </view>
    <!-- 错误态 -->
    <view v-else-if="error && !article" class="state-box">
      <text class="state-text">{{ error }}</text>
      <view class="state-retry" @tap="load"><text class="state-retry-text">重试</text></view>
    </view>

    <scroll-view v-else-if="article" scroll-y class="scroll" :style="{ paddingBottom: showJoinGuide ? '264rpx' : '144rpx' }">
      <!-- 封面图（后端 coverRatio 缺省，统一 16:9） -->
      <view v-if="article.cover" class="cover-wrap">
        <view class="cover cover-169">
          <image lazy-load class="cover-img" :src="article.cover" mode="aspectFill" />
        </view>
      </view>

      <!-- 内容卡片 -->
      <view class="content-card" :class="{ 'has-cover': article.cover }">
        <!-- 标题 + 标签 + 作者 -->
        <view class="head">
          <text class="title">{{ article.title }}</text>

          <view v-if="article.tags.length" class="tags">
            <view v-for="tag in article.tags" :key="tag" class="tag" @tap="navigateTo('/topic/' + tag)">
              <text class="tag-text">#{{ tag }}</text>
            </view>
          </view>

          <view class="author-row">
            <view class="author-info" @tap="navigateTo('/pkg-circle/user/profile?id=' + article.author.id)">
              <image lazy-load class="author-avatar" :src="article.author.avatar" mode="aspectFill" />
              <view class="author-meta">
                <view class="author-name-row">
                  <text class="author-name">{{ article.author.name }}</text>
                </view>
              </view>
            </view>
            <view class="follow-btn" :class="{ followed: isFollowed }" @tap="toggleFollow">
              <text class="follow-text">{{ isFollowed ? '已关注' : '+ 关注' }}</text>
            </view>
          </view>

          <view class="meta-row">
            <view class="meta-item">
              <AppIcon name="eye" :size="12" color="#999999" />
              <text class="meta-text">{{ article.views }} 阅读</text>
            </view>
            <view v-if="article.publishedAt" class="meta-item">
              <AppIcon name="clock" :size="12" color="#999999" />
              <text class="meta-text">{{ article.publishedAt }}</text>
            </view>
          </view>
        </view>

        <!-- 正文（后端富文本 HTML，rich-text 渲染） -->
        <view class="body">
          <rich-text class="body-rich" :nodes="article.content"></rich-text>
        </view>

        <!-- 内联推荐卡（后端 recommends，5 类型；后端仅标题/封面 → 降级展示 + 跳转） -->
        <view v-if="article.recommends.length" class="rec-cards">
          <view v-for="c in article.recommends" :key="c.id" class="em-card" @tap="openRecommend(c)">
            <image lazy-load v-if="c.cover" class="em-card-cover" :src="c.cover" mode="aspectFill" />
            <view class="em-card-body">
              <view class="em-card-tag">
                <AppIcon :name="recIcon(c.recommendType)" :size="12" color="#C41E3A" />
                <text class="em-card-tag-text em-tag-brand">{{ recLabel(c.recommendType) }}</text>
              </view>
              <text class="em-card-title">{{ c.title || recLabel(c.recommendType) }}</text>
            </view>
            <view class="em-card-arrow">
              <AppIcon name="chevron-right" :size="16" color="#999999" />
            </view>
          </view>
        </view>

        <!-- 猜你喜欢（后端 getRelated：同圈/同标签相关文章） -->
        <view v-if="article.related.length" class="section section-border">
          <text class="section-title section-title-block">猜你喜欢</text>
          <view class="rec-list">
            <view v-for="a in article.related" :key="a.id" class="rec-item" @tap="openArticle(a.id)">
              <image lazy-load v-if="a.cover" class="rec-cover" :src="a.cover" mode="aspectFill" />
              <view class="rec-body">
                <text class="rec-title">{{ a.title }}</text>
                <view class="rec-meta">
                  <view class="rec-meta-item"><AppIcon name="heart" :size="12" color="#999999" /><text class="rec-meta-text">{{ a.likes }}</text></view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 评论区 -->
        <view class="comments section-border">
          <view class="comments-head">
            <text class="comments-title">评论 ({{ article.comments }})</text>
          </view>

          <!-- 评论输入（真实发评论 / 回复，防重复） -->
          <view class="comment-input-bar">
            <textarea
              class="comment-input"
              v-model="commentText"
              :focus="commentFocus"
              :placeholder="replyTo ? ('回复 ' + (replyTo.author.name || '')) : '写下你的评论...'"
              :maxlength="500"
              auto-height
              @blur="commentFocus = false"
            />
            <view class="comment-send" :class="{ disabled: commentSubmitting || !commentText.trim() }" @tap="submitComment">
              <text class="comment-send-text">{{ commentSubmitting ? '发送中' : '发送' }}</text>
            </view>
          </view>

          <!-- 空态 -->
          <view v-if="!comments.length" class="comment-empty">
            <text class="comment-empty-text">还没有评论，来抢沙发吧</text>
          </view>

          <view v-else class="comment-list">
            <view v-for="c in comments" :key="c.id" class="comment">
              <image lazy-load class="comment-avatar" :src="c.author.avatar" mode="aspectFill" />
              <view class="comment-body">
                <view class="comment-top">
                  <text class="comment-name">{{ c.author.name }}</text>
                  <text class="comment-time">{{ c.createdAt }}</text>
                </view>
                <text class="comment-content">{{ c.content }}</text>
                <view class="comment-actions">
                  <view class="comment-act" :class="{ liked: c.isLiked }" @tap="toggleCommentLike(c)">
                    <AppIcon name="heart" :size="14" :color="c.isLiked ? '#C41E3A' : '#999999'" />
                    <text v-if="c.likes > 0" class="comment-act-text" :class="{ liked: c.isLiked }">{{ c.likes }}</text>
                  </view>
                  <view class="comment-act" @tap="startReply(c)">
                    <AppIcon name="message-circle" :size="14" color="#999999" />
                    <text class="comment-act-text">回复</text>
                  </view>
                </view>

                <!-- 楼中楼 -->
                <view v-if="c.replies && c.replies.length" class="replies">
                  <view v-for="r in (expandedReplies[c.id] ? c.replies : c.replies.slice(0, 2))" :key="r.id" class="reply">
                    <image lazy-load class="reply-avatar" :src="r.author.avatar" mode="aspectFill" />
                    <view class="reply-body">
                      <text class="reply-line"><text class="reply-name">{{ r.author.name }}</text><text class="reply-colon">：</text><text class="reply-content">{{ r.content }}</text></text>
                      <view class="reply-foot">
                        <text class="reply-time">{{ r.createdAt }}</text>
                        <text class="reply-act" @tap="startReply(c)">回复</text>
                      </view>
                    </view>
                  </view>
                  <view v-if="c.replyCount && c.replyCount > 2" class="reply-expand" @tap="toggleReplies(c.id)">
                    <text class="reply-expand-text">{{ expandedReplies[c.id] ? '收起回复' : '展开' + (c.replyCount - 2) + '条回复' }}</text>
                    <AppIcon v-if="!expandedReplies[c.id]" name="chevron-down" :size="12" color="#C41E3A" />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部来源圈子引流 -->
    <view v-if="article && article.sourceCircle" class="join-guide">
      <view class="join-info" @tap="openCircle">
        <image lazy-load v-if="article.sourceCircle.cover" class="join-cover" :src="article.sourceCircle.cover" mode="aspectFill" />
        <view class="join-meta">
          <text class="join-name">{{ article.sourceCircle.name }}</text>
          <text class="join-sub">{{ article.sourceCircle.members }}成员</text>
        </view>
      </view>
      <view class="join-btn" @tap="openCircle"><text class="join-btn-text">进入圈子</text></view>
    </view>

    <!-- 底部互动栏 -->
    <view v-if="article" class="action-bar">
      <view class="ab-comment" @tap="commentFocus = true">
        <AppIcon name="message-circle" :size="16" color="#999999" />
        <text class="ab-comment-text">写评论...</text>
      </view>
      <view class="ab-item" @tap="toggleLike">
        <AppIcon name="heart" :size="24" :color="isLiked ? '#C41E3A' : '#666666'" />
        <text class="ab-count">{{ likeCount }}</text>
      </view>
      <view class="ab-item" @tap="toggleCollect">
        <AppIcon name="star" :size="24" :color="isCollected ? '#C9A96E' : '#666666'" />
        <text class="ab-count">{{ collectCount }}</text>
      </view>
      <view class="ab-item" @tap="navigateTo('/pkg-circle/common/share-poster?type=article&targetId=' + article.id)">
        <AppIcon name="share-2" :size="24" color="#666666" />
        <text class="ab-count">分享</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}
/* 三态 */
.state-box {
  padding: 240rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.state-text { font-size: 28rpx; color: #999999; }
.state-retry {
  padding: 12rpx 48rpx;
  border: 1rpx solid var(--brand);
  border-radius: 999rpx;
}
.state-retry-text { font-size: 26rpx; color: var(--brand); }
/* 正文富文本 */
.body-rich {
  font-size: 30rpx;
  line-height: 1.85;
  color: #2c2c2c;
  word-break: break-word;
}
/* 内联推荐卡容器 */
.rec-cards {
  padding: 8rpx 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
/* 评论输入 */
.comment-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  padding: 16rpx 0 24rpx;
}
.comment-input {
  flex: 1;
  min-height: 64rpx;
  max-height: 240rpx;
  padding: 16rpx 24rpx;
  background: #f5f0e8;
  border-radius: 24rpx;
  font-size: 26rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.comment-send {
  flex-shrink: 0;
  padding: 14rpx 36rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.comment-send.disabled { background: #d9b3ba; }
.comment-send-text { font-size: 26rpx; color: #ffffff; font-weight: 500; }
/* 评论空态 */
.comment-empty {
  padding: 60rpx 0;
  display: flex;
  justify-content: center;
}
.comment-empty-text { font-size: 26rpx; color: #999999; }
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
  background: var(--brand);
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
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-label {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--brand);
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
  color: var(--brand);
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
  background: var(--brand);
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
  background: var(--brand);
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
  background: var(--brand);
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
  background: var(--brand);
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
  color: var(--brand);
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
  color: var(--brand);
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
  background: var(--brand);
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
  background: var(--brand);
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
  background: var(--brand);
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
  color: var(--brand);
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
  color: var(--brand);
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
  color: var(--brand);
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
  background: var(--brand);
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
