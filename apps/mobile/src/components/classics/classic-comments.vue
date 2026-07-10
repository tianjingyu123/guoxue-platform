<template>
  <view class="cc-sec">
    <view class="cc-head">
      <text class="cc-title">书友评论</text>
      <text v-if="total > 0" class="cc-meta">{{ total }} 条</text>
    </view>

    <view class="cc-card">
      <!-- 写评论输入 -->
      <view class="cc-input-row">
        <view class="cc-input-avatar"><app-icon name="user" :size="30" color="#c41e3a" /></view>
        <input
          v-model="draft"
          class="cc-input"
          :placeholder="replyTo ? `回复 ${replyTo.nickname}…` : '读罢此书，说说你的见解…'"
          placeholder-class="cc-ph"
          confirm-type="send"
          :maxlength="500"
          @confirm="submit"
        />
        <view class="cc-send" :class="{ 'cc-send--disabled': !draft.trim() || submitting }" @tap="submit">
          <text class="cc-send-text">{{ submitting ? '发布中' : '发布' }}</text>
        </view>
      </view>
      <view v-if="replyTo" class="cc-replying">
        <text class="cc-replying-text">正在回复 {{ replyTo.nickname }}</text>
        <text class="cc-replying-cancel" @tap="replyTo = null">取消</text>
      </view>

      <!-- 加载态 -->
      <view v-if="loading" class="cc-state"><text class="cc-state-text">评论加载中…</text></view>
      <!-- 错误态 -->
      <view v-else-if="error" class="cc-state">
        <text class="cc-state-text">{{ error }}</text>
        <text class="cc-retry" @tap="fetchComments(1)">重试</text>
      </view>
      <!-- 空态 -->
      <view v-else-if="!comments.length" class="cc-state">
        <text class="cc-empty-verse">奇文共欣赏，疑义相与析</text>
        <text class="cc-state-text">还没有书友留下见解，写下第一条评论吧</text>
      </view>

      <!-- 评论列表 -->
      <view v-else class="cc-list">
        <view v-for="c in comments" :key="c.id" class="cc-item">
          <image v-if="c.avatar" :src="c.avatar" class="cc-avatar" mode="aspectFill" />
          <view v-else class="cc-avatar cc-avatar--text"><text class="cc-avatar-char">{{ c.nickname.charAt(0) }}</text></view>
          <view class="cc-item-body">
            <view class="cc-item-head">
              <text class="cc-name">{{ c.nickname }}</text>
              <text class="cc-time">{{ formatCommentTime(c.createdAt) }}</text>
            </view>
            <text class="cc-content">{{ c.content }}</text>
            <view class="cc-actions">
              <view class="cc-action" @tap="like(c)">
                <app-icon name="heart" :size="26" :color="c.liked ? '#c41e3a' : '#a89e8c'" :fill="c.liked" />
                <text class="cc-action-text" :class="{ 'cc-action-text--on': c.liked }">{{ c.likes || '' }}</text>
              </view>
              <view class="cc-action" @tap="startReply(c)">
                <app-icon name="message-square" :size="26" color="#a89e8c" />
                <text class="cc-action-text">回复</text>
              </view>
            </view>
            <!-- 楼中楼 -->
            <view v-if="c.replies.length" class="cc-replies">
              <view v-for="r in c.replies" :key="r.id" class="cc-reply">
                <text class="cc-reply-name">{{ r.nickname }}：</text>
                <text class="cc-reply-content">{{ r.content }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-if="hasMore" class="cc-more" @tap="fetchComments(page + 1)">
          <text class="cc-more-text">{{ loadingMore ? '加载中…' : '查看更多评论' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 古籍详情页「书友评论」——真连通用评论模块（targetType=CLASSIC_BOOK）
 * GET /comment?targetType=CLASSIC_BOOK&targetId= 列表（含楼中楼 replies）
 * POST /comment 发布（登录态·提交成功立刻本地插入，不等刷新）
 */
import { ref, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { apiGet, apiPost } from '@/utils/request'
import { formatCommentTime } from '@/lib/video-data'
import { getToken } from '@/utils/storage'

const props = defineProps<{ bookId: string }>()

const TARGET_TYPE = 'CLASSIC_BOOK'
const PAGE_SIZE = 10

interface CommentVM {
  id: string
  nickname: string
  avatar: string
  content: string
  likes: number
  liked: boolean
  createdAt: string
  replies: CommentVM[]
}
interface RawComment {
  id?: string
  content?: string
  likeCount?: number
  createdAt?: string
  user?: { id?: string; nickname?: string; avatar?: string } | null
  replies?: RawComment[]
}

const comments = ref<CommentVM[]>([])
const total = ref(0)
const page = ref(1)
const hasMore = ref(false)
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const draft = ref('')
const submitting = ref(false)
const replyTo = ref<CommentVM | null>(null)

function adapt(c: RawComment): CommentVM {
  return {
    id: c.id || '',
    nickname: c.user?.nickname || '书友',
    avatar: c.user?.avatar || '',
    content: c.content || '',
    likes: c.likeCount ?? 0,
    liked: false,
    createdAt: c.createdAt || '',
    replies: Array.isArray(c.replies) ? c.replies.map(adapt) : [],
  }
}

async function fetchComments(p = 1) {
  if (!props.bookId) return
  if (p === 1) { loading.value = true; error.value = '' }
  else loadingMore.value = true
  try {
    const res = await apiGet<{ data?: RawComment[]; total?: number }>(
      `/comment?targetType=${TARGET_TYPE}&targetId=${props.bookId}&page=${p}&pageSize=${PAGE_SIZE}`,
    )
    const items = Array.isArray(res?.data) ? res.data.map(adapt) : []
    comments.value = p === 1 ? items : [...comments.value, ...items]
    total.value = res?.total ?? items.length
    page.value = p
    hasMore.value = comments.value.length < total.value
  } catch (e) {
    if (p === 1) error.value = (e as Error)?.message || '评论加载失败'
    else uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

watch(() => props.bookId, (id) => { if (id) fetchComments(1) }, { immediate: true })

function needLogin() {
  uni.showModal({
    title: '需要登录',
    content: '登录后即可参与书友评论',
    confirmText: '去登录',
    success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pkg-auth/login/index' }) },
  })
}

function startReply(c: CommentVM) {
  if (!getToken()) { needLogin(); return }
  replyTo.value = c
}

async function submit() {
  const content = draft.value.trim()
  if (!content || submitting.value) return
  if (!getToken()) { needLogin(); return }
  submitting.value = true
  try {
    const created = await apiPost<RawComment>('/comment', {
      targetType: TARGET_TYPE,
      targetId: props.bookId,
      content,
      ...(replyTo.value ? { parentId: replyTo.value.id } : {}),
    })
    const vm = adapt(created || {})
    if (!vm.content) vm.content = content
    if (!vm.createdAt) vm.createdAt = new Date().toISOString()
    // 立刻本地插入，发了马上能看到
    if (replyTo.value) {
      const parent = comments.value.find((c) => c.id === replyTo.value?.id)
      if (parent) parent.replies.push(vm)
      replyTo.value = null
    } else {
      comments.value.unshift(vm)
      total.value += 1
    }
    draft.value = ''
    uni.showToast({ title: '已发布', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发布失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function like(c: CommentVM) {
  if (c.liked) return
  if (!getToken()) { needLogin(); return }
  c.liked = true
  c.likes += 1
  try {
    await apiPost<unknown>(`/comment/${c.id}/like`)
  } catch {
    c.liked = false
    c.likes -= 1
  }
}
</script>

<style scoped lang="scss">
.cc-sec {
  padding: 0 40rpx 32rpx;
}
.cc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.cc-title {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 36rpx;
  font-weight: 700;
  color: var(--foreground, #2c2c2c);
}
.cc-meta {
  font-size: 24rpx;
  color: var(--muted-foreground, #a89e8c);
}
.cc-card {
  border-radius: 32rpx;
  background: var(--card, #ffffff);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  padding: 28rpx;
}
/* 输入行 */
.cc-input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cc-input-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cc-input {
  flex: 1;
  height: 72rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--classics-bg, #f4f2ee);
  font-size: 26rpx;
  color: #2c2c2c;
}
.cc-ph {
  color: #b8ae9c;
}
.cc-send {
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--brand, #c41e3a);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active { opacity: 0.85; }
}
.cc-send--disabled {
  opacity: 0.45;
}
.cc-send-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #ffffff;
}
.cc-replying {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
  padding: 8rpx 24rpx;
  border-radius: 12rpx;
  background: rgba(196, 30, 58, 0.06);
}
.cc-replying-text {
  font-size: 22rpx;
  color: var(--brand, #c41e3a);
}
.cc-replying-cancel {
  font-size: 22rpx;
  color: #a89e8c;
}
/* 状态 */
.cc-state {
  padding: 56rpx 0 32rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.cc-empty-verse {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 30rpx;
  font-weight: 700;
  color: #4a4136;
  letter-spacing: 2rpx;
}
.cc-state-text {
  font-size: 24rpx;
  color: #a89e8c;
}
.cc-retry {
  font-size: 26rpx;
  color: var(--brand, #c41e3a);
  font-weight: 600;
}
/* 列表 */
.cc-list {
  margin-top: 12rpx;
}
.cc-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 28rpx 0 24rpx;
  border-bottom: 2rpx solid rgba(0, 0, 0, 0.04);
  &:last-of-type { border-bottom: none; }
}
.cc-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
  background: var(--classics-bg, #f4f2ee);
}
.cc-avatar--text {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #a06a38;
}
.cc-avatar-char {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}
.cc-item-body {
  flex: 1;
  min-width: 0;
}
.cc-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.cc-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.cc-time {
  font-size: 22rpx;
  color: #a89e8c;
}
.cc-content {
  display: block;
  font-size: 28rpx;
  line-height: 1.7;
  color: #4a4136;
}
.cc-actions {
  display: flex;
  align-items: center;
  gap: 40rpx;
  margin-top: 12rpx;
}
.cc-action {
  display: flex;
  align-items: center;
  gap: 8rpx;
  &:active { opacity: 0.6; }
}
.cc-action-text {
  font-size: 22rpx;
  color: #a89e8c;
}
.cc-action-text--on {
  color: var(--brand, #c41e3a);
}
/* 楼中楼 */
.cc-replies {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: var(--classics-bg, #f4f2ee);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.cc-reply {
  font-size: 24rpx;
  line-height: 1.6;
}
.cc-reply-name {
  color: var(--brand, #c41e3a);
  font-weight: 500;
  font-size: 24rpx;
}
.cc-reply-content {
  color: #4a4136;
  font-size: 24rpx;
}
/* 加载更多 */
.cc-more {
  padding: 24rpx 0 4rpx;
  text-align: center;
  &:active { opacity: 0.6; }
}
.cc-more-text {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--brand, #c41e3a);
}
</style>
