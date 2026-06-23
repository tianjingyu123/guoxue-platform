<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="nav-title">评价管理</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <view v-if="loading" class="state-loading"><text class="state-loading-text">加载中...</text></view>
      <view v-if="error" class="state-error"><text class="state-error-text">加载失败</text><view class="state-retry" @tap="retry"><text class="state-retry-text">重试</text></view></view>
      <template v-if="!loading && !error">
      <!-- 统计概览 -->
      <view class="card stat-card">
        <view class="stat-item">
          <text class="stat-num">4.8</text>
          <view class="stat-stars">
            <app-icon v-for="i in 5" :key="i" name="star" :size="12" :color="i <= 4 ? '#fbbf24' : '#fcd34d80'" />
          </view>
          <text class="stat-label">店铺评分</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ reviews.length }}</text>
          <text class="stat-label">总评价数</text>
        </view>
        <view class="stat-item">
          <text class="stat-num stat-orange">{{ pendingCount }}</text>
          <text class="stat-label">待回复</text>
        </view>
      </view>

      <!-- 筛选标签 -->
      <view class="tabs">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="tab"
          :class="{ 'tab-active': activeTab === t.key }"
          @tap="activeTab = t.key"
        >
          <text class="tab-text" :class="{ 'tab-text-active': activeTab === t.key }">{{ t.label }}</text>
        </view>
      </view>

      <!-- 评价列表 -->
      <view class="list">
        <view v-for="review in filteredReviews" :key="review.id" class="card review-card">
          <!-- 商品信息 -->
          <view class="review-product">
            <view class="product-thumb">
              <app-icon name="package" :size="20" color="#9ca3af" />
            </view>
            <text class="product-name">{{ review.productTitle }}</text>
          </view>

          <!-- 评价内容 -->
          <view class="review-head">
            <view class="review-stars">
              <app-icon v-for="i in 5" :key="i" name="star" :size="14" :color="i <= review.rating ? '#fbbf24' : '#e5e7eb'" />
            </view>
            <text class="review-meta">{{ review.buyer }}</text>
            <text class="review-meta">{{ review.createdAt }}</text>
          </view>
          <text class="review-content">{{ review.content }}</text>

          <view v-if="review.images.length > 0" class="review-images">
            <view v-for="(img, i) in review.images" :key="i" class="review-image">
              <app-icon name="image" :size="20" color="#9ca3af" />
            </view>
          </view>

          <!-- 商家回复 -->
          <view v-if="review.replied && review.replyContent" class="reply-box">
            <view class="reply-head">
              <text class="reply-badge">商家回复</text>
              <text class="reply-time">{{ review.replyTime }}</text>
            </view>
            <text class="reply-content">{{ review.replyContent }}</text>
          </view>

          <!-- 回复输入框 -->
          <view v-if="replyingId === review.id" class="reply-form">
            <textarea
              v-model="replyText"
              class="reply-textarea"
              placeholder="输入回复内容..."
              :maxlength="-1"
            />
            <view class="reply-actions">
              <view class="btn-outline" @tap="cancelReply">
                <text class="btn-outline-text">取消</text>
              </view>
              <view class="btn-primary" @tap="sendReply(review.id)">
                <text class="btn-primary-text">发送回复</text>
              </view>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view v-if="!review.replied && replyingId !== review.id" class="review-foot">
            <view class="btn-primary btn-reply" @tap="startReply(review.id)">
              <app-icon name="message-square" :size="14" color="#ffffff" />
              <text class="btn-primary-text">回复</text>
            </view>
          </view>
        </view>

        <view v-if="filteredReviews.length === 0" class="empty">
          <text class="empty-text">暂无评价</text>
        </view>
      </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { merchantAdminApi } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const reviews = ref<any[]>([])
const loading = ref(true)
const error = ref(false)
const activeTab = ref('all')
const replyingId = ref<string | null>(null)
const replyText = ref('')

const tabs = computed(() => [
  { key: 'all', label: '全部' },
  { key: 'pending', label: `待回复(${pendingCount.value})` },
  { key: 'negative', label: `差评(${negativeCount.value})` },
  { key: 'hasImage', label: '有图' },
])

const pendingCount = computed(() => reviews.value.filter((r) => !r.replied).length)
const negativeCount = computed(() => reviews.value.filter((r) => r.rating <= 3).length)

const filteredReviews = computed(() =>
  reviews.value.filter((r) => {
    if (activeTab.value === 'pending') return !r.replied
    if (activeTab.value === 'replied') return r.replied
    if (activeTab.value === 'negative') return r.rating <= 3
    if (activeTab.value === 'hasImage') return r.hasImage
    return true
  }),
)

function startReply(id: string) {
  replyingId.value = id
  replyText.value = ''
}
function cancelReply() {
  replyingId.value = null
  replyText.value = ''
}
function sendReply(id: string) {
  if (!replyText.value.trim()) {
    uni.showToast({ title: '请输入回复内容', icon: 'none' })
    return
  }
  const r = reviews.value.find((x) => x.id === id)
  if (r) {
    r.replied = true
    r.replyContent = replyText.value
    r.replyTime = '刚刚'
  }
  replyingId.value = null
  replyText.value = ''
  uni.showToast({ title: '回复成功', icon: 'success' })
}

onMounted(async () => {
  try {
    reviews.value = await merchantAdminApi.getReviews()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

async function retry() {
  error.value = false
  loading.value = true
  try { reviews.value = await merchantAdminApi.getReviews() }
  catch { error.value = true }
  finally { loading.value = false }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #ffffff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; }
.nav-title { flex: 1; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { height: 100vh; box-sizing: border-box; padding-bottom: 40px; }

.card { background: #ffffff; border-radius: 12px; margin: 12px 16px 0; padding: 16px; }
.stat-card { display: flex; }
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.stat-num { font-size: 24px; font-weight: 700; color: #1a1a1a; }
.stat-orange { color: #ea580c; }
.stat-stars { display: flex; gap: 2px; margin-top: 4px; }
.stat-label { font-size: 12px; color: #9ca3af; margin-top: 4px; }

.tabs { display: flex; gap: 8px; padding: 12px 16px 0; }
.tab { flex: 1; height: 34px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.tab-active { background: #c41e3a; }
.tab-text { font-size: 12px; color: #4b5563; }
.tab-text-active { color: #ffffff; }

.list { padding: 0 16px; }
.review-card { margin: 12px 0 0; }
.review-product { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.product-thumb { width: 40px; height: 40px; border-radius: 6px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.product-name { flex: 1; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.review-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.review-stars { display: flex; gap: 2px; }
.review-meta { font-size: 12px; color: #9ca3af; }
.review-content { display: block; font-size: 14px; color: #1a1a1a; line-height: 1.5; margin-top: 8px; }
.review-images { display: flex; gap: 8px; margin-top: 8px; }
.review-image { width: 64px; height: 64px; border-radius: 6px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }

.reply-box { margin-top: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; }
.reply-head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.reply-badge { font-size: 10px; color: #4b5563; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; }
.reply-time { font-size: 12px; color: #9ca3af; }
.reply-content { font-size: 14px; color: #1a1a1a; line-height: 1.5; }

.reply-form { margin-top: 12px; }
.reply-textarea { width: 100%; box-sizing: border-box; height: 72px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; }
.reply-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.btn-outline { padding: 6px 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
.btn-outline-text { font-size: 13px; color: #4b5563; }
.btn-primary { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 16px; background: #c41e3a; border-radius: 8px; }
.btn-primary-text { font-size: 13px; color: #ffffff; }
.review-foot { margin-top: 12px; padding-top: 12px; border-top: 1px solid #ededed; display: flex; justify-content: flex-end; }
.btn-reply { padding: 6px 20px; }

.empty { padding: 80px 0; text-align: center; }
.empty-text { font-size: 14px; color: #9ca3af; }
/* 三态 */
.state-loading { padding: 80px 0; text-align: center; }
.state-loading-text { font-size: 14px; color: #9ca3af; }
.state-error { padding: 80px 0; text-align: center; }
.state-error-text { font-size: 14px; color: #ef4444; display: block; margin-bottom: 12px; }
.state-retry { display: inline-block; padding: 8px 20px; background: #c41e3a; border-radius: 8px; }
.state-retry-text { font-size: 14px; color: #fff; }
</style>
