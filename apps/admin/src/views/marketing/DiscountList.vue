<template>
  <div class="page">
    <div class="toolbar"><h3>限时折扣</h3><el-button type="primary" @click="openCreate">创建折扣</el-button></div>
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="6"><el-card shadow="hover"><el-statistic title="进行中" :value="activeCount" /></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><el-statistic title="已停用" :value="inactiveCount" /></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><el-statistic title="折扣总数" :value="list.length" /></el-card></el-col>
    </el-row>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="name" label="活动名称" min-width="150" />
      <el-table-column label="折扣率" width="80"><template #default="{ row }">{{ row.discountPct }}%</template></el-table-column>
      <el-table-column label="适用商品" min-width="120"><template #default="{ row }">{{ (row.productIds || []).join(', ') || '全部' }}</template></el-table-column>
      <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
      <el-table-column label="有效期" width="280"><template #default="{ row }">{{ formatDate(row.startTime) }} ~ {{ formatDate(row.endTime) }}</template></el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="row.status === 'DRAFT'" size="small" type="success" @click="activate(row.id)">启用</el-button>
          <el-button v-if="row.status === 'ACTIVE'" size="small" type="warning" @click="deactivate(row.id)">停用</el-button>
          <el-button size="small" type="danger" @click="del(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 20" style="margin-top:16px;display:flex;justify-content:flex-end">
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" @current-change="fetchList" />
    </div>

    <el-dialog v-model="vis" :title="editingId ? '编辑折扣' : '创建折扣'" width="500px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="适用商品ID"><el-input v-model="form.productIdsStr" placeholder="多个用逗号分隔，留空则全场" /></el-form-item>
        <el-form-item label="折扣率(%)"><el-input-number v-model="form.discountPct" :min="1" :max="99" :step="5" style="width:100%" /></el-form-item>
        <el-form-item v-if="editingId" label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="进行中" value="ACTIVE" />
            <el-option label="已结束" value="ENDED" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="开始时间"><el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item></el-col><el-col :span="12"><el-form-item label="结束时间"><el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item></el-col></el-row>
      </el-form>
      <template #footer><el-button @click="vis = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi } from '@/api'

const loading = ref(false); const saving = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref('')
const form = reactive({ name: '', productIdsStr: '', discountPct: 85, status: 'DRAFT', startTime: '', endTime: '' })

onMounted(() => fetchList())
const activeCount = computed(() => list.value.filter((d: any) => d.status === 'ACTIVE').length)
const inactiveCount = computed(() => list.value.filter((d: any) => d.status !== 'ACTIVE').length)

function statusType(s: string) {
  const m: Record<string, string> = { DRAFT: 'info', ACTIVE: 'success', ENDED: 'warning' }
  return m[s] || 'info'
}
function statusLabel(s: string) {
  const m: Record<string, string> = { DRAFT: '草稿', ACTIVE: '进行中', ENDED: '已结束' }
  return m[s] || s
}
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try { const { data } = await marketingApi.listDiscounts({ page: page.value, pageSize: 20 }); list.value = data.items || data.data || []; total.value = data.total || 0 } catch { list.value = [] } finally { loading.value = false }
}
function openCreate() { editingId.value = ''; Object.assign(form, { name: '', productIdsStr: '', discountPct: 85, status: 'DRAFT', startTime: '', endTime: '' }); vis.value = true }
function openEdit(row: any) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    productIdsStr: (row.productIds || []).join(','),
    discountPct: row.discountPct,
    status: row.status || 'DRAFT',
    startTime: row.startTime || '',
    endTime: row.endTime || '',
  })
  vis.value = true
}
async function save() {
  saving.value = true
  try {
    const productIds = form.productIdsStr ? form.productIdsStr.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    const payload: any = {
      name: form.name,
      discountPct: form.discountPct,
      startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
      endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
      productIds,
    }
    if (editingId.value) {
      if (form.status) payload.status = form.status
      await marketingApi.updateDiscount(editingId.value, payload)
    } else {
      await marketingApi.createDiscount(payload)
    }
    ElMessage.success('已保存'); vis.value = false; fetchList()
  } catch { } finally { saving.value = false }
}
async function activate(id: string) { await marketingApi.updateDiscount(id, { status: 'ACTIVE' }); fetchList() }
async function deactivate(id: string) { await marketingApi.updateDiscount(id, { status: 'ENDED' }); fetchList() }
async function del(id: string) { try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await marketingApi.deleteDiscount(id); ElMessage.success('已删除'); fetchList() } catch {} }
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
