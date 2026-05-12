<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading && !circle" class="skeleton-page">
      <view class="skeleton-header" />
      <view class="skeleton-body">
        <view v-for="i in 4" :key="i" class="skeleton-post" />
      </view>
    </view>

    <!-- 内容区 -->
    <template v-else-if="circle">
      <!-- 圈子头部 -->
      <view class="header">
        <image v-if="circle.cover" :src="circle.cover" class="cover" mode="aspectFill" />
        <view v-else class="cover-placeholder">
          <text class="placeholder-icon">👥</text>
        </view>
        <text class="name">{{ circle.name }}</text>
        <text class="intro">{{ circle.intro || '暂无简介' }}</text>
        <view class="stats">
          <text class="stat-item">👤 {{ circle.memberCount || 0 }} 成员</text>
          <text class="stat-item">📝 {{ circle.postCount || 0 }} 帖子</text>
        </view>
        <view class="tags" v-if="circle.tags?.length">
          <text v-for="t in circle.tags" :key="t" class="tag">{{ t }}</text>
        </view>
        <!-- 加入/退出按钮 -->
        <button
          v-if="!joined"
          class="action-btn join"
          :disabled="joining"
          @click="joinCircle"
        >
          {{ joining ? '加入中...' : '加入圈子' }}
        </button>
        <button
          v-else
          class="action-btn leave"
          :disabled="leaving"
          @click="leaveCircle"
        >
          {{ leaving ? '退出中...' : '退出圈子' }}
        </button>
      </view>

      <!-- 标签筛选：全部/精华 -->
      <view class="tab-bar">
        <view
          v-for="tab in postTabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: currentPostTab === tab.key }"
          @click="switchPostTab(tab.key)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <!-- 发帖按钮（已加入才显示） -->
      <view v-if="joined" class="create-post-btn" @click="showCreatePanel">
        <text class="create-post-icon">✏️</text>
        <text class="create-post-text">分享你的见解...</text>
      </view>

      <!-- 帖子列表 -->
      <view v-if="loadingPosts && posts.length === 0" class="post-loading">
        <view v-for="i in 3" :key="i" class="skeleton-post" />
      </view>
      <view v-else-if="posts.length > 0" class="post-list">
        <view v-for="post in posts" :key="post.id" class="post-card">
          <view class="post-header">
            <view class="post-user-info">
              <image
                v-if="post.author?.avatar"
                :src="post.author.avatar"
                class="post-avatar"
                mode="aspectFill"
              />
              <view class="post-user-meta">
                <text class="post-user">{{ post.author?.nickname || '匿名' }}</text>
                <text class="post-time">{{ formatTime(post.createdAt) }}</text>
              </view>
            </view>
            <view class="post-badges">
              <text v-if="post.isTop" class="badge top">置顶</text>
              <text v-if="post.isEssence" class="badge essence">精华</text>
            </view>
          </view>
          <text class="post-title" v-if="post.title">{{ post.title }}</text>
          <text class="post-body">{{ post.content }}</text>
          <!-- 帖子图片 -->
          <view v-if="post.images?.length" class="post-images">
            <image
              v-for="(img, idx) in post.images"
              :key="idx"
              :src="img"
              mode="aspectFill"
              class="post-img"
              @click="previewImages(post.images, idx)"
            />
          </view>
          <!-- 互动栏 -->
          <view class="post-footer">
            <view class="footer-item" @click="toggleLike(post)">
              <text>{{ post.isLiked ? '❤️' : '🤍' }}</text>
              <text class="footer-count">{{ post.likeCount || 0 }}</text>
            </view>
            <view class="footer-item">
              <text>💬</text>
              <text class="footer-count">{{ post.commentCount || 0 }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 帖子空状态 -->
      <EmptyState v-else-if="!loadingPosts && posts.length === 0" icon="📝" text="暂无帖子，快来发表第一条吧" />

      <!-- 帖子加载更多 -->
      <view v-if="loadingMorePosts" class="load-more">加载更多...</view>
      <view v-if="!hasMorePosts && posts.length > 0" class="no-more">— 已全部加载 —</view>
    </template>

    <!-- 异常状态 -->
    <view v-if="!loading && !circle" class="error-state">
      <EmptyState icon="⚠️" text="圈子加载失败" />
      <button class="retry-btn" @click="initData">重新加载</button>
    </view>

    <!-- 圈主助理悬浮按钮 -->
    <view v-if="hasBot" class="bot-fab" @click="openBotChat">
      <text class="bot-fab-icon">🤖</text>
      <text class="bot-fab-label">AI助理</text>
    </view>

    <!-- 发帖弹窗 -->
    <view v-if="showPostPanel" class="post-mask" @click="hideCreatePanel">
      <view class="post-panel" @click.stop="">
        <view class="panel-header">
          <text class="panel-title">发表帖子</text>
          <text class="panel-close" @click="hideCreatePanel">✕</text>
        </view>
        <input
          v-model="postTitle"
          placeholder="标题（选填）"
          class="post-title-input"
          maxlength="60"
        />
        <textarea
          v-model="postContent"
          placeholder="分享你的见解..."
          class="post-content-input"
          maxlength="500"
        />
        <view class="panel-images" v-if="postImages.length > 0">
          <view v-for="(img, idx) in postImages" :key="idx" class="panel-img-wrap">
            <image :src="img" class="panel-img" mode="aspectFill" />
            <text class="panel-img-remove" @click="removeImage(idx)">×</text>
          </view>
        </view>
        <view class="panel-actions">
          <view class="panel-left">
            <text class="add-img-btn" @click="chooseImage">🖼 添加图片</text>
          </view>
          <view class="panel-right">
            <text class="char-count">{{ postContent.length }}/500</text>
            <button
              class="submit-btn"
              :disabled="!postContent.trim() || submitting"
              @click="submitPost"
            >
              {{ submitting ? '发布中...' : '发布' }}
            </button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { circleApi, botApi } from '../../api'
import EmptyState from '../../components/EmptyState.vue'

/** 帖子数据类型 */
interface CirclePost {
  id: string
  title?: string
  content: string
  images?: string[]
  author?: {
    id: string
    nickname: string
    avatar: string
  }
  likeCount?: number
  commentCount?: number
  isLiked?: boolean
  isTop?: boolean
  isEssence?: boolean
  createdAt?: string
}

/** 帖子筛选标签 */
const postTabs = [
  { key: '', label: '全部' },
  { key: 'essence', label: '精华' },
]

// 页面参数
const id = ref('')

// 圈子数据
const circle = ref<any>(null)
const joined = ref(false)
const loading = ref(false)

// 加入/退出状态
const joining = ref(false)
const leaving = ref(false)

// 帖子筛选
const currentPostTab = ref('')

// 帖子列表
const posts = ref<CirclePost[]>([])
const loadingPosts = ref(false)
const loadingMorePosts = ref(false)
const hasMorePosts = ref(true)
const postPage = ref(1)
const pageSize = 10

// 智能体助理
const hasBot = ref(false)
const botData = ref<any>(null)

// 发帖
const showPostPanel = ref(false)
const postTitle = ref('')
const postContent = ref('')
const postImages = ref<string[]>([])
const submitting = ref(false)

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  id.value = opts.id || ''
  if (id.value) initData()
})

// 切换帖子标签
function switchPostTab(key: string) {
  if (currentPostTab.value === key) return
  currentPostTab.value = key
  postPage.value = 1
  hasMorePosts.value = true
  fetchPosts(true)
}

// 下拉刷新
onPullDownRefresh(() => {
  postPage.value = 1
  hasMorePosts.value = true
  fetchPosts(true).finally(() => {
    uni.stopPullDownRefresh()
  })
})

// 上拉加载更多
onReachBottom(() => {
  if (!hasMorePosts.value || loadingMorePosts.value) return
  loadingMorePosts.value = true
  postPage.value++
  fetchPosts(false).finally(() => {
    loadingMorePosts.value = false
  })
})

async function initData() {
  loading.value = true
  try {
    const [circleData, postData] = await Promise.all([
      circleApi.detail(id.value).catch(() => null),
      circleApi.posts(id.value, { page: 1, pageSize }).catch(() => ({ posts: [] })),
    ])

    if (circleData) {
      circle.value = {
        id: circleData.id,
        name: circleData.name,
        cover: circleData.cover,
        intro: circleData.intro || circleData.description,
        memberCount: circleData.memberCount ?? 0,
        postCount: circleData.postCount ?? 0,
        tags: circleData.tags,
        isJoined: circleData.isJoined ?? circleData.joined ?? false,
      }
      joined.value = circle.value.isJoined
    }

    // 检查圈子智能体
    botApi.circleBots(id.value).then((res: any) => {
      const cfg = res?.botConfig
      if (cfg) {
        hasBot.value = true
        botData.value = cfg
      }
    }).catch(() => {})

    // 处理帖子
    const rawPosts: any[] = postData.list || postData.items || postData.data || postData || []
    posts.value = rawPosts
      .filter((p: any) => p && p.id)
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        images: p.images,
        author: p.author || p.user,
        likeCount: p.likeCount ?? 0,
        commentCount: p.commentCount ?? 0,
        isLiked: p.isLiked ?? p.liked ?? false,
        isTop: p.isTop ?? false,
        isEssence: p.isEssence ?? false,
        createdAt: p.createdAt,
      }))
    hasMorePosts.value = rawPosts.length >= pageSize
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function fetchPosts(reset: boolean) {
  if (reset) loadingPosts.value = true
  try {
    const params: Record<string, any> = { page: postPage.value, pageSize }
    if (currentPostTab.value === 'essence') {
      params.essence = true
    }
    const data = await circleApi.posts(id.value, params)
    const rawPosts: any[] = data.list || data.items || data.data || data || []
    const mapped: CirclePost[] = rawPosts
      .filter((p: any) => p && p.id)
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        images: p.images,
        author: p.author || p.user,
        likeCount: p.likeCount ?? 0,
        commentCount: p.commentCount ?? 0,
        isLiked: p.isLiked ?? p.liked ?? false,
        isTop: p.isTop ?? false,
        isEssence: p.isEssence ?? false,
        createdAt: p.createdAt,
      }))
    if (reset) {
      posts.value = mapped
    } else {
      const existIds = new Set(posts.value.map((x) => x.id))
      const news = mapped.filter((x) => !existIds.has(x.id))
      posts.value.push(...news)
    }
    hasMorePosts.value = rawPosts.length >= pageSize
  } catch {
    if (reset) posts.value = []
  } finally {
    if (reset) loadingPosts.value = false
  }
}

// 加入圈子
async function joinCircle() {
  if (joining.value) return
  joining.value = true
  try {
    await circleApi.join(id.value)
    joined.value = true
    if (circle.value) {
      circle.value.memberCount = (circle.value.memberCount || 0) + 1
    }
    uni.showToast({ title: '已加入圈子', icon: 'success' })
  } catch {
    uni.showToast({ title: '加入失败', icon: 'none' })
  } finally {
    joining.value = false
  }
}

// 退出圈子
async function leaveCircle() {
  if (leaving.value) return
  leaving.value = true
  try {
    await circleApi.leave(id.value)
    joined.value = false
    if (circle.value) {
      circle.value.memberCount = Math.max(0, (circle.value.memberCount || 1) - 1)
    }
    uni.showToast({ title: '已退出圈子' })
  } catch {
    uni.showToast({ title: '退出失败', icon: 'none' })
  } finally {
    leaving.value = false
  }
}

// 显示发帖面板
function showCreatePanel() {
  showPostPanel.value = true
}
function hideCreatePanel() {
  showPostPanel.value = false
}

// 选择图片
function chooseImage() {
  const remain = 9 - postImages.value.length
  if (remain <= 0) {
    uni.showToast({ title: '最多9张图片', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      postImages.value.push(...(res.tempFilePaths || []))
    },
  })
}

function removeImage(idx: number) {
  postImages.value.splice(idx, 1)
}

// 发布帖子
async function submitPost() {
  const content = postContent.value.trim()
  if (!content || submitting.value) return
  submitting.value = true
  try {
    const data: Record<string, any> = { content }
    if (postTitle.value.trim()) {
      data.title = postTitle.value.trim()
    }
    if (postImages.value.length > 0) {
      data.images = postImages.value
    }
    await circleApi.createPost(id.value, data)
    uni.showToast({ title: '发布成功', icon: 'success' })

    // 重置表单
    postTitle.value = ''
    postContent.value = ''
    postImages.value = []
    showPostPanel.value = false

    // 刷新帖子列表
    postPage.value = 1
    hasMorePosts.value = true
    await fetchPosts(true)

    if (circle.value) {
      circle.value.postCount = (circle.value.postCount || 0) + 1
    }
  } catch {
    uni.showToast({ title: '发布失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// 打开智能体对话
function openBotChat() {
  if (!botData.value) return
  const encoded = encodeURIComponent(JSON.stringify(botData.value))
  uni.navigateTo({ url: `/pages/bots/bot-chat?bot=${encoded}` })
}

// 点赞
function toggleLike(post: CirclePost) {
  post.isLiked = !post.isLiked
  post.likeCount = (post.likeCount || 0) + (post.isLiked ? 1 : -1)
}

// 图片预览
function previewImages(images: string[], idx: number) {
  uni.previewImage({ current: images[idx], urls: images })
}

// 时间格式化
function formatTime(timeStr?: string): string {
  if (!timeStr) return ''
  try {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return minutes + '分钟前'
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return hours + '小时前'
    const days = Math.floor(hours / 24)
    if (days < 7) return days + '天前'
    return timeStr.slice(0, 10)
  } catch {
    return timeStr.slice(0, 10)
  }
}
</script>

<style>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 20px;
}

/* ===== 骨架屏 ===== */
.skeleton-page {
  padding: 12px;
}
.skeleton-header {
  height: 200px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 16px;
}
.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skeleton-post,
.post-loading .skeleton-post {
  height: 120px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ===== 圈子头部 ===== */
.header {
  background: #fff;
  padding: 20px 16px;
  text-align: center;
}
.cover {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  margin: 0 auto 10px;
}
.cover-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  margin: 0 auto 10px;
  background: #f0e8d8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder-icon {
  font-size: 36px;
}
.name {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  display: block;
}
.intro {
  font-size: 13px;
  color: #888;
  margin: 6px 0;
  display: block;
}
.stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 13px;
  color: #C41E3A;
  margin: 8px 0;
}
.tags {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 6px 0;
  flex-wrap: wrap;
}
.tag {
  font-size: 12px;
  color: #C41E3A;
  background: #F5F0E8;
  padding: 2px 12px;
  border-radius: 12px;
}

/* 加入/退出按钮 */
.action-btn {
  display: inline-block;
  border-radius: 20px;
  padding: 8px 36px;
  font-size: 15px;
  margin-top: 12px;
  border: none;
  color: #fff;
}
.action-btn.join {
  background: #C41E3A;
}
.action-btn.join:active {
  background: #7a3a0f;
}
.action-btn.leave {
  background: #E8E0D5;
  color: #666;
}
.action-btn:disabled {
  opacity: 0.6;
}

/* ===== 帖子标签筛选 ===== */
.tab-bar {
  display: flex;
  gap: 8px;
  padding: 12px 16px 0;
  background: #fff;
}
.tab-item {
  padding: 6px 18px;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
  background: #F5F0E8;
}
.tab-item.active {
  color: #fff;
  background: #C41E3A;
}

/* ===== 发帖快捷入口 ===== */
.create-post-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  margin: 10px 12px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid #E8E0D5;
}
.create-post-icon {
  font-size: 18px;
}
.create-post-text {
  font-size: 14px;
  color: #bbb;
  flex: 1;
}

/* ===== 帖子列表 ===== */
.post-list {
  padding: 0 12px;
}
.post-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.post-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.post-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}
.post-user-meta {
  display: flex;
  flex-direction: column;
}
.post-user {
  font-size: 14px;
  font-weight: bold;
  color: #C41E3A;
}
.post-time {
  font-size: 11px;
  color: #ccc;
}
.post-badges {
  display: flex;
  gap: 4px;
}
.badge {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 8px;
}
.badge.top {
  color: #C41E3A;
  background: #fde8e8;
}
.badge.essence {
  color: #C9A96E;
  background: #fdf5e6;
}
.post-title {
  font-size: 15px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 4px;
}
.post-body {
  font-size: 14px;
  color: #444;
  line-height: 1.7;
  display: block;
}
.post-images {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  overflow-x: auto;
  flex-wrap: wrap;
}
.post-img {
  width: 100px;
  height: 100px;
  border-radius: 6px;
  flex-shrink: 0;
}
.post-footer {
  display: flex;
  gap: 24px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #F5F0E8;
}
.footer-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
}
.footer-count {
  font-size: 12px;
}

/* ===== 空状态 & 错误 ===== */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
}
.retry-btn {
  background: #C41E3A;
  color: #fff;
  border-radius: 20px;
  padding: 8px 32px;
  font-size: 14px;
  border: none;
  margin-top: 8px;
}

/* ===== 加载更多 ===== */
.load-more {
  text-align: center;
  color: #C9A96E;
  padding: 16px 0;
  font-size: 13px;
}
.no-more {
  text-align: center;
  color: #ccc;
  padding: 16px 0;
  font-size: 12px;
}

/* ===== 圈主助理悬浮按钮 ===== */
.bot-fab {
  position: fixed;
  right: 16px;
  bottom: 100px;
  background: linear-gradient(135deg, #C41E3A, #C9A96E);
  color: #fff;
  border-radius: 28px;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  z-index: 200;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.35);
}
.bot-fab:active {
  transform: scale(0.95);
  opacity: 0.9;
}
.bot-fab-icon {
  font-size: 26px;
}
.bot-fab-label {
  font-size: 10px;
}

/* ===== 发帖弹窗 ===== */
.post-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 300;
  display: flex;
  align-items: flex-end;
}
.post-panel {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 16px;
  max-height: 80vh;
  overflow-y: auto;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.panel-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}
.panel-close {
  font-size: 20px;
  color: #999;
  padding: 4px;
}
.post-title-input {
  width: 100%;
  height: 40px;
  border: 1px solid #E8E0D5;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 14px;
  color: #333;
  box-sizing: border-box;
  margin-bottom: 8px;
}
.post-content-input {
  width: 100%;
  min-height: 100px;
  border: 1px solid #E8E0D5;
  border-radius: 6px;
  padding: 10px;
  font-size: 14px;
  color: #333;
  box-sizing: border-box;
}
.panel-images {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.panel-img-wrap {
  position: relative;
  width: 72px;
  height: 72px;
}
.panel-img {
  width: 100%;
  height: 100%;
  border-radius: 6px;
}
.panel-img-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  background: #C41E3A;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 18px;
  font-size: 14px;
  font-weight: bold;
}
.panel-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}
.panel-left {
  display: flex;
  align-items: center;
}
.add-img-btn {
  font-size: 13px;
  color: #C41E3A;
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid #E8E0D5;
  background: #fafaf5;
}
.panel-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.char-count {
  font-size: 12px;
  color: #ccc;
}
.submit-btn {
  background: #C41E3A;
  color: #fff;
  border-radius: 16px;
  padding: 6px 20px;
  font-size: 13px;
  border: none;
}
.submit-btn:disabled {
  background: #d0c8b8;
}
</style>
