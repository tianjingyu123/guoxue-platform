<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
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
const generateVisible = ref(false)
const form = reactive({ period: '' })
const detailVisible = ref(false)
const detailData = ref<any>(null)

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
function formatMoney(v: any) { return v != null ? '¥' + Number(v).toFixed(2) : '-' }

function statusTagType(status: string) {
  const m: Record<string, string> = { COMPLETED: 'success', PENDING: 'warning', FAILED: 'danger', PROCESSING: 'primary' }
  return m[status] || 'info'
}

function statusLabel(status: string) {
  const m: Record<string, string> = { COMPLETED: '已完成', PENDING: '待处理', FAILED: '失败', PROCESSING: '处理中' }
  return m[status] || status
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

function openGenerate() {
  form.period = ''
  generateVisible.value = true
}

async function doGenerate() {
  if (!form.period) { ElMessage.warning('请选择对账月份'); return }
  saving.value = true
  try {
    await financeApi.createReconciliation({ period: form.period })
    ElMessage.success('对账已生成')
    generateVisible.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}

async function viewDetail(row: any) {
  try {
    const { data } = await financeApi.getReconciliationDetail(row.id)
    detailData.value = data
    detailVisible.value = true
  } catch { }
}

function handleExport() {
  exportCSV('对账记录', [
    { label: '对账月份', key: 'period' },
    { label: '总收入', key: 'totalIncome' },
    { label: '平台收入', key: 'platformIncome' },
    { label: '分站收入', key: 'stationIncome' },
    { label: '差额', key: 'difference' },
    { label: '状态', key: 'statusLabel' },
    { label: '生成时间', key: 'createdAt' },
  ], list.value.map(r => ({
    ...r,
    totalIncome: formatMoney(r.totalIncome),
    platformIncome: formatMoney(r.platformIncome),
    stationIncome: formatMoney(r.stationIncome),
    difference: formatMoney(r.difference),
    statusLabel: statusLabel(r.status),
    createdAt: formatDate(r.createdAt),
  })))
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>对账记录</h3>
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
            label="已完成"
            value="COMPLETED"
          />
          <el-option
            label="失败"
            value="FAILED"
          />
        </el-select>
        <el-button
          type="primary"
          @click="openGenerate"
        >
          生成对账
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
        label="对账月份"
        width="120"
      >
        <template #default="{ row }">
          {{ row.period || '-' }}
        </template>
      </el-table-column>
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
        label="差额"
        width="120"
      >
        <template #default="{ row }">
          <span :style="{ color: Number(row.difference || 0) !== 0 ? '#f56c6c' : '#67c23a', fontWeight: Number(row.difference || 0) !== 0 ? '600' : 'normal' }">
            {{ formatMoney(row.difference) }}
          </span>
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
          {{ formatDate(row.createdAt) }}
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
      description="暂无对账记录"
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

    <!-- 生成对账弹窗 -->
    <el-dialog
      v-model="generateVisible"
      title="生成对账"
      width="450px"
    >
      <el-form label-width="90px">
        <el-form-item
          label="对账月份"
          required
        >
          <el-date-picker
            v-model="form.period"
            type="month"
            value-format="YYYY-MM"
            placeholder="选择对账月份"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doGenerate"
        >
          生成对账
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="对账详情"
      width="600px"
    >
      <el-descriptions
        v-if="detailData"
        :column="2"
        border
      >
        <el-descriptions-item
          label="对账月份"
          :span="2"
        >
          {{ detailData.period || '-' }}
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
        <el-descriptions-item label="差额">
          <span :style="{ color: Number(detailData.difference || 0) !== 0 ? '#f56c6c' : '#67c23a', fontWeight: '600' }">{{ formatMoney(detailData.difference) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag
            :type="statusTagType(detailData.status)"
            size="small"
          >
            {{ statusLabel(detailData.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="订单总数">
          {{ detailData.orderCount ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="对账订单数">
          {{ detailData.matchedCount ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="异常订单数">
          <span :style="{ color: (detailData.mismatchCount || 0) > 0 ? '#f56c6c' : '#333' }">{{ detailData.mismatchCount ?? 0 }}</span>
        </el-descriptions-item>
        <el-descriptions-item
          label="生成时间"
          :span="2"
        >
          {{ formatDate(detailData.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.remark"
          label="备注"
          :span="2"
        >
          {{ detailData.remark }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
.toolbar-right { display: flex; gap: 8px; align-items: center; }
</style>
