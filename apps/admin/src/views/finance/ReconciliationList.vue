<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { financeApi } from '@/api'
import { exportCSV } from '@/utils/export'

const loading = ref(false)
const saving = ref(false)
const error = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const statusFilter = ref('')
const sourceFilter = ref('')
const generateVisible = ref(false)
const form = reactive({ period: '', source: 'WECHAT' })
const detailVisible = ref(false)
const detailData = ref<any>(null)

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
function formatMoney(v: any) { return v != null ? '¥' + Number(v).toFixed(2) : '-' }

// 后端字段：status = PENDING / MATCHED / MISMATCH
function statusTagType(status: string) {
  const m: Record<string, string> = { MATCHED: 'success', PENDING: 'warning', MISMATCH: 'danger' }
  return m[status] || 'info'
}
function statusLabel(status: string) {
  const m: Record<string, string> = { MATCHED: '已对平', PENDING: '待对账', MISMATCH: '有差异' }
  return m[status] || status
}
// 后端字段：source = WECHAT / ALIPAY / UNIONPAY
function sourceLabel(s: string) {
  const m: Record<string, string> = { WECHAT: '微信支付', ALIPAY: '支付宝', UNIONPAY: '银联' }
  return m[s] || s || '-'
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: any = { page: page.value, pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    if (sourceFilter.value) params.source = sourceFilter.value
    // 后端 getReconciliationList 返回 { records, total, page, pageSize }
    // 响应拦截器对 "records" 键不解包，故直接取 data.records
    const { data } = await financeApi.listReconciliations(params)
    list.value = data.records ?? data.items ?? []
    total.value = data.total ?? list.value.length
  } catch {
    error.value = true
    list.value = []
  } finally { loading.value = false }
}

function openGenerate() {
  form.period = ''
  form.source = 'WECHAT'
  generateVisible.value = true
}

async function doGenerate() {
  if (saving.value) return
  if (!form.period) { ElMessage.warning('请选择对账月份'); return }
  saving.value = true
  try {
    await financeApi.createReconciliation({ period: form.period, source: form.source })
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
    { label: '支付渠道', key: 'source' },
    { label: '账单日期', key: 'billDate' },
    { label: '账单总额', key: 'totalAmount' },
    { label: '匹配金额', key: 'matchAmount' },
    { label: '差异笔数', key: 'diffCount' },
    { label: '状态', key: 'statusLabel' },
    { label: '生成时间', key: 'createdAt' },
  ], list.value.map(r => ({
    ...r,
    source: sourceLabel(r.source),
    billDate: formatDate(r.billDate),
    totalAmount: formatMoney(r.totalAmount),
    matchAmount: formatMoney(r.matchAmount),
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
          v-model="sourceFilter"
          placeholder="渠道筛选"
          clearable
          style="width:120px"
          @change="fetchList"
        >
          <el-option
            label="全部渠道"
            value=""
          />
          <el-option
            label="微信支付"
            value="WECHAT"
          />
          <el-option
            label="支付宝"
            value="ALIPAY"
          />
          <el-option
            label="银联"
            value="UNIONPAY"
          />
        </el-select>
        <el-select
          v-model="statusFilter"
          placeholder="状态筛选"
          clearable
          style="width:120px"
          @change="fetchList"
        >
          <el-option
            label="全部状态"
            value=""
          />
          <el-option
            label="待对账"
            value="PENDING"
          />
          <el-option
            label="已对平"
            value="MATCHED"
          />
          <el-option
            label="有差异"
            value="MISMATCH"
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

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="对账记录加载出错，请重试"
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
          label="支付渠道"
          width="120"
        >
          <template #default="{ row }">
            {{ sourceLabel(row.source) }}
          </template>
        </el-table-column>
        <el-table-column
          label="账单日期"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.billDate) }}
          </template>
        </el-table-column>
        <el-table-column
          label="账单总额"
          width="130"
        >
          <template #default="{ row }">
            <span style="font-weight:600;color:#409eff">{{ formatMoney(row.totalAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="匹配金额"
          width="130"
        >
          <template #default="{ row }">
            {{ formatMoney(row.matchAmount) }}
          </template>
        </el-table-column>
        <el-table-column
          label="差异笔数"
          width="100"
        >
          <template #default="{ row }">
            <span :style="{ color: (row.diffCount || 0) > 0 ? '#f56c6c' : '#67c23a', fontWeight: (row.diffCount || 0) > 0 ? '600' : 'normal' }">
              {{ row.diffCount ?? 0 }}
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
    </template>

    <!-- 生成对账弹窗 -->
    <el-dialog
      v-model="generateVisible"
      title="生成对账"
      width="450px"
    >
      <el-form label-width="90px">
        <el-form-item
          label="支付渠道"
          required
        >
          <el-select
            v-model="form.source"
            style="width:100%"
          >
            <el-option
              label="微信支付"
              value="WECHAT"
            />
            <el-option
              label="支付宝"
              value="ALIPAY"
            />
            <el-option
              label="银联"
              value="UNIONPAY"
            />
          </el-select>
        </el-form-item>
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
        <el-descriptions-item label="支付渠道">
          {{ sourceLabel(detailData.source) }}
        </el-descriptions-item>
        <el-descriptions-item label="账单日期">
          {{ formatDate(detailData.billDate) }}
        </el-descriptions-item>
        <el-descriptions-item label="账单总额">
          <span style="font-weight:600;color:#409eff">{{ formatMoney(detailData.totalAmount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="匹配金额">
          {{ formatMoney(detailData.matchAmount) }}
        </el-descriptions-item>
        <el-descriptions-item label="差异笔数">
          <span :style="{ color: (detailData.diffCount || 0) > 0 ? '#f56c6c' : '#333', fontWeight: '600' }">{{ detailData.diffCount ?? 0 }}</span>
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
          v-if="detailData.detail?.orderCount != null"
          label="内部订单数"
        >
          {{ detailData.detail.orderCount }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.detail?.billEntryCount != null"
          label="账单笔数"
        >
          {{ detailData.detail.billEntryCount }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.detail?.billStatus"
          label="账单状态"
        >
          {{ detailData.detail.billStatus }}
        </el-descriptions-item>
        <el-descriptions-item
          label="生成时间"
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
