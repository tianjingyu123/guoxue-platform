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

const freezeVisible = ref(false)
const freezeForm = reactive({ userId: '', amount: null as number | null, orderId: '', reason: '' })

const unfreezeVisible = ref(false)
const unfreezeTarget = ref<any>(null)

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
function formatMoney(v: any) { return v != null ? '¥' + Number(v).toFixed(2) : '-' }

function statusTagType(status: string) {
  const m: Record<string, string> = { FROZEN: 'danger', UNFROZEN: 'success' }
  return m[status] || 'info'
}

function statusLabel(status: string) {
  const m: Record<string, string> = { FROZEN: '已冻结', UNFROZEN: '已解冻' }
  return m[status] || status
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await financeApi.listFreezes(params)
    list.value = data.records || data.data || []
    total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function openFreeze() {
  freezeForm.userId = ''
  freezeForm.amount = null
  freezeForm.orderId = ''
  freezeForm.reason = ''
  freezeVisible.value = true
}

async function submitFreeze() {
  if (!freezeForm.userId.trim()) { ElMessage.warning('请输入用户ID'); return }
  if (!freezeForm.amount || freezeForm.amount <= 0) { ElMessage.warning('请输入有效的冻结金额'); return }
  if (!freezeForm.reason.trim()) { ElMessage.warning('请输入冻结原因'); return }
  saving.value = true
  try {
    const payload: any = { userId: freezeForm.userId, amount: freezeForm.amount, reason: freezeForm.reason }
    if (freezeForm.orderId.trim()) payload.orderId = freezeForm.orderId
    await financeApi.freezeFund(payload)
    ElMessage.success('冻结成功')
    freezeVisible.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}

function openUnfreeze(row: any) {
  unfreezeTarget.value = row
  unfreezeVisible.value = true
}

async function submitUnfreeze() {
  if (!unfreezeTarget.value) return
  saving.value = true
  try {
    await financeApi.unfreezeFund({ orderId: unfreezeTarget.value.orderId, freezeId: unfreezeTarget.value.id })
    ElMessage.success('解冻成功')
    unfreezeVisible.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}

function handleExport() {
  exportCSV('资金冻结记录', [
    { label: '用户ID', key: 'userId' },
    { label: '订单ID', key: 'orderId' },
    { label: '金额', key: 'amount' },
    { label: '原因', key: 'reason' },
    { label: '状态', key: 'statusLabel' },
    { label: '操作人', key: 'operator' },
    { label: '冻结时间', key: 'createdAt' },
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
      <h3>资金冻结/解冻</h3>
      <div class="toolbar-right">
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width:130px" @change="fetchList">
          <el-option label="全部" value="" />
          <el-option label="已冻结" value="FROZEN" />
          <el-option label="已解冻" value="UNFROZEN" />
        </el-select>
        <el-button type="warning" @click="openFreeze">冻结资金</el-button>
        <el-button @click="handleExport">导出CSV</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="userId" label="用户ID" width="120" />
      <el-table-column prop="orderId" label="关联订单" width="150" show-overflow-tooltip />
      <el-table-column label="冻结金额" width="120">
        <template #default="{ row }"><span style="font-weight:600;color:#f56c6c">{{ formatMoney(row.amount) }}</span></template>
      </el-table-column>
      <el-table-column prop="reason" label="冻结原因" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="operator" label="操作人" width="120" />
      <el-table-column label="冻结时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'FROZEN'" size="small" type="success" @click="openUnfreeze(row)">解冻</el-button>
          <span v-else style="color:#999;font-size:12px">已解冻</span>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && list.length === 0" description="暂无冻结记录" style="margin-top:40px" />

    <el-pagination
      v-model:current-page="page" :total="total" :page-size="pageSize"
      layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <!-- 冻结弹窗 -->
    <el-dialog v-model="freezeVisible" title="冻结资金" width="480px">
      <el-alert type="warning" title="冻结操作将阻止用户提现和使用余额，请谨慎操作" show-icon :closable="false" style="margin-bottom:16px" />
      <el-form label-width="90px">
        <el-form-item label="用户ID" required>
          <el-input v-model="freezeForm.userId" placeholder="请输入用户ID" />
        </el-form-item>
        <el-form-item label="关联订单号">
          <el-input v-model="freezeForm.orderId" placeholder="选填，关联争议订单" />
        </el-form-item>
        <el-form-item label="冻结金额" required>
          <el-input-number v-model="freezeForm.amount" :min="0.01" :precision="2" style="width:100%" placeholder="请输入冻结金额" />
        </el-form-item>
        <el-form-item label="冻结原因" required>
          <el-input v-model="freezeForm.reason" type="textarea" :rows="3" placeholder="请输入冻结原因（必填）" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="freezeVisible = false">取消</el-button>
        <el-button type="danger" :loading="saving" @click="submitFreeze">确认冻结</el-button>
      </template>
    </el-dialog>

    <!-- 解冻确认弹窗 -->
    <el-dialog v-model="unfreezeVisible" title="解冻确认" width="480px">
      <el-alert type="info" title="解冻后资金状态将恢复正常" show-icon :closable="false" style="margin-bottom:16px" />
      <el-descriptions v-if="unfreezeTarget" :column="1" border size="small">
        <el-descriptions-item label="用户ID">{{ unfreezeTarget.userId }}</el-descriptions-item>
        <el-descriptions-item label="冻结金额"><span style="font-weight:600;color:#f56c6c">{{ formatMoney(unfreezeTarget.amount) }}</span></el-descriptions-item>
        <el-descriptions-item label="冻结原因">{{ unfreezeTarget.reason }}</el-descriptions-item>
        <el-descriptions-item label="冻结时间">{{ formatDate(unfreezeTarget.createdAt) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="unfreezeVisible = false">取消</el-button>
        <el-button type="success" :loading="saving" @click="submitUnfreeze">确认解冻</el-button>
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
