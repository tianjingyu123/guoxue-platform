<template>
  <div class="page">
    <div class="header">
      <el-button text @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
      <h3 v-if="merchant">{{ merchant.shopName }} — 商家详情</h3>
    </div>

    <el-tabs v-model="activeTab" v-loading="loading">
      <!-- 标签1: 店铺信息 -->
      <el-tab-pane label="店铺信息" name="info">
        <el-card v-if="merchant">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="店铺名称">{{ merchant.shopName }}</el-descriptions-item>
            <el-descriptions-item label="店铺状态">
              <el-tag :type="statusTagType(merchant.status)">{{ statusLabel(merchant.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="联系人">{{ merchant.contactName }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ merchant.contactPhone }}</el-descriptions-item>
            <el-descriptions-item label="经营类目">{{ merchant.categoryIds?.join(', ') || '未选择' }}</el-descriptions-item>
            <el-descriptions-item label="店铺评分">{{ Number(merchant.rating).toFixed(1) }}</el-descriptions-item>
            <el-descriptions-item label="入驻时间">{{ formatDate(merchant.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="开通时间">{{ formatDate(merchant.openedAt) }}</el-descriptions-item>
            <el-descriptions-item label="店铺简介" :span="2">{{ merchant.shopIntro || '暂无' }}</el-descriptions-item>
            <el-descriptions-item label="驳回原因" :span="2" v-if="merchant.rejectReason">
              <span style="color:red">{{ merchant.rejectReason }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="审核人">{{ merchant.reviewedBy || '-' }}</el-descriptions-item>
            <el-descriptions-item label="审核时间">{{ formatDate(merchant.reviewedAt) }}</el-descriptions-item>
            <el-descriptions-item label="保证金">{{ merchant.depositAmount ? '¥' + Number(merchant.depositAmount).toFixed(2) : '未设置' }}</el-descriptions-item>
            <el-descriptions-item label="分佣比例">{{ merchant.commissionRate ? (Number(merchant.commissionRate) * 100).toFixed(1) + '%' : '默认' }}</el-descriptions-item>
          </el-descriptions>

          <h4 style="margin:20px 0 12px">资质材料</h4>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="身份证正面">
              <el-image v-if="merchant.idCardFront" :src="merchant.idCardFront" style="width:200px;height:120px" fit="contain" preview-teleported />
              <span v-else class="text-muted">未上传</span>
            </el-descriptions-item>
            <el-descriptions-item label="身份证反面">
              <el-image v-if="merchant.idCardBack" :src="merchant.idCardBack" style="width:200px;height:120px" fit="contain" preview-teleported />
              <span v-else class="text-muted">未上传</span>
            </el-descriptions-item>
            <el-descriptions-item label="营业执照">
              <el-image v-if="merchant.businessLicense" :src="merchant.businessLicense" style="width:200px;height:120px" fit="contain" preview-teleported />
              <span v-else class="text-muted">未上传</span>
            </el-descriptions-item>
            <el-descriptions-item label="品牌授权书">
              <el-image v-if="merchant.brandAuth" :src="merchant.brandAuth" style="width:200px;height:120px" fit="contain" preview-teleported />
              <span v-else class="text-muted">未上传</span>
            </el-descriptions-item>
            <el-descriptions-item label="已签协议">
              <el-image v-if="merchant.agreementUrl" :src="merchant.agreementUrl" style="width:200px;height:120px" fit="contain" preview-teleported />
              <span v-else class="text-muted">未签署</span>
            </el-descriptions-item>
          </el-descriptions>

          <h4 style="margin:20px 0 12px">关联用户</h4>
          <el-descriptions v-if="merchant.user" :column="2" border>
            <el-descriptions-item label="用户昵称">{{ merchant.user.nickname }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ merchant.user.phone || '-' }}</el-descriptions-item>
          </el-descriptions>

          <div style="margin-top:20px">
            <template v-if="merchant.status === 'PENDING_REVIEW'">
              <el-button type="success" @click="openApprove">审核通过</el-button>
              <el-button type="danger" @click="openReject">审核驳回</el-button>
            </template>
            <template v-else-if="merchant.status === 'ACTIVE'">
              <el-button type="warning" @click="changeStatus('SUSPENDED')">暂停经营</el-button>
              <el-button type="danger" @click="changeStatus('CLOSED')">关闭店铺</el-button>
            </template>
            <template v-else-if="merchant.status === 'SUSPENDED'">
              <el-button type="success" @click="changeStatus('ACTIVE')">恢复经营</el-button>
            </template>
            <el-button @click="openCommission">设置分佣比例</el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 标签2: 经营数据 -->
      <el-tab-pane label="经营数据" name="stats">
        <div class="stats-row" v-if="stats">
          <el-statistic title="累计销售额" :value="Number(stats.totalSales)" prefix="¥" :precision="2" />
          <el-statistic title="累计订单数" :value="stats.totalOrders" />
          <el-statistic title="违规次数" :value="stats.violationCount" />
        </div>
        <el-empty v-else description="暂无数据" />
      </el-tab-pane>

      <!-- 标签3: 违规记录 -->
      <el-tab-pane label="违规记录" name="violations">
        <div style="margin-bottom:12px">
          <el-button type="primary" size="small" @click="openViolationDialog">新建违规</el-button>
        </div>
        <el-table :data="violations" stripe>
          <el-table-column label="程度" width="80">
            <template #default="{ row }">
              <el-tag :type="violationTagType(row.type)">{{ violationTypeLabel(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="150" />
          <el-table-column label="处罚金额" width="100">
            <template #default="{ row }">{{ row.penalty ? '¥' + Number(row.penalty).toFixed(2) : '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'CONFIRMED' ? 'danger' : row.status === 'DISMISSED' ? 'info' : 'warning'" size="small">
                {{ row.status === 'CONFIRMED' ? '已确认' : row.status === 'DISMISSED' ? '已驳回' : '待处理' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="160">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 标签4: 保证金 -->
      <el-tab-pane label="保证金记录" name="deposits">
        <div style="margin-bottom:12px">
          <el-button type="primary" size="small" @click="openRefund">退还保证金</el-button>
          <el-button size="small" @click="openAdjust">调整保证金</el-button>
        </div>
        <el-table :data="deposits" stripe>
          <el-table-column label="类型" width="90">
            <template #default="{ row }">{{ depositTypeLabel(row.type) }}</template>
          </el-table-column>
          <el-table-column label="金额" width="120">
            <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="payMethod" label="支付方式" width="100" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'danger' : 'warning'" size="small">
                {{ row.status === 'SUCCESS' ? '成功' : row.status === 'FAILED' ? '失败' : '处理中' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="150" />
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 审核通过对话框 -->
    <el-dialog v-model="approveDialog" title="审核通过" width="500px">
      <el-form :model="approveForm" label-width="100px">
        <el-form-item label="保证金金额">
          <el-input-number v-model="approveForm.depositAmount" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="分佣比例">
          <el-input-number v-model="approveForm.commissionRate" :min="0" :max="1" :step="0.01" :precision="4" style="width:100%" />
        </el-form-item>
        <el-form-item label="内部备注">
          <el-input v-model="approveForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doApprove">确认通过</el-button>
      </template>
    </el-dialog>

    <!-- 驳回对话框 -->
    <el-dialog v-model="rejectDialog" title="审核驳回" width="500px">
      <el-form label-width="80px">
        <el-form-item label="驳回原因" required>
          <el-input v-model="rejectReason" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doReject">确认驳回</el-button>
      </template>
    </el-dialog>

    <!-- 违规对话框 -->
    <el-dialog v-model="violationDialog" title="新建违规记录" width="500px">
      <el-form :model="violationForm" label-width="80px">
        <el-form-item label="违规程度" required>
          <el-select v-model="violationForm.type" style="width:100%">
            <el-option label="轻微" value="MINOR" />
            <el-option label="中等" value="MODERATE" />
            <el-option label="严重" value="SEVERE" />
          </el-select>
        </el-form-item>
        <el-form-item label="违规标题" required>
          <el-input v-model="violationForm.title" />
        </el-form-item>
        <el-form-item label="违规描述" required>
          <el-input v-model="violationForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="罚款金额">
          <el-input-number v-model="violationForm.penalty" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="violationForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="violationDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doCreateViolation">确认</el-button>
      </template>
    </el-dialog>

    <!-- 保证金退还对话框 -->
    <el-dialog v-model="refundDialog" title="退还保证金" width="400px">
      <el-form label-width="80px">
        <el-form-item label="退还金额">
          <el-input-number v-model="refundAmount" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="refundRemark" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doRefund">确认退还</el-button>
      </template>
    </el-dialog>

    <!-- 保证金调整对话框 -->
    <el-dialog v-model="adjustDialog" title="调整保证金" width="400px">
      <el-form label-width="80px">
        <el-form-item label="新金额" required>
          <el-input-number v-model="adjustAmount" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input v-model="adjustReason" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doAdjust">确认调整</el-button>
      </template>
    </el-dialog>

    <!-- 分佣比例对话框 -->
    <el-dialog v-model="commissionDialog" title="设置分佣比例" width="400px">
      <el-form label-width="100px">
        <el-form-item label="商家分佣比例">
          <el-input-number v-model="commissionRate" :min="0" :max="1" :step="0.01" :precision="4" style="width:100%" />
          <span style="margin-left:8px;color:#999">商家得 {{ (commissionRate * 100).toFixed(1) }}%</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="commissionDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doSetCommission">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { merchantApi } from '@/api'

const route = useRoute()
const id = route.params.id as string

const activeTab = ref('info')
const loading = ref(false)
const saving = ref(false)
const merchant = ref<any>(null)
const stats = ref<any>(null)
const violations = ref<any[]>([])
const deposits = ref<any[]>([])

const approveDialog = ref(false)
const rejectDialog = ref(false)
const rejectReason = ref('')
const approveForm = ref({ depositAmount: undefined as number | undefined, commissionRate: undefined as number | undefined, remark: '' })

const violationDialog = ref(false)
const violationForm = ref({ type: 'MINOR', title: '', description: '', penalty: undefined as number | undefined, remark: '' })

const refundDialog = ref(false)
const refundAmount = ref(0)
const refundRemark = ref('')

const adjustDialog = ref(false)
const adjustAmount = ref(0)
const adjustReason = ref('')

const commissionDialog = ref(false)
const commissionRate = ref(0.8)

const STATUS_MAP: Record<string, string> = {
  PENDING_REVIEW: '待审核', REVIEW_FAILED: '审核驳回', DEPOSIT_PENDING: '待缴保证金',
  AGREEMENT_PENDING: '待签署协议', ACTIVE: '已开通', SUSPENDED: '已暂停', CLOSED: '已关闭',
}
const VIOLATION_TYPE: Record<string, string> = { MINOR: '轻微', MODERATE: '中等', SEVERE: '严重' }
const DEPOSIT_TYPE: Record<string, string> = { PAYMENT: '缴纳', REFUND: '退还', DEDUCTION: '扣罚', TOPUP: '补缴' }

function statusLabel(s: string) { return STATUS_MAP[s] || s }
function statusTagType(s: string) {
  if (s === 'ACTIVE') return 'success'
  if (['PENDING_REVIEW', 'DEPOSIT_PENDING', 'AGREEMENT_PENDING'].includes(s)) return 'warning'
  if (s === 'REVIEW_FAILED' || s === 'CLOSED') return 'danger'
  return 'info'
}
function violationTypeLabel(t: string) { return VIOLATION_TYPE[t] || t }
function violationTagType(t: string) { return t === 'SEVERE' ? 'danger' : t === 'MODERATE' ? 'warning' : 'info' }
function depositTypeLabel(t: string) { return DEPOSIT_TYPE[t] || t }
function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-' }

onMounted(() => fetchDetail())

async function fetchDetail() {
  loading.value = true
  try {
    const res = await merchantApi.detail(id)
    merchant.value = (res.data as any)
    violations.value = merchant.value?.violations || []
    deposits.value = merchant.value?.depositRecords || []
  } finally { loading.value = false }
}

async function fetchStats() {
  try {
    const res = await merchantApi.stats(id)
    stats.value = res.data as any
  } catch { /* ignore */ }
}

// 审核
function openApprove() {
  approveForm.value = { depositAmount: undefined, commissionRate: undefined, remark: '' }
  approveDialog.value = true
}
async function doApprove() {
  saving.value = true
  try {
    await merchantApi.approve(id, { ...approveForm.value })
    ElMessage.success('审核已通过')
    approveDialog.value = false
    fetchDetail()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '操作失败') }
  finally { saving.value = false }
}
function openReject() { rejectReason.value = ''; rejectDialog.value = true }
async function doReject() {
  if (!rejectReason.value) { ElMessage.warning('请填写驳回原因'); return }
  saving.value = true
  try {
    await merchantApi.reject(id, { reason: rejectReason.value })
    ElMessage.success('已驳回')
    rejectDialog.value = false
    fetchDetail()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '操作失败') }
  finally { saving.value = false }
}
async function changeStatus(status: string) {
  const label = status === 'SUSPENDED' ? '暂停' : status === 'ACTIVE' ? '恢复' : '关闭'
  try {
    await ElMessageBox.confirm(`确定${label}该商家吗？`, '提示', { type: 'warning' })
    await merchantApi.updateStatus(id, { status })
    ElMessage.success(`已${label}`)
    fetchDetail()
  } catch { /* cancelled */ }
}

// 违规
function openViolationDialog() {
  violationForm.value = { type: 'MINOR', title: '', description: '', penalty: undefined, remark: '' }
  violationDialog.value = true
}
async function doCreateViolation() {
  if (!violationForm.value.title || !violationForm.value.description) { ElMessage.warning('请填写完整'); return }
  saving.value = true
  try {
    await merchantApi.createViolation(id, violationForm.value as any)
    ElMessage.success('违规记录已创建')
    violationDialog.value = false
    fetchDetail()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '操作失败') }
  finally { saving.value = false }
}

// 保证金
function openRefund() { refundAmount.value = 0; refundRemark.value = ''; refundDialog.value = true }
async function doRefund() {
  saving.value = true
  try {
    await merchantApi.refundDeposit(id, { amount: refundAmount.value || undefined, remark: refundRemark.value || undefined })
    ElMessage.success('保证金已退还')
    refundDialog.value = false
    fetchDetail()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '操作失败') }
  finally { saving.value = false }
}
function openAdjust() { adjustAmount.value = 0; adjustReason.value = ''; adjustDialog.value = true }
async function doAdjust() {
  if (!adjustAmount.value) { ElMessage.warning('请输入新金额'); return }
  saving.value = true
  try {
    await merchantApi.adjustDeposit(id, { amount: adjustAmount.value, reason: adjustReason.value || undefined })
    ElMessage.success('保证金已调整')
    adjustDialog.value = false
    fetchDetail()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '操作失败') }
  finally { saving.value = false }
}

// 分佣
function openCommission() {
  commissionRate.value = merchant.value?.commissionRate ? Number(merchant.value.commissionRate) : 0.8
  commissionDialog.value = true
}
async function doSetCommission() {
  saving.value = true
  try {
    await merchantApi.setCommission(id, { rate: commissionRate.value })
    ElMessage.success('分佣比例已更新')
    commissionDialog.value = false
    fetchDetail()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '操作失败') }
  finally { saving.value = false }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.header h3 { margin: 0; }
.stats-row { display: flex; gap: 40px; padding: 20px; }
.text-muted { color: #999; }
</style>
