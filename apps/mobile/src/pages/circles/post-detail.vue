<template>
  <view class="page">
    <!-- 加载骨架屏 -->
    <view v-if="loading" class="skeleton-page">
      <view class="skeleton-header" />
      <view class="skeleton-body" />
      <view v-for="i in 3" :key="i" class="skeleton-comment" />
    </view>

    <!-- 内容区 -->
    <template v-else-if="post">
      <!-- 帖子正文 -->
      <view class="post-card">
        <!-- 作者信息 -->
        <view class="post-author">
          <image v-if="post.author?.avatar" :src="post.author.avatar" class="avatar" mode="aspectFill" />
          <view v-else class="avatar-placeholder">👤</view>
          <view class="author-meta">
            <text class="author-name">{{ post.author?.nickname || '匿名' }}</text>
            <text class="post-time">{{ formatTime(post.createdAt) }}</text>
          </view>
          <view class="post-badges">
            <text v-if="post.isTop" class="badge top">置顶</text>
            <text v-if="post.isEssence" class="badge essence">精华</text>
          </view>
        </view>

        <!-- 标题 -->
        <text v-if="post.title" class="post-title">{{ post.title }}</text>

        <!-- 正文 -->
        <text class="post-content">{{ post.content }}</text>

        <!-- 图片 -->
        <view v-if="post.images?.length" class="post-images">
          <image
            v-for="(img, idx) in post.images" :key="idx" :src="img"
            mode="aspectFill" class="post-img"
            @click="previewImages(post.images, idx)"
          />
        </view>

        <!-- 视频 -->
        <video v-if="post.videoUrl" :src="post.videoUrl" class="post-video" :controls="true" />

        <!-- 音频 -->
        <view v-if="post.audioUrl" class="post-audio">
          <view class="audio-card">
            <view class="audio-btn" @click="togglePostAudio">
              <text>{{ audioPlaying ? '⏸' : '▶' }}</text>
            </view>
            <view class="audio-info">
              <text class="audio-label">语音消息</text>
              <text class="audio-secs">{{ post.audioDuration || 0 }}s</text>
            </view>
            <view class="audio-progress-track" @click="seekPostAudio">
              <view class="audio-progress-fill" :style="{ width: audioProgress + '%' }" />
            </view>
          </view>
        </view>

        <!-- 文件 -->
        <view v-if="post.fileUrl" class="post-file" @click="openFile(post.fileUrl)">
          <text class="file-icon">📎</text>
          <text class="file-name">附件: {{ post.fileUrl.split('/').pop() || '下载' }}</text>
        </view>

        <!-- 链接 -->
        <view v-if="post.linkUrl" class="post-link" @click="openLink(post.linkUrl)">
          <text class="link-icon">🔗</text>
          <text class="link-text">{{ post.linkUrl }}</text>
        </view>

        <!-- 互动栏 -->
        <view class="post-actions">
          <view class="action-item" :class="{ active: post.isLiked }" @click="toggleLike">
            <text>{{ post.isLiked ? '❤️' : '🤍' }}</text>
            <text class="action-count">{{ post.likeCount || 0 }}</text>
          </view>
          <view class="action-item" :class="{ active: post.isCollected }" @click="toggleCollect">
            <text>{{ post.isCollected ? '⭐' : '☆' }}</text>
            <text class="action-count">{{ post.collectCount || 0 }}</text>
          </view>
          <view class="action-item">
            <text>💬</text>
            <text class="action-count">{{ post.commentCount || comments.length }}</text>
          </view>
        </view>
      </view>

      <!-- 评论区标题 -->
      <view class="comment-section-title">
        <text>评论 {{ comments.length > 0 ? '(' + totalComments + ')' : '' }}</text>
      </view>

      <!-- 评论列表 -->
      <view v-if="commentLoading" class="comment-loading">
        <view v-for="i in 3" :key="i" class="skeleton-comment" />
      </view>
      <view v-else-if="comments.length > 0" class="comment-list">
        <view v-for="comment in comments" :key="comment.id" class="comment-item">
          <view class="comment-main">
            <image v-if="comment.user?.avatar" :src="comment.user.avatar" class="comment-avatar" mode="aspectFill" />
            <view v-else class="comment-avatar-placeholder">👤</view>
            <view class="comment-body">
              <view class="comment-header">
                <text class="comment-name">{{ comment.user?.nickname || '匿名' }}</text>
                <text class="comment-time">{{ formatTime(comment.createdAt) }}</text>
              </view>
              <text class="comment-text">{{ comment.content }}</text>
              <view class="comment-footer">
                <text class="comment-reply-btn" @click="startReply(comment)">回复</text>
                <text v-if="comment.children?.length" class="comment-expand" @click="toggleReplies(comment.id)">
                  {{ expandedReplies.has(comment.id) ? '收起' : comment.children.length + '条回复' }}
                </text>
              </view>

              <!-- 子回复 -->
              <view v-if="expandedReplies.has(comment.id) && comment.children?.length" class="reply-list">
                <view v-for="reply in comment.children" :key="reply.id" class="reply-item">
                  <text class="reply-name">{{ reply.user?.nickname || '匿名' }}</text>
                  <text v-if="reply.parentUser?.nickname" class="reply-to"> 回复 @{{ reply.parentUser.nickname }}</text>
                  <text>：</text>
                  <text class="reply-text">{{ reply.content }}</text>
                  <text class="reply-time">{{ formatTime(reply.createdAt) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <EmptyState v-else-if="!commentLoading" icon="💬" text="暂无评论，来说两句吧" />

      <!-- 加载更多评论 -->
      <view v-if="loadingMoreComments" class="load-more">加载中...</view>
      <view v-if="!hasMoreComments && comments.length > 0" class="no-more">— 已全部加载 —</view>
    </template>

    <!-- 异常状态 -->
    <view v-if="!loading && !post" class="error-state">
      <EmptyState icon="⚠️" text="帖子加载失败" />
      <button class="retry-btn" @click="fetchPost">重新加载</button>
    </view>

    <!-- 底部评论输入栏 -->
    <view class="comment-bar" v-if="post">
      <view class="comment-bar-inner">
        <input
          v-model="commentText"
          class="comment-input"
          :placeholder="replyTo ? '回复 @' + replyTo.user?.nickname + '...' : '写下你的评论...'"
          confirm-type="send"
          @confirm="submitComment"
          :maxlength="500"
        />
        <text v-if="replyTo" class="cancel-reply" @click="cancelReply">✕</text>
        <text class="send-btn" :class="{ disabled: !commentText.trim() || submittingComment }" @click="submitComment">
          {{ submittingComment ? '...' : '发送' }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onReachBottom } from '@dcloudio/uni-app'
import { circleApi, interactApi } from '../../api'
import EmptyState from '../../components/EmptyState.vue'

interface UserInfo {
  id: string; nickname: string; avatar: string
}
interface CommentItem {
  id: string; content: string; parentId?: string
  user?: UserInfo; parentUser?: UserInfo
  children?: CommentItem[]
  createdAt?: string
}
interface PostDetail {
  id: string; title?: string; content: string; images?: string[]
  videoUrl?: string; fileUrl?: string; linkUrl?: string; audioUrl?: string; audioDuration?: number
  author?: UserInfo; user?: UserInfo
  likeCount?: number; collectCount?: number; commentCount?: number
  isLiked?: boolean; isCollected?: boolean
  isTop?: boolean; isEssence?: boolean
  type?: string; circleId?: string
  createdAt?: string
}

const postId = ref('')
const circleId = ref('')
const post = ref<PostDetail | null>(null)
const loading = ref(false)

// 评论
const comments = ref<CommentItem[]>([])
const commentLoading = ref(false)
const loadingMoreComments = ref(false)
const hasMoreComments = ref(true)
const commentPage = ref(1)
const totalComments = ref(0)
const expandedReplies = ref(new Set<string>())

// 评论输入
const commentText = ref('')
const replyTo = ref<CommentItem | null>(null)
const submittingComment = ref(false)

// 音频播放
const audioPlaying = ref(false)
const audioProgress = ref(0)
let audioCtx: any = null
let audioTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  postId.value = opts.id || opts.postId || ''
  circleId.value = opts.circleId || ''
  if (postId.value) fetchPost()
})

// 上拉加载更多评论
onReachBottom(() => {
  if (!hasMoreComments.value || loadingMoreComments.value) return
  loadingMoreComments.value = true
  commentPage.value++
  fetchComments(false).finally(() => { loadingMoreComments.value = false })
})

async function fetchPost() {
  loading.value = true
  try {
    const res = await circleApi.getPostDetail(circleId.value, postId.value)
    const p = res?.data || res
    post.value = {
      id: p.id,
      title: p.title,
      content: p.content,
      images: p.images,
      videoUrl: p.videoUrl,
      fileUrl: p.fileUrl,
      linkUrl: p.linkUrl,
      audioUrl: p.audioUrl,
      audioDuration: p.audioDuration,
      author: p.author || p.user,
      likeCount: p.likeCount ?? 0,
      collectCount: p.collectCount ?? 0,
      commentCount: p.commentCount ?? 0,
      isLiked: p.isLiked ?? false,
      isCollected: p.isCollected ?? false,
      isTop: p.isTop ?? false,
      isEssence: p.isEssence ?? false,
      type: p.type,
      circleId: p.circleId,
      createdAt: p.createdAt,
    }
    totalComments.value = p.commentCount ?? 0
    commentPage.value = 1
    hasMoreComments.value = true
    fetchComments(true)
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function fetchComments(reset: boolean) {
  if (reset) commentLoading.value = true
  try {
    const res = await interactApi.comments('POST', postId.value)
    // 兼容多种返回格式
    const list = res?.data?.comments || res?.data?.list || res?.data?.data || res?.comments || res?.data || []
    const mapped: CommentItem[] = (Array.isArray(list) ? list : []).map((c: any) => ({
      id: c.id,
      content: c.content,
      parentId: c.parentId,
      user: c.user,
      parentUser: c.parentUser,
      children: c.children || c.replies || [],
      createdAt: c.createdAt,
    }))
    if (reset) {
      comments.value = mapped
    } else {
      comments.value.push(...mapped)
    }
    hasMoreComments.value = mapped.length >= 10
  } catch {
    if (reset) comments.value = []
  } finally {
    if (reset) commentLoading.value = false
  }
}

// 点赞
async function toggleLike() {
  if (!post.value) return
  try {
    await interactApi.toggleLike('POST', postId.value)
    post.value.isLiked = !post.value.isLiked
    post.value.likeCount = (post.value.likeCount || 0) + (post.value.isLiked ? 1 : -1)
  } catch { uni.showToast({ title: '操作失败', icon: 'none' }) }
}

// 收藏
async function toggleCollect() {
  if (!post.value) return
  try {
    await interactApi.toggleCollect('POST', postId.value)
    post.value.isCollected = !post.value.isCollected
    post.value.collectCount = (post.value.collectCount || 0) + (post.value.isCollected ? 1 : -1)
  } catch { uni.showToast({ title: '操作失败', icon: 'none' }) }
}

// ─── 音频播放 ───
function togglePostAudio() {
  if (!post.value?.audioUrl) return
  if (audioPlaying.value) {
    audioCtx?.pause()
    audioPlaying.value = false
    if (audioTimer) { clearInterval(audioTimer); audioTimer = null }
    return
  }
  audioCtx = uni.createInnerAudioContext()
  audioCtx.src = post.value.audioUrl
  audioCtx.onPlay(() => { audioPlaying.value = true; startAudioProgress() })
  audioCtx.onEnded(() => { audioPlaying.value = false; audioProgress.value = 0; stopAudioProgress() })
  audioCtx.onError(() => { audioPlaying.value = false; stopAudioProgress() })
  audioCtx.play()
}

function startAudioProgress() {
  stopAudioProgress()
  audioTimer = setInterval(() => {
    if (!audioCtx || !post.value?.audioDuration) return
    const pct = Math.min(100, (audioCtx.currentTime / post.value.audioDuration) * 100)
    audioProgress.value = pct
  }, 200) as any
}

function stopAudioProgress() {
  if (audioTimer) { clearInterval(audioTimer); audioTimer = null }
}

function seekPostAudio(e: any) {
  if (!audioCtx || !post.value?.audioDuration) return
  const width = (e.currentTarget?.offsetWidth || e.detail?.x || 100)
  const x = (e.detail?.x ?? 0)
  const pct = Math.min(1, Math.max(0, x / width))
  audioCtx.seek(pct * post.value.audioDuration)
  audioProgress.value = pct * 100
}

// 评论
function startReply(comment: CommentItem) { replyTo.value = comment }
function cancelReply() { replyTo.value = null }
function toggleReplies(commentId: string) {
  if (expandedReplies.value.has(commentId)) {
    expandedReplies.value.delete(commentId)
  } else {
    expandedReplies.value.add(commentId)
  }
  expandedReplies.value = new Set(expandedReplies.value)
}

async function submitComment() {
  const text = commentText.value.trim()
  if (!text || submittingComment.value) return
  submittingComment.value = true
  try {
    await interactApi.addComment({
      targetType: 'POST',
      targetId: postId.value,
      content: text,
      parentId: replyTo.value?.id || undefined,
    })
    commentText.value = ''
    replyTo.value = null
    uni.showToast({ title: '评论成功', icon: 'success' })
    // 刷新评论
    commentPage.value = 1
    hasMoreComments.value = true
    await fetchComments(true)
    if (post.value) post.value.commentCount = (post.value.commentCount || 0) + 1
  } catch {
    uni.showToast({ title: '评论失败', icon: 'none' })
  } finally {
    submittingComment.value = false
  }
}

// 预览图片
function previewImages(images: string[], idx: number) {
  uni.previewImage({ current: images[idx], urls: images })
}

function openFile(url: string) {
  uni.showToast({ title: '文件下载中...', icon: 'none' })
  // uni.downloadFile({ url, success: (res) => uni.openDocument({ filePath: res.tempFilePath }) })
}

function openLink(url: string) {
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifdef MP-WEIXIN
  uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'success' }) })
  // #endif
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
  } catch { return timeStr.slice(0, 10) }
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 60px; }

/* 骨架屏 */
.skeleton-page { padding: 12px; }
.skeleton-header { height: 60px; border-radius: 8px; background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; margin-bottom: 12px; }
.skeleton-body { height: 200px; border-radius: 8px; background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; margin-bottom: 12px; }
.skeleton-comment, .comment-loading .skeleton-comment { height: 80px; border-radius: 8px; margin-bottom: 10px; background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* 帖子卡片 */
.post-card { background: #fff; margin: 0 0 12px 0; padding: 16px; }
.post-author { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; }
.avatar-placeholder { width: 40px; height: 40px; border-radius: 50%; background: #f0e8d8; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.author-meta { flex: 1; display: flex; flex-direction: column; }
.author-name { font-size: 15px; font-weight: bold; color: #C41E3A; }
.post-time { font-size: 12px; color: #bbb; }
.post-badges { display: flex; gap: 4px; }
.badge { font-size: 11px; padding: 2px 10px; border-radius: 8px; }
.badge.top { color: #C41E3A; background: #fde8e8; }
.badge.essence { color: #C9A96E; background: #fdf5e6; }
.post-title { font-size: 18px; font-weight: bold; color: #333; display: block; margin-bottom: 10px; line-height: 1.5; }
.post-content { font-size: 15px; color: #444; line-height: 1.8; display: block; white-space: pre-wrap; word-break: break-word; }
.post-images { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
.post-img { width: 100px; height: 100px; border-radius: 6px; }
.post-video { width: 100%; height: 200px; margin-top: 12px; border-radius: 8px; }
.post-audio { margin-top: 12px; }
.audio-card { display: flex; align-items: center; gap: 10px; padding: 12px; background: linear-gradient(135deg, #faf5f0, #fdf5e6); border-radius: 10px; border: 1px solid #f0e8d8; }
.audio-btn { width: 36px; height: 36px; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 15px; flex-shrink: 0; }
.audio-info { display: flex; flex-direction: column; flex-shrink: 0; }
.audio-label { font-size: 13px; color: #333; font-weight: bold; }
.audio-secs { font-size: 11px; color: #999; }
.audio-progress-track { flex: 1; height: 4px; background: #e8dcc8; border-radius: 2px; overflow: hidden; }
.audio-progress-fill { height: 100%; background: #C9A96E; border-radius: 2px; transition: width 0.2s; }
.post-file { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 10px; background: #F5F0E8; border-radius: 8px; }
.file-icon { font-size: 20px; }
.file-name { font-size: 13px; color: #C41E3A; }
.post-link { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 10px; background: #e8f0fe; border-radius: 8px; }
.link-icon { font-size: 18px; }
.link-text { font-size: 12px; color: #1a73e8; word-break: break-all; }

/* 互动栏 */
.post-actions { display: flex; gap: 30px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #F5F0E8; }
.action-item { display: flex; align-items: center; gap: 4px; font-size: 14px; color: #999; }
.action-item.active { color: #C41E3A; }
.action-count { font-size: 13px; }

/* 评论区 */
.comment-section-title { padding: 14px 16px 8px; font-size: 15px; font-weight: bold; color: #333; background: #fff; }
.comment-list { background: #fff; padding: 0 16px; }
.comment-item { padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
.comment-main { display: flex; gap: 10px; }
.comment-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; }
.comment-avatar-placeholder { width: 32px; height: 32px; border-radius: 50%; background: #f0e8d8; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.comment-body { flex: 1; min-width: 0; }
.comment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.comment-name { font-size: 13px; font-weight: bold; color: #C41E3A; }
.comment-time { font-size: 11px; color: #ccc; }
.comment-text { font-size: 14px; color: #444; line-height: 1.6; display: block; }
.comment-footer { display: flex; gap: 16px; margin-top: 6px; }
.comment-reply-btn { font-size: 12px; color: #999; }
.comment-expand { font-size: 12px; color: #C9A96E; }
.reply-list { margin-top: 8px; padding-left: 42px; }
.reply-item { padding: 6px 0; font-size: 13px; color: #555; line-height: 1.6; }
.reply-name { color: #C41E3A; font-weight: bold; }
.reply-to { color: #999; }
.reply-text { color: #444; }
.reply-time { display: block; font-size: 11px; color: #ccc; margin-top: 2px; }

/* 评论输入栏 */
.comment-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 8px 12px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); z-index: 100; }
.comment-bar-inner { display: flex; align-items: center; gap: 8px; }
.comment-input { flex: 1; height: 36px; background: #F5F0E8; border-radius: 18px; padding: 0 14px; font-size: 13px; color: #333; }
.cancel-reply { font-size: 16px; color: #999; padding: 4px; }
.send-btn { font-size: 14px; color: #C41E3A; font-weight: bold; padding: 4px 8px; }
.send-btn.disabled { color: #ccc; }

/* 通用 */
.load-more { text-align: center; color: #C9A96E; padding: 16px 0; font-size: 13px; }
.no-more { text-align: center; color: #ccc; padding: 16px 0; font-size: 12px; }
.error-state { display: flex; flex-direction: column; align-items: center; padding: 60px 0; }
.retry-btn { background: #C41E3A; color: #fff; border-radius: 20px; padding: 8px 32px; font-size: 14px; border: none; margin-top: 8px; }
</style>
