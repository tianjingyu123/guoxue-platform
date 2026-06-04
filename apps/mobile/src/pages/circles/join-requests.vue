<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view
        v-for="req in requests"
        :key="req.id"
        class="request-item"
      >
        <view class="user-info">
          <image
            :src="req.user?.avatar || ''"
            class="avatar"
            mode="aspectFill"
          />
          <view class="info">
            <text class="name">
              {{ req.user?.nickname || '用户' }}
            </text>
            <text class="reason">
              {{ req.reason || req.message }}
            </text>
          </view>
        </view>
        <view class="actions">
          <button
            class="btn-approve"
            @click="handleApprove(req)"
          >
            通过
          </button>
          <button
            class="btn-reject"
            @click="handleReject(req)"
          >
            拒绝
          </button>
        </view>
      </view>
      <EmptyState
        v-if="!requests.length"
        text="暂无待审批申请"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { circleApi } from '../../api'

const loading = ref(true)
const requests = ref<any[]>([])
const circleId = ref('')

onMounted(async () => {
  circleId.value = (getCurrentPages().pop()?.options || {}).circleId || ''
  if (!circleId.value) { loading.value = false; return }
  try {
    const res: any = await circleApi.listMembers(circleId.value, 1, 50)
    const list = Array.isArray(res) ? res : res?.data || res?.list || []
    requests.value = list.filter((m: any) => m.status === 'PENDING')
  } catch {} finally { loading.value = false }
})

async function handleApprove(req: any) {
  try {
    await circleApi.updateMemberRole(circleId.value, req.user?.id || req.userId, { role: 'MEMBER' })
    requests.value = requests.value.filter(r => r.id !== req.id)
    uni.showToast({ title: '已通过', icon: 'success' })
  } catch {}
}
function handleReject(req: any) {
  requests.value = requests.value.filter(r => r.id !== req.id)
  uni.showToast({ title: '已拒绝', icon: 'none' })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.request-item { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 10px; }
.user-info { display: flex; gap: 12px; }
.avatar { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; background: #eee; }
.info { flex: 1; }
.name { font-size: 15px; font-weight: 500; display: block; }
.reason { font-size: 13px; color: #666; margin-top: 4px; display: block; }
.actions { display: flex; gap: 12px; margin-top: 12px; justify-content: flex-end; }
.btn-approve { width: 80px; height: 32px; background: #C41E3A; color: #fff; border-radius: 16px; font-size: 13px; border: none; line-height: 32px; text-align: center; }
.btn-reject { width: 80px; height: 32px; background: #eee; color: #666; border-radius: 16px; font-size: 13px; border: none; line-height: 32px; text-align: center; }
</style>
