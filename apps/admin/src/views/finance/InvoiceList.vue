<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { financeApi } from '@/api'
import { exportCSV } from '@/utils/export'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const statusFilter = ref('')

const rejectVisible = ref(false)
const rejectForm = reactive({ id: '', reason: '' })
const detailVisible = ref(false)
const detailData = ref<any>(null)

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
function formatMoney(v: any) { return v != null ? '¥' + Number(v).toFixed(2) : '-' }

function statusTagType(status: string) {
  const m: Record<string, string> = { ISSUED: 'success', MAILED: '', PENDING: 'warning', REJECTED: 'danger' }
  return m[status] || 'info'
}

function statusLabel(status: string) {
  const m: Record<string, string> = { ISSUED: '已开票', MAILED: '已邮寄', PENDING: '待处理', REJECTED: '已拒绝' }
  return m[status] || status
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await financeApi.listInvoices(params)
    list.value = data.records || data.data || []
    total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function viewDetail(row: any) { detailData.value = row; detailVisible.value = true }

async function doIssue(row: any) {
  try {
    await ElMessageBox.confirm(`确定开具发票 ${row.invoiceNo || row.id}？`, '开票确认', { type: 'warning' })
    await financeApi.issueInvoice(row.id, row.invoiceUrl || '')
    ElMessage.success('发票已开具')
    fetchList()
  } catch { /* 取消 */ }
}

function openReject(row: any) {
  rejectForm.id = row.id
  rejectForm.reason = ''
  rejectVisible.value = true
}

async function reject() {
  if (!rejectForm.reason.trim()) { ElMessage.warning('请输入拒绝原因'); return }
  saving.value = true
  try {
    await financeApi.issueInvoice(rejectForm.id, '')
    ElMessage.success('已拒绝开票')
    rejectVisible.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}

async function doMail(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入快递单号', '标记已邮寄', { type: 'info' })
    if (value) {
      await financeApi.mailInvoice(row.id, value)
      ElMessage.success('已标记邮寄')
      fetchList()
    }
  } catch { /* 取消 */ }
}

function handleExport() {
  exportCSV('发票列表', [
    { label: '发票号', key: 'invoiceNo' },
    { label: '用户', key: 'userName' },
    { label: '金额', key: 'amount' },
    { label: '类型', key: 'typeLabel' },
    { label: '抬头', key: 'title' },
    { label: '状态', key: 'statusLabel' },
    { label: '申请时间', key: 'createdAt' },
  ], list.value.map(r => ({
    ...r,
    amount: formatMoney(r.amount),
    typeLabel: r.type === 'COMPANY' ? '企业' : r.type === 'PERSONAL' ? '个人' : r.type,
    statusLabel: statusLabel(r.status),
    createdAt: formatDate(r.createdAt),
  })))
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>发票管理</h3>
      <div class="toolbar-right">
        <el-select
          v-model="statusFilter"
          placeholder="状态筛选"
          clearable
          style="width:130px"
          @change="fetchList"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="待处理"
            value="PENDING"
          />
          <el-option
            label="已开票"
            value="ISSUED"
          />
          <el-option
            label="已拒绝"
            value="REJECTED"
          />
        </el-select>
        <el-button @click="handleExport">
          导出CSV
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="invoiceNo"
        label="发票号"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="userName"
        label="申请人"
        width="120"
        show-overflow-tooltip
      />
      <el-table-column
        label="金额"
        width="110"
      >
        <template #default="{ row }">
          <span style="font-weight:600">{{ formatMoney(row.amount) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="80"
      >
        <template #default="{ row }">
          {{ row.type === 'COMPANY' ? '企业' : row.type === 'PERSONAL' ? '个人' : row.type || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="抬头"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusTagType(row.status)"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="申请时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="220"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="viewDetail(row)"
          >
            详情
          </el-button>
          <el-button
            v-if="row.status === 'PENDING'"
            size="small"
            type="success"
            @click="doIssue(row)"
          >
            开票
          </el-button>
          <el-button
            v-if="row.status === 'PENDING'"
            size="small"
            type="danger"
            @click="openReject(row)"
          >
            拒开
          </el-button>
          <el-button
            v-if="row.status === 'ISSUED'"
            size="small"
            @click="doMail(row)"
          >
            标记邮寄
          </el-button>
          <span
            v-else-if="row.status === 'MAILED'"
            style="color:#67c23a;font-size:12px"
          >✓ 已邮寄</span>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!loading && list.length === 0"
      description="暂无发票记录"
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

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="发票详情"
      width="500px"
    >
      <el-descriptions
        v-if="detailData"
        :column="2"
        border
      >
        <el-descriptions-item
          label="发票号"
          :span="2"
        >
          {{ detailData.invoiceNo || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="申请人">
          {{ detailData.userName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="金额">
          <span style="font-weight:600">{{ formatMoney(detailData.amount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          {{ detailData.type === 'COMPANY' ? '企业' : detailData.type === 'PERSONAL' ? '个人' : detailData.type || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag
            :type="statusTagType(detailData.status)"
            size="small"
          >
            {{ statusLabel(detailData.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item
          label="抬头"
          :span="2"
        >
          {{ detailData.title || '-' }}
        </el-descriptions-item>
        <el-descriptions-item
          label="税号"
          :span="2"
        >
          {{ detailData.taxNo || '-' }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.expressNo"
          label="快递单号"
          :span="2"
        >
          {{ detailData.expressNo }}
        </el-descriptions-item>
        <el-descriptions-item
          label="申请时间"
          :span="2"
        >
          {{ formatDate(detailData.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 拒绝弹窗 -->
    <el-dialog
      v-model="rejectVisible"
      title="拒绝开票"
      width="450px"
    >
      <el-form label-width="80px">
        <el-form-item
          label="拒绝原因"
          required
        >
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入拒绝原因（必填）"
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
.toolbar-right { display: flex; gap: 8px; align-items: center; }
</style>
