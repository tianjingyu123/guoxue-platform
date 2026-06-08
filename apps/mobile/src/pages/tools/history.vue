<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">排盘记录</text>
      <view class="header-spacer" />
    </view>

    <!-- 加载 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-icon">⏳</text>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空数据 -->
    <view v-else-if="!records.length" class="empty-wrap">
      <text class="empty-icon">📋</text>
      <text class="empty-title">暂无排盘记录</text>
      <text class="empty-desc">开始使用排盘工具，记录会保存在这里</text>
      <view class="empty-btn" @click="goTools"><text>去排盘</text></view>
    </view>

    <!-- 记录列表 -->
    <view v-else class="record-list">
      <view v-for="(group, date) in groupedRecords" :key="date" class="date-group">
        <text class="date-label">{{ date }}</text>
        <view
          v-for="record in group"
          :key="record.id"
          class="record-card"
          @click="openRecord(record)"
        >
          <view class="record-left">
            <view class="record-icon-box" :class="'cat-' + (record.category || 'bazi-ziwei')">
              <text class="record-emoji">{{ getToolEmoji(record.toolId) }}</text>
            </view>
            <view class="record-info">
              <text class="record-tool">{{ record.toolName }}</text>
              <text class="record-input">{{ formatInput(record.input) }}</text>
              <text class="record-time">{{ formatTime(record.createdAt) }}</text>
            </view>
          </view>
          <text class="record-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface PaipanRecord {
  id: string
  toolId: string
  toolName: string
  category: string
  input: Record<string, any>
  result?: any
  createdAt: string
}

const loading = ref(true)
const records = ref<PaipanRecord[]>([])

const toolEmojiMap: Record<string, string> = {
  bazi: '🔮', ziwei: '⭐', chenggu: '⚖️', 'bazi-hehun': '💑',
  'qimen-yang': '🚪', liuyao: '🪙', meihua: '🌸', huangli: '📅',
  jiemeng: '💤', lingqian: '🏮', qiming: '📛', 'xingming-jiexi': '🔍',
}

function getToolEmoji(id: string) { return toolEmojiMap[id] || '🔧' }

const groupedRecords = computed(() => {
  const groups: Record<string, PaipanRecord[]> = {}
  records.value.forEach(r => {
    const date = r.createdAt?.split('T')[0] || '未知日期'
    if (!groups[date]) groups[date] = []
    groups[date].push(r)
  })
  return groups
})

onMounted(async () => {
  await loadRecords()
})

async function loadRecords() {
  loading.value = true
  try {
    // 先尝试从本地存储加载
    const cached = uni.getStorageSync('paipan_history')
    if (cached) {
      records.value = JSON.parse(cached)
    }

    // 如果有 token，从服务端加载
    const token = uni.getStorageSync('token')
    if (token) {
      try {
        const { api } = await import('../../api')
        const res: any = await (api as any).get('/tools/analysis/history/mine')
        const data = res?.data
        if (data?.records?.length) {
          records.value = data.records.map((r: any) => ({
            id: r.id,
            toolId: r.toolId,
            toolName: r.toolName || r.toolId,
            category: r.category || 'bazi-ziwei',
            input: r.input || {},
            result: r.result,
            createdAt: r.createdAt,
          }))
          // 同步到本地
          uni.setStorageSync('paipan_history', JSON.stringify(records.value))
        }
      } catch { /* 离线使用本地记录 */ }
    }
  } catch { /* ignore */ }
  loading.value = false
}

function formatInput(input: Record<string, any>): string {
  if (!input) return ''
  const parts = []
  if (input.gender) parts.push(input.gender)
  if (input.year) parts.push(`${input.year}年`)
  if (input.month) parts.push(`${input.month}月`)
  if (input.day) parts.push(`${input.day}日`)
  if (input.hour !== undefined) parts.push(`${input.hour}时`)
  if (input.name) parts.push(input.name)
  if (input.question) parts.push(input.question)
  if (input.keyword) parts.push(input.keyword)
  return parts.join(' ') || JSON.stringify(input).slice(0, 50)
}

function formatTime(ts: string): string {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function openRecord(record: PaipanRecord) {
  uni.navigateTo({ url: `/pages/tools/calculate?toolId=${record.toolId}` })
}

function goTools() {
  uni.redirectTo({ url: '/pages/tools/index' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 60rpx; }

.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

.loading-wrap { display: flex; flex-direction: column; align-items: center; padding: 200rpx 32rpx; }
.loading-icon { font-size: 64rpx; }
.loading-text { font-size: 28rpx; color: #999; margin-top: 16rpx; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 160rpx 32rpx; }
.empty-icon { font-size: 80rpx; }
.empty-title { font-size: 30rpx; color: #3C2415; margin-top: 24rpx; font-weight: 500; }
.empty-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.empty-btn { margin-top: 40rpx; padding: 20rpx 56rpx; background: linear-gradient(135deg, #5a3a1a, #8b6914); border-radius: 40rpx; }
.empty-btn text { color: #fff; font-size: 28rpx; }

.date-group { margin-bottom: 24rpx; }
.date-label { font-size: 24rpx; color: #999; padding: 16rpx 32rpx 8rpx; display: block; }
.record-card {
  display: flex; align-items: center; margin: 0 32rpx 12rpx;
  padding: 20rpx; background: #fff; border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
}
.record-card:active { transform: scale(0.98); }
.record-left { display: flex; align-items: center; gap: 20rpx; flex: 1; }
.record-icon-box {
  width: 72rpx; height: 72rpx; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
}
.cat-bazi-ziwei { background: linear-gradient(135deg, #FEF3C7, #FDE68A); }
.cat-qimen { background: linear-gradient(135deg, #FCE7F3, #FBCFE8); }
.cat-liuren { background: linear-gradient(135deg, #DBEAFE, #BFDBFE); }
.cat-divination { background: linear-gradient(135deg, #EDE9FE, #DDD6FE); }
.record-emoji { font-size: 32rpx; }
.record-info { flex: 1; }
.record-tool { font-size: 28rpx; font-weight: 500; color: #3C2415; display: block; }
.record-input { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 400rpx; }
.record-time { font-size: 20rpx; color: #C9A96E; margin-top: 4rpx; display: block; }
.record-arrow { font-size: 32rpx; color: #ccc; }
</style>
