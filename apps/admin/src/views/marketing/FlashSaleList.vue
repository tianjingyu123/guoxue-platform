<template>
  <div class="page">
    <div class="toolbar"><h3>秒杀活动</h3><el-button type="primary" @click="openCreate">创建活动</el-button></div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="name" label="活动名称" min-width="150" />
      <el-table-column label="商品" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.items?.map((i:any) => i.product?.title || i.productId).join(', ') || '-' }}</template>
      </el-table-column>
      <el-table-column label="秒杀价" width="100">
        <template #default="{ row }">¥{{ Number(row.items?.[0]?.flashPrice || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">{{ row.status === 'ACTIVE' ? '进行中' : row.status === 'ENDED' ? '已结束' : '未开始' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="活动时间" width="300">
        <template #default="{ row }">{{ formatDate(row.startTime) }} ~ {{ formatDate(row.endTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="row.status !== 'ACTIVE'" size="small" type="success" @click="startActivity(row)">开始</el-button>
          <el-button v-if="row.status === 'ACTIVE'" size="small" type="warning" @click="endActivity(row)">结束</el-button>
          <el-button size="small" type="danger" @click="del(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 20" style="margin-top:16px;display:flex;justify-content:flex-end">
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" @current-change="fetchList" />
    </div>

    <el-dialog v-model="vis" :title="editingId ? '编辑秒杀' : '创建秒杀'" width="550px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="商品ID"><el-input v-model="form.productId" placeholder="商品ID" /></el-form-item>
        <el-form-item label="秒杀价"><el-input-number v-model="form.flashPrice" :min="0.01" :precision="2" style="width:100%" /></el-form-item>
        <el-form-item label="限购数"><el-input-number v-model="form.limitPerUser" :min="1" style="width:100%" /></el-form-item>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="开始时间"><el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item></el-col><el-col :span="12"><el-form-item label="结束时间"><el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item></el-col></el-row>
      </el-form>
      <template #footer><el-button @click="vis = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi } from '@/api'

const loading = ref(false); const saving = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref('')
const form = reactive({ name: '', productId: '', flashPrice: 0, limitPerUser: 1, startTime: '', endTime: '' })

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try { const { data } = await marketingApi.listFlashSales({ page: page.value, pageSize: 20 }); list.value = data.flashSales || data.data || []; total.value = data.total || 0 } catch { list.value = [] } finally { loading.value = false }
}
function openCreate() { editingId.value = ''; Object.assign(form, { name: '', productId: '', flashPrice: 0, limitPerUser: 1, startTime: '', endTime: '' }); vis.value = true }
function openEdit(row: any) { editingId.value = row.id; Object.assign(form, { name: row.name, productId: row.items?.[0]?.productId || '', flashPrice: Number(row.items?.[0]?.flashPrice) || 0, limitPerUser: row.limitPerUser || 1, startTime: row.startTime || '', endTime: row.endTime || '' }); vis.value = true }
async function save() {
  saving.value = true
  try {
    const payload = { ...form }
    if (editingId.value) { await marketingApi.updateFlashSale(editingId.value, payload); ElMessage.success('已更新') }
    else { await marketingApi.createFlashSale(payload); ElMessage.success('已创建') }
    vis.value = false; fetchList()
  } catch { ElMessage.error('保存失败') } finally { saving.value = false }
}
async function startActivity(row: any) { await marketingApi.startFlashSale(row.id); ElMessage.success('已开始'); fetchList() }
async function endActivity(row: any) { await marketingApi.endFlashSale(row.id); ElMessage.success('已结束'); fetchList() }
async function del(id: string) { try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await marketingApi.deleteFlashSale(id); ElMessage.success('已删除'); fetchList() } catch {} }
</script>

<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
