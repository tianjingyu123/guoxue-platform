<template>
  <div class="page">
    <div class="toolbar">
      <h3>AI 协作审核</h3>
      <span style="color:var(--color-text-secondary);font-size:13px">低风险高置信度可自动批准；只有绑定受控动作处理器后才会真实执行</span>
    </div>

    <!-- 概览卡片 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="4">
        <div
          class="stat-card warn"
          style="cursor:pointer"
          @click="filterStatus='pending_review';fetchList()"
        >
          <span class="value">{{ overview.pendingCount || 0 }}</span>
          <span class="label">待审核</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div
          class="stat-card info"
          style="cursor:pointer"
          @click="filterStatus='approved';fetchList()"
        >
          <span class="value">{{ overview.approvedCount || 0 }}</span>
          <span class="label">已批准</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div
          class="stat-card"
          style="cursor:pointer"
          @click="filterStatus='executed';fetchList()"
        >
          <span class="value">{{ overview.executedCount || 0 }}</span>
          <span class="label">已执行</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div
          class="stat-card danger"
          style="cursor:pointer"
          @click="filterStatus='rejected';fetchList()"
        >
          <span class="value">{{ overview.rejectedCount || 0 }}</span>
          <span class="label">已驳回</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ overview.rolledBackCount || 0 }}</span>
          <span class="label">已回滚</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card info">
          <span class="value">{{ overview.avgFeedbackRating || '-' }}</span>
          <span class="label">平均评分</span>
        </div>
      </el-col>
    </el-row>

    <!-- 筛选 -->
    <div style="margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <el-select
        v-model="filterStatus"
        placeholder="状态"
        size="small"
        clearable
        style="width:130px"
        @change="fetchList"
      >
        <el-option
          label="待审核"
          value="pending_review"
        />
        <el-option
          label="已批准"
          value="approved"
        />
        <el-option
          label="已执行"
          value="executed"
        />
        <el-option
          label="已驳回"
          value="rejected"
        />
        <el-option
          label="已回滚"
          value="rolled_back"
        />
      </el-select>
      <el-select
        v-model="filterRisk"
        placeholder="风险级别"
        size="small"
        clearable
        style="width:120px"
        @change="fetchList"
      >
        <el-option
          label="低风险"
          value="low"
        />
        <el-option
          label="中风险"
          value="medium"
        />
        <el-option
          label="高风险"
          value="high"
        />
      </el-select>
      <el-button
        size="small"
        @click="fetchList"
      >
        刷新
      </el-button>
      <el-button
        size="small"
        type="warning"
        :loading="pendingLoading"
        @click="fetchPending"
      >
        检查待审核
      </el-button>
    </div>

    <!-- 列表 -->
    <el-card>
      <el-empty
        v-if="loadErr"
        description="加载失败，请重试"
      >
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </el-empty>
      <el-empty
        v-else-if="!loading && list.length === 0"
        description="暂无协作提案"
      />
      <el-table
        v-else
        v-loading="loading"
        :data="list"
        stripe
        size="small"
        max-height="550"
        @row-click="showDetail"
      >
        <el-table-column
          prop="type"
          label="类型"
          width="120"
        />
        <el-table-column
          prop="title"
          label="标题"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          label="风险"
          width="80"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="riskTagType(row.riskLevel)"
              size="small"
            >
              {{ riskLabel(row.riskLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="置信度"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-progress
              :percentage="Math.round((row.confidence || 0) * 100)"
              :stroke-width="6"
              :show-text="true"
              :status="row.confidence > 0.8 ? 'success' : 'warning'"
            />
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
          label="提议人"
          width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.proposedBy || 'AI' }}
          </template>
        </el-table-column>
        <el-table-column
          label="审核人"
          width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.reviewedBy || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="反馈评分"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            {{ row.feedbackRating ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending_review'"
              size="small"
              type="success"
              @click.stop="approve(row)"
            >
              批准
            </el-button>
            <el-button
              v-if="row.status === 'pending_review'"
              size="small"
              type="danger"
              @click.stop="reject(row)"
            >
              驳回
            </el-button>
            <el-button
              v-if="row.status === 'approved'"
              size="small"
              type="primary"
              :disabled="!row.executionReady || !auth.isSuperAdmin"
              :loading="execId === row.id"
              @click.stop="execute(row)"
            >
              {{ row.executionReady ? '执行' : '待接入执行器' }}
            </el-button>
            <el-button
              v-if="row.status === 'executed'"
              size="small"
              type="warning"
              :disabled="!row.rollbackReady || !auth.isSuperAdmin"
              @click.stop="rollback(row)"
            >
              回滚
            </el-button>
            <el-button
              size="small"
              @click.stop="showDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        v-model:current-page="page"
        style="margin-top:16px;display:flex;justify-content:flex-end"
        :total="total"
        :page-size="pageSize"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </el-card>

    <!-- 审批/驳回对话框 -->
    <el-dialog
      v-model="reviewVis"
      :title="reviewAction === 'approve' ? '批准提案' : '驳回提案'"
      width="450px"
    >
      <el-form label-width="80px">
        <!-- 审核人自动取当前登录管理员（原为可手输任意 ID·留痕可伪造·已改只读） -->
        <el-form-item label="审核人">
          <span>{{ currentReviewerLabel }}</span>
        </el-form-item>
        <el-form-item :required="reviewAction === 'reject' || (reviewAction === 'approve' && currentItem?.riskLevel === 'high')">
          <template #label>
            {{ reviewAction === 'approve' ? '备注' : '驳回原因' }}
          </template>
          <el-input
            v-model="reviewForm.note"
            type="textarea"
            :rows="3"
            :placeholder="reviewAction === 'approve' && currentItem?.riskLevel === 'high' ? '高风险批准依据（必填）' : reviewAction === 'approve' ? '批准备注（可选）' : '驳回原因（必填）'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVis = false">
          取消
        </el-button>
        <el-button
          :type="reviewAction === 'approve' ? 'success' : 'danger'"
          :loading="reviewLoading"
          @click="confirmReview"
        >
          {{ reviewAction === 'approve' ? '确认批准' : '确认驳回' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVis"
      title="提案详情"
      width="650px"
    >
      <el-descriptions
        v-if="detail"
        :column="2"
        border
      >
        <el-descriptions-item
          label="标题"
          :span="2"
        >
          {{ detail.title }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          {{ detail.type }}
        </el-descriptions-item>
        <el-descriptions-item label="风险级别">
          <el-tag
            :type="riskTagType(detail.riskLevel)"
            size="small"
          >
            {{ riskLabel(detail.riskLevel) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="置信度">
          {{ ((detail.confidence || 0) * 100).toFixed(1) }}%
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag
            :type="statusTagType(detail.status)"
            size="small"
          >
            {{ statusLabel(detail.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="提议人">
          {{ detail.proposedBy || 'AI' }}
        </el-descriptions-item>
        <el-descriptions-item label="审核人">
          {{ detail.reviewedBy || '-' }}
        </el-descriptions-item>
        <el-descriptions-item
          label="描述"
          :span="2"
        >
          <p style="margin:0;white-space:pre-wrap">
            {{ detail.description }}
          </p>
        </el-descriptions-item>
        <el-descriptions-item
          label="影响范围"
          :span="2"
        >
          <pre style="margin:0;font-size:12px;max-height:120px;overflow:auto">{{ JSON.stringify(detail.impactScope || {}, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item
          label="备选方案"
          :span="2"
        >
          <pre style="margin:0;font-size:12px;max-height:120px;overflow:auto">{{ JSON.stringify(detail.alternatives || {}, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item
          label="执行计划"
          :span="2"
        >
          <pre style="margin:0;font-size:12px;max-height:150px;overflow:auto">{{ JSON.stringify(detail.executionPlan || {}, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item
          label="受控执行器"
          :span="2"
        >
          <el-tag :type="detail.executionCapability?.executionReady ? 'success' : 'warning'">
            {{ detail.executionCapability?.executionReady ? `已就绪：${detail.executionCapability.handlerKey}` : '未绑定，系统禁止标记为已执行' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item
          label="回滚方案"
          :span="2"
        >
          <pre style="margin:0;font-size:12px;max-height:120px;overflow:auto">{{ JSON.stringify(detail.rollbackPlan || {}, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item
          label="审核备注"
          :span="2"
        >
          {{ detail.reviewNote || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDate(detail.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ formatDate(detail.updatedAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 回滚对话框 -->
    <el-dialog
      v-model="rollbackVis"
      title="回滚操作"
      width="400px"
    >
      <el-form label-width="80px">
        <el-form-item label="原因">
          <el-input
            v-model="rollbackReason"
            type="textarea"
            :rows="3"
            placeholder="回滚原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rollbackVis = false">
          取消
        </el-button>
        <el-button
          type="warning"
          :loading="rollbackLoading"
          @click="confirmRollback"
        >
          确认回滚
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, reactive, computed, onMounted } from 'vue'
import { aiCollaborationApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/store/auth'

/** axios 错误结构（用于提取后端 message） */
type ApiError = { response?: { data?: { message?: string } } }

/** 协作提案行/详情（字段宽松 optional） */
interface ProposalRow {
  id: string
  type?: string
  title?: string
  riskLevel?: string
  confidence?: number
  status?: string
  proposedBy?: string
  reviewedBy?: string
  feedbackRating?: number
  createdAt?: string
  updatedAt?: string
  description?: string
  impactScope?: unknown
  alternatives?: unknown
  executionPlan?: unknown
  rollbackPlan?: unknown
  reviewNote?: string
  executionReady?: boolean
  rollbackReady?: boolean
  handlerKey?: string | null
  executionCapability?: {
    executionReady?: boolean
    rollbackReady?: boolean
    handlerKey?: string | null
  }
}
/** 概览统计 */
interface Overview {
  pendingCount?: number
  approvedCount?: number
  executedCount?: number
  rejectedCount?: number
  rolledBackCount?: number
  avgFeedbackRating?: number | string
}

const loading = ref(false); const loadErr = ref(false); const list = ref<ProposalRow[]>([]); const total = ref(0)
const page = ref(1); const pageSize = 20
const filterStatus = ref(''); const filterRisk = ref('')
const overview = ref<Overview>({})
const pendingLoading = ref(false)

// 审核（审核人 = 当前登录管理员·不可手输伪造）
const auth = useAuthStore()
const currentReviewerLabel = computed(() => {
  const u = auth.user as { id?: string; nickname?: string } | null
  if (!u?.id) return '当前登录管理员'
  return u.nickname ? `${u.nickname}（${String(u.id).slice(0, 8)}）` : String(u.id)
})
const reviewVis = ref(false); const reviewAction = ref(''); const reviewLoading = ref(false)
const currentItem = ref<ProposalRow | null>(null)
const reviewForm = reactive({ note: '' })

// 详情
const detailVis = ref(false); const detail = ref<ProposalRow | null>(null)

// 执行
const execId = ref('')

// 回滚
const rollbackVis = ref(false); const rollbackReason = ref(''); const rollbackLoading = ref(false)
const rollbackItem = ref<ProposalRow | null>(null)

onMounted(() => { fetchList(); fetchOverview() })

// 入参放宽为可选（详情对象字段为 optional），逻辑与原先等价
function riskLabel(r?: string) { const m: Record<string,string> = { low:'低', medium:'中', high:'高' }; return r ? (m[r] || r) : r }
function riskTagType(r?: string) { const m: Record<string,string> = { low:'success', medium:'warning', high:'danger' }; return r ? (m[r] || 'info') : 'info' }
function statusLabel(s?: string) {
  const m: Record<string,string> = { pending_review:'待审核', approved:'已批准', executed:'已执行', rejected:'已驳回', rolled_back:'已回滚' }
  return s ? (m[s] || s) : s
}
function statusTagType(s?: string) {
  const m: Record<string,string> = { pending_review:'warning', approved:'success', executed:'primary', rejected:'danger', rolled_back:'info' }
  return s ? (m[s] || 'info') : 'info'
}
function formatDate(d?: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true; loadErr.value = false
  try {
    const params: Record<string, string | number> = { limit: pageSize, offset: (page.value - 1) * pageSize }
    if (filterStatus.value) params.status = filterStatus.value
    if (filterRisk.value) params.riskLevel = filterRisk.value
    const res = await aiCollaborationApi.list(params)
    list.value = res.data?.items || []
    total.value = res.data?.total || 0
  } catch { loadErr.value = true; list.value = [] }
  finally { loading.value = false }
}

async function fetchOverview() {
  try {
    const res = await aiCollaborationApi.overview()
    overview.value = res.data || {}
  } catch { /* ignore */ }
}

async function fetchPending() {
  pendingLoading.value = true
  try {
    const res = await aiCollaborationApi.pending()
    filterStatus.value = 'pending_review'
    page.value = 1
    await fetchList()
  } catch { /* ignore */ }
  finally { pendingLoading.value = false }
}

function approve(item: ProposalRow) {
  currentItem.value = item; reviewAction.value = 'approve'
  reviewForm.note = ''
  reviewVis.value = true
}

function reject(item: ProposalRow) {
  currentItem.value = item; reviewAction.value = 'reject'
  reviewForm.note = ''
  reviewVis.value = true
}

async function confirmReview() {
  if (!currentItem.value) return
  // L2：驳回理由必填（体验标准第七节）
  if (reviewAction.value === 'reject' && !reviewForm.note.trim()) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  if (reviewAction.value === 'approve' && currentItem.value.riskLevel === 'high' && !reviewForm.note.trim()) {
    ElMessage.warning('高风险提案必须填写批准依据')
    return
  }
  reviewLoading.value = true
  try {
    const action = reviewAction.value === 'approve' ? 'approved' : 'rejected'
    await aiCollaborationApi.review(currentItem.value.id, {
      action,
      note: reviewForm.note.trim() || undefined,
    })
    ElMessage.success(reviewAction.value === 'approve' ? '已批准；绑定受控执行器后方可执行' : '已驳回')
    reviewVis.value = false
    fetchList(); fetchOverview()
  } catch (e) {
    ElMessage.error((e as ApiError)?.response?.data?.message || '操作失败')
  } finally {
    reviewLoading.value = false
  }
}

async function execute(item: ProposalRow) {
  try {
    await ElMessageBox.confirm(`确认执行提案「${item.title}」？`, '执行确认', { type: 'warning' })
  } catch { return }
  execId.value = item.id
  try {
    await aiCollaborationApi.execute(item.id)
    ElMessage.success('执行成功')
    fetchList(); fetchOverview()
  } catch (e) {
    ElMessage.error((e as ApiError)?.response?.data?.message || '执行失败')
  } finally {
    execId.value = ''
  }
}

function rollback(item: ProposalRow) {
  rollbackItem.value = item; rollbackReason.value = ''
  rollbackVis.value = true
}

async function confirmRollback() {
  if (!rollbackItem.value) return
  rollbackLoading.value = true
  try {
    await aiCollaborationApi.rollback(rollbackItem.value.id, rollbackReason.value || undefined)
    ElMessage.success('已回滚')
    rollbackVis.value = false
    fetchList(); fetchOverview()
  } catch (e) {
    ElMessage.error((e as ApiError)?.response?.data?.message || '回滚失败')
  } finally {
    rollbackLoading.value = false
  }
}

async function showDetail(item: ProposalRow) {
  detail.value = null; detailVis.value = true
  try {
    const res = await aiCollaborationApi.detail(item.id)
    detail.value = res.data
  } catch { detail.value = item }
}
</script>

<style scoped>
.toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:8px }
.stat-card { background:var(--color-bg-page); border-radius:8px; padding:16px; text-align:center; transition: all 0.2s }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 2px 8px rgba(0,0,0,0.08) }
.stat-card.danger { background:#fef0f0; border:1px solid #fde2e2 }
.stat-card.warn { background:#fdf6ec; border:1px solid #faecd8 }
.stat-card.info { background:#ecf5ff; border:1px solid #d9ecff }
.stat-card .value { display:block; font-size:28px; font-weight:700; line-height:1.2 }
.stat-card .label { display:block; font-size:12px; color:var(--color-text-secondary); margin-top:4px }
</style>
