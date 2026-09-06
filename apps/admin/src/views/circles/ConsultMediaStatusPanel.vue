<template>
  <section
    ref="panel"
    class="media-status"
    aria-label="咨询媒体与资源核查"
  >
    <h3>咨询媒体与资源核查</h3>
    <p>输入通话记录 ID，或点击申诉记录中的“媒体状态”。此处只查询，不停止通话、不退款、不释放额度。</p>
    <div class="lookup">
      <el-input
        v-model="callId"
        aria-label="通话记录ID"
        placeholder="通话记录 ID（UUID）"
        clearable
        @input="invalidate"
        @keyup.enter="inspect()"
      />
      <el-button
        :loading="loading"
        type="primary"
        @click="inspect()"
      >
        查询状态
      </el-button>
    </div>
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
    />
    <template v-if="result">
      <el-alert
        :title="result.notice"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-descriptions
        :column="1"
        border
      >
        <el-descriptions-item label="通话记录">
          {{ result.callId }}
        </el-descriptions-item>
        <el-descriptions-item label="查询时间">
          {{ formatTime(result.checkedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="订单状态">
          {{ label(result.orderStatus) }}
        </el-descriptions-item>
        <el-descriptions-item label="凭据记录">
          {{ label(result.boundaryStatus) }}；版本 {{ result.credentialRevision ?? '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="票据到期时间">
          {{ formatTime(result.credentialExpiresAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="停流待办记录">
          {{ label(result.stopState) }}；申请时间 {{ formatTime(result.stopRequestedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="回调观察">
          {{ label(result.mediaObservation) }}；证据版本 {{ result.evidenceRevision ?? '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="最近媒体事件">
          {{ formatTime(result.lastEventAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="资源账本状态">
          {{ label(result.quotaState) }}
        </el-descriptions-item>
      </el-descriptions>
      <div aria-label="资源收尾待核验项">
        <h4>尚需核验</h4>
        <ul v-if="result.closureChecks?.length">
          <li
            v-for="check in result.closureChecks"
            :key="check.code"
          >
            {{ check.message }}
          </li>
        </ul>
        <p v-else>
          当前接口未提供逐项证据，请技术人员核查；不能据此认定资源已释放。
        </p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { callDisputeApi, type ConsultMediaStatus } from '@/api'
import { useAuthStore } from '@/store/auth'

const callId = ref(''), loading = ref(false), error = ref(''), result = ref<ConsultMediaStatus | null>(null)
const panel = ref<HTMLElement | null>(null)
let epoch = 0
const auth = useAuthStore()
const labels: Record<string, string> = {
  WAITING: '等待接听', ONGOING: '通话进行中', ENDED: '订单已结束', MISSED: '未接通', REFUNDED: '订单已退款',
  UNTRACKED: '无可信记录，需人工核查', TRACKED: '已有记录', INVALID: '记录异常，需技术核查', UNKNOWN: '未知，不能判定完成',
  NOT_REQUESTED: '尚无停流待办', READY: '待派发', DISPATCHING: '派发中', ACKNOWLEDGED: '请求已受理，不代表已停流',
  ACTIVITY_OBSERVED: '收到媒体活动', OFFLINE_OBSERVED: '观察到退房，不代表可释放',
  HELD: '已预留', ACTIVE: '仍占用', COMPLETED: '账本记为已完成', RELEASED: '账本记为已释放', EXPIRED: '预留已过期',
}
const label = (value: string) => labels[value] ?? '未知状态，请技术核查'
const formatTime = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : '暂无可信时间'
function invalidate() { epoch++; result.value = null; error.value = ''; loading.value = false }
watch(() => [auth.token, auth.user?.id, [...auth.roles].sort().join(',')], () => {
  invalidate(); callId.value = ''
}, { flush: 'sync' })
async function inspect(id?: string) {
  if (id !== undefined) callId.value = id
  if (id !== undefined) panel.value?.scrollIntoView({ block: 'start', behavior: 'auto' })
  invalidate()
  if (!auth.token || !auth.user?.id || !auth.roles.some(role => ['SUPER_ADMIN', 'OPERATION_ADMIN'].includes(role))) {
    error.value = '当前账号没有媒体核查权限，请使用已授权的管理员账号。'; return
  }
  const requestedId = callId.value.trim()
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestedId)) {
    error.value = '请输入完整、有效的通话记录 ID。'; return
  }
  const requestEpoch = epoch
  loading.value = true
  try {
    const { data } = await callDisputeApi.mediaStatus(requestedId)
    if (epoch !== requestEpoch) return
    if (!data || data.callId.toLowerCase() !== requestedId.toLowerCase() || data.canRelease !== false) throw new Error('INVALID_RESPONSE')
    if (data.closureChecks !== undefined && (!Array.isArray(data.closureChecks) || data.closureChecks.length > 10
      || data.closureChecks.some(check => !check || typeof check.code !== 'string' || typeof check.message !== 'string'
        || !check.code || !check.message || check.code.length > 80 || check.message.length > 500))) throw new Error('INVALID_CHECKS')
    result.value = data
  } catch {
    if (epoch === requestEpoch) error.value = '查询未完成。请核对记录 ID 和账号权限，恢复连接后点击“查询状态”重试。'
  } finally { if (epoch === requestEpoch) loading.value = false }
}
onBeforeUnmount(invalidate)
defineExpose({ inspect })
</script>

<style scoped>
.media-status { margin-block: 20px; padding-block: 16px; border-block: 1px solid var(--el-border-color); }
.media-status h3 { margin: 0; font-size: 16px; }
.media-status p { max-width: 68em; color: var(--el-text-color-secondary); line-height: 1.6; }
.lookup { display: flex; gap: 12px; max-width: 680px; margin-bottom: 12px; }
.media-status :deep(.el-alert) { margin-block: 12px; }
@media (max-width: 600px) { .lookup { flex-direction: column; } }
</style>
