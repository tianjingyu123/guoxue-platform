<template>
  <div class="page">
    <div class="toolbar">
      <h3>商家管理</h3>
      <div class="toolbar-right">
        <el-select
          v-model="filterStatus"
          placeholder="全部状态"
          clearable
          style="width:180px"
          @change="fetchList"
        >
          <el-option
            label="待审核"
            value="PENDING_REVIEW"
          />
          <el-option
            label="审核驳回"
            value="REVIEW_FAILED"
          />
          <el-option
            label="保证金待处理"
            value="DEPOSIT_PENDING"
          />
          <el-option
            label="待签署协议"
            value="AGREEMENT_PENDING"
          />
          <el-option
            label="已开通"
            value="ACTIVE"
          />
          <el-option
            label="已暂停"
            value="SUSPENDED"
          />
          <el-option
            label="已关闭"
            value="CLOSED"
          />
        </el-select>
        <el-input
          v-model="keyword"
          placeholder="搜索店铺名称"
          clearable
          style="width:220px"
          @clear="fetchList"
          @keyup.enter="fetchList"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button
          type="primary"
          @click="fetchList"
        >
          查询
        </el-button>
      </div>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="商家列表加载失败，请稍后重试"
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

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无商家数据" />
      </template>
      <el-table-column
        prop="shopName"
        label="店铺名称"
        min-width="150"
      />
      <el-table-column
        prop="contactName"
        label="联系人"
        width="100"
      />
      <el-table-column
        prop="contactPhone"
        label="手机号"
        width="130"
      />
      <el-table-column
        label="状态"
        width="120"
      >
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="累计销售额"
        width="120"
      >
        <template #default="{ row }">
          ¥{{ Number(row.totalSales).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="totalOrders"
        label="累计订单"
        width="90"
      />
      <el-table-column
        label="评分"
        width="70"
      >
        <template #default="{ row }">
          {{ Number(row.rating).toFixed(1) }}
        </template>
      </el-table-column>
      <el-table-column
        label="入驻时间"
        width="160"
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
            text
            type="primary"
            @click="goDetail(row.id)"
          >
            详情
          </el-button>
          <el-button
            v-if="['ACTIVE', 'SUSPENDED'].includes(row.status)"
            size="small"
            text
            type="danger"
            @click="goPunish(row.id)"
          >
            处罚
          </el-button>
          <template v-if="row.status === 'PENDING_REVIEW'">
            <el-button
              size="small"
              text
              type="success"
              @click="openApprove(row)"
            >
              通过
            </el-button>
            <el-button
              size="small"
              text
              type="danger"
              @click="openReject(row)"
            >
              驳回
            </el-button>
          </template>
          <template v-else-if="row.status === 'ACTIVE'">
            <el-button
              size="small"
              text
              type="warning"
              @click="changeStatus(row, 'SUSPENDED')"
            >
              暂停
            </el-button>
            <el-button
              size="small"
              text
              type="danger"
              @click="changeStatus(row, 'CLOSED')"
            >
              关闭
            </el-button>
          </template>
          <template v-else-if="row.status === 'SUSPENDED'">
            <el-button
              size="small"
              text
              type="success"
              @click="changeStatus(row, 'ACTIVE')"
            >
              恢复
            </el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="!error"
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <!-- 审核通过对话框 -->
    <el-dialog
      v-model="approveDialog"
      title="审核通过"
      width="620px"
    >
      <!-- 被审资料本体 -->
      <div
        v-loading="reviewDetailLoading"
        class="review-material"
      >
        <el-descriptions
          v-if="reviewDetail"
          :column="2"
          border
          size="small"
        >
          <el-descriptions-item label="店铺名称">
            {{ reviewDetail.shopName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="经营类目">
            {{ reviewDetail.categoryIds?.join('、') || '未选择' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系人">
            {{ reviewDetail.contactName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ reviewDetail.contactPhone || '—' }}
          </el-descriptions-item>
          <el-descriptions-item
            label="店铺简介"
            :span="2"
          >
            {{ reviewDetail.shopIntro || '暂无' }}
          </el-descriptions-item>
        </el-descriptions>
        <div
          v-if="reviewDetail"
          class="review-images"
        >
          <div
            v-for="img in reviewImages"
            :key="img.label"
            class="review-image-item"
          >
            <div class="review-image-label">
              {{ img.label }}
            </div>
            <el-image
              v-if="img.url"
              :src="img.url"
              :preview-src-list="[img.url]"
              fit="contain"
              style="width:130px;height:90px;border:1px solid var(--el-border-color);border-radius:4px"
              preview-teleported
            />
            <span
              v-else
              class="review-image-missing"
            >未上传</span>
          </div>
        </div>
      </div>
      <el-alert
        title="当前实行免保证金入驻；审核通过后商家将直接进入待签约状态"
        type="info"
        :closable="false"
        show-icon
        style="margin-top:12px"
      />
      <el-form
        :model="approveForm"
        label-width="100px"
        style="margin-top:12px"
      >
        <el-form-item label="分佣比例">
          <el-input-number
            v-model="approveForm.commissionRate"
            :min="0"
            :max="1"
            :step="0.01"
            :precision="4"
            style="width:100%"
          />
          <span style="margin-left:8px;color:#999">商家得 {{ ((approveForm.commissionRate || 0) * 100).toFixed(1) }}%</span>
        </el-form-item>
        <el-form-item label="内部备注">
          <el-input
            v-model="approveForm.remark"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doApprove"
        >
          确认通过
        </el-button>
      </template>
    </el-dialog>

    <!-- 审核驳回对话框 -->
    <el-dialog
      v-model="rejectDialog"
      title="审核驳回"
      width="620px"
    >
      <!-- 被审资料本体 -->
      <div
        v-loading="reviewDetailLoading"
        class="review-material"
      >
        <el-descriptions
          v-if="reviewDetail"
          :column="2"
          border
          size="small"
        >
          <el-descriptions-item label="店铺名称">
            {{ reviewDetail.shopName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="经营类目">
            {{ reviewDetail.categoryIds?.join('、') || '未选择' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系人">
            {{ reviewDetail.contactName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ reviewDetail.contactPhone || '—' }}
          </el-descriptions-item>
        </el-descriptions>
        <div
          v-if="reviewDetail"
          class="review-images"
        >
          <div
            v-for="img in reviewImages"
            :key="img.label"
            class="review-image-item"
          >
            <div class="review-image-label">
              {{ img.label }}
            </div>
            <el-image
              v-if="img.url"
              :src="img.url"
              :preview-src-list="[img.url]"
              fit="contain"
              style="width:130px;height:90px;border:1px solid var(--el-border-color);border-radius:4px"
              preview-teleported
            />
            <span
              v-else
              class="review-image-missing"
            >未上传</span>
          </div>
        </div>
      </div>
      <el-form
        label-width="80px"
        style="margin-top:12px"
      >
        <el-form-item
          label="驳回原因"
          required
        >
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="3"
            placeholder="请填写驳回原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doReject"
        >
          确认驳回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { merchantApi } from '@/api'

const router = useRouter()

/** 商家列表行（字段宽松 optional） */
interface MerchantRow {
  id: string
  shopName?: string
  contactName?: string
  contactPhone?: string
  status?: string
  totalSales?: number
  totalOrders?: number
  rating?: number
  createdAt?: string
}

/** 被审资料（详情接口·审核弹窗展示本体用） */
interface MerchantReviewDetail {
  shopName?: string
  contactName?: string
  contactPhone?: string
  categoryIds?: string[]
  shopIntro?: string
  idCardFront?: string
  idCardBack?: string
  businessLicense?: string
  brandAuth?: string
}

const list = ref<MerchantRow[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref(false)
const filterStatus = ref('')
const keyword = ref('')
const saving = ref(false)

const approveDialog = ref(false)
const rejectDialog = ref(false)
const approveId = ref('')
const rejectId = ref('')
const rejectReason = ref('')
const approveForm = ref({ commissionRate: undefined as number | undefined, remark: '' })

// 被审资料本体（审核弹窗打开时拉详情展示）
const reviewDetail = ref<MerchantReviewDetail | null>(null)
const reviewDetailLoading = ref(false)
const reviewImages = computed(() => [
  { label: '营业执照', url: reviewDetail.value?.businessLicense || '' },
  { label: '身份证正面', url: reviewDetail.value?.idCardFront || '' },
  { label: '身份证反面', url: reviewDetail.value?.idCardBack || '' },
  { label: '品牌授权书', url: reviewDetail.value?.brandAuth || '' },
])

async function loadReviewDetail(id: string) {
  reviewDetail.value = null
  reviewDetailLoading.value = true
  try {
    const res = await merchantApi.detail(id)
    reviewDetail.value = res.data as MerchantReviewDetail
  } catch { /* 弹窗内空态·不阻断审核 */ }
  finally { reviewDetailLoading.value = false }
}

const STATUS_MAP: Record<string, string> = {
  PENDING_REVIEW: '待审核',
  REVIEW_FAILED: '审核驳回',
  DEPOSIT_PENDING: '保证金待处理',
  AGREEMENT_PENDING: '待签署协议',
  ACTIVE: '已开通',
  SUSPENDED: '已暂停',
  CLOSED: '已关闭',
}

function statusLabel(s: string) { return STATUS_MAP[s] || s }
function statusTagType(s: string) {
  if (s === 'ACTIVE') return 'success'
  if (s === 'PENDING_REVIEW' || s === 'DEPOSIT_PENDING' || s === 'AGREEMENT_PENDING') return 'warning'
  if (s === 'REVIEW_FAILED' || s === 'CLOSED') return 'danger'
  return 'info'
}

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'
}

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: 20 }
    if (filterStatus.value) params.status = filterStatus.value
    if (keyword.value) params.keyword = keyword.value
    const res = await merchantApi.list(params)
    const data = res.data as { items?: MerchantRow[]; list?: MerchantRow[]; total?: number }
    list.value = data.items || data.list || []
    total.value = data.total || 0
  } catch (_e) {
    error.value = true
  } finally { loading.value = false }
}

function goDetail(id: string) { router.push(`/merchants/${id}`) }
// 直达详情页处罚 Tab（处罚操作与记录列表·履-P3）
function goPunish(id: string) { router.push(`/merchants/${id}?tab=punishments`) }

function openApprove(row: MerchantRow) {
  approveId.value = row.id
  approveForm.value = { commissionRate: undefined, remark: '' }
  loadReviewDetail(row.id)
  approveDialog.value = true
}

async function doApprove() {
  saving.value = true
  try {
    await merchantApi.approve(approveId.value, { ...approveForm.value })
    ElMessage.success('审核已通过')
    approveDialog.value = false
    fetchList()
  } catch (_e) {
  } finally { saving.value = false }
}

function openReject(row: MerchantRow) {
  rejectId.value = row.id
  rejectReason.value = ''
  loadReviewDetail(row.id)
  rejectDialog.value = true
}

async function doReject() {
  if (!rejectReason.value) { ElMessage.warning('请填写驳回原因'); return }
  saving.value = true
  try {
    await merchantApi.reject(rejectId.value, { reason: rejectReason.value })
    ElMessage.success('已驳回')
    rejectDialog.value = false
    fetchList()
  } catch (_e) {
  } finally { saving.value = false }
}

async function changeStatus(row: MerchantRow, status: string) {
  const label = status === 'SUSPENDED' ? '暂停' : status === 'ACTIVE' ? '恢复' : '关闭'
  try {
    if (status === 'ACTIVE') {
      await ElMessageBox.confirm(`确定恢复商家「${row.shopName}」经营吗？恢复后店铺与商品重新对用户可见。`, '恢复经营', { type: 'warning' })
      await merchantApi.updateStatus(row.id, { status })
    } else {
      // 暂停/关闭为 L2 危险操作：理由必填 + 影响提示（理由将通知商家并写入审计）
      const impact = status === 'SUSPENDED'
        ? `暂停后商家「${row.shopName}」店铺冻结、全部商品对用户不可购买，需人工恢复。`
        : `关闭后商家「${row.shopName}」永久停业、不可自助恢复，保证金与未结算货款需另行人工处理。`
      const r = await ElMessageBox.prompt(`${impact}请填写${label}理由（将通知商家并记录审计）：`, `${label}商家`, {
        type: 'warning',
        confirmButtonText: `确认${label}`,
        cancelButtonText: '取消',
        inputPlaceholder: `请输入${label}理由（必填）`,
        inputValidator: (v: string) => (v && v.trim() ? true : '理由不能为空'),
      })
      await merchantApi.updateStatus(row.id, { status, reason: (r.value || '').trim() })
    }
    ElMessage.success(`已${label}`)
    fetchList()
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.toolbar-right { display: flex; align-items: center; gap: 12px; }
.review-material { min-height: 60px; }
.review-images { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.review-image-item { display: flex; flex-direction: column; gap: 4px; }
.review-image-label { font-size: 12px; color: var(--el-text-color-secondary); }
.review-image-missing { font-size: 12px; color: var(--el-text-color-placeholder); display: inline-block; width: 130px; height: 90px; line-height: 90px; text-align: center; border: 1px dashed var(--el-border-color); border-radius: 4px; }
</style>
