<template>
  <div class="page">
    <div class="toolbar">
      <h3>数字员工任务池</h3>
      <div class="toolbar-right">
        <el-button type="primary" @click="openCreate">
          新建任务
        </el-button>
      </div>
    </div>

    <!-- 一键接管开关卡 -->
    <el-card class="automation-card" shadow="never">
      <div class="automation-row">
        <div class="automation-info">
          <span class="automation-title">自动化总开关（一键接管）</span>
          <el-tag :type="automationEnabled ? 'success' : 'danger'" size="small">
            {{ automationEnabled ? '自动化运行中' : '已接管（数字员工只读）' }}
          </el-tag>
          <span class="automation-tip">
            关闭后数字员工的一切写操作立即 403（含本页「完成任务」），真人操作不受影响；切换全程审计。
          </span>
        </div>
        <el-switch
          v-model="automationEnabled"
          :loading="toggling"
          :disabled="!isSuperAdmin"
          :before-change="confirmToggle"
          active-text="开"
          inactive-text="关"
        />
      </div>
      <div v-if="!isSuperAdmin" class="automation-tip">
        仅超级管理员可切换此开关
      </div>
    </el-card>

    <!-- 筛选 -->
    <div class="filter-row">
      <el-select v-model="filterStatus" placeholder="状态" clearable style="width:140px" @change="resetAndFetch">
        <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
      </el-select>
      <el-select v-model="filterType" placeholder="类型" clearable style="width:140px" @change="resetAndFetch">
        <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
      </el-select>
      <el-select v-model="filterPriority" placeholder="优先级" clearable style="width:120px" @change="resetAndFetch">
        <el-option label="高" value="HIGH" />
        <el-option label="中" value="MEDIUM" />
        <el-option label="低" value="LOW" />
      </el-select>
      <el-button @click="resetAndFetch">查询</el-button>
    </div>

    <!-- 错误态 -->
    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="任务列表加载失败"
      style="margin-bottom:12px"
    >
      <el-button size="small" @click="fetchTasks">重试</el-button>
    </el-alert>

    <el-table v-loading="loading" :data="tasks" stripe>
      <template #empty>
        <el-empty description="任务池为空 — 巡检产出与人工新建的任务都会进入这里" />
      </template>
      <el-table-column label="类型" width="90" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="typeTagType(row.type)">{{ typeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="优先级" width="80" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="priorityTagType(row.priority)" effect="plain">{{ priorityLabel(row.priority) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="执行者" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.executor === 'CLAUDE'" size="small" type="warning" effect="plain">CLAUDE</el-tag>
          <span v-else>{{ row.executor || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="需审批" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.needsApproval" size="small" type="danger" effect="plain">是</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="复核原因 / 结果" min-width="180">
        <template #default="{ row }">
          <span v-if="row.status === 'needs_review'" class="review-reason">{{ row.reviewReason || '-' }}</span>
          <span v-else-if="row.status === 'completed'" class="result-json">{{ briefJson(row.result) }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'pending' || row.status === 'needs_review'"
            size="small"
            text
            type="primary"
            :loading="acting === row.id"
            @click="claim(row)"
          >
            认领
          </el-button>
          <template v-if="row.status === 'in_progress'">
            <el-button size="small" text type="success" :loading="acting === row.id" @click="openComplete(row)">
              完成
            </el-button>
            <el-button size="small" text type="warning" :loading="acting === row.id" @click="toReview(row)">
              转人工复核
            </el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchTasks"
      />
    </div>

    <!-- 新建任务 -->
    <el-dialog v-model="createVisible" title="新建任务" width="520px">
      <el-form label-width="80px">
        <el-form-item label="类型" required>
          <el-select v-model="createForm.type" style="width:100%">
            <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="createForm.title" maxlength="200" placeholder="任务标题" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="createForm.priority" style="width:100%">
            <el-option label="高" value="HIGH" />
            <el-option label="中" value="MEDIUM" />
            <el-option label="低" value="LOW" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据快照">
          <el-input
            v-model="createForm.payloadText"
            type="textarea"
            :rows="4"
            placeholder='payload JSON，可空，如 {"orderId":"..."}'
          />
        </el-form-item>
        <el-form-item label="需审批">
          <el-switch v-model="createForm.needsApproval" />
          <span class="automation-tip" style="margin-left:8px">高风险操作（退款/删数据/改价/资金）永远勾选走人工</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 完成任务 -->
    <el-dialog v-model="completeVisible" title="完成任务" width="520px">
      <p class="dialog-task-title">{{ completeTarget?.title }}</p>
      <el-input
        v-model="completeResultText"
        type="textarea"
        :rows="5"
        placeholder='执行结果：填 JSON（如 {"fixed":true}）或纯文本（自动包装为 {"note":"..."}）'
      />
      <template #footer>
        <el-button @click="completeVisible = false">取消</el-button>
        <el-button type="success" :loading="submitting" @click="submitComplete">确认完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { opsTaskApi, systemApi } from '@/api'
import { useAuthStore } from '@/store/auth'

interface OpsTask {
  id: string
  type: string
  priority: string
  status: string
  title: string
  executor?: string | null
  payload: Record<string, unknown>
  result?: Record<string, unknown> | null
  reviewReason?: string | null
  needsApproval: boolean
  createdAt: string
  updatedAt: string
}

const auth = useAuthStore()
const isSuperAdmin = auth.isSuperAdmin

const typeOptions = [
  { label: '巡检', value: 'INSPECT' },
  { label: '修复', value: 'FIX' },
  { label: '审核', value: 'REVIEW' },
  { label: '运营动作', value: 'OPS' },
]
const statusOptions = [
  { label: '待认领', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '待人工复核', value: 'needs_review' },
]

// ── 一键接管开关 ──
const automationEnabled = ref(true)
const toggling = ref(false)

async function fetchAutomationStatus() {
  try {
    const res = await systemApi.getAutomationStatus()
    automationEnabled.value = res.data?.automationEnabled !== false
  } catch { /* 状态获取失败保持默认，开关操作前有二次确认兜底 */ }
}

/** el-switch before-change：二次确认 + 调后端（后端写 ConfigSystem + 审计），失败则不翻转 */
async function confirmToggle(): Promise<boolean> {
  const next = !automationEnabled.value
  try {
    await ElMessageBox.confirm(
      next
        ? '开启后数字员工恢复自动化写操作权限，确认开启？'
        : '关闭后数字员工的一切自动化写操作立即被拒绝（403），仅保留只读 —— 即「一键接管」。确认关闭？',
      next ? '开启自动化' : '一键接管（关闭自动化）',
      { type: 'warning', confirmButtonText: next ? '确认开启' : '确认接管' },
    )
  } catch { return false }
  toggling.value = true
  try {
    await systemApi.toggleAutomation({ enabled: next })
    ElMessage.success(next ? '自动化已开启' : '已接管：数字员工降为只读')
    return true
  } catch {
    ElMessage.error('切换失败，请重试')
    return false
  } finally {
    toggling.value = false
  }
}

// ── 任务列表 ──
const tasks = ref<OpsTask[]>([])
const loading = ref(false)
const loadError = ref(false)
const acting = ref('')
const submitting = ref(false)

const filterStatus = ref('')
const filterType = ref('')
const filterPriority = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)

function label(list: { label: string; value: string }[], v: string): string {
  return list.find((i) => i.value === v)?.label ?? v
}
function typeLabel(v: string): string { return label(typeOptions, v) }
function statusLabel(v: string): string { return label(statusOptions, v) }
function priorityLabel(v: string): string {
  const map: Record<string, string> = { HIGH: '高', MEDIUM: '中', LOW: '低' }
  return map[v] || v
}
function typeTagType(v: string): string {
  const map: Record<string, string> = { INSPECT: 'info', FIX: 'danger', REVIEW: 'warning', OPS: 'primary' }
  return map[v] || ''
}
function priorityTagType(v: string): string {
  const map: Record<string, string> = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'info' }
  return map[v] || ''
}
function statusTagType(v: string): string {
  const map: Record<string, string> = { pending: 'info', in_progress: 'primary', completed: 'success', needs_review: 'danger' }
  return map[v] || ''
}
function formatTime(v: string): string {
  return v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : '-'
}
function briefJson(v: unknown): string {
  if (!v || (typeof v === 'object' && Object.keys(v as object).length === 0)) return '-'
  try { return JSON.stringify(v).slice(0, 120) } catch { return '-' }
}

onMounted(() => { fetchTasks(); fetchAutomationStatus() })

async function fetchTasks() {
  loading.value = true
  loadError.value = false
  try {
    const res = await opsTaskApi.list({
      status: filterStatus.value || undefined,
      type: filterType.value || undefined,
      priority: filterPriority.value || undefined,
      page: page.value,
      pageSize,
    })
    tasks.value = res.data?.items || []
    total.value = res.data?.total || 0
  } catch {
    loadError.value = true
    tasks.value = []
    ElMessage.error('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

function resetAndFetch() { page.value = 1; fetchTasks() }

// ── 认领 ──
async function claim(row: OpsTask) {
  if (acting.value) return
  acting.value = row.id
  try {
    await opsTaskApi.claim(row.id)
    ElMessage.success(row.status === 'needs_review' ? '已接管此任务' : '认领成功')
    await fetchTasks()
  } catch {
    ElMessage.error('认领失败，请重试')
  } finally {
    acting.value = ''
  }
}

// ── 完成 ──
const completeVisible = ref(false)
const completeTarget = ref<OpsTask | null>(null)
const completeResultText = ref('')

function openComplete(row: OpsTask) {
  completeTarget.value = row
  completeResultText.value = ''
  completeVisible.value = true
}

async function submitComplete() {
  if (submitting.value || !completeTarget.value) return
  let result: Record<string, unknown> | undefined
  const text = completeResultText.value.trim()
  if (text) {
    try { result = JSON.parse(text) } catch { result = { note: text } }
    if (typeof result !== 'object' || result === null || Array.isArray(result)) result = { note: text }
  }
  submitting.value = true
  try {
    await opsTaskApi.complete(completeTarget.value.id, result)
    ElMessage.success('任务已完成')
    completeVisible.value = false
    await fetchTasks()
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 403) ElMessage.error('数字员工自动化已被管理员暂停（一键接管中），写操作不可用')
    else ElMessage.error('操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

// ── 转人工复核 ──
async function toReview(row: OpsTask) {
  if (acting.value) return
  let reason = ''
  try {
    const { value } = await ElMessageBox.prompt('请填写转人工复核的原因', '转人工复核', {
      inputPlaceholder: '如：涉资金操作需人工确认',
      inputValidator: (v: string) => (v && v.trim().length > 0) || '原因不能为空',
    })
    reason = value.trim()
  } catch { return }
  acting.value = row.id
  try {
    await opsTaskApi.review(row.id, reason)
    ElMessage.success('已转人工复核')
    await fetchTasks()
  } catch {
    ElMessage.error('操作失败，请重试')
  } finally {
    acting.value = ''
  }
}

// ── 新建任务 ──
const createVisible = ref(false)
const createForm = ref({ type: 'OPS', title: '', priority: 'MEDIUM', payloadText: '', needsApproval: false })

function openCreate() {
  createForm.value = { type: 'OPS', title: '', priority: 'MEDIUM', payloadText: '', needsApproval: false }
  createVisible.value = true
}

async function submitCreate() {
  if (submitting.value) return
  const title = createForm.value.title.trim()
  if (!title) { ElMessage.warning('请填写任务标题'); return }
  let payload: Record<string, unknown> | undefined
  const text = createForm.value.payloadText.trim()
  if (text) {
    try {
      payload = JSON.parse(text)
      if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) throw new Error('not object')
    } catch {
      ElMessage.warning('数据快照须为合法 JSON 对象')
      return
    }
  }
  submitting.value = true
  try {
    await opsTaskApi.create({
      type: createForm.value.type,
      title,
      priority: createForm.value.priority,
      payload,
      needsApproval: createForm.value.needsApproval,
    })
    ElMessage.success('任务已创建')
    createVisible.value = false
    page.value = 1
    await fetchTasks()
  } catch {
    ElMessage.error('创建失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.toolbar-right { display: flex; align-items: center; gap: 12px; }
.automation-card { margin-bottom: 16px; }
.automation-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.automation-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.automation-title { font-weight: 600; }
.automation-tip { color: var(--color-text-secondary, #909399); font-size: 12px; }
.filter-row { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.review-reason { color: #c45656; font-size: 12px; word-break: break-all; }
.result-json { color: #606266; font-size: 12px; font-family: monospace; word-break: break-all; }
.dialog-task-title { margin: 0 0 12px; font-weight: 600; }
.pager { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
