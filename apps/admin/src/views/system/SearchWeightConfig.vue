<template>
  <div class="page">
    <div class="toolbar">
      <h3>搜索权重配置</h3>
      <div style="display:flex;gap:8px">
        <el-select
          v-model="filterType"
          placeholder="按类型筛选"
          clearable
          style="width:160px"
          @change="fetchList"
        >
          <el-option
            v-for="t in ENTITY_TYPES"
            :key="t.value"
            :label="t.label"
            :value="t.value"
          />
        </el-select>
        <el-button
          :loading="seeding"
          @click="seedDefaults"
        >
          初始化默认权重
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败"
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无搜索权重配置" />
      </template>
      <el-table-column
        label="实体类型"
        width="120"
      >
        <template #default="{ row }">
          {{ ENTITY_LABELS[row.entityType] || row.entityType }}
        </template>
      </el-table-column>
      <el-table-column
        label="字段"
        width="100"
      >
        <template #default="{ row }">
          {{ row.fieldName === 'all' ? '综合' : row.fieldName }}
        </template>
      </el-table-column>
      <el-table-column
        label="权重值"
        width="200"
      >
        <template #default="{ row }">
          <el-slider
            v-model="row.weight"
            :min="0.1"
            :max="5.0"
            :step="0.1"
            show-input
            :disabled="!row.enabled"
            style="width:160px"
          />
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-switch
            v-model="row.enabled"
            size="small"
            @change="toggleWeight(row)"
          />
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="170"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            :loading="!!row._saving"
            @click="saveWeight(row)"
          >
            保存
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="del(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="addVis"
      title="添加权重"
      width="400px"
    >
      <el-form
        :model="addForm"
        label-width="80px"
      >
        <el-form-item label="实体类型">
          <el-select
            v-model="addForm.entityType"
            style="width:100%"
          >
            <el-option
              v-for="t in ENTITY_TYPES"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="字段">
          <el-select
            v-model="addForm.fieldName"
            style="width:100%"
          >
            <el-option
              label="综合(all)"
              value="all"
            /><el-option
              label="标题(title)"
              value="title"
            /><el-option
              label="摘要(excerpt)"
              value="excerpt"
            /><el-option
              label="简介(intro)"
              value="intro"
            /><el-option
              label="名称(name)"
              value="name"
            /><el-option
              label="昵称(nickname)"
              value="nickname"
            /><el-option
              label="作者(author)"
              value="author"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="权重值">
          <el-input-number
            v-model="addForm.weight"
            :min="0.1"
            :max="5.0"
            :step="0.1"
            :precision="1"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="saving"
          @click="doAdd"
        >
          添加
        </el-button>
      </template>
    </el-dialog>

    <div style="margin-top:16px">
      <el-button @click="addVis = true">
        + 添加权重
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { searchApi } from '@/api'

const ENTITY_TYPES = [
  { value: 'article', label: '文章' }, { value: 'course', label: '课程' },
  { value: 'product', label: '商品' }, { value: 'circle', label: '圈子' },
  { value: 'video', label: '视频' }, { value: 'user', label: '用户' },
  { value: 'classic', label: '古籍' }, { value: 'content', label: '国学内容' },
]
const ENTITY_LABELS: Record<string, string> = {}
ENTITY_TYPES.forEach(t => { ENTITY_LABELS[t.value] = t.label })

const loading = ref(false); const loadError = ref(false); const list = ref<any[]>([]); const filterType = ref('')
const saving = ref(false); const seeding = ref(false)
const addVis = ref(false)
const addForm = reactive({ entityType: 'article', fieldName: 'all', weight: 1.0 })

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await searchApi.getWeights(filterType.value || undefined)
    list.value = (data || []).map((r: any) => ({ ...r, weight: Number(r.weight) }))
  } catch { loadError.value = true; list.value = []; ElMessage.error('加载失败，请重试') } finally { loading.value = false }
}

async function saveWeight(row: any) {
  if (row._saving) return
  row._saving = true
  try {
    await searchApi.upsertWeight({ entityType: row.entityType, fieldName: row.fieldName, weight: Number(row.weight), enabled: row.enabled })
    ElMessage.success('已保存')
  } catch { } finally { row._saving = false }
}

async function toggleWeight(row: any) {
  await saveWeight(row)
}

async function del(id: string) {
  try { await ElMessageBox.confirm('删除该权重配置？', '提示', { type: 'warning' }); await searchApi.deleteWeight(id); ElMessage.success('已删除'); fetchList() } catch {}
}

async function seedDefaults() {
  if (seeding.value) return
  seeding.value = true
  try { await searchApi.seedWeights(); ElMessage.success('已初始化默认权重'); fetchList() } catch { } finally { seeding.value = false }
}

async function doAdd() {
  if (saving.value) return
  saving.value = true
  try { await searchApi.upsertWeight({ entityType: addForm.entityType, fieldName: addForm.fieldName, weight: addForm.weight }); ElMessage.success('已添加'); addVis.value = false; fetchList() } catch { } finally { saving.value = false }
}
</script>

<style scoped>
.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
</style>
