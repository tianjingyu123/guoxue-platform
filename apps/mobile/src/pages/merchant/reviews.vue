<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">评价管理</text>
      <view class="header-spacer" />
    </view>

    <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <template v-else>
      <view v-if="!list.length && !loadingMore" class="empty-wrap">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无评价</text>
      </view>

      <scroll-view
        v-else
        class="scroll-wrap"
        scroll-y
        :refresher-enabled="true"
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
        @scrolltolower="onLoadMore"
      >
        <view v-for="item in list" :key="item.id" class="card">
          <!-- 用户信息 -->
          <view class="user-row">
            <view class="avatar">{{ (item.nickname || '匿名')[0] }}</view>
            <view class="user-info">
              <text class="username">{{ item.nickname || '匿名用户' }}</text>
              <view class="stars">
                <text v-for="n in 5" :key="n" class="star" :class="{ active: n <= item.rating }">★</text>
              </view>
            </view>
            <text class="time">{{ item.createdAt }}</text>
          </view>

          <!-- 评价内容 -->
          <view class="content-wrap">
            <text class="content">{{ item.content }}</text>
          </view>

          <!-- 商家回复 -->
          <view v-if="item.reply" class="reply-wrap">
            <text class="reply-label">商家回复：</text>
            <text class="reply-text">{{ item.reply }}</text>
          </view>

          <!-- 回复按钮 -->
          <view v-else class="action-row">
            <view class="reply-btn" @click="openReply(item)">回复</view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="loadingMore" class="load-more-wrap">
          <text class="load-more-text">加载中...</text>
        </view>
        <view v-else-if="!hasMore" class="load-more-wrap">
          <text class="load-more-text">— 没有更多了 —</text>
        </view>
      </scroll-view>
    </template>

    <!-- 回复弹层 -->
    <view v-if="showReply" class="overlay" @click="closeReply">
      <view class="dialog" @click.stop>
        <text class="dialog-title">回复评价</text>
        <textarea
          class="dialog-textarea"
          v-model="replyText"
          placeholder="请输入回复内容..."
          maxlength="500"
        />
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @click="closeReply">取消</view>
          <view class="dialog-btn confirm" @click="submitReply">提交</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { merchantApi } from '@/api'

const loading = ref(true)
const refreshing = ref(false)
const loadingMore = ref(false)
const list = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(true)

const showReply = ref(false)
const replyText = ref('')
const currentId = ref<string | null>(null)

onMounted(() => fetchData())

async function fetchData() {
  try {
    const res = await merchantApi.listReviews({ page: page.value, pageSize: pageSize.value })
    const data = res?.list || res?.records || res?.data || []
    list.value = page.value === 1 ? data : [...list.value, ...data]
    hasMore.value = data.length >= pageSize.value
  } catch {
    if (page.value === 1) list.value = []
  } finally {
    loading.value = false
    refreshing.value = false
    loadingMore.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  page.value = 1
  await fetchData()
}

async function onLoadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  await fetchData()
}

function openReply(item: any) {
  currentId.value = item.id
  replyText.value = ''
  showReply.value = true
}

function closeReply() {
  showReply.value = false
  replyText.value = ''
  currentId.value = null
}

async function submitReply() {
  if (!replyText.value.trim()) {
    uni.showToast({ title: '请输入回复内容', icon: 'none' })
    return
  }
  if (!currentId.value) return
  try {
    await merchantApi.replyReview(currentId.value, { reply: replyText.value.trim() })
    uni.showToast({ title: '回复成功', icon: 'success' })
    // 刷新列表
    showReply.value = false
    replyText.value = ''
    currentId.value = null
    page.value = 1
    await fetchData()
  } catch {
    uni.showToast({ title: '回复失败，请重试', icon: 'none' })
  }
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 60rpx; }

.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

.loading-wrap { display: flex; align-items: center; justify-content: center; height: 400rpx; }
.loading-text { font-size: 28rpx; color: #999; }

.scroll-wrap { height: calc(100vh - 120rpx); }

/* 空状态 */
.empty-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 500rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }

/* 卡片 */
.card { margin: 20rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }

/* 用户行 */
.user-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.avatar { width: 60rpx; height: 60rpx; border-radius: 50%; background: #5a3a1a; color: #fff; font-size: 26rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.user-info { flex: 1; margin-left: 16rpx; }
.username { font-size: 26rpx; font-weight: 600; color: #3C2415; display: block; margin-bottom: 4rpx; }
.stars { display: flex; gap: 4rpx; }
.star { font-size: 24rpx; color: #ddd; }
.star.active { color: #FFB800; }
.time { font-size: 20rpx; color: #bbb; flex-shrink: 0; }

/* 评价内容 */
.content-wrap { padding: 0 0 16rpx; border-bottom: 1rpx solid #f0ebe0; }
.content { font-size: 26rpx; color: #555; line-height: 1.6; }

/* 商家回复 */
.reply-wrap { margin-top: 16rpx; padding: 16rpx; background: #F9F6F0; border-radius: 12rpx; border-left: 4rpx solid #8b6914; }
.reply-label { font-size: 22rpx; color: #8b6914; font-weight: 600; display: block; margin-bottom: 4rpx; }
.reply-text { font-size: 24rpx; color: #666; line-height: 1.6; }

/* 回复按钮 */
.action-row { margin-top: 16rpx; display: flex; justify-content: flex-end; }
.reply-btn { padding: 10rpx 32rpx; background: #5a3a1a; border-radius: 8rpx; font-size: 24rpx; color: #fff; }

/* 加载更多 */
.load-more-wrap { display: flex; justify-content: center; padding: 24rpx 0; }
.load-more-text { font-size: 24rpx; color: #ccc; }

/* 弹层 */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 999; }
.dialog { width: 620rpx; background: #fff; border-radius: 20rpx; padding: 32rpx; }
.dialog-title { font-size: 30rpx; font-weight: 600; color: #3C2415; display: block; text-align: center; margin-bottom: 24rpx; }
.dialog-textarea { width: 100%; height: 200rpx; border: 1rpx solid #E8E0D5; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; color: #333; box-sizing: border-box; background: #FAFAFA; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 20rpx; margin-top: 24rpx; }
.dialog-btn { padding: 14rpx 40rpx; border-radius: 10rpx; font-size: 26rpx; }
.dialog-btn.cancel { background: #f0ebe0; color: #666; }
.dialog-btn.confirm { background: #5a3a1a; color: #fff; }
</style>
