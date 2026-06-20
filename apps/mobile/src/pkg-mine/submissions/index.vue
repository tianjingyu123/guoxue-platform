<template>
  <view class="page">
    <!-- Header -->
    <view
      class="nav"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="nav-bar">
        <view
          class="nav-btn"
          @click="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="20"
            color="#2C2C2C"
          />
        </view>
        <text class="nav-title">
          我的投稿
        </text>
        <view
          class="nav-btn"
          @click="onRefresh"
        >
          <app-icon
            name="refresh-cw"
            :size="20"
            color="#666666"
            :class="{ spinning: refreshing }"
          />
        </view>
      </view>
      <!-- Tabs -->
      <view class="tabs">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="tab"
          :class="{ 'tab-active': activeTab === t.key }"
          @click="activeTab = t.key"
        >
          <app-icon
            :name="t.icon"
            :size="16"
            :color="activeTab === t.key ? '#FFFFFF' : '#666666'"
          />
          <text
            class="tab-label"
            :class="{ 'tab-label-active': activeTab === t.key }"
          >
            {{ t.label }}
          </text>
          <text
            v-if="t.key"
            class="tab-count"
            :class="{ 'tab-count-active': activeTab === t.key }"
          >
            {{ counts[t.key] }}
          </text>
        </view>
      </view>
    </view>

    <!-- Content -->
    <view class="body">
      <view
        v-if="filtered.length === 0"
        class="empty"
      >
        <view class="empty-icon">
          <app-icon
            name="file-text"
            :size="32"
            color="#999999"
          />
        </view>
        <text class="empty-text">
          暂无投稿记录
        </text>
        <view
          class="empty-btn"
          @click="goEditor"
        >
          <text class="empty-btn-text">
            去投稿
          </text>
        </view>
      </view>

      <view
        v-for="item in filtered"
        :key="item.id"
        class="card"
      >
        <view class="card-row">
          <view
            v-if="item.cover"
            class="cover"
          >
            <app-icon
              name="file-text"
              :size="24"
              color="#C9C2B8"
            />
          </view>
          <view class="card-info">
            <text class="card-title">
              {{ item.title }}
            </text>
            <view class="card-meta">
              <text class="meta-text">
                投稿至 {{ item.targetPosition }}
              </text>
              <text class="meta-dot">
                ·
              </text>
              <text class="meta-text">
                {{ formatDate(item.submittedAt) }}
              </text>
            </view>
          </view>
          <view
            class="status"
            :class="'status-' + item.status"
          >
            <app-icon
              :name="statusConf(item.status).icon"
              :size="12"
              :color="statusConf(item.status).color"
            />
            <text
              class="status-text"
              :style="{ color: statusConf(item.status).color }"
            >
              {{ statusConf(item.status).label }}
            </text>
          </view>
        </view>

        <!-- Stats for approved -->
        <view
          v-if="item.status === 'approved' && (item.views || item.likes)"
          class="stats"
        >
          <view
            v-if="item.views !== undefined"
            class="stat"
          >
            <app-icon
              name="eye"
              :size="16"
              color="#666666"
            />
            <text class="stat-num">
              {{ item.views }}
            </text>
          </view>
          <view
            v-if="item.likes !== undefined"
            class="stat"
          >
            <app-icon
              name="heart"
              :size="16"
              color="#666666"
            />
            <text class="stat-num">
              {{ item.likes }}
            </text>
          </view>
          <view class="stat-spacer" />
          <view
            class="detail-btn"
            @click="goArticle(item.id)"
          >
            <text class="detail-text">
              查看详情
            </text>
            <app-icon
              name="chevron-right"
              :size="16"
              color="#C41E3A"
            />
          </view>
        </view>

        <!-- Reject reason -->
        <view
          v-if="item.status === 'rejected' && item.rejectReason"
          class="reject-wrap"
        >
          <view class="reject-box">
            <app-icon
              name="alert-circle"
              :size="16"
              color="#EF4444"
            />
            <view class="reject-main">
              <text class="reject-title">
                未通过原因
              </text>
              <text class="reject-reason">
                {{ item.rejectReason }}
              </text>
            </view>
          </view>
          <view
            class="resubmit-btn"
            @click="goEditor(item.id)"
          >
            <app-icon
              name="edit-3"
              :size="16"
              color="#FFFFFF"
            />
            <text class="resubmit-text">
              修改并重新投稿
            </text>
          </view>
        </view>

        <!-- Pending status -->
        <view
          v-if="item.status === 'pending'"
          class="pending-wrap"
        >
          <view class="pending-dot" />
          <text class="pending-text">
            预计1-3个工作日内完成审核
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const statusBarHeight = ref(20)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 20 } })

const activeTab = ref<'' | 'pending' | 'approved' | 'rejected'>('')
const refreshing = ref(false)

const tabs = [
  { key: '' as const, label: '全部', icon: 'file-text' },
  { key: 'pending' as const, label: '审核中', icon: 'clock' },
  { key: 'approved' as const, label: '已通过', icon: 'check-circle' },
  { key: 'rejected' as const, label: '未通过', icon: 'x-circle' },
]

const submissions = [
  { id: '1', title: '八字命理入门：如何看懂自己的命盘', type: 'article', cover: '/static/placeholder.png', status: 'pending', submittedAt: '2024-01-15T10:30:00Z', targetPosition: '首页推荐' },
  { id: '2', title: '紫微斗数与八字的区别解析', type: 'article', cover: '/static/placeholder.png', status: 'approved', submittedAt: '2024-01-12T14:20:00Z', reviewedAt: '2024-01-13T09:00:00Z', targetPosition: '发现页精选', views: 2580, likes: 186 },
  { id: '3', title: '风水布局的基本原则', type: 'article', cover: '', status: 'rejected', submittedAt: '2024-01-10T08:15:00Z', reviewedAt: '2024-01-11T16:30:00Z', rejectReason: '内容与已有文章重复度较高，建议增加原创观点或案例分析', targetPosition: '首页推荐' },
  { id: '4', title: '易经六十四卦详解系列', type: 'article', cover: '/static/placeholder.png', status: 'approved', submittedAt: '2024-01-08T11:00:00Z', reviewedAt: '2024-01-09T10:00:00Z', targetPosition: '专题推荐', views: 5680, likes: 423 },
] as any[]

const counts = computed(() => ({
  '': submissions.length,
  pending: submissions.filter((s) => s.status === 'pending').length,
  approved: submissions.filter((s) => s.status === 'approved').length,
  rejected: submissions.filter((s) => s.status === 'rejected').length,
}))

const filtered = computed(() => {
  if (!activeTab.value) return submissions
  return submissions.filter((s) => s.status === activeTab.value)
})

function statusConf(s: string) {
  return {
    pending: { label: '审核中', color: '#D97706', icon: 'clock' },
    approved: { label: '已通过', color: '#059669', icon: 'check-circle' },
    rejected: { label: '未通过', color: '#DC2626', icon: 'x-circle' },
  }[s] || { label: '', color: '#666', icon: 'file-text' }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${h}:${m}`
}

function goBack() { uni.navigateBack() }
function goEditor(id?: string) { uni.navigateTo({ url: '/pkg-content/editor/index' + (id ? '?id=' + id : '') }) }
function goArticle(id: string) { uni.navigateTo({ url: '/pkg-content/article/index?id=' + id }) }
function onRefresh() {
  refreshing.value = true
  setTimeout(() => { refreshing.value = false }, 800)
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FAF8F5; }

.nav { position: sticky; top: 0; z-index: 10; background: #FAF8F5; border-bottom: 1rpx solid #E8E3DB; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; }
.nav-btn { padding: 16rpx; margin: -16rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.tabs { display: flex; padding: 0 32rpx 24rpx; gap: 16rpx; }
.tab { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 24rpx; border-radius: 999rpx; background: #FFFFFF; border: 1rpx solid #E8E3DB; }
.tab-active { background: #C41E3A; border-color: #C41E3A; }
.tab-label { font-size: 26rpx; color: #666666; }
.tab-label-active { color: #FFFFFF; }
.tab-count { font-size: 22rpx; color: #999999; }
.tab-count-active { color: rgba(255,255,255,0.8); }

.body { padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx; }

.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; }
.empty-icon { width: 128rpx; height: 128rpx; border-radius: 50%; background: #F5F5F5; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-text { color: #999999; font-size: 28rpx; margin-bottom: 32rpx; }
.empty-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.empty-btn-text { color: #FFFFFF; font-size: 26rpx; }

.card { background: #FFFFFF; border-radius: 32rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-row { display: flex; gap: 24rpx; }
.cover { width: 160rpx; height: 112rpx; border-radius: 16rpx; overflow: hidden; flex-shrink: 0; background: #F5F5F5; display: flex; align-items: center; justify-content: center; }
.card-info { flex: 1; min-width: 0; }
.card-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 8rpx; }
.card-meta { display: flex; align-items: center; gap: 12rpx; }
.meta-text { font-size: 22rpx; color: #999999; }
.meta-dot { font-size: 22rpx; color: #999999; }
.status { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 16rpx; border-radius: 999rpx; flex-shrink: 0; height: fit-content; }
.status-pending { background: rgba(245, 158, 11, 0.1); }
.status-approved { background: rgba(16, 185, 129, 0.1); }
.status-rejected { background: rgba(239, 68, 68, 0.1); }
.status-text { font-size: 22rpx; }

.stats { display: flex; align-items: center; gap: 32rpx; margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid #F5F5F5; }
.stat { display: flex; align-items: center; gap: 8rpx; }
.stat-num { font-size: 26rpx; color: #666666; }
.stat-spacer { flex: 1; }
.detail-btn { display: flex; align-items: center; gap: 6rpx; }
.detail-text { font-size: 26rpx; color: #C41E3A; }

.reject-wrap { margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid #F5F5F5; }
.reject-box { display: flex; align-items: flex-start; gap: 16rpx; padding: 24rpx; background: #FEF2F2; border-radius: 16rpx; }
.reject-main { flex: 1; }
.reject-title { font-size: 26rpx; color: #DC2626; font-weight: 500; display: block; margin-bottom: 8rpx; }
.reject-reason { font-size: 26rpx; color: rgba(239, 68, 68, 0.8); line-height: 1.5; }
.resubmit-btn { width: 100%; margin-top: 24rpx; padding: 22rpx 0; background: linear-gradient(90deg, #C41E3A, #E85050); border-radius: 20rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.resubmit-text { font-size: 26rpx; font-weight: 500; color: #FFFFFF; }

.pending-wrap { margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid #F5F5F5; display: flex; align-items: center; gap: 12rpx; }
.pending-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #F59E0B; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.pending-text { font-size: 26rpx; color: #D97706; }
</style>
