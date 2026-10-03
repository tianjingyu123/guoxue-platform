<template>
  <view class="reviews-page">
    <!-- 顶部 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="40" color="#1a1a1a" />
      </view>
      <text class="nav-title">直播评价</text>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="page-body">
      <view class="skeleton-stat-card">
        <view class="skeleton-avg-circle" />
        <view class="skeleton-dist-bars">
          <view class="skeleton-dist-bar" v-for="i in 5" :key="i" />
        </view>
      </view>
      <view class="skeleton-filter-row">
        <view class="skeleton-chip" v-for="i in 4" :key="i" />
      </view>
      <view class="skeleton-review-card" v-for="i in 3" :key="i">
        <view class="skeleton-review-head">
          <view class="skeleton-avatar" />
          <view class="skeleton-review-info">
            <view class="skeleton-line w-60" />
            <view class="skeleton-line w-30" />
          </view>
        </view>
        <view class="skeleton-line w-90" />
        <view class="skeleton-line w-70" />
      </view>
    </view>

    <!-- 错误 -->
    <view v-else-if="error" class="error-state">
      <app-icon name="alert-circle" :size="96" color="#cbb8a8" />
      <text class="error-text">{{ error }}</text>
      <view class="error-btn" @tap="fetchData">重试</view>
    </view>

    <view v-else class="page-body">
      <!-- 统计卡片 -->
      <view class="stat-card">
        <view class="stat-row">
          <view class="stat-summary">
            <text class="avg-num">{{ avgRating }}</text>
            <view class="star-row">
              <app-icon
                v-for="s in 5"
                :key="s"
                name="star"
                :size="24"
                :color="s <= Math.round(Number(avgRating)) ? '#C9A96E' : '#cbb8a8'"
                :fill="s <= Math.round(Number(avgRating)) ? '#C9A96E' : 'none'"
              />
            </view>
            <text class="stat-total">{{ totalCount }} 条评价</text>
          </view>
          <view class="dist-list">
            <view v-for="d in dist" :key="d.star" class="dist-item">
              <app-icon name="star" :size="24" color="#C9A96E" fill="#C9A96E" />
              <text class="dist-star">{{ d.star }}</text>
              <view class="dist-bar">
                <view class="dist-bar-fill" :style="{ width: d.pct + '%' }" />
              </view>
              <text class="dist-pct">{{ d.pct }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 筛选胶囊 -->
      <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
        <view class="filter-row">
          <view
            v-for="f in filters"
            :key="f.key"
            class="filter-chip"
            :class="{ 'filter-chip-active': filter === f.key }"
            @tap="filter = f.key"
          >
            {{ f.label }}
          </view>
        </view>
      </scroll-view>

      <!-- 评价列表 -->
      <view v-if="filtered.length === 0" class="empty-box">
        <app-icon name="message-square" :size="96" color="#cbb8a8" />
        <text class="empty-text">暂无符合条件的评价</text>
      </view>
      <view v-else class="review-list">
        <view
          v-for="review in filtered"
          :key="review.id"
          class="review-card"
          :class="{ 'review-card-flagged': review.flagged }"
        >
          <!-- 用户信息 -->
          <view class="review-head">
            <view class="review-user">
              <view class="user-avatar">{{ review.user[0] }}</view>
              <view>
                <text class="user-name">{{ review.user }}</text>
                <view class="star-row">
                  <app-icon
                    v-for="s in 5"
                    :key="s"
                    name="star"
                    :size="24"
                    :color="s <= review.rating ? '#C9A96E' : '#cbb8a8'"
                    :fill="s <= review.rating ? '#C9A96E' : 'none'"
                  />
                </view>
              </view>
            </view>
            <text class="review-time">{{ review.time }}</text>
          </view>

          <text class="review-content">{{ review.content }}</text>
          <text class="review-live">场次：{{ review.live }}</text>

          <!-- 已有回复 -->
          <view v-if="replies[review.id]" class="reply-box">
            <text class="reply-label">我的回复：</text>
            <text class="reply-text">{{ replies[review.id] }}</text>
          </view>

          <!-- 回复输入框 -->
          <view v-if="replyId === review.id" class="reply-editor">
            <textarea
              v-model="replyText"
              class="reply-input"
              placeholder="输入回复内容..."
              placeholder-class="reply-ph"
            />
            <view class="reply-actions">
              <view class="reply-btn reply-btn-cancel" @tap="cancelReply">取消</view>
              <view class="reply-btn reply-btn-submit" @tap="submitReply(review.id)">发布回复</view>
            </view>
          </view>

          <!-- 操作区 -->
          <view v-else class="review-ops">
            <view class="op-btn" @tap="startReply(review.id)">
              <app-icon name="message-square" :size="28" color="#999" />
              <text class="op-text">{{ replies[review.id] ? '修改回复' : '回复' }}</text>
            </view>
            <view class="op-btn">
              <app-icon name="flag" :size="28" :color="review.flagged ? '#C9A96E' : '#999'" />
              <text class="op-text" :class="{ 'op-text-flag': review.flagged }">标记</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    <view v-if="!loading && !error" class="bottom-pad" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { goBack } from '@/utils/router'
import { liveApi, liveReviewFilters } from '@/lib/live-data'

const filters = liveReviewFilters
const dist = ref<Array<{ star: number; count: number; pct: number }>>([])
// 评价列表，元素结构由后端返回，模板裸访问多字段，保留 any[]
const reviews = ref<any[]>([])
const loading = ref(true)
const error = ref('')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await liveApi.getReviews(filter.value)
    dist.value = res.dist
    reviews.value = res.reviews
    // 初始化已回复的记录
    // res.reviews 元素结构未知，保留 any 避免收敛触发报错
    replies.value = Object.fromEntries(
      res.reviews.filter((r: any) => r.reply).map((r: any) => [r.id, r.reply as string]),
    )
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

const filter = ref('all')
const replyId = ref<string | null>(null)
const replyText = ref('')
const replies = ref<Record<string, string>>({})

const totalCount = computed(() => dist.value.reduce((s, d) => s + d.count, 0))
const avgRating = computed(() => {
  const total = totalCount.value
  return total > 0 ? (dist.value.reduce((s, d) => s + d.star * d.count, 0) / total).toFixed(1) : '0.0'
})

const filtered = computed(() =>
  reviews.value.filter((r) => {
    if (filter.value === 'all') return true
    if (filter.value === 'pending') return !replies.value[r.id]
    if (filter.value === 'replied') return !!replies.value[r.id]
    return String(r.rating) === filter.value
  }),
)

function startReply(id: string) {
  replyId.value = id
  replyText.value = ''
}
function cancelReply() {
  replyId.value = null
  replyText.value = ''
}
// 发布回复 — POST /live/reviews/:id/reply（房主校验·真落库）
const replySubmitting = ref(false)
async function submitReply(id: string) {
  const text = replyText.value.trim()
  if (!text || replySubmitting.value) return
  replySubmitting.value = true
  try {
    await liveApi.replyReview(id, text)
    replies.value = { ...replies.value, [id]: text }
    replyId.value = null
    replyText.value = ''
    uni.showToast({ title: '回复已发布', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '回复失败，请重试', icon: 'none' })
  } finally {
    replySubmitting.value = false
  }
}

watch(filter, () => { fetchData() })
onMounted(() => { fetchData() })
</script>

<style scoped>
.reviews-page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 顶部 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  height: calc(96rpx + var(--status-bar-height));
  padding: var(--status-bar-height) 32rpx 0;
  background: #faf8f5;
  border-bottom: 1px solid #ece8e1;
}
.nav-back {
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-left: 24rpx;
}

.page-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* 统计卡片 */
.stat-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 24rpx;
  padding: 32rpx;
}
.stat-row {
  display: flex;
  gap: 32rpx;
}
.stat-summary {
  flex-shrink: 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.avg-num {
  font-size: 72rpx;
  font-weight: 900;
  color: #C9A96E;
  line-height: 1.1;
}
.star-row {
  display: flex;
  gap: 4rpx;
}
.stat-total {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.dist-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  justify-content: center;
}
.dist-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.dist-star {
  font-size: 22rpx;
  color: #999;
}
.dist-bar {
  flex: 1;
  height: 12rpx;
  background: #f0ece5;
  border-radius: 999rpx;
  overflow: hidden;
}
.dist-bar-fill {
  height: 100%;
  background: #C9A96E;
  border-radius: 999rpx;
}
.dist-pct {
  width: 56rpx;
  text-align: right;
  font-size: 22rpx;
  color: #999;
}

/* 筛选胶囊 */
.filter-scroll {
  white-space: nowrap;
  width: 100%;
}
.filter-row {
  display: inline-flex;
  gap: 16rpx;
}
.filter-chip {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 500;
  white-space: nowrap;
  background: #f0ece5;
  color: #1a1a1a;
}
.filter-chip-active {
  background: var(--brand);
  color: #fff;
}

/* 空态 */
.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 128rpx 0;
}
.empty-text {
  font-size: 26rpx;
  color: #999;
  margin-top: 24rpx;
}

/* 评价列表 */
.review-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.review-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 24rpx;
  padding: 32rpx;
}
.review-card-flagged {
  border-color: rgba(201, 169, 110, 0.6);
}
.review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.review-user {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.user-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f0ece5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
  color: #999;
  flex-shrink: 0;
}
.user-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
}
.review-time {
  font-size: 22rpx;
  color: #999;
}
.review-content {
  font-size: 26rpx;
  color: #1a1a1a;
  display: block;
  margin-bottom: 12rpx;
}
.review-live {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 24rpx;
}

/* 已有回复 */
.reply-box {
  background: #f0ece5;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.reply-label {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 4rpx;
}
.reply-text {
  font-size: 22rpx;
  color: #1a1a1a;
}

/* 回复输入 */
.reply-editor {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.reply-input {
  width: 100%;
  min-height: 144rpx;
  padding: 16rpx 24rpx;
  font-size: 22rpx;
  color: #1a1a1a;
  background: #faf8f5;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.reply-ph {
  color: #b3b3b3;
}
.reply-actions {
  display: flex;
  gap: 16rpx;
}
.reply-btn {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 22rpx;
  border-radius: 16rpx;
}
.reply-btn-cancel {
  color: #999;
  background: #f0ece5;
}
.reply-btn-submit {
  color: #fff;
  background: var(--brand);
}

/* 操作区 */
.review-ops {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding-top: 8rpx;
}
.op-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.op-text {
  font-size: 22rpx;
  color: #999;
}
.op-text-flag {
  color: #C9A96E;
}

.bottom-pad {
  height: 64rpx;
}

/* 骨架屏 */
.skeleton-stat-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  gap: 32rpx;
}
.skeleton-avg-circle {
  width: 120rpx;
  height: 120rpx;
  background: #e8e4dc;
  border-radius: 50%;
  flex-shrink: 0;
}
.skeleton-dist-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  justify-content: center;
}
.skeleton-dist-bar {
  height: 24rpx;
  background: #e8e4dc;
  border-radius: 999rpx;
}
.skeleton-filter-row {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
}
.skeleton-chip {
  width: 128rpx;
  height: 48rpx;
  background: #e8e4dc;
  border-radius: 999rpx;
}
.skeleton-review-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-top: 24rpx;
}
.skeleton-review-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.skeleton-avatar {
  width: 64rpx;
  height: 64rpx;
  background: #e8e4dc;
  border-radius: 50%;
}
.skeleton-review-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.skeleton-line {
  height: 24rpx;
  background: #e8e4dc;
  border-radius: 8rpx;
}
.skeleton-line.w-90 { width: 90%; margin-bottom: 12rpx; }
.skeleton-line.w-70 { width: 70%; }
.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-30 { width: 30%; }

/* 错误态 */
.error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 128rpx 0; }
.error-text { font-size: 26rpx; color: #999; margin-top: 24rpx; }
.error-btn { margin-top: 32rpx; padding: 16rpx 48rpx; font-size: 26rpx; color: #fff; background: var(--brand); border-radius: 999rpx; }
</style>
