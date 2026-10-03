<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { financeApi } from '@/api'
import { exportCSV } from '@/utils/export'

// 资金冻结记录行（列表元素为含 frozenAmount 的 Order 记录）
interface FreezeRow {
  id: string
  userId?: string
  frozenAmount?: number
  payAmount?: number
  amount?: number
  updatedAt: string
}

const loading = ref(false)
const saving = ref(false)
const error = ref(false)
const list = ref<FreezeRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
// 按订单号筛选（后端 getFreezeRecords 支持 orderId 参数）
const filterOrderId = ref('')

const freezeVisible = ref(false)
const freezeForm = reactive({ userId: '', amount: null as number | null, orderId: '', reason: '' })

const unfreezeVisible = ref(false)
const unfreezeTarget = ref<FreezeRow | null>(null)
const unfreezeReason = ref('')

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '—' }
function formatMoney(v: number | string | null | undefined) {
  if (v == null) return '—'
  return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize }
    if (filterOrderId.value.trim()) params.orderId = filterOrderId.value.trim()
    // 后端 getFreezeRecords 返回 { items, total, ... }，列表元素为含 frozenAmount 的 Order 记录
    const { data } = await financeApi.listFreezes(params)
    list.value = data.items ?? []
    total.value = data.total ?? list.value.length
  } catch {
    error.value = true
    list.value = []
  } finally { loading.value = false }
}

function openFreeze() {
  freezeForm.userId = ''
  freezeForm.amount = null
  freezeForm.orderId = ''
  freezeForm.reason = ''
  freezeVisible.value = true
}

async function submitFreeze() {
  if (saving.value) return
  if (!freezeForm.userId.trim() && !freezeForm.orderId.trim()) { ElMessage.warning('请输入用户ID或订单号'); return }
  if (!freezeForm.amount || freezeForm.amount <= 0) { ElMessage.warning('请输入有效的冻结金额'); return }
  if (!freezeForm.reason.trim()) { ElMessage.warning('请输入冻结原因'); return }
  saving.value = true
  try {
    const payload: Record<string, string | number> = { amount: freezeForm.amount, reason: freezeForm.reason }
    if (freezeForm.userId.trim()) payload.userId = freezeForm.userId
    if (freezeForm.orderId.trim()) payload.orderId = freezeForm.orderId
    await financeApi.freezeFund(payload)
    ElMessage.success('冻结成功')
    freezeVisible.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}

function openUnfreeze(row: FreezeRow) {
  unfreezeTarget.value = row
  unfreezeReason.value = ''
  unfreezeVisible.value = true
}

async function submitUnfreeze() {
  if (saving.value) return
  if (!unfreezeTarget.value) return
  saving.value = true
  try {
    // 后端 unfreezeAmount 仅需 { orderId, reason? }；列表记录即订单，orderId = 记录 id
    await financeApi.unfreezeFund({ orderId: unfreezeTarget.value.id, reason: unfreezeReason.value || undefined })
    ElMessage.success('解冻成功')
    unfreezeVisible.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}

function handleExport() {
  exportCSV('资金冻结记录', [
    { label: '订单号', key: 'id' },
    { label: '用户ID', key: 'userId' },
    { label: '冻结金额', key: 'frozenAmount' },
    { label: '订单金额', key: 'payAmount' },
    { label: '冻结时间', key: 'updatedAt' },
  ], list.value.map(r => ({
    ...r,
    frozenAmount: formatMoney(r.frozenAmount),
    payAmount: formatMoney(r.payAmount ?? r.amount),
    updatedAt: formatDate(r.updatedAt),
  })))
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>资金冻结/解冻</h3>
      <div class="toolbar-right">
        <el-input
          v-model="filterOrderId"
          placeholder="按订单号筛选"
          clearable
          style="width:220px"
          @clear="page = 1; fetchList()"
          @keyup.enter="page = 1; fetchList()"
        />
        <el-button @click="page = 1; fetchList()">
          查询
        </el-button>
        <el-button
          type="warning"
          @click="openFreeze"
        >
          冻结资金
        </el-button>
        <el-button @click="handleExport">
          导出CSV
        </el-button>
      </div>
    </div>

    <!-- 冻结能力真实口径说明（诚实：拦截随最新后端部署生效） -->
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
      title="冻结生效范围：用户名下存在冻结资金期间，其提现审批与打款将被拦截"
      description="拦截能力随最新后端部署生效，部署前冻结仅记录、不拦截出款。每次冻结/解冻的操作人、金额与原因均写入审计日志（系统-审计日志可查），本列表为订单快照、不含原因字段。"
    />

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="冻结记录加载出错，请重试"
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
          label="订单号"
          width="200"
          show-overflow-tooltip
        />
        <el-table-column
          prop="userId"
          label="用户ID"
          width="160"
          show-overflow-tooltip
        />
        <el-table-column
          label="冻结金额"
          width="130"
          align="right"
        >
          <template #default="{ row }">
            <span style="font-weight:600;color:#f56c6c">{{ formatMoney(row.frozenAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="订单金额"
          width="130"
          align="right"
        >
          <template #default="{ row }">
            {{ formatMoney(row.payAmount ?? row.amount) }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
        >
          <template #default>
            <el-tag
              type="danger"
              size="small"
            >
              已冻结
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="冻结时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
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
              type="success"
              @click="openUnfreeze(row)"
            >
              解冻
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && list.length === 0"
        :description="filterOrderId ? '该订单号下无冻结记录，换个订单号试试' : '暂无冻结中的资金'"
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

    <!-- 冻结弹窗 -->
    <el-dialog
      v-model="freezeVisible"
      title="冻结资金"
      width="480px"
    >
      <el-alert
        type="warning"
        title="冻结期间该用户的提现将不予通过与打款，请谨慎操作"
        description="操作人与冻结原因将写入审计日志备查。冻结金额不应超过订单实付金额（超出部分无实际资金对应）。"
        show-icon
        :closable="false"
        style="margin-bottom:16px"
      />
      <el-form label-width="90px">
        <el-form-item label="用户ID">
          <el-input
            v-model="freezeForm.userId"
            placeholder="按用户冻结其首笔已支付订单"
          />
        </el-form-item>
        <el-form-item label="订单号">
          <el-input
            v-model="freezeForm.orderId"
            placeholder="按指定订单冻结（与用户ID二选一）"
          />
        </el-form-item>
        <el-form-item
          label="冻结金额"
          required
        >
          <el-input-number
            v-model="freezeForm.amount"
            :min="0.01"
            :precision="2"
            style="width:100%"
            placeholder="请输入冻结金额"
          />
        </el-form-item>
        <el-form-item
          label="冻结原因"
          required
        >
          <el-input
            v-model="freezeForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入冻结原因（必填）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="freezeVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="saving"
          @click="submitFreeze"
        >
          确认冻结
        </el-button>
      </template>
    </el-dialog>

    <!-- 解冻确认弹窗 -->
    <el-dialog
      v-model="unfreezeVisible"
      title="解冻确认"
      width="480px"
    >
      <el-alert
        type="info"
        title="解冻后资金状态将恢复正常"
        show-icon
        :closable="false"
        style="margin-bottom:16px"
      />
      <el-descriptions
        v-if="unfreezeTarget"
        :column="1"
        border
        size="small"
        style="margin-bottom:16px"
      >
        <el-descriptions-item label="订单号">
          {{ unfreezeTarget.id }}
        </el-descriptions-item>
        <el-descriptions-item label="用户ID">
          {{ unfreezeTarget.userId }}
        </el-descriptions-item>
        <el-descriptions-item label="冻结金额">
          <span style="font-weight:600;color:#f56c6c">{{ formatMoney(unfreezeTarget.frozenAmount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="冻结时间">
          {{ formatDate(unfreezeTarget.updatedAt) }}
        </el-descriptions-item>
      </el-descriptions>
      <el-input
        v-model="unfreezeReason"
        type="textarea"
        :rows="2"
        placeholder="解冻原因（选填）"
        maxlength="200"
      />
      <template #footer>
        <el-button @click="unfreezeVisible = false">
          取消
        </el-button>
        <el-button
          type="success"
          :loading="saving"
          @click="submitUnfreeze"
        >
          确认解冻
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.toolbar-right { display: flex; gap: 8px; align-items: center; }
</style>
