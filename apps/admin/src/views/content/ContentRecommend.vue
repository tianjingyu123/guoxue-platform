<template>
  <div class="recommend-page">
    <div class="toolbar">
      <h3>推荐管理</h3>
      <el-button
        type="primary"
        @click="openCreate"
      >
        添加推荐位
      </el-button>
    </div>

    <el-alert
      v-if="error"
      type="error"
      title="推荐位加载失败"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        type="primary"
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
        <el-empty description="暂无推荐位" />
      </template>
      <el-table-column
        label="封面"
        width="70"
      >
        <template #default="{ row }">
          <img
            v-if="row.cover || row.image"
            :src="row.cover || row.image"
            class="thumb"
          >
          <span
            v-else
            class="no-img"
          >无</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="标题"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="类型"
        width="90"
      >
        <template #default="{ row }">
          {{ typeLabel(row.targetType || row.type) }}
        </template>
      </el-table-column>
      <el-table-column
        label="位置"
        width="100"
      >
        <template #default="{ row }">
          {{ positionLabel(row.position) }}
        </template>
      </el-table-column>
      <el-table-column
        label="权重"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.weight > 50 ? 'danger' : row.weight > 20 ? 'warning' : ''"
            size="small"
          >
            {{ row.weight }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ACTIVE' ? 'success' : 'info'"
            size="small"
          >
            {{ row.status === 'ACTIVE' ? '生效中' : '已停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="有效期"
        width="170"
      >
        <template #default="{ row }">
          <span v-if="row.startTime">{{ formatDate(row.startTime) }} ~ {{ formatDate(row.endTime) }}</span>
          <span v-else>长期</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="160"
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
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑推荐位' : '添加推荐位'"
      width="550px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item
          label="内容类型"
          required
        >
          <el-select
            v-model="form.targetType"
            style="width:100%"
          >
            <el-option
              label="文章"
              value="ARTICLE"
            />
            <el-option
              label="课程"
              value="COURSE"
            />
            <el-option
              label="古籍"
              value="CLASSIC"
            />
            <el-option
              label="视频"
              value="VIDEO"
            />
            <el-option
              label="圈子"
              value="CIRCLE"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="内容ID"
          required
        >
          <el-input
            v-model="form.targetId"
            placeholder="输入内容ID"
          />
        </el-form-item>
        <el-form-item
          label="推荐位置"
          required
        >
          <el-select
            v-model="form.position"
            style="width:100%"
          >
            <el-option
              label="首页顶部"
              value="HOME_TOP"
            />
            <el-option
              label="首页中部"
              value="HOME_MID"
            />
            <el-option
              label="发现页"
              value="DISCOVER"
            />
            <el-option
              label="侧边栏"
              value="SIDEBAR"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="权重">
          <el-input-number
            v-model="form.weight"
            :min="0"
            :max="100"
            style="width:100%"
          />
          <span style="color:var(--color-text-secondary);font-size:12px;">数值越大越靠前</span>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
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

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

// 推荐位行（字段宽松 optional）
interface RecRow {
  id: string
  title?: string
  cover?: string
  image?: string
  targetType?: string
  type?: string
  targetId?: string
  position?: string
  weight: number
  status?: string
  startTime?: string
  endTime?: string
}

const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const list = ref<RecRow[]>([])
const total = ref(0)
const page = ref(1)

const dialogVisible = ref(false)
const editingId = ref('')
const form = reactive({
  targetType: 'ARTICLE', targetId: '', position: 'HOME_TOP',
  weight: 10, startTime: '', endTime: '',
})

onMounted(() => fetchList())

function typeLabel(t: string) {
  const m: Record<string, string> = { ARTICLE: '文章', COURSE: '课程', CLASSIC: '古籍', VIDEO: '视频', CIRCLE: '圈子' }
  return m[t] || t
}
function positionLabel(p: string) {
  const m: Record<string, string> = { HOME_TOP: '首页顶部', HOME_MID: '首页中部', DISCOVER: '发现页', SIDEBAR: '侧边栏' }
  return m[p] || p
}
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const { data } = await api.get('/admin/recommend/rules', { params: { page: page.value, pageSize: 20 } })
    list.value = data.items || data.rules || data.data || []
    total.value = data.total || 0
  } catch {
    error.value = true
    list.value = []
    total.value = 0
  } finally { loading.value = false }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { targetType: 'ARTICLE', targetId: '', position: 'HOME_TOP', weight: 10, startTime: '', endTime: '' })
  dialogVisible.value = true
}
function openEdit(row: RecRow) {
  editingId.value = row.id
  Object.assign(form, {
    targetType: row.targetType, targetId: row.targetId, position: row.position,
    weight: row.weight || 10, startTime: row.startTime || '', endTime: row.endTime || '',
  })
  dialogVisible.value = true
}
async function save() {
  saving.value = true
  try {
    const payload = { ...form }
    if (editingId.value) {
      await api.put(`/admin/recommend/rules/${editingId.value}`, payload)
    } else {
      await api.post('/admin/recommend/rules', payload)
    }
    ElMessage.success(editingId.value ? '已更新' : '已创建')
    dialogVisible.value = false
    fetchList()
  } catch { } finally { saving.value = false }
}
async function handleDelete(row: RecRow) {
  try {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
    await api.delete(`/admin/recommend/rules/${row.id}`)
    ElMessage.success('已删除')
    fetchList()
  } catch {}
}
</script>

<style scoped>
.recommend-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; }
.no-img { color: var(--color-text-placeholder); font-size: 11px; }
</style>
