<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

const loading = ref(false)
const saving = ref(false)
const error = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const statusFilter = ref('PENDING')

const detailVisible = ref(false)
const detailData = ref<any>(null)

const rejectVisible = ref(false)
const rejectForm = reactive({ id: '', note: '' })

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-' }
function formatMoney(v: any) { return v != null ? '¥' + Number(v).toFixed(2) : '-' }

const TYPE_LABELS: Record<string, string> = {
  DIVIDEND: '研究院分红',
  REFUND: '汇付退款',
  RECHARGE: '灵石充值',
  COMMISSION_CONFIG: '分佣比例变更',
}
function typeLabel(t: string) { return TYPE_LABELS[t] || t }
function typeTagType(t: string) {
  const m: Record<string, string> = { DIVIDEND: 'warning', REFUND: 'danger', RECHARGE: 'success', COMMISSION_CONFIG: 'primary' }
  return m[t] || 'info'
}

function statusTagType(s: string) {
  const m: Record<string, string> = { APPROVED: 'success', REJECTED: 'danger', PENDING: 'warning' }
  return m[s] || 'info'
}
function statusLabel(s: string) {
  const m: Record<string, string> = { APPROVED: '已通过', REJECTED: '已拒绝', PENDING: '待审批' }
  return m[s] || s
}

/** payload 摘要：取关键字段简短展示 */
function payloadBrief(row: any): string {
  const p = row?.payload && typeof row.payload === 'object' ? row.payload : {}
  switch (row.type) {
    case 'DIVIDEND':
      return `对象 ${p.userId ?? '-'} / 类型 ${p.type ?? '-'}`
    case 'RECHARGE':
      return `用户 ${p.userId ?? '-'} / ${p.amountCoin ?? '-'} 币`
    case 'REFUND':
      return `交易号 ${p.outTradeNo ?? p.orderId ?? '-'}`
    case 'COMMISSION_CONFIG':
      return p.method === 'updateCommissionConfig'
        ? `${p.type ?? '-'} → ${p.rate ?? '-'}`
        : `${p.key ?? '-'} ${JSON.stringify(p.dto ?? {})}`
    default:
      return ''
  }
}

function prettyPayload(row: any): string {
  try { return JSON.stringify(row?.payload ?? {}, null, 2) } catch { return String(row?.payload ?? '') }
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: any = { page: page.value, pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await api.get('/fund-approval/admin/pending', { params })
    list.value = data.items ?? []
    total.value = data.total ?? list.value.length
  } catch {
    error.value = true
    list.value = []
  } finally { loading.value = false }
}

function viewDetail(row: any) { detailData.value = row; detailVisible.value = true }

async function approve(row: any) {
  if (saving.value) return
  try {
    await ElMessageBox.confirm(
      `确认通过该「${typeLabel(row.type)}」审批并执行？\n摘要：${row.summary}`,
      '审批确认',
      { type: 'warning', confirmButtonText: '通过并执行', cancelButtonText: '取消' },
    )
  } catch { return }
  saving.value = true
  try {
    await api.post(`/fund-approval/admin/${row.id}/review`, { approve: true })
    ElMessage.success('已通过并执行')
    fetchList()
  } catch { /* 拦截器已提示 */ } finally { saving.value = false }
}

function openReject(row: any) {
  rejectForm.id = row.id
  rejectForm.note = ''
  rejectVisible.value = true
}

async function reject() {
  if (saving.value) return
  saving.value = true
  try {
    await api.post(`/fund-approval/admin/${rejectForm.id}/review`, { approve: false, note: rejectForm.note })
    ElMessage.success('已拒绝')
    rejectVisible.value = false
    fetchList()
  } catch { /* 拦截器已提示 */ } finally { saving.value = false }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>资金审批中心</h3>
      <el-select
        v-model="statusFilter"
        placeholder="状态筛选"
        clearable
        style="width:130px"
        @change="page = 1; fetchList()"
      >
        <el-option label="待审批" value="PENDING" />
        <el-option label="已通过" value="APPROVED" />
        <el-option label="已拒绝" value="REJECTED" />
        <el-option label="全部" value="" />
      </el-select>
    </div>

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="资金审批列表加载出错，请重试"
    >
      <template #extra>
        <el-button type="primary" @click="fetchList">
          重试
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <el-table
        v-loading="loading"
        :data="list"
        stripe
      >
        <el-table-column label="类型" width="130">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="摘要" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.summary }}
          </template>
        </el-table-column>
        <el-table-column label="参数摘要" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ payloadBrief(row) }}
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            <span style="font-weight:600;color:var(--color-warning, #e6a23c)">{{ row.amount != null ? formatMoney(row.amount) : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发起人" width="160" show-overflow-tooltip prop="requestedBy" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发起时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">
              详情
            </el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              size="small"
              type="success"
              :disabled="saving"
              @click="approve(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              size="small"
              type="danger"
              :disabled="saving"
              @click="openReject(row)"
            >
              拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && list.length === 0"
        description="暂无审批记录"
        style="margin-top:40px"
      />

      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="pageSize"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchList"
      />
    </template>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="审批详情"
      width="560px"
    >
      <el-descriptions
        v-if="detailData"
        :column="2"
        border
      >
        <el-descriptions-item label="类型">
          <el-tag :type="typeTagType(detailData.type)" size="small">
            {{ typeLabel(detailData.type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(detailData.status)" size="small">
            {{ statusLabel(detailData.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="摘要" :span="2">
          {{ detailData.summary }}
        </el-descriptions-item>
        <el-descriptions-item label="金额">
          {{ detailData.amount != null ? formatMoney(detailData.amount) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="发起人">
          {{ detailData.requestedBy || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="发起时间">
          {{ formatDate(detailData.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="处理时间">
          {{ formatDate(detailData.processedAt) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="detailData.reviewedBy" label="审批人">
          {{ detailData.reviewedBy }}
        </el-descriptions-item>
        <el-descriptions-item v-if="detailData.reviewNote" label="审批备注">
          {{ detailData.reviewNote }}
        </el-descriptions-item>
        <el-descriptions-item label="执行参数(payload)" :span="2">
          <pre class="payload-pre">{{ prettyPayload(detailData) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 拒绝弹窗 -->
    <el-dialog
      v-model="rejectVisible"
      title="拒绝审批"
      width="450px"
    >
      <el-form label-width="80px">
        <el-form-item label="拒绝原因">
          <el-input
            v-model="rejectForm.note"
            type="textarea"
            :rows="4"
            placeholder="请输入拒绝原因（选填）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="saving"
          @click="reject"
        >
          确认拒绝
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.payload-pre { margin: 0; max-height: 240px; overflow: auto; font-size: 12px; white-space: pre-wrap; word-break: break-all; color: var(--color-text-body); }
</style>
