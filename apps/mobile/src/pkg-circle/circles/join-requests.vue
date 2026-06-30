<script setup lang="ts">
/**
 * 入圈申请审核页（圈主权限）—— 真连 growth 后端
 * 统计栏 + 待审批/已处理双Tab + 卡片(展开/通过/拒绝) + 三态(骨架屏/错误/空态) + 防重复提交
 * 数据：GET /circles/:id/join-requests，审批 POST /circles/:id/join-requests/:reqId/review
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { growthApi, type JoinRequestItem } from '@/lib/circle-growth-data'

const circleId = ref('')
const isLoading = ref(true)
const loadError = ref(false)
const requests = ref<JoinRequestItem[]>([])
const filter = ref<'pending' | 'processed'>('pending')
const expandedId = ref<string | null>(null)
const submittingId = ref<string | null>(null)

onLoad((query) => {
  circleId.value = (query?.id as string) || ''
  loadRequests()
})

async function loadRequests() {
  if (!circleId.value) { isLoading.value = false; loadError.value = true; return }
  isLoading.value = true
  loadError.value = false
  try {
    requests.value = await growthApi.joinRequests(circleId.value)
  } catch (e: any) {
    loadError.value = true
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

const pendingRequests = computed(() => requests.value.filter((r) => r.status === 'PENDING'))
const processedRequests = computed(() => requests.value.filter((r) => r.status !== 'PENDING'))
const displayRequests = computed(() => (filter.value === 'pending' ? pendingRequests.value : processedRequests.value))

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}
function fullTime(s: string) {
  const d = new Date(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function switchTab(key: 'pending' | 'processed') { filter.value = key }
function toggleExpand(id: string) { expandedId.value = expandedId.value === id ? null : id }

async function review(req: JoinRequestItem, action: 'approve' | 'reject') {
  if (submittingId.value) return // 防重复提交
  if (action === 'reject') {
    const res = await new Promise<boolean>((resolve) => {
      uni.showModal({ title: '拒绝申请', content: `确认拒绝「${req.userNickname}」的入圈申请？`, success: (r) => resolve(!!r.confirm) })
    })
    if (!res) return
  }
  submittingId.value = req.id
  try {
    await growthApi.reviewJoinRequest(circleId.value, req.id, action)
    uni.showToast({ title: action === 'approve' ? '已通过' : '已拒绝', icon: 'success' })
    await loadRequests()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
    await loadRequests()
  } finally {
    submittingId.value = null
  }
}
</script>

<template>
  <view class="jr">
    <!-- 顶部导航 -->
    <view class="jr-nav">
      <view class="jr-nav-bar">
        <view class="jr-back" @tap="goBack"><app-icon name="chevron-left" :size="44" color="#2C2C2C" /></view>
        <text class="jr-title">入圈申请</text>
        <view class="jr-nav-ph" />
      </view>
      <!-- 统计 -->
      <view class="jr-stats">
        <view class="jr-stat">
          <view class="jr-stat-icon"><app-icon name="users" :size="28" color="#C41E3A" /></view>
          <view>
            <text class="jr-stat-num jr-red">{{ pendingRequests.length }}</text>
            <text class="jr-stat-label">待审批</text>
          </view>
        </view>
        <view class="jr-divider" />
        <view>
          <text class="jr-stat-num">{{ processedRequests.length }}</text>
          <text class="jr-stat-label">已处理</text>
        </view>
      </view>
      <!-- Tab -->
      <view class="jr-tabs">
        <view v-for="t in [{ key: 'pending', label: '待审批' }, { key: 'processed', label: '已处理' }]" :key="t.key"
          class="jr-tab" :class="{ 'jr-tab-on': filter === t.key }" @tap="switchTab(t.key as any)">
          <text>{{ t.label }}</text>
          <view v-if="filter === t.key" class="jr-tab-line" />
        </view>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="isLoading" class="jr-list">
      <view v-for="i in 3" :key="i" class="jr-skel">
        <view class="jr-skel-row">
          <view class="jr-skel-avatar" />
          <view class="jr-skel-lines">
            <view class="jr-skel-line" style="width: 160rpx;" />
            <view class="jr-skel-line" style="width: 220rpx;" />
          </view>
        </view>
        <view class="jr-skel-line" style="width: 100%; margin-top: 24rpx;" />
        <view class="jr-skel-line" style="width: 66%; margin-top: 14rpx;" />
      </view>
    </view>

    <!-- 错误态 -->
    <view v-else-if="loadError" class="jr-empty">
      <view class="jr-empty-icon"><app-icon name="alert-circle" :size="56" color="#CCCCCC" /></view>
      <text class="jr-empty-text">加载失败</text>
      <view class="jr-retry" @tap="loadRequests">重试</view>
    </view>

    <!-- 空态 -->
    <view v-else-if="displayRequests.length === 0" class="jr-empty">
      <view class="jr-empty-icon"><app-icon name="users" :size="56" color="#CCCCCC" /></view>
      <text class="jr-empty-text">{{ filter === 'pending' ? '暂无待审批申请' : '暂无已处理申请' }}</text>
    </view>

    <!-- 列表 -->
    <view v-else class="jr-list">
      <view v-for="req in displayRequests" :key="req.id" class="jr-card" :class="{ 'jr-card-done': req.status !== 'PENDING' }">
        <view class="jr-card-body">
          <view class="jr-card-head">
            <image lazy-load class="jr-avatar" :src="req.userAvatar" mode="aspectFill" />
            <view class="jr-userinfo">
              <view class="jr-name-row">
                <text class="jr-name">{{ req.userNickname }}</text>
                <text v-if="req.status === 'APPROVED'" class="jr-badge jr-badge-ok">已通过</text>
                <text v-else-if="req.status === 'REJECTED'" class="jr-badge jr-badge-no">已拒绝</text>
              </view>
              <view class="jr-time"><app-icon name="clock" :size="22" color="#999999" /><text>{{ formatTime(req.createdAt) }}</text></view>
            </view>
            <view class="jr-expand" @tap="toggleExpand(req.id)">
              <app-icon :name="expandedId === req.id ? 'chevron-up' : 'chevron-down'" :size="36" color="#999999" />
            </view>
          </view>
          <view v-if="req.message" class="jr-reason">
            <text class="jr-reason-label">申请理由：</text><text class="jr-reason-text">{{ req.message }}</text>
          </view>
          <view v-if="expandedId === req.id" class="jr-detail">
            <text class="jr-detail-line">申请时间：{{ fullTime(req.createdAt) }}</text>
            <text v-if="req.reviewedAt" class="jr-detail-line">处理时间：{{ fullTime(req.reviewedAt) }}</text>
          </view>
        </view>
        <view v-if="req.status === 'PENDING'" class="jr-actions">
          <view class="jr-act" :class="{ 'jr-act-disabled': submittingId === req.id }" @tap="review(req, 'reject')">
            <app-icon name="x-circle" :size="28" color="#666666" /><text>拒绝</text>
          </view>
          <view class="jr-act-divider" />
          <view class="jr-act jr-act-ok" :class="{ 'jr-act-disabled': submittingId === req.id }" @tap="review(req, 'approve')">
            <app-icon name="check-circle" :size="28" color="#C41E3A" /><text>{{ submittingId === req.id ? '处理中...' : '通过' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.jr { min-height: 100vh; background: #FAF8F5; }
.jr-nav { position: sticky; top: 0; z-index: 40; background: #fff; border-bottom: 1rpx solid #F2EFEA; }
.jr-nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; height: 96rpx; }
.jr-back { margin-left: -8rpx; }
.jr-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.jr-nav-ph { width: 48rpx; }
.jr-stats { display: flex; align-items: center; gap: 28rpx; padding: 20rpx 24rpx; background: linear-gradient(to right, rgba(196,30,58,0.05), transparent); }
.jr-stat { display: flex; align-items: center; gap: 14rpx; }
.jr-stat-icon { width: 52rpx; height: 52rpx; border-radius: 999rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.jr-stat-num { display: block; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.jr-red { color: var(--brand); }
.jr-stat-label { display: block; font-size: 22rpx; color: #999999; }
.jr-divider { width: 1rpx; height: 52rpx; background: #E8E3DB; }
.jr-tabs { display: flex; border-bottom: 1rpx solid #F2EFEA; }
.jr-tab { flex: 1; padding: 22rpx 0; text-align: center; font-size: 28rpx; font-weight: 500; color: #999999; position: relative; }
.jr-tab-on { color: var(--brand); }
.jr-tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 48rpx; height: 4rpx; background: var(--brand); border-radius: 999rpx; }
.jr-list { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.jr-card { background: #fff; border-radius: 20rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.jr-card-done { opacity: 0.7; box-shadow: none; }
.jr-card-body { padding: 24rpx; }
.jr-card-head { display: flex; align-items: flex-start; gap: 18rpx; }
.jr-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; background: #F2EFEA; flex-shrink: 0; }
.jr-userinfo { flex: 1; min-width: 0; }
.jr-name-row { display: flex; align-items: center; gap: 12rpx; }
.jr-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.jr-badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 999rpx; }
.jr-badge-ok { background: #ECFDF3; color: #16A34A; }
.jr-badge-no { background: #FEF2F2; color: #DC2626; }
.jr-time { display: flex; align-items: center; gap: 6rpx; margin-top: 8rpx; font-size: 22rpx; color: #999999; }
.jr-expand { padding: 4rpx; }
.jr-reason { margin-top: 18rpx; padding-left: 60rpx; }
.jr-reason-label { font-size: 26rpx; color: #999999; }
.jr-reason-text { font-size: 26rpx; color: #666666; }
.jr-detail { margin-top: 18rpx; padding: 18rpx 0 0 60rpx; border-top: 1rpx solid #F2EFEA; display: flex; flex-direction: column; gap: 10rpx; }
.jr-detail-line { font-size: 22rpx; color: #999999; }
.jr-actions { display: flex; border-top: 1rpx solid #F2EFEA; }
.jr-act { flex: 1; padding: 22rpx 0; display: flex; align-items: center; justify-content: center; gap: 8rpx; font-size: 28rpx; color: #666666; }
.jr-act-ok { color: var(--brand); font-weight: 500; }
.jr-act-disabled { opacity: 0.5; }
.jr-act-divider { width: 1rpx; background: #F2EFEA; }
.jr-empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.jr-empty-icon { width: 120rpx; height: 120rpx; border-radius: 999rpx; background: #F2EFEA; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.jr-empty-text { font-size: 28rpx; color: #999999; }
.jr-retry { margin-top: 24rpx; padding: 14rpx 48rpx; background: var(--brand); color: #fff; font-size: 26rpx; border-radius: 999rpx; }
.jr-skel { background: #fff; border-radius: 20rpx; padding: 24rpx; }
.jr-skel-row { display: flex; gap: 18rpx; }
.jr-skel-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; background: #F2EFEA; }
.jr-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 14rpx; padding-top: 8rpx; }
.jr-skel-line { height: 26rpx; border-radius: 8rpx; background: #F2EFEA; }
</style>
