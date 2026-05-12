<template>
  <div class="page">
    <div class="toolbar"><h3>优惠券模板</h3><el-button type="primary" @click="openCreate">创建模板</el-button></div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="name" label="模板名称" min-width="140" />
      <el-table-column label="类型" width="90"><template #default="{ row }">{{ row.type === 'FULL_REDUCE' ? '满减' : row.type === 'DISCOUNT' ? '折扣' : '无门槛' }}</template></el-table-column>
      <el-table-column label="面额" width="100"><template #default="{ row }">¥{{ Number(row.discountAmount || row.value).toFixed(2) }}</template></el-table-column>
      <el-table-column label="门槛" width="80"><template #default="{ row }">{{ row.minAmount ? '¥'+Number(row.minAmount) : '无' }}</template></el-table-column>
      <el-table-column label="总量" width="80"><template #default="{ row }">{{ row.totalCount === -1 ? '不限' : row.totalCount }}</template></el-table-column>
      <el-table-column label="有效期" width="280"><template #default="{ row }">{{ formatDate(row.validStart) }} ~ {{ formatDate(row.validEnd) }}</template></el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="success" @click="openGrant(row)">发放</el-button>
          <el-button size="small" @click="openRecords(row)">记录</el-button>
          <el-button size="small" type="danger" @click="del(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 20" style="margin-top:16px;display:flex;justify-content:flex-end">
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" @current-change="fetchList" />
    </div>

    <!-- 创建/编辑弹窗 -->
    <el-dialog v-model="vis" :title="editingId ? '编辑模板' : '创建模板'" width="550px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="类型"><el-select v-model="form.type" style="width:100%"><el-option label="满减" value="FULL_REDUCE" /><el-option label="折扣" value="DISCOUNT" /><el-option label="无门槛" value="NO_THRESHOLD" /></el-select></el-form-item></el-col><el-col :span="12"><el-form-item label="面额/折扣"><el-input-number v-model="form.discountAmount" :min="0.01" :precision="2" style="width:100%" /></el-form-item></el-col></el-row>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="门槛金额"><el-input-number v-model="form.minAmount" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col><el-col :span="12"><el-form-item label="发放总量"><el-input-number v-model="form.totalCount" :min="-1" :step="100" style="width:100%" /></el-form-item></el-col></el-row>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="开始时间"><el-date-picker v-model="form.validStart" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item></el-col><el-col :span="12"><el-form-item label="结束时间"><el-date-picker v-model="form.validEnd" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item></el-col></el-row>
      </el-form>
      <template #footer><el-button @click="vis = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>

    <!-- 发放弹窗 -->
    <el-dialog v-model="grantVis" title="发放优惠券" width="480px">
      <div v-if="grantTarget">
        <p><b>模板：</b>{{ grantTarget.name }}</p>
        <el-form label-width="90px">
          <el-form-item label="发放方式">
            <el-radio-group v-model="grantMode">
              <el-radio value="single">单个用户</el-radio>
              <el-radio value="batch">批量用户</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="grantMode === 'single'" label="用户ID">
            <el-input v-model="grantUserId" placeholder="输入用户ID" />
          </el-form-item>
          <el-form-item v-if="grantMode === 'batch'" label="用户ID列表">
            <el-input v-model="grantUserIds" type="textarea" :rows="4" placeholder="每行一个用户ID" />
          </el-form-item>
          <el-form-item label="数量">
            <el-input-number v-model="grantCount" :min="1" :max="100" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="grantVis = false">取消</el-button>
        <el-button type="primary" :loading="granting" @click="doGrant">确认发放</el-button>
      </template>
    </el-dialog>

    <!-- 发放记录弹窗 -->
    <el-dialog v-model="recordsVis" title="发放记录" width="650px">
      <el-table :data="records" stripe max-height="400">
        <el-table-column prop="userId" label="用户ID" width="120" />
        <el-table-column prop="userName" label="用户名" width="120" />
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag size="small" :type="row.status === 'USED' ? 'success' : row.status === 'EXPIRED' ? 'danger' : 'info'">{{ (recordStatusMap as Record<string,string>)[row.status] || row.status }}</el-tag></template></el-table-column>
        <el-table-column label="领取时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi } from '@/api'

const loading = ref(false); const saving = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref('')
const form = reactive({ name: '', type: 'FULL_REDUCE', discountAmount: 10, minAmount: 100, totalCount: -1, validStart: '', validEnd: '' })

const grantVis = ref(false); const granting = ref(false); const grantTarget = ref<any>(null)
const grantMode = ref('single'); const grantUserId = ref(''); const grantUserIds = ref(''); const grantCount = ref(1)

const recordsVis = ref(false); const records = ref<any[]>([]); const recordsLoading = ref(false)

const recordStatusMap = { USED: '已使用', UNUSED: '未使用', EXPIRED: '已过期' }

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try { const { data } = await marketingApi.listCoupons({ page: page.value, pageSize: 20 }); list.value = data.coupons || data.data || []; total.value = data.total || 0 } catch { list.value = [] } finally { loading.value = false }
}
function openCreate() { editingId.value = ''; Object.assign(form, { name: '', type: 'FULL_REDUCE', discountAmount: 10, minAmount: 100, totalCount: -1, validStart: '', validEnd: '' }); vis.value = true }
function openEdit(row: any) { editingId.value = row.id; Object.assign(form, { name: row.name, type: row.type, discountAmount: Number(row.discountAmount || row.value), minAmount: Number(row.minAmount) || 0, totalCount: row.totalCount ?? -1, validStart: row.validStart || '', validEnd: row.validEnd || '' }); vis.value = true }
async function save() {
  saving.value = true
  try {
    if (editingId.value) { await marketingApi.updateCoupon(editingId.value, form) } else { await marketingApi.createCoupon(form) }
    ElMessage.success('已保存'); vis.value = false; fetchList()
  } catch { } finally { saving.value = false }
}
async function del(id: string) { try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await marketingApi.deleteCoupon(id); ElMessage.success('已删除'); fetchList() } catch {} }

function openGrant(row: any) { grantTarget.value = row; grantMode.value = 'single'; grantUserId.value = ''; grantUserIds.value = ''; grantCount.value = 1; grantVis.value = true }

async function doGrant() {
  granting.value = true
  try {
    const templateId = grantTarget.value.id
    if (grantMode.value === 'single') {
      await marketingApi.grantCoupon(templateId, { userId: grantUserId.value, count: grantCount.value })
    } else {
      const ids = grantUserIds.value.split('\n').map(s => s.trim()).filter(Boolean)
      await marketingApi.batchGrantCoupon(templateId, { userIds: ids, count: grantCount.value })
    }
    ElMessage.success('发放成功'); grantVis.value = false
  } catch { } finally { granting.value = false }
}

async function openRecords(row: any) {
  recordsVis.value = true; recordsLoading.value = true
  try { const { data } = await marketingApi.getCouponRecords(row.id); records.value = data.records || data.data || [] } catch { records.value = [] } finally { recordsLoading.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
