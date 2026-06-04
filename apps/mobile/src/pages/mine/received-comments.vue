<template>
  <view class="page">
    <view class="header">
      <text
        class="back-btn"
        @click="goBack"
      >
        ‹
      </text>
      <text class="header-title">
        收到的评论
      </text>
      <view style="width:60rpx" />
    </view>

    <LoadingSkeleton v-if="loading" />
    <view
      v-else-if="list.length"
      class="list"
    >
      <view
        v-for="item in list"
        :key="item.id"
        class="comment-item"
      >
        <view class="c-header">
          <image
            :src="item.user?.avatar || '/static/default-avatar.png'"
            class="c-avatar"
            mode="aspectFill"
          />
          <view class="c-user-wrap">
            <text class="c-name">
              {{ item.user?.nickname || '用户' }}
            </text>
            <text class="c-time">
              {{ formatTime(item.createdAt) }}
            </text>
          </view>
          <view
            class="c-reply-btn"
            @click="showReply(item)"
          >
            回复
          </view>
        </view>
        <text class="c-content">
          {{ item.content }}
        </text>

        <!-- 关联内容 -->
        <view
          class="c-target"
          @click="goTarget(item)"
        >
          <text class="c-target-icon">
            💬
          </text>
          <view class="c-target-text">
            <text class="c-target-label">
              评论了你的{{ targetTypeLabel(item.targetType) }}
            </text>
            <text class="c-target-title">
              {{ item.targetTitle || '' }}
            </text>
          </view>
        </view>

        <!-- 回复区域 -->
        <view
          v-if="item.reply"
          class="c-my-reply"
        >
          <text class="c-my-reply-label">
            你的回复：
          </text>
          <text class="c-my-reply-text">
            {{ item.reply }}
          </text>
        </view>

        <view
          v-if="replyTargetId === item.id"
          class="reply-input-wrap"
        >
          <input
            v-model="replyText"
            class="reply-input"
            :placeholder="'回复 ' + (item.user?.nickname || '用户')"
            @confirm="doReply(item)"
          >
          <text
            class="reply-send"
            @click="doReply(item)"
          >
            发送
          </text>
        </view>
      </view>

      <view
        v-if="hasMore"
        class="load-more"
        @click="loadMore"
      >
        <text>{{ loadingMore ? '加载中...' : '点击加载更多' }}</text>
      </view>
    </view>
    <EmptyState
      v-else
      text="暂无收到的评论"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { interactApi } from '../../api'

const loading = ref(true)
const loadingMore = ref(false)
const list = ref<any[]>([])
const page = ref(1)
const hasMore = ref(false)
const replyTargetId = ref<number | null>(null)
const replyText = ref('')

onMounted(async () => {
  try {
    const res: any = await interactApi.getReceivedComments({ page: 1 })
    list.value = Array.isArray(res) ? res : res?.data || res?.list || []
    hasMore.value = list.value.length >= 10
  } catch {} finally { loading.value = false }
})

async function loadMore() {
  loadingMore.value = true; page.value++
  try {
    const res: any = await interactApi.getReceivedComments({ page: page.value })
    const items = Array.isArray(res) ? res : res?.data || res?.list || []
    list.value.push(...items)
    hasMore.value = items.length >= 10
  } catch {} finally { loadingMore.value = false }
}

function showReply(item: any) {
  replyTargetId.value = replyTargetId.value === item.id ? null : item.id
  replyText.value = ''
}

async function doReply(item: any) {
  if (!replyText.value.trim()) return
  try {
    await interactApi.replyComment({ commentId: item.id, content: replyText.value })
    item.reply = replyText.value
    replyTargetId.value = null
    replyText.value = ''
    uni.showToast({ title: '回复成功', icon: 'success' })
  } catch { uni.showToast({ title: '回复失败', icon: 'none' }) }
}

function formatTime(t?: string) {
  if (!t) return ''
  const d = new Date(t); const now = new Date(); const diff = now.getTime() - d.getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function targetTypeLabel(type?: string) {
  const m: Record<string, string> = { article: '文章', video: '视频', post: '帖子', course: '课程' }
  return m[type || ''] || '内容'
}

function goTarget(item: any) {
  if (item.targetId && item.targetType) {
    uni.navigateTo({ url: `/pages/${item.targetType}/${item.targetType}-detail?id=${item.targetId}` })
  }
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.list { padding: 16rpx 24rpx; }
.comment-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.c-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.c-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #f5f0e8; }
.c-user-wrap { flex: 1; }
.c-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.c-time { font-size: 20rpx; color: #ccc; display: block; margin-top: 2rpx; }
.c-reply-btn { padding: 6rpx 20rpx; background: #f5f0e8; color: #C41E3A; border-radius: 20rpx; font-size: 22rpx; }
.c-content { font-size: 28rpx; color: #2C2C2C; line-height: 1.6; display: block; }
.c-target { display: flex; align-items: flex-start; gap: 10rpx; margin-top: 12rpx; padding: 14rpx; background: #F5F0E8; border-radius: 12rpx; }
.c-target-icon { font-size: 24rpx; flex-shrink: 0; }
.c-target-text { flex: 1; min-width: 0; }
.c-target-label { font-size: 20rpx; color: #999; display: block; }
.c-target-title { font-size: 24rpx; color: #666; display: block; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.c-my-reply { margin-top: 12rpx; padding: 12rpx; background: #fef0f0; border-radius: 12rpx; }
.c-my-reply-label { font-size: 22rpx; color: #C41E3A; display: block; margin-bottom: 4rpx; }
.c-my-reply-text { font-size: 24rpx; color: #666; line-height: 1.5; }
.reply-input-wrap { display: flex; align-items: center; gap: 12rpx; margin-top: 12rpx; }
.reply-input { flex: 1; padding: 12rpx 16rpx; background: #F5F0E8; border-radius: 20rpx; font-size: 24rpx; }
.reply-send { padding: 10rpx 24rpx; background: #C41E3A; color: #fff; border-radius: 20rpx; font-size: 24rpx; }
.load-more { text-align: center; padding: 24rpx; font-size: 26rpx; color: #999; }
</style>
