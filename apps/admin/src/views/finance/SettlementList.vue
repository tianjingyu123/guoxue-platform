<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { financeApi } from '@/api'
import { exportCSV } from '@/utils/export'

// 结算单行（按列配置与模板访问字段定义的宽松本地类型；detail 含嵌套汇总，置为必填以满足模板内裸访问）
interface SettlementRow {
  id: string
  period?: string
  userId?: string
  amount?: number
  status: string
  createdAt: string
  paidAt?: string
  approvedBy?: string
  detail: { summary: { totalRmbEarning?: number; totalCommission?: number } }
}

const loading = ref(false)
const saving = ref(false)
const error = ref(false)
const list = ref<SettlementRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const statusFilter = ref('')
const generateVisible = ref(false)
const form = reactive({ startDate: '', endDate: '' })
const detailVisible = ref(false)
const detailData = ref<SettlementRow | null>(null)

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
function formatMoney(v: number | string | null | undefined) { return v != null ? '¥' + Number(v).toFixed(2) : '-' }

// 后端字段：status = PENDING / APPROVED / PAID / REJECTED
function statusTagType(status: string) {
  const m: Record<string, string> = { PAID: 'success', APPROVED: 'primary', PENDING: 'warning', REJECTED: 'danger' }
  return m[status] || 'info'
}
function statusLabel(status: string) {
  const m: Record<string, string> = { PAID: '已打款', APPROVED: '已审批', PENDING: '待审批', REJECTED: '已驳回' }
  return m[status] || status
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    // 后端 getSettlementList 返回 { settlements, total, page, pageSize }，"settlements" 键不被拦截器解包
    const { data } = await financeApi.listSettlements(params)
    list.value = data.settlements ?? data.items ?? []
    total.value = data.total ?? list.value.length
  } catch {
    error.value = true
    list.value = []
  } finally { loading.value = false }
}

function viewDetail(row: SettlementRow) { detailData.value = row; detailVisible.value = true }

function openGenerate() {
  form.startDate = ''
  form.endDate = ''
  generateVisible.value = true
}

async function doGenerate() {
  if (saving.value) return
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

async function doApprove(row: SettlementRow) {
  try {
    await ElMessageBox.confirm(
      `确定审批通过 ${row.period} 结算单？\n金额：${formatMoney(row.amount)}`,
      '审批确认',
      { type: 'warning', confirmButtonText: '审批通过', cancelButtonText: '取消' }
    )
    await financeApi.approveSettlement(row.id)
    ElMessage.success('已审批')
    fetchList()
  } catch { /* 取消 */ }
}

async function doPay(row: SettlementRow) {
  try {
    await ElMessageBox.confirm(
      `确认已完成 ${row.period} 结算单的打款？\n金额：${formatMoney(row.amount)}`,
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
    { label: '结算单号', key: 'id' },
    { label: '结算周期', key: 'period' },
    { label: '结算对象', key: 'userId' },
    { label: '金额', key: 'amount' },
    { label: '状态', key: 'statusLabel' },
    { label: '生成时间', key: 'createdAt' },
  ], list.value.map(r => ({
    ...r,
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
            label="待审批"
            value="PENDING"
          />
          <el-option
            label="已审批"
            value="APPROVED"
          />
          <el-option
            label="已打款"
            value="PAID"
          />
          <el-option
            label="已驳回"
            value="REJECTED"
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

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="结算单加载出错，请重试"
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
          prop="id"
          label="结算单号"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="period"
          label="结算周期"
          width="140"
        />
        <el-table-column
          prop="userId"
          label="结算对象"
          width="160"
          show-overflow-tooltip
        />
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
              v-if="row.status === 'APPROVED'"
              size="small"
              type="primary"
              @click="doPay(row)"
            >
              打款
            </el-button>
            <span
              v-else-if="row.status === 'PAID'"
              style="color:#67c23a;font-size:12px"
            >✓ 已打款</span>
            <span
              v-else-if="row.status === 'REJECTED'"
              style="color:#f56c6c;font-size:12px"
            >✗ 已驳回</span>
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
    </template>

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
          {{ detailData.id || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="结算周期">
          {{ detailData.period || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="结算对象">
          {{ detailData.userId || '-' }}
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
          v-if="detailData.detail?.summary?.totalRmbEarning != null"
          label="收益合计"
        >
          {{ formatMoney(detailData.detail.summary.totalRmbEarning) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.detail?.summary?.totalCommission != null"
          label="分佣合计"
        >
          {{ formatMoney(detailData.detail.summary.totalCommission) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.approvedBy"
          label="审批人"
          :span="2"
        >
          {{ detailData.approvedBy }}
        </el-descriptions-item>
        <el-descriptions-item
          label="生成时间"
          :span="2"
        >
          {{ formatDate(detailData.createdAt) }}
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
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.toolbar-right { display: flex; gap: 8px; align-items: center; }
</style>
