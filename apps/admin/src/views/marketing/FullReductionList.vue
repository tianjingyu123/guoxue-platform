<template>
  <div class="page">
    <div class="toolbar"><h3>满减送活动</h3><el-button type="primary" @click="openCreate">创建活动</el-button></div>
    <el-alert type="info" :closable="false" show-icon style="margin-bottom:12px">
      <template #title>
        <span style="font-size:13px">展示位置：<b>购物车页</b>自动匹配最优满减、<b>结算页</b>显示减免金额。创建后即生效。</span>
      </template>
    </el-alert>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="name" label="活动名称" min-width="150" />
      <el-table-column label="满减规则" min-width="200">
        <template #default="{ row }">满¥{{ row.threshold }}减¥{{ row.reduction }}<template v-if="row.giftProductId"> + 赠品</template></template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : row.status === 'ENDED' ? 'danger' : 'info'" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="有效期" width="280">
        <template #default="{ row }">{{ formatDate(row.startTime) }} ~ {{ formatDate(row.endTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 20" style="margin-top:16px;display:flex;justify-content:flex-end">
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" @current-change="fetchList" />
    </div>

    <el-dialog v-model="vis" :title="editingId ? '编辑满减送' : '创建满减送'" width="550px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="满金额(¥)"><el-input-number v-model="form.threshold" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="减金额(¥)"><el-input-number v-model="form.reduction" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="赠品商品ID"><el-input v-model="form.giftProductId" placeholder="可选" /></el-form-item>
        <el-form-item label="适用商品"><ProductPicker v-model="form.productIds" multiple placeholder="留空则全场商品参与" /></el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="开始时间"><el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="结束时间"><el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="展示范围"><el-radio-group v-model="form.scope"><el-radio value="GLOBAL">全平台</el-radio><el-radio value="PAGE_ONLY">仅指定微页面</el-radio></el-radio-group></el-form-item>
        <el-form-item v-if="form.scope === 'PAGE_ONLY'" label="关联微页面"><el-select v-model="form.scopePageId" placeholder="选择微页面" clearable style="width:100%"><el-option v-for="p in pages" :key="p.id" :label="p.name" :value="p.id" /></el-select></el-form-item>
      </el-form>
      <template #footer><el-button @click="vis = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi } from '@/api'
import ProductPicker from '@/components/ProductPicker.vue'

const loading = ref(false); const saving = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1); const pages = ref<any[]>([])
const vis = ref(false); const editingId = ref('')
const form = reactive<{ name: string; threshold: number; reduction: number; giftProductId: string; productIds: string[]; startTime: string; endTime: string; scope: string; scopePageId: string }>({ name: '', threshold: 100, reduction: 10, giftProductId: '', productIds: [], startTime: '', endTime: '', scope: 'GLOBAL', scopePageId: '' })

function statusLabel(s: string) {
  const m: Record<string, string> = { ACTIVE: '进行中', ENDED: '已结束', DRAFT: '草稿' }
  return m[s] || s || '草稿'
}

onMounted(() => { fetchList(); loadPages() })
async function loadPages() { try { const { data } = await marketingApi.listPages(); pages.value = data.pages || data.items || data.data || [] } catch { /* 忽略 */ } }
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try {
    const { data } = await marketingApi.listFullReductions({ page: page.value, pageSize: 20 })
    list.value = data.items || data.fullReductions || data.list || data.data || []; total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { name: '', threshold: 100, reduction: 10, giftProductId: '', productIds: [], startTime: '', endTime: '', scope: 'GLOBAL', scopePageId: '' })
  vis.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name, threshold: Number(row.threshold), reduction: Number(row.reduction),
    giftProductId: row.giftProductId || '',
    productIds: [...(row.productIds || [])],
    startTime: row.startTime || '', endTime: row.endTime || '',
    scope: row.scope || 'GLOBAL', scopePageId: row.scopePageId || '',
  })
  vis.value = true
}

async function save() {
  saving.value = true
  try {
    const payload: any = {
      name: form.name, threshold: form.threshold, reduction: form.reduction,
      giftProductId: form.giftProductId || undefined,
      productIds: form.productIds.length ? form.productIds : undefined,
      scope: form.scope, scopePageId: form.scope === 'PAGE_ONLY' ? form.scopePageId : undefined,
    }
    if (form.startTime) payload.startTime = new Date(form.startTime).toISOString()
    if (form.endTime) payload.endTime = new Date(form.endTime).toISOString()
    if (editingId.value) { await marketingApi.updateFullReduction(editingId.value, payload) }
    else { await marketingApi.createFullReduction(payload) }
    ElMessage.success(editingId.value ? '已更新' : '满减活动创建成功'); vis.value = false; fetchList()
  } catch (e: any) { ElMessage.error(e?.response?.data?.message || '操作失败') } finally { saving.value = false }
}

async function del(id: string) {
  try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await marketingApi.deleteFullReduction(id); ElMessage.success('已删除'); fetchList() } catch { /* 用户取消 */ }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
