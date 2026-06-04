<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav">
      <text
        class="nav-back"
        @click="goBack"
      >
        ←
      </text>
      <text class="nav-title">
        好友请求
      </text>
      <view class="nav-placeholder" />
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!data || (pendingList.length === 0 && processedList.length === 0)"
      empty-icon="👥"
      empty-title="暂无好友请求"
      skeleton-type="list"
      @retry="loadData"
    >
      <view class="content">
        <!-- 待处理请求 -->
        <view
          v-if="data && pendingList.length > 0"
          class="section"
        >
          <view class="section-header">
            <text class="section-label">
              待处理 ({{ pendingList.length }})
            </text>
            <text
              v-if="!approveAllLoading"
              class="section-action"
              @click="approveAll"
            >
              全部同意
            </text>
            <text
              v-else
              class="section-action disabled"
            >
              处理中...
            </text>
          </view>
          <view class="request-list">
            <view
              v-for="r in pendingList"
              :key="r.id"
              class="request-item"
            >
              <view
                class="request-avatar-wrap"
                @click="goUser(r.fromUser?.id)"
              >
                <image
                  :src="r.fromUser?.avatar || ''"
                  class="request-avatar"
                  mode="aspectFill"
                />
              </view>
              <view class="request-info">
                <text class="request-name">
                  {{ r.fromUser?.nickname || '未知用户' }}
                </text>
                <text
                  v-if="r.fromUser?.signature"
                  class="request-bio"
                >
                  {{ r.fromUser.signature }}
                </text>
                <text
                  v-if="r.message"
                  class="request-message"
                >
                  {{ r.message }}
                </text>
                <text class="request-time">
                  {{ r.createdAt || '' }}
                </text>
              </view>
              <view class="request-actions">
                <view
                  class="action-btn-sm action-reject"
                  :class="{ disabled: processingIds.has(r.id) }"
                  @click="openRejectDialog(r)"
                >
                  ✕
                </view>
                <view
                  class="action-btn-sm action-accept"
                  :class="{ disabled: processingIds.has(r.id) }"
                  @click="handleApprove(r)"
                >
                  {{ processingIds.has(r.id) ? '...' : '✓' }}
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 已处理请求 -->
        <view
          v-if="data && processedList.length > 0"
          class="section"
        >
          <view
            class="section-header"
            @click="showProcessed = !showProcessed"
          >
            <text class="section-label">
              已处理 ({{ processedList.length }})
            </text>
            <text class="section-toggle">
              {{ showProcessed ? '▲' : '▼' }}
            </text>
          </view>
          <view
            v-if="showProcessed"
            class="request-list"
          >
            <view
              v-for="r in processedList"
              :key="r.id"
              class="request-item processed"
            >
              <view class="request-avatar-wrap">
                <image
                  :src="r.fromUser?.avatar || ''"
                  class="request-avatar"
                  mode="aspectFill"
                />
              </view>
              <view class="request-info">
                <view class="request-name-row">
                  <text class="request-name">
                    {{ r.fromUser?.nickname || '未知用户' }}
                  </text>
                  <text
                    class="request-status"
                    :class="r.status"
                  >
                    {{ r.status === 'approved' ? '✅ 已同意' : r.status === 'rejected' ? '❌ 已拒绝' : '⏳ 已过期' }}
                  </text>
                </view>
                <text
                  v-if="r.message"
                  class="request-message"
                >
                  {{ r.message }}
                </text>
                <text class="request-time">
                  {{ r.processedAt || r.createdAt || '' }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 空态 - 待处理为空但有已处理 -->
        <view
          v-if="data && pendingList.length === 0 && processedList.length > 0"
          class="empty-section"
        >
          <text class="empty-section-text">
            暂无待处理的好友请求
          </text>
        </view>
      </view>
    </DataState>

    <!-- 拒绝确认弹窗 -->
    <view
      v-if="rejectDialog.open"
      class="dialog-mask"
      @click="closeRejectDialog"
    >
      <view
        class="dialog-box"
        @click.stop
      >
        <text class="dialog-title">
          拒绝好友请求
        </text>
        <text class="dialog-desc">
          确定要拒绝 {{ rejectDialog.userName }} 的好友请求吗？
        </text>
        <view class="dialog-textarea-wrap">
          <textarea
            v-model="rejectReason"
            class="dialog-textarea"
            placeholder="可选：填写拒绝理由"
            maxlength="100"
          />
        </view>
        <view class="dialog-btns">
          <text
            class="dialog-btn dialog-btn-cancel"
            @click="closeRejectDialog"
          >
            取消
          </text>
          <text
            class="dialog-btn dialog-btn-danger"
            @click="handleReject"
          >
            拒绝
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { imApi } from '../../api'

interface FriendRequestUser {
  id: string
  nickname: string
  avatar?: string
  signature?: string
}

interface FriendRequestItem {
  id: string
  fromUser: FriendRequestUser
  message?: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  createdAt?: string
  processedAt?: string
}

interface FriendRequestsData {
  pending: FriendRequestItem[]
  processed: FriendRequestItem[]
  totalPending: number
}

const data = ref<FriendRequestsData | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const showProcessed = ref(false)
const processingIds = ref<Set<string>>(new Set())
const approveAllLoading = ref(false)

const rejectDialog = ref<{ open: boolean; requestId: string | null; userName: string }>({
  open: false, requestId: null, userName: ''
})
const rejectReason = ref('')

const pendingList = computed(() => data.value?.pending || [])
const processedList = computed(() => data.value?.processed || [])

function goBack() {
  uni.navigateBack()
}

function goUser(userId?: string) {
  if (userId) uni.navigateTo({ url: `/pages/user/user?userId=${userId}` })
}

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    const [pendingRes, processedRes] = await Promise.all([
      imApi.listPendingFriendRequests(),
      imApi.listProcessedFriendRequests().catch(() => []),
    ])
    const pending = Array.isArray(pendingRes) ? pendingRes : []
    const processed = Array.isArray(processedRes) ? processedRes : []
    data.value = {
      pending: pending.map((r: any) => ({
        id: String(r.id || r.toUserId || ''),
        fromUser: {
          id: String(r.fromUser?.id || r.toUserId || ''),
          nickname: r.fromUser?.nickname || r.nickname || '未知',
          avatar: r.fromUser?.avatar || r.avatar || '',
          signature: r.fromUser?.signature || r.signature || '',
        },
        message: r.message || '',
        status: r.status || 'pending',
        createdAt: r.createdAt || r.created_at || '',
      })),
      processed: processed.map((r: any) => ({
        id: String(r.id || ''),
        fromUser: {
          id: String(r.fromUser?.id || r.userId || ''),
          nickname: r.fromUser?.nickname || r.nickname || '未知',
          avatar: r.fromUser?.avatar || r.avatar || '',
        },
        message: r.message || '',
        status: r.status || 'approved',
        createdAt: r.createdAt || '',
        processedAt: r.processedAt || '',
      })),
      totalPending: pending.length,
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

async function handleApprove(request: FriendRequestItem) {
  processingIds.value = new Set(processingIds.value).add(request.id)
  try {
    await imApi.approveFriendRequest(request.fromUser.id)
    uni.showToast({ title: `已添加 ${request.fromUser.nickname} 为好友`, icon: 'none' })
    if (data.value) {
      data.value.pending = data.value.pending.filter(r => r.id !== request.id)
      data.value.processed = [{ ...request, status: 'approved', processedAt: new Date().toISOString() }, ...data.value.processed]
      data.value.totalPending = Math.max(0, data.value.totalPending - 1)
    }
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    const next = new Set(processingIds.value)
    next.delete(request.id)
    processingIds.value = next
  }
}

function openRejectDialog(request: FriendRequestItem) {
  rejectDialog.value = { open: true, requestId: request.id, userName: request.fromUser.nickname }
  rejectReason.value = ''
}

function closeRejectDialog() {
  rejectDialog.value = { open: false, requestId: null, userName: '' }
  rejectReason.value = ''
}

async function handleReject() {
  if (!rejectDialog.value.requestId) return
  const reqId = rejectDialog.value.requestId
  processingIds.value = new Set(processingIds.value).add(reqId)
  const userName = rejectDialog.value.userName
  closeRejectDialog()

  try {
    const req = data.value?.pending.find(r => r.id === reqId)
    await imApi.rejectFriendRequest(req?.fromUser?.id || reqId)
    uni.showToast({ title: '已拒绝请求', icon: 'none' })
    if (data.value && req) {
      data.value.pending = data.value.pending.filter(r => r.id !== reqId)
      data.value.processed = [{
        ...req,
        status: 'rejected',
        processedAt: new Date().toISOString(),
      }, ...data.value.processed]
      data.value.totalPending = Math.max(0, data.value.totalPending - 1)
    }
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    const next = new Set(processingIds.value)
    next.delete(reqId)
    processingIds.value = next
  }
}

async function approveAll() {
  if (!data.value || data.value.pending.length === 0) return
  approveAllLoading.value = true
  try {
    const ids = data.value.pending.map(r => r.fromUser.id)
    await Promise.all(ids.map(id => imApi.approveFriendRequest(id).catch(() => {})))
    const now = new Date().toISOString()
    if (data.value) {
      data.value.processed = [
        ...data.value.pending.map(r => ({ ...r, status: 'approved' as const, processedAt: now })),
        ...data.value.processed,
      ]
      data.value.pending = []
      data.value.totalPending = 0
    }
    uni.showToast({ title: `已添加 ${ids.length} 位好友`, icon: 'none' })
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    approveAllLoading.value = false
  }
}

// 弹窗
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

/* 导航 */
.nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #fff; border-bottom: 1px solid #E5E1DB;
}
.nav-back { font-size: 22px; color: #2C2C2C; padding: 4px; }
.nav-title { font-size: 16px; font-weight: 500; color: #2C2C2C; }
.nav-placeholder { width: 30px; }

.content { padding-bottom: 12px; }
.section { margin-bottom: 8px; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; background: rgba(0,0,0,0.02);
}
.section-label { font-size: 13px; color: #999; }
.section-action { font-size: 13px; color: #C41E3A; padding: 2px 8px; }
.section-action.disabled { color: #999; }
.section-toggle { font-size: 12px; color: #999; padding: 4px; }

.request-list { background: #fff; }
.request-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 16px; border-bottom: 1px solid #f5f0e8;
}
.request-item.processed { opacity: 0.7; }

.request-avatar-wrap { flex-shrink: 0; }
.request-avatar { width: 44px; height: 44px; border-radius: 50%; }

.request-info { flex: 1; min-width: 0; }
.request-name { font-size: 14px; font-weight: 500; color: #2C2C2C; display: block; }
.request-name-row { display: flex; align-items: center; gap: 8px; }
.request-bio { font-size: 12px; color: #999; margin-top: 2px; display: block; }
.request-message { font-size: 13px; color: #2C2C2C; margin-top: 4px; display: block; }
.request-time { font-size: 11px; color: #999; margin-top: 2px; display: block; }
.request-status { font-size: 12px; }
.request-status.approved { color: #22c55e; }
.request-status.rejected { color: #ef4444; }

.request-actions { display: flex; gap: 8px; flex-shrink: 0; padding-top: 4px; }
.action-btn-sm {
  width: 32px; height: 32px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-size: 14px;
}
.action-btn-sm.disabled { opacity: 0.5; }
.action-accept { background: #C41E3A; color: #fff; }
.action-reject { background: #F5F0E8; color: #666; }

.empty-section { padding: 40px 16px; text-align: center; }
.empty-section-text { font-size: 14px; color: #999; }

/* 弹窗 */
.dialog-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 200; display: flex; align-items: center; justify-content: center;
}
.dialog-box { background: #fff; border-radius: 12px; width: 300px; padding: 24px; }
.dialog-title { font-size: 17px; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 10px; text-align: center; }
.dialog-desc { font-size: 14px; color: #666; line-height: 1.5; display: block; margin-bottom: 12px; text-align: center; }
.dialog-textarea-wrap { margin-bottom: 16px; }
.dialog-textarea {
  width: 100%; box-sizing: border-box; border: 1px solid #E5E1DB;
  border-radius: 8px; padding: 8px 10px; font-size: 13px; height: 60px;
  background: #FAF8F5;
}
.dialog-btns { display: flex; gap: 12px; }
.dialog-btn { flex: 1; padding: 10px; border-radius: 8px; font-size: 15px; text-align: center; }
.dialog-btn-cancel { background: #F5F0E8; color: #666; }
.dialog-btn-danger { background: #C41E3A; color: #fff; }
</style>
