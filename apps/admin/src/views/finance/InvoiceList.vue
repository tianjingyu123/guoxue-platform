<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { financeApi, api } from '@/api'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const statusFilter = ref('')

const rejectDialogVisible = ref(false)
const rejectForm = reactive({ id: '', reason: '' })

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

function statusTagType(status: string) {
  switch (status) {
    case 'ISSUED': return 'success'
    case 'PENDING': return 'warning'
    case 'REJECTED': return 'danger'
    default: return 'info'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'ISSUED': return '已开票'
    case 'PENDING': return '待处理'
    case 'REJECTED': return '已拒绝'
    default: return status
  }
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

async function approve(row: any) {
  try {
    await ElMessageBox.confirm(`确定开具发票 ${row.invoiceNo || row.id}？`, '提示', { type: 'warning' })
    await api.put(`/finance/invoices/${row.id}/issue`)
    ElMessage.success('发票已开具')
    fetchList()
  } catch { /* 取消操作不处理 */ }
}

function openReject(row: any) {
  rejectForm.id = row.id
  rejectForm.reason = ''
  rejectDialogVisible.value = true
}

async function reject() {
  if (!rejectForm.reason) { ElMessage.warning('请输入拒绝原因'); return }
  saving.value = true
  try {
    await api.put(`/finance/invoices/${rejectForm.id}/reject`, { reason: rejectForm.reason })
    ElMessage.success('已拒绝开票')
    rejectDialogVisible.value = false
    fetchList()
  } catch { ElMessage.error('操作失败') } finally { saving.value = false }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>发票管理</h3>
      <div class="toolbar-right">
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width:130px" @change="fetchList">
          <el-option label="全部" value="" />
          <el-option label="待处理" value="PENDING" />
          <el-option label="已开票" value="ISSUED" />
          <el-option label="已拒绝" value="REJECTED" />
        </el-select>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="invoiceNo" label="发票号" width="150" />
      <el-table-column prop="userName" label="用户" width="120" :show-overflow-tooltip="true" />
      <el-table-column label="金额" width="110"><template #default="{ row }">{{ row.amount != null ? Number(row.amount).toFixed(2) : '-' }}</template></el-table-column>
      <el-table-column label="类型" width="100"><template #default="{ row }">{{ row.type === 'COMPANY' ? '企业' : row.type === 'PERSONAL' ? '个人' : row.type || '-' }}</template></el-table-column>
      <el-table-column prop="title" label="抬头" width="160" :show-overflow-tooltip="true" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="申请时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'PENDING'" size="small" type="primary" @click="approve(row)">开票</el-button>
          <el-button v-if="row.status === 'PENDING'" size="small" @click="openReject(row)">拒开</el-button>
          <span v-if="row.status === 'ISSUED'" style="color:#67c23a;font-size:12px">已开票</span>
          <span v-if="row.status === 'REJECTED'" style="color:#999;font-size:12px">已拒绝</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page" :total="total" :page-size="pageSize"
      layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog v-model="rejectDialogVisible" title="拒绝开票" width="450px">
      <el-form label-width="80px">
        <el-form-item label="拒绝原因" required>
          <el-input v-model="rejectForm.reason" type="textarea" :rows="3" placeholder="请输入拒绝原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="saving" @click="reject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
.toolbar-right { display: flex; gap: 8px; align-items: center; }
</style>
