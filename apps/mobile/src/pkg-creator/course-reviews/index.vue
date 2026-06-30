<template>
  <view class="cr-page">
    <!-- 头部 -->
    <view class="cr-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="cr-back" @tap="back">
        <AppIcon name="chevron-left" :size="22" color="#2c2c2c" />
      </view>
      <text class="cr-title">评价管理</text>
      <view class="cr-back" />
    </view>

    <text v-if="courseTitle" class="cr-subtitle">{{ courseTitle }}</text>

    <!-- 加载中 -->
    <view v-if="loading" class="cr-status">
      <AppIcon name="loader" :size="44" color="#c41e3a" />
      <text class="cr-status-text">加载中…</text>
    </view>

    <!-- 失败 -->
    <view v-else-if="error" class="cr-status">
      <AppIcon name="alert-circle" :size="56" color="#f97316" />
      <text class="cr-status-text">加载失败</text>
      <button class="cr-btn" @tap="loadReviews">重试</button>
    </view>

    <!-- 空态 -->
    <view v-else-if="reviews.length === 0" class="cr-status">
      <AppIcon name="message-square" :size="56" color="#ddd" />
      <text class="cr-status-text">还没有学员评价</text>
    </view>

    <!-- 评价列表 -->
    <view v-else class="cr-list">
      <view v-for="rv in reviews" :key="rv.id" class="cr-item">
        <view class="cr-item-head">
          <image lazy-load v-if="rv.user.avatar" class="cr-avatar" :src="rv.user.avatar" mode="aspectFill" />
          <view v-else class="cr-avatar cr-avatar-fallback">
            <AppIcon name="user" :size="20" color="#bbb" />
          </view>
          <view class="cr-item-info">
            <text class="cr-user">{{ rv.user.name }}</text>
            <view class="cr-stars">
              <AppIcon
                v-for="n in 5"
                :key="n"
                name="star"
                :size="14"
                :color="n <= rv.rating ? '#f0b400' : '#e5e5e5'"
                :fill="n <= rv.rating"
              />
            </view>
          </view>
          <text class="cr-date">{{ rv.createdAt }}</text>
        </view>

        <text class="cr-content">{{ rv.content }}</text>

        <!-- 已回复 -->
        <view v-if="rv.reply && editingId !== rv.id" class="cr-reply">
          <view class="cr-reply-label">
            <AppIcon name="corner-down-right" :size="14" color="#c41e3a" />
            <text class="cr-reply-tag">讲师回复</text>
            <text class="cr-reply-edit" @tap="startEdit(rv)">修改</text>
          </view>
          <text class="cr-reply-text">{{ rv.reply }}</text>
        </view>

        <!-- 回复输入 -->
        <view v-else-if="editingId === rv.id" class="cr-reply-edit-box">
          <textarea
            class="cr-textarea"
            placeholder="输入回复内容…"
            placeholder-class="cr-ph"
            :value="draft"
            @input="(e: any) => draft = e.detail.value"
            :maxlength="500"
          />
          <view class="cr-reply-actions">
            <button class="cr-btn cr-btn-outline" @tap="cancelEdit">取消</button>
            <button
              class="cr-btn"
              :class="{ 'cr-btn-disabled': submittingId === rv.id || !draft.trim() }"
              :disabled="submittingId === rv.id || !draft.trim()"
              @tap="submitReply(rv)"
            >
              {{ submittingId === rv.id ? '提交中…' : '发布回复' }}
            </button>
          </view>
        </view>

        <!-- 未回复：去回复 -->
        <view v-else class="cr-reply-trigger" @tap="startEdit(rv)">
          <AppIcon name="message-circle" :size="16" color="#c41e3a" />
          <text class="cr-reply-trigger-text">回复评价</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { courseApi, type CourseReview } from '@/lib/course-data'

const statusBarHeight = ref(0)
const courseId = ref('')
const courseTitle = ref('')

const loading = ref(true)
const error = ref(false)
const reviews = ref<CourseReview[]>([])

// 单条回复编辑态
const editingId = ref('')
const draft = ref('')
const submittingId = ref('')

async function loadReviews() {
  if (!courseId.value) {
    error.value = true
    loading.value = false
    return
  }
  loading.value = true
  error.value = false
  try {
    reviews.value = await courseApi.getReviews(courseId.value)
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function startEdit(rv: CourseReview) {
  editingId.value = rv.id
  draft.value = rv.reply || ''
}

function cancelEdit() {
  editingId.value = ''
  draft.value = ''
}

async function submitReply(rv: CourseReview) {
  if (submittingId.value || !draft.value.trim()) return
  submittingId.value = rv.id
  try {
    await courseApi.replyReview(rv.id, draft.value.trim())
    // 本地更新，避免整列表刷新
    const target = reviews.value.find((r) => r.id === rv.id)
    if (target) target.reply = draft.value.trim()
    editingId.value = ''
    draft.value = ''
    uni.showToast({ title: '回复成功', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '回复失败，请重试', icon: 'none' })
  } finally {
    submittingId.value = ''
  }
}

function back() {
  goBack()
}

onLoad((options: any) => {
  try {
    const info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  courseId.value = options?.id || options?.courseId || ''
  courseTitle.value = options?.title ? decodeURIComponent(options.title) : ''
  loadReviews()
})
</script>

<style scoped>
.cr-page {
  min-height: 100vh;
  background: #f7f7f7;
}
.cr-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 2rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
}
.cr-back {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cr-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.cr-subtitle {
  display: block;
  padding: 20rpx 28rpx 0;
  font-size: 26rpx;
  color: #999;
}

/* 状态 */
.cr-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 140rpx 48rpx;
  gap: 20rpx;
}
.cr-status-text {
  font-size: 28rpx;
  color: #999;
}

/* 列表 */
.cr-list {
  padding: 24rpx 24rpx 60rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.cr-item {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
}
.cr-item-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cr-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.cr-avatar-fallback {
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cr-item-info {
  flex: 1;
}
.cr-user {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.cr-stars {
  display: flex;
  gap: 4rpx;
  margin-top: 6rpx;
}
.cr-date {
  font-size: 24rpx;
  color: #bbb;
}
.cr-content {
  display: block;
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #444;
  line-height: 1.6;
}

/* 已回复 */
.cr-reply {
  margin-top: 20rpx;
  padding: 20rpx;
  background: #fdf3f5;
  border-radius: 14rpx;
}
.cr-reply-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.cr-reply-tag {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--brand);
  flex: 1;
}
.cr-reply-edit {
  font-size: 24rpx;
  color: var(--brand);
}
.cr-reply-text {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

/* 回复编辑 */
.cr-reply-edit-box {
  margin-top: 20rpx;
}
.cr-textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 20rpx;
  background: #f7f7f7;
  border-radius: 14rpx;
  font-size: 26rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.cr-ph {
  color: #bbb;
}
.cr-reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 16rpx;
}

/* 触发回复 */
.cr-reply-trigger {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #f5f5f5;
}
.cr-reply-trigger-text {
  font-size: 26rpx;
  color: var(--brand);
}

/* 按钮 */
.cr-btn {
  padding: 0 40rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: var(--brand);
  color: #fff;
  font-size: 26rpx;
  border-radius: 999rpx;
}
.cr-btn-outline {
  background: #fff;
  color: #666;
  border: 2rpx solid #e5e5e5;
}
.cr-btn-disabled {
  opacity: 0.5;
}
</style>
