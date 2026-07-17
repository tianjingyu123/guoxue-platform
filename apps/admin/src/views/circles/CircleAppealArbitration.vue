<template>
  <div class="page">
    <div class="header">
      <h2>圈子申诉仲裁（平台裁决·不经圈主）</h2>
      <el-button
        :loading="loading"
        @click="fetchList"
      >
        刷新
      </el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      <template #title>
        成员对圈内处理（警告/禁言/移出）72 小时内发起的申诉在此仲裁，承诺 48 小时答复；
        <strong>超时未裁决将自动判定申诉成立并撤销处理</strong>。成立=撤销处理并清除违规记录；不成立=处理维持，仲裁说明同步给成员。
      </template>
    </el-alert>

    <el-tabs
      v-model="statusTab"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="待裁决"
        name="PENDING"
      />
      <el-tab-pane
        label="已成立"
        name="UPHELD"
      />
      <el-tab-pane
        label="已维持"
        name="REJECTED"
      />
    </el-tabs>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    >
      <template #title>
        加载失败，请
        <el-button
          link
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
      border
    >
      <template #empty>
        <el-empty description="暂无申诉" />
      </template>
      <el-table-column
        label="申诉人"
        width="140"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.user?.nickname || row.userId || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        label="圈子"
        min-width="130"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.circleName || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        label="被诉处理"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="violationTag(row.violation?.type)"
          >
            {{ violationLabel(row.violation?.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="处理理由"
        min-width="160"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.violation?.reason || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        label="申诉理由"
        min-width="200"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.reason || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        label="裁决截止"
        width="170"
      >
        <template #default="{ row }">
          <span :style="isUrgent(row) ? 'color:#F56C6C;font-weight:600' : ''">
            {{ formatDate(row.deadlineAt) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        v-if="statusTab !== 'PENDING'"
        label="仲裁说明"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.resolution || '--' }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="statusTab === 'PENDING'"
        label="操作"
        width="180"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="success"
            @click="openResolve(row, true)"
          >
            成立
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="openResolve(row, false)"
          >
            维持处理
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top: 16px; justify-content: flex-end"
      @current-change="fetchList"
    />

    <!-- 裁决对话框 -->
    <el-dialog
      v-model="resolveVisible"
      :title="resolveUphold ? '裁定申诉成立（撤销处理并清记录）' : '维持原处理'"
      width="480px"
    >
      <el-input
        v-model="resolution"
        type="textarea"
        :rows="4"
        maxlength="1000"
        show-word-limit
        placeholder="仲裁说明（必填，将同步给成员）"
      />
      <template #footer>
        <el-button @click="resolveVisible = false">
          取消
        </el-button>
        <el-button
          :type="resolveUphold ? 'success' : 'danger'"
          :loading="submitting"
          :disabled="resolution.trim().length < 2"
          @click="confirmResolve"
        >
          确认{{ resolveUphold ? '成立' : '维持' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { circleAppealApi } from '@/api'

interface AppealRow {
  id: string
  userId: string
  circleId: string
  reason?: string
  status: string
  resolution?: string | null
  deadlineAt?: string
  circleName?: string
  user?: { nickname?: string } | null
  violation?: { type?: string; reason?: string } | null
}

const loading = ref(false)
const error = ref(false)
const list = ref<AppealRow[]>([])
const total = ref(0)
const page = ref(1)
const statusTab = ref('PENDING')

const resolveVisible = ref(false)
const resolveUphold = ref(true)
const resolution = ref('')
const pendingRow = ref<AppealRow | null>(null)
const submitting = ref(false)

function violationLabel(t?: string) {
  const map: Record<string, string> = { WARNING: '警告', MUTE: '禁言', REMOVE: '移出' }
  return map[t || ''] || t || '--'
}
function violationTag(t?: string) {
  const map: Record<string, string> = { WARNING: 'warning', MUTE: 'danger', REMOVE: 'danger' }
  return map[t || ''] || 'info'
}
function formatDate(d?: string) {
  return d ? new Date(d).toLocaleString() : '--'
}
/** 距 48h 裁决截止不足 12 小时标红 */
function isUrgent(row: AppealRow) {
  if (!row.deadlineAt || statusTab.value !== 'PENDING') return false
  return new Date(row.deadlineAt).getTime() - Date.now() < 12 * 3600 * 1000
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const { data } = await circleAppealApi.list({ page: page.value, pageSize: 20, status: statusTab.value })
    list.value = data.items || []
    total.value = data.total ?? 0
  } catch {
    error.value = true
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}
function onTabChange() {
  page.value = 1
  fetchList()
}

function openResolve(row: AppealRow, uphold: boolean) {
  pendingRow.value = row
  resolveUphold.value = uphold
  resolution.value = ''
  resolveVisible.value = true
}
async function confirmResolve() {
  if (!pendingRow.value || submitting.value) return
  submitting.value = true
  try {
    await circleAppealApi.resolve(pendingRow.value.id, { uphold: resolveUphold.value, resolution: resolution.value.trim() })
    ElMessage.success(resolveUphold.value ? '已裁定成立，处理已撤销' : '已维持原处理')
    resolveVisible.value = false
    fetchList()
  } catch {
    // 错误已由 api/index.ts 响应拦截器统一弹出人话提示，此处不再重复弹（避免双弹+英文 axios message）
  } finally {
    submitting.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; }
</style>
