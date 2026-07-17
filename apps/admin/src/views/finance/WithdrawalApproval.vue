<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { api, financeApi } from '@/api'
import { exportCSV } from '@/utils/export'

const router = useRouter()

// 提现申请行（后端 WithdrawalApplication：amount/fee/taxAmount/actualAmount/payMethod/accountInfo/status）
interface WithdrawalRow {
  id: string
  userId?: string
  amount?: number
  fee?: number
  taxAmount?: number
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

function formatDate(d?: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '—' }
function formatMoney(v: number | string | null | undefined) {
  if (v == null) return '—'
  return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function maskAccountNo(no: unknown) {
  const s = no != null ? String(no) : ''
  if (!s) return '—'
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
  return map[payMethodOf(m)] || m || '—'
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

async function copyText(text?: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制')
  }
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
      `确定批准用户 ${row.userId} 的提现申请？\n申请金额：${formatMoney(row.amount)}（实际到账 ${formatMoney(row.actualAmount ?? row.amount)}）`,
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
      `将通过微信商家转账（零钱代付）向用户支付 ${formatMoney(row.actualAmount ?? row.amount)}（实际到账额）。\n\n` +
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

// ───────── 人工打款（照 commission 提现审核范式重构）─────────
//
// 此前是弹个确认框就把状态标 PAID —— 但管理员那时【根本没拿到完整收款账号】（列表一律脱敏），
// 也没有转账流水号，等于「没转账就标已打款」。
// 正确顺序：审核通过 → 取收款账户明文（后端强制审计留痕）→ 线下转账 → 回填流水号确认打款。
// 流水号是出款幂等键（DB 唯一约束），既保证可对账，也防重复打款。
const payoutVisible = ref(false)
const payoutRow = ref<WithdrawalRow | null>(null)
const payoutAccount = ref<PayoutAccount | null>(null)
const payoutRef = ref('')
const revealing = ref(false)
// 取号端点未部署（404）→ 红色警示 + 禁用确认钮，绝不允许"盲打"
const revealUnavailable = ref(false)

interface PayoutAccount {
  id: string
  userId: string
  amount: number
  actualAmount: number
  payMethod: string
  accountInfo?: Record<string, any>
}

function payoutAcct(): Record<string, any> {
  const a = payoutAccount.value?.accountInfo
  return a && typeof a === 'object' ? a : {}
}

async function openPayout(row: WithdrawalRow) {
  payoutRow.value = row
  payoutAccount.value = null
  payoutRef.value = ''
  revealUnavailable.value = false
  payoutVisible.value = true
  // 取完整收款账户：唯一返回明文账号的接口，后端每次调用强制写审计（谁、何时、看了哪条）
  revealing.value = true
  try {
    const res = await api.get(`/finance/withdrawals/${row.id}/payout-account`)
    payoutAccount.value = res.data as PayoutAccount
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      // 后端取号端点尚未部署：诚实降级，禁止在拿不到收款账号的情况下打款
      revealUnavailable.value = true
    } else {
      ElMessage.error('获取收款账户失败：' + errMsg(e))
      payoutVisible.value = false
    }
  } finally {
    revealing.value = false
  }
}

async function confirmPayout() {
  if (saving.value || !payoutRow.value || !payoutAccount.value) return
  const ref_ = payoutRef.value.trim()
  if (ref_.length < 4) {
    ElMessage.warning('请填写转账流水号（银行回单号 / 微信、支付宝转账单号）')
    return
  }
  const payAmount = payoutAccount.value.actualAmount ?? payoutRow.value.actualAmount ?? payoutRow.value.amount
  try {
    await ElMessageBox.confirm(
      `确认已向用户 ${payoutRow.value.userId} 线下转账 ${formatMoney(payAmount)}（实际到账额）？\n流水号：${ref_}\n此操作不可撤销。`,
      '确认打款',
      { confirmButtonText: '确认已打款', cancelButtonText: '取消', type: 'warning' },
    )
    saving.value = true
    // 新契约：pay 必须带 payoutRef（出款幂等键）
    await api.post(`/finance/withdrawals/${payoutRow.value.id}/pay`, { payoutRef: ref_ })
    ElMessage.success('已确认打款')
    payoutVisible.value = false
    fetchList()
  } catch (e: unknown) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error('确认打款失败：' + errMsg(e))
  } finally {
    saving.value = false
  }
}

function errMsg(e: unknown): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || '未知错误'
}

function handleExport() {
  exportCSV('提现记录', [
    { label: '用户ID', key: 'userId' },
    { label: '申请金额', key: 'amount' },
    { label: '手续费', key: 'fee' },
    { label: '代扣税', key: 'taxAmount' },
    { label: '实际到账', key: 'actualAmount' },
    { label: '收款方式', key: 'payMethodLabel' },
    { label: '收款账户', key: 'account' },
    { label: '状态', key: 'statusLabel' },
    { label: '流水号', key: 'payoutRef' },
    { label: '申请时间', key: 'createdAt' },
  ], list.value.map(r => ({
    ...r,
    amount: formatMoney(r.amount),
    fee: formatMoney(r.fee ?? 0),
    taxAmount: formatMoney(r.taxAmount ?? 0),
    actualAmount: formatMoney(r.actualAmount ?? r.amount),
    payMethodLabel: payMethodLabel(r.payMethod),
    account: `${bankName(r)} ${maskAccountNo(accountNo(r))}`.trim(),
    statusLabel: statusLabel(r.status),
    payoutRef: r.payoutRef || '—',
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
          style="width:160px"
          @change="page = 1; fetchList()"
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
            label="已通过待打款"
            value="APPROVED"
          />
          <el-option
            label="待用户确认收款"
            value="TRANSFERRING"
          />
          <el-option
            label="已到账"
            value="PAID"
          />
          <el-option
            label="已拒绝"
            value="REJECTED"
          />
        </el-select>
        <el-button @click="handleExport">
          导出CSV
        </el-button>
        <el-button @click="fetchList">
          刷新
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
        <template #empty>
          <el-empty :description="statusFilter ? '该状态下暂无提现申请，换个筛选条件试试' : '暂无提现申请'" />
        </template>
        <el-table-column
          label="用户"
          width="110"
        >
          <template #default="{ row }">
            <el-tooltip
              v-if="row.userId"
              :content="row.userId + '（点击复制，详情页可跳转）'"
              placement="top"
            >
              <span
                class="copyable"
                @click="copyText(row.userId)"
              >{{ String(row.userId).slice(0, 8) }}</span>
            </el-tooltip>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="申请金额"
          width="110"
          align="right"
        >
          <template #default="{ row }">
            <span style="font-weight:600;color:#e6a23c">{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="手续费"
          width="90"
          align="right"
        >
          <template #default="{ row }">
            {{ formatMoney(row.fee ?? 0) }}
          </template>
        </el-table-column>
        <el-table-column
          label="代扣税"
          width="90"
          align="right"
        >
          <template #default="{ row }">
            {{ formatMoney(row.taxAmount ?? 0) }}
          </template>
        </el-table-column>
        <el-table-column
          label="实际到账"
          width="110"
          align="right"
        >
          <template #default="{ row }">
            <span style="font-weight:600">{{ formatMoney(row.actualAmount ?? row.amount) }}</span>
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
          min-width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span v-if="bankName(row) || accountNo(row)">{{ bankName(row) }} {{ maskAccountNo(accountNo(row)) }}</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="130"
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
          width="165"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="250"
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
            <el-tooltip
              v-if="row.status === 'APPROVED' && isWechat(row.payMethod)"
              content="通过微信商家转账把钱打到用户微信零钱；用户需在微信内确认收款"
              placement="top"
            >
              <el-button
                size="small"
                type="primary"
                :loading="saving"
                @click="autoPayout(row)"
              >
                自动打款
              </el-button>
            </el-tooltip>
            <el-button
              v-if="row.status === 'APPROVED'"
              size="small"
              :type="isWechat(row.payMethod) ? 'default' : 'primary'"
              @click="openPayout(row)"
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
      width="540px"
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
          <span
            v-if="detailData.userId"
            class="copyable"
            @click="copyText(detailData.userId)"
          >{{ detailData.userId }}</span>
          <el-button
            v-if="detailData.userId"
            link
            type="primary"
            size="small"
            style="margin-left:8px"
            @click="router.push(`/users/${detailData.userId}`)"
          >
            查看用户 →
          </el-button>
        </el-descriptions-item>
        <el-descriptions-item label="申请金额">
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
        <el-descriptions-item label="手续费">
          {{ formatMoney(detailData.fee ?? 0) }}
        </el-descriptions-item>
        <el-descriptions-item label="代扣税">
          {{ formatMoney(detailData.taxAmount ?? 0) }}
        </el-descriptions-item>
        <el-descriptions-item label="实际到账">
          <span style="font-weight:600">{{ formatMoney(detailData.actualAmount ?? detailData.amount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="收款方式">
          {{ payMethodLabel(detailData.payMethod) }}
        </el-descriptions-item>
        <el-descriptions-item label="开户名">
          {{ accountName(detailData) || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="开户行">
          {{ bankName(detailData) || '—' }}
        </el-descriptions-item>
        <el-descriptions-item
          label="账号(脱敏)"
          :span="2"
        >
          {{ maskAccountNo(accountNo(detailData)) }}
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">
          {{ formatDate(detailData.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detailData.payoutRef"
          label="打款流水号"
        >
          {{ detailData.payoutRef }}
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
        <el-descriptions-item
          v-if="detailData.transferFailReason"
          label="转账失败原因"
          :span="2"
        >
          <span style="color:#f56c6c">{{ detailData.transferFailReason }}</span>
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
          :disabled="!rejectForm.reason.trim()"
          @click="reject"
        >
          确认拒绝
        </el-button>
      </template>
    </el-dialog>

    <!-- 人工打款弹窗：取完整收款账户 → 线下转账 → 回填流水号确认 -->
    <el-dialog
      v-model="payoutVisible"
      title="人工打款确认"
      width="540px"
    >
      <el-alert
        v-if="revealUnavailable"
        type="error"
        :closable="false"
        show-icon
        title="收款账户取号端点待部署，禁止盲打"
        description="后端 GET /finance/withdrawals/:id/payout-account 尚未上线，拿不到完整收款账号。为防止打错账户，本次不允许确认打款；请等待后端部署后再操作。"
        style="margin-bottom:16px"
      />
      <el-alert
        v-else
        type="warning"
        :closable="false"
        show-icon
        title="本次查看完整收款账户已记入审计日志"
        description="请先在网银/微信/支付宝完成转账，再回填转账流水号。流水号唯一，可防重复打款。"
        style="margin-bottom:16px"
      />

      <div v-loading="revealing">
        <el-descriptions
          v-if="payoutAccount"
          :column="1"
          border
          size="small"
        >
          <el-descriptions-item label="打款金额（实际到账）">
            <span style="color:#f56c6c;font-weight:600;font-size:16px">
              {{ formatMoney(payoutAccount.actualAmount ?? payoutAccount.amount) }}
            </span>
            <span style="margin-left:8px;color:var(--color-text-secondary);font-size:12px">
              申请 {{ formatMoney(payoutAccount.amount) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="收款方式">
            {{ payMethodLabel(payoutAccount.payMethod) }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="payoutAcct().name || payoutAcct().accountName || payoutAcct().realName"
            label="开户名"
          >
            {{ payoutAcct().name || payoutAcct().accountName || payoutAcct().realName }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="payoutAcct().bankName || payoutAcct().bank"
            label="开户行"
          >
            {{ payoutAcct().bankName || payoutAcct().bank }}
          </el-descriptions-item>
          <el-descriptions-item label="收款账号（明文）">
            <span
              class="copyable"
              style="font-family:monospace;font-weight:600"
              @click="copyText(String(payoutAcct().cardNo || payoutAcct().account || payoutAcct().bankCard || payoutAcct().alipayAccount || payoutAcct().no || ''))"
            >{{ payoutAcct().cardNo || payoutAcct().account || payoutAcct().bankCard || payoutAcct().alipayAccount || payoutAcct().no || '—' }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-form
        label-width="90px"
        style="margin-top:16px"
      >
        <el-form-item
          label="转账流水号"
          required
        >
          <el-input
            v-model="payoutRef"
            :disabled="revealUnavailable"
            placeholder="银行回单号 / 微信、支付宝转账单号（必填·用于对账与防重复打款）"
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="payoutVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="saving"
          :disabled="revealUnavailable || !payoutAccount || payoutRef.trim().length < 4"
          @click="confirmPayout"
        >
          确认已打款
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
.copyable { cursor: pointer; color: var(--el-color-primary); }
</style>
