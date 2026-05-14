<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" type="detail" />
    <EmptyState v-else-if="errorMsg" icon="⚠️" :text="errorMsg" />

    <template v-if="!loading && item">
      <view class="question-card">
        <view class="q-header">
          <image class="q-avatar" :src="item.asker?.avatar || '/static/default-avatar.png'" mode="aspectFill" />
          <view class="q-user">
            <text class="q-nick">{{ item.asker?.nickname || '匿名' }}</text>
            <text class="q-time">{{ formatTime(item.createdAt) }}</text>
          </view>
          <view class="status-badge" :class="'status-' + item.status">
            <text>{{ statusMap[item.status] || item.status }}</text>
          </view>
        </view>
        <text class="q-title">{{ item.title }}</text>
        <text class="q-body">{{ item.description }}</text>
        <view v-if="item.images?.length" class="q-images">
          <image v-for="(img, idx) in item.images" :key="idx" :src="img" mode="aspectFill" class="q-img" @click="previewImages(item.images, idx)" />
        </view>
        <view class="q-footer">
          <text class="bounty-amount">💰 {{ item.bountyCoin }} 币</text>
          <text class="q-category">{{ categoryLabel(item.category) }}</text>
        </view>
      </view>

      <!-- 状态时间线 -->
      <view class="timeline-section">
        <text class="section-title">状态进度</text>
        <view class="timeline">
          <view class="tl-item" :class="{ active: true }">
            <view class="tl-dot" />
            <view class="tl-content">
              <text class="tl-label">已发布</text>
              <text class="tl-time">{{ formatTime(item.createdAt) }}</text>
            </view>
          </view>
          <view v-if="item.status !== 'OPEN'" class="tl-item" :class="{ active: true }">
            <view class="tl-dot" />
            <view class="tl-content">
              <text class="tl-label">已有回答</text>
              <text class="tl-time">{{ formatTime(item.answeredAt) }}</text>
            </view>
          </view>
          <view v-if="item.status === 'SATISFIED'" class="tl-item" :class="{ active: true }">
            <view class="tl-dot" />
            <view class="tl-content">
              <text class="tl-label">已采纳满意答案</text>
              <text class="tl-time">{{ formatTime(item.satisfiedAt) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 回答内容 -->
      <view v-if="item.answer" class="answer-card">
        <view class="a-header">
          <image class="a-avatar" :src="item.answerer?.avatar || '/static/default-avatar.png'" mode="aspectFill" />
          <text class="a-nick">{{ item.answerer?.nickname || '匿名' }}</text>
          <text class="a-label">回答</text>
        </view>
        <text class="a-body">{{ item.answer }}</text>
        <view v-if="item.answerImages?.length" class="a-images">
          <image v-for="(img, idx) in item.answerImages" :key="idx" :src="img" mode="aspectFill" class="a-img" @click="previewImages(item.answerImages, idx)" />
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="actions">
        <!-- 自己提问且已回答：确认满意 -->
        <button v-if="isOwner && item.status === 'ANSWERED'" class="action-btn confirm-btn" @click="confirmSatisfied" :loading="confirming">
          确认满意
        </button>

        <!-- 分享 -->
        <button class="action-btn share-btn" @click="handleShare">分享</button>
      </view>

      <!-- 抢答按钮 -->
      <view v-if="item.status === 'OPEN'" class="answer-fab" @click="goAnswer">
        <text class="fab-icon">⚡</text>
        <text class="fab-label">抢答</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { formatTime } from '../../utils'

const item = ref<any>(null)
const loading = ref(true)
const errorMsg = ref('')
const confirming = ref(false)
const currentUserId = ref('')

const statusMap: Record<string, string> = {
  OPEN: '待解答',
  ANSWERED: '已解答',
  SATISFIED: '已采纳',
  CLOSED: '已关闭',
}

const categoryMap: Record<string, string> = {
  BAZI: '八字', ZIWEI: '紫微', FENGSHUI: '风水',
  CAREER: '事业', LOVE: '情感', GENERAL: '通用',
}

function categoryLabel(cat: string): string {
  return categoryMap[cat] || cat || '通用'
}

const isOwner = computed(() => {
  return currentUserId.value && item.value?.askerId === currentUserId.value
})

onMounted(() => {
  try {
    const info = uni.getStorageSync('userInfo')
    if (info) currentUserId.value = typeof info === 'string' ? JSON.parse(info).id : info.id
  } catch { /* */ }

  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  const id = opts.id || ''
  if (id) fetchDetail(id)
  else { errorMsg.value = '缺少ID'; loading.value = false }
})

async function fetchDetail(id: string) {
  loading.value = true
  errorMsg.value = ''
  try {
    item.value = await api.get(`/bounty/${id}`)
  } catch { errorMsg.value = '加载失败' } finally { loading.value = false }
}

async function confirmSatisfied() {
  if (!item.value) return
  confirming.value = true
  try {
    await api.put(`/bounty/${item.value.id}/satisfied`)
    uni.showToast({ title: '已确认满意', icon: 'success' })
    fetchDetail(item.value.id)
  } catch (e: any) {
    uni.showToast({ title: e.errMsg || '操作失败', icon: 'none' })
  } finally { confirming.value = false }
}

function goAnswer() {
  uni.navigateTo({ url: `/pages/bounty/answer?id=${item.value?.id}` })
}

function handleShare() {
  uni.shareAppMessage?.({
    title: item.value?.title || '悬赏问答',
    desc: '帮人解答，赚取赏金',
    path: `/pages/bounty/detail?id=${item.value?.id}`,
  })
}

function previewImages(images: string[], idx: number) {
  uni.previewImage({ current: images[idx], urls: images })
}
</script>

<style scoped>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; padding-bottom: 100px; }
.question-card { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
.q-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.q-avatar { width: 32px; height: 32px; border-radius: 50%; }
.q-user { flex: 1; display: flex; flex-direction: column; }
.q-nick { font-size: 14px; color: #333; font-weight: 500; }
.q-time { font-size: 11px; color: #999; }
.status-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.status-OPEN { background: #fff3cd; color: #856404; }
.status-ANSWERED { background: #d4edda; color: #155724; }
.status-SATISFIED { background: #cce5ff; color: #004085; }
.status-CLOSED { background: #f8f9fa; color: #6c757d; }
.q-title { font-size: 18px; font-weight: bold; color: #333; display: block; margin-bottom: 10px; }
.q-body { font-size: 15px; color: #444; display: block; line-height: 1.7; margin-bottom: 12px; }
.q-images { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.q-img { width: 100px; height: 100px; border-radius: 8px; }
.q-footer { display: flex; gap: 12px; align-items: center; }
.bounty-amount { font-size: 14px; color: #C41E3A; font-weight: bold; }
.q-category { font-size: 12px; color: #999; background: #F5F0E8; padding: 2px 10px; border-radius: 10px; }

.timeline-section { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
.section-title { font-size: 14px; font-weight: bold; color: #333; display: block; margin-bottom: 12px; }
.timeline { padding-left: 8px; }
.tl-item { display: flex; gap: 10px; position: relative; padding-bottom: 16px; }
.tl-item:last-child { padding-bottom: 0; }
.tl-dot { width: 10px; height: 10px; border-radius: 50%; background: #E8E0D5; margin-top: 4px; flex-shrink: 0; }
.tl-item.active .tl-dot { background: #C41E3A; }
.tl-content { flex: 1; }
.tl-label { font-size: 14px; color: #333; display: block; }
.tl-time { font-size: 11px; color: #999; }

.answer-card { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 12px; border-left: 3px solid #C41E3A; }
.a-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.a-avatar { width: 28px; height: 28px; border-radius: 50%; }
.a-nick { font-size: 14px; color: #333; font-weight: 500; flex: 1; }
.a-label { font-size: 11px; color: #C41E3A; background: #F5F0E8; padding: 2px 10px; border-radius: 10px; }
.a-body { font-size: 15px; color: #444; display: block; line-height: 1.7; }
.a-images { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.a-img { width: 100px; height: 100px; border-radius: 8px; }

.actions { display: flex; gap: 12px; margin-bottom: 20px; }
.action-btn { flex: 1; padding: 12px; border-radius: 24px; font-size: 15px; border: none; text-align: center; }
.confirm-btn { background: linear-gradient(135deg, #C9A96E, #D4AF37); color: #fff; }
.share-btn { background: #fff; color: #333; border: 1px solid #E8E0D5; }

.answer-fab { position: fixed; bottom: 40px; right: 20px; display: flex; flex-direction: column; align-items: center; gap: 4px; z-index: 99; }
.fab-icon { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #8B0000); color: #fff; font-size: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(139,69,19,0.3); }
.fab-label { font-size: 11px; color: #666; background: rgba(255,255,255,0.9); padding: 2px 8px; border-radius: 8px; }
</style>
