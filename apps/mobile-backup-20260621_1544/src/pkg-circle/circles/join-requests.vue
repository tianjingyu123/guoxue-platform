<script setup lang="ts">
/**
 * 入圈申请审核页（从原型 app/circles/[id]/join-requests/page.tsx 481行高保真迁移）
 * 统计栏 + 待审批/已处理双Tab + 批量全选/批量通过 + 卡片(选择/展开/通过/拒绝) + 拒绝原因弹窗 + 骨架屏
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

interface JoinRequest {
  id: string
  user: { id: string; name: string; avatar: string; bio?: string }
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  processedAt?: string
  rejectReason?: string
}

const mockRequests: JoinRequest[] = [
  { id: '1', user: { id: 'u1', name: '张三', avatar: '/static/avatars/u1.png', bio: '命理爱好者，学习八字3年' }, reason: '对八字命理非常感兴趣，希望能加入圈子与各位老师交流学习，提升自己的命理水平。', status: 'pending', createdAt: '2024-01-15T10:30:00Z' },
  { id: '2', user: { id: 'u2', name: '李四', avatar: '/static/avatars/u2.png', bio: '风水师，从业5年' }, reason: '想与圈内同好交流风水心得，分享实战经验。', status: 'pending', createdAt: '2024-01-15T09:20:00Z' },
  { id: '3', user: { id: 'u3', name: '王五', avatar: '/static/avatars/u3.png' }, reason: '朋友推荐的圈子，想来学习。', status: 'pending', createdAt: '2024-01-14T18:45:00Z' },
  { id: '4', user: { id: 'u4', name: '赵六', avatar: '/static/avatars/u4.png', bio: '国学爱好者' }, reason: '希望学习传统文化知识', status: 'approved', createdAt: '2024-01-13T14:00:00Z', processedAt: '2024-01-13T16:30:00Z' },
  { id: '5', user: { id: 'u5', name: '钱七', avatar: '/static/avatars/me.png' }, reason: '...', status: 'rejected', createdAt: '2024-01-12T11:00:00Z', processedAt: '2024-01-12T15:00:00Z', rejectReason: '申请理由过于简单' },
]

const isLoading = ref(true)
const requests = ref<JoinRequest[]>([])
const filter = ref<'pending' | 'processed'>('pending')
const selectedIds = ref<Set<string>>(new Set())
const expandedId = ref<string | null>(null)
const rejectingId = ref<string | null>(null)
const rejectReason = ref('')

onMounted(() => {
  setTimeout(() => {
    requests.value = mockRequests
    isLoading.value = false
  }, 800)
})

const pendingRequests = computed(() => requests.value.filter((r) => r.status === 'pending'))
const processedRequests = computed(() => requests.value.filter((r) => r.status !== 'pending'))
const displayRequests = computed(() => (filter.value === 'pending' ? pendingRequests.value : processedRequests.value))
const allSelected = computed(() => pendingRequests.value.length > 0 && selectedIds.value.size === pendingRequests.value.length)

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

function switchTab(key: 'pending' | 'processed') {
  filter.value = key
  selectedIds.value = new Set()
}
function isSelected(id: string) { return selectedIds.value.has(id) }
function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedIds.value = next
}
function toggleSelectAll() {
  selectedIds.value = allSelected.value ? new Set() : new Set(pendingRequests.value.map((r) => r.id))
}
function toggleExpand(id: string) { expandedId.value = expandedId.value === id ? null : id }

function approve(id: string) {
  requests.value = requests.value.map((r) => (r.id === id ? { ...r, status: 'approved' as const, processedAt: new Date().toISOString() } : r))
  const next = new Set(selectedIds.value); next.delete(id); selectedIds.value = next
}
function openReject(id: string) { rejectingId.value = id; rejectReason.value = '' }
function confirmReject() {
  const id = rejectingId.value
  if (!id) return
  requests.value = requests.value.map((r) => (r.id === id ? { ...r, status: 'rejected' as const, processedAt: new Date().toISOString(), rejectReason: rejectReason.value || undefined } : r))
  const next = new Set(selectedIds.value); next.delete(id); selectedIds.value = next
  rejectingId.value = null; rejectReason.value = ''
}
function batchApprove() {
  const ids = Array.from(selectedIds.value)
  requests.value = requests.value.map((r) => (ids.includes(r.id) ? { ...r, status: 'approved' as const, processedAt: new Date().toISOString() } : r))
  selectedIds.value = new Set()
}
</script>

<template>
  <view class="jr">
    <!-- 顶部导航 -->
    <view class="jr-nav">
      <view class="jr-nav-bar">
        <view
          class="jr-back"
          @tap="goBack"
        >
          <app-icon
            name="chevron-left"
            :size="44"
            color="#2C2C2C"
          />
        </view>
        <text class="jr-title">
          入圈申请
        </text>
        <view class="jr-nav-ph" />
      </view>
      <!-- 统计 -->
      <view class="jr-stats">
        <view class="jr-stat">
          <view class="jr-stat-icon">
            <app-icon
              name="users"
              :size="28"
              color="#C41E3A"
            />
          </view>
          <view>
            <text class="jr-stat-num jr-red">
              {{ pendingRequests.length }}
            </text>
            <text class="jr-stat-label">
              待审批
            </text>
          </view>
        </view>
        <view class="jr-divider" />
        <view>
          <text class="jr-stat-num">
            {{ processedRequests.length }}
          </text>
          <text class="jr-stat-label">
            已处理
          </text>
        </view>
      </view>
      <!-- Tab -->
      <view class="jr-tabs">
        <view
          v-for="t in [{ key: 'pending', label: '待审批' }, { key: 'processed', label: '已处理' }]"
          :key="t.key"
          class="jr-tab"
          :class="{ 'jr-tab-on': filter === t.key }"
          @tap="switchTab(t.key as any)"
        >
          <text>{{ t.label }}</text>
          <view
            v-if="filter === t.key"
            class="jr-tab-line"
          />
        </view>
      </view>
    </view>

    <!-- 批量操作栏 -->
    <view
      v-if="filter === 'pending' && pendingRequests.length > 0"
      class="jr-batch"
    >
      <view
        class="jr-selall"
        @tap="toggleSelectAll"
      >
        <view
          class="jr-cb jr-cb-sm"
          :class="{ 'jr-cb-on': allSelected }"
        >
          <app-icon
            v-if="allSelected"
            name="check"
            :size="18"
            color="#ffffff"
          />
        </view>
        <text>全选</text>
      </view>
      <view
        v-if="selectedIds.size > 0"
        class="jr-batch-btn"
        @tap="batchApprove"
      >
        批量通过 ({{ selectedIds.size }})
      </view>
    </view>

    <!-- 骨架屏 -->
    <view
      v-if="isLoading"
      class="jr-list"
    >
      <view
        v-for="i in 3"
        :key="i"
        class="jr-skel"
      >
        <view class="jr-skel-row">
          <view class="jr-skel-avatar" />
          <view class="jr-skel-lines">
            <view
              class="jr-skel-line"
              style="width: 160rpx;"
            />
            <view
              class="jr-skel-line"
              style="width: 220rpx;"
            />
          </view>
        </view>
        <view
          class="jr-skel-line"
          style="width: 100%; margin-top: 24rpx;"
        />
        <view
          class="jr-skel-line"
          style="width: 66%; margin-top: 14rpx;"
        />
      </view>
    </view>

    <!-- 空态 -->
    <view
      v-else-if="displayRequests.length === 0"
      class="jr-empty"
    >
      <view class="jr-empty-icon">
        <app-icon
          name="users"
          :size="56"
          color="#CCCCCC"
        />
      </view>
      <text class="jr-empty-text">
        {{ filter === 'pending' ? '暂无待审批申请' : '暂无已处理申请' }}
      </text>
    </view>

    <!-- 列表 -->
    <view
      v-else
      class="jr-list"
    >
      <view
        v-for="req in displayRequests"
        :key="req.id"
        class="jr-card"
        :class="{ 'jr-card-done': req.status !== 'pending', 'jr-card-sel': isSelected(req.id) }"
      >
        <view class="jr-card-body">
          <view class="jr-card-head">
            <view
              v-if="req.status === 'pending'"
              class="jr-cb"
              :class="{ 'jr-cb-on': isSelected(req.id) }"
              @tap="toggleSelect(req.id)"
            >
              <app-icon
                v-if="isSelected(req.id)"
                name="check"
                :size="20"
                color="#ffffff"
              />
            </view>
            <image
              class="jr-avatar"
              :src="req.user.avatar"
              mode="aspectFill"
            />
            <view class="jr-userinfo">
              <view class="jr-name-row">
                <text class="jr-name">
                  {{ req.user.name }}
                </text>
                <text
                  v-if="req.status === 'approved'"
                  class="jr-badge jr-badge-ok"
                >
                  已通过
                </text>
                <text
                  v-else-if="req.status === 'rejected'"
                  class="jr-badge jr-badge-no"
                >
                  已拒绝
                </text>
              </view>
              <text
                v-if="req.user.bio"
                class="jr-bio"
              >
                {{ req.user.bio }}
              </text>
              <view class="jr-time">
                <app-icon
                  name="clock"
                  :size="22"
                  color="#999999"
                /><text>{{ formatTime(req.createdAt) }}</text>
              </view>
            </view>
            <view
              class="jr-expand"
              @tap="toggleExpand(req.id)"
            >
              <app-icon
                :name="expandedId === req.id ? 'chevron-up' : 'chevron-down'"
                :size="36"
                color="#999999"
              />
            </view>
          </view>
          <view class="jr-reason">
            <text class="jr-reason-label">
              申请理由：
            </text><text class="jr-reason-text">
              {{ req.reason }}
            </text>
          </view>
          <view
            v-if="expandedId === req.id"
            class="jr-detail"
          >
            <text class="jr-detail-line">
              申请时间：{{ fullTime(req.createdAt) }}
            </text>
            <text
              v-if="req.processedAt"
              class="jr-detail-line"
            >
              处理时间：{{ fullTime(req.processedAt) }}
            </text>
            <text
              v-if="req.rejectReason"
              class="jr-detail-rej"
            >
              拒绝原因：{{ req.rejectReason }}
            </text>
          </view>
        </view>
        <view
          v-if="req.status === 'pending'"
          class="jr-actions"
        >
          <view
            class="jr-act"
            @tap="openReject(req.id)"
          >
            <app-icon
              name="x-circle"
              :size="28"
              color="#666666"
            /><text>拒绝</text>
          </view>
          <view class="jr-act-divider" />
          <view
            class="jr-act jr-act-ok"
            @tap="approve(req.id)"
          >
            <app-icon
              name="check-circle"
              :size="28"
              color="#C41E3A"
            /><text>通过</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 拒绝原因弹窗 -->
    <view
      v-if="rejectingId"
      class="jr-modal-mask"
      @tap="rejectingId = null"
    >
      <view
        class="jr-modal"
        @tap.stop
      >
        <text class="jr-modal-title">
          拒绝申请
        </text>
        <textarea
          v-model="rejectReason"
          class="jr-modal-input"
          placeholder="请输入拒绝原因（选填）"
        />
        <view class="jr-modal-btns">
          <view
            class="jr-modal-cancel"
            @tap="rejectingId = null"
          >
            取消
          </view>
          <view
            class="jr-modal-ok"
            @tap="confirmReject"
          >
            确认拒绝
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
.jr-red { color: #C41E3A; }
.jr-stat-label { display: block; font-size: 22rpx; color: #999999; }
.jr-divider { width: 1rpx; height: 52rpx; background: #E8E3DB; }
.jr-tabs { display: flex; border-bottom: 1rpx solid #F2EFEA; }
.jr-tab { flex: 1; padding: 22rpx 0; text-align: center; font-size: 28rpx; font-weight: 500; color: #999999; position: relative; }
.jr-tab-on { color: #C41E3A; }
.jr-tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 48rpx; height: 4rpx; background: #C41E3A; border-radius: 999rpx; }
.jr-batch { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; }
.jr-selall { display: flex; align-items: center; gap: 14rpx; font-size: 28rpx; color: #666666; }
.jr-cb { width: 36rpx; height: 36rpx; border-radius: 8rpx; border: 3rpx solid #D9D9D9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.jr-cb-sm { width: 30rpx; height: 30rpx; }
.jr-cb-on { background: #C41E3A; border-color: #C41E3A; }
.jr-batch-btn { padding: 10rpx 28rpx; background: #C41E3A; color: #fff; font-size: 26rpx; border-radius: 999rpx; }
.jr-list { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.jr-card { background: #fff; border-radius: 20rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.jr-card-done { opacity: 0.7; box-shadow: none; }
.jr-card-sel { border: 3rpx solid #C41E3A; }
.jr-card-body { padding: 24rpx; }
.jr-card-head { display: flex; align-items: flex-start; gap: 18rpx; }
.jr-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; background: #F2EFEA; flex-shrink: 0; }
.jr-userinfo { flex: 1; min-width: 0; }
.jr-name-row { display: flex; align-items: center; gap: 12rpx; }
.jr-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.jr-badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 999rpx; }
.jr-badge-ok { background: #ECFDF3; color: #16A34A; }
.jr-badge-no { background: #FEF2F2; color: #DC2626; }
.jr-bio { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jr-time { display: flex; align-items: center; gap: 6rpx; margin-top: 8rpx; font-size: 22rpx; color: #999999; }
.jr-expand { padding: 4rpx; }
.jr-reason { margin-top: 18rpx; padding-left: 60rpx; }
.jr-reason-label { font-size: 26rpx; color: #999999; }
.jr-reason-text { font-size: 26rpx; color: #666666; }
.jr-detail { margin-top: 18rpx; padding: 18rpx 0 0 60rpx; border-top: 1rpx solid #F2EFEA; display: flex; flex-direction: column; gap: 10rpx; }
.jr-detail-line { font-size: 22rpx; color: #999999; }
.jr-detail-rej { font-size: 22rpx; color: #EF4444; }
.jr-actions { display: flex; border-top: 1rpx solid #F2EFEA; }
.jr-act { flex: 1; padding: 22rpx 0; display: flex; align-items: center; justify-content: center; gap: 8rpx; font-size: 28rpx; color: #666666; }
.jr-act-ok { color: #C41E3A; font-weight: 500; }
.jr-act-divider { width: 1rpx; background: #F2EFEA; }
.jr-empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.jr-empty-icon { width: 120rpx; height: 120rpx; border-radius: 999rpx; background: #F2EFEA; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.jr-empty-text { font-size: 28rpx; color: #999999; }
.jr-skel { background: #fff; border-radius: 20rpx; padding: 24rpx; }
.jr-skel-row { display: flex; gap: 18rpx; }
.jr-skel-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; background: #F2EFEA; }
.jr-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 14rpx; padding-top: 8rpx; }
.jr-skel-line { height: 26rpx; border-radius: 8rpx; background: #F2EFEA; }
.jr-modal-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.jr-modal { background: #fff; border-radius: 28rpx; width: 600rpx; padding: 36rpx; }
.jr-modal-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.jr-modal-input { width: 100%; height: 180rpx; margin-top: 28rpx; padding: 20rpx; border: 1rpx solid #E8E3DB; border-radius: 14rpx; font-size: 26rpx; box-sizing: border-box; }
.jr-modal-btns { display: flex; gap: 20rpx; margin-top: 28rpx; }
.jr-modal-cancel { flex: 1; padding: 20rpx 0; text-align: center; border: 1rpx solid #E8E3DB; border-radius: 14rpx; color: #666666; font-size: 28rpx; }
.jr-modal-ok { flex: 1; padding: 20rpx 0; text-align: center; background: #C41E3A; color: #fff; border-radius: 14rpx; font-size: 28rpx; }
</style>
