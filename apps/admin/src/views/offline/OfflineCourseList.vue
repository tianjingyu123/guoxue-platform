<template>
  <div class="page">
    <div class="toolbar">
      <h3>线下课程管理</h3>
    </div>

    <el-tabs
      v-model="tab"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="待审核"
        name="pending"
      />
      <el-tab-pane
        label="已推荐"
        name="recommended"
      />
    </el-tabs>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="title"
        label="课程名称"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="stationId"
        label="所属驿站"
        width="200"
      />
      <el-table-column
        label="讲师"
        width="100"
      >
        <template #default="{ row }">
          {{ row.teacher?.name || row.teacherId || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="价格"
        width="80"
      >
        <template #default="{ row }">
          ¥{{ ((row.price || 0) / 100).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        label="人数"
        width="60"
      >
        <template #default="{ row }">
          {{ row.registeredCount || 0 }}/{{ row.maxStudents }}
        </template>
      </el-table-column>
      <el-table-column
        label="时间"
        width="300"
      >
        <template #default="{ row }">
          {{ formatDate(row.startTime) }} ~ {{ formatDate(row.endTime) }}
        </template>
      </el-table-column>
      <el-table-column
        label="地点"
        width="120"
      >
        <template #default="{ row }">
          {{ row.location || '-' }}
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
        width="200"
        fixed="right"
      >
        <template #default="{ row }">
          <template v-if="tab === 'pending'">
            <el-button
              size="small"
              type="success"
              @click="auditCourse(row.id, 'APPROVED')"
            >
              通过
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="rejectCourse(row)"
            >
              驳回
            </el-button>
          </template>
          <template v-else>
            <el-button
              size="small"
              type="warning"
              @click="toggleRecommend(row)"
            >
              取消推荐
            </el-button>
          </template>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

const loading = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1); const tab = ref('pending')

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try {
    const url = tab.value === 'pending' ? '/offline/admin/courses/pending' : '/offline/admin/courses/recommended'
    const { data } = await api.get(url, { params: { page: page.value, pageSize: 20 } })
    list.value = data.items || data.data || []
    total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function onTabChange() { page.value = 1; fetchList() }

async function auditCourse(id: string, auditStatus: string) {
  try { await api.put(`/offline/admin/courses/${id}/audit`, { auditStatus }); ElMessage.success(auditStatus === 'APPROVED' ? '已通过' : '已驳回'); fetchList() } catch {}
}

async function rejectCourse(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回课程', { confirmButtonText: '确认', cancelButtonText: '取消' })
    if (value) { await api.put(`/offline/admin/courses/${row.id}/audit`, { auditStatus: 'REJECTED', reason: value }); ElMessage.success('已驳回'); fetchList() }
  } catch {}
}

async function toggleRecommend(row: any) {
  try {
    await ElMessageBox.confirm(`确定${row.isRecommended ? '取消推荐' : '推荐'}此课程？`, '提示', { type: 'info' })
    await api.put(`/offline/admin/courses/${row.id}/recommend`)
    ElMessage.success('已更新'); fetchList()
  } catch {}
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
