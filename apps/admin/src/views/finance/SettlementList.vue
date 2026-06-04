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
const generateVisible = ref(false)
const form = reactive({ startDate: '', endDate: '' })
const detailVisible = ref(false)
const detailData = ref<any>(null)

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
function formatMoney(v: any) { return v != null ? '¥' + Number(v).toFixed(2) : '-' }

function statusTagType(status: string) {
  const m: Record<string, string> = { COMPLETED: 'success', PENDING: 'warning', PROCESSING: 'primary', FAILED: 'danger' }
  return m[status] || 'info'
}

function statusLabel(status: string) {
  const m: Record<string, string> = { COMPLETED: '已完成', PENDING: '待处理', PROCESSING: '处理中', FAILED: '失败' }
  return m[status] || status
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

function viewDetail(row: any) { detailData.value = row; detailVisible.value = true }

function openGenerate() {
  form.startDate = ''
  form.endDate = ''
  generateVisible.value = true
}

async function doGenerate() {
  if (!form.startDate || !form.endDate) { ElMessage.warning('请选择结算周期'); return }
  if (form.startDate > form.endDate) { ElMessage.warning('开始日期不能晚于结束日期'); return }
  saving.value = true
  try {
    await financeApi.generateSettlement({ startDate: form.startDate, endDate: form.endDate })
    ElMessage.success('结算单已生成')
    generateVisible.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}

async function doApprove(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定审批通过结算单 ${row.settlementNo}？\n金额：${formatMoney(row.amount)}`,
      '审批确认',
      { type: 'warning', confirmButtonText: '审批通过', cancelButtonText: '取消' }
    )
    await financeApi.approveSettlement(row.id)
    ElMessage.success('已审批')
    fetchList()
  } catch { /* 取消 */ }
}

async function doPay(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认已完成结算单 ${row.settlementNo} 的打款？\n金额：${formatMoney(row.amount)}`,
      '确认打款',
      { type: 'warning', confirmButtonText: '确认已打款', cancelButtonText: '取消' }
    )
    await financeApi.paySettlement(row.id)
    ElMessage.success('已标记打款')
    fetchList()
  } catch { /* 取消 */ }
}

function handleExport() {
  exportCSV('结算单列表', [
    { label: '结算单号', key: 'settlementNo' },
    { label: '结算周期', key: 'period' },
    { label: '金额', key: 'amount' },
    { label: '状态', key: 'statusLabel' },
    { label: '生成时间', key: 'createdAt' },
  ], list.value.map(r => ({
    ...r,
    period: r.startDate && r.endDate ? `${r.startDate} ~ ${r.endDate}` : r.period,
    amount: formatMoney(r.amount),
    statusLabel: statusLabel(r.status),
    createdAt: formatDate(r.createdAt),
  })))
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>结算单管理</h3>
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
            label="处理中"
            value="PROCESSING"
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
          生成结算单
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
        prop="settlementNo"
        label="结算单号"
        width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="结算周期"
        width="220"
      >
        <template #default="{ row }">
          {{ row.startDate && row.endDate ? `${row.startDate} ~ ${row.endDate}` : row.period || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="金额"
        width="130"
      >
        <template #default="{ row }">
          <span style="font-weight:600">{{ formatMoney(row.amount) }}</span>
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
        width="240"
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
            @click="doApprove(row)"
          >
            审批
          </el-button>
          <el-button
            v-if="row.status === 'APPROVED' || row.status === 'PROCESSING'"
            size="small"
            type="primary"
            @click="doPay(row)"
          >
            打款
          </el-button>
          <span
            v-if="row.status === 'COMPLETED'"
            style="color:#67c23a;font-size:12px"
          >✓ 已完成</span>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!loading && list.length === 0"
      description="暂无结算单"
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

    <!-- 生成结算单弹窗 -->
    <el-dialog
      v-model="generateVisible"
      title="生成结算单"
      width="500px"
    >
      <el-form label-width="90px">
        <el-form-item
          label="开始日期"
          required
        >
          <el-date-picker
            v-model="form.startDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择开始日期"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item
          label="结束日期"
          required
        >
          <el-date-picker
            v-model="form.endDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择结束日期"
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
          生成结算单
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="结算单详情"
      width="550px"
    >
      <el-descriptions
        v-if="detailData"
        :column="2"
        border
      >
        <el-descriptions-item
          label="结算单号"
          :span="2"
        >
          {{ detailData.settlementNo || '-' }}
        </el-descriptions-item>
        <el-descriptions-item
          label="结算周期"
          :span="2"
        >
          {{ detailData.startDate && detailData.endDate ? `${detailData.startDate} ~ ${detailData.endDate}` : detailData.period || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="金额">
          <span style="font-weight:600;color:#e6a23c">{{ formatMoney(detailData.amount) }}</span>
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
          v-if="detailData.orderCount"
          label="订单数"
        >
          {{ detailData.orderCount }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.userName"
          label="结算对象"
        >
          {{ detailData.userName }}
        </el-descriptions-item>
        <el-descriptions-item
          label="生成时间"
          :span="2"
        >
          {{ formatDate(detailData.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.approvedAt"
          label="审批时间"
          :span="2"
        >
          {{ formatDate(detailData.approvedAt) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.paidAt"
          label="打款时间"
          :span="2"
        >
          {{ formatDate(detailData.paidAt) }}
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
