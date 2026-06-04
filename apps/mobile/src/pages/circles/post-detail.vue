<template>
  <view class="page">
    <!-- 加载骨架屏 -->
    <DataState
      :is-loading="loading && !post"
      :error="postError"
      :is-empty="!loading && !post"
      empty-icon="📝"
      empty-title="帖子不存在"
      empty-description="该帖子已被删除或链接无效"
      empty-action-text="返回"
      :empty-show-action="true"
      skeleton-type="detail"
      @retry="fetchPost"
      @empty-action="goBack"
    >
      <template v-if="post">
        <!-- ===== 帖子正文 ===== -->
        <view class="post-card">
          <!-- 作者信息 -->
          <view class="post-author">
            <image
              v-if="post.author?.avatar"
              :src="post.author.avatar"
              class="avatar"
              mode="aspectFill"
            />
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
              v-for="(img, idx) in post.images"
              :key="idx"
              :src="img"
              mode="aspectFill"
              class="post-img"
              :class="{ full: post.images.length === 1 }"
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

          <!-- 附件/链接 -->
          <view v-if="post.fileUrl" class="post-file" @click="openFile(post.fileUrl)">
            <text class="file-icon">📎</text>
            <text class="file-name">附件: {{ post.fileUrl.split('/').pop() || '下载' }}</text>
          </view>
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
            <view class="action-item" @click="sharePost">
              <text>↗</text>
              <text class="action-count">分享</text>
            </view>
          </view>
        </view>

        <!-- ===== 评论区 ===== -->
        <view class="comment-section">
          <view class="comment-header">
            <text class="comment-section-title">
              评论
              <text v-if="totalComments > 0" class="comment-count">({{ totalComments }})</text>
            </text>
          </view>

          <DataState
            :is-loading="commentLoading && comments.length === 0"
            :error="commentError"
            :is-empty="!commentLoading && comments.length === 0"
            empty-icon="💬"
            empty-title="暂无评论"
            empty-description="来说两句吧"
            skeleton-type="list"
            @retry="fetchComments"
          >
            <view v-if="comments.length > 0" class="comment-list">
              <view
                v-for="comment in comments"
                :key="comment.id"
                class="comment-item"
              >
                <view class="comment-main">
                  <image
                    v-if="comment.user?.avatar"
                    :src="comment.user.avatar"
                    class="comment-avatar"
                    mode="aspectFill"
                  />
                  <view v-else class="comment-avatar-placeholder">👤</view>
                  <view class="comment-body">
                    <view class="comment-header-row">
                      <text class="comment-name">{{ comment.user?.nickname || '匿名' }}</text>
                      <text class="comment-time">{{ formatTime(comment.createdAt) }}</text>
                    </view>
                    <text class="comment-text">{{ comment.content }}</text>
                    <view class="comment-footer">
                      <text class="comment-reply-btn" @click="startReply(comment)">回复</text>
                      <text
                        v-if="comment.children?.length"
                        class="comment-expand"
                        @click="toggleReplies(comment.id)"
                      >
                        {{ expandedReplies.has(comment.id) ? '收起' : comment.children.length + '条回复' }}
                      </text>
                    </view>

                    <!-- 子回复 -->
                    <view
                      v-if="expandedReplies.has(comment.id) && comment.children?.length"
                      class="reply-list"
                    >
                      <view
                        v-for="reply in comment.children"
                        :key="reply.id"
                        class="reply-item"
                      >
                        <text class="reply-name">{{ reply.user?.nickname || '匿名' }}</text>
                        <text v-if="reply.parentUser?.nickname" class="reply-to">
                          回复 @{{ reply.parentUser.nickname }}
                        </text>
                        <text>：</text>
                        <text class="reply-text">{{ reply.content }}</text>
                        <text class="reply-time">{{ formatTime(reply.createdAt) }}</text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 加载更多评论 -->
            <view v-if="loadingMoreComments" class="load-more">加载中...</view>
            <view v-if="!hasMoreComments && comments.length > 0" class="no-more">
              — 已全部加载 —
            </view>
          </DataState>
        </view>
      </template>
    </DataState>

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
        <text
          class="send-btn"
          :class="{ disabled: !commentText.trim() || submittingComment }"
          @click="submitComment"
        >
          {{ submittingComment ? '...' : '发送' }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onReachBottom } from '@dcloudio/uni-app'
import { circleApi, interactApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface UserInfo {
  id: string
  nickname: string
  avatar: string
}

interface CommentItem {
  id: string
  content: string
  parentId?: string
  user?: UserInfo
  parentUser?: UserInfo
  children?: CommentItem[]
  createdAt?: string
}

interface PostDetail {
  id: string
  title?: string
  content: string
  images?: string[]
  videoUrl?: string
  fileUrl?: string
  linkUrl?: string
  audioUrl?: string
  audioDuration?: number
  author?: UserInfo
  user?: UserInfo
  likeCount: number
  collectCount: number
  commentCount: number
  isLiked: boolean
  isCollected: boolean
  isTop: boolean
  isEssence: boolean
  type?: string
  circleId?: string
  createdAt?: string
}

const postId = ref('')
const circleId = ref('')
const post = ref<PostDetail | null>(null)
const loading = ref(false)
const postError = ref<string | null>(null)

// 评论
const comments = ref<CommentItem[]>([])
const commentLoading = ref(false)
const commentError = ref<string | null>(null)
const loadingMoreComments = ref(false)
const hasMoreComments = ref(true)
const commentPage = ref(1)
const totalComments = ref(0)
const expandedReplies = ref(new Set<string>())

// 评论输入
const commentText = ref('')
const replyTo = ref<CommentItem | null>(null)
const submittingComment = ref(false)

// 音频
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

onUnmounted(() => {
  if (audioTimer) clearInterval(audioTimer)
  if (audioCtx) audioCtx.destroy()
})

// 上拉加载更多评论
onReachBottom(() => {
  if (!hasMoreComments.value || loadingMoreComments.value) return
  loadingMoreComments.value = true
  commentPage.value++
  fetchComments(false).finally(() => {
    loadingMoreComments.value = false
  })
})

async function fetchPost() {
  loading.value = true
  postError.value = null
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
  } catch (e: any) {
    postError.value = e?.errMsg || e?.message || '加载失败'
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function fetchComments(reset: boolean = true) {
  if (reset) commentLoading.value = true
  commentError.value = null
  try {
    const res = await interactApi.comments('POST', postId.value)
    const list =
      res?.data?.comments ||
      res?.data?.list ||
      res?.data?.data ||
      res?.comments ||
      res?.data ||
      []
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
  } catch (e: any) {
    commentError.value = e?.errMsg || e?.message || '评论加载失败'
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
    post.value.likeCount =
      (post.value.likeCount || 0) + (post.value.isLiked ? 1 : -1)
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// 收藏
async function toggleCollect() {
  if (!post.value) return
  try {
    await interactApi.toggleCollect('POST', postId.value)
    post.value.isCollected = !post.value.isCollected
    post.value.collectCount =
      (post.value.collectCount || 0) + (post.value.isCollected ? 1 : -1)
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// 分享
function sharePost() {
  uni.setClipboardData({
    data: `我正在看「${post.value?.title || '精彩帖子'}」：${post.value?.content?.slice(0, 50)}...`,
    success: () => uni.showToast({ title: '已复制分享文本', icon: 'success' }),
  })
}

// ─── 音频播放 ───
function togglePostAudio() {
  if (!post.value?.audioUrl) return
  if (audioPlaying.value) {
    audioCtx?.pause()
    audioPlaying.value = false
    if (audioTimer) {
      clearInterval(audioTimer)
      audioTimer = null
    }
    return
  }
  audioCtx = uni.createInnerAudioContext()
  audioCtx.src = post.value.audioUrl
  audioCtx.onPlay(() => {
    audioPlaying.value = true
    startAudioProgress()
  })
  audioCtx.onEnded(() => {
    audioPlaying.value = false
    audioProgress.value = 0
    stopAudioProgress()
  })
  audioCtx.onError(() => {
    audioPlaying.value = false
    stopAudioProgress()
  })
  audioCtx.play()
}

function startAudioProgress() {
  stopAudioProgress()
  audioTimer = setInterval(() => {
    if (!audioCtx || !post.value?.audioDuration) return
    const pct = Math.min(
      100,
      (audioCtx.currentTime / post.value.audioDuration) * 100
    )
    audioProgress.value = pct
  }, 200) as any
}

function stopAudioProgress() {
  if (audioTimer) {
    clearInterval(audioTimer)
    audioTimer = null
  }
}

function seekPostAudio(e: any) {
  if (!audioCtx || !post.value?.audioDuration) return
  const width = e.currentTarget?.offsetWidth || 200
  const x = e.detail?.x || 0
  const pct = Math.min(1, Math.max(0, x / width))
  audioCtx.seek(pct * post.value.audioDuration)
  audioProgress.value = pct * 100
}

// 评论
function startReply(comment: CommentItem) {
  replyTo.value = comment
}
function cancelReply() {
  replyTo.value = null
}
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

    commentPage.value = 1
    hasMoreComments.value = true
    await fetchComments(true)
    if (post.value) post.value.commentCount = (post.value.commentCount || 0) + 1
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || '评论失败', icon: 'none' })
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
}

function openLink(url: string) {
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifdef MP-WEIXIN
  uni.setClipboardData({
    data: url,
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  })
  // #endif
}

function goBack() {
  uni.navigateBack()
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

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

/* ===== 帖子卡片 ===== */
.post-card {
  background: #fff;
  padding: 24rpx;
}
.post-author {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.avatar-placeholder {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f0e8d8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}
.author-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.author-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #C41E3A;
}
.post-time {
  font-size: 22rpx;
  color: #bbb;
}
.post-badges {
  display: flex;
  gap: 8rpx;
}
.badge {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
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
  font-size: 36rpx;
  font-weight: bold;
  color: #2C2C2C;
  display: block;
  margin-bottom: 16rpx;
  line-height: 1.5;
}

.post-content {
  font-size: 30rpx;
  color: #444;
  line-height: 1.8;
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 图片 */
.post-images {
  display: flex;
  gap: 8rpx;
  margin-top: 16rpx;
  flex-wrap: wrap;
}
.post-img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 10rpx;
}
.post-img.full {
  width: 100%;
  height: 400rpx;
}

/* 视频 */
.post-video {
  width: 100%;
  height: 400rpx;
  margin-top: 16rpx;
  border-radius: 12rpx;
}

/* 音频 */
.post-audio {
  margin-top: 16rpx;
}
.audio-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: linear-gradient(135deg, #faf5f0, #fdf5e6);
  border-radius: 16rpx;
  border: 1rpx solid #f0e8d8;
}
.audio-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28rpx;
  flex-shrink: 0;
}
.audio-info {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.audio-label {
  font-size: 26rpx;
  color: #2C2C2C;
  font-weight: bold;
}
.audio-secs {
  font-size: 22rpx;
  color: #999;
}
.audio-progress-track {
  flex: 1;
  height: 8rpx;
  background: #e8dcc8;
  border-radius: 4rpx;
  overflow: hidden;
}
.audio-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #C9A96E, #C41E3A);
  border-radius: 4rpx;
  transition: width 0.2s;
}

/* 附件/链接 */
.post-file {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
  padding: 16rpx;
  background: #F5F0E8;
  border-radius: 12rpx;
}
.file-icon {
  font-size: 36rpx;
}
.file-name {
  font-size: 26rpx;
  color: #C41E3A;
}
.post-link {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
  padding: 16rpx;
  background: #e8f0fe;
  border-radius: 12rpx;
}
.link-icon {
  font-size: 32rpx;
}
.link-text {
  font-size: 24rpx;
  color: #1a73e8;
  word-break: break-all;
}

/* 互动栏 */
.post-actions {
  display: flex;
  gap: 48rpx;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F5F0E8;
}
.action-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 28rpx;
  color: #999;
}
.action-item.active {
  color: #C41E3A;
}
.action-count {
  font-size: 26rpx;
}

/* ===== 评论区 ===== */
.comment-section {
  margin-top: 16rpx;
  background: #fff;
  padding: 24rpx;
}
.comment-header {
  margin-bottom: 16rpx;
}
.comment-section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #2C2C2C;
}
.comment-count {
  font-size: 26rpx;
  color: #999;
  font-weight: normal;
}

.comment-list {
  padding: 0;
}
.comment-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.comment-item:last-child {
  border-bottom: none;
}
.comment-main {
  display: flex;
  gap: 16rpx;
}
.comment-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.comment-avatar-placeholder {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #f0e8d8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  flex-shrink: 0;
}
.comment-body {
  flex: 1;
  min-width: 0;
}
.comment-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6rpx;
}
.comment-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #C41E3A;
}
.comment-time {
  font-size: 22rpx;
  color: #ccc;
}
.comment-text {
  font-size: 26rpx;
  color: #444;
  line-height: 1.6;
  display: block;
}
.comment-footer {
  display: flex;
  gap: 24rpx;
  margin-top: 8rpx;
}
.comment-reply-btn {
  font-size: 24rpx;
  color: #999;
}
.comment-expand {
  font-size: 24rpx;
  color: #C9A96E;
}

/* 子回复 */
.reply-list {
  margin-top: 12rpx;
  padding-left: 60rpx;
  background: #FAFAF5;
  border-radius: 8rpx;
  padding: 12rpx 16rpx;
}
.reply-item {
  padding: 8rpx 0;
  font-size: 24rpx;
  color: #555;
  line-height: 1.6;
}
.reply-name {
  color: #C41E3A;
  font-weight: bold;
}
.reply-to {
  color: #999;
}
.reply-text {
  color: #444;
}
.reply-time {
  display: block;
  font-size: 20rpx;
  color: #ccc;
  margin-top: 4rpx;
}

/* 评论输入栏 */
.comment-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #E8E0D5;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  z-index: 100;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.comment-bar-inner {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.comment-input {
  flex: 1;
  height: 60rpx;
  background: #F5F0E8;
  border-radius: 30rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #333;
  box-sizing: border-box;
}
.cancel-reply {
  font-size: 28rpx;
  color: #999;
  padding: 8rpx;
}
.send-btn {
  font-size: 28rpx;
  color: #C41E3A;
  font-weight: bold;
  padding: 8rpx 16rpx;
}
.send-btn.disabled {
  color: #ccc;
}

/* 通用 */
.load-more {
  text-align: center;
  color: #C9A96E;
  padding: 24rpx 0;
  font-size: 26rpx;
}
.no-more {
  text-align: center;
  color: #ccc;
  padding: 24rpx 0;
  font-size: 24rpx;
}
</style>
