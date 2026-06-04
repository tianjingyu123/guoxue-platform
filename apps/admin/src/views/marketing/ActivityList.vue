<template>
  <div class="page">
    <div class="toolbar">
      <h3>营销活动</h3><el-button
        type="primary"
        @click="openCreate"
      >
        创建活动
      </el-button>
    </div>
    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="name"
        label="活动名称"
        min-width="150"
      />
      <el-table-column
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          {{ row.type }}
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
            {{ row.status === 'ACTIVE' ? '进行中' : '已停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="开始时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.startTime) }}
        </template>
      </el-table-column>
      <el-table-column
        label="结束时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.endTime) }}
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
          </el-button><el-button
            size="small"
            @click="viewMetrics(row)"
          >
            数据
          </el-button><el-button
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

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑活动' : '创建活动'"
      width="550px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item
          label="名称"
          required
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="form.type"
            style="width:100%"
          >
            <el-option
              label="满减送"
              value="FULL_REDUCTION"
            /><el-option
              label="限量抢购"
              value="LIMITED_PURCHASE"
            /><el-option
              label="节日活动"
              value="HOLIDAY"
            /><el-option
              label="自定义"
              value="CUSTOM"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
          />
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
          </el-col><el-col :span="12">
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

    <el-dialog
      v-model="metricsVis"
      title="活动数据"
      width="400px"
    >
      <el-descriptions
        v-if="metrics"
        :column="1"
        border
      >
        <el-descriptions-item label="曝光量">
          {{ metrics.impressions || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="点击量">
          {{ metrics.clicks || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="转化数">
          {{ metrics.conversions || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="转化率">
          {{ metrics.conversionRate ? (Number(metrics.conversionRate)*100).toFixed(1)+'%' : '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi } from '@/api'

const loading = ref(false); const saving = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref('')
const form = reactive({ name: '', type: '', description: '', startTime: '', endTime: '' })
const metricsVis = ref(false); const metrics = ref<any>(null)

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try { const { data } = await marketingApi.listActivities({ page: page.value, pageSize: 20 }); list.value = data.activities || data.data || []; total.value = data.total || 0 } catch { list.value = [] } finally { loading.value = false }
}
function openCreate() { editingId.value = ''; Object.assign(form, { name: '', type: '', description: '', startTime: '', endTime: '' }); vis.value = true }
function openEdit(row: any) { editingId.value = row.id; Object.assign(form, { name: row.name, type: row.type || '', description: row.description || '', startTime: row.startTime || '', endTime: row.endTime || '' }); vis.value = true }
async function save() {
  saving.value = true
  try { if (editingId.value) { await marketingApi.updateActivity(editingId.value, form) } else { await marketingApi.createActivity(form) } ElMessage.success('已保存'); vis.value = false; fetchList() } catch { } finally { saving.value = false }
}
async function viewMetrics(row: any) {
  try { const { data } = await marketingApi.getActivityMetrics(row.id); metrics.value = data; metricsVis.value = true } catch { }
}
async function del(id: string) { try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await marketingApi.deleteActivity(id); ElMessage.success('已删除'); fetchList() } catch {} }
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
