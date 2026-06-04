<template>
  <view class="page">
    <view class="header">
      <text class="title">
        悬赏问答
      </text>
      <text class="subtitle">
        帮人解答，赚取赏金
      </text>
    </view>

    <view class="filter-tabs">
      <text
        v-for="t in tabs"
        :key="t.value"
        :class="['tab', { active: activeTab === t.value }]"
        @click="switchTab(t.value)"
      >
        {{ t.label }}
      </text>
    </view>

    <LoadingSkeleton
      v-if="loading && list.length === 0"
      type="list"
    />
    <EmptyState
      v-else-if="!loading && list.length === 0"
      icon="💰"
      text="暂无悬赏"
    />

    <view
      v-else
      class="bounty-list"
    >
      <view
        v-for="item in list"
        :key="item.id"
        class="bounty-card"
        @click="goDetail(item.id)"
      >
        <view class="card-top">
          <view class="user-info">
            <image
              class="avatar"
              :src="item.asker?.avatar || '/static/default-avatar.png'"
              mode="aspectFill"
            />
            <text class="nickname">
              {{ item.asker?.nickname || '匿名' }}
            </text>
          </view>
          <view
            class="status-badge"
            :class="'status-' + item.status"
          >
            <text>{{ statusMap[item.status] || item.status }}</text>
          </view>
        </view>
        <text class="card-title">
          {{ item.title }}
        </text>
        <view class="card-tags">
          <text class="tag">
            {{ categoryLabel(item.category) }}
          </text>
        </view>
        <view class="card-footer">
          <text class="bounty-amount">
            💰 {{ item.bountyCoin }} 币
          </text>
          <text class="answer-count">
            {{ item.answerCount || 0 }} 个回答
          </text>
        </view>
      </view>
    </view>

    <view
      v-if="total > pageSize"
      class="pagination"
    >
      <text
        class="load-more"
        @click="loadMore"
      >
        {{ list.length >= total ? '没有更多了' : '加载更多' }}
      </text>
    </view>

    <view
      class="fab"
      @click="goCreate"
    >
      <text class="fab-icon">
        +
      </text>
      <text class="fab-label">
        发布悬赏
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const list = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const activeTab = ref('')

const tabs = [
  { label: '全部', value: '' },
  { label: '八字', value: 'BAZI' },
  { label: '紫微', value: 'ZIWEI' },
  { label: '风水', value: 'FENGSHUI' },
  { label: '事业', value: 'CAREER' },
  { label: '情感', value: 'LOVE' },
  { label: '通用', value: 'GENERAL' },
]

const statusMap: Record<string, string> = {
  OPEN: '待解答',
  ANSWERED: '已解答',
  SATISFIED: '已采纳',
  CLOSED: '已关闭',
}

const categoryMap: Record<string, string> = {
  BAZI: '八字',
  ZIWEI: '紫微',
  FENGSHUI: '风水',
  CAREER: '事业',
  LOVE: '情感',
  GENERAL: '通用',
}

function categoryLabel(cat: string): string {
  return categoryMap[cat] || cat || '通用'
}

onMounted(() => {
  fetchList()
})

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (activeTab.value) params.category = activeTab.value
    const data: any = await api.get('/bounty', params)
    const items = data?.list || data?.items || data?.data || data || []
    if (page.value === 1) {
      list.value = Array.isArray(items) ? items : []
    } else {
      list.value.push(...(Array.isArray(items) ? items : []))
    }
    total.value = data?.total || list.value.length
  } catch { /* */ } finally {
    loading.value = false
  }
}

function switchTab(tab: string) {
  activeTab.value = tab
  page.value = 1
  fetchList()
}

function loadMore() {
  if (list.value.length >= total.value) return
  page.value++
  fetchList()
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/bounty/detail?id=${id}` })
}

function goCreate() {
  uni.navigateTo({ url: '/pages/bounty/create' })
}
</script>

<style scoped>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; padding-bottom: 100px; }
.header { margin-bottom: 12px; }
.title { font-size: 20px; font-weight: bold; color: #C41E3A; }
.subtitle { font-size: 13px; color: #999; margin-left: 8px; }
.filter-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
.tab { padding: 6px 14px; border-radius: 16px; font-size: 13px; background: #fff; color: #666; }
.tab.active { background: #C41E3A; color: #fff; }
.bounty-list { display: flex; flex-direction: column; gap: 10px; }
.bounty-card { background: #fff; border-radius: 10px; padding: 14px; }
.card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.user-info { display: flex; align-items: center; gap: 6px; flex: 1; }
.avatar { width: 28px; height: 28px; border-radius: 50%; }
.nickname { font-size: 13px; color: #333; font-weight: 500; }
.status-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.status-OPEN { background: #fff3cd; color: #856404; }
.status-ANSWERED { background: #d4edda; color: #155724; }
.status-SATISFIED { background: #cce5ff; color: #004085; }
.status-CLOSED { background: #f8f9fa; color: #6c757d; }
.card-title { font-size: 15px; color: #333; font-weight: 500; display: block; margin-bottom: 8px; line-height: 1.4; }
.card-tags { display: flex; gap: 6px; margin-bottom: 8px; }
.tag { font-size: 11px; color: #C41E3A; background: #F5F0E8; padding: 2px 10px; border-radius: 10px; }
.card-footer { display: flex; align-items: center; gap: 16px; }
.bounty-amount { font-size: 14px; color: #C41E3A; font-weight: bold; }
.answer-count { font-size: 12px; color: #999; }
.pagination { text-align: center; margin-top: 20px; }
.load-more { font-size: 13px; color: #C41E3A; }
.fab { position: fixed; bottom: 40px; right: 20px; display: flex; flex-direction: column; align-items: center; gap: 4px; z-index: 99; }
.fab-icon { width: 48px; height: 48px; border-radius: 50%; background: #C41E3A; color: #fff; font-size: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(139,69,19,0.3); line-height: 1; }
.fab-label { font-size: 11px; color: #666; background: rgba(255,255,255,0.9); padding: 2px 8px; border-radius: 8px; }
</style>
