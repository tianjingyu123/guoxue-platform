<template>
  <view class="page">
    <view class="header">
      <text class="title">付费问答</text>
      <text class="subtitle" v-if="circleName">{{ circleName }}</text>
    </view>

    <view class="filter-tabs">
      <text v-for="t in tabs" :key="t.value" :class="['tab', { active: activeTab === t.value }]" @click="switchTab(t.value)">{{ t.label }}</text>
    </view>

    <LoadingSkeleton v-if="loading && questions.length === 0" type="list" />
    <EmptyState v-else-if="!loading && questions.length === 0" icon="💬" text="暂无问答" />

    <view v-else class="question-list">
      <view v-for="q in questions" :key="q.id" class="question-card" @click="goDetail(q.id)">
        <view class="q-header">
          <image class="q-avatar" :src="q.asker?.avatar || '/static/default-avatar.png'" mode="aspectFill" />
          <text class="q-asker">{{ q.asker?.nickname || '匿名' }}</text>
          <view class="q-status" :class="'status-' + q.status">
            <text>{{ statusMap[q.status] || q.status }}</text>
          </view>
        </view>
        <text class="q-body">{{ q.question }}</text>
        <view class="q-footer">
          <text class="q-price">{{ q.priceCoin }}币</text>
          <text v-if="q.answer" class="q-has-answer">已回复</text>
          <text v-if="q.peekCount" class="q-peek">{{ q.peekCount }}人围观</text>
        </view>
      </view>
    </view>

    <view class="pagination" v-if="total > pageSize">
      <text class="load-more" @click="loadMore">{{ questions.length >= total ? '没有更多了' : '加载更多' }}</text>
    </view>

    <view class="ask-fab" @click="goAsk">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { questionApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const questions = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const activeTab = ref('')
const circleId = ref('')
const circleName = ref('')

const tabs = [
  { label: '全部', value: '' },
  { label: '待回答', value: 'PENDING' },
  { label: '已回答', value: 'ANSWERED' },
]

const statusMap: Record<string, string> = {
  PENDING: '待回答', ANSWERED: '已回答', REFUNDED: '已退款',
}

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  circleId.value = opts.circleId || ''
  circleName.value = decodeURIComponent(opts.circleName || '')
  fetchQuestions()
})

async function fetchQuestions() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (circleId.value) params.circleId = circleId.value
    if (activeTab.value) params.status = activeTab.value
    const data: any = await questionApi.list(params)
    if (page.value === 1) {
      questions.value = data?.questions || []
    } else {
      questions.value.push(...(data?.questions || []))
    }
    total.value = data?.total || 0
  } finally {
    loading.value = false
  }
}

function switchTab(tab: string) {
  activeTab.value = tab
  page.value = 1
  fetchQuestions()
}

function loadMore() {
  if (questions.value.length >= total.value) return
  page.value++
  fetchQuestions()
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/qa/question-detail?id=${id}` })
}

function goAsk() {
  uni.navigateTo({ url: `/pages/qa/ask?circleId=${circleId.value}&circleName=${encodeURIComponent(circleName.value)}` })
}
</script>

<style scoped>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; padding-bottom: 80px; }
.header { margin-bottom: 12px; }
.title { font-size: 20px; font-weight: bold; color: #C41E3A; }
.subtitle { font-size: 13px; color: #999; margin-left: 8px; }
.filter-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab { padding: 6px 16px; border-radius: 16px; font-size: 13px; background: #fff; color: #666; }
.tab.active { background: #C41E3A; color: #fff; }
.question-list { display: flex; flex-direction: column; gap: 10px; }
.question-card { background: #fff; border-radius: 10px; padding: 14px; }
.q-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.q-avatar { width: 28px; height: 28px; border-radius: 50%; }
.q-asker { font-size: 13px; color: #333; font-weight: 500; flex: 1; }
.q-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.status-PENDING { background: #fff3cd; color: #856404; }
.status-ANSWERED { background: #d4edda; color: #155724; }
.status-REFUNDED { background: #f8f9fa; color: #6c757d; }
.q-body { font-size: 15px; color: #333; display: block; margin-bottom: 10px; line-height: 1.5; }
.q-footer { display: flex; gap: 12px; align-items: center; }
.q-price { font-size: 13px; color: #C41E3A; font-weight: bold; }
.q-has-answer { font-size: 11px; color: #27ae60; background: #eafaf1; padding: 2px 8px; border-radius: 8px; }
.q-peek { font-size: 11px; color: #999; }
.pagination { text-align: center; margin-top: 20px; }
.load-more { font-size: 13px; color: #C41E3A; }
.ask-fab { position: fixed; bottom: 40px; right: 20px; width: 48px; height: 48px; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(139,69,19,0.3); z-index: 99; }
.fab-icon { color: #fff; font-size: 28px; line-height: 1; }
</style>
