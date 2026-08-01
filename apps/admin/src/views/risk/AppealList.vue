<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { riskApi } from '@/api'

// 申诉记录行（依据表格列/详情实际访问字段声明）
interface Appeal {
  id?: string
  userId?: string
  type?: string
  status?: string
  reason?: string
  createdAt?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
  evidence: string[]
}

const router = useRouter()

const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const list = ref<Appeal[]>([])
const total = ref(0)
const page = ref(1)

const statusFilter = ref('')
const typeFilter = ref('')

const rejectDialogVisible = ref(false)
const rejectId = ref('')
const rejectForm = reactive({ reason: '' })

const detailDialogVisible = ref(false)
const detailData = ref<Appeal | null>(null)

// 与后端 AppealRecord.type 对齐：USER_BAN/CONTENT_BLOCK/WITHDRAWAL_REJECT
const appealTypeOptions = [
  { label: '封号申诉', value: 'USER_BAN' },
  { label: '内容封禁申诉', value: 'CONTENT_BLOCK' },
  { label: '提现驳回申诉', value: 'WITHDRAWAL_REJECT' },
]

onMounted(() => fetchList())

// 后端 listAppeals 返回裸 AppealRecord（无用户昵称字段·risk-control.service.ts），
// 故 userId 以「截断+复制+跳用户详情」呈现（标准第四节-4/5）
const emptyText = computed(() =>
  statusFilter.value || typeFilter.value
    ? '没有符合条件的申诉，换个筛选条件试试'
    : '暂无申诉记录',
)

function formatDate(d?: string) {
  return d ? new Date(d).toLocaleString() : '—'
}

function shortId(id?: string) {
  if (!id) return '—'
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

async function copyText(text?: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.warning('复制失败，请手动选择复制')
  }
}

function goUser(userId?: string) {
  if (!userId) return
  router.push(`/users/${userId}`)
}

function onFilterChange() {
  page.value = 1
  fetchList()
}

function getTypeLabel(type = ''): string {
  const opt = appealTypeOptions.find(t => t.value === type)
  return opt ? opt.label : type
}

function getStatusLabel(status = ''): string {
  const map: Record<string, string> = { PENDING: '待处理', APPROVED: '已通过', REJECTED: '已驳回' }
  return map[status] || status
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: 20 }
    if (statusFilter.value) params.status = statusFilter.value
    if (typeFilter.value) params.type = typeFilter.value
    // 后端 listAppeals 支持 status + type 过滤与分页
    const { data } = await riskApi.listAppeals(params)
    const items: Appeal[] = data.items ?? (Array.isArray(data) ? data : [])
    list.value = items
    total.value = data.total ?? items.length
  } catch {
    // 拦截器已 toast 具体原因；给错误态但不清 total/list，保留上下文
    error.value = true
  } finally {
    loading.value = false
  }
}

async function approve(id: string) {
  try {
    await ElMessageBox.confirm(
      '确认通过该申诉？通过后将按申诉类型恢复相应权益。',
      '通过申诉',
      { type: 'info', confirmButtonText: '确认通过', cancelButtonText: '取消' },
    )
  } catch { return /* 用户取消 */ }
  try {
    await riskApi.approveAppeal(id)
    ElMessage.success('已通过')
    fetchList()
  } catch {
    // 接口错误已由 api 拦截器统一提示
  }
}

function openReject(id: string) {
  rejectId.value = id
  rejectForm.reason = ''
  rejectDialogVisible.value = true
}

async function reject() {
  if (saving.value) return
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
    // 接口错误已由 api 拦截器统一提示
  } finally {
    saving.value = false
  }
}

function showDetail(row: Appeal) {
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
      <el-select
        v-model="typeFilter"
        placeholder="申诉类型"
        clearable
        style="width:160px"
        @change="onFilterChange"
      >
        <el-option
          v-for="t in appealTypeOptions"
          :key="t.value"
          :label="t.label"
          :value="t.value"
        />
      </el-select>
      <el-select
        v-model="statusFilter"
        placeholder="状态"
        clearable
        style="width:120px"
        @change="onFilterChange"
      >
        <el-option
          label="待处理"
          value="PENDING"
        />
        <el-option
          label="已通过"
          value="APPROVED"
        />
        <el-option
          label="已驳回"
          value="REJECTED"
        />
      </el-select>
    </div>

    <div
      v-if="error"
      class="error-state"
    >
      <el-empty description="加载失败，请重试">
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </el-empty>
    </div>

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
      :empty-text="emptyText"
    >
      <el-table-column
        label="申诉人"
        width="200"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="row.userId || '—'"
            placement="top"
          >
            <el-link
              type="primary"
              :underline="false"
              @click="copyText(row.userId)"
            >
              {{ shortId(row.userId) }}
            </el-link>
          </el-tooltip>
          <el-button
            link
            type="primary"
            size="small"
            style="margin-left:8px"
            @click="goUser(row.userId)"
          >
            查看用户
          </el-button>
        </template>
      </el-table-column>
      <el-table-column
        label="申诉类型"
        width="140"
      >
        <template #default="{ row }">
          {{ getTypeLabel(row.type) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="reason"
        label="申诉理由"
        min-width="240"
        show-overflow-tooltip
      />
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'"
            size="small"
          >
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="提交时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="230"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            @click="showDetail(row)"
          >
            详情
          </el-button>
          <el-button
            size="small"
            type="success"
            :disabled="row.status !== 'PENDING'"
            @click="approve(row.id)"
          >
            通过
          </el-button>
          <el-button
            size="small"
            type="danger"
            :disabled="row.status !== 'PENDING'"
            @click="openReject(row.id)"
          >
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

    <el-dialog
      v-model="detailDialogVisible"
      title="申诉详情"
      width="600px"
    >
      <template v-if="detailData">
        <el-descriptions
          :column="2"
          border
        >
          <el-descriptions-item label="申诉人">
            <el-tooltip
              :content="detailData.userId || '—'"
              placement="top"
            >
              <el-link
                type="primary"
                :underline="false"
                @click="copyText(detailData.userId)"
              >
                {{ shortId(detailData.userId) }}
              </el-link>
            </el-tooltip>
            <el-button
              link
              type="primary"
              size="small"
              style="margin-left:8px"
              @click="goUser(detailData.userId)"
            >
              查看用户
            </el-button>
          </el-descriptions-item>
          <el-descriptions-item label="申诉类型">
            {{ getTypeLabel(detailData.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag
              :type="detailData.status === 'APPROVED' ? 'success' : detailData.status === 'REJECTED' ? 'danger' : 'warning'"
              size="small"
            >
              {{ getStatusLabel(detailData.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ formatDate(detailData.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="detailData.reviewedBy"
            label="审批人"
          >
            {{ detailData.reviewedBy }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="detailData.reviewedAt"
            label="审批时间"
          >
            {{ formatDate(detailData.reviewedAt) }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="detailData.status === 'REJECTED' && detailData.reviewNote"
            label="驳回理由"
            :span="2"
          >
            {{ detailData.reviewNote }}
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin:16px 0 8px;color:#8b4513">
          申诉理由
        </h4>
        <div style="padding:12px;background:#fafafa;border-radius:4px;line-height:1.8;white-space:pre-wrap">
          {{ detailData.reason || '暂无内容' }}
        </div>

        <template v-if="Array.isArray(detailData.evidence) && detailData.evidence.length">
          <h4 style="margin:16px 0 8px;color:#8b4513">
            申诉证据
          </h4>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <el-image
              v-for="(img, i) in detailData.evidence"
              :key="i"
              :src="img"
              :preview-src-list="detailData.evidence"
              :initial-index="i"
              fit="cover"
              style="width:90px;height:90px;border-radius:4px"
            />
          </div>
        </template>
      </template>
      <template #footer>
        <el-button @click="detailDialogVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="rejectDialogVisible"
      title="驳回申诉"
      width="450px"
    >
      <el-form
        :model="rejectForm"
        label-width="80px"
      >
        <el-form-item
          label="驳回理由"
          required
        >
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="5"
            placeholder="请输入驳回理由，将通知申诉人"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="saving"
          @click="reject"
        >
          确认驳回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.filters { display: flex; gap: 12px; margin-bottom: 16px; }
.error-state { padding: 40px 0; }
</style>
