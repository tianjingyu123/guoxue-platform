<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { financeApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const statusFilter = ref('')

const dialogVisible = ref(false)
const form = reactive({ startDate: '', endDate: '' })

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

function statusTagType(status: string) {
  switch (status) {
    case 'COMPLETED': return 'success'
    case 'PENDING': return 'warning'
    case 'PROCESSING': return 'primary'
    case 'FAILED': return 'danger'
    default: return 'info'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'COMPLETED': return '已完成'
    case 'PENDING': return '待处理'
    case 'PROCESSING': return '处理中'
    case 'FAILED': return '失败'
    default: return status
  }
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await financeApi.listSettlements(params)
    list.value = data.records || data.data || []
    total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function openCreate() {
  form.startDate = ''
  form.endDate = ''
  dialogVisible.value = true
}

async function save() {
  if (!form.startDate || !form.endDate) { ElMessage.warning('请选择结算周期'); return }
  if (form.startDate > form.endDate) { ElMessage.warning('开始日期不能晚于结束日期'); return }
  saving.value = true
  try {
    await financeApi.createSettlement({
      startDate: form.startDate,
      endDate: form.endDate,
    })
    ElMessage.success('结算单已生成')
    dialogVisible.value = false
    fetchList()
  } catch { ElMessage.error('生成结算单失败') } finally { saving.value = false }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>结算单管理</h3>
      <div class="toolbar-right">
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width:130px" @change="fetchList">
          <el-option label="全部" value="" />
          <el-option label="待处理" value="PENDING" />
          <el-option label="处理中" value="PROCESSING" />
          <el-option label="已完成" value="COMPLETED" />
          <el-option label="失败" value="FAILED" />
        </el-select>
        <el-button type="primary" @click="openCreate">生成结算单</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="settlementNo" label="结算单号" width="170" />
      <el-table-column label="结算周期" width="180"><template #default="{ row }">{{ row.startDate && row.endDate ? `${row.startDate} ~ ${row.endDate}` : row.period || '-' }}</template></el-table-column>
      <el-table-column label="金额" width="120"><template #default="{ row }">{{ row.amount != null ? Number(row.amount).toFixed(2) : '-' }}</template></el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="生成时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page" :total="total" :page-size="pageSize"
      layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog v-model="dialogVisible" title="生成结算单" width="500px">
      <el-form label-width="90px">
        <el-form-item label="开始日期" required>
          <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" placeholder="选择开始日期" style="width:100%" />
        </el-form-item>
        <el-form-item label="结束日期" required>
          <el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" placeholder="选择结束日期" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
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
