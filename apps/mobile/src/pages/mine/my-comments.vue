<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          我的评论
        </text>
        <text
          v-if="comments.length > 0"
          class="header-action"
          @click="toggleEditMode"
        >
          {{ isEditMode ? '完成' : '管理' }}
        </text>
      </view>
    </view>

    <view class="content">
      <DataState
        :is-loading="loading"
        :error="loadError"
        :is-empty="!loading && comments.length === 0"
        empty-icon="💬"
        empty-title="暂无评论记录"
        skeleton-type="card"
        @retry="loadData"
      >
        <view class="comments-list">
          <view
            v-for="comment in comments"
            :key="comment.id"
            class="comment-card-wrap"
          >
            <!-- 编辑模式选择框 -->
            <view
              v-if="isEditMode"
              class="checkbox"
              :class="{ checked: selectedIds.includes(comment.id) }"
              @click="toggleSelect(comment.id)"
            >
              <text
                v-if="selectedIds.includes(comment.id)"
                class="checkbox-mark"
              >
                ✓
              </text>
            </view>

            <view
              class="comment-card"
              :class="{ swiped: !isEditMode && swipedId === comment.id }"
            >
              <!-- 主卡片 -->
              <view
                class="comment-main"
                @click="!isEditMode && toggleSwipe(comment.id)"
              >
                <text class="comment-content">
                  {{ comment.content }}
                </text>

                <!-- 目标内容 -->
                <view
                  class="comment-target"
                  @click.stop="goTarget(comment)"
                >
                  <view class="target-thumb">
                    <image
                      v-if="comment.target?.cover"
                      :src="comment.target.cover"
                      class="target-thumb-img"
                      mode="aspectFill"
                    />
                    <view
                      v-else
                      class="target-thumb-placeholder"
                      :class="'ttp-' + comment.target?.type"
                    >
                      <text class="target-thumb-icon">
                        {{ targetIcon(comment.target?.type) }}
                      </text>
                    </view>
                  </view>
                  <view class="target-info">
                    <view
                      class="target-type-tag"
                      :class="'ttt-' + comment.target?.type"
                    >
                      {{ targetName(comment.target?.type) }}
                    </view>
                    <text class="target-title">
                      {{ comment.target?.title }}
                    </text>
                  </view>
                  <text class="target-arrow">
                    →
                  </text>
                </view>

                <!-- 底部信息 -->
                <view class="comment-footer">
                  <text class="comment-time">
                    {{ comment.createdAt }}
                  </text>
                  <view class="comment-stats">
                    <text class="comment-stat">
                      ❤ {{ comment.likeCount }}
                    </text>
                    <text class="comment-stat">
                      💬 {{ comment.replyCount }}
                    </text>
                    <text
                      v-if="comment.hasReply"
                      class="comment-has-reply"
                    >
                      有回复
                    </text>
                  </view>
                </view>
              </view>

              <!-- 左滑删除 -->
              <view
                v-if="!isEditMode"
                class="swipe-delete"
                @click="handleDeleteOne(comment.id)"
              >
                <text class="swipe-delete-icon">
                  🗑
                </text>
                <text class="swipe-delete-text">
                  删除
                </text>
              </view>
            </view>
          </view>
        </view>
      </DataState>
    </view>

    <!-- 底部操作栏（编辑模式） -->
    <view
      v-if="isEditMode && selectedIds.length > 0"
      class="bottom-bar edit-bar"
    >
      <text
        class="select-all"
        @click="selectAll"
      >
        全选
      </text>
      <view
        class="btn-batch-delete"
        @click="handleBatchDelete"
      >
        🗑 删除（{{ selectedIds.length }}）
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { interactApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface CommentTarget {
  id: string
  type: string
  title: string
  cover?: string
}

interface CommentItem {
  id: number
  content: string
  target?: CommentTarget
  createdAt: string
  likeCount: number
  replyCount: number
  hasReply: boolean
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const comments = ref<CommentItem[]>([])
const isEditMode = ref(false)
const selectedIds = ref<number[]>([])
const swipedId = ref<number | null>(null)

function targetIcon(type?: string): string {
  const map: Record<string, string> = { article: '📄', course: '▶', video: '🎬', product: '🛍', circle_post: '👥', question: '❓' }
  return map[type || ''] || '📄'
}

function targetName(type?: string): string {
  const map: Record<string, string> = { article: '文章', course: '课程', video: '视频', product: '商品', circle_post: '帖子', question: '问答' }
  return map[type || ''] || type || ''
}

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    const res = await interactApi.getMyComments()
    comments.value = (res as any)?.list || (res as any)?.data || []
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function toggleEditMode() {
  isEditMode.value = !isEditMode.value
  selectedIds.value = []
  swipedId.value = null
}

function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function selectAll() {
  if (selectedIds.value.length === comments.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = comments.value.map((c) => c.id)
  }
}

function toggleSwipe(id: number) {
  swipedId.value = swipedId.value === id ? null : id
}

function handleDeleteOne(id: number) {
  comments.value = comments.value.filter((c) => c.id !== id)
  swipedId.value = null
  uni.showToast({ title: '已删除', icon: 'success' })
}

function handleBatchDelete() {
  if (selectedIds.value.length === 0) return
  comments.value = comments.value.filter((c) => !selectedIds.value.includes(c.id))
  selectedIds.value = []
  isEditMode.value = false
  uni.showToast({ title: '已批量删除', icon: 'success' })
}

function goTarget(comment: CommentItem) {
  uni.showToast({ title: '打开：' + (comment.target?.title || ''), icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-action { font-size: 24rpx; color: #C41E3A; padding: 8rpx; }

.content { padding: 20rpx 24rpx; }
.comments-list { display: flex; flex-direction: column; gap: 12rpx; }

.comment-card-wrap { display: flex; align-items: stretch; gap: 8rpx; }
.checkbox { width: 44rpx; height: 44rpx; border-radius: 50%; border: 2rpx solid #D0C8B8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 40rpx; }
.checkbox.checked { background: #C41E3A; border-color: #C41E3A; }
.checkbox-mark { font-size: 24rpx; color: #fff; font-weight: bold; }

.comment-card { flex: 1; display: flex; overflow: hidden; border-radius: 20rpx; transition: all 0.3s; }
.comment-card.swiped { position: relative; }
.comment-main { flex: 1; background: #fff; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); border-radius: 20rpx; }
.comment-content { font-size: 24rpx; color: #2C2C2C; line-height: 1.6; display: block; }

.comment-target { display: flex; gap: 12rpx; padding: 16rpx; background: #FAF8F5; border-radius: 12rpx; margin-top: 12rpx; }
.target-thumb { width: 100rpx; height: 100rpx; border-radius: 10rpx; overflow: hidden; flex-shrink: 0; }
.target-thumb-img { width: 100%; height: 100%; }
.target-thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.ttp-course { background: #E3F2FD; }
.ttp-article { background: #E8F5E9; }
.ttp-video { background: #FCE4EC; }
.ttp-product { background: #FFF3E0; }
.ttp-circle_post { background: #F3E5F5; }
.ttp-question { background: #FFF8E1; }
.target-thumb-icon { font-size: 36rpx; }

.target-info { flex: 1; min-width: 0; }
.target-type-tag { font-size: 16rpx; padding: 2rpx 10rpx; border-radius: 6rpx; color: #fff; display: inline-block; margin-bottom: 6rpx; }
.ttt-course { background: #1976D2; }
.ttt-article { background: #22C55E; }
.ttt-video { background: #E91E63; }
.ttt-product { background: #F59E0B; }
.ttt-circle_post { background: #7B1FA2; }
.ttt-question { background: #FF8F00; }
.target-title { font-size: 22rpx; color: #666; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.target-arrow { font-size: 28rpx; color: #B8B0A4; align-self: center; }

.comment-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #F5F0E8; }
.comment-time { font-size: 20rpx; color: #B8B0A4; }
.comment-stats { display: flex; align-items: center; gap: 16rpx; }
.comment-stat { font-size: 20rpx; color: #B8B0A4; }
.comment-has-reply { font-size: 18rpx; padding: 2rpx 12rpx; background: #FDE8E8; color: #C41E3A; border-radius: 16rpx; }

.swipe-delete { width: 120rpx; background: #EF4444; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; border-radius: 0 20rpx 20rpx 0; }
.swipe-delete-icon { font-size: 32rpx; }
.swipe-delete-text { font-size: 20rpx; margin-top: 4rpx; }

/* 底部编辑栏 */
.bottom-bar.edit-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; background: #F5F0E8; border-top: 1rpx solid #E8E3DB; display: flex; align-items: center; justify-content: space-between; }
.select-all { font-size: 24rpx; color: #C41E3A; }
.btn-batch-delete { padding: 16rpx 40rpx; background: #EF4444; color: #fff; border-radius: 40rpx; font-size: 24rpx; font-weight: 500; }
</style>
