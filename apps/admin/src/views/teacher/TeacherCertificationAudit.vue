<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { teacherCertApi } from '@/api'

interface CertUser {
  id: string
  nickname?: string | null
  avatar?: string | null
  phone?: string | null
}

interface TeacherCertification {
  id: string
  userId: string
  realName: string
  title?: string | null
  intro?: string | null
  credentials?: string[] | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  verifiedTitle?: string | null
  rejectReason?: string | null
  reviewedAt?: string | null
  createdAt?: string
  user?: CertUser | null
}

// 状态 Tab：待审核 / 已通过 / 已驳回 / 全部
const STATUS_TABS = [
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '全部', value: '' },
]

const STATUS_META: Record<string, { label: string; tag: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: '待审核', tag: 'warning' },
  APPROVED: { label: '已通过', tag: 'success' },
  REJECTED: { label: '已驳回', tag: 'danger' },
}

const activeStatus = ref('PENDING')
const loading = ref(false)
const error = ref(false)
const list = ref<TeacherCertification[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 审核抽屉
const drawerVisible = ref(false)
const current = ref<TeacherCertification | null>(null)
const verifiedTitle = ref('')
const rejectReason = ref('')
const submitting = ref(false)

// 已审记录只读展示
const isReadonly = computed(() => !!current.value && current.value.status !== 'PENDING')

function statusLabel(status: string) {
  return STATUS_META[status]?.label || status
}

function statusTag(status: string) {
  return STATUS_META[status]?.tag || 'info'
}

function formatDate(d?: string | null) {
  return d ? new Date(d).toLocaleString() : '-'
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: Record<string, unknown> = { page: page.value, pageSize: pageSize.value }
    if (activeStatus.value) params.status = activeStatus.value
    const { data } = await teacherCertApi.list(params)
    list.value = data.items ?? []
    total.value = data.total ?? 0
  } catch {
    list.value = []
    total.value = 0
    error.value = true
  } finally {
    loading.value = false
  }
}

function onTabChange() {
  page.value = 1
  fetchList()
}

function onPageChange(p: number) {
  page.value = p
  fetchList()
}

function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  fetchList()
}

function openReview(row: TeacherCertification) {
  current.value = row
  // 过审头衔默认带入申请头衔
  verifiedTitle.value = row.status === 'PENDING' ? (row.title || '') : (row.verifiedTitle || '')
  rejectReason.value = row.status === 'PENDING' ? '' : (row.rejectReason || '')
  drawerVisible.value = true
}

async function submitReview(action: 'APPROVE' | 'REJECT') {
  if (!current.value || submitting.value) return
  if (action === 'REJECT' && !rejectReason.value.trim()) {
    ElMessage.warning('驳回必须填写驳回原因')
    return
  }
  submitting.value = true
  try {
    const payload: Record<string, unknown> = { action }
    if (action === 'APPROVE' && verifiedTitle.value.trim()) {
      payload.verifiedTitle = verifiedTitle.value.trim()
    }
    if (action === 'REJECT') {
      payload.rejectReason = rejectReason.value.trim()
    }
    await teacherCertApi.review(current.value.id, payload)
    ElMessage.success(action === 'APPROVE' ? '已通过认证' : '已驳回申请')
    drawerVisible.value = false
    fetchList()
  } catch {
    // 错误已由响应拦截器统一提示
  } finally {
    submitting.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>讲师认证审核</h3>
    </div>

    <el-tabs
      v-model="activeStatus"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        v-for="t in STATUS_TABS"
        :key="t.value"
        :label="t.label"
        :name="t.value"
      />
    </el-tabs>

    <div
      v-if="error"
      class="error-state"
    >
      <el-empty description="加载失败，请重试">
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </el-empty>
    </div>

    <template v-else>
      <el-table
        v-loading="loading"
        :data="list"
        stripe
      >
        <template #empty>
          <el-empty description="暂无认证申请" />
        </template>
        <el-table-column
          label="申请人"
          min-width="160"
        >
          <template #default="{ row }">
            <div class="applicant">
              <el-avatar
                :size="28"
                :src="row.user?.avatar || undefined"
              >
                {{ (row.user?.nickname || row.realName || '?').slice(0, 1) }}
              </el-avatar>
              <span>{{ row.user?.nickname || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="realName"
          label="申请署名"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column
          label="申请头衔"
          min-width="140"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.title || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="申请时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              :type="statusTag(row.status)"
              size="small"
            >
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="90"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              :type="row.status === 'PENDING' ? 'primary' : 'default'"
              @click="openReview(row)"
            >
              {{ row.status === 'PENDING' ? '审核' : '查看' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="onPageChange"
          @size-change="onPageSizeChange"
        />
      </div>
    </template>

    <el-drawer
      v-model="drawerVisible"
      :title="isReadonly ? '认证详情' : '审核讲师认证'"
      size="520px"
    >
      <template v-if="current">
        <el-descriptions
          :column="1"
          border
        >
          <el-descriptions-item label="申请人昵称">
            {{ current.user?.nickname || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="申请署名">
            {{ current.realName }}
          </el-descriptions-item>
          <el-descriptions-item label="申请头衔">
            {{ current.title || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="资历简介">
            {{ current.intro || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatDate(current.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag
              :type="statusTag(current.status)"
              size="small"
            >
              {{ statusLabel(current.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title">
          资质材料
        </div>
        <div
          v-if="current.credentials && current.credentials.length"
          class="credentials"
        >
          <el-image
            v-for="(url, i) in current.credentials"
            :key="url + i"
            class="credential-img"
            :src="url"
            fit="cover"
            :preview-src-list="current.credentials"
            :initial-index="i"
            preview-teleported
          />
        </div>
        <el-empty
          v-else
          description="未提交资质材料"
          :image-size="60"
        />

        <!-- 已审记录：只读展示审核结果 -->
        <template v-if="isReadonly">
          <div class="section-title">
            审核结果
          </div>
          <el-descriptions
            :column="1"
            border
          >
            <el-descriptions-item
              v-if="current.status === 'APPROVED'"
              label="授予头衔"
            >
              {{ current.verifiedTitle || '-' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="current.status === 'REJECTED'"
              label="驳回原因"
            >
              {{ current.rejectReason || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="审核时间">
              {{ formatDate(current.reviewedAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </template>

        <!-- 待审核：通过 / 驳回 -->
        <template v-else>
          <div class="section-title">
            审核操作
          </div>
          <el-form label-width="90px">
            <el-form-item label="授予头衔">
              <el-input
                v-model="verifiedTitle"
                placeholder="通过时授予的认证头衔，默认带入申请头衔"
                maxlength="50"
              />
              <div class="field-tip">
                留空则后端默认授予申请头衔或「认证讲师」
              </div>
            </el-form-item>
            <el-form-item label="驳回原因">
              <el-input
                v-model="rejectReason"
                type="textarea"
                :rows="3"
                placeholder="驳回时必填，将展示给申请人"
                maxlength="200"
              />
            </el-form-item>
          </el-form>
        </template>
      </template>
      <template
        v-if="current && !isReadonly"
        #footer
      >
        <el-button
          type="danger"
          plain
          :loading="submitting"
          @click="submitReview('REJECT')"
        >
          驳回
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitReview('APPROVE')"
        >
          通过
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.error-state { padding: 40px 0; }
.applicant { display: flex; align-items: center; gap: 8px; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
.section-title { margin: 16px 0 8px; font-size: 14px; font-weight: 600; color: var(--el-text-color-primary); }
.credentials { display: flex; flex-wrap: wrap; gap: 8px; }
.credential-img { width: 96px; height: 96px; border-radius: 4px; border: 1px solid var(--el-border-color); cursor: pointer; }
.field-tip { margin-top: 4px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; }
</style>
