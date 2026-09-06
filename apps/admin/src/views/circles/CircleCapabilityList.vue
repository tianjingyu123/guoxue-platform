<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { useAuthStore } from '@/store/auth'
import CircleDirectGrantDialog from './CircleDirectGrantDialog.vue'

type Action = 'APPROVE' | 'REJECT' | 'SUSPEND' | 'RESUME' | 'REVOKE'
interface Grant {
  id: string; revision: number; circleId: string; capability: string; state: string; source?: string
  enabled: boolean; expiresAt: string | null; maxUnits: number | null; maxConcurrent: number | null
  display: { circleName: string; ownerName: string; applicantName: string; subjectName: string }
}
const labels: Record<string, string> = { SHORT_VIDEO: '短视频发布', LIVE: '直播开播', AUDIO_QUESTION: '付费语音问答', VIDEO_QUESTION: '付费视频问答' }
const states: Record<string, string> = { PENDING: '待审批', APPROVED: '已批准', REJECTED: '已驳回', SUSPENDED: '已暂停', REVOKED: '已撤销' }
const actions: Record<Action, string> = { APPROVE: '批准', REJECT: '驳回', SUSPEND: '暂停', RESUME: '恢复资格', REVOKE: '撤销' }
const auth = useAuthStore()
const canReview = computed(() => auth.roles.some(role => ['SUPER_ADMIN', 'OPERATION_ADMIN'].includes(role)))
const rows = ref<Grant[]>([]), total = ref(0), loading = ref(false), saving = ref(false), loadError = ref('')
const filters = reactive({ capability: '', state: '', page: 1, pageSize: 20 })
const selected = ref<Grant | null>(null), dialog = ref(false), action = ref<Action>('APPROVE')
const directDialog = ref(false)
const form = reactive({ reason: '', expiresAt: '', maxUnits: undefined as number | undefined, maxConcurrent: undefined as number | undefined })
let generation = 0
onBeforeUnmount(() => { generation++ })
const dateText = (date: string | null) => date ? new Date(date).toLocaleString('zh-CN', { hour12: false }) : '尚未设置'
const useState = (row: Grant) => row.expiresAt && Date.parse(row.expiresAt) <= Date.now() ? '已到期，不可发布' : row.enabled ? '已启用' : '待本人启用'
function allowed(row: Grant): Action[] {
  if (!canReview.value) return []
  if (row.state === 'PENDING') return ['APPROVE', 'REJECT']
  if (row.state === 'APPROVED') return ['SUSPEND', 'REVOKE']
  if (row.state === 'SUSPENDED') return ['RESUME', 'REVOKE']
  return []
}
async function load(reset = false) {
  if (reset) filters.page = 1
  const ticket = ++generation
  loading.value = true; loadError.value = ''; rows.value = []
  try {
    const { data } = await api.get('/circle-capabilities/admin/grants', { params: {
      page: filters.page, pageSize: filters.pageSize,
      ...(filters.capability ? { capability: filters.capability } : {}), ...(filters.state ? { state: filters.state } : {}),
    } })
    if (ticket !== generation) return
    if (!Array.isArray(data?.items) || !Number.isInteger(data?.total)) throw new Error('列表响应不完整')
    rows.value = data.items; total.value = data.total
  } catch {
    if (ticket === generation) { total.value = 0; loadError.value = '授权列表暂不可用。请重试；若接口尚未部署，请联系发布负责人。' }
  } finally { if (ticket === generation) loading.value = false }
}
function open(row: Grant, next: Action) {
  if (saving.value || !allowed(row).includes(next)) return
  selected.value = row; action.value = next
  Object.assign(form, { reason: '', expiresAt: '', maxUnits: undefined, maxConcurrent: undefined })
  dialog.value = true
}
async function submit() {
  const row = selected.value
  if (!row || saving.value || !canReview.value) return
  if (!form.reason.trim() || form.reason.trim().length > 500) { ElMessage.warning('请填写不超过500字的处理原因'); return }
  if (action.value === 'APPROVE' && (!form.expiresAt || !Number.isFinite(Date.parse(form.expiresAt)) || Date.parse(form.expiresAt) <= Date.now()
    || !Number.isInteger(form.maxUnits) || !Number.isInteger(form.maxConcurrent) || !form.maxUnits || !form.maxConcurrent
    || form.maxConcurrent > form.maxUnits || form.maxUnits > 2147483647 || form.maxConcurrent < 1)) {
    ElMessage.warning('请设置未来的到期时间、正整数额度和不超过额度的并发数'); return
  }
  saving.value = true
  try {
    await api.post(`/circle-capabilities/admin/grants/${row.id}/review`, {
      action: action.value, expectedRevision: row.revision, reason: form.reason.trim(),
      ...(action.value === 'APPROVE' ? { expiresAt: new Date(form.expiresAt).toISOString(), maxUnits: form.maxUnits, maxConcurrent: form.maxConcurrent } : {}),
    })
    dialog.value = false
    ElMessage.success(action.value === 'APPROVE' || action.value === 'RESUME' ? '资格已更新，待授权对象本人启用' : `${actions[action.value]}成功`)
    await load()
  } catch {
    // 不自动重发有副作用的请求。重新读服务端状态，旧 revision 不能再次覆盖。
    dialog.value = false
    ElMessage.warning('未确认处理成功，已刷新列表。请核对最新状态后再操作。')
    await load()
  } finally { saving.value = false }
}
onMounted(() => load())
</script>

<template>
  <section class="capability-page">
    <header><div><h2>发布能力授权</h2><p>管理发布、开播与提供问答的资格；不限制普通用户阅读。</p></div><div><el-button v-if="canReview" type="primary" :disabled="saving" @click="directDialog = true">平台直接授权</el-button><el-button :loading="loading" :disabled="saving" @click="load()">刷新列表</el-button></div></header>
    <el-alert type="info" :closable="false" title="批准资格不等于已经启用。平台直授与圈主申请分别留痕；请以服务端最新状态为准。" show-icon />
    <div class="filters">
      <el-select v-model="filters.capability" clearable placeholder="全部发布能力" aria-label="发布能力" :disabled="saving" @change="load(true)"><el-option v-for="(label, key) in labels" :key="key" :label="label" :value="key" /></el-select>
      <el-select v-model="filters.state" clearable placeholder="全部申请状态" aria-label="申请状态" :disabled="saving" @change="load(true)"><el-option v-for="(label, key) in states" :key="key" :label="label" :value="key" /></el-select>
    </div>
    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon />
    <el-table v-else v-loading="loading" :data="rows" row-key="id" empty-text="暂无符合条件的授权记录，可调整筛选条件。">
      <el-table-column label="圈子 / 授权对象" min-width="230"><template #default="{ row }"><strong>{{ row.display?.circleName || '名称不可用' }}</strong><p>{{ row.display?.subjectName || '对象信息不可用' }}</p><small>申请人：{{ row.display?.applicantName || '名称不可用' }}</small></template></el-table-column>
      <el-table-column label="能力 / 来源" min-width="145"><template #default="{ row }">{{ labels[row.capability] || row.capability }}<p>{{ row.source === 'PLATFORM_DIRECT' ? '平台直接授权' : '圈主申请' }}</p></template></el-table-column>
      <el-table-column label="当前状态" min-width="130"><template #default="{ row }"><el-tag>{{ states[row.state] || row.state }}</el-tag><p v-if="row.state === 'APPROVED'">{{ useState(row) }}</p></template></el-table-column>
      <el-table-column label="期限 / 额度" min-width="200"><template #default="{ row }">{{ dateText(row.expiresAt) }}<p>总额度 {{ row.maxUnits ?? '未设置' }} · 并发 {{ row.maxConcurrent ?? '未设置' }}</p></template></el-table-column>
      <el-table-column label="处理" min-width="190"><template #default="{ row }"><el-button v-for="item in allowed(row)" :key="item" link :type="item === 'REVOKE' ? 'danger' : 'primary'" :disabled="saving || loading" @click="open(row, item)">{{ actions[item] }}</el-button></template></el-table-column>
    </el-table>
    <el-pagination v-if="total > 0" v-model:current-page="filters.page" :page-size="filters.pageSize" :total="total" :disabled="loading || saving" layout="total, prev, pager, next" @current-change="load()" />
    <el-dialog v-model="dialog" :title="`${actions[action]}发布资格`" width="min(560px, 94vw)" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving">
      <p>{{ selected?.display?.circleName }} / {{ selected?.display?.subjectName }} / {{ labels[selected?.capability || ''] }}</p>
      <el-form label-position="top">
        <template v-if="action === 'APPROVE'">
          <el-form-item label="授权到期时间（本地时间）" required><el-date-picker v-model="form.expiresAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" :disabled="saving" /></el-form-item>
          <el-form-item label="总额度" required><el-input-number v-model="form.maxUnits" :min="1" :max="2147483647" :precision="0" :disabled="saving" /></el-form-item>
          <el-form-item label="最大并发" required><el-input-number v-model="form.maxConcurrent" :min="1" :max="form.maxUnits || 2147483647" :precision="0" :disabled="saving" /></el-form-item>
        </template>
        <el-form-item label="处理原因（记入审计记录）" required><el-input v-model="form.reason" type="textarea" :rows="3" maxlength="500" show-word-limit :disabled="saving" /></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="saving" @click="dialog = false">取消</el-button><el-button :type="action === 'REVOKE' ? 'danger' : 'primary'" :loading="saving" @click="submit">确认{{ actions[action] }}</el-button></template>
    </el-dialog>
    <CircleDirectGrantDialog v-model="directDialog" @completed="load(true)" />
  </section>
</template>

<style scoped>
.capability-page { padding: 24px; color: var(--el-text-color-primary, #303133); }
header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
h2 { margin: 0; font-size: 22px; } p { margin: 6px 0; line-height: 1.6; }
header p, small { color: var(--el-text-color-secondary, #606266); }
.filters { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0; }
.filters .el-select { width: 210px; } .el-pagination { margin-top: 20px; }
@media (max-width: 640px) { .capability-page { padding: 14px; } header { flex-direction: column; } .filters .el-select { width: 100%; } }
</style>
