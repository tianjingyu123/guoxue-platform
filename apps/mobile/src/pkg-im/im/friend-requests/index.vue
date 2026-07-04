<template>
  <view v-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="page">
    <!-- 导航栏 -->
    <view class="nav">
      <view class="nav-btn" @tap="goBack">
        <app-icon name="arrow-left" :size="40" color="#1f2937" />
      </view>
      <text class="nav-title">好友请求</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="skeleton">
      <view class="sk-section-head"><view class="sk-line sk-w20" /></view>
      <view v-for="i in 3" :key="i" class="sk-item">
        <view class="sk-avatar" />
        <view class="sk-info">
          <view class="sk-line sk-w24" />
          <view class="sk-line sk-w32" />
          <view class="sk-line sk-w48" />
        </view>
        <view class="sk-actions">
          <view class="sk-btn" />
          <view class="sk-btn" />
        </view>
      </view>
    </view>

    <!-- 内容 -->
    <view v-else-if="hasAny" class="content">
      <!-- 待处理 -->
      <view v-if="pending.length > 0" class="section">
        <view class="section-head">
          <text class="section-title">待处理 ({{ pending.length }})</text>
          <view class="approve-all" @tap="handleApproveAll">
            <text class="approve-all-text">{{ approveAllLoading ? '处理中...' : '全部同意' }}</text>
          </view>
        </view>
        <view class="req-list">
          <view v-for="req in pending" :key="req.id" class="req-item">
            <image lazy-load class="avatar" :src="req.fromUser.avatar" mode="aspectFill" @tap="goUser(req.fromUser.id)" />
            <view class="req-info">
              <view class="req-name-row">
                <text class="req-name">{{ req.fromUser.nickname }}</text>
              </view>
              <text v-if="req.fromUser.signature" class="req-signature">{{ req.fromUser.signature }}</text>
              <text v-if="req.message" class="req-message">{{ req.message }}</text>
              <text class="req-time">{{ req.createdAt }}</text>
            </view>
            <view class="req-actions">
              <view class="btn btn-reject" @tap="openRejectDialog(req)">
                <app-icon name="x" :size="32" color="#1f2937" />
              </view>
              <view class="btn btn-approve" @tap="handleApprove(req)">
                <text v-if="processingIds.includes(req.id)" class="dots">...</text>
                <app-icon v-else name="check" :size="32" color="#ffffff" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 已处理 -->
      <view v-if="processed.length > 0" class="section">
        <view class="section-head clickable" @tap="showProcessed = !showProcessed">
          <text class="section-title">已处理 ({{ processed.length }})</text>
          <app-icon :name="showProcessed ? 'chevron-up' : 'chevron-down'" :size="32" color="#9ca3af" />
        </view>
        <view v-if="showProcessed" class="req-list">
          <view v-for="req in processed" :key="req.id" class="req-item processed">
            <image lazy-load class="avatar avatar-sm" :src="req.fromUser.avatar" mode="aspectFill" />
            <view class="req-info">
              <view class="req-name-row">
                <text class="req-name-sm">{{ req.fromUser.nickname }}</text>
                <view class="status-tag">
                  <app-icon
                    :name="req.status === 'approved' ? 'check-circle' : req.status === 'rejected' ? 'x-circle' : 'clock'"
                    :size="28"
                    :color="req.status === 'approved' ? '#22c55e' : req.status === 'rejected' ? '#ef4444' : '#9ca3af'"
                  />
                  <text class="status-text">{{ statusText(req.status) }}</text>
                </view>
              </view>
              <text v-if="req.message" class="req-message-sm">{{ req.message }}</text>
              <text class="req-time">{{ req.processedAt || req.createdAt }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 仅待处理为空 -->
      <view v-if="pending.length === 0 && processed.length > 0" class="empty-inline">
        <app-icon name="users" :size="96" color="#9ca3af" />
        <text class="empty-text">暂无待处理的好友请求</text>
      </view>
    </view>

    <!-- 全空态 -->
    <view v-else class="empty">
      <app-icon name="user-plus" :size="96" color="#9ca3af" />
      <text class="empty-text">暂无好友请求</text>
    </view>

    <!-- 拒绝确认弹窗 -->
    <view v-if="rejectDialog.open" class="mask center" @tap="closeReject">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">拒绝好友请求</text>
        <text class="dialog-desc">确定要拒绝 {{ rejectDialog.userName }} 的好友请求吗？</text>
        <textarea
          class="dialog-textarea"
          v-model="rejectReason"
          placeholder="可选：填写拒绝理由"
          placeholder-class="dialog-ph"
          :maxlength="-1"
          auto-height
        />
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @tap="closeReject">取消</view>
          <view class="dialog-btn confirm" @tap="handleReject">拒绝</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, goBack as routerBack } from '@/utils/router'
import {
  imApi,
  getRequestStatusText,
  type FriendRequestItem,
  type FriendRequestStatus,
} from '@/lib/im-data'

const loading = ref(true)
const error = ref('')
const pending = ref<FriendRequestItem[]>([])
const processed = ref<FriendRequestItem[]>([])

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await imApi.getFriendRequests()
    pending.value = res.pending
    processed.value = res.processed
  } catch (e) {
    error.value = (e as Error)?.message || '加载好友请求失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const showProcessed = ref(false)
const processingIds = ref<string[]>([])
const approveAllLoading = ref(false)

const rejectDialog = ref<{ open: boolean; requestId: string | null; userName: string }>({
  open: false,
  requestId: null,
  userName: '',
})
const rejectReason = ref('')

const hasAny = computed(() => pending.value.length > 0 || processed.value.length > 0)

function statusText(status: FriendRequestStatus) {
  return getRequestStatusText(status)
}

function goBack() {
  routerBack()
}
function goUser(id: string) {
  navigateTo(`/user/${id}`)
}

function nowStr() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 同意请求
async function handleApprove(req: FriendRequestItem) {
  if (processingIds.value.includes(req.id)) return
  processingIds.value.push(req.id)
  try {
    await imApi.handleFriendRequest(req.id, 'approve')
    pending.value = pending.value.filter((r) => r.id !== req.id)
    processed.value = [{ ...req, status: 'approved', processedAt: nowStr() }, ...processed.value]
    uni.showToast({ title: `已添加 ${req.fromUser.nickname} 为好友`, icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败，请重试', icon: 'none' })
  } finally {
    processingIds.value = processingIds.value.filter((id) => id !== req.id)
  }
}

// 打开拒绝弹窗
function openRejectDialog(req: FriendRequestItem) {
  rejectDialog.value = { open: true, requestId: req.id, userName: req.fromUser.nickname }
  rejectReason.value = ''
}
function closeReject() {
  rejectDialog.value = { ...rejectDialog.value, open: false }
}

// 确认拒绝
async function handleReject() {
  const id = rejectDialog.value.requestId
  if (id == null) return
  const req = pending.value.find((r) => r.id === id)
  rejectDialog.value = { ...rejectDialog.value, open: false }
  if (!req) return
  try {
    await imApi.handleFriendRequest(id, 'reject')
    const reason = rejectReason.value || undefined
    pending.value = pending.value.filter((r) => r.id !== id)
    processed.value = [{ ...req, status: 'rejected', processedAt: nowStr(), rejectReason: reason }, ...processed.value]
    uni.showToast({ title: '已拒绝请求', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败，请重试', icon: 'none' })
  }
}

// 全部同意
async function handleApproveAll() {
  if (pending.value.length === 0 || approveAllLoading.value) return
  approveAllLoading.value = true
  const now = nowStr()
  const succeeded: FriendRequestItem[] = []
  let failed = 0
  try {
    for (const req of [...pending.value]) {
      try {
        await imApi.handleFriendRequest(req.id, 'approve')
        succeeded.push({ ...req, status: 'approved', processedAt: now })
      } catch {
        failed++
      }
    }
    const okIds = new Set(succeeded.map((r) => r.id))
    processed.value = [...succeeded, ...processed.value]
    pending.value = pending.value.filter((r) => !okIds.has(r.id))
    uni.showToast({
      title: failed > 0 ? `已添加${succeeded.length}位，${failed}位失败` : `已添加${succeeded.length}位好友`,
      icon: 'none',
    })
  } finally {
    approveAllLoading.value = false
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #ffffff; }

/* 导航栏 */
.nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; height: 112rpx; padding: 0 32rpx; background: #ffffff; border-bottom: 2rpx solid #e5e7eb; }
.nav-btn { padding: 16rpx; margin-left: -16rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 32rpx; font-weight: 500; color: #111827; }
.nav-placeholder { width: 72rpx; }

/* 内容 */
.content { padding-bottom: 48rpx; }
.section { margin-bottom: 32rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; background: rgba(243,244,246,0.5); }
.section-head.clickable:active { background: rgba(243,244,246,0.8); }
.section-title { font-size: 28rpx; color: #6b7280; }
.approve-all { padding: 8rpx 16rpx; }
.approve-all-text { font-size: 28rpx; color: var(--brand); }

/* 请求项 */
.req-list { background: #ffffff; }
.req-item { display: flex; align-items: flex-start; gap: 24rpx; padding: 32rpx; border-bottom: 2rpx solid #f3f4f6; background: #ffffff; }
.req-item.processed { opacity: 0.7; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 999rpx; background: #f3f4f6; flex-shrink: 0; }
.avatar-sm { width: 80rpx; height: 80rpx; }

.req-info { flex: 1; min-width: 0; }
.req-name-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 8rpx; }
.req-name { font-weight: 500; color: #111827; font-size: 30rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.req-name-sm { font-size: 28rpx; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.req-signature { display: block; font-size: 22rpx; color: #9ca3af; margin-bottom: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.req-message { display: block; font-size: 28rpx; color: rgba(31,41,55,0.8); margin-bottom: 16rpx; line-height: 1.5; }
.req-message-sm { display: block; font-size: 22rpx; color: #9ca3af; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.req-time { display: block; font-size: 22rpx; color: #9ca3af; }

.status-tag { display: flex; align-items: center; gap: 6rpx; }
.status-text { font-size: 22rpx; color: #9ca3af; }

/* 操作按钮 */
.req-actions { display: flex; align-items: center; gap: 16rpx; flex-shrink: 0; }
.btn { height: 64rpx; min-width: 64rpx; padding: 0 24rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.btn-reject { background: #ffffff; border: 2rpx solid #e5e7eb; }
.btn-approve { background: var(--brand); }
.dots { color: #ffffff; font-size: 32rpx; }

/* 空态 */
.empty, .empty-inline { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 96rpx 32rpx; gap: 24rpx; }
.empty-text { font-size: 28rpx; color: #6b7280; text-align: center; }

/* 骨架 */
.skeleton { }
.sk-section-head { padding: 24rpx 32rpx; background: rgba(243,244,246,0.5); }
.sk-item { display: flex; align-items: flex-start; gap: 24rpx; padding: 32rpx; border-bottom: 2rpx solid #f3f4f6; }
.sk-avatar { width: 96rpx; height: 96rpx; border-radius: 999rpx; background: #f0ebe5; flex-shrink: 0; }
.sk-info { flex: 1; }
.sk-line { height: 28rpx; background: #f0ebe5; border-radius: 8rpx; margin-bottom: 16rpx; }
.sk-w20 { width: 20%; }
.sk-w24 { width: 24%; }
.sk-w32 { width: 32%; }
.sk-w48 { width: 48%; }
.sk-actions { display: flex; gap: 16rpx; }
.sk-btn { width: 64rpx; height: 64rpx; border-radius: 12rpx; background: #f0ebe5; }

/* 遮罩与弹窗 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; }
.mask.center { align-items: center; justify-content: center; }
.dialog { width: 90%; max-width: 640rpx; background: #ffffff; border-radius: 24rpx; padding: 48rpx; }
.dialog-title { display: block; font-size: 34rpx; font-weight: 600; color: #111827; margin-bottom: 16rpx; }
.dialog-desc { display: block; font-size: 28rpx; color: #6b7280; line-height: 1.6; margin-bottom: 24rpx; }
.dialog-textarea { width: 100%; min-height: 96rpx; box-sizing: border-box; padding: 20rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; font-size: 28rpx; color: #111827; margin-bottom: 32rpx; }
.dialog-ph { color: #9ca3af; }
.dialog-actions { display: flex; gap: 24rpx; }
.dialog-btn { flex: 1; height: 80rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; }
.dialog-btn.cancel { background: #f3f4f6; color: #374151; }
.dialog-btn.confirm { background: #dc2626; color: #ffffff; }

/* 加载/错误状态 */
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
