<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { financeApi } from '@/api'
import { exportCSV } from '@/utils/export'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const statusFilter = ref('')
const month = ref('')

const detailVisible = ref(false)
const detailData = ref<any>(null)

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
function formatMoney(v: any) { return v != null ? '¥' + Number(v).toFixed(2) : '-' }

function statusTagType(status: string) {
  const m: Record<string, string> = { COMPLETED: 'success', PENDING: 'warning', FAILED: 'danger' }
  return m[status] || 'info'
}

function statusLabel(status: string) {
  const m: Record<string, string> = { COMPLETED: '已完成', PENDING: '生成中', FAILED: '失败' }
  return m[status] || status
}

async function fetchList() {
  // 报表列表暂时用月度查询，有月份时拉取具体月报
  if (!month.value) {
    loading.value = true
    try {
      const params: any = { page: page.value, pageSize }
      if (statusFilter.value) params.status = statusFilter.value
      const { data } = await financeApi.getMonthlyReport('')
      list.value = data.records || data.data || (data ? [data] : [])
      total.value = data.total || list.value.length
    } catch { list.value = [] } finally { loading.value = false }
    return
  }
  loading.value = true
  try {
    const { data } = await financeApi.getMonthlyReport(month.value)
    list.value = data.records || data.data || (data ? [data] : [])
    total.value = data.total || list.value.length
  } catch { list.value = [] } finally { loading.value = false }
}

async function generateReport() {
  if (!month.value) { ElMessage.warning('请先选择月份'); return }
  saving.value = true
  try {
    await financeApi.generateMonthlyReport(month.value)
    ElMessage.success('月报已生成')
    fetchList()
  } catch { } finally { saving.value = false }
}

function viewDetail(row: any) { detailData.value = row; detailVisible.value = true }

function handleExport() {
  exportCSV(`财务报表_${month.value || '全部'}`, [
    { label: '月份', key: 'month' },
    { label: '总收入', key: 'totalIncome' },
    { label: '平台收入', key: 'platformIncome' },
    { label: '分站收入', key: 'stationIncome' },
    { label: '订单数', key: 'orderCount' },
    { label: '净利润', key: 'netProfit' },
    { label: '状态', key: 'statusLabel' },
  ], list.value.map(r => ({
    ...r,
    totalIncome: formatMoney(r.totalIncome),
    platformIncome: formatMoney(r.platformIncome),
    stationIncome: formatMoney(r.stationIncome),
    netProfit: formatMoney(r.netProfit),
    statusLabel: statusLabel(r.status),
  })))
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>财务报表</h3>
      <div class="toolbar-right">
        <el-select
          v-model="statusFilter"
          placeholder="状态筛选"
          clearable
          style="width:120px"
          @change="fetchList"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="已完成"
            value="COMPLETED"
          />
          <el-option
            label="生成中"
            value="PENDING"
          />
          <el-option
            label="失败"
            value="FAILED"
          />
        </el-select>
        <el-date-picker
          v-model="month"
          type="month"
          value-format="YYYY-MM"
          placeholder="选择月份"
          style="width:150px"
          @change="fetchList"
        />
        <el-button
          type="primary"
          :loading="saving"
          @click="generateReport"
        >
          生成月报
        </el-button>
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
        prop="month"
        label="月份"
        width="100"
      />
      <el-table-column
        label="总收入"
        width="130"
      >
        <template #default="{ row }">
          <span style="font-weight:600;color:#409eff">{{ formatMoney(row.totalIncome) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="平台收入"
        width="130"
      >
        <template #default="{ row }">
          {{ formatMoney(row.platformIncome) }}
        </template>
      </el-table-column>
      <el-table-column
        label="分站收入"
        width="130"
      >
        <template #default="{ row }">
          {{ formatMoney(row.stationIncome) }}
        </template>
      </el-table-column>
      <el-table-column
        label="订单数"
        width="90"
      >
        <template #default="{ row }">
          {{ row.orderCount ?? '-' }}
        </template>
      </el-table-column>
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
        label="生成时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.generatedAt || row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="100"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="viewDetail(row)"
          >
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!loading && list.length === 0"
      description="暂无报表数据，请选择月份生成"
      style="margin-top:40px"
    />

    <el-pagination
      v-if="total > pageSize"
      v-model:current-page="page"
      :total="total"
      :page-size="pageSize"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog
      v-model="detailVisible"
      title="报表详情"
      width="600px"
    >
      <el-descriptions
        v-if="detailData"
        :column="3"
        border
      >
        <el-descriptions-item
          label="月份"
          :span="3"
        >
          {{ detailData.month || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="总收入">
          <span style="font-weight:600;color:#409eff">{{ formatMoney(detailData.totalIncome) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="平台收入">
          {{ formatMoney(detailData.platformIncome) }}
        </el-descriptions-item>
        <el-descriptions-item label="分站收入">
          {{ formatMoney(detailData.stationIncome) }}
        </el-descriptions-item>
        <el-descriptions-item label="订单数">
          {{ detailData.orderCount ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="退款金额">
          {{ formatMoney(detailData.refundAmount) }}
        </el-descriptions-item>
        <el-descriptions-item label="退款率">
          {{ detailData.refundRate != null ? (Number(detailData.refundRate) * 100).toFixed(2) + '%' : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="总支出">
          {{ formatMoney(detailData.totalExpense) }}
        </el-descriptions-item>
        <el-descriptions-item label="净利润">
          <span
            style="font-weight:600"
            :style="{ color: Number(detailData.netProfit) >= 0 ? '#67c23a' : '#f56c6c' }"
          >{{ formatMoney(detailData.netProfit) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag
            :type="statusTagType(detailData.status)"
            size="small"
          >
            {{ statusLabel(detailData.status) }}
          </el-tag>
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
