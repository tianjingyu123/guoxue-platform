<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, financeApi } from '@/api'
import { exportCSV } from '@/utils/export'

const loading = ref(false)
const error = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const statusFilter = ref('')
const detailVisible = ref(false)
const detailData = ref<any>(null)
const rejecting = ref(false)

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
function formatMoney(v: any) { return v != null ? '¥' + Number(v).toFixed(2) : '-' }

// 后端字段：status = PENDING / ISSUED / MAILED / REJECTED
function statusTagType(status: string) {
  const m: Record<string, string> = { ISSUED: 'success', MAILED: '', PENDING: 'warning', REJECTED: 'danger' }
  return m[status] || 'info'
}
function statusLabel(status: string) {
  const m: Record<string, string> = { ISSUED: '已开票', MAILED: '已邮寄', PENDING: '待处理', REJECTED: '已拒绝' }
  return m[status] || status
}
function typeLabel(t: string) {
  return t === 'COMPANY' ? '企业' : t === 'PERSONAL' ? '个人' : t || '-'
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: any = { page: page.value, pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    // 后端 getInvoiceList 返回 { invoices, total, page, pageSize }，"invoices" 键不被拦截器解包
    const { data } = await financeApi.listInvoices(params)
    list.value = data.invoices ?? data.items ?? []
    total.value = data.total ?? list.value.length
  } catch {
    error.value = true
    list.value = []
  } finally { loading.value = false }
}

function viewDetail(row: any) { detailData.value = row; detailVisible.value = true }

async function doIssue(row: any) {
  try {
    await ElMessageBox.confirm(`确定开具发票（订单 ${row.orderId}）？`, '开票确认', { type: 'warning' })
    await financeApi.issueInvoice(row.id, row.invoiceUrl || '')
    ElMessage.success('发票已开具')
    fetchList()
  } catch { /* 取消 */ }
}

async function doReject(row: any) {
  if (rejecting.value) return
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因（可选）', '驳回开票申请', {
      type: 'warning',
      confirmButtonText: '确认驳回',
      inputPlaceholder: '如：抬头信息有误、订单未实际支付等',
      inputType: 'textarea',
    })
    await ElMessageBox.confirm(`确定驳回订单 ${row.orderId} 的开票申请？此操作不可撤销。`, '二次确认', { type: 'warning' })
    rejecting.value = true
    // 铁律：直调 api，不在 api/index.ts 增方法
    await api.put(`/finance/invoices/${row.id}/reject`, { reason: value || undefined })
    ElMessage.success('已驳回开票申请')
    fetchList()
  } catch { /* 取消 */ } finally { rejecting.value = false }
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
    { label: '订单号', key: 'orderId' },
    { label: '用户ID', key: 'userId' },
    { label: '金额', key: 'amount' },
    { label: '类型', key: 'typeLabel' },
    { label: '抬头', key: 'title' },
    { label: '状态', key: 'statusLabel' },
    { label: '申请时间', key: 'createdAt' },
  ], list.value.map(r => ({
    ...r,
    amount: formatMoney(r.amount),
    typeLabel: typeLabel(r.type),
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
            label="已邮寄"
            value="MAILED"
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

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="发票列表加载出错，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchList"
        >
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
        <el-table-column
          prop="orderId"
          label="订单号"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="userId"
          label="用户ID"
          width="160"
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
            {{ typeLabel(row.type) }}
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
          width="200"
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
              plain
              :loading="rejecting"
              @click="doReject(row)"
            >
              驳回
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
            <span
              v-else-if="row.status === 'REJECTED'"
              style="color:#f56c6c;font-size:12px"
            >✗ 已拒绝</span>
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
    </template>

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
          label="订单号"
          :span="2"
        >
          {{ detailData.orderId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="用户ID">
          {{ detailData.userId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="金额">
          <span style="font-weight:600">{{ formatMoney(detailData.amount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          {{ typeLabel(detailData.type) }}
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
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.toolbar-right { display: flex; gap: 8px; align-items: center; }
</style>
