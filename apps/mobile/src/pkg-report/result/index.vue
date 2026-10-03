<template>
  <view class="rr-page">
    <view class="rr-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="rr-header-row">
        <view class="rr-icon-btn press" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#2B2620" />
        </view>
        <view class="rr-header-copy">
          <text class="rr-header-title">我的举报</text>
          <text class="rr-header-sub">每一条反馈都有进度可查</text>
        </view>
        <view class="rr-header-spacer" />
      </view>
    </view>

    <scroll-view scroll-y class="rr-scroll">
      <view v-if="loading" class="rr-state">
        <view class="rr-spinner" />
        <text class="rr-state-title">正在读取举报记录</text>
        <text class="rr-state-desc">请稍候</text>
      </view>

      <view v-else-if="loadError" class="rr-state">
        <view class="rr-state-icon">
          <app-icon name="wifi-off" :size="52" color="#B4884A" />
        </view>
        <text class="rr-state-title">记录加载失败</text>
        <text class="rr-state-desc">{{ loadError }}</text>
        <view class="rr-retry press" @tap="loadReports">
          <text class="rr-retry-text">重新加载</text>
        </view>
      </view>

      <template v-else>
        <view class="rr-stats">
          <view class="rr-stat-item">
            <text class="rr-stat-num">{{ stats.total }}</text>
            <text class="rr-stat-label">全部</text>
          </view>
          <view class="rr-stat-divider" />
          <view class="rr-stat-item">
            <text class="rr-stat-num rr-amber">{{ stats.pending }}</text>
            <text class="rr-stat-label">核查中</text>
          </view>
          <view class="rr-stat-divider" />
          <view class="rr-stat-item">
            <text class="rr-stat-num rr-green">{{ stats.completed }}</text>
            <text class="rr-stat-label">已完成</text>
          </view>
        </view>

        <scroll-view v-if="records.length" scroll-x class="rr-filter" :show-scrollbar="false">
          <view class="rr-filter-inner">
            <view
              v-for="f in statusFilters"
              :key="f.value"
              class="rr-filter-btn press"
              :class="{ active: statusFilter === f.value }"
              @tap="statusFilter = f.value"
            >
              <text class="rr-filter-text" :class="{ active: statusFilter === f.value }">{{ f.label }}</text>
            </view>
          </view>
        </scroll-view>

        <view v-if="filteredRecords.length" class="rr-list">
          <view
            v-for="record in filteredRecords"
            :key="record.id"
            class="rr-item press"
            @tap="openDetail(record.id)"
          >
            <view class="rr-item-icon">
              <app-icon :name="targetIcon(record.targetType)" :size="34" color="#8A6A3C" />
            </view>
            <view class="rr-item-main">
              <view class="rr-item-head">
                <text class="rr-item-title">已举报的{{ targetLabel(record.targetType) }}</text>
                <view class="rr-status" :class="'rr-status-' + uiStatus(record.status, record.result)">
                  <text class="rr-status-text">{{ statusLabel(record.status, record.result) }}</text>
                </view>
              </view>
              <text class="rr-item-category">{{ reasonParts(record.reason).category }}</text>
              <text class="rr-item-reason">{{ reasonParts(record.reason).detail }}</text>
              <view class="rr-item-foot">
                <text class="rr-item-time">{{ formatTime(record.createdAt) }}</text>
                <text class="rr-item-id">编号 {{ shortId(record.id) }}</text>
              </view>
            </view>
            <app-icon name="chevron-right" :size="32" color="#C7BFB3" />
          </view>
        </view>

        <view v-else class="rr-empty">
          <view class="rr-empty-icon">
            <app-icon name="shield-check" :size="58" color="#B4884A" />
          </view>
          <text class="rr-empty-title">{{ records.length ? '该状态下暂无记录' : '暂无举报记录' }}</text>
          <text class="rr-empty-desc">{{ records.length ? '可以切换上方状态查看其他记录' : '遇到违规内容时，可从内容菜单发起举报' }}</text>
          <view v-if="records.length" class="rr-empty-action press" @tap="statusFilter = 'all'">
            <text class="rr-empty-action-text">查看全部</text>
          </view>
        </view>

        <view v-if="records.length" class="rr-note">
          <app-icon name="info" :size="28" color="#9A7A48" />
          <text class="rr-note-text">举报内容仅用于平台治理，不会向被举报方展示你的身份。</text>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { reportApi, type ReportRecord } from '@/lib/report-data'

type UiStatus = 'pending' | 'processed' | 'dismissed'

const statusBarHeight = ref(0)
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch {
  statusBarHeight.value = 0
}

const loading = ref(true)
const loadError = ref('')
const records = ref<ReportRecord[]>([])
const statusFilter = ref<'all' | UiStatus>('all')
const statusFilters: { value: 'all' | UiStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '核查中' },
  { value: 'processed', label: '已处理' },
  { value: 'dismissed', label: '未发现违规' },
]

const TARGET_META: Record<string, { label: string; icon: string }> = {
  POST: { label: '动态', icon: 'file-text' },
  ARTICLE: { label: '文章', icon: 'file-text' },
  COMMENT: { label: '评论', icon: 'message-circle' },
  CIRCLE: { label: '圈子', icon: 'users' },
  USER: { label: '用户', icon: 'user' },
  COURSE: { label: '课程', icon: 'book-open' },
  PRODUCT: { label: '商品', icon: 'shopping-bag' },
  LIVE: { label: '直播', icon: 'radio' },
  VIDEO: { label: '短视频', icon: 'video' },
}

function uiStatus(status: string, result?: string | null): UiStatus {
  const s = String(status || '').toUpperCase()
  if (s === 'DISMISSED' || String(result || '').startsWith('DISMISS')) return 'dismissed'
  if (s === 'PROCESSED') return 'processed'
  return 'pending'
}

const stats = computed(() => ({
  total: records.value.length,
  pending: records.value.filter((r) => uiStatus(r.status, r.result) === 'pending').length,
  completed: records.value.filter((r) => uiStatus(r.status, r.result) !== 'pending').length,
}))

const filteredRecords = computed(() => {
  if (statusFilter.value === 'all') return records.value
  return records.value.filter((r) => uiStatus(r.status, r.result) === statusFilter.value)
})

function targetLabel(type: string) {
  return TARGET_META[String(type || '').toUpperCase()]?.label || '内容'
}

function targetIcon(type: string) {
  return TARGET_META[String(type || '').toUpperCase()]?.icon || 'alert-circle'
}

function statusLabel(status: string, result?: string | null) {
  const s = uiStatus(status, result)
  return s === 'pending' ? '核查中' : s === 'dismissed' ? '未发现违规' : '已处理'
}

function reasonParts(reason: string) {
  const raw = String(reason || '').trim()
  const match = raw.match(/^【([^】]+)】/)
  const category = match?.[1] || '其他问题'
  let detail = raw.replace(/^【[^】]+】/, '').trim()
  detail = detail.split(/\n\[凭证\]/)[0].trim()
  return { category, detail: detail || '未填写补充说明' }
}

function formatTime(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '时间未知'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function shortId(id: string) {
  const value = String(id || '')
  return value.length > 8 ? `${value.slice(0, 8)}…` : value
}

async function loadReports() {
  loading.value = true
  loadError.value = ''
  try {
    const page = await reportApi.mine(1, 100)
    records.value = Array.isArray(page?.items) ? page.items : []
  } catch (e) {
    records.value = []
    loadError.value = (e as Error)?.message || '网络开小差了，请稍后重试'
  } finally {
    loading.value = false
  }
}

function openDetail(id: string) {
  navigateTo(`/report/result/${id}`)
}

function goBack() {
  navigateBack()
}

onMounted(loadReports)
</script>

<style scoped>
.rr-page { min-height: 100vh; background: #FAF8F5; color: #2B2620; }
.rr-header { position: sticky; top: 0; z-index: 20; background: rgba(250,248,245,.96); backdrop-filter: blur(18px); border-bottom: 1rpx solid rgba(99,77,49,.08); }
.rr-header-row { height: 96rpx; display: flex; align-items: center; padding: 0 24rpx; }
.rr-icon-btn, .rr-header-spacer { width: 68rpx; height: 68rpx; display: flex; align-items: center; justify-content: center; }
.rr-header-copy { flex: 1; min-width: 0; text-align: center; }
.rr-header-title { display: block; font-family: var(--font-serif); font-size: 32rpx; font-weight: 700; }
.rr-header-sub { display: block; margin-top: 3rpx; font-size: 20rpx; color: #A49A8C; }
.rr-scroll { height: calc(100vh - 96rpx); }
.rr-stats { margin: 28rpx 28rpx 18rpx; padding: 26rpx 12rpx; display: flex; align-items: center; background: linear-gradient(135deg,#FFF 0%,#FCF8EF 100%); border: 1rpx solid rgba(180,136,74,.16); border-radius: 24rpx; box-shadow: 0 6rpx 24rpx rgba(78,59,34,.06); }
.rr-stat-item { flex: 1; text-align: center; }
.rr-stat-num { display: block; font-size: 38rpx; line-height: 1.1; font-weight: 700; color: #2B2620; }
.rr-stat-num.rr-amber { color: #B7791F; }
.rr-stat-num.rr-green { color: #2F855A; }
.rr-stat-label { display: block; margin-top: 9rpx; font-size: 22rpx; color: #8A8578; }
.rr-stat-divider { width: 1rpx; height: 56rpx; background: #EDE6DA; }
.rr-filter { width: 100%; white-space: nowrap; margin-bottom: 8rpx; }
.rr-filter-inner { display: inline-flex; gap: 12rpx; padding: 8rpx 28rpx 16rpx; }
.rr-filter-btn { padding: 13rpx 24rpx; background: #EEE9E1; border-radius: 999rpx; }
.rr-filter-btn.active { background: #2B2620; box-shadow: 0 4rpx 12rpx rgba(43,38,32,.16); }
.rr-filter-text { font-size: 24rpx; color: #716A60; }
.rr-filter-text.active { color: #FFF; font-weight: 600; }
.rr-list { padding: 0 28rpx; }
.rr-item { display: flex; align-items: center; gap: 20rpx; margin-bottom: 18rpx; padding: 26rpx 22rpx; background: #FFF; border: 1rpx solid rgba(93,71,43,.08); border-radius: 22rpx; box-shadow: 0 4rpx 18rpx rgba(76,58,35,.05); }
.rr-item-icon { width: 70rpx; height: 70rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; background: #F6EFE3; }
.rr-item-main { flex: 1; min-width: 0; }
.rr-item-head { display: flex; align-items: center; gap: 14rpx; }
.rr-item-title { flex: 1; min-width: 0; font-size: 28rpx; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rr-status { flex-shrink: 0; padding: 5rpx 13rpx; border-radius: 999rpx; }
.rr-status-pending { background: #FFF4D8; }
.rr-status-processed { background: #E8F6EE; }
.rr-status-dismissed { background: #F0EFEC; }
.rr-status-text { font-size: 20rpx; color: #9A681C; }
.rr-status-processed .rr-status-text { color: #28744B; }
.rr-status-dismissed .rr-status-text { color: #777066; }
.rr-item-category { display: inline-block; margin-top: 12rpx; font-size: 21rpx; color: #9A7A48; }
.rr-item-reason { display: block; margin-top: 5rpx; font-size: 24rpx; color: #655F56; line-height: 1.55; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rr-item-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 14rpx; }
.rr-item-time, .rr-item-id { font-size: 20rpx; color: #ADA498; }
.rr-state, .rr-empty { min-height: 620rpx; padding: 80rpx 64rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; }
.rr-state-icon, .rr-empty-icon { width: 116rpx; height: 116rpx; display: flex; align-items: center; justify-content: center; border-radius: 34rpx; background: #F5ECDE; }
.rr-state-title, .rr-empty-title { margin-top: 30rpx; font-size: 30rpx; font-weight: 650; color: #3A342D; }
.rr-state-desc, .rr-empty-desc { margin-top: 12rpx; font-size: 24rpx; line-height: 1.6; color: #9C9387; }
.rr-retry, .rr-empty-action { margin-top: 30rpx; padding: 16rpx 36rpx; border-radius: 999rpx; background: #2B2620; }
.rr-retry-text, .rr-empty-action-text { font-size: 25rpx; color: #FFF; }
.rr-spinner { width: 50rpx; height: 50rpx; border: 5rpx solid #E6DCCB; border-top-color: #B4884A; border-radius: 50%; animation: spin .85s linear infinite; }
.rr-note { display: flex; align-items: flex-start; gap: 12rpx; margin: 22rpx 28rpx calc(40rpx + env(safe-area-inset-bottom)); padding: 22rpx 24rpx; background: rgba(180,136,74,.08); border-radius: 18rpx; }
.rr-note-text { flex: 1; font-size: 22rpx; color: #7F725F; line-height: 1.55; }
.press:active { opacity: .72; transform: scale(.985); }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
