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
const month = ref('')

const detailDialogVisible = ref(false)
const detailData = ref<any>(null)

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
    const { data } = await financeApi.listReports(params)
    list.value = data.records || data.data || []
    total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

async function generateReport() {
  if (!month.value) { ElMessage.warning('请先选择月份'); return }
  saving.value = true
  try {
    await financeApi.generateReport('MONTHLY', month.value)
    ElMessage.success('月报已生成')
    month.value = ''
    fetchList()
  } catch { ElMessage.error('生成月报失败') } finally { saving.value = false }
}

function openDetail(row: any) {
  detailData.value = row
  detailDialogVisible.value = true
}

function handleExport() {
  ElMessage.info('导出功能开发中')
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>财务报表</h3>
      <div class="toolbar-right">
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width:130px" @change="fetchList">
          <el-option label="全部" value="" />
          <el-option label="待处理" value="PENDING" />
          <el-option label="已完成" value="COMPLETED" />
          <el-option label="失败" value="FAILED" />
        </el-select>
        <el-date-picker v-model="month" type="month" value-format="YYYY-MM" placeholder="选择月份" style="width:150px" />
        <el-button type="primary" :loading="saving" @click="generateReport">生成月报</el-button>
        <el-button @click="handleExport">导出</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="month" label="月份" width="100" />
      <el-table-column label="总收入" width="120"><template #default="{ row }">{{ row.totalIncome != null ? Number(row.totalIncome).toFixed(2) : '-' }}</template></el-table-column>
      <el-table-column label="平台收入" width="120"><template #default="{ row }">{{ row.platformIncome != null ? Number(row.platformIncome).toFixed(2) : '-' }}</template></el-table-column>
      <el-table-column label="分站收入" width="120"><template #default="{ row }">{{ row.stationIncome != null ? Number(row.stationIncome).toFixed(2) : '-' }}</template></el-table-column>
      <el-table-column label="订单数" width="90"><template #default="{ row }">{{ row.orderCount ?? '-' }}</template></el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="生成时间" width="170"><template #default="{ row }">{{ formatDate(row.generatedAt || row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row)">查看详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && list.length === 0" description="暂无财务报表数据" style="margin-top:40px" />

    <el-pagination
      v-model:current-page="page" :total="total" :page-size="pageSize"
      layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog v-model="detailDialogVisible" title="报表详情" width="600px">
      <el-descriptions v-if="detailData" :column="2" border>
        <el-descriptions-item label="月份" :span="2">{{ detailData.month }}</el-descriptions-item>
        <el-descriptions-item label="总收入">{{ detailData.totalIncome != null ? Number(detailData.totalIncome).toFixed(2) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="平台收入">{{ detailData.platformIncome != null ? Number(detailData.platformIncome).toFixed(2) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="分站收入">{{ detailData.stationIncome != null ? Number(detailData.stationIncome).toFixed(2) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="订单数">{{ detailData.orderCount ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="总支出">{{ detailData.totalExpense != null ? Number(detailData.totalExpense).toFixed(2) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="净利润">{{ detailData.netProfit != null ? Number(detailData.netProfit).toFixed(2) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(detailData.status)" size="small">{{ statusLabel(detailData.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="生成时间" :span="2">{{ formatDate(detailData.generatedAt || detailData.createdAt) }}</el-descriptions-item>
        <el-descriptions-item v-if="detailData.remark" label="备注" :span="2">{{ detailData.remark }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
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
