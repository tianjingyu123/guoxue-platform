<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" type="detail" />
    <EmptyState v-else-if="errorMsg" icon="⚠️" :text="errorMsg" />

    <template v-if="!loading && question">
      <!-- 问题卡片 -->
      <view class="question-card">
        <view class="q-header">
          <image class="q-avatar" :src="question.asker?.avatar || '/static/default-avatar.png'" mode="aspectFill" />
          <text class="q-nick">{{ question.asker?.nickname || '匿名' }}</text>
          <view class="q-status" :class="'status-' + question.status">
            <text>{{ statusMap[question.status] || question.status }}</text>
          </view>
        </view>
        <text class="q-body">{{ question.question }}</text>
        <view class="q-footer">
          <text class="q-price">{{ question.priceCoin }}币</text>
          <text class="q-circle">{{ question.circle?.name || '' }}</text>
        </view>
      </view>

      <!-- 回答卡片 -->
      <view v-if="question.status === 'ANSWERED' && question.answer" class="answer-card">
        <view class="a-header">
          <image class="a-avatar" :src="question.answerer?.avatar || '/static/default-avatar.png'" mode="aspectFill" />
          <text class="a-nick">{{ question.answerer?.nickname || '匿名' }}</text>
          <text class="a-label">回答</text>
        </view>
        <text class="a-body">{{ question.answer }}</text>
        <view class="a-footer">
          <text class="a-peek">{{ question.peekCount || 0 }}人围观</text>
          <text v-if="question.peekPriceCoin > 0" class="a-peek-price">围观价 {{ question.peekPriceCoin }}币</text>
        </view>
      </view>

      <!-- 围观按钮 -->
      <view v-if="canPeek" class="peek-section">
        <button class="peek-btn" @click="doPeek" :loading="peeking">
          支付 {{ question.peekPriceCoin }}币 围观答案
        </button>
      </view>

      <!-- 回答按钮（回答者自己） -->
      <view v-if="isAnswerer && question.status === 'PENDING'" class="answer-section">
        <text class="section-title">输入你的回答</text>
        <textarea v-model="answer" placeholder="请输入回答内容..." maxlength="2000" class="answer-textarea" />
        <text class="char-count">{{ answer.length }}/2000</text>
        <button class="answer-btn" @click="doAnswer" :loading="answering">提交回答</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { questionApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const question = ref<any>(null)
const loading = ref(true)
const errorMsg = ref('')
const answer = ref('')
const answering = ref(false)
const peeking = ref(false)
const currentUserId = ref('')

const statusMap: Record<string, string> = {
  PENDING: '待回答', ANSWERED: '已回答', REFUNDED: '已退款',
}

const isAnswerer = computed(() => {
  return currentUserId.value && question.value?.answererId === currentUserId.value
})

const isAsker = computed(() => {
  return currentUserId.value && question.value?.askerId === currentUserId.value
})

const canPeek = computed(() => {
  if (!question.value) return false
  if (question.value.status !== 'ANSWERED') return false
  if (question.value.peekPriceCoin <= 0) return false
  if (isAsker.value || isAnswerer.value) return false
  return true
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
  else {
    errorMsg.value = '缺少问题ID'
    loading.value = false
  }
})

async function fetchDetail(id: string) {
  loading.value = true
  errorMsg.value = ''
  try {
    question.value = await questionApi.detail(id)
  } catch (e: any) {
    errorMsg.value = '加载失败'
  } finally {
    loading.value = false
  }
}

async function doAnswer() {
  if (!answer.value.trim()) {
    uni.showToast({ title: '请输入回答内容', icon: 'none' })
    return
  }
  answering.value = true
  try {
    await questionApi.answer(question.value.id, { answer: answer.value.trim() })
    uni.showToast({ title: '回答成功', icon: 'success' })
    setTimeout(() => fetchDetail(question.value.id), 800)
  } catch (e: any) {
    uni.showToast({ title: e.errMsg || '回答失败', icon: 'none' })
  } finally {
    answering.value = false
  }
}

async function doPeek() {
  peeking.value = true
  try {
    const result: any = await questionApi.peek(question.value.id)
    question.value = result
    uni.showToast({ title: '围观成功', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e.errMsg || '围观失败', icon: 'none' })
  } finally {
    peeking.value = false
  }
}
</script>

<style scoped>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; padding-bottom: 60px; }
.question-card { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
.q-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.q-avatar { width: 32px; height: 32px; border-radius: 50%; }
.q-nick { font-size: 14px; color: #333; font-weight: 500; flex: 1; }
.q-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.status-PENDING { background: #fff3cd; color: #856404; }
.status-ANSWERED { background: #d4edda; color: #155724; }
.status-REFUNDED { background: #f8f9fa; color: #6c757d; }
.q-body { font-size: 16px; color: #333; display: block; line-height: 1.6; margin-bottom: 10px; }
.q-footer { display: flex; gap: 12px; }
.q-price { font-size: 14px; color: #e74c3c; font-weight: bold; }
.q-circle { font-size: 12px; color: #999; }

.answer-card { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 12px; border-left: 3px solid #8b4513; }
.a-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.a-avatar { width: 28px; height: 28px; border-radius: 50%; }
.a-nick { font-size: 14px; color: #333; font-weight: 500; flex: 1; }
.a-label { font-size: 11px; color: #8b4513; background: #f5ead6; padding: 2px 10px; border-radius: 10px; }
.a-body { font-size: 15px; color: #444; display: block; line-height: 1.7; }
.a-footer { display: flex; gap: 12px; margin-top: 10px; }
.a-peek { font-size: 12px; color: #999; }
.a-peek-price { font-size: 12px; color: #8b4513; }

.peek-section { text-align: center; margin: 20px 0; }
.peek-btn { background: linear-gradient(135deg, #8b4513, #c4943a); color: #fff; border-radius: 24px; padding: 12px 32px; font-size: 15px; border: none; display: inline-block; }

.answer-section { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
.section-title { font-size: 14px; font-weight: bold; color: #333; display: block; margin-bottom: 10px; }
.answer-textarea { width: 100%; min-height: 100px; padding: 10px; border: 1px solid #e8e0d6; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.char-count { font-size: 11px; color: #bbb; text-align: right; display: block; margin: 4px 0 10px; }
.answer-btn { width: 100%; background: #8b4513; color: #fff; border-radius: 24px; padding: 12px; font-size: 16px; border: none; }
</style>
