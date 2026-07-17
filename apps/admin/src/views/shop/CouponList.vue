<template>
  <div class="coupon-page">
    <div class="toolbar">
      <h3>优惠券管理</h3>
      <div>
        <el-button @click="exportData">
          导出CSV
        </el-button>
        <el-button
          type="primary"
          @click="openCreate"
        >
          创建优惠券
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        加载失败，请
        <el-button
          link
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <!-- 优惠券列表 -->
    <el-table
      v-loading="loading"
      :data="coupons"
      stripe
    >
      <template #empty>
        <el-empty description="暂无优惠券" />
      </template>
      <el-table-column
        prop="name"
        label="名称"
        min-width="140"
      />
      <el-table-column
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ typeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="优惠"
        width="120"
      >
        <template #default="{ row }">
          <span v-if="row.type === 'DISCOUNT'">{{ row.discountRate ? (Number(row.discountRate) * 100).toFixed(0) + '%' : Number(row.value).toFixed(0) + '%' }}折扣</span>
          <span v-else>减 ¥{{ Number(row.discountAmount || row.value).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="门槛"
        width="90"
      >
        <template #default="{ row }">
          <span v-if="row.minAmount">满¥{{ Number(row.minAmount).toFixed(0) }}</span>
          <span v-else>无门槛</span>
        </template>
      </el-table-column>
      <el-table-column
        label="总量/已用"
        width="100"
      >
        <template #default="{ row }">
          {{ row.totalCount === -1 ? '不限' : row.totalCount }} / {{ row.usedCount }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="row.status === 'ACTIVE' ? 'success' : 'info'"
          >
            {{ row.status === 'ACTIVE' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="有效期"
        width="280"
      >
        <template #default="{ row }">
          {{ formatDate(row.validStart) }} ~ {{ formatDate(row.validEnd) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="290"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            plain
            :disabled="row.status !== 'ACTIVE'"
            @click="openGrant(row)"
          >
            发放
          </el-button>
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            :type="row.status === 'ACTIVE' ? 'warning' : 'success'"
            @click="toggleStatus(row)"
          >
            {{ row.status === 'ACTIVE' ? '禁用' : '启用' }}
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="handleDelete(row)"
          >
            删除
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

    <!-- 批量发放弹窗（券体系统一后的唯一发放口：直发用户券包，下单即可核销） -->
    <el-dialog
      v-model="grantVisible"
      :title="`发放优惠券：${grantTarget?.name || ''}`"
      width="560px"
    >
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
        title="发放后立即进入用户券包，下单可直接抵扣；已持有本券未使用的用户将自动跳过。"
      />
      <el-input
        v-model="grantUserIdsText"
        type="textarea"
        :rows="6"
        placeholder="输入目标用户 ID，逗号或换行分隔，单次最多 500 人"
      />
      <div class="grant-hint">
        用户 ID 从哪来：在「用户管理」列表搜索目标用户后复制其 ID；也可从运营活动导出的用户名单粘贴。
      </div>
      <template #footer>
        <el-button @click="grantVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="granting"
          @click="submitGrant"
        >
          确认发放
        </el-button>
      </template>
    </el-dialog>

    <!-- 创建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑优惠券' : '创建优惠券'"
      width="650px"
    >
      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="名称"
          required
        >
          <el-input
            v-model="form.name"
            placeholder="优惠券名称"
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item
              label="类型"
              required
            >
              <el-select
                v-model="form.type"
                style="width:100%"
              >
                <el-option
                  label="满减"
                  value="FULL_REDUCE"
                />
                <el-option
                  label="折扣"
                  value="DISCOUNT"
                />
                <el-option
                  label="无门槛"
                  value="NO_THRESHOLD"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="范围">
              <el-select
                v-model="form.scope"
                style="width:100%"
              >
                <el-option
                  label="全部商品"
                  value="ALL"
                />
                <el-option
                  label="指定商品"
                  value="PRODUCT"
                />
                <el-option
                  label="课程"
                  value="COURSE"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item
              v-if="form.type === 'DISCOUNT'"
              label="折扣率"
              required
            >
              <el-input-number
                v-model="form.discountRate"
                :min="0.01"
                :max="0.99"
                :step="0.05"
                :precision="2"
                style="width:100%"
              />
              <span style="color:#999;font-size:12px;margin-left:4px;">如 0.85 = 85折</span>
            </el-form-item>
            <el-form-item
              v-else
              label="减免金额"
              required
            >
              <el-input-number
                v-model="form.discountAmount"
                :min="0.01"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="使用门槛">
              <el-input-number
                v-model="form.minAmount"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="总量">
              <el-input-number
                v-model="form.totalCount"
                :min="-1"
                :step="100"
                style="width:100%"
              />
              <span style="color:#999;font-size:12px;">-1 为不限量</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select
                v-model="form.status"
                style="width:100%"
              >
                <el-option
                  label="启用"
                  value="ACTIVE"
                />
                <el-option
                  label="禁用"
                  value="DISABLED"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item
              label="生效时间"
              required
            >
              <el-date-picker
                v-model="form.validStart"
                type="datetime"
                placeholder="选择日期"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="过期时间"
              required
            >
              <el-date-picker
                v-model="form.validEnd"
                type="datetime"
                placeholder="选择日期"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveCoupon"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { shopApi } from '@/api'
import { exportCSV } from '@/utils/export'

/** 优惠券行（字段宽松 optional） */
interface CouponRow {
  id?: string
  name?: string
  type?: string
  value?: number | string
  discountRate?: number | string
  discountAmount?: number | string
  minAmount?: number | string
  scope?: string
  totalCount?: number
  usedCount?: number
  status?: string
  validStart?: string
  validEnd?: string
}

const coupons = ref<CouponRow[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const toggling = ref(false)
const deleting = ref(false)

const dialogVisible = ref(false)

// 批量发放
const grantVisible = ref(false)
const grantTarget = ref<{ id?: string; name?: string } | null>(null)
const grantUserIdsText = ref('')
const granting = ref(false)

function openGrant(row: { id?: string; name?: string }) {
  grantTarget.value = row
  grantUserIdsText.value = ''
  grantVisible.value = true
}

async function submitGrant() {
  if (granting.value) return
  const userIds = grantUserIdsText.value.split(/[\s,，;；]+/).map((s) => s.trim()).filter(Boolean)
  if (!userIds.length) { ElMessage.warning('请输入至少一个用户 ID'); return }
  if (userIds.length > 500) { ElMessage.warning('单次最多发放 500 人'); return }
  granting.value = true
  try {
    const { data } = await shopApi.batchGrantCoupon(grantTarget.value?.id ?? '', userIds)
    ElMessage.success(`发放完成：成功 ${data?.granted ?? 0} 人，跳过 ${data?.skipped ?? 0} 人（已持有）`)
    grantVisible.value = false
    fetchList()
  } catch {
    // 错误由响应拦截器统一提示
  } finally {
    granting.value = false
  }
}
const editingId = ref('')

const form = reactive({
  name: '',
  type: 'FULL_REDUCE',
  discountAmount: 10,
  discountRate: 0.85,
  minAmount: 100,
  scope: 'ALL',
  totalCount: -1,
  status: 'ACTIVE',
  validStart: '',
  validEnd: '',
})

onMounted(() => fetchList())

function typeLabel(type: string) {
  return { FULL_REDUCE: '满减', DISCOUNT: '折扣', NO_THRESHOLD: '无门槛' }[type] || type
}

function exportData() {
  exportCSV(
    "优惠券列表",
    [
      { label: "名称", key: "name" },
      { label: "类型", key: "typeLabel" },
      { label: "优惠值", key: "valueStr" },
      { label: "门槛", key: "minAmount" },
      { label: "总量", key: "totalCount" },
      { label: "已用", key: "usedCount" },
      { label: "状态", key: "statusLabel" },
      { label: "有效期开始", key: "validStart" },
      { label: "有效期结束", key: "validEnd" },
    ],
    coupons.value.map((c) => ({
      ...c,
      typeLabel: typeLabel(c.type ?? ''),
      valueStr: c.type === 'DISCOUNT' ? `${(Number(c.discountRate) * 100).toFixed(0)}%折扣` : `减¥${Number(c.discountAmount || c.value).toFixed(2)}`,
      minAmount: c.minAmount ? `¥${Number(c.minAmount).toFixed(0)}` : "无门槛",
      totalCount: c.totalCount === -1 ? "不限" : c.totalCount,
      statusLabel: c.status === 'ACTIVE' ? '启用' : '禁用',
      validStart: c.validStart ? new Date(c.validStart).toLocaleString() : '-',
      validEnd: c.validEnd ? new Date(c.validEnd).toLocaleString() : '-',
    })),
  );
}

function formatDate(d: string | Date) {
  if (!d) return '-'
  return new Date(d).toLocaleString()
}

function resetForm() {
  Object.assign(form, {
    name: '', type: 'FULL_REDUCE', discountAmount: 10, discountRate: 0.85,
    minAmount: 100, scope: 'ALL', totalCount: -1, status: 'ACTIVE',
    validStart: '', validEnd: '',
  })
  editingId.value = ''
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: CouponRow) {
  resetForm()
  editingId.value = row.id ?? ''
  Object.assign(form, {
    name: row.name || '',
    type: row.type,
    discountAmount: Number(row.discountAmount || row.value || 0),
    discountRate: Number(row.discountRate || (row.type === 'DISCOUNT' ? Number(row.value) / 100 : 0.85)),
    minAmount: row.minAmount ? Number(row.minAmount) : 0,
    scope: row.scope || 'ALL',
    totalCount: row.totalCount ?? -1,
    status: row.status || 'ACTIVE',
    validStart: row.validStart,
    validEnd: row.validEnd,
  })
  dialogVisible.value = true
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    // 管理后台传 admin=true 查看全部优惠券（含已过期/禁用）
    const { data } = await shopApi.listCoupons({ page: page.value, pageSize: 20, admin: 'true' })
    coupons.value = data.coupons
    total.value = data.total
  } catch {
    coupons.value = []
    total.value = 0
    error.value = true
  } finally { loading.value = false }
}

async function saveCoupon() {
  saving.value = true
  try {
    const payload = { ...form }
    if (editingId.value) {
      await shopApi.updateCoupon(editingId.value, payload)
      ElMessage.success('已更新')
    } else {
      await shopApi.createCoupon(payload)
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
  } finally { saving.value = false }
}

async function toggleStatus(row: CouponRow) {
  if (toggling.value) return
  toggling.value = true
  const newStatus = row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await shopApi.updateCouponStatus(row.id ?? '', newStatus)
    ElMessage.success(newStatus === 'ACTIVE' ? '已启用' : '已禁用')
    fetchList()
  } catch {
  } finally { toggling.value = false }
}

/** 删除确认（L3 影响预告）：带券名 + 已使用量警示（Coupon 表无已领取计数，以 usedCount 为已知影响口径） */
async function handleDelete(row: CouponRow) {
  try {
    await ElMessageBox.confirm(
      `确定删除优惠券「${row.name || row.id}」吗？该券已被使用 ${row.usedCount ?? 0} 次；` +
      '删除后已发放到用户券包的该券将无法继续使用，且不可恢复。如只是暂停发放，请用"禁用"。',
      '删除优惠券',
      { type: 'warning', confirmButtonText: '确认删除', confirmButtonClass: 'el-button--danger' },
    )
    if (deleting.value) return
    deleting.value = true
    await shopApi.deleteCoupon(row.id ?? '')
    ElMessage.success('已删除')
    fetchList()
  } catch { /* 取消 */ } finally { deleting.value = false }
}
</script>

<style scoped>
.coupon-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.grant-hint { margin-top: 8px; font-size: 12px; color: #909399; }
</style>
