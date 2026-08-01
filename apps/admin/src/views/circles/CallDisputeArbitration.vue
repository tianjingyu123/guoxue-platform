<template>
  <div class="page">
    <div class="header">
      <h2>通话账单申诉（达人咨询）</h2>
      <el-button
        :loading="loading"
        @click="fetchList"
      >
        刷新
      </el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      <template #title>
        通话结束 24 小时内的账单申诉在此处理。<strong>处理只记结论与备注，不触碰资金</strong>——核查属实需要退款时，请另行走「国学币退款审批流」（财务双审）。
      </template>
    </el-alert>

    <el-tabs
      v-model="statusTab"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="待处理"
        name="PENDING"
      />
      <el-tab-pane
        label="已解决"
        name="RESOLVED"
      />
      <el-tab-pane
        label="已驳回"
        name="REJECTED"
      />
    </el-tabs>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    >
      <template #title>
        加载失败，请
        <el-button
          link
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
      border
    >
      <template #empty>
        <el-empty description="暂无申诉" />
      </template>
      <el-table-column
        label="申诉时间"
        width="165"
      >
        <template #default="{ row }">
          {{ formatDate(row.disputedAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="发起人"
        width="120"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.callerName || row.callerId || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        label="达人"
        width="120"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.expertName || row.expertId || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        label="时长"
        width="90"
        align="right"
      >
        <template #default="{ row }">
          {{ fmtDuration(row.durationSec) }}
        </template>
      </el-table-column>
      <el-table-column
        label="实结(金币)"
        width="100"
        align="right"
      >
        <template #default="{ row }">
          {{ row.settledCoin ?? '--' }}
        </template>
      </el-table-column>
      <el-table-column
        label="申诉理由"
        min-width="220"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.disputeReason || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="statusTab !== 'PENDING'"
        label="处理备注"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.disputeResolveNote || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="statusTab === 'PENDING'"
        label="操作"
        width="170"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="success"
            @click="openResolve(row, 'RESOLVED')"
          >
            核实解决
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="openResolve(row, 'REJECTED')"
          >
            驳回
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top: 16px; justify-content: flex-end"
      @current-change="fetchList"
    />

    <el-dialog
      v-model="resolveVisible"
      :title="resolveStatus === 'RESOLVED' ? '核实解决（如需退款请另走金币退款审批流）' : '驳回申诉'"
      width="480px"
    >
      <el-input
        v-model="note"
        type="textarea"
        :rows="4"
        maxlength="500"
        show-word-limit
        :placeholder="resolveStatus === 'REJECTED'
          ? '驳回理由（必填，将同步给申诉发起人）'
          : '处理备注（选填，如：核查属实，已转人工退款审批）'"
      />
      <div
        v-if="resolveStatus === 'REJECTED' && !note.trim()"
        style="margin-top:6px;font-size:12px;color:var(--el-color-danger)"
      >
        驳回申诉必须填写理由
      </div>
      <template #footer>
        <el-button @click="resolveVisible = false">
          取消
        </el-button>
        <el-button
          :type="resolveStatus === 'RESOLVED' ? 'success' : 'danger'"
          :loading="submitting"
          :disabled="resolveStatus === 'REJECTED' && !note.trim()"
          @click="confirmResolve"
        >
          确认{{ resolveStatus === 'RESOLVED' ? '解决' : '驳回' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { callDisputeApi } from '@/api'

interface DisputeRow {
  id: string
  callerId?: string
  expertId?: string
  callerName?: string
  expertName?: string
  durationSec?: number
  settledCoin?: number
  disputeReason?: string
  disputedAt?: string
  disputeStatus?: string
  disputeResolveNote?: string
}

const loading = ref(false)
const error = ref(false)
const list = ref<DisputeRow[]>([])
const total = ref(0)
const page = ref(1)
const statusTab = ref('PENDING')

const resolveVisible = ref(false)
const resolveStatus = ref<'RESOLVED' | 'REJECTED'>('RESOLVED')
const note = ref('')
const pendingRow = ref<DisputeRow | null>(null)
const submitting = ref(false)

function formatDate(d?: string) {
  return d ? new Date(d).toLocaleString() : '--'
}
function fmtDuration(sec?: number) {
  if (!sec && sec !== 0) return '--'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}分${s}秒`
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const { data } = await callDisputeApi.list({ page: page.value, pageSize: 20, status: statusTab.value })
    list.value = data.items || []
    total.value = data.total ?? 0
  } catch {
    error.value = true
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}
function onTabChange() {
  page.value = 1
  fetchList()
}

function openResolve(row: DisputeRow, status: 'RESOLVED' | 'REJECTED') {
  pendingRow.value = row
  resolveStatus.value = status
  note.value = ''
  resolveVisible.value = true
}
async function confirmResolve() {
  if (!pendingRow.value || submitting.value) return
  // 驳回申诉必须写理由（危险操作 L2 级：驳回类理由必填；通过/解决备注可选）
  if (resolveStatus.value === 'REJECTED' && !note.value.trim()) {
    ElMessage.warning('驳回申诉必须填写理由')
    return
  }
  submitting.value = true
  try {
    await callDisputeApi.resolve(pendingRow.value.id, { status: resolveStatus.value, note: note.value.trim() || undefined })
    ElMessage.success(resolveStatus.value === 'RESOLVED' ? '已标记核实解决' : '已驳回申诉')
    resolveVisible.value = false
    fetchList()
  } catch {
    // 错误已由 api/index.ts 响应拦截器统一弹出人话提示，此处不再重复弹（避免双弹+英文 axios message）
  } finally {
    submitting.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; }
</style>
