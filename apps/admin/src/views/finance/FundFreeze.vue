<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { financeApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const statusFilter = ref('')

const dialogVisible = ref(false)
const form = reactive({ userId: '', amount: null as number | null, reason: '' })

const confirmUnfreezeVisible = ref(false)
const unfreezeTarget = ref<any>(null)

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

function statusTagType(status: string) {
  switch (status) {
    case 'FROZEN': return 'danger'
    case 'UNFROZEN': return 'success'
    default: return 'info'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'FROZEN': return '已冻结'
    case 'UNFROZEN': return '已解冻'
    default: return status
  }
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
  form.userId = ''
  form.amount = null
  form.reason = ''
  dialogVisible.value = true
}

async function submitFreeze() {
  if (!form.userId) { ElMessage.warning('请输入用户ID'); return }
  if (!form.amount || form.amount <= 0) { ElMessage.warning('请输入有效的冻结金额'); return }
  if (!form.reason) { ElMessage.warning('请输入冻结原因'); return }
  saving.value = true
  try {
    await financeApi.freezeFund({
      userId: form.userId,
      amount: form.amount,
      reason: form.reason,
    })
    ElMessage.success('冻结成功')
    dialogVisible.value = false
    fetchList()
  } catch { ElMessage.error('冻结失败') } finally { saving.value = false }
}

function openUnfreeze(row: any) {
  unfreezeTarget.value = row
  confirmUnfreezeVisible.value = true
}

async function submitUnfreeze() {
  if (!unfreezeTarget.value) return
  saving.value = true
  try {
    await financeApi.unfreezeFund(unfreezeTarget.value.id)
    ElMessage.success('解冻成功')
    confirmUnfreezeVisible.value = false
    fetchList()
  } catch { ElMessage.error('解冻失败') } finally { saving.value = false }
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
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="userId" label="用户ID" width="120" />
      <el-table-column label="冻结金额" width="120"><template #default="{ row }">{{ row.amount != null ? Number(row.amount).toFixed(2) : '-' }}</template></el-table-column>
      <el-table-column prop="reason" label="原因" width="200" :show-overflow-tooltip="true" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="冻结时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
      <el-table-column prop="operator" label="操作人" width="120" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'FROZEN'" size="small" type="primary" @click="openUnfreeze(row)">解冻</el-button>
          <span v-if="row.status === 'UNFROZEN'" style="color:#999;font-size:12px">已解冻</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page" :total="total" :page-size="pageSize"
      layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog v-model="dialogVisible" title="冻结资金" width="450px">
      <el-form label-width="90px">
        <el-form-item label="用户ID" required>
          <el-input v-model="form.userId" placeholder="请输入用户ID" />
        </el-form-item>
        <el-form-item label="冻结金额" required>
          <el-input-number v-model="form.amount" :min="0.01" :precision="2" style="width:100%" placeholder="请输入冻结金额" />
        </el-form-item>
        <el-form-item label="原因" required>
          <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="请输入冻结原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="saving" @click="submitFreeze">确认冻结</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="confirmUnfreezeVisible" title="解冻资金" width="420px">
      <p style="margin-bottom:12px;color:#666">确定解冻该笔冻结资金？</p>
      <el-descriptions :column="1" border size="small" v-if="unfreezeTarget">
        <el-descriptions-item label="用户ID">{{ unfreezeTarget.userId }}</el-descriptions-item>
        <el-descriptions-item label="冻结金额">{{ unfreezeTarget.amount != null ? Number(unfreezeTarget.amount).toFixed(2) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="原因">{{ unfreezeTarget.reason }}</el-descriptions-item>
        <el-descriptions-item label="冻结时间">{{ formatDate(unfreezeTarget.createdAt) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="confirmUnfreezeVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitUnfreeze">确认解冻</el-button>
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
