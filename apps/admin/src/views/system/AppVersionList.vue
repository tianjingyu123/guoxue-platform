<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const vis = ref(false)
const editingId = ref('')
const platformFilter = ref('')

const form = reactive({
  platform: 'android',
  version: '',
  buildNumber: '',
  changelog: '',
  forceUpdate: false,
  downloadUrl: '',
})

const BASE = '/system/version'

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  try {
    const params: any = {}
    if (platformFilter.value) params.platform = platformFilter.value
    const { data } = await api.get(BASE, { params })
    list.value = data ?? []
  } catch { list.value = [] } finally { loading.value = false }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { platform: 'android', version: '', buildNumber: '', changelog: '', forceUpdate: false, downloadUrl: '' })
  vis.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  form.platform = row.platform
  form.version = row.version
  form.buildNumber = row.buildNumber ?? ''
  form.changelog = row.changelog ?? ''
  form.forceUpdate = row.forceUpdate ?? false
  form.downloadUrl = row.downloadUrl ?? ''
  vis.value = true
}

async function save() {
  if (!form.version) { ElMessage.warning('请输入版本号'); return }
  saving.value = true
  try {
    if (editingId.value) {
      await api.put(`${BASE}/${editingId.value}`, form)
    } else {
      await api.post(BASE, form)
    }
    ElMessage.success('已保存')
    vis.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}

async function del(id: string, version: string) {
  try {
    await ElMessageBox.confirm(`确定删除版本 ${version}？`, '提示', { type: 'warning' })
    await api.delete(`${BASE}/${id}`)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>APP版本管理</h3>
      <div style="display:flex;gap:8px">
        <el-select
          v-model="platformFilter"
          placeholder="平台"
          clearable
          style="width:120px"
          @change="fetchList"
        >
          <el-option
            label="Android"
            value="android"
          />
          <el-option
            label="iOS"
            value="ios"
          />
        </el-select>
        <el-button
          type="primary"
          @click="openCreate"
        >
          发布新版本
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
      empty-text=" "
    >
      <template #empty>
        <el-empty description="暂无版本记录" />
      </template>
      <el-table-column
        prop="platform"
        label="平台"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.platform === 'ios' ? 'success' : ''"
            size="small"
          >
            {{ row.platform === 'ios' ? 'iOS' : 'Android' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="version"
        label="版本号"
        width="120"
      />
      <el-table-column
        prop="buildNumber"
        label="构建号"
        width="100"
      />
      <el-table-column
        prop="changelog"
        label="更新日志"
        min-width="250"
        show-overflow-tooltip
      />
      <el-table-column
        label="强制更新"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.forceUpdate ? 'danger' : 'info'"
            size="small"
          >
            {{ row.forceUpdate ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="发布时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.publishedAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="160"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click="del(row.id, row.version)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑版本' : '发布新版本'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form label-width="90px">
        <el-form-item label="平台">
          <el-select
            v-model="form.platform"
            class="w-full"
            :disabled="!!editingId"
          >
            <el-option
              label="Android"
              value="android"
            />
            <el-option
              label="iOS"
              value="ios"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="版本号">
          <el-input
            v-model="form.version"
            placeholder="1.0.0"
          />
        </el-form-item>
        <el-form-item label="构建号">
          <el-input
            v-model="form.buildNumber"
            placeholder="100"
          />
        </el-form-item>
        <el-form-item label="更新日志">
          <el-input
            v-model="form.changelog"
            type="textarea"
            :rows="4"
            placeholder="本次更新内容..."
          />
        </el-form-item>
        <el-form-item label="下载地址">
          <el-input
            v-model="form.downloadUrl"
            placeholder="https://..."
          />
        </el-form-item>
        <el-form-item label="强制更新">
          <el-switch v-model="form.forceUpdate" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vis = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; }
.w-full { width: 100%; }
</style>
