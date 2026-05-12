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
const form = reactive({ period: '' })

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

function statusTagType(status: string) {
  switch (status) {
    case 'COMPLETED': return 'success'
    case 'PENDING': return 'warning'
    case 'FAILED': return 'danger'
    default: return 'info'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'COMPLETED': return '已完成'
    case 'PENDING': return '待处理'
    case 'FAILED': return '失败'
    default: return status
  }
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await financeApi.listReconciliations(params)
    list.value = data.records || data.data || []
    total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function openCreate() {
  form.period = ''
  dialogVisible.value = true
}

async function save() {
  if (!form.period) { ElMessage.warning('请选择对账月份'); return }
  saving.value = true
  try {
    await financeApi.createReconciliation({ period: form.period })
    ElMessage.success('对账已生成')
    dialogVisible.value = false
    fetchList()
  } catch { ElMessage.error('生成对账失败') } finally { saving.value = false }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>对账记录</h3>
      <div class="toolbar-right">
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width:130px" @change="fetchList">
          <el-option label="全部" value="" />
          <el-option label="待处理" value="PENDING" />
          <el-option label="已完成" value="COMPLETED" />
          <el-option label="失败" value="FAILED" />
        </el-select>
        <el-button type="primary" @click="openCreate">生成对账</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="对账日期" width="120"><template #default="{ row }">{{ row.period || '-' }}</template></el-table-column>
      <el-table-column label="总收入" width="120"><template #default="{ row }">{{ row.totalIncome != null ? Number(row.totalIncome).toFixed(2) : '-' }}</template></el-table-column>
      <el-table-column label="平台收入" width="120"><template #default="{ row }">{{ row.platformIncome != null ? Number(row.platformIncome).toFixed(2) : '-' }}</template></el-table-column>
      <el-table-column label="分站收入" width="120"><template #default="{ row }">{{ row.stationIncome != null ? Number(row.stationIncome).toFixed(2) : '-' }}</template></el-table-column>
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

    <el-dialog v-model="dialogVisible" title="生成对账" width="450px">
      <el-form label-width="90px">
        <el-form-item label="对账月份" required>
          <el-date-picker v-model="form.period" type="month" value-format="YYYY-MM" placeholder="选择对账月份" style="width:100%" />
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
