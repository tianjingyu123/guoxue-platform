<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部导航 -->
    <view class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
      <view class="flex items-center justify-between px-4 h-11">
        <view class="w-8 h-8 flex items-center justify-center -ml-2" @click="goBack">
          <text class="text-foreground">←</text>
        </view>
        <text class="text-[14px] font-medium text-foreground">文章详情</text>
        <view class="w-8 h-8 flex items-center justify-center -mr-2" @click="handleShare">
          <text class="text-foreground"></text>
        </view>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="isLoading" class="min-h-screen bg-background animate-pulse">
      <view class="aspect-video bg-[#E8E0D5]" />
      <view class="bg-white -mt-4 rounded-t-[20px] relative z-10 p-4 space-y-4">
        <view class="h-7 bg-[#F2EFEA] rounded w-3/4" />
        <view class="flex items-center gap-3">
          <view class="w-10 h-10 rounded-full bg-[#F2EFEA]" />
          <view class="space-y-2">
            <view class="h-4 w-24 bg-[#F2EFEA] rounded" />
            <view class="h-3 w-16 bg-[#F2EFEA] rounded" />
          </view>
        </view>
        <view class="p-3 bg-[#F9F6F2] rounded-lg space-y-2">
          <view class="h-4 w-20 bg-[#E8E0D5] rounded" />
          <view class="h-3 bg-[#E8E0D5] rounded w-full" />
          <view class="h-3 bg-[#E8E0D5] rounded w-4/5" />
        </view>
        <view class="space-y-3">
          <view v-for="i in 5" :key="i" class="h-4 bg-[#F2EFEA] rounded" :style="{ width: (100 - i * 10) + '%' }" />
        </view>
      </view>
    </view>

    <template v-else-if="article">
      <!-- 封面图 -->
      <view v-if="article.cover" class="pt-11 relative">
        <view class="aspect-video bg-[#E8E0D5]">
          <image :src="article.cover" mode="aspectFill" class="w-full h-full object-cover" />
        </view>
      </view>

      <!-- 内容区 -->
      <view :class="['bg-white rounded-t-[20px] relative z-10', article.cover ? '-mt-4' : 'mt-11']">
        <!-- 标题和标签 -->
        <view class="px-4 pt-5 pb-3">
          <text class="text-[20px] font-bold text-foreground leading-tight mb-3 block">{{ article.title }}</text>

          <!-- 标签 -->
          <view v-if="article.tags && article.tags.length > 0" class="flex flex-wrap gap-2 mb-3">
            <text v-for="tag in article.tags" :key="tag" class="px-2 py-0.5 bg-[#F5F0E8] rounded-full text-[11px] text-[#8B7355]">
              #{{ tag }}
            </text>
          </view>

          <!-- 作者信息 -->
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-3" @click="goToUser(article.author.id)">
              <image :src="article.author.avatar" mode="aspectFill" class="w-10 h-10 rounded-full border border-border" />
              <view>
                <text class="text-[14px] font-medium text-foreground block">{{ article.author.name }}</text>
                <text class="text-[11px] text-muted-foreground block">{{ article.author.title }}</text>
              </view>
            </view>
            <view
              :class="['px-4 py-1.5 rounded-full text-[12px] font-medium transition-all', isFollowed ? 'bg-[#F5F0E8] text-muted-foreground' : 'bg-primary text-white']"
              @click="handleFollow"
            >
              <text>{{ isFollowed ? '已关注' : '+ 关注' }}</text>
            </view>
          </view>

          <!-- 阅读信息 -->
          <view class="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <text class="flex items-center gap-1"> {{ article.views }}阅读</text>
            <text class="flex items-center gap-1">🕐 {{ article.publishedAt }}</text>
          </view>
        </view>

        <!-- AI摘要 -->
        <view v-if="article.aiSummary" class="mx-4 mb-4 p-3 bg-gradient-to-r from-[#F5F0E8] to-[#FAF8F5] rounded-xl border border-border">
          <view class="flex items-center gap-2 mb-2">
            <view class="w-5 h-5 rounded-full bg-gradient-to-r from-primary to-[#E74C3C] flex items-center justify-center">
              <text class="text-white text-[10px]"></text>
            </view>
            <text class="text-[12px] font-bold text-primary">AI 智能摘要</text>
          </view>
          <text :class="['text-[13px] text-ink-soft leading-relaxed transition-all', !aiExpanded ? 'line-clamp-2' : '']" @click="aiExpanded = !aiExpanded">{{ article.aiSummary }}</text>
          <text v-if="article.aiSummary.length > 80" class="text-[12px] text-primary mt-1 block" @click="aiExpanded = !aiExpanded">
            {{ aiExpanded ? '收起' : '展开全部' }}
          </text>
        </view>

        <!-- 语音朗读 -->
        <view v-if="article.audioUrl" class="mx-4 mb-4 p-3 bg-white rounded-xl border border-border shadow-sm">
          <view class="flex items-center gap-3">
            <view
              :class="['w-10 h-10 rounded-full bg-gradient-to-r from-primary to-[#E74C3C] flex items-center justify-center text-white shadow-md active:scale-95 transition-transform']"
              @click="toggleAudioPlay"
            >
              <text class="text-lg">{{ isAudioPlaying ? '⏸' : '▶' }}</text>
            </view>
            <view class="flex-1">
              <view class="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <text>{{ formatAudioTime(audioProgress) }}</text>
                <text>{{ formatAudioTime(audioDuration) }}</text>
              </view>
              <view class="h-1.5 bg-[#F2EFEA] rounded-full overflow-hidden">
                <view
                  class="h-full bg-gradient-to-r from-primary to-[#E74C3C] rounded-full transition-all"
                  :style="{ width: audioDuration > 0 ? (audioProgress / audioDuration * 100) + '%' : '0%' }"
                />
              </view>
            </view>
            <view class="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center">
              <text class="text-ink-soft"></text>
            </view>
          </view>
          <view class="flex items-center gap-1 mt-2">
            <text class="text-accent text-xs"></text>
            <text class="text-[11px] text-muted-foreground">语音朗读 · 支持后台播放</text>
          </view>
        </view>

        <!-- 正文内容 -->
        <view class="px-4 pb-4">
          <rich-text :nodes="articleContentNodes" class="text-[14px] text-[#333] leading-relaxed" />
        </view>

        <!-- 内嵌推荐 - 商品 -->
        <view v-for="product in (article.embeddedProducts || [])" :key="product.id" class="mx-4 my-4 p-3 bg-white rounded-xl border border-border shadow-sm flex gap-3 active:bg-[#F9F6F2]" @click="goToProduct(product.id)">
          <view class="w-20 h-20 rounded-lg overflow-hidden bg-[#F2EFEA] flex-shrink-0">
            <image :src="product.cover" mode="aspectFill" class="w-full h-full" />
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-1 mb-1">
              <text class="text-primary text-xs"></text>
              <text class="text-[10px] text-primary font-medium">相关商品</text>
            </view>
            <text class="text-[13px] font-medium text-foreground line-clamp-2 mb-1 block">{{ product.name }}</text>
            <view class="flex items-baseline gap-1">
              <text class="text-[16px] font-bold text-primary">¥{{ product.price }}</text>
              <text v-if="product.originalPrice" class="text-[11px] text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
            </view>
          </view>
          <text class="text-[#CCC] text-base self-center">›</text>
        </view>

        <!-- 内嵌推荐 - 课程 -->
        <view v-for="course in (article.embeddedCourses || [])" :key="course.id" class="mx-4 my-4 p-3 bg-white rounded-xl border border-border shadow-sm flex gap-3 active:bg-[#F9F6F2]" @click="goToCourse(course.id)">
          <view class="w-20 h-20 rounded-lg overflow-hidden bg-[#F2EFEA] flex-shrink-0 relative">
            <image :src="course.cover" mode="aspectFill" class="w-full h-full" />
            <view class="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 rounded text-[9px] text-white">
              <text>{{ course.lessons }}课时</text>
            </view>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-1 mb-1">
              <text class="text-[#4A90D9] text-xs"></text>
              <text class="text-[10px] text-[#4A90D9] font-medium">相关课程</text>
            </view>
            <text class="text-[13px] font-medium text-foreground line-clamp-2 mb-1 block">{{ course.title }}</text>
            <view class="flex items-center gap-2">
              <text class="text-[14px] font-bold text-primary">¥{{ course.price }}</text>
              <text class="text-[11px] text-muted-foreground">{{ course.students }}人学习</text>
            </view>
          </view>
          <text class="text-[#CCC] text-base self-center">›</text>
        </view>

        <!-- 作者圈子引导 -->
        <view v-if="article.authorCircle" class="mx-4 my-4 p-4 bg-gradient-to-r from-[#FFF9F0] to-[#FFF5F5] rounded-xl border border-[#F0E6D9]">
          <view class="flex items-center gap-2 mb-3">
            <image :src="article.author.avatar" mode="aspectFill" class="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
            <view>
              <text class="text-[12px] font-medium text-foreground">{{ article.author.name }}</text>
              <text class="text-[11px] text-muted-foreground ml-1">的专属圈子</text>
            </view>
          </view>
          <view class="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm active:bg-[#F9F6F2]" @click="goToCircle(article.authorCircle.id)">
            <view class="w-12 h-12 rounded-xl overflow-hidden bg-[#F2EFEA]">
              <image :src="article.authorCircle.cover" mode="aspectFill" class="w-full h-full" />
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-[14px] font-bold text-foreground mb-0.5 block">{{ article.authorCircle.name }}</text>
              <view class="flex items-center gap-2 text-[11px] text-muted-foreground">
                <text class="flex items-center gap-0.5"> {{ article.authorCircle.members }}成员</text>
                <text>· {{ article.authorCircle.postsToday }}条今日动态</text>
              </view>
            </view>
            <view class="px-3 py-1.5 bg-primary text-white text-[12px] font-medium rounded-full">
              <text>加入</text>
            </view>
          </view>
        </view>

        <!-- 作者其他文章 -->
        <view v-if="article.authorOtherArticles && article.authorOtherArticles.length > 0" class="mx-4 my-4">
          <view class="flex items-center justify-between mb-3">
            <text class="text-[14px] font-bold text-foreground">{{ article.author.name }}的其他文章</text>
            <text class="text-[12px] text-primary flex items-center gap-0.5" @click="goToUserArticles(article.author.id)">
              查看更多 ›
            </text>
          </view>
          <view class="space-y-3">
            <view v-for="a in (article.authorOtherArticles || []).slice(0, 3)" :key="a.id" class="flex gap-3 p-3 bg-white rounded-lg border border-border active:bg-[#F9F6F2]" @click="goToArticle(a.id)">
              <view class="flex-1 min-w-0">
                <text class="text-[13px] font-medium text-foreground line-clamp-2 mb-2 block">{{ a.title }}</text>
                <view class="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <text class="flex items-center gap-0.5"> {{ a.views }}</text>
                  <text class="flex items-center gap-0.5">❤ {{ a.likes }}</text>
                </view>
              </view>
              <image v-if="a.cover" :src="a.cover" mode="aspectFill" class="w-16 h-16 rounded-lg shrink-0" />
            </view>
          </view>
        </view>

        <!-- 评论区 -->
        <view class="mt-4 border-t border-[#F0EBE3]">
          <view class="px-4 py-3 flex items-center justify-between">
            <text class="text-[15px] font-bold text-foreground">评论 ({{ article.comments }})</text>
          </view>

          <view v-if="comments.length === 0" class="px-4 pb-6 text-center text-muted-foreground text-sm">
            <text>暂无评论</text>
          </view>

          <view v-for="comment in comments" :key="comment.id" class="px-4 py-3 border-b border-[#F0EBE3]">
            <view class="flex gap-3">
              <image :src="comment.author.avatar" mode="aspectFill" class="w-8 h-8 rounded-full shrink-0" />
              <view class="flex-1">
                <view class="flex items-center gap-2 mb-1">
                  <text class="text-[13px] font-medium text-foreground">{{ comment.author.name }}</text>
                  <text class="text-[11px] text-muted-foreground">{{ comment.createdAt }}</text>
                </view>
                <text class="text-[13px] text-[#333] block">{{ comment.content }}</text>
                <view class="flex items-center gap-3 mt-2">
                  <view class="flex items-center gap-1" @click="likeComment(comment)">
                    <text :class="comment.isLiked ? 'text-primary' : 'text-muted-foreground'">❤</text>
                    <text class="text-[11px] text-muted-foreground">{{ comment.likes }}</text>
                  </view>
                  <text class="text-[11px] text-muted-foreground" @click="showCommentInput = true">回复</text>
                </view>
                <!-- 回复列表 -->
                <view v-if="comment.replies && comment.replies.length > 0" class="mt-2 space-y-2">
                  <view v-for="reply in comment.replies" :key="reply.id" class="flex gap-2">
                    <image :src="reply.author.avatar" mode="aspectFill" class="w-6 h-6 rounded-full shrink-0" />
                    <view>
                      <view class="flex items-center gap-1">
                        <text class="text-[12px] font-medium text-foreground">{{ reply.author.name }}</text>
                        <text class="text-[10px] text-muted-foreground">{{ reply.createdAt }}</text>
                      </view>
                      <text class="text-[12px] text-[#333]">{{ reply.content }}</text>
                    </view>
                  </view>
                </view>
                <text v-if="comment.replyCount > (comment.replies?.length || 0)" class="text-[11px] text-primary mt-1 block">
                  查看全部 {{ comment.replyCount }} 条回复 ›
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border safe-area-inset-bottom">
        <view class="flex items-center justify-around py-2 px-4">
          <view class="flex-1 h-9 bg-[#F5F0E8] rounded-full flex items-center justify-center gap-1 text-[13px] text-muted-foreground mr-4" @click="showCommentInput = true">
            <text></text>
            <text>写评论...</text>
          </view>

          <view class="flex flex-col items-center gap-0.5 px-4" @click="handleLike">
            <text :class="isLiked ? 'text-primary' : 'text-ink-soft'">{{ isLiked ? '❤' : '🤍' }}</text>
            <text class="text-[10px] text-ink-soft">{{ likeCount }}</text>
          </view>

          <view class="flex flex-col items-center gap-0.5 px-4" @click="handleCollect">
            <text :class="isCollected ? 'text-accent' : 'text-ink-soft'">{{ isCollected ? '' : '☆' }}</text>
            <text class="text-[10px] text-ink-soft">{{ collectCount }}</text>
          </view>

          <view class="flex flex-col items-center gap-0.5 px-4" @click="handleShare">
            <text class="text-ink-soft"></text>
            <text class="text-[10px] text-ink-soft">分享</text>
          </view>
        </view>
      </view>

      <!-- 评论输入弹窗 -->
      <view v-if="showCommentInput" class="fixed inset-0 z-[60] bg-black/50" @click="showCommentInput = false">
        <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 safe-area-inset-bottom" @click.stop>
          <view class="flex items-center gap-3">
            <input
              v-model="commentText"
              type="text"
              placeholder="写下你的评论..."
              class="flex-1 h-10 px-4 bg-[#F5F0E8] rounded-full text-[14px] outline-none"
            />
            <view class="px-4 py-2 bg-primary text-white text-[14px] font-medium rounded-full" @click="submitComment">
              <text>发送</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

function goBack() { uni.navigateBack() }

// 类型定义
interface Author {
  id: string; name: string; avatar: string; title: string; followers: number; isFollowed: boolean
}

interface Reply {
  id: string; content: string; author: { id: string; name: string; avatar: string }; createdAt: string; likes: number; isLiked: boolean
}

interface Comment {
  id: string; content: string; author: { id: string; name: string; avatar: string }; createdAt: string; likes: number; isLiked: boolean; replies?: Reply[]; replyCount?: number
}

interface Article {
  id: string; type: string; title: string; content: string; cover?: string
  author: Author; publishedAt: string; views: number; likes: number; collects: number; comments: number
  isLiked: boolean; isCollected: boolean; tags: string[]
  aiSummary?: string; audioUrl?: string
  embeddedProducts?: any[]; embeddedCourses?: any[]
  authorCircle?: any; authorOtherArticles?: any[]
}

// 默认数据
const defaultArticle: Article = {
  id: '1', type: 'article',
  title: '八字命理入门：如何看懂你的命盘',
  content: `<p>八字命理，又称四柱命理，是中国传统命理学的重要分支。它通过分析一个人出生时的年、月、日、时四柱天干地支，来推断人的命运走势。</p>
    <h2>什么是八字</h2><p>八字是指一个人出生时的年、月、日、时所对应的天干地支，共八个字，故称"八字"。</p>
    <h2>天干地支基础</h2><p><strong>十天干：</strong>甲、乙、丙、丁、戊、己、庚、辛、壬、癸</p>
    <p><strong>十二地支：</strong>子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥</p>
    <h2>五行相生相克</h2><ul><li>相生：木生火、火生土、土生金、金生水、水生木</li><li>相克：木克土、土克水、水克火、火克金、金克木</li></ul>`,
  cover: '/images/courses/course-1.jpg',
  author: { id: 'author-1', name: '周易大师', avatar: '/images/experts/expert-1.jpg', title: '资深命理师 | 20年从业经验', followers: 12800, isFollowed: false },
  publishedAt: '2024-03-15', views: 8560, likes: 1280, collects: 560, comments: 128,
  isLiked: false, isCollected: false,
  tags: ['八字入门', '命理学', '五行'],
  aiSummary: '本文介绍了八字命理的基础概念，包括天干地支、五行相生相克、日主与十神等核心知识点。八字命理通过分析出生时的年月日时四柱，推断人的命运走势，是中国传统命理学的重要分支。',
  audioUrl: '/audio/article-1.mp3',
  embeddedProducts: [{ id: 'p1', name: '《渊海子平》精装典藏版', cover: '/images/products/book-1.jpg', price: 68, originalPrice: 128 }],
  embeddedCourses: [{ id: 'c1', title: '八字入门实战课：从零开始学命理', cover: '/images/courses/course-1.jpg', price: 199, lessons: 32, students: 2860 }],
  authorCircle: { id: 'circle-1', name: '周易大师研习社', cover: '/images/circles/circle-1.jpg', members: 12800, postsToday: 56 },
  authorOtherArticles: [
    { id: 'a2', title: '紫微斗数与八字命理的区别与联系', cover: '/images/feed/article-1.jpg', views: 3200, likes: 456 },
    { id: 'a3', title: '如何从八字看财运旺衰', views: 5600, likes: 890 },
    { id: 'a4', title: '八字合婚的基本原则', cover: '/images/feed/article-2.jpg', views: 4500, likes: 678 },
  ],
}

const defaultComments: Comment[] = [
  { id: 'c1', content: '写得很好，对初学者很友好，期待更多入门教程！', author: { id: 'u1', name: '国学爱好者', avatar: '/images/avatars/avatar-1.jpg' }, createdAt: '2小时前', likes: 56, isLiked: false, replies: [{ id: 'c1-r1', content: '同感！终于找到一篇能看懂的入门文章', author: { id: 'u2', name: '命理新手', avatar: '/images/avatars/avatar-2.jpg' }, createdAt: '1小时前', likes: 12, isLiked: false }], replyCount: 3 },
  { id: 'c2', content: '五行相生相克那部分讲得特别清楚，以前总是记不住', author: { id: 'u3', name: '学习中', avatar: '/images/avatars/avatar-3.jpg' }, createdAt: '5小时前', likes: 34, isLiked: true },
]

// 状态
const article = ref<Article | null>(null)
const comments = ref<Comment[]>([])
const isLoading = ref(true)
const isFollowed = ref(false)
const isLiked = ref(false)
const isCollected = ref(false)
const likeCount = ref(0)
const collectCount = ref(0)
const showCommentInput = ref(false)
const commentText = ref('')
const aiExpanded = ref(false)
const isAudioPlaying = ref(false)
const audioProgress = ref(0)
const audioDuration = ref(0)
const articleContentNodes = ref<any[]>([])

// 加载数据
async function loadData() {
  isLoading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 800))
    article.value = defaultArticle
    comments.value = defaultComments
    isFollowed.value = defaultArticle.author.isFollowed
    isLiked.value = defaultArticle.isLiked
    isCollected.value = defaultArticle.isCollected
    likeCount.value = defaultArticle.likes
    collectCount.value = defaultArticle.collects
    articleContentNodes.value = [{ name: 'div', attrs: { class: 'article-body' }, children: [{ type: 'text', text: defaultArticle.content }] }]
  } catch (e) {
    console.error('加载文章失败', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => { loadData() })

// 交互
function handleFollow() {
  const prev = isFollowed.value
  isFollowed.value = !isFollowed.value
  try {
    // API call would go here
  } catch (e) {
    isFollowed.value = prev
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function handleLike() {
  const prevLiked = isLiked.value
  const prevCount = likeCount.value
  const newLiked = !isLiked.value
  isLiked.value = newLiked
  likeCount.value += newLiked ? 1 : -1
  try {
    // API call would go here
  } catch (e) {
    isLiked.value = prevLiked
    likeCount.value = prevCount
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function handleCollect() {
  const prevCollected = isCollected.value
  const prevCount = collectCount.value
  const newCollected = !isCollected.value
  isCollected.value = newCollected
  collectCount.value += newCollected ? 1 : -1
  try {
    // API call would go here
  } catch (e) {
    isCollected.value = prevCollected
    collectCount.value = prevCount
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function handleShare() {
  uni.setClipboardData({ data: window.location.href || '分享链接', success() { uni.showToast({ title: '链接已复制', icon: 'none' }) } })
}

function submitComment() {
  if (!commentText.value.trim()) return
  comments.value.push({
    id: 'u_' + Date.now(), content: commentText.value,
    author: { id: 'me', name: '我', avatar: '' },
    createdAt: '刚刚', likes: 0, isLiked: false,
  })
  commentText.value = ''
  showCommentInput.value = false
}

function likeComment(comment: Comment) {
  comment.isLiked = !comment.isLiked
  comment.likes += comment.isLiked ? 1 : -1
}

const audioCurrentTime = ref(0)

function toggleAudioPlay() {
  isAudioPlaying.value = !isAudioPlaying.value
  if (!isAudioPlaying.value) {
    try { uni.setStorageSync('article_audio_time', audioCurrentTime.value) } catch (e) { /* noop */ }
  }
}

function onAudioTimeUpdate(e: any) {
  audioCurrentTime.value = e.detail?.currentTime || 0
  audioDuration.value = e.detail?.duration || 0
}

function onAudioEnded() {
  isAudioPlaying.value = false
  audioCurrentTime.value = 0
  try { uni.removeStorageSync('article_audio_time') } catch (e) { /* noop */ }
}

function formatAudioTime(time: number): string {
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

// 导航
function goToUser(id: string) { uni.navigateTo({ url: `/pages/user/${id}` }) }
function goToProduct(id: string) { uni.navigateTo({ url: `/pages/mall/product/${id}` }) }
function goToCourse(id: string) { uni.navigateTo({ url: `/pages/courses/${id}` }) }
function goToCircle(id: string) { uni.navigateTo({ url: `/pages/circles/${id}` }) }
function goToUserArticles(id: string) { uni.navigateTo({ url: `/pages/user/${id}/articles` }) }
function goToArticle(id: string) { uni.navigateTo({ url: `/pages/articles/${id}` }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
