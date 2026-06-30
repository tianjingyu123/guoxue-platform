<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppError from '@/components/common/app-error.vue'
import {
  mineApi,
  commentTypeNames,
  type ReceivedCommentItem,
} from '@/lib/mine-data'

const list = ref<ReceivedCommentItem[]>([])
const filter = ref<'all' | 'unreplied'>('all')

// 页面四状态：loading / error / empty / normal
const loading = ref(true)
const loadError = ref(false)

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    const data = await mineApi.getReceivedComments()
    list.value = data.map((c) => ({ ...c }))
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onLoad(() => loadData())

const unrepliedCount = computed(() => list.value.filter((c) => !c.isReplied).length)
const filtered = computed(() =>
  filter.value === 'unreplied' ? list.value.filter((c) => !c.isReplied) : list.value,
)
const isEmpty = computed(() => filtered.value.length === 0)

// 回复弹窗
const replyOpen = ref(false)
const replying = ref<ReceivedCommentItem | null>(null)
const replyContent = ref('')
const sending = ref(false)

function openReply(c: ReceivedCommentItem) {
  replying.value = c
  replyContent.value = ''
  replyOpen.value = true
}
function submitReply() {
  if (!replying.value || !replyContent.value.trim()) return
  sending.value = true
  setTimeout(() => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    list.value = list.value.map((c) =>
      c.id === replying.value!.id
        ? { ...c, isReplied: true, myReply: { content: replyContent.value.trim(), createdAt: now } }
        : c,
    )
    sending.value = false
    replyOpen.value = false
    uni.showToast({ title: '回复成功', icon: 'none' })
  }, 500)
}
function openContent() {
  uni.showToast({ title: '内容详情开发中', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <app-nav-bar
      title="收到的评论"
      :title-size="36"
      color="#fff"
      background="#C41E3A"
      no-border
    >
      <template #right>
        <view class="nav-filter">
          <AppIcon name="filter" :size="20" color="#fff" />
          <view v-if="unrepliedCount > 0" class="nav-filter-dot" />
        </view>
      </template>
    </app-nav-bar>

    <!-- 筛选 -->
    <view class="filter-row">
      <text class="filter-chip" :class="{ active: filter === 'all' }" @tap="filter = 'all'">全部</text>
      <text class="filter-chip" :class="{ active: filter === 'unreplied' }" @tap="filter = 'unreplied'">
        待回复{{ unrepliedCount > 0 ? ` (${unrepliedCount})` : '' }}
      </text>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="skeleton">
      <view v-for="i in 3" :key="i" class="sk-card">
        <view class="sk-avatar shimmer" />
        <view class="sk-body">
          <view class="sk-line w40 shimmer" />
          <view class="sk-line w80 shimmer" />
          <view class="sk-block shimmer" />
        </view>
      </view>
    </view>

    <!-- 加载失败 -->
    <AppError
      v-else-if="loadError"
      title="评论加载失败"
      desc="网络异常，请稍后重试"
      @retry="loadData"
    />

    <!-- 空态 -->
    <view v-else-if="isEmpty" class="empty">
      <view class="empty-icon"><AppIcon name="message-circle" :size="44" color="#C9C2B6" /></view>
      <text class="empty-title">{{ filter === 'unreplied' ? '暂无待回复的评论' : '暂无新评论' }}</text>
    </view>

    <scroll-view v-else-if="!loading && !loadError" scroll-y class="scroll">
      <view class="comment-list">
        <view
          v-for="c in filtered"
          :key="c.id"
          class="card"
          :class="{ unreplied: !c.isReplied }"
        >
          <view class="card-top">
            <image lazy-load class="avatar" :src="c.commenter.avatar" mode="aspectFill" />
            <view class="card-body">
              <view class="name-row">
                <text class="name">{{ c.commenter.nickname }}</text>
                <text v-if="c.commenter.level" class="level">Lv.{{ c.commenter.level }}</text>
                <text v-if="!c.isReplied" class="pending">待回复</text>
              </view>
              <text class="content">{{ c.content }}</text>
              <text class="time">{{ c.createdAt }}</text>

              <!-- 我的内容 -->
              <view class="my-content" @tap="openContent">
                <text class="mc-label">评论了我的{{ commentTypeNames[c.myContent.type] }}</text>
                <text class="mc-title">{{ c.myContent.title }}</text>
              </view>

              <!-- 我的回复 -->
              <view v-if="c.myReply" class="my-reply">
                <text class="mr-label">我的回复</text>
                <text class="mr-content">{{ c.myReply.content }}</text>
                <text class="mr-time">{{ c.myReply.createdAt }}</text>
              </view>

              <!-- 操作 -->
              <view class="actions">
                <view v-if="!c.isReplied" class="btn-reply" @tap="openReply(c)">
                  <AppIcon name="message-circle" :size="16" color="#fff" />
                  <text class="btn-reply-text">回复</text>
                </view>
                <view class="btn-view" @tap="openContent">
                  <text class="btn-view-text">查看原文</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="list-foot">已显示全部评论</view>
    </scroll-view>

    <!-- 回复弹窗 -->
    <view v-if="replyOpen" class="mask center mask-fade-in" @tap="replyOpen = false">
      <view class="dialog dialog-pop-in" @tap.stop>
        <view class="dialog-head">
          <text class="dialog-title">回复评论</text>
          <view class="dialog-close" @tap="replyOpen = false">
            <AppIcon name="x" :size="20" color="#8a8178" />
          </view>
        </view>
        <view v-if="replying" class="origin">
          <view class="origin-head">
            <image lazy-load class="origin-avatar" :src="replying.commenter.avatar" mode="aspectFill" />
            <text class="origin-name">{{ replying.commenter.nickname }}</text>
          </view>
          <text class="origin-content">{{ replying.content }}</text>
        </view>
        <textarea
          v-model="replyContent"
          class="reply-input"
          placeholder="写下你的回复..."
          placeholder-class="ph"
          :maxlength="500"
          auto-height
        />
        <text class="reply-count">{{ replyContent.length }}/500</text>
        <view class="dialog-actions">
          <view class="dialog-btn ghost" @tap="replyOpen = false"><text class="dialog-btn-text">取消</text></view>
          <view
            class="dialog-btn solid"
            :class="{ disabled: !replyContent.trim() || sending }"
            @tap="submitReply"
          >
            <AppIcon name="send" :size="16" color="#fff" />
            <text class="dialog-btn-text solid-text">{{ sending ? '发送中...' : '发送' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.nav-filter { position: relative; width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.nav-filter-dot { position: absolute; top: 6rpx; right: 6rpx; width: 14rpx; height: 14rpx; border-radius: 50%; background: #C9A96E; }

.filter-row { display: flex; gap: 16rpx; padding: 20rpx 32rpx; background: var(--brand); }
.filter-chip { font-size: 26rpx; color: rgba(255,255,255,0.85); border: 1rpx solid rgba(255,255,255,0.4); padding: 8rpx 28rpx; border-radius: 999rpx; }
.filter-chip.active { background: #fff; color: var(--brand); border-color: #fff; font-weight: 500; }

.skeleton { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sk-card { background: #fff; border-radius: 20rpx; padding: 24rpx; display: flex; gap: 20rpx; }
.sk-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; flex-shrink: 0; }
.sk-body { flex: 1; display: flex; flex-direction: column; gap: 16rpx; }
.sk-line { height: 28rpx; border-radius: 8rpx; }
.sk-line.w40 { width: 40%; }
.sk-line.w80 { width: 80%; }
.sk-block { height: 100rpx; border-radius: 12rpx; }
.shimmer { background: linear-gradient(90deg, #F2ECE1 25%, #EBE3D6 37%, #F2ECE1 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; }
@keyframes shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

.empty { flex: 1; padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.empty-icon { width: 140rpx; height: 140rpx; border-radius: 50%; background: #F2ECE1; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.empty-title { font-size: 28rpx; color: #6f6760; }

.scroll { flex: 1; padding: 24rpx; box-sizing: border-box; }
.comment-list { display: flex; flex-direction: column; gap: 20rpx; }
.card { background: #fff; border-radius: 20rpx; padding: 24rpx; }
.card.unreplied { border-left: 6rpx solid var(--brand); }
.card-top { display: flex; gap: 20rpx; }
.avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #F2ECE1; flex-shrink: 0; }
.card-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12rpx; }
.name-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.level { font-size: 20rpx; color: #C9A96E; border: 1rpx solid rgba(201,169,110,0.4); padding: 2rpx 10rpx; border-radius: 8rpx; }
.pending { font-size: 20rpx; color: #fff; background: var(--brand); padding: 2rpx 12rpx; border-radius: 8rpx; }
.content { font-size: 28rpx; color: #4a4a4a; line-height: 1.6; }
.time { font-size: 22rpx; color: #b8b0a4; }

.my-content { background: #FAF8F5; border-radius: 14rpx; padding: 18rpx; display: flex; flex-direction: column; gap: 8rpx; }
.mc-label { font-size: 22rpx; color: #8a8178; }
.mc-title { font-size: 26rpx; color: #4a4a4a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.my-reply { background: rgba(196,30,58,0.05); border-left: 4rpx solid var(--brand); border-radius: 12rpx; padding: 18rpx; display: flex; flex-direction: column; gap: 8rpx; }
.mr-label { font-size: 22rpx; color: var(--brand); }
.mr-content { font-size: 26rpx; color: #4a4a4a; line-height: 1.5; }
.mr-time { font-size: 20rpx; color: #b8b0a4; }

.actions { display: flex; gap: 16rpx; margin-top: 4rpx; }
.btn-reply { display: flex; align-items: center; gap: 8rpx; background: var(--brand); padding: 12rpx 32rpx; border-radius: 999rpx; }
.btn-reply-text { font-size: 26rpx; color: #fff; }
.btn-view { padding: 12rpx 32rpx; border: 1rpx solid #C9A96E; border-radius: 999rpx; }
.btn-view-text { font-size: 26rpx; color: #C9A96E; }

.list-foot { text-align: center; padding: 24rpx 0; font-size: 24rpx; color: #b8b0a4; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; display: flex; }
.mask.center { align-items: center; justify-content: center; padding: 0 48rpx; }
.dialog { width: 100%; max-width: 600rpx; background: #fff; border-radius: 28rpx; padding: 32rpx; box-sizing: border-box; }
.dialog-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.dialog-title { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.dialog-close { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.origin { background: #FAF8F5; border-radius: 14rpx; padding: 20rpx; margin-bottom: 24rpx; }
.origin-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.origin-avatar { width: 44rpx; height: 44rpx; border-radius: 50%; background: #F2ECE1; }
.origin-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.origin-content { font-size: 26rpx; color: #6f6760; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.reply-input { width: 100%; min-height: 180rpx; background: #FAF8F5; border: 1rpx solid #EDE7DC; border-radius: 16rpx; padding: 20rpx; box-sizing: border-box; font-size: 28rpx; color: #2C2C2C; }
.ph { color: #b8b0a4; }
.reply-count { display: block; text-align: right; font-size: 22rpx; color: #b8b0a4; margin-top: 12rpx; }
.dialog-actions { display: flex; gap: 20rpx; margin-top: 24rpx; }
.dialog-btn { flex: 1; height: 84rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.dialog-btn.ghost { background: #F2ECE1; }
.dialog-btn.solid { background: var(--brand); }
.dialog-btn.solid.disabled { opacity: 0.5; }
.dialog-btn-text { font-size: 28rpx; color: #2C2C2C; font-weight: 500; }
.solid-text { color: #fff; }
</style>
