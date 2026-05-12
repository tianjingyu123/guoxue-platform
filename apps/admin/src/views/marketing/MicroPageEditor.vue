<template>
  <div class="page">
    <div class="toolbar"><h3>微页面管理</h3><el-button type="primary" @click="openCreate">创建微页面</el-button></div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="title" label="页面标题" min-width="150" />
      <el-table-column label="组件数" width="80"><template #default="{ row }">{{ row.components?.length || 0 }}</template></el-table-column>
      <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'info'" size="small">{{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}</el-tag></template></el-table-column>
      <el-table-column label="创建时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" @click="openComponents(row)">组件</el-button>
          <el-button v-if="row.status !== 'PUBLISHED'" size="small" type="success" @click="doPublish(row)">发布</el-button>
          <el-button size="small" type="danger" @click="del(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 20" style="margin-top:16px;display:flex;justify-content:flex-end">
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" @current-change="fetchList" />
    </div>

    <!-- 页面编辑弹窗 -->
    <el-dialog v-model="vis" :title="editingId ? '编辑微页面' : '创建微页面'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题" required><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="路径"><el-input v-model="form.path" placeholder="如 /promo/spring" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="vis = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>

    <!-- 组件管理弹窗 -->
    <el-dialog v-model="compVis" title="页面组件" width="650px">
      <div style="margin-bottom:12px"><el-button size="small" type="primary" @click="openCompCreate">添加组件</el-button></div>
      <el-table :data="components" stripe max-height="400">
        <el-table-column label="排序" width="60"><template #default="{ $index }">{{ $index + 1 }}</template></el-table-column>
        <el-table-column prop="type" label="组件类型" width="110">
          <template #default="{ row }">{{ (compTypeMap as Record<string,string>)[row.type] || row.type }}</template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="120" />
        <el-table-column label="配置" min-width="140"><template #default="{ row }">{{ JSON.stringify(row.config).substring(0, 50) }}</template></el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row, $index }">
            <el-button size="small" @click="openCompEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="delComp(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="components.length === 0" style="text-align:center;padding:40px;color:#ccc">暂无组件，点击"添加组件"开始</div>
    </el-dialog>

    <!-- 组件编辑弹窗 -->
    <el-dialog v-model="compFormVis" :title="compEditingId ? '编辑组件' : '添加组件'" width="500px">
      <el-form :model="compForm" label-width="80px">
        <el-form-item label="类型" required><el-select v-model="compForm.type" style="width:100%"><el-option label="轮播图" value="CAROUSEL" /><el-option label="商品列表" value="PRODUCT_LIST" /><el-option label="图片" value="IMAGE" /><el-option label="文本" value="TEXT" /><el-option label="优惠券" value="COUPON" /></el-select></el-form-item>
        <el-form-item label="标题"><el-input v-model="compForm.title" /></el-form-item>
        <el-form-item label="配置JSON"><el-input v-model="compForm.configStr" type="textarea" :rows="4" placeholder='如 {"productIds":["id1"],"showPrice":true}' /></el-form-item>
      </el-form>
      <template #footer><el-button @click="compFormVis = false">取消</el-button><el-button type="primary" :loading="compSaving" @click="saveComp">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi } from '@/api'

const loading = ref(false); const saving = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref('')
const form = reactive({ title: '', path: '', description: '' })

const compVis = ref(false); const compFormVis = ref(false); const compEditingId = ref(''); const compSaving = ref(false)
const components = ref<any[]>([]); const currentPageId = ref('')
const compForm = reactive({ type: 'CAROUSEL', title: '', configStr: '{}' })

const compTypeMap = { CAROUSEL: '轮播图', PRODUCT_LIST: '商品列表', IMAGE: '图片', TEXT: '文本', COUPON: '优惠券' }

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try { const { data } = await marketingApi.listPages(); list.value = data.pages || data.data || []; total.value = data.total || 0 } catch { list.value = [] } finally { loading.value = false }
}

function openCreate() { editingId.value = ''; Object.assign(form, { title: '', path: '', description: '' }); vis.value = true }
function openEdit(row: any) { editingId.value = row.id; Object.assign(form, { title: row.title, path: row.path || '', description: row.description || '' }); vis.value = true }

async function save() {
  saving.value = true
  try { if (editingId.value) { await marketingApi.updatePage(editingId.value, form) } else { await marketingApi.createPage(form) }; ElMessage.success('已保存'); vis.value = false; fetchList() } catch { ElMessage.error('保存失败') } finally { saving.value = false }
}

async function doPublish(row: any) {
  try { await marketingApi.publishPage(row.id); ElMessage.success('已发布'); fetchList() } catch { ElMessage.error('发布失败') }
}

async function del(id: string) {
  try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await marketingApi.deletePage(id); ElMessage.success('已删除'); fetchList() } catch {}
}

// 组件管理
async function openComponents(row: any) {
  currentPageId.value = row.id
  try { const { data } = await marketingApi.getPage(row.id); components.value = data.components || [] } catch { components.value = [] }
  compVis.value = true
}

function openCompCreate() { compEditingId.value = ''; Object.assign(compForm, { type: 'CAROUSEL', title: '', configStr: '{}' }); compFormVis.value = true }
function openCompEdit(row: any) { compEditingId.value = row.id; Object.assign(compForm, { type: row.type, title: row.title || '', configStr: JSON.stringify(row.config || {}, null, 2) }); compFormVis.value = true }

async function saveComp() {
  let config: any = {}
  try { config = JSON.parse(compForm.configStr) } catch { ElMessage.error('配置JSON格式错误'); return }
  compSaving.value = true
  const payload = { type: compForm.type, title: compForm.title, config }
  try {
    if (compEditingId.value) {
      await marketingApi.updatePage(currentPageId.value, { ...form, components: components.value.map(c => c.id === compEditingId.value ? { ...c, ...payload } : c) })
    } else {
      const existing = [...components.value, payload]
      await marketingApi.updatePage(currentPageId.value, { components: existing })
    }
    ElMessage.success('已保存'); compFormVis.value = false
    const { data } = await marketingApi.getPage(currentPageId.value)
    components.value = data.components || []
  } catch { ElMessage.error('保存失败') } finally { compSaving.value = false }
}

async function delComp(compId: string) {
  try { await ElMessageBox.confirm('删除该组件？', '提示', { type: 'warning' }); const remaining = components.value.filter(c => c.id !== compId); await marketingApi.updatePage(currentPageId.value, { components: remaining }); ElMessage.success('已删除'); components.value = remaining } catch {}
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
