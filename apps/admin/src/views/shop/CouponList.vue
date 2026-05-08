<template>
  <div class="coupon-page">
    <div class="toolbar">
      <h3>优惠券管理</h3>
      <div>
        <el-button @click="exportData">导出CSV</el-button>
        <el-button type="primary" @click="openCreate">创建优惠券</el-button>
      </div>
    </div>

    <!-- 优惠券列表 -->
    <el-table :data="coupons" v-loading="loading" stripe>
      <el-table-column prop="name" label="名称" min-width="140" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ typeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="优惠" width="120">
        <template #default="{ row }">
          <span v-if="row.type === 'DISCOUNT'">{{ row.discountRate ? (Number(row.discountRate) * 100).toFixed(0) + '%' : Number(row.value).toFixed(0) + '%' }}折扣</span>
          <span v-else>减 ¥{{ Number(row.discountAmount || row.value).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="门槛" width="90">
        <template #default="{ row }">
          <span v-if="row.minAmount">满¥{{ Number(row.minAmount).toFixed(0) }}</span>
          <span v-else>无门槛</span>
        </template>
      </el-table-column>
      <el-table-column label="总量/已用" width="100">
        <template #default="{ row }">
          {{ row.totalCount === -1 ? '不限' : row.totalCount }} / {{ row.usedCount }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'ACTIVE' ? 'success' : 'info'">
            {{ row.status === 'ACTIVE' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="有效期" width="280">
        <template #default="{ row }">
          {{ formatDate(row.validStart) }} ~ {{ formatDate(row.validEnd) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" :type="row.status === 'ACTIVE' ? 'warning' : 'success'" @click="toggleStatus(row)">
            {{ row.status === 'ACTIVE' ? '禁用' : '启用' }}
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page" :total="total" :page-size="20"
      layout="total, prev, pager, next" @current-change="fetchList"
      style="margin-top:16px;justify-content:flex-end"
    />

    <!-- 创建/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑优惠券' : '创建优惠券'" width="650px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="优惠券名称" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="类型" required>
              <el-select v-model="form.type" style="width:100%">
                <el-option label="满减" value="FULL_REDUCE" />
                <el-option label="折扣" value="DISCOUNT" />
                <el-option label="无门槛" value="NO_THRESHOLD" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="范围">
              <el-select v-model="form.scope" style="width:100%">
                <el-option label="全部商品" value="ALL" />
                <el-option label="指定商品" value="PRODUCT" />
                <el-option label="课程" value="COURSE" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item v-if="form.type === 'DISCOUNT'" label="折扣率" required>
              <el-input-number v-model="form.discountRate" :min="0.01" :max="0.99" :step="0.05" :precision="2" style="width:100%" />
              <span style="color:#999;font-size:12px;margin-left:4px;">如 0.85 = 85折</span>
            </el-form-item>
            <el-form-item v-else label="减免金额" required>
              <el-input-number v-model="form.discountAmount" :min="0.01" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="使用门槛">
              <el-input-number v-model="form.minAmount" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="总量">
              <el-input-number v-model="form.totalCount" :min="-1" :step="100" style="width:100%" />
              <span style="color:#999;font-size:12px;">-1 为不限量</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width:100%">
                <el-option label="启用" value="ACTIVE" />
                <el-option label="禁用" value="DISABLED" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="生效时间" required>
              <el-date-picker v-model="form.validStart" type="datetime" placeholder="选择日期" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="过期时间" required>
              <el-date-picker v-model="form.validEnd" type="datetime" placeholder="选择日期" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCoupon" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../../api'
import { exportCSV } from '../../utils/export'

const coupons = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const saving = ref(false)

const dialogVisible = ref(false)
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
      typeLabel: typeLabel(c.type),
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

function openEdit(row: any) {
  resetForm()
  editingId.value = row.id
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
  try {
    // 管理后台传 admin=true 查看全部优惠券（含已过期/禁用）
    const { data } = await api.get('/shop/coupons', { params: { page: page.value, pageSize: 20, admin: 'true' } })
    coupons.value = data.coupons
    total.value = data.total
  } finally { loading.value = false }
}

async function saveCoupon() {
  saving.value = true
  try {
    const payload = { ...form }
    if (editingId.value) {
      await api.put(`/shop/coupons/${editingId.value}`, payload)
      ElMessage.success('已更新')
    } else {
      await api.post('/shop/coupons', payload)
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    fetchList()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally { saving.value = false }
}

async function toggleStatus(row: any) {
  const newStatus = row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await api.put(`/shop/coupons/${row.id}`, { status: newStatus })
    ElMessage.success(newStatus === 'ACTIVE' ? '已启用' : '已禁用')
    fetchList()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定删除此优惠券？', '提示', { type: 'warning' })
    await api.delete(`/shop/coupons/${row.id}`)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* 取消 */ }
}
</script>

<style scoped>
.coupon-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
</style>
