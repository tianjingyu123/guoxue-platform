<template>
  <view class="comment-wrapper">
    <!-- 评论输入框 -->
    <view class="comment-input-bar">
      <input
        v-model="inputText"
        :placeholder="replyTarget ? `回复 ${replyTarget.nickname}：` : '写评论...'"
        class="input-field"
        confirm-type="send"
        @confirm="submitComment"
      />
      <button class="send-btn" size="mini" :disabled="!inputText.trim()" @click="submitComment">
        发送
      </button>
    </view>
    <text v-if="replyTarget" class="reply-hint" @click="cancelReply">
      取消回复 @{{ replyTarget.nickname }}
    </text>

    <!-- 评论列表 -->
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="list.length === 0" class="empty">暂无评论，来说两句吧</view>
    <view v-else class="comment-list">
      <view v-for="item in list" :key="item.id" class="comment-item">
        <view class="comment-header">
          <image
            v-if="item.user?.avatar"
            :src="item.user.avatar"
            class="avatar"
            mode="aspectFill"
          />
          <view v-else class="avatar-placeholder">{{ (item.user?.nickname || '?')[0] }}</view>
          <view class="comment-user">
            <text class="nickname">{{ item.user?.nickname || '匿名' }}</text>
            <text class="time">{{ formatTime(item.createdAt) }}</text>
          </view>
        </view>
        <view class="comment-content">{{ item.content }}</view>
        <view class="comment-actions">
          <text class="action-btn" @click="toggleLike(item)">
            {{ item.liked ? '❤️' : '🤍' }} {{ item.likeCount || 0 }}
          </text>
          <text class="action-btn" @click="startReply(item)">💬 回复</text>
        </view>
        <!-- 嵌套回复 -->
        <view v-if="item.replies && item.replies.length" class="replies">
          <view v-for="reply in item.replies" :key="reply.id" class="reply-item">
            <view class="reply-header">
              <text class="reply-nickname">{{ reply.user?.nickname || '匿名' }}</text>
              <text v-if="reply.replyTo" class="reply-to">回复</text>
              <text v-if="reply.replyTo" class="reply-target">{{ reply.replyTo.nickname }}</text>
            </view>
            <view class="reply-content">{{ reply.content }}</view>
            <view class="reply-actions">
              <text class="action-btn">{{ formatTime(reply.createdAt) }}</text>
              <text class="action-btn" @click="startReply(item, reply)">回复</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { interactApi } from '../../api'

const props = defineProps<{
  targetType: string
  targetId: string
}>()

interface CommentUser {
  nickname?: string
  avatar?: string
}

interface Comment {
  id: string
  content: string
  createdAt?: string
  likeCount?: number
  liked?: boolean
  user?: CommentUser
  replies?: Comment[]
}

const list = ref<Comment[]>([])
const loading = ref(false)
const inputText = ref('')
const replyTarget = ref<{ id: string; nickname: string; parentId?: string } | null>(null)

onMounted(() => fetchComments())

async function fetchComments() {
  loading.value = true
  try {
    const res = await interactApi.comments(props.targetType, props.targetId)
    list.value = (res as any).comments || (res as any) || []
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function submitComment() {
  const text = inputText.value.trim()
  if (!text) return

  try {
    const data: any = {
      targetType: props.targetType,
      targetId: props.targetId,
      content: text,
    }
    if (replyTarget.value) {
      data.parentId = replyTarget.value.parentId || replyTarget.value.id
      data.replyToId = replyTarget.value.id
    }
    await interactApi.addComment(data)
    uni.showToast({ title: '发送成功', icon: 'none' })
    inputText.value = ''
    replyTarget.value = null
    fetchComments()
  } catch {
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

function startReply(comment: Comment, reply?: Comment) {
  if (reply) {
    replyTarget.value = {
      id: reply.id,
      nickname: reply.user?.nickname || '匿名',
      parentId: comment.id,
    }
  } else {
    replyTarget.value = {
      id: comment.id,
      nickname: comment.user?.nickname || '匿名',
    }
  }
}

function cancelReply() {
  replyTarget.value = null
}

function toggleLike(item: Comment) {
  item.liked = !item.liked
  item.likeCount = (item.likeCount ?? 0) + (item.liked ? 1 : -1)
  interactApi.toggleLike('COMMENT', item.id)
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.comment-wrapper {
  padding-top: 8px;
}

.comment-input-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}

.input-field {
  flex: 1;
  background: #fff;
  border-radius: 20px;
  padding: 8px 14px;
  font-size: 14px;
  border: 1px solid #E8E0D5;
  color: #333;
}

.send-btn {
  background: #8b4513;
  color: #fff;
  border-radius: 16px;
  font-size: 13px;
  padding: 0 16px;
  line-height: 2.2;
  border: none;
}

.send-btn[disabled] {
  opacity: 0.5;
}

.reply-hint {
  font-size: 12px;
  color: #8b4513;
  padding: 2px 14px;
  display: inline-block;
  margin-bottom: 4px;
}

.loading,
.empty {
  text-align: center;
  color: #999;
  padding: 30px 0;
  font-size: 14px;
}

.comment-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0ece4;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #8b4513;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.comment-user {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nickname {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.time {
  font-size: 11px;
  color: #bbb;
}

.comment-content {
  font-size: 14px;
  color: #444;
  line-height: 1.6;
  margin: 4px 0 6px 46px;
  word-break: break-all;
}

.comment-actions {
  display: flex;
  gap: 16px;
  margin-left: 46px;
}

.action-btn {
  font-size: 12px;
  color: #999;
}

/* 嵌套回复 */
.replies {
  margin: 8px 0 0 46px;
  background: #faf8f4;
  border-radius: 6px;
  padding: 8px 10px;
}

.reply-item {
  padding: 6px 0;
  border-bottom: 1px solid #f0ece4;
}

.reply-item:last-child {
  border-bottom: none;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  margin-bottom: 3px;
}

.reply-nickname {
  color: #8b4513;
  font-weight: 500;
}

.reply-to {
  color: #999;
}

.reply-target {
  color: #8b4513;
}

.reply-content {
  font-size: 13px;
  color: #444;
  line-height: 1.5;
  word-break: break-all;
}

.reply-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 11px;
  color: #bbb;
}

.reply-actions .action-btn {
  font-size: 11px;
}
</style>
