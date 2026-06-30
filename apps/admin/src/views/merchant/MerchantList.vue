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
            label="待缴保证金"
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
      width="500px"
    >
      <el-form
        :model="approveForm"
        label-width="100px"
      >
        <el-form-item label="保证金金额">
          <el-input-number
            v-model="approveForm.depositAmount"
            :min="0"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
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
      width="500px"
    >
      <el-form label-width="80px">
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { merchantApi } from '@/api'

const router = useRouter()

const list = ref<any[]>([])
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
const approveForm = ref({ depositAmount: undefined as number | undefined, commissionRate: undefined as number | undefined, remark: '' })

const STATUS_MAP: Record<string, string> = {
  PENDING_REVIEW: '待审核',
  REVIEW_FAILED: '审核驳回',
  DEPOSIT_PENDING: '待缴保证金',
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
    const params: any = { page: page.value, pageSize: 20 }
    if (filterStatus.value) params.status = filterStatus.value
    if (keyword.value) params.keyword = keyword.value
    const res = await merchantApi.list(params)
    const data = res.data as any
    list.value = data.list || []
    total.value = data.total || 0
  } catch (e: any) {
    error.value = true
  } finally { loading.value = false }
}

function goDetail(id: string) { router.push(`/merchants/${id}`) }

function openApprove(row: any) {
  approveId.value = row.id
  approveForm.value = { depositAmount: undefined, commissionRate: undefined, remark: '' }
  approveDialog.value = true
}

async function doApprove() {
  saving.value = true
  try {
    await merchantApi.approve(approveId.value, { ...approveForm.value })
    ElMessage.success('审核已通过')
    approveDialog.value = false
    fetchList()
  } catch (e: any) {
  } finally { saving.value = false }
}

function openReject(row: any) {
  rejectId.value = row.id
  rejectReason.value = ''
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
  } catch (e: any) {
  } finally { saving.value = false }
}

async function changeStatus(row: any, status: string) {
  const label = status === 'SUSPENDED' ? '暂停' : status === 'ACTIVE' ? '恢复' : '关闭'
  try {
    await ElMessageBox.confirm(`确定${label}商家"${row.shopName}"吗？`, '提示', { type: 'warning' })
    await merchantApi.updateStatus(row.id, { status })
    ElMessage.success(`已${label}`)
    fetchList()
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.toolbar-right { display: flex; align-items: center; gap: 12px; }
</style>
