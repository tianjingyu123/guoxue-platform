<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { systemApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const vis = ref(false)
const editingId = ref('')

const form = reactive({
  name: '',
  commissionRate: 0,
  minSales: 0,
  benefits: '',
  enabled: true,
  sortOrder: 0,
})

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

const sortedList = computed(() => {
  return [...list.value].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
})

async function fetchList() {
  loading.value = true
  try {
    const { data } = await systemApi.listConfigs()
    const items: any[] = []
    const raw = data?.data || data || []
    ;(Array.isArray(raw) ? raw : []).forEach((item: any) => {
      if (item.key?.startsWith('operator.level.')) {
        const val = typeof item.value === 'string' ? JSON.parse(item.value) : item.value
        items.push({ ...val, _key: item.key, _id: item.id, createdAt: item.createdAt || val.createdAt })
      }
    })
    list.value = items
  } catch { list.value = [] } finally { loading.value = false }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { name: '', commissionRate: 0, minSales: 0, benefits: '', enabled: true, sortOrder: 0 })
  vis.value = true
}

function openEdit(row: any) {
  editingId.value = row._key
  Object.assign(form, {
    name: row.name || '',
    commissionRate: row.commissionRate ?? 0,
    minSales: row.minSales ?? 0,
    benefits: row.benefits || '',
    enabled: row.enabled !== false,
    sortOrder: row.sortOrder ?? 0,
  })
  vis.value = true
}

async function save() {
  if (!form.name) {
    ElMessage.warning('请输入等级名称')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.name,
      commissionRate: form.commissionRate,
      minSales: form.minSales,
      benefits: form.benefits,
      enabled: form.enabled,
      sortOrder: form.sortOrder,
    }
    const key = editingId.value || `operator.level.${form.name}`
    await systemApi.setConfig(key, { value: JSON.stringify(payload) })
    ElMessage.success('已保存')
    vis.value = false
    fetchList()
  } catch { ElMessage.error('保存失败') } finally { saving.value = false }
}

async function toggleStatus(row: any) {
  row.enabled = !row.enabled
  try {
    const payload = {
      name: row.name,
      commissionRate: row.commissionRate,
      minSales: row.minSales,
      benefits: row.benefits,
      enabled: row.enabled,
      sortOrder: row.sortOrder,
    }
    await systemApi.setConfig(row._key, { value: JSON.stringify(payload) })
    ElMessage.success(row.enabled ? '已启用' : '已禁用')
  } catch {
    row.enabled = !row.enabled
    ElMessage.error('操作失败')
  }
}

async function del(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除等级「${row.name}」？`, '提示', { type: 'warning' })
    await systemApi.deleteConfig(row._key)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}
</script>

<template>
  <div class="page">
    <div class="toolbar"><h3>运营商等级配置</h3><el-button type="primary" @click="openCreate">添加等级</el-button></div>

    <el-table v-loading="loading" :data="sortedList" stripe empty-text=" ">
      <template #empty><el-empty description="暂无运营商等级配置" /></template>
      <el-table-column prop="name" label="等级名称" min-width="120" />
      <el-table-column label="分成比例" width="120">
        <template #default="{ row }">{{ row.commissionRate != null ? row.commissionRate + '%' : '-' }}</template>
      </el-table-column>
      <el-table-column label="升级条件（最低销售额）" width="180">
        <template #default="{ row }">{{ row.minSales != null ? '¥' + Number(row.minSales).toLocaleString() : '-' }}</template>
      </el-table-column>
      <el-table-column prop="benefits" label="权益描述" min-width="220" show-overflow-tooltip />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-switch :model-value="row.enabled" :active-value="true" :inactive-value="false" @click.stop :loading="loading" @change="toggleStatus(row)" />
          <span :style="{ color: row.enabled ? '#67c23a' : '#f56c6c', marginLeft: '6px', fontSize: '12px' }">{{ row.enabled ? '启用' : '禁用' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt || row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="vis" :title="editingId ? '编辑等级' : '添加等级'" width="520px">
      <el-form :model="form" label-width="120px">
        <el-form-item label="等级名称" required>
          <el-input v-model="form.name" placeholder="如：黄金运营商" />
        </el-form-item>
        <el-form-item label="分成比例">
          <el-input-number v-model="form.commissionRate" :min="0" :max="100" :step="1" style="width:100%">
            <template #suffix>%</template>
          </el-input-number>
          <div style="color:#999;font-size:12px;margin-top:4px">设置运营商的分成百分比</div>
        </el-form-item>
        <el-form-item label="最低销售额">
          <el-input-number v-model="form.minSales" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="权益描述">
          <el-input v-model="form.benefits" type="textarea" :rows="3" placeholder="描述该等级享有的权益" />
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="form.sortOrder" :min="0" style="width:100%" />
          <div style="color:#999;font-size:12px;margin-top:4px">数值越小越靠前</div>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.enabled" :active-value="true" :inactive-value="false" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vis = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
</style>
