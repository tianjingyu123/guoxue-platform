<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { financeApi } from '@/api'
import { exportCSV } from '@/utils/export'

// 财务月报行（指标展平为一层后的宽松本地类型）
interface ReportRow {
  period?: string
  revenue?: number
  refund?: number
  commissionExpense?: number
  userEarningExpense?: number
  netProfit?: number
  revenueOrderCount?: number
  refundOrderCount?: number
  commissionCount?: number
  userEarningCount?: number
  generatedAt?: string
  createdAt?: string
}

const loading = ref(false)
const saving = ref(false)
const error = ref(false)
const list = ref<ReportRow[]>([])

const month = ref('')

const detailVisible = ref(false)
const detailData = ref<ReportRow | null>(null)

onMounted(() => fetchList())

function formatDate(d?: string) { return d ? new Date(d).toLocaleString() : '-' }
function formatMoney(v: number | string | null | undefined) { return v != null ? '¥' + Number(v).toFixed(2) : '-' }

// 已保存的 FinancialReport 记录指标存于 data(Json)；新生成(未保存)对象指标在顶层。
// 统一展平为一层，便于表格/详情读取真实字段。（r 为原始接口对象，结构含嵌套 data，保留 any）
function flattenReport(r: any): ReportRow {
  if (r && r.data && typeof r.data === 'object') {
    return { ...r, ...r.data }
  }
  return r || {}
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    // 无月份：返回所有已保存月报(数组)；有月份：返回单条报表对象
    const { data } = await financeApi.getMonthlyReport(month.value || '')
    const arr = Array.isArray(data) ? data : (data ? [data] : [])
    list.value = arr.map(flattenReport)
  } catch {
    error.value = true
    list.value = []
  } finally { loading.value = false }
}

async function generateReport() {
  if (saving.value) return
  if (!month.value) { ElMessage.warning('请先选择月份'); return }
  saving.value = true
  try {
    await financeApi.generateMonthlyReport(month.value)
    ElMessage.success('月报已生成')
    fetchList()
  } catch { } finally { saving.value = false }
}

function viewDetail(row: ReportRow) { detailData.value = row; detailVisible.value = true }

function handleExport() {
  exportCSV(`财务报表_${month.value || '全部'}`, [
    { label: '周期', key: 'period' },
    { label: '营收', key: 'revenue' },
    { label: '退款', key: 'refund' },
    { label: '分佣支出', key: 'commissionExpense' },
    { label: '创作者收益支出', key: 'userEarningExpense' },
    { label: '净利润', key: 'netProfit' },
    { label: '订单数', key: 'revenueOrderCount' },
  ], list.value.map(r => ({
    ...r,
    revenue: formatMoney(r.revenue),
    refund: formatMoney(r.refund),
    commissionExpense: formatMoney(r.commissionExpense),
    userEarningExpense: formatMoney(r.userEarningExpense),
    netProfit: formatMoney(r.netProfit),
  })))
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>财务报表</h3>
      <div class="toolbar-right">
        <el-date-picker
          v-model="month"
          type="month"
          value-format="YYYY-MM"
          placeholder="选择月份（不选则显示全部已保存）"
          clearable
          style="width:240px"
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

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="报表数据加载出错，请重试"
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
          prop="period"
          label="周期"
          width="110"
        />
        <el-table-column
          label="营收"
          width="140"
        >
          <template #default="{ row }">
            <span style="font-weight:600;color:#409eff">{{ formatMoney(row.revenue) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="退款"
          width="130"
        >
          <template #default="{ row }">
            <span style="color:#f56c6c">{{ formatMoney(row.refund) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="分佣支出"
          width="130"
        >
          <template #default="{ row }">
            {{ formatMoney(row.commissionExpense) }}
          </template>
        </el-table-column>
        <el-table-column
          label="净利润"
          width="140"
        >
          <template #default="{ row }">
            <span
              style="font-weight:600"
              :style="{ color: Number(row.netProfit) >= 0 ? '#67c23a' : '#f56c6c' }"
            >{{ formatMoney(row.netProfit) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="订单数"
          width="90"
        >
          <template #default="{ row }">
            {{ row.revenueOrderCount ?? '-' }}
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
    </template>

    <el-dialog
      v-model="detailVisible"
      title="报表详情"
      width="640px"
    >
      <el-descriptions
        v-if="detailData"
        :column="3"
        border
      >
        <el-descriptions-item
          label="周期"
          :span="3"
        >
          {{ detailData.period || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="营收">
          <span style="font-weight:600;color:#409eff">{{ formatMoney(detailData.revenue) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="营收订单数">
          {{ detailData.revenueOrderCount ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="退款">
          <span style="color:#f56c6c">{{ formatMoney(detailData.refund) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="退款订单数">
          {{ detailData.refundOrderCount ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="分佣支出">
          {{ formatMoney(detailData.commissionExpense) }}
        </el-descriptions-item>
        <el-descriptions-item label="分佣笔数">
          {{ detailData.commissionCount ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="创作者收益支出">
          {{ formatMoney(detailData.userEarningExpense) }}
        </el-descriptions-item>
        <el-descriptions-item label="收益笔数">
          {{ detailData.userEarningCount ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="净利润">
          <span
            style="font-weight:600"
            :style="{ color: Number(detailData.netProfit) >= 0 ? '#67c23a' : '#f56c6c' }"
          >{{ formatMoney(detailData.netProfit) }}</span>
        </el-descriptions-item>
        <el-descriptions-item
          label="生成时间"
          :span="2"
        >
          {{ formatDate(detailData.generatedAt || detailData.createdAt) }}
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
