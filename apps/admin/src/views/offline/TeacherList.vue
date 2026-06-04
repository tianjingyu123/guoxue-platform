<template>
  <div class="page">
    <div class="toolbar">
      <h3>教师管理</h3><el-button
        type="primary"
        @click="openCreate"
      >
        新增教师
      </el-button>
    </div>

    <el-form
      :inline="true"
      :model="filter"
      style="margin-bottom:12px"
    >
      <el-form-item label="所属驿站">
        <el-input
          v-model="filter.stationId"
          placeholder="输入驿站ID"
          clearable
          @change="fetchList"
        />
      </el-form-item>
    </el-form>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="name"
        label="姓名"
        width="100"
      />
      <el-table-column
        prop="stationId"
        label="所属驿站"
        width="200"
      />
      <el-table-column
        label="专长"
        min-width="200"
      >
        <template #default="{ row }">
          {{ (row.specialties || []).join('、') || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ACTIVE' ? 'success' : 'info'"
            size="small"
          >
            {{ row.status === 'ACTIVE' ? '在职' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="280"
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
            @click="openSchedule(row)"
          >
            排期
          </el-button>
          <el-button
            size="small"
            @click="openAvailability(row)"
          >
            设时段
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
      v-if="total > 20"
      style="margin-top:16px;display:flex;justify-content:flex-end"
    >
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <!-- 创建/编辑弹窗 -->
    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑教师' : '新增教师'"
      width="500px"
    >
      <el-form
        :model="form"
        label-width="90px"
      >
        <el-form-item
          label="姓名"
          required
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item
          label="所属驿站ID"
          required
        >
          <el-input v-model="form.stationId" />
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="form.avatar" />
        </el-form-item>
        <el-form-item label="专长标签">
          <el-input
            v-model="form.specialtiesStr"
            placeholder="多个用逗号分隔"
          />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.bio"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item
          v-if="editingId"
          label="状态"
        >
          <el-select v-model="form.status">
            <el-option
              label="在职"
              value="ACTIVE"
            /><el-option
              label="停用"
              value="INACTIVE"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 排期查看弹窗 -->
    <el-dialog
      v-model="scheduleVis"
      title="讲师排期"
      width="500px"
    >
      <el-form-item label="月份">
        <el-input
          v-model="scheduleMonth"
          placeholder="2026-05"
        />
      </el-form-item>
      <el-button
        type="primary"
        @click="fetchSchedule"
      >
        查询
      </el-button>
      <el-table
        v-if="schedule.length"
        :data="schedule"
        stripe
        style="margin-top:12px"
        max-height="300"
      >
        <el-table-column
          prop="date"
          label="日期"
          width="120"
        />
        <el-table-column label="时段">
          <template #default="{ row }">
            {{ (row.slots || []).join(', ') }}
          </template>
        </el-table-column>
      </el-table>
      <div
        v-if="conflictMsg"
        style="margin-top:8px;color:#f56c6c"
      >
        {{ conflictMsg }}
      </div>
    </el-dialog>

    <!-- 可预约时段弹窗 -->
    <el-dialog
      v-model="availabilityVis"
      title="设置可预约时段"
      width="500px"
    >
      <el-input
        v-model="availSlotsStr"
        type="textarea"
        :rows="6"
        placeholder="每行一个ISO时间，如&#10;2026-06-01T09:00:00Z&#10;2026-06-01T10:00:00Z"
      />
      <template #footer>
        <el-button @click="availabilityVis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="settingAvail"
          @click="setAvailability"
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

const loading = ref(false); const saving = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref('')
const filter = reactive({ stationId: '' })
const form = reactive({ name: '', stationId: '', avatar: '', specialtiesStr: '', bio: '', status: 'ACTIVE' })

const scheduleVis = ref(false); const schedule = ref<any[]>([]); const scheduleMonth = ref(''); const conflictMsg = ref(''); const scheduleTeacherId = ref('')
const availabilityVis = ref(false); const availSlotsStr = ref(''); const settingAvail = ref(false); const availTeacherId = ref('')

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try { const { data } = await api.get('/offline/admin/teachers', { params: { page: page.value, pageSize: 20, stationId: filter.stationId || undefined } }); list.value = data.items || data.data || []; total.value = data.total || 0 } catch { list.value = [] } finally { loading.value = false }
}

function openCreate() { editingId.value = ''; Object.assign(form, { name: '', stationId: '', avatar: '', specialtiesStr: '', bio: '', status: 'ACTIVE' }); vis.value = true }
function openEdit(row: any) { editingId.value = row.id; Object.assign(form, { name: row.name, stationId: row.stationId, avatar: row.avatar || '', specialtiesStr: (row.specialties || []).join(','), bio: row.bio || '', status: row.status || 'ACTIVE' }); vis.value = true }

async function save() {
  saving.value = true
  try {
    const payload: any = { name: form.name, stationId: form.stationId, avatar: form.avatar || undefined, specialties: form.specialtiesStr ? form.specialtiesStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [], bio: form.bio || undefined }
    if (editingId.value) {
      if (form.status) payload.status = form.status
      await api.put(`/offline/admin/teachers/${editingId.value}`, payload)
    } else {
      await api.post('/offline/admin/teachers', payload)
    }
    ElMessage.success('已保存'); vis.value = false; fetchList()
  } catch { } finally { saving.value = false }
}

async function del(id: string) { try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await api.delete(`/offline/admin/teachers/${id}`); ElMessage.success('已删除'); fetchList() } catch {} }

function openSchedule(row: any) {
  scheduleTeacherId.value = row.id; scheduleMonth.value = new Date().toISOString().slice(0, 7); schedule.value = []; conflictMsg.value = ''
  scheduleVis.value = true
}
async function fetchSchedule() {
  try { const { data } = await api.get(`/offline/admin/teachers/${scheduleTeacherId.value}/schedule`, { params: { month: scheduleMonth.value } }); schedule.value = data.schedule || data.data || [] } catch { schedule.value = [] }
  try { const { data } = await api.get('/offline/admin/schedule/conflicts', { params: { teacherId: scheduleTeacherId.value, date: scheduleMonth.value + '-01' } }); conflictMsg.value = data.conflicts?.length ? `${data.conflicts.length} 个冲突` : '' } catch { conflictMsg.value = '' }
}

function openAvailability(row: any) { availTeacherId.value = row.id; availSlotsStr.value = ''; availabilityVis.value = true }
async function setAvailability() {
  settingAvail.value = true
  try {
    const slots = availSlotsStr.value.split('\n').map((s: string) => s.trim()).filter(Boolean)
    await api.post(`/offline/admin/teachers/${availTeacherId.value}/availability`, { slots })
    ElMessage.success('时段已设置'); availabilityVis.value = false
  } catch { } finally { settingAvail.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
