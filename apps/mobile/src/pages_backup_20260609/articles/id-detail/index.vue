<template>
  <view class="article-page">
    <!-- 顶部导航 -->
    <view class="nav-fixed">
      <view class="nav-row">
        <text class="nav-back" @click="uni.navigateBack()">‹</text>
        <text class="nav-title">文章详情</text>
        <text class="nav-share" @click="handleShare">↗</text>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="skeleton">
      <view class="sk-cover" />
      <view class="sk-body">
        <view class="sk-title" />
        <view class="sk-author" />
        <view class="sk-line" style="width:80%" />
        <view class="sk-line" style="width:95%" />
        <view class="sk-line" style="width:60%" />
        <view class="sk-line" style="width:70%" />
      </view>
    </view>

    <!-- 内容 -->
    <template v-else-if="article">
      <!-- 封面图 -->
      <view v-if="article.cover" class="cover-area">
        <image :src="article.cover" class="cover-img" mode="aspectFill" />
      </view>

      <!-- 内容区 -->
      <view class="content-card" :class="{ 'has-cover': article.cover }">
        <!-- 标题 -->
        <text class="art-title">{{ article.title }}</text>

        <!-- 标签 -->
        <view v-if="article.tags?.length" class="tag-row">
          <text v-for="tag in article.tags" :key="tag" class="tag">#{{ tag }}</text>
        </view>

        <!-- 作者信息 -->
        <view class="author-row">
          <view class="author-left" @click="goPage('/pages/profile/index')">
            <image v-if="article.author.avatar" :src="article.author.avatar" class="author-avatar" mode="aspectFill" />
            <view v-else class="author-avatar-fb">{{ article.author.name[0] }}</view>
            <view class="author-text">
              <text class="author-name">{{ article.author.name }}</text>
              <text class="author-title">{{ article.author.title }}</text>
            </view>
          </view>
          <view class="follow-btn" :class="{ followed: isFollowed }" @click="handleFollow">
            <text>{{ isFollowed ? '已关注' : '+ 关注' }}</text>
          </view>
        </view>

        <!-- 阅读信息 -->
        <view class="meta-row">
          <text>👁 {{ fmtN(article.views) }}阅读</text>
          <text>🕐 {{ article.publishedAt }}</text>
        </view>

        <!-- AI摘要 -->
        <view v-if="article.aiSummary" class="ai-summary">
          <view class="ai-head">
            <text class="ai-icon">✨</text>
            <text class="ai-label">AI 智能摘要</text>
          </view>
          <text class="ai-text" :class="{ clamp: !aiExpanded && article.aiSummary.length > 80 }">{{ article.aiSummary }}</text>
          <text v-if="article.aiSummary.length > 80" class="ai-toggle" @click="aiExpanded = !aiExpanded">{{ aiExpanded ? '收起' : '展开全部' }}</text>
        </view>

        <!-- 语音播放 -->
        <view v-if="article.audioUrl" class="audio-bar">
          <view class="audio-btn" @click="toggleAudio">
            <text>{{ audioPlaying ? '⏸' : '▶' }}</text>
          </view>
          <view class="audio-progress">
            <view class="audio-track">
              <view class="audio-fill" :style="{ width: audioProgress + '%' }" />
            </view>
            <view class="audio-times">
              <text class="audio-time">{{ fmtTime(audioCurrent) }}</text>
              <text class="audio-time">{{ fmtTime(audioDuration) }}</text>
            </view>
          </view>
        </view>

        <!-- 正文 -->
        <view class="art-content">
          <rich-text :nodes="article.content" />
        </view>

        <!-- 内嵌商品 -->
        <view v-for="p in article.embeddedProducts" :key="p.id" class="embed-card" @click="goPage('/pages/mall/index')">
          <view class="embed-img-wrap">
            <image v-if="p.cover" :src="p.cover" class="embed-img" mode="aspectFill" />
            <text v-else class="embed-img-fb">📦</text>
          </view>
          <view class="embed-info">
            <view class="embed-type"><text>🛍 相关商品</text></view>
            <text class="embed-name">{{ p.name }}</text>
            <view class="embed-price-row">
              <text class="embed-price">¥{{ p.price }}</text>
              <text v-if="p.originalPrice" class="embed-old">¥{{ p.originalPrice }}</text>
            </view>
          </view>
          <text class="embed-arrow">›</text>
        </view>

        <!-- 内嵌课程 -->
        <view v-for="c in article.embeddedCourses" :key="c.id" class="embed-card" @click="goPage('/pages/courses/index')">
          <view class="embed-img-wrap">
            <image v-if="c.cover" :src="c.cover" class="embed-img" mode="aspectFill" />
            <text v-else class="embed-img-fb">📖</text>
            <text class="embed-lessons">{{ c.lessons }}课时</text>
          </view>
          <view class="embed-info">
            <view class="embed-type blue"><text>📚 相关课程</text></view>
            <text class="embed-name">{{ c.title }}</text>
            <text class="embed-price">¥{{ c.price }} <text class="embed-students">{{ c.students }}人学习</text></text>
          </view>
          <text class="embed-arrow">›</text>
        </view>

        <!-- 作者圈子引导 -->
        <view v-if="article.authorCircle" class="circle-guide">
          <view class="cg-header">
            <image v-if="article.author.avatar" :src="article.author.avatar" class="cg-avatar" mode="aspectFill" />
            <text class="cg-text">{{ article.author.name }}的专属圈子</text>
          </view>
          <view class="cg-card">
            <view class="cg-img-wrap">
              <image v-if="article.authorCircle.cover" :src="article.authorCircle.cover" class="cg-img" mode="aspectFill" />
              <text v-else class="cg-img-fb">⭕</text>
            </view>
            <view class="cg-info">
              <text class="cg-name">{{ article.authorCircle.name }}</text>
              <text class="cg-stats">👥 {{ article.authorCircle.members }}成员 · {{ article.authorCircle.postsToday }}条今日动态</text>
            </view>
            <view class="cg-join"><text>加入</text></view>
          </view>
        </view>

        <!-- 作者其他文章 -->
        <view v-if="article.authorOtherArticles?.length" class="other-articles">
          <view class="section-header">
            <text class="section-title">{{ article.author.name }}的其他文章</text>
            <text class="section-more">查看更多 ›</text>
          </view>
          <view v-for="a in article.authorOtherArticles" :key="a.id" class="other-item" @click="goPage(`/pages/articles/id-detail/index`)">
            <view class="other-text">
              <text class="other-name">{{ a.title }}</text>
              <text class="other-meta">👁 {{ a.views }}  ❤ {{ a.likes }}</text>
            </view>
            <image v-if="a.cover" :src="a.cover" class="other-img" mode="aspectFill" />
          </view>
        </view>

        <!-- 评论区 -->
        <view class="comment-section">
          <text class="section-title">评论 ({{ article.comments }})</text>
          <view v-for="c in comments" :key="c.id" class="comment-item">
            <image v-if="c.author.avatar" :src="c.author.avatar" class="cm-avatar" mode="aspectFill" />
            <view v-else class="cm-avatar-fb">{{ c.author.name[0] }}</view>
            <view class="cm-body">
              <view class="cm-top">
                <text class="cm-name">{{ c.author.name }}</text>
                <text class="cm-time">{{ c.createdAt }}</text>
              </view>
              <text class="cm-text">{{ c.content }}</text>
              <view class="cm-actions">
                <text class="cm-like" :class="{ liked: c.isLiked }" @click="toggleCommentLike(c)">❤ {{ c.likes }}</text>
                <text class="cm-reply" @click="showCommentInput = true">回复</text>
              </view>
              <!-- 子回复 -->
              <view v-if="c.replies?.length" class="cm-replies">
                <view v-for="r in c.replies" :key="r.id" class="cm-reply-item">
                  <text class="rp-name">{{ r.author.name }}：</text>
                  <text class="rp-text">{{ r.content }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 底部操作栏 -->
    <view v-if="!loading" class="bottom-bar">
      <view class="bb-comment" @click="showCommentInput = true">
        <text>💬 写评论...</text>
      </view>
      <view class="bb-btn" @click="handleLike">
        <text :class="{ active: isLiked }">{{ isLiked ? '❤' : '🤍' }}</text>
        <text class="bb-num">{{ likeCount }}</text>
      </view>
      <view class="bb-btn" @click="handleCollect">
        <text :class="{ active: isCollected }">{{ isCollected ? '⭐' : '☆' }}</text>
        <text class="bb-num">{{ collectCount }}</text>
      </view>
      <view class="bb-btn" @click="handleShare">
        <text>↗</text>
        <text class="bb-num">分享</text>
      </view>
    </view>

    <!-- 评论输入面板 -->
    <view v-if="showCommentInput" class="input-mask" @click="showCommentInput = false">
      <view class="input-sheet" @click.stop>
        <view class="input-row">
          <input v-model="commentText" class="comment-input" placeholder="写下你的评论..." />
          <view class="send-btn" @click="sendComment"><text>发送</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

interface CommentItem {
  id: string; content: string; author: { id: string; name: string; avatar: string }
  createdAt: string; likes: number; isLiked: boolean
  replies?: CommentItem[]; replyCount?: number
}

const loading = ref(true)
const aiExpanded = ref(false)
const isFollowed = ref(false)
const isLiked = ref(false)
const isCollected = ref(false)
const likeCount = ref(1280)
const collectCount = ref(560)
const showCommentInput = ref(false)
const commentText = ref('')

const audioPlaying = ref(false)
const audioCurrent = ref(0)
const audioDuration = ref(186)
const audioProgress = ref(0)

const article = reactive({
  id: '1',
  title: '八字命理入门：如何看懂你的命盘',
  cover: '',
  author: { id: 'a1', name: '周易大师', avatar: '', title: '资深命理师 | 20年从业经验', followers: 12800 },
  publishedAt: '2024-03-15',
  views: 8560,
  likes: 1280,
  collects: 560,
  comments: 128,
  tags: ['八字入门', '命理学', '五行'],
  aiSummary: '本文介绍了八字命理的基础概念，包括天干地支、五行相生相克、日主与十神等核心知识点。八字命理通过分析出生时的年月日时四柱，推断人的命运走势，是中国传统命理学的重要分支。',
  audioUrl: '',
  content: `<h2>什么是八字</h2><p>八字是指一个人出生时的年、月、日、时所对应的天干地支，共八个字，故称"八字"。例如：甲子年、丙寅月、戊辰日、壬午时。</p><h2>天干地支基础</h2><p><strong>十天干：</strong>甲、乙、丙、丁、戊、己、庚、辛、壬、癸</p><p><strong>十二地支：</strong>子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥</p><h2>五行相生相克</h2><p>相生：木生火、火生土、土生金、金生水、水生木</p><p>相克：木克土、土克水、水克火、火克金、金克木</p><h2>日主与十神</h2><p>日柱的天干代表命主本人，称为"日主"。根据日主与其他干支的关系，可以推导出十神：比肩、劫财、食神、伤官、正财、偏财、正官、七杀、正印、偏印。</p>`,
  embeddedProducts: [{ id: 'p1', name: '《渊海子平》精装典藏版', cover: '', price: 68, originalPrice: 128 }],
  embeddedCourses: [{ id: 'c1', title: '八字入门实战课：从零开始学命理', cover: '', price: 199, lessons: 32, students: 2860 }],
  authorCircle: { id: 'circle-1', name: '周易大师研习社', cover: '', members: 12800, postsToday: 56 },
  authorOtherArticles: [
    { id: 'a2', title: '紫微斗数与八字命理的区别与联系', cover: '', views: 3200, likes: 456 },
    { id: 'a3', title: '如何从八字看财运旺衰', cover: '', views: 5600, likes: 890 },
    { id: 'a4', title: '八字合婚的基本原则', cover: '', views: 4500, likes: 678 },
  ],
})

const comments = reactive<CommentItem[]>([
  {
    id: 'c1', content: '写得很好，对初学者很友好，期待更多入门教程！',
    author: { id: 'u1', name: '国学爱好者', avatar: '' }, createdAt: '2小时前', likes: 56, isLiked: false,
    replies: [
      { id: 'c1-r1', content: '同感！终于找到一篇能看懂的入门文章', author: { id: 'u2', name: '命理新手', avatar: '' }, createdAt: '1小时前', likes: 12, isLiked: false },
    ],
    replyCount: 3,
  },
  { id: 'c2', content: '五行相生相克那部分讲得特别清楚，以前总是记不住', author: { id: 'u3', name: '学习中', avatar: '' }, createdAt: '5小时前', likes: 34, isLiked: true },
])

function fmtN(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n) }
function fmtTime(s: number) {
  const m = Math.floor(s / 60); const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function handleFollow() { isFollowed.value = !isFollowed.value }
function handleLike() {
  isLiked.value = !isLiked.value
  likeCount.value += isLiked.value ? 1 : -1
}
function handleCollect() {
  isCollected.value = !isCollected.value
  collectCount.value += isCollected.value ? 1 : -1
}
function handleShare() { uni.showToast({ title: '已复制分享链接', icon: 'none' }) }
function toggleCommentLike(c: CommentItem) {
  c.isLiked = !c.isLiked; c.likes += c.isLiked ? 1 : -1
}
function sendComment() {
  if (!commentText.value.trim()) return
  comments.unshift({
    id: 'c' + Date.now(), content: commentText.value,
    author: { id: 'me', name: '我', avatar: '' },
    createdAt: '刚刚', likes: 0, isLiked: false,
  })
  commentText.value = ''; showCommentInput.value = false
}
function toggleAudio() {
  audioPlaying.value = !audioPlaying.value
  if (audioPlaying.value) {
    const timer = setInterval(() => {
      if (audioCurrent.value < audioDuration.value) {
        audioCurrent.value++
        audioProgress.value = (audioCurrent.value / audioDuration.value) * 100
      } else { clearInterval(timer); audioPlaying.value = false }
    }, 1000)
  }
}
function goPage(url: string) { uni.navigateTo({ url }) }

setTimeout(() => { loading.value = false }, 500)
</script>

<style scoped>
.article-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 120rpx; }

.nav-fixed { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E3DB; }
.nav-row { display: flex; align-items: center; padding: 0 16rpx; height: 88rpx; }
.nav-back { font-size: 48rpx; color: #333; width: 64rpx; }
.nav-title { flex: 1; font-size: 28rpx; font-weight: 500; color: #2C2C2C; text-align: center; }
.nav-share { font-size: 40rpx; color: #333; padding: 8rpx; }

.skeleton { padding-top: 88rpx; }
.sk-cover { width: 100%; aspect-ratio: 16/9; background: #E8E3DB; }
.sk-body { background: #fff; margin-top: -20rpx; border-radius: 40rpx 40rpx 0 0; padding: 40rpx 32rpx; }
.sk-title { height: 40rpx; background: #F2EFEA; border-radius: 8rpx; width: 75%; margin-bottom: 24rpx; }
.sk-author { height: 40rpx; background: #F2EFEA; border-radius: 8rpx; width: 40%; margin-bottom: 32rpx; }
.sk-line { height: 24rpx; background: #F2EFEA; border-radius: 6rpx; margin-bottom: 16rpx; }

.cover-area { padding-top: 88rpx; }
.cover-img { width: 100%; aspect-ratio: 16/9; display: block; }

.content-card { background: #fff; border-radius: 40rpx 40rpx 0 0; padding: 40rpx 32rpx; position: relative; z-index: 2; }
.content-card.has-cover { margin-top: -40rpx; }

.art-title { font-size: 40rpx; font-weight: 700; color: #2C2C2C; line-height: 1.3; margin-bottom: 20rpx; display: block; }

.tag-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 24rpx; }
.tag { font-size: 22rpx; color: #8B7355; background: #F5F0E8; padding: 4rpx 16rpx; border-radius: 20rpx; }

.author-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.author-left { display: flex; align-items: center; gap: 16rpx; }
.author-avatar, .author-avatar-fb { width: 80rpx; height: 80rpx; border-radius: 50%; border: 2px solid #E8E3DB; }
.author-avatar-fb { background: rgba(196,30,58,0.1); color: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 32rpx; font-weight: 600; }
.author-text { display: flex; flex-direction: column; }
.author-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.author-title { font-size: 22rpx; color: #999; margin-top: 4rpx; }

.follow-btn { padding: 10rpx 32rpx; border-radius: 32rpx; background: #C41E3A; color: #fff; font-size: 24rpx; font-weight: 500; }
.follow-btn.followed { background: #F5F0E8; color: #999; }

.meta-row { display: flex; gap: 32rpx; margin-bottom: 24rpx; }
.meta-row text { font-size: 22rpx; color: #999; }

.ai-summary { padding: 24rpx; background: linear-gradient(135deg, #F5F0E8, #FAF8F5); border-radius: 20rpx; border: 1px solid #E8E3DB; margin-bottom: 24rpx; }
.ai-head { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; }
.ai-icon { font-size: 24rpx; }
.ai-label { font-size: 24rpx; font-weight: 700; color: #C41E3A; }
.ai-text { font-size: 26rpx; color: #666; line-height: 1.6; }
.ai-text.clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ai-toggle { font-size: 24rpx; color: #C41E3A; margin-top: 8rpx; display: block; }

.audio-bar { display: flex; align-items: center; gap: 16rpx; padding: 20rpx; background: #fff; border-radius: 20rpx; border: 1px solid #E8E3DB; margin-bottom: 24rpx; }
.audio-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #E74C3C); display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #fff; }
.audio-progress { flex: 1; }
.audio-track { height: 8rpx; background: #F2EFEA; border-radius: 4rpx; overflow: hidden; margin-bottom: 6rpx; }
.audio-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #E74C3C); border-radius: 4rpx; transition: width 0.3s; }
.audio-times { display: flex; justify-content: space-between; }
.audio-time { font-size: 20rpx; color: #999; }

.art-content { margin-bottom: 32rpx; }

.embed-card { display: flex; gap: 16rpx; padding: 20rpx; background: #fff; border: 1px solid #E8E3DB; border-radius: 20rpx; margin-bottom: 16rpx; }
.embed-img-wrap { width: 160rpx; height: 160rpx; border-radius: 16rpx; overflow: hidden; flex-shrink: 0; background: #F2EFEA; position: relative; }
.embed-img { width: 100%; height: 100%; }
.embed-img-fb { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.embed-lessons { position: absolute; bottom: 8rpx; right: 8rpx; font-size: 18rpx; color: #fff; background: rgba(0,0,0,0.6); padding: 2rpx 10rpx; border-radius: 6rpx; }
.embed-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.embed-type { margin-bottom: 4rpx; }
.embed-type text { font-size: 20rpx; color: #C41E3A; font-weight: 500; }
.embed-type.blue text { color: #4A90D9; }
.embed-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 8rpx; }
.embed-price-row { display: flex; align-items: baseline; gap: 8rpx; }
.embed-price { font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.embed-old { font-size: 22rpx; color: #999; text-decoration: line-through; }
.embed-students { font-size: 20rpx; color: #999; font-weight: 400; margin-left: 8rpx; }
.embed-arrow { font-size: 32rpx; color: #CCC; align-self: center; }

.circle-guide { padding: 28rpx; background: linear-gradient(135deg, #FFF9F0, #FFF5F5); border-radius: 20rpx; border: 1px solid #F0E6D9; margin-bottom: 24rpx; }
.cg-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.cg-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; border: 2px solid #fff; }
.cg-text { font-size: 24rpx; color: #999; }
.cg-card { display: flex; align-items: center; gap: 16rpx; padding: 20rpx; background: #fff; border-radius: 16rpx; }
.cg-img-wrap { width: 96rpx; height: 96rpx; border-radius: 20rpx; overflow: hidden; flex-shrink: 0; background: #F2EFEA; }
.cg-img { width: 100%; height: 100%; }
.cg-img-fb { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.cg-info { flex: 1; min-width: 0; }
.cg-name { font-size: 28rpx; font-weight: 700; color: #2C2C2C; display: block; margin-bottom: 6rpx; }
.cg-stats { font-size: 22rpx; color: #999; }
.cg-join { padding: 12rpx 24rpx; border-radius: 32rpx; background: #C41E3A; color: #fff; font-size: 24rpx; font-weight: 500; }

.other-articles { margin-bottom: 32rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 700; color: #2C2C2C; }
.section-more { font-size: 24rpx; color: #C41E3A; }
.other-item { display: flex; gap: 16rpx; padding: 20rpx; background: #fff; border: 1px solid #E8E3DB; border-radius: 16rpx; margin-bottom: 12rpx; }
.other-text { flex: 1; min-width: 0; }
.other-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 12rpx; }
.other-meta { font-size: 22rpx; color: #999; }
.other-img { width: 128rpx; height: 128rpx; border-radius: 16rpx; flex-shrink: 0; background: #F2EFEA; }

.comment-section { border-top: 1px solid #F0EBE3; padding-top: 28rpx; }
.comment-section .section-title { margin-bottom: 24rpx; }
.comment-item { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.cm-avatar, .cm-avatar-fb { width: 64rpx; height: 64rpx; border-radius: 50%; flex-shrink: 0; }
.cm-avatar-fb { background: #F5F1EB; color: #666; display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.cm-body { flex: 1; min-width: 0; }
.cm-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.cm-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.cm-time { font-size: 22rpx; color: #999; }
.cm-text { font-size: 26rpx; color: #333; line-height: 1.5; display: block; margin-bottom: 12rpx; }
.cm-actions { display: flex; gap: 24rpx; }
.cm-like { font-size: 22rpx; color: #999; }
.cm-like.liked { color: #C41E3A; }
.cm-reply { font-size: 22rpx; color: #999; }
.cm-replies { margin-top: 16rpx; padding: 16rpx; background: #F9F6F2; border-radius: 12rpx; }
.cm-reply-item { margin-bottom: 8rpx; }
.cm-reply-item:last-child { margin-bottom: 0; }
.rp-name { font-size: 24rpx; color: #4A90D9; }
.rp-text { font-size: 24rpx; color: #666; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: #fff; border-top: 1px solid #E8E3DB; display: flex; align-items: center; padding: 12rpx 24rpx; padding-bottom: calc(12rpx + env(safe-area-inset-bottom)); }
.bb-comment { flex: 1; height: 68rpx; background: #F5F0E8; border-radius: 36rpx; display: flex; align-items: center; padding: 0 24rpx; margin-right: 20rpx; }
.bb-comment text { font-size: 26rpx; color: #999; }
.bb-btn { display: flex; flex-direction: column; align-items: center; gap: 2rpx; padding: 0 16rpx; }
.bb-btn text { font-size: 36rpx; }
.bb-btn text.active { color: #C41E3A; }
.bb-num { font-size: 20rpx !important; color: #666; }

.input-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.input-sheet { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); }
.input-row { display: flex; align-items: center; gap: 16rpx; }
.comment-input { flex: 1; height: 72rpx; background: #F5F0E8; border-radius: 36rpx; padding: 0 24rpx; font-size: 26rpx; color: #2C2C2C; }
.send-btn { padding: 16rpx 32rpx; border-radius: 36rpx; background: #C41E3A; color: #fff; font-size: 26rpx; font-weight: 500; }
</style>
