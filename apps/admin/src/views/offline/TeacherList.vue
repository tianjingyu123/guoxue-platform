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
        <!-- 驿站下拉筛选（原为手输裸 UUID） -->
        <el-select
          v-model="filter.stationId"
          placeholder="全部驿站"
          clearable
          filterable
          style="width: 240px"
          :loading="stationsLoading"
          @change="fetchList"
        >
          <el-option
            v-for="s in stationOptions"
            :key="s.id"
            :label="s.name + (s.city ? '（' + s.city + '）' : '')"
            :value="s.id"
          />
        </el-select>
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
        label="所属驿站"
        width="160"
        show-overflow-tooltip
      >
        <!-- 后端 include station {id,name}，显示名称而非裸 UUID -->
        <template #default="{ row }">
          {{ row.station?.name || '—' }}
        </template>
      </el-table-column>
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
      <template #empty>
        <el-empty :description="loadError ? '加载失败' : '暂无教师数据'">
          <el-button
            v-if="loadError"
            type="primary"
            @click="fetchList"
          >
            重试
          </el-button>
        </el-empty>
      </template>
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
          label="所属驿站"
          required
        >
          <el-select
            v-model="form.stationId"
            placeholder="选择驿站"
            filterable
            style="width:100%"
            :loading="stationsLoading"
          >
            <el-option
              v-for="s in stationOptions"
              :key="s.id"
              :label="s.name + (s.city ? '（' + s.city + '）' : '')"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="头像">
          <CosImageUpload
            v-model="form.avatar"
            tip="点击上传头像"
          />
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

    <!-- 排期查看弹窗（后端返回 bookings 数组，非 date/slots 结构） -->
    <el-dialog
      v-model="scheduleVis"
      title="讲师排期"
      width="560px"
    >
      <div style="display:flex;gap:8px;align-items:center">
        <el-date-picker
          v-model="scheduleMonth"
          type="month"
          placeholder="选择月份"
          format="YYYY-MM"
          value-format="YYYY-MM"
          :clearable="false"
        />
        <el-button
          type="primary"
          :loading="scheduleLoading"
          @click="fetchSchedule"
        >
          查询
        </el-button>
      </div>
      <el-table
        v-if="schedule.length"
        :data="schedule"
        stripe
        style="margin-top:12px"
        max-height="300"
      >
        <el-table-column
          label="预约时间"
          width="160"
        >
          <template #default="{ row }">
            {{ formatDate(row.bookingDate) }}
          </template>
        </el-table-column>
        <el-table-column
          label="驿站"
          min-width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.station?.name || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag
              :type="BOOKING_STATUS[row.status]?.tag || 'info'"
              size="small"
            >
              {{ BOOKING_STATUS[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-else-if="scheduleQueried && !scheduleLoading"
        description="该月暂无预约排期"
        :image-size="60"
      />
      <div
        v-if="conflictMsg"
        style="margin-top:8px;color:var(--color-error)"
      >
        {{ conflictMsg }}
      </div>
    </el-dialog>

    <!-- 可预约时段弹窗（结构化点选，提交时拼 ISO，不再手写 ISO 串） -->
    <el-dialog
      v-model="availabilityVis"
      title="设置可预约时段"
      width="560px"
    >
      <div class="avail-picker">
        <el-date-picker
          v-model="availDate"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          :disabled-date="(d: Date) => d.getTime() < Date.now() - 86400000"
          style="width: 160px"
        />
        <el-select
          v-model="availTimes"
          multiple
          placeholder="选择时段（可多选）"
          style="flex: 1"
        >
          <el-option
            v-for="t in TIME_OPTIONS"
            :key="t"
            :label="t"
            :value="t"
          />
        </el-select>
        <el-button @click="addAvailSlots">
          添加
        </el-button>
      </div>
      <div
        v-if="availSlots.length"
        class="avail-tags"
      >
        <el-tag
          v-for="(s, i) in availSlots"
          :key="s.date + s.time"
          closable
          @close="removeAvailSlot(i)"
        >
          {{ s.date }} {{ s.time }}
        </el-tag>
      </div>
      <el-empty
        v-else
        description="尚未添加时段，先选日期和时段后点「添加」"
        :image-size="60"
      />
      <template #footer>
        <el-button @click="availabilityVis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="settingAvail"
          :disabled="!availSlots.length"
          @click="setAvailability"
        >
          保存（{{ availSlots.length }} 个时段）
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import CosImageUpload from '@/components/upload/CosImageUpload.vue'

/** 教师行（字段宽松 optional） */
interface TeacherRow {
  id: string
  name?: string
  stationId?: string
  station?: { id?: string; name?: string }
  avatar?: string
  specialties?: string[]
  bio?: string
  status?: string
  createdAt?: string
}
/** 排期行（后端 getTeacherSchedule 返回 bookings：StationTeacherBooking + station） */
interface ScheduleRow {
  id?: string
  bookingDate?: string
  status?: string
  station?: { id?: string; name?: string }
}

/** 预约状态翻译（PENDING/CONFIRMED/CANCELLED） */
const BOOKING_STATUS: Record<string, { label: string; tag: 'warning' | 'success' | 'info' | 'danger' }> = {
  PENDING: { label: '待确认', tag: 'warning' },
  CONFIRMED: { label: '已确认', tag: 'success' },
  CANCELLED: { label: '已取消', tag: 'info' },
}

const loading = ref(false); const loadError = ref(false); const deleting = ref(false); const saving = ref(false); const list = ref<TeacherRow[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref('')
const filter = reactive({ stationId: '' })
const form = reactive({ name: '', stationId: '', avatar: '', specialtiesStr: '', bio: '', status: 'ACTIVE' })

const scheduleVis = ref(false); const schedule = ref<ScheduleRow[]>([]); const scheduleMonth = ref(''); const conflictMsg = ref(''); const scheduleTeacherId = ref(''); const scheduleLoading = ref(false); const scheduleQueried = ref(false)
const availabilityVis = ref(false); const settingAvail = ref(false); const availTeacherId = ref('')
// 可预约时段：结构化录入（日期 + 常用时段多选），提交时拼 ISO，不再让运营手写 ISO 串
const availDate = ref('')
const availTimes = ref<string[]>([])
const availSlots = ref<{ date: string; time: string }[]>([])
const TIME_OPTIONS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '19:00', '20:00']

// 驿站下拉数据源（GET /offline/stations 返回 stations 键）
interface StationOption { id: string; name?: string; city?: string }
const stationOptions = ref<StationOption[]>([])
const stationsLoading = ref(false)
async function fetchStations() {
  stationsLoading.value = true
  try {
    const { data } = await api.get('/offline/stations', { params: { page: 1, pageSize: 100 } })
    stationOptions.value = data.stations || []
  } catch {
    stationOptions.value = []
  } finally {
    stationsLoading.value = false
  }
}

onMounted(() => { fetchList(); fetchStations() })
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  loadError.value = false
  // 后端返回体键名是 teachers（offline-teacher.service listTeachers）
  try { const { data } = await api.get('/offline/admin/teachers', { params: { page: page.value, pageSize: 20, stationId: filter.stationId || undefined } }); list.value = data.teachers || []; total.value = data.total || 0 } catch { list.value = []; loadError.value = true } finally { loading.value = false }
}

function openCreate() { editingId.value = ''; Object.assign(form, { name: '', stationId: '', avatar: '', specialtiesStr: '', bio: '', status: 'ACTIVE' }); vis.value = true }
function openEdit(row: TeacherRow) { editingId.value = row.id; Object.assign(form, { name: row.name, stationId: row.stationId, avatar: row.avatar || '', specialtiesStr: (row.specialties || []).join(','), bio: row.bio || '', status: row.status || 'ACTIVE' }); vis.value = true }

async function save() {
  saving.value = true
  try {
    const payload: Record<string, unknown> = { name: form.name, stationId: form.stationId, avatar: form.avatar || undefined, specialties: form.specialtiesStr ? form.specialtiesStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [], bio: form.bio || undefined }
    if (editingId.value) {
      if (form.status) payload.status = form.status
      await api.put(`/offline/admin/teachers/${editingId.value}`, payload)
    } else {
      await api.post('/offline/admin/teachers', payload)
    }
    ElMessage.success('已保存'); vis.value = false; fetchList()
  } catch { ElMessage.error('保存失败，请检查填写内容后重试') } finally { saving.value = false }
}

async function del(id: string) {
  try {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
    if (deleting.value) return
    deleting.value = true
    await api.delete(`/offline/admin/teachers/${id}`); ElMessage.success('已删除'); fetchList()
  } catch (e) { if (e !== 'cancel') ElMessage.error('删除失败') } finally { deleting.value = false }
}

function openSchedule(row: TeacherRow) {
  scheduleTeacherId.value = row.id; scheduleMonth.value = new Date().toISOString().slice(0, 7); schedule.value = []; conflictMsg.value = ''; scheduleQueried.value = false
  scheduleVis.value = true
  fetchSchedule() // 打开即查当月，不让运营多点一步
}
async function fetchSchedule() {
  scheduleLoading.value = true
  // 后端返回体键名是 bookings（offline-teacher.service getTeacherSchedule）
  try { const { data } = await api.get(`/offline/admin/teachers/${scheduleTeacherId.value}/schedule`, { params: { month: scheduleMonth.value } }); schedule.value = data.bookings || [] } catch { schedule.value = []; ElMessage.error('排期加载失败，请重试') }
  try { const { data } = await api.get('/offline/admin/schedule/conflicts', { params: { teacherId: scheduleTeacherId.value, date: scheduleMonth.value + '-01' } }); conflictMsg.value = data.conflicts?.length ? `${data.conflicts.length} 个冲突` : '' } catch { conflictMsg.value = '' }
  scheduleLoading.value = false
  scheduleQueried.value = true
}

function openAvailability(row: TeacherRow) { availTeacherId.value = row.id; availDate.value = ''; availTimes.value = []; availSlots.value = []; availabilityVis.value = true }

/** 把选中的日期+时段加入待提交列表（去重） */
function addAvailSlots() {
  if (!availDate.value || !availTimes.value.length) { ElMessage.warning('请先选择日期和时段'); return }
  for (const t of availTimes.value) {
    if (!availSlots.value.some((s) => s.date === availDate.value && s.time === t)) {
      availSlots.value.push({ date: availDate.value, time: t })
    }
  }
  availSlots.value.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  availTimes.value = []
}
function removeAvailSlot(idx: number) { availSlots.value.splice(idx, 1) }

async function setAvailability() {
  if (!availSlots.value.length) { ElMessage.warning('请先添加至少一个时段'); return }
  settingAvail.value = true
  try {
    // 提交时拼 ISO（本地时区），运营全程点选不手写
    const slots = availSlots.value.map((s) => new Date(`${s.date}T${s.time}:00`).toISOString())
    await api.post(`/offline/admin/teachers/${availTeacherId.value}/availability`, { slots })
    ElMessage.success('时段已设置'); availabilityVis.value = false
  } catch { ElMessage.error('时段设置失败，请重试') } finally { settingAvail.value = false }
}
</script>
<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.avail-picker { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
.avail-tags { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
