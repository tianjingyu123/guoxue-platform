<template>
  <div class="identity-page">
    <div class="toolbar">
      <h3>实名认证审核</h3>
      <el-button
        :loading="loading"
        @click="fetchList"
      >
        刷新
      </el-button>
    </div>

    <!-- 合规说明：平台不留存证件材料（正面表述） -->
    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
      title="实名认证走腾讯云二要素核验（姓名+身份证号实时比对），平台不留存身份证件材料，下方「核验结论」即审核依据。"
    />

    <el-tabs
      v-model="activeTab"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="待审核"
        name="PENDING"
      />
      <el-tab-pane
        label="已通过"
        name="APPROVED"
      />
      <el-tab-pane
        label="已驳回"
        name="REJECTED"
      />
    </el-tabs>

    <!-- 错误态：保留已有数据统计，仅提示重试 -->
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

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
      :empty-text="emptyText"
    >
      <el-table-column
        label="用户"
        min-width="200"
      >
        <template #default="{ row }">
          <div class="user-cell">
            <el-avatar
              :size="32"
              :src="row.avatar || undefined"
            >
              {{ (row.nickname || '客')[0] }}
            </el-avatar>
            <div class="user-cell__text">
              <el-link
                type="primary"
                :underline="false"
                @click="goUser(row.userId)"
              >
                {{ row.nickname || shortId(row.userId) }}
              </el-link>
              <span class="user-cell__phone">{{ row.phone || '—' }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="核验结论"
        min-width="200"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.verifyResult || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="实名状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.identityVerified ? 'success' : 'info'"
            size="small"
          >
            {{ row.identityVerified ? '已实名' : '未实名' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="提交时间"
        width="130"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="fullTime(row.submittedAt || row.createdAt)"
            placement="top"
          >
            <span>{{ humanTime(row.submittedAt || row.createdAt) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column
        label="审核时间"
        width="130"
      >
        <template #default="{ row }">
          <el-tooltip
            v-if="row.reviewedAt"
            :content="fullTime(row.reviewedAt)"
            placement="top"
          >
            <span>{{ humanTime(row.reviewedAt) }}</span>
          </el-tooltip>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        v-if="activeTab === 'REJECTED'"
        label="驳回理由"
        min-width="160"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span class="reject-reason">{{ row.rejectReason || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="160"
        fixed="right"
      >
        <template #default="{ row }">
          <template v-if="activeTab === 'PENDING'">
            <el-button
              size="small"
              type="success"
              @click="approve(row)"
            >
              通过
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="openReject(row)"
            >
              驳回
            </el-button>
          </template>
          <span
            v-else-if="activeTab === 'APPROVED'"
            class="remark-text"
          >{{ row.remark ? `备注：${row.remark}` : '—' }}</span>
          <span v-else>—</span>
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
      v-model="rejectVisible"
      title="驳回实名认证"
      width="450px"
    >
      <el-form label-width="80px">
        <el-form-item
          label="驳回理由"
          required
        >
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="必填，将告知用户驳回原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="submitting"
          :disabled="!rejectReason.trim()"
          @click="confirmReject"
        >
          确认驳回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

/**
 * 后端新契约（identity.service.ts getIdentityAuditList·按用户折叠）：
 * GET /identity/admin/audit-list?status=&userId=&page=&pageSize=
 * 行字段：id(审计日志id)/userId/status/createdAt/submittedAt/reviewedAt/
 * nickname/avatar/phone(已脱敏)/identityVerified/verifyResult(二要素核验结论)/
 * rejectReason/remark；realName/idCard/idCardFront/idCardBack 恒 null（平台不留存）。
 * 旧版后端缺字段时全部诚实降级显示「—」。
 */
interface AuditRow {
  id: string
  userId: string
  status?: string
  createdAt?: string
  submittedAt?: string | null
  reviewedAt?: string | null
  nickname?: string | null
  avatar?: string | null
  phone?: string | null
  identityVerified?: boolean
  verifyResult?: string | null
  rejectReason?: string | null
  remark?: string | null
}

const router = useRouter()

const loading = ref(false)
const error = ref(false)
const submitting = ref(false)
const activeTab = ref('PENDING')
const list = ref<AuditRow[]>([])
const total = ref(0)
const page = ref(1)

const rejectVisible = ref(false)
const rejectReason = ref('')
const pendingId = ref('')

const emptyText = computed(() => {
  const map: Record<string, string> = {
    PENDING: '暂无待审核的实名认证，去看看已通过的？',
    APPROVED: '还没有已通过的实名认证记录',
    REJECTED: '还没有被驳回的实名认证记录',
  }
  return map[activeTab.value] || '暂无数据'
})

onMounted(() => fetchList())

function shortId(id?: string) {
  if (!id) return '—'
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

function pad(n: number) { return n < 10 ? `0${n}` : `${n}` }

function fullTime(t?: string | null) {
  if (!t) return '—'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 24h 内相对时间，否则 MM-DD HH:mm（悬浮 tooltip 有完整时间） */
function humanTime(t?: string | null) {
  if (!t) return '—'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins >= 0 && mins < 1) return '刚刚'
  if (mins >= 0 && mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours >= 0 && hours < 24) return `${hours}小时前`
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function goUser(userId?: string) {
  if (!userId) return
  router.push(`/users/${userId}`)
}

function onTabChange() {
  page.value = 1
  fetchList()
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const { data } = await api.get('/identity/admin/audit-list', {
      params: { page: page.value, pageSize: 20, status: activeTab.value },
    })
    list.value = data.items || []
    total.value = data.total ?? 0
  } catch {
    // 拦截器已 toast 具体原因；给错误态但不清 total，保留上下文
    error.value = true
  } finally {
    loading.value = false
  }
}

async function approve(row: AuditRow) {
  try {
    await ElMessageBox.confirm(
      `确认通过「${row.nickname || shortId(row.userId)}」的实名认证？通过后该用户将标记为已实名。`,
      '通过实名认证',
      { type: 'info', confirmButtonText: '确认通过', cancelButtonText: '取消' },
    )
  } catch { return /* 用户取消 */ }
  try {
    // 后端 AuditIdentityDto 要求 body 里带 id（identity.dto.ts），故不走旧 identityApi 空 body
    await api.post(`/identity/admin/approve/${row.id}`, { id: row.id })
    ElMessage.success('已通过')
    fetchList()
  } catch {
    // 拦截器已统一提示错误
  }
}

function openReject(row: AuditRow) {
  pendingId.value = row.id
  rejectReason.value = ''
  rejectVisible.value = true
}

async function confirmReject() {
  const reason = rejectReason.value.trim()
  if (!reason) {
    ElMessage.warning('请填写驳回理由')
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    // 后端 DTO 字段是 remark（identity.dto.ts），且 body 必须带 id
    await api.post(`/identity/admin/reject/${pendingId.value}`, { id: pendingId.value, remark: reason })
    ElMessage.success('已驳回')
    rejectVisible.value = false
    fetchList()
  } catch {
    // 拦截器已统一提示错误
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.identity-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.user-cell { display: flex; align-items: center; gap: 8px; }
.user-cell__text { display: flex; flex-direction: column; line-height: 1.4; min-width: 0; }
.user-cell__phone { font-size: 12px; color: var(--color-text-secondary, #909399); }
.reject-reason { color: #C41E3A; font-size: 12px; }
.remark-text { font-size: 12px; color: var(--color-text-secondary, #909399); }
.error-state { padding: 40px 0; }
</style>
