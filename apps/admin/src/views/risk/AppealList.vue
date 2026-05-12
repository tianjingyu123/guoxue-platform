<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { riskApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)

const statusFilter = ref('')
const typeFilter = ref('')

const rejectDialogVisible = ref(false)
const rejectId = ref('')
const rejectForm = reactive({ reason: '' })

const detailDialogVisible = ref(false)
const detailData = ref<any>(null)

const appealTypeOptions = [
  { label: '封号申诉', value: 'BAN' },
  { label: '交易纠纷', value: 'TRADE_DISPUTE' },
  { label: '内容申诉', value: 'CONTENT' },
]

onMounted(() => fetchList())

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

function getTypeLabel(type: string): string {
  const opt = appealTypeOptions.find(t => t.value === type)
  return opt ? opt.label : type
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = { PENDING: '待处理', APPROVED: '已通过', REJECTED: '已驳回' }
  return map[status] || status
}

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: 20 }
    if (statusFilter.value) params.status = statusFilter.value
    if (typeFilter.value) params.type = typeFilter.value
    const { data } = await riskApi.listAppeals(params)
    list.value = data.appeals || data.data || []
    total.value = data.total || 0
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

async function approve(id: string) {
  try {
    await ElMessageBox.confirm('确认通过该申诉？', '提示', {
      type: 'info',
      confirmButtonText: '确认通过',
      cancelButtonText: '取消',
    })
    await riskApi.approveAppeal(id)
    ElMessage.success('已通过')
    fetchList()
  } catch {
    // cancelled
  }
}

function openReject(id: string) {
  rejectId.value = id
  rejectForm.reason = ''
  rejectDialogVisible.value = true
}

async function reject() {
  if (!rejectForm.reason.trim()) {
    ElMessage.warning('请输入驳回理由')
    return
  }
  saving.value = true
  try {
    await riskApi.rejectAppeal(rejectId.value, rejectForm.reason)
    ElMessage.success('已驳回')
    rejectDialogVisible.value = false
    fetchList()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    saving.value = false
  }
}

function showDetail(row: any) {
  detailData.value = row
  detailDialogVisible.value = true
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>申诉处理</h3>
    </div>

    <div class="filters">
      <el-select v-model="typeFilter" placeholder="申诉类型" clearable style="width:160px" @change="fetchList">
        <el-option v-for="t in appealTypeOptions" :key="t.value" :label="t.label" :value="t.value" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="状态" clearable style="width:120px" @change="fetchList">
        <el-option label="待处理" value="PENDING" />
        <el-option label="已通过" value="APPROVED" />
        <el-option label="已驳回" value="REJECTED" />
      </el-select>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="applicant" label="申诉人" width="120" show-overflow-tooltip />
      <el-table-column label="申诉类型" width="120">
        <template #default="{ row }">{{ getTypeLabel(row.type || row.appealType) }}</template>
      </el-table-column>
      <el-table-column prop="content" label="申诉内容" min-width="240" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'"
            size="small"
          >
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="showDetail(row)">详情</el-button>
          <el-button size="small" type="success" :disabled="row.status !== 'PENDING'" @click="approve(row.id)">
            通过
          </el-button>
          <el-button size="small" type="danger" :disabled="row.status !== 'PENDING'" @click="openReject(row.id)">
            驳回
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog v-model="detailDialogVisible" title="申诉详情" width="600px">
      <template v-if="detailData">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申诉人">{{ detailData.applicant || detailData.userId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申诉类型">{{ getTypeLabel(detailData.type || detailData.appealType) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag
              :type="detailData.status === 'APPROVED' ? 'success' : detailData.status === 'REJECTED' ? 'danger' : 'warning'"
              size="small"
            >
              {{ getStatusLabel(detailData.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDate(detailData.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="驳回理由" :span="2" v-if="detailData.status === 'REJECTED' && detailData.reason">
            {{ detailData.reason }}
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin:16px 0 8px;color:#8b4513">申诉内容</h4>
        <div style="padding:12px;background:#fafafa;border-radius:4px;line-height:1.8;white-space:pre-wrap">
          {{ detailData.content || '暂无内容' }}
        </div>

        <h4 style="margin:16px 0 8px;color:#8b4513" v-if="detailData.reply">回复内容</h4>
        <div style="padding:12px;background:#f0f9eb;border-radius:4px;line-height:1.8;white-space:pre-wrap" v-if="detailData.reply">
          {{ detailData.reply }}
        </div>
      </template>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rejectDialogVisible" title="驳回申诉" width="450px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="驳回理由" required>
          <el-input v-model="rejectForm.reason" type="textarea" :rows="5" placeholder="请输入驳回理由，将通知申诉人" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="saving" @click="reject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
.filters { display: flex; gap: 12px; margin-bottom: 16px; }
</style>
