<template>
  <div class="page">
    <div class="toolbar"><h3>拼团活动</h3><el-button type="primary" @click="openCreate">创建拼团</el-button></div>
    <el-alert type="info" :closable="false" show-icon style="margin-bottom:12px">
      <template #title>
        <span style="font-size:13px">展示位置：<b>商城拼团专区</b>、<b>微页面拼团组件</b>。创建后即生效，用户可发起或参与拼团。</span>
      </template>
    </el-alert>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="name" label="活动名称" min-width="150" />
      <el-table-column prop="productTitle" label="商品" min-width="120" />
      <el-table-column label="成团人数" width="80"><template #default="{ row }">{{ row.groupSize }}人</template></el-table-column>
      <el-table-column label="拼团价" width="100"><template #default="{ row }">¥{{ Number(row.groupPrice).toFixed(2) }}</template></el-table-column>
      <el-table-column label="有效期" width="100"><template #default="{ row }">{{ row.durationHours }}小时</template></el-table-column>
      <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">{{ row.status === 'ACTIVE' ? '进行中' : '已结束' }}</el-tag></template></el-table-column>
      <el-table-column label="创建时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" @click="openParticipants(row)">参团</el-button>
          <el-button size="small" type="danger" @click="del(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 20" style="margin-top:16px;display:flex;justify-content:flex-end">
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" @current-change="fetchList" />
    </div>

    <el-dialog v-model="vis" :title="editingId ? '编辑拼团' : '创建拼团'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="活动名称"><el-input v-model="form.name" placeholder="如：新春拼团" /></el-form-item>
        <el-form-item label="选择商品"><ProductPicker v-model="form.productId" /></el-form-item>
        <el-form-item label="成团人数"><el-input-number v-model="form.minMembers" :min="2" :max="100" style="width:100%" /></el-form-item>
        <el-form-item label="拼团价"><el-input-number v-model="form.groupPrice" :min="0.01" :precision="2" style="width:100%" /></el-form-item>
        <el-form-item label="有效时长(分)"><el-input-number v-model="form.expireMinutes" :min="10" :max="43200" style="width:100%" /></el-form-item>
        <el-form-item label="展示范围"><el-radio-group v-model="form.scope"><el-radio value="GLOBAL">全平台</el-radio><el-radio value="PAGE_ONLY">仅指定微页面</el-radio></el-radio-group></el-form-item>
        <el-form-item v-if="form.scope === 'PAGE_ONLY'" label="关联微页面"><el-select v-model="form.scopePageId" placeholder="选择微页面" clearable style="width:100%"><el-option v-for="p in pages" :key="p.id" :label="p.name" :value="p.id" /></el-select></el-form-item>
      </el-form>
      <template #footer><el-button @click="vis = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>

    <!-- 参团记录弹窗 -->
    <el-dialog v-model="participantsVis" title="参团记录" width="600px">
      <el-table v-loading="participantsLoading" :data="participants" stripe max-height="400">
        <el-table-column prop="userId" label="用户ID" width="140" />
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column label="成团状态" width="100"><template #default="{ row }"><el-tag size="small" :type="row.groupStatus === 'COMPLETED' ? 'success' : 'warning'">{{ row.groupStatus === 'COMPLETED' ? '已成团' : '拼团中' }}</el-tag></template></el-table-column>
        <el-table-column label="加入时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
      </el-table>
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
const form = reactive({ name: '', productId: '', minMembers: 2, groupPrice: 0, expireMinutes: 1440, scope: 'GLOBAL', scopePageId: '' })

const participantsVis = ref(false); const participantsLoading = ref(false); const participants = ref<any[]>([])

onMounted(() => { fetchList(); loadPages() })
async function loadPages() { try { const { data } = await marketingApi.listPages(); pages.value = data.pages || data.items || data.data || [] } catch { /* 忽略 */ } }
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try { const { data } = await marketingApi.listGroupBuys({ page: page.value, pageSize: 20 }); list.value = data.items || data.groupBuys || data.data || []; total.value = data.total || 0 } catch { list.value = [] } finally { loading.value = false }
}
function openCreate() { editingId.value = ''; Object.assign(form, { name: '', productId: '', minMembers: 2, groupPrice: 0, expireMinutes: 1440, scope: 'GLOBAL', scopePageId: '' }); vis.value = true }
function openEdit(row: any) { editingId.value = row.id; Object.assign(form, { name: row.name || '', productId: row.productId, minMembers: row.minMembers || row.groupSize || 2, groupPrice: Number(row.groupPrice), expireMinutes: row.expireMinutes || row.durationHours || 1440, scope: row.scope || 'GLOBAL', scopePageId: row.scopePageId || '' }); vis.value = true }
async function save() {
  if (!form.name) { ElMessage.warning('请输入活动名称'); return }
  saving.value = true
  try {
    const payload: any = { ...form, scopePageId: form.scope === 'PAGE_ONLY' ? form.scopePageId : undefined }
    if (editingId.value) { await marketingApi.updateGroupBuy(editingId.value, payload); ElMessage.success('已更新') }
    else { await marketingApi.createGroupBuy(payload); ElMessage.success('拼团活动创建成功，用户即可参与拼团') }
    vis.value = false; fetchList()
  } catch (e: any) { ElMessage.error(e?.response?.data?.message || '操作失败') } finally { saving.value = false }
}
async function del(id: string) { try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await marketingApi.deleteGroupBuy(id); ElMessage.success('已删除'); fetchList() } catch { /* 用户取消 */ } }

async function openParticipants(row: any) {
  participantsVis.value = true; participantsLoading.value = true
  try { const { data } = await marketingApi.getGroupBuyParticipants(row.id); participants.value = data.participants || data.data || [] } catch { participants.value = [] } finally { participantsLoading.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
