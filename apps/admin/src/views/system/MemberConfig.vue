<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

const loading = ref(false)
const saving = ref(false)
const loadError = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const vis = ref(false)
const editingId = ref('')

const levelOptions = [
  { label: 'NONE（无等级）', value: 'NONE' },
  { label: 'SILVER（白银）', value: 'SILVER' },
  { label: 'GOLD（黄金）', value: 'GOLD' },
  { label: 'PLATINUM（铂金）', value: 'PLATINUM' },
  { label: 'DIAMOND（钻石）', value: 'DIAMOND' },
]

const form = reactive({
  name: 'NONE',
  price: 0,
  durationDays: 30,
  benefits: '',
  status: 'ACTIVE',
})

const BASE = '/system/member-configs'

onMounted(() => fetchList())

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

const sortedList = computed(() => {
  return [...list.value].sort((a, b) => (a.price ?? 999999) - (b.price ?? 999999))
})

async function fetchList() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await api.get(BASE, { params: { page: page.value, pageSize: 20 } })
    list.value = Array.isArray(data) ? data : (data?.data ?? data?.memberConfigs ?? [])
    total.value = data?.total || 0
  } catch { loadError.value = true; list.value = []; ElMessage.error('加载失败，请重试') } finally { loading.value = false }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { name: 'NONE', price: 0, durationDays: 30, benefits: '', status: 'ACTIVE' })
  vis.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name || 'NONE',
    price: row.price ?? 0,
    durationDays: row.durationDays ?? 30,
    benefits: row.benefits || '',
    status: row.status || 'ACTIVE',
  })
  vis.value = true
}

async function save() {
  if (!form.name) { ElMessage.warning('请选择等级名称'); return }
  if (form.price < 0) { ElMessage.warning('请输入有效的价格'); return }
  if (form.durationDays < 1) { ElMessage.warning('时长至少为1天'); return }
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

async function del(id: string) {
  try {
    await ElMessageBox.confirm('确定删除此会员等级？', '提示', { type: 'warning' })
    await api.delete(`${BASE}/${id}`)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>会员等级配置</h3><el-button
        type="primary"
        @click="openCreate"
      >
        添加等级
      </el-button>
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
      :data="sortedList"
      stripe
      empty-text=" "
    >
      <template #empty>
        <el-empty description="暂无会员等级配置" />
      </template>
      <el-table-column
        label="等级名称"
        min-width="160"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.name === 'DIAMOND' ? 'danger' : row.name === 'PLATINUM' ? 'warning' : row.name === 'GOLD' ? '' : row.name === 'SILVER' ? 'info' : 'info'"
            size="small"
          >
            {{ row.name }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="价格"
        width="120"
      >
        <template #default="{ row }">
          {{ row.price != null ? '¥' + Number(row.price).toFixed(2) : '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="时长（天）"
        width="100"
      >
        <template #default="{ row }">
          {{ row.durationDays ?? '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="benefits"
        label="权益描述"
        min-width="240"
        show-overflow-tooltip
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ACTIVE' ? 'success' : 'danger'"
            size="small"
          >
            {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.updatedAt || row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="140"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
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

    <div
      v-if="total > 0"
      style="display:flex;justify-content:flex-end;margin-top:16px"
    >
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑等级' : '添加等级'"
      width="520px"
    >
      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="等级名称"
          required
        >
          <el-select
            v-model="form.name"
            style="width:100%"
          >
            <el-option
              v-for="opt in levelOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number
            v-model="form.price"
            :min="0"
            :precision="2"
            :step="10"
            style="width:100%"
          >
            <template #prefix>
              ¥
            </template>
          </el-input-number>
        </el-form-item>
        <el-form-item label="时长（天）">
          <el-input-number
            v-model="form.durationDays"
            :min="1"
            :step="30"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="权益描述">
          <el-input
            v-model="form.benefits"
            type="textarea"
            :rows="3"
            placeholder="描述该等级会员享有的权益"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
            active-value="ACTIVE"
            inactive-value="INACTIVE"
            active-text="启用"
            inactive-text="停用"
          />
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
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
</style>
