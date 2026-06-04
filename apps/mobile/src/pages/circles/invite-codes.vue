<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="create-area">
        <input
          v-model="maxUses"
          type="number"
          placeholder="最大使用次数（留空不限）"
          class="input"
        >
        <button
          class="btn-create"
          @click="generateCode"
        >
          生成邀请码
        </button>
      </view>
      <view
        v-for="code in codes"
        :key="code.id"
        class="code-item"
      >
        <view class="code-info">
          <text class="code-text">
            {{ code.code }}
          </text>
          <text class="code-meta">
            已用 {{ code.usedCount || 0 }}/{{ code.maxUses || '∞' }} 次
          </text>
        </view>
        <button
          class="btn-copy"
          @click="copyCode(code.code)"
        >
          复制
        </button>
      </view>
      <EmptyState
        v-if="!codes.length"
        text="暂无邀请码"
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
const codes = ref<any[]>([])
const maxUses = ref('')
const circleId = ref('')

onMounted(async () => {
  circleId.value = (getCurrentPages().pop()?.options || {}).circleId || ''
  if (!circleId.value) { loading.value = false; return }
  try {
    const res: any = await circleApi.listMyInviteCodes(circleId.value)
    codes.value = Array.isArray(res) ? res : res?.data || []
  } catch {} finally { loading.value = false }
})

async function generateCode() {
  try {
    const max = maxUses.value ? parseInt(maxUses.value) : undefined
    const res: any = await circleApi.generateInviteCode(circleId.value, max)
    codes.value.unshift(res || { code: '已生成', id: Date.now().toString() })
    uni.showToast({ title: '已生成', icon: 'success' })
  } catch {}
}
function copyCode(code: string) {
  uni.setClipboardData({ data: code, success: () => uni.showToast({ title: '已复制' }) })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.create-area { display: flex; gap: 8px; margin-bottom: 16px; }
.input { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; font-size: 14px; background: #fff; }
.btn-create { width: 100px; height: 40px; background: #C41E3A; color: #fff; border-radius: 20px; font-size: 13px; border: none; line-height: 40px; text-align: center; }
.code-item { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 14px 16px; border-radius: 10px; margin-bottom: 8px; }
.code-text { font-size: 16px; font-family: monospace; font-weight: bold; }
.code-meta { font-size: 11px; color: #999; display: block; }
.btn-copy { width: 60px; height: 30px; background: #F5F0E8; color: #C41E3A; border-radius: 15px; font-size: 12px; border: none; line-height: 30px; text-align: center; }
</style>
