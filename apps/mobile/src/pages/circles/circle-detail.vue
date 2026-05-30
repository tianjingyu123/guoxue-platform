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

      <!-- 内容Tab：帖子/文章/课程/问答 -->
      <view class="tab-bar scroll-tabs">
        <view
          v-for="tab in contentTabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeContentTab === tab.key }"
          @click="switchContentTab(tab.key)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <!-- 帖子子筛选（仅在帖子Tab下显示） -->
      <view v-if="activeContentTab === 'posts'" class="sub-tab-bar">
        <view
          v-for="st in postSubTabs"
          :key="st.key"
          class="sub-tab-item"
          :class="{ active: currentPostTab === st.key }"
          @click="switchPostTab(st.key)"
        >
          <text>{{ st.label }}</text>
        </view>
      </view>

      <!-- 发帖/写文章/发课程按钮（已加入才显示） -->
      <view v-if="joined" class="create-post-btn" @click="showCreatePanel">
        <text class="create-post-icon">✏️</text>
        <text class="create-post-text">{{ createBtnText }}</text>
      </view>

      <!-- ====== 帖子列表 ====== -->
      <template v-if="activeContentTab === 'posts'">
        <view v-if="loadingPosts && posts.length === 0" class="post-loading">
          <view v-for="i in 3" :key="i" class="skeleton-post" />
        </view>
        <view v-else-if="posts.length > 0" class="post-list">
          <view v-for="post in posts" :key="post.id" class="post-card" @click="goPostDetail(post)">
            <view class="post-header">
              <view class="post-user-info">
                <image v-if="post.author?.avatar" :src="post.author.avatar" class="post-avatar" mode="aspectFill" />
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
            <view v-if="post.images?.length" class="post-images">
              <image v-for="(img, idx) in post.images" :key="idx" :src="img" mode="aspectFill" class="post-img" @click="previewImages(post.images, idx)" />
            </view>
            <view class="post-footer">
              <view class="footer-item" @click.stop="toggleLike(post)"><text>{{ post.isLiked ? '❤️' : '🤍' }}</text><text class="footer-count">{{ post.likeCount || 0 }}</text></view>
              <view class="footer-item"><text>💬</text><text class="footer-count">{{ post.commentCount || 0 }}</text></view>
            </view>
          </view>
        </view>
        <EmptyState v-else-if="!loadingPosts && posts.length === 0" icon="📝" text="暂无帖子，快来发表第一条吧" />
        <view v-if="loadingMorePosts" class="load-more">加载更多...</view>
        <view v-if="!hasMorePosts && posts.length > 0" class="no-more">— 已全部加载 —</view>
      </template>

      <!-- ====== 文章列表 ====== -->
      <template v-if="activeContentTab === 'articles'">
        <view v-if="loadingArticles" class="post-loading"><view v-for="i in 3" :key="i" class="skeleton-post" /></view>
        <view v-else-if="articles.length > 0" class="post-list">
          <view v-for="article in articles" :key="article.id" class="article-card" @click="goArticleDetail(article)">
            <image v-if="article.cover" :src="article.cover" class="article-cover" mode="aspectFill" />
            <text class="article-title">{{ article.title }}</text>
            <text class="article-excerpt">{{ article.excerpt || article.content?.replace(/<[^>]+>/g, '').slice(0, 80) }}</text>
            <view class="article-meta">
              <text class="article-author">{{ article.user?.nickname || article.author?.nickname || '匿名' }}</text>
              <text class="article-stats">{{ article.viewCount || 0 }}阅读 {{ article.likeCount || 0 }}赞</text>
            </view>
          </view>
        </view>
        <EmptyState v-else icon="📄" text="暂无文章" />
        <view v-if="loadingMoreArticles" class="load-more">加载更多...</view>
      </template>

      <!-- ====== 课程列表 ====== -->
      <template v-if="activeContentTab === 'courses'">
        <view v-if="loadingCourses" class="post-loading"><view v-for="i in 3" :key="i" class="skeleton-post" /></view>
        <view v-else-if="courses.length > 0" class="post-list">
          <view v-for="course in courses" :key="course.id" class="course-card" @click="goCourseDetail(course)">
            <image v-if="course.cover" :src="course.cover" class="course-cover" mode="aspectFill" />
            <view class="course-info">
              <text class="course-title">{{ course.title }}</text>
              <text class="course-intro">{{ course.intro || '' }}</text>
              <view class="course-meta">
                <text class="course-type">{{ { VIDEO: '视频', AUDIO: '音频', TEXT: '图文', EBOOK: '电子书' }[course.type] || course.type }}</text>
                <text class="course-price" v-if="course.price > 0">¥{{ course.price }}</text>
                <text class="course-price free" v-else>免费</text>
                <text class="course-students">{{ course.studentCount || 0 }}人学习</text>
              </view>
            </view>
          </view>
        </view>
        <EmptyState v-else icon="📚" text="暂无课程" />
        <view v-if="loadingMoreCourses" class="load-more">加载更多...</view>
      </template>

      <!-- ====== 问答列表 ====== -->
      <template v-if="activeContentTab === 'questions'">
        <view v-if="loadingQuestions" class="post-loading"><view v-for="i in 3" :key="i" class="skeleton-post" /></view>
        <view v-else-if="questions.length > 0" class="post-list">
          <view v-for="q in questions" :key="q.id" class="question-card" @click="goQuestionDetail(q)">
            <view class="q-header">
              <text class="q-status" :class="q.status">{{ q.status === 'ANSWERED' ? '已回答' : q.status === 'PENDING' ? '待回答' : q.status }}</text>
              <text class="q-price">{{ q.priceCoin }}币</text>
            </view>
            <text class="q-title">{{ q.questionTitle || q.question?.slice(0, 80) }}</text>
            <view class="q-footer">
              <text class="q-answerer">{{ q.answerer?.nickname ? '向 ' + q.answerer.nickname + ' 提问' : '公开提问' }}</text>
              <text class="q-peek" v-if="q.peekCount">{{ q.peekCount }}人围观</text>
            </view>
          </view>
        </view>
        <EmptyState v-else icon="❓" text="暂无问答" />
      </template>

      <!-- ====== 直播列表 ====== -->
      <template v-if="activeContentTab === 'lives'">
        <view v-if="loadingLives" class="post-loading"><view v-for="i in 3" :key="i" class="skeleton-post" /></view>
        <view v-else-if="lives.length > 0" class="post-list">
          <view v-for="live in lives" :key="live.id" class="live-card" @click="goLiveRoom(live)">
            <view class="live-cover-wrap">
              <image v-if="live.cover" :src="live.cover" class="live-cover" mode="aspectFill" />
              <view v-else class="live-cover-placeholder">
                <text class="live-placeholder-icon">📡</text>
              </view>
              <view class="live-status-badge" :class="live.status">
                <text>{{ { LIVE: '直播中', SCHEDULED: '预告', ENDED: '已结束', REPLAY: '回放' }[live.status] || live.status }}</text>
              </view>
            </view>
            <view class="live-info">
              <text class="live-title">{{ live.title }}</text>
              <view class="live-meta">
                <text class="live-host">{{ live.user?.nickname || '主播' }}</text>
                <text class="live-time">{{ live.startTime ? formatTime(live.startTime) : '待定' }}</text>
              </view>
            </view>
          </view>
        </view>
        <EmptyState v-else icon="📡" text="暂无直播" />
      </template>
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
        <!-- 音频预览 -->
        <view v-if="postAudioUrl" class="panel-audio">
          <view class="audio-play-btn" @click="togglePanelAudio">
            <text>{{ audioPlaying ? '⏸' : '▶' }}</text>
          </view>
          <view class="audio-wave">
            <view v-for="i in 20" :key="i" class="audio-bar" :style="{ height: (8 + Math.sin(i * 0.5) * 6 + Math.random() * 4) + 'px' }" />
          </view>
          <text class="audio-duration">{{ postAudioDuration }}s</text>
          <text class="audio-remove" @click="removeAudio">×</text>
        </view>
        <!-- 录音中 -->
        <view v-if="recording" class="panel-recording">
          <view class="recording-dot" />
          <text class="recording-text">录音中... {{ recordingSeconds }}s</text>
          <text class="recording-stop" @click="stopRecording">⏹ 停止</text>
        </view>
        <view class="panel-actions">
          <view class="panel-left">
            <text class="add-img-btn" @click="chooseImage">🖼 图片</text>
            <text class="add-img-btn" :class="{ disabled: recording || !!postAudioUrl }" @click="startRecording">🎙️ 语音</text>
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
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { circleApi, botApi, contentApi, courseApi, questionApi, liveApi, uploadApi, interactApi } from '../../api'
import EmptyState from '../../components/EmptyState.vue'

interface CirclePost {
  id: string; title?: string; content: string; images?: string[]
  author?: { id: string; nickname: string; avatar: string }
  likeCount?: number; commentCount?: number; isLiked?: boolean
  isTop?: boolean; isEssence?: boolean; createdAt?: string
}

// 内容Tab
const contentTabs = [
  { key: 'posts', label: '帖子' },
  { key: 'articles', label: '文章' },
  { key: 'courses', label: '课程' },
  { key: 'questions', label: '问答' },
  { key: 'lives', label: '直播' },
]
const activeContentTab = ref('posts')
const postSubTabs = [
  { key: '', label: '全部' },
  { key: 'essence', label: '精华' },
  { key: 'top', label: '置顶' },
]

const createBtnText = computed(() => {
  const map: Record<string, string> = { posts: '分享你的见解...', articles: '写一篇文章...', courses: '上传课程...', questions: '向达人提问...', lives: '创建直播...' }
  return map[activeContentTab.value] || '分享你的见解...'
})

// 页面参数
const id = ref('')
const circle = ref<any>(null)
const joined = ref(false)
const loading = ref(false)
const joining = ref(false)
const leaving = ref(false)

// 帖子
const currentPostTab = ref('')
const posts = ref<CirclePost[]>([])
const loadingPosts = ref(false)
const loadingMorePosts = ref(false)
const hasMorePosts = ref(true)
const postPage = ref(1)

// 文章
const articles = ref<any[]>([])
const loadingArticles = ref(false)
const loadingMoreArticles = ref(false)
const articlePage = ref(1)

// 课程
const courses = ref<any[]>([])
const loadingCourses = ref(false)
const loadingMoreCourses = ref(false)
const coursePage = ref(1)

// 问答
const questions = ref<any[]>([])
const loadingQuestions = ref(false)

// 直播
const lives = ref<any[]>([])
const loadingLives = ref(false)

// 智能体助理
const hasBot = ref(false)
const botData = ref<any>(null)

// 发帖
const showPostPanel = ref(false)
const postTitle = ref('')
const postContent = ref('')
const postImages = ref<string[]>([])
const postAudioUrl = ref('')
const postAudioDuration = ref(0)
const recording = ref(false)
const recordingSeconds = ref(0)
const audioPlaying = ref(false)
let recorderManager: any = null
let recordTimer: ReturnType<typeof setInterval> | null = null
let panelAudioCtx: any = null
const submitting = ref(false)

const pageSize = 10

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  id.value = opts.id || ''
  if (id.value) initData()
})

// 切换内容Tab
function switchContentTab(key: string) {
  if (activeContentTab.value === key) return
  activeContentTab.value = key
  if (key === 'posts') { postPage.value = 1; hasMorePosts.value = true; fetchPosts(true) }
  if (key === 'articles') { articlePage.value = 1; fetchArticles(true) }
  if (key === 'courses') { coursePage.value = 1; fetchCourses(true) }
  if (key === 'questions') fetchQuestions()
  if (key === 'lives') fetchLives()
}

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
  if (activeContentTab.value === 'posts') {
    if (!hasMorePosts.value || loadingMorePosts.value) return
    loadingMorePosts.value = true
    postPage.value++
    fetchPosts(false).finally(() => { loadingMorePosts.value = false })
  } else if (activeContentTab.value === 'articles') {
    if (loadingMoreArticles.value) return
    loadingMoreArticles.value = true
    articlePage.value++
    fetchArticles(false).finally(() => { loadingMoreArticles.value = false })
  } else if (activeContentTab.value === 'courses') {
    if (loadingMoreCourses.value) return
    loadingMoreCourses.value = true
    coursePage.value++
    fetchCourses(false).finally(() => { loadingMoreCourses.value = false })
  }
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

// 显示发帖面板/跳转创建页面
function showCreatePanel() {
  if (activeContentTab.value === 'questions') {
    uni.navigateTo({ url: `/pages/qa/ask?circleId=${id.value}&circleName=${encodeURIComponent(circle.value?.name || '')}` })
  } else if (activeContentTab.value === 'articles') {
    uni.navigateTo({ url: `/pages/articles/editor?circleId=${id.value}` })
  } else {
    showPostPanel.value = true
  }
}
function hideCreatePanel() {
  if (recording.value) stopRecording()
  panelAudioCtx?.stop()
  audioPlaying.value = false
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

// ─── 语音录制 ───
function startRecording() {
  if (recording.value || postAudioUrl.value) return
  recording.value = true
  recordingSeconds.value = 0
  postAudioUrl.value = ''
  postAudioDuration.value = 0

  recorderManager = uni.getRecorderManager()
  recorderManager.onStop((res: any) => {
    recording.value = false
    if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
    uploadAudioFile(res.tempFilePath, Math.ceil(res.duration / 1000))
  })
  recorderManager.onError(() => {
    recording.value = false
    if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
    uni.showToast({ title: '录音失败', icon: 'none' })
  })
  recorderManager.start({ format: 'mp3', duration: 60000 })
  recordTimer = setInterval(() => { recordingSeconds.value++ }, 1000)
}

async function uploadAudioFile(filePath: string, duration: number) {
  try {
    const res = await uploadApi.audio(filePath) as any
    const url = res?.data?.url || res?.url || ''
    if (url) {
      postAudioUrl.value = url
      postAudioDuration.value = duration
    }
  } catch {
    uni.showToast({ title: '音频上传失败', icon: 'none' })
  }
}

function stopRecording() {
  if (recorderManager) recorderManager.stop()
}

function togglePanelAudio() {
  if (!postAudioUrl.value) return
  if (audioPlaying.value) {
    panelAudioCtx?.stop()
    audioPlaying.value = false
    return
  }
  panelAudioCtx = uni.createInnerAudioContext()
  panelAudioCtx.src = postAudioUrl.value
  panelAudioCtx.onEnded(() => { audioPlaying.value = false })
  panelAudioCtx.onError(() => { audioPlaying.value = false })
  panelAudioCtx.play()
  audioPlaying.value = true
}

function removeAudio() {
  panelAudioCtx?.stop()
  audioPlaying.value = false
  postAudioUrl.value = ''
  postAudioDuration.value = 0
}

// 发布帖子
async function submitPost() {
  const content = postContent.value.trim()
  if (!content || submitting.value) return
  submitting.value = true
  try {
    const data: Record<string, any> = { content, type: 'TEXT' }
    if (postTitle.value.trim()) {
      data.title = postTitle.value.trim()
    }
    if (postImages.value.length > 0) {
      data.images = postImages.value
      data.type = 'IMAGE'
    }
    if (postAudioUrl.value) {
      data.audioUrl = postAudioUrl.value
      data.audioDuration = postAudioDuration.value
      data.type = 'AUDIO'
    }
    await circleApi.createPost(id.value, data)
    uni.showToast({ title: '发布成功', icon: 'success' })

    // 重置表单
    postTitle.value = ''
    postContent.value = ''
    postImages.value = []
    postAudioUrl.value = ''
    postAudioDuration.value = 0
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

// 跳转帖子详情
function goPostDetail(post: CirclePost) {
  uni.navigateTo({ url: `/pages/circles/post-detail?id=${post.id}&circleId=${id.value}` })
}

// 跳转文章详情
function goArticleDetail(article: any) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${article.id}&type=article` })
}

// 跳转课程详情
function goCourseDetail(course: any) {
  uni.navigateTo({ url: `/pages/courses/course-detail?id=${course.id}` })
}

// 跳转问答详情
function goQuestionDetail(q: any) {
  uni.navigateTo({ url: `/pages/qa/question-detail?id=${q.id}` })
}

// 跳转直播间
function goLiveRoom(live: any) {
  uni.navigateTo({ url: `/pages/live/live-room?id=${live.id}` })
}

// ─── 文章加载 ───
async function fetchArticles(reset: boolean) {
  if (reset) loadingArticles.value = true
  try {
    const res = await contentApi.list({ page: articlePage.value, pageSize, circleId: id.value })
    const list = res?.data?.articles || res?.data?.list || res?.data?.data || res?.data || []
    if (reset) articles.value = Array.isArray(list) ? list : []
    else articles.value.push(...(Array.isArray(list) ? list : []))
  } catch { if (reset) articles.value = [] } finally { if (reset) loadingArticles.value = false }
}

// ─── 课程加载 ───
async function fetchCourses(reset: boolean) {
  if (reset) loadingCourses.value = true
  try {
    const res = await courseApi.list({ page: coursePage.value, pageSize, circleId: id.value })
    const list = res?.data?.courses || res?.data?.list || res?.data?.data || res?.data || []
    if (reset) courses.value = Array.isArray(list) ? list : []
    else courses.value.push(...(Array.isArray(list) ? list : []))
  } catch { if (reset) courses.value = [] } finally { if (reset) loadingCourses.value = false }
}

// ─── 问答加载 ───
async function fetchQuestions() {
  loadingQuestions.value = true
  try {
    const res = await questionApi.list({ circleId: id.value, pageSize: 20 })
    const list = res?.data?.questions || res?.data?.list || res?.data?.data || res?.data || []
    questions.value = Array.isArray(list) ? list : []
  } catch { questions.value = [] } finally { loadingQuestions.value = false }
}

// ─── 直播加载 ───
async function fetchLives() {
  loadingLives.value = true
  try {
    const res = await liveApi.rooms({ circleId: id.value, pageSize: 20 })
    const list = res?.rooms || res?.list || res?.data || []
    lives.value = Array.isArray(list) ? list : []
  } catch { lives.value = [] } finally { loadingLives.value = false }
}

// 点赞（乐观更新 + API 调用）
async function toggleLike(post: CirclePost) {
  const prevLiked = post.isLiked
  const prevCount = post.likeCount || 0
  post.isLiked = !post.isLiked
  post.likeCount = prevCount + (post.isLiked ? 1 : -1)
  try {
    await interactApi.toggleLike('circle_post', post.id)
  } catch {
    // 失败回滚
    post.isLiked = prevLiked
    post.likeCount = prevCount
  }
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

/* ===== 子Tab ===== */
.sub-tab-bar { display: flex; gap: 4px; padding: 6px 16px 0; background: #fff; }
.sub-tab-item { padding: 4px 14px; border-radius: 12px; font-size: 12px; color: #999; background: #F5F0E8; }
.sub-tab-item.active { color: #C41E3A; background: #fde8e8; }

/* ===== 文章卡片 ===== */
.article-card { background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.article-cover { width: 100%; height: 140px; border-radius: 6px; margin-bottom: 10px; }
.article-title { font-size: 16px; font-weight: bold; color: #333; display: block; margin-bottom: 6px; }
.article-excerpt { font-size: 13px; color: #888; display: block; margin-bottom: 8px; line-height: 1.5; }
.article-meta { display: flex; justify-content: space-between; font-size: 12px; color: #bbb; }

/* ===== 课程卡片 ===== */
.course-card { background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.course-cover { width: 100px; height: 70px; border-radius: 6px; flex-shrink: 0; }
.course-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
.course-title { font-size: 14px; font-weight: bold; color: #333; display: block; }
.course-intro { font-size: 12px; color: #999; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.course-meta { display: flex; gap: 10px; font-size: 11px; color: #bbb; align-items: center; }
.course-type { color: #C9A96E; }
.course-price { color: #C41E3A; font-weight: bold; }
.course-price.free { color: #4caf50; }
.course-students { color: #bbb; }

/* ===== 问答卡片 ===== */
.question-card { background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.q-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.q-status { font-size: 11px; padding: 2px 8px; border-radius: 8px; }
.q-status.ANSWERED { color: #4caf50; background: #e8f5e9; }
.q-status.PENDING { color: #ff9800; background: #fff3e0; }
.q-price { font-size: 13px; color: #C41E3A; font-weight: bold; }
.q-title { font-size: 15px; color: #333; display: block; margin-bottom: 8px; line-height: 1.5; }
.q-footer { display: flex; justify-content: space-between; font-size: 12px; color: #bbb; }

/* ===== 直播卡片 ===== */
.live-card { background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.live-cover-wrap { width: 100px; height: 70px; border-radius: 6px; flex-shrink: 0; position: relative; overflow: hidden; }
.live-cover { width: 100%; height: 100%; }
.live-cover-placeholder { width: 100%; height: 100%; background: #f0e8d8; display: flex; align-items: center; justify-content: center; }
.live-placeholder-icon { font-size: 28px; }
.live-status-badge { position: absolute; top: 2px; left: 2px; padding: 1px 6px; border-radius: 6px; font-size: 10px; }
.live-status-badge.LIVE { background: #C41E3A; color: #fff; }
.live-status-badge.SCHEDULED { background: #ff9800; color: #fff; }
.live-status-badge.ENDED { background: #999; color: #fff; }
.live-status-badge.REPLAY { background: #4caf50; color: #fff; }
.live-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
.live-title { font-size: 14px; font-weight: bold; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.live-meta { display: flex; justify-content: space-between; font-size: 12px; color: #bbb; }

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

/* ===== 音频录制 ===== */
.panel-audio {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #faf5f0;
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 8px;
}
.audio-play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  flex-shrink: 0;
}
.audio-wave {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  overflow: hidden;
}
.audio-bar {
  width: 3px;
  background: #C9A96E;
  border-radius: 2px;
}
.audio-duration {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}
.audio-remove {
  font-size: 18px;
  color: #ccc;
  padding: 2px 6px;
  flex-shrink: 0;
}
.panel-recording {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fef0f0;
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 8px;
}
.recording-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #C41E3A;
  animation: pulse 1s infinite;
}
.recording-text {
  flex: 1;
  font-size: 13px;
  color: #C41E3A;
}
.recording-stop {
  font-size: 13px;
  color: #C41E3A;
  font-weight: bold;
  padding: 4px 10px;
  background: #fff;
  border-radius: 12px;
}
.add-img-btn.disabled {
  opacity: 0.4;
  pointer-events: none;
}
</style>
