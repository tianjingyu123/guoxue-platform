<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="onNavBack">
          <app-icon name="arrow-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">{{ selected ? '咨询详情' : '咨询管理' }}</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <view v-if="loading" class="loading-state"><text>加载中...</text></view>
      <view v-if="error" class="error-state">
        <text>加载失败</text>
        <view @tap="retry"><text>重试</text></view>
      </view>
      <view v-if="!loading && !error">
      <!-- 详情视图 -->
      <template v-if="selected">
        <view class="prod-box">
          <text class="prod-label">商品</text>
          <text class="prod-name">{{ selected.productName }}</text>
        </view>

        <view class="customer-box">
          <view class="customer-avatar">
            <app-icon name="user" :size="24" color="#c41e3a" />
          </view>
          <view class="customer-info">
            <text class="customer-name">{{ selected.customer }}</text>
            <view class="customer-time">
              <app-icon name="clock" :size="12" color="#9ca3af" />
              <text class="customer-time-text">{{ selected.time }}</text>
            </view>
          </view>
          <text class="status-badge" :class="selected.status === 'answered' ? 'badge-green' : 'badge-orange'">
            {{ selected.status === 'answered' ? '已回答' : '待回答' }}
          </text>
        </view>

        <view class="section">
          <text class="section-title">客户问题</text>
          <view class="card"><text class="question-text">{{ selected.question }}</text></view>
        </view>

        <view v-if="selected.answer" class="section">
          <text class="section-title">您的回复</text>
          <view class="card answer-card">
            <view class="answer-head">
              <app-icon name="check-circle" :size="20" color="#16a34a" />
              <text class="answer-tag">已回复</text>
            </view>
            <text class="answer-text">{{ selected.answer }}</text>
          </view>
        </view>

        <view v-if="selected.status === 'unanswered'" class="section">
          <text class="section-title">写回复</text>
          <textarea v-model="replyText" class="reply-textarea" placeholder="请输入您的回复内容..." />
          <view class="reply-btn" :class="{ disabled: !replyText.trim() || isReplying }" @tap="handleReply">
            <text class="reply-btn-text">{{ isReplying ? '提交中...' : '提交回复' }}</text>
          </view>
        </view>
      </template>

      <!-- 列表视图 -->
      <template v-else>
        <view class="stat-grid">
          <view class="stat-card">
            <text class="stat-num">{{ inquiries.length }}</text>
            <text class="stat-label">总咨询</text>
          </view>
          <view class="stat-card stat-orange">
            <text class="stat-num stat-num-orange">{{ unansweredCount }}</text>
            <text class="stat-label stat-label-orange">待回答</text>
          </view>
          <view class="stat-card stat-green">
            <text class="stat-num stat-num-green">{{ answeredCount }}</text>
            <text class="stat-label stat-label-green">已回答</text>
          </view>
        </view>

        <view class="filter-bar">
          <view
            v-for="f in filters"
            :key="f.key"
            class="filter"
            :class="{ 'filter-active': filter === f.key }"
            @tap="filter = f.key"
          >
            <text class="filter-text" :class="{ 'filter-text-active': filter === f.key }">{{ f.label }}</text>
          </view>
        </view>

        <view class="list">
          <view
            v-for="inquiry in filteredInquiries"
            :key="inquiry.id"
            class="inq-card"
            @tap="selected = inquiry"
          >
            <view class="inq-head">
              <view class="inq-head-body">
                <text class="inq-product">{{ inquiry.productName }}</text>
                <view class="inq-meta">
                  <view class="inq-meta-item"><app-icon name="user" :size="12" color="#9ca3af" /><text class="inq-meta-text">{{ inquiry.customer }}</text></view>
                  <view class="inq-meta-item"><app-icon name="clock" :size="12" color="#9ca3af" /><text class="inq-meta-text">{{ inquiry.time }}</text></view>
                </view>
              </view>
              <text class="status-badge" :class="inquiry.status === 'answered' ? 'badge-green' : 'badge-orange'">
                {{ inquiry.status === 'answered' ? '已回答' : '待回答' }}
              </text>
            </view>
            <text class="inq-question">{{ inquiry.question }}</text>
            <view v-if="inquiry.status === 'unanswered'" class="inq-tip">
              <app-icon name="alert-circle" :size="12" color="#ea580c" />
              <text class="inq-tip-text">待您回复</text>
            </view>
          </view>

          <view v-if="filteredInquiries.length === 0" class="empty">
            <app-icon name="message-square" :size="24" color="#9ca3af" />
            <text class="empty-text">暂无咨询</text>
          </view>
        </view>
      </template>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { merchantAdminApi } from '@/lib/merchant-data'

type Inquiry = { id: string; productName: string; customer: string; status: 'answered' | 'unanswered'; question: string; answer: string; time: string; replies: number }

const statusBarHeight = ref(0)
const navHeight = ref(44)
const loading = ref(true)
const error = ref(false)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const inquiries = ref<Inquiry[]>([])
const filter = ref<'all' | 'unanswered' | 'answered'>('all')
const selected = ref<Inquiry | null>(null)
const replyText = ref('')
const isReplying = ref(false)

onMounted(async () => {
  try {
    await merchantAdminApi.getDashboard()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

function retry() {
  error.value = false
  loading.value = true
  onMounted()
}

const filters = [
  { key: 'all' as const, label: '全部' },
  { key: 'unanswered' as const, label: '待回答' },
  { key: 'answered' as const, label: '已回答' },
]

const unansweredCount = computed(() => inquiries.value.filter((i) => i.status === 'unanswered').length)
const answeredCount = computed(() => inquiries.value.filter((i) => i.status === 'answered').length)
const filteredInquiries = computed(() =>
  inquiries.value.filter((i) => (filter.value === 'all' ? true : i.status === filter.value)),
)

function handleReply() {
  if (!replyText.value.trim() || !selected.value || isReplying.value) return
  isReplying.value = true
  setTimeout(() => {
    const target = inquiries.value.find((i) => i.id === selected.value!.id)
    if (target) {
      target.status = 'answered'
      target.answer = replyText.value
      target.replies += 1
    }
    selected.value = null
    replyText.value = ''
    isReplying.value = false
    uni.showToast({ title: '回复成功', icon: 'success' })
  }, 1000)
}
function onNavBack() {
  if (selected.value) {
    selected.value = null
    replyText.value = ''
  } else {
    goBack()
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #ffffff; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #ffffff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { height: 100vh; box-sizing: border-box; padding-bottom: 40px; }

.stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 16px 16px 0; }
.stat-card { padding: 12px; border-radius: 12px; border: 1px solid #ededed; display: flex; flex-direction: column; align-items: center; }
.stat-orange { background: #fff7ed; border-color: #fed7aa; }
.stat-green { background: #f0fdf4; border-color: #bbf7d0; }
.stat-num { font-size: 24px; font-weight: 700; color: #1a1a1a; }
.stat-num-orange { color: #ea580c; }
.stat-num-green { color: #16a34a; }
.stat-label { font-size: 12px; color: #9ca3af; margin-top: 4px; }
.stat-label-orange { color: #c2620e; }
.stat-label-green { color: #15803d; }

.filter-bar { display: flex; gap: 8px; padding: 16px 16px 0; }
.filter { padding: 6px 14px; border-radius: 999px; background: #f3f4f6; }
.filter-active { background: #c41e3a; }
.filter-text { font-size: 14px; color: #4b5563; }
.filter-text-active { color: #ffffff; }

.list { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.inq-card { padding: 16px; border-radius: 12px; border: 1px solid #ededed; }
.inq-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
.inq-head-body { flex: 1; min-width: 0; }
.inq-product { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inq-meta { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
.inq-meta-item { display: flex; align-items: center; gap: 4px; }
.inq-meta-text { font-size: 12px; color: #9ca3af; }
.inq-question { display: block; font-size: 14px; color: rgba(26, 26, 26, 0.7); line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.inq-tip { display: flex; align-items: center; gap: 4px; margin-top: 8px; }
.inq-tip-text { font-size: 12px; color: #ea580c; }
.status-badge { font-size: 12px; padding: 2px 10px; border-radius: 999px; flex-shrink: 0; }
.badge-green { color: #166534; background: #dcfce7; }
.badge-orange { color: #9a3412; background: #ffedd5; }

.empty { padding: 48px 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.empty-text { font-size: 14px; color: #9ca3af; }

.prod-box { margin: 16px 16px 0; padding: 16px; background: #f9fafb; border-radius: 12px; }
.prod-label { display: block; font-size: 14px; color: #9ca3af; margin-bottom: 4px; }
.prod-name { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.customer-box { margin: 12px 16px 0; padding: 16px; background: #ffffff; border: 1px solid #ededed; border-radius: 12px; display: flex; align-items: center; gap: 12px; }
.customer-avatar { width: 48px; height: 48px; border-radius: 50%; background: rgba(196, 30, 58, 0.1); display: flex; align-items: center; justify-content: center; }
.customer-info { flex: 1; }
.customer-name { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; }
.customer-time { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
.customer-time-text { font-size: 12px; color: #9ca3af; }

.section { padding: 16px 16px 0; }
.section-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.card { background: #ffffff; border: 1px solid #ededed; border-radius: 12px; padding: 16px; }
.question-text { font-size: 15px; color: #1a1a1a; line-height: 1.6; }
.answer-card { background: rgba(196, 30, 58, 0.05); border-color: rgba(196, 30, 58, 0.2); }
.answer-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.answer-tag { font-size: 12px; color: #16a34a; font-weight: 500; }
.answer-text { font-size: 15px; color: #1a1a1a; line-height: 1.6; }
.reply-textarea { width: 100%; box-sizing: border-box; height: 100px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; }
.reply-btn { margin-top: 12px; height: 46px; border-radius: 10px; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.reply-btn.disabled { opacity: 0.5; }
.reply-btn-text { font-size: 15px; font-weight: 500; color: #ffffff; }

.loading-state { padding: 60px 0; display: flex; align-items: center; justify-content: center; }
.loading-state text { font-size: 14px; color: #9ca3af; }
.error-state { padding: 60px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.error-state text { font-size: 14px; color: #ef4444; }
.error-state view { padding: 8px 20px; background: #c41e3a; border-radius: 8px; }
.error-state view text { font-size: 14px; color: #fff; }
</style>
