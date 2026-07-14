<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { financeApi } from '@/api'
import { exportCSV } from '@/utils/export'

// 提现申请行（按列配置与模板访问字段定义的宽松本地类型）
interface WithdrawalRow {
  id: string
  userId?: string
  amount?: number
  actualAmount?: number
  payMethod: string
  status: string
  createdAt: string
  // 收款账户信息为 Json，结构不固定，保留宽松类型
  accountInfo?: Record<string, any>
  reviewedBy?: string
  reviewNote?: string
  // 渠道自动代付
  transferState?: string
  transferFailReason?: string
  payoutRef?: string
}

const loading = ref(false)
const saving = ref(false)
const error = ref(false)
const list = ref<WithdrawalRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const statusFilter = ref('')

const rejectVisible = ref(false)
const rejectForm = reactive({ id: '', reason: '' })

const detailVisible = ref(false)
const detailData = ref<WithdrawalRow | null>(null)

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
function formatMoney(v: number | string | null | undefined) { return v != null ? '¥' + Number(v).toFixed(2) : '-' }

function maskAccountNo(no: unknown) {
  const s = no != null ? String(no) : ''
  if (!s) return '-'
  if (s.length <= 4) return s
  return `**** **** **** ${s.slice(-4)}`
}

// 收款账户信息存于 accountInfo(Json)，结构不固定，做容错读取
function acct(row: WithdrawalRow | null | undefined): Record<string, any> {
  const a = row?.accountInfo
  return a && typeof a === 'object' ? a : {}
}
function bankName(row: WithdrawalRow | null | undefined) { const a = acct(row); return a.bankName || a.bank || '' }
function accountNo(row: WithdrawalRow | null | undefined) { const a = acct(row); return a.cardNo || a.account || a.bankCard || a.alipayAccount || a.no || '' }
function accountName(row: WithdrawalRow | null | undefined) { const a = acct(row); return a.name || a.accountName || a.realName || '' }

// 后端字段：payMethod = WECHAT / ALIPAY / BANK
// toUpperCase：存量行是前端直传的小写 'alipay'/'bank'（新行已在后端统一大写）
function payMethodOf(m: string) { return String(m || '').toUpperCase() }
function isWechat(m: string) { return payMethodOf(m) === 'WECHAT' }
function payMethodLabel(m: string) {
  const map: Record<string, string> = { WECHAT: '微信零钱', ALIPAY: '支付宝', BANK: '银行卡' }
  return map[payMethodOf(m)] || m || '-'
}

// 后端字段：status = PENDING / APPROVED / TRANSFERRING / REJECTED / PAID
function statusTagType(status: string) {
  const m: Record<string, string> = {
    PAID: 'success', APPROVED: 'primary', TRANSFERRING: 'warning', REJECTED: 'danger', PENDING: 'warning',
  }
  return m[status] || 'info'
}
function statusLabel(status: string) {
  const m: Record<string, string> = {
    PAID: '已到账',
    // 🔴 转账已发起但钱还没到用户手上 —— 新版微信商家转账要用户在微信里点「确认收款」
    TRANSFERRING: '待用户确认收款',
    APPROVED: '已通过待打款',
    REJECTED: '已拒绝',
    PENDING: '待审批',
  }
  return m[status] || status
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    // 后端 getWithdrawalList 返回 { withdrawals, ... }，"withdrawals" 是拦截器分页候选键
    // → 被统一解包为 { items, total, page, pageSize }，故取 data.items
    const { data } = await financeApi.listWithdrawals(params)
    list.value = data.items ?? data.withdrawals ?? []
    total.value = data.total ?? list.value.length
  } catch {
    error.value = true
    list.value = []
  } finally { loading.value = false }
}

function viewDetail(row: WithdrawalRow) { detailData.value = row; detailVisible.value = true }

async function approve(row: WithdrawalRow) {
  try {
    await ElMessageBox.confirm(
      `确定批准用户 ${row.userId} 的提现申请？\n金额：${formatMoney(row.amount)}`,
      '审批确认',
      { type: 'warning', confirmButtonText: '批准', cancelButtonText: '取消' }
    )
    await financeApi.approveWithdrawal(row.id)
    ElMessage.success('已批准')
    fetchList()
  } catch { /* 取消 */ }
}

function openReject(row: WithdrawalRow) {
  rejectForm.id = row.id
  rejectForm.reason = ''
  rejectVisible.value = true
}

async function reject() {
  if (saving.value) return
  if (!rejectForm.reason.trim()) { ElMessage.warning('请输入拒绝原因'); return }
  saving.value = true
  try {
    await financeApi.rejectWithdrawal(rejectForm.id, rejectForm.reason)
    ElMessage.success('已拒绝')
    rejectVisible.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}

/**
 * 自动代付（微信商家转账）。
 *
 * 🔴 发起 ≠ 到账：新版微信商家转账需要用户在微信里点「确认收款」，钱才真正到账。
 * 所以这里成功只代表「已发起」，状态转 TRANSFERRING，不是已打款。
 * 真正标记 PAID 的是微信回调确认 SUCCESS 之后。
 */
async function autoPayout(row: WithdrawalRow) {
  if (!isWechat(row.payMethod)) {
    ElMessage.warning('目前仅微信零钱支持自动代付，其他方式请走人工打款')
    return
  }
  try {
    await ElMessageBox.confirm(
      `将通过微信商家转账向用户支付 ${formatMoney(row.actualAmount ?? row.amount)}（实际到账额）。\n\n` +
      `注意：转账发起后，用户还需在微信中点击「确认收款」，钱才会真正到账。`,
      '发起自动代付',
      { type: 'warning', confirmButtonText: '确认发起', cancelButtonText: '取消' }
    )
    saving.value = true
    const res: any = await financeApi.autoPayout(row.id)
    if (res?.needUserConfirm) {
      ElMessage.success('转账已发起，等待用户在微信中确认收款')
    } else {
      ElMessage.success('转账已发起')
    }
    fetchList()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

/** 主动同步渠道转账状态（回调之外的兜底核实） */
async function syncTransfer(row: WithdrawalRow) {
  if (!row.payoutRef) { ElMessage.warning('该提现尚未发起渠道转账'); return }
  try {
    saving.value = true
    await financeApi.syncPayout(row.payoutRef)
    ElMessage.success('已同步渠道状态')
    fetchList()
  } catch { } finally { saving.value = false }
}

/**
 * 人工打款兜底（银行卡/支付宝等自动代付未覆盖的通道）。
 * 保留它是因为：微信只能打零钱，银行卡要等汇付代付、支付宝要等支付宝转账。
 */
async function markPaid(row: WithdrawalRow) {
  try {
    await ElMessageBox.confirm(
      `确认已在网银/支付宝向用户 ${row.userId} 线下转账 ${formatMoney(row.actualAmount ?? row.amount)}？\n\n` +
      `请确保已真实完成转账 —— 此操作只是把状态标记为已打款，不会真的出款。`,
      '确认人工已打款',
      { type: 'warning', confirmButtonText: '确认已打款', cancelButtonText: '取消' }
    )
    await financeApi.payWithdrawal(row.id)
    ElMessage.success('已标记打款')
    fetchList()
  } catch { /* 取消 */ }
}

function handleExport() {
  exportCSV('提现记录', [
    { label: '用户ID', key: 'userId' },
    { label: '金额', key: 'amount' },
    { label: '收款方式', key: 'payMethodLabel' },
    { label: '收款账户', key: 'account' },
    { label: '状态', key: 'statusLabel' },
    { label: '申请时间', key: 'createdAt' },
  ], list.value.map(r => ({
    ...r,
    amount: formatMoney(r.amount),
    payMethodLabel: payMethodLabel(r.payMethod),
    account: `${bankName(r)} ${maskAccountNo(accountNo(r))}`.trim(),
    statusLabel: statusLabel(r.status),
    createdAt: formatDate(r.createdAt),
  })))
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>提现审批</h3>
      <div class="toolbar-right">
        <el-select
          v-model="statusFilter"
          placeholder="状态筛选"
          clearable
          style="width:130px"
          @change="fetchList"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="待审批"
            value="PENDING"
          />
          <el-option
            label="已通过"
            value="APPROVED"
          />
          <el-option
            label="已拒绝"
            value="REJECTED"
          />
          <el-option
            label="已打款"
            value="PAID"
          />
        </el-select>
        <el-button @click="handleExport">
          导出CSV
        </el-button>
      </div>
    </div>

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="提现记录加载出错，请重试"
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
          prop="userId"
          label="用户ID"
          width="160"
          show-overflow-tooltip
        />
        <el-table-column
          label="金额"
          width="120"
        >
          <template #default="{ row }">
            <span style="font-weight:600;color:#e6a23c">{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="收款方式"
          width="100"
        >
          <template #default="{ row }">
            {{ payMethodLabel(row.payMethod) }}
          </template>
        </el-table-column>
        <el-table-column
          label="收款账户"
          min-width="200"
        >
          <template #default="{ row }">
            <span v-if="bankName(row) || accountNo(row)">{{ bankName(row) }} {{ maskAccountNo(accountNo(row)) }}</span>
            <span v-else>-</span>
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
          label="申请时间"
          width="170"
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
              @click="viewDetail(row)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              size="small"
              type="success"
              @click="approve(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              size="small"
              type="danger"
              @click="openReject(row)"
            >
              拒绝
            </el-button>
            <!-- 已审核通过：微信零钱走自动代付，其他通道走人工打款兜底 -->
            <el-button
              v-if="row.status === 'APPROVED' && isWechat(row.payMethod)"
              size="small"
              type="primary"
              :loading="saving"
              @click="autoPayout(row)"
            >
              自动打款
            </el-button>
            <el-button
              v-if="row.status === 'APPROVED'"
              size="small"
              :type="isWechat(row.payMethod) ? 'default' : 'primary'"
              @click="markPaid(row)"
            >
              人工打款
            </el-button>
            <!-- 已发起渠道转账：钱还没到用户手上，等他在微信里确认收款 -->
            <el-button
              v-if="row.status === 'TRANSFERRING'"
              size="small"
              :loading="saving"
              @click="syncTransfer(row)"
            >
              同步状态
            </el-button>
            <span
              v-else-if="row.status === 'PAID'"
              style="color:#67c23a;font-size:12px"
            >✓ 已打款</span>
            <span
              v-else-if="row.status === 'REJECTED'"
              style="color:#f56c6c;font-size:12px"
            >✗ 已拒绝</span>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && list.length === 0"
        description="暂无提现记录"
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

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="提现详情"
      width="520px"
    >
      <el-descriptions
        v-if="detailData"
        :column="2"
        border
      >
        <el-descriptions-item
          label="用户ID"
          :span="2"
        >
          {{ detailData.userId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="金额">
          <span style="font-weight:600;color:#e6a23c">{{ formatMoney(detailData.amount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag
            :type="statusTagType(detailData.status)"
            size="small"
          >
            {{ statusLabel(detailData.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="收款方式">
          {{ payMethodLabel(detailData.payMethod) }}
        </el-descriptions-item>
        <el-descriptions-item label="开户名">
          {{ accountName(detailData) || '-' }}
        </el-descriptions-item>
        <el-descriptions-item
          label="开户行"
          :span="2"
        >
          {{ bankName(detailData) || '-' }}
        </el-descriptions-item>
        <el-descriptions-item
          label="账号"
          :span="2"
        >
          {{ maskAccountNo(accountNo(detailData)) }}
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">
          {{ formatDate(detailData.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.reviewedBy"
          label="审核人"
        >
          {{ detailData.reviewedBy }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.reviewNote"
          label="审核备注"
          :span="2"
        >
          {{ detailData.reviewNote }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 拒绝弹窗 -->
    <el-dialog
      v-model="rejectVisible"
      title="拒绝提现"
      width="450px"
    >
      <el-form label-width="80px">
        <el-form-item
          label="拒绝原因"
          required
        >
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入拒绝原因（必填）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="saving"
          @click="reject"
        >
          确认拒绝
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
