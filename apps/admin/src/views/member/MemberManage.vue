<template>
  <div class="page">
    <el-tabs v-model="activeTab">
      <el-tab-pane
        label="会员列表"
        name="list"
      />
      <el-tab-pane
        label="手动授予"
        name="grant"
      />
      <el-tab-pane
        label="撤销会员"
        name="revoke"
      />
    </el-tabs>

    <!-- 会员列表（复用 GET /users 的 memberLevel 筛选·后端已亲核支持） -->
    <div v-if="activeTab === 'list'">
      <div class="filter-row">
        <el-select
          v-model="listLevel"
          style="width:150px"
          @change="onListFilterChange"
        >
          <el-option
            v-for="opt in LEVEL_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-input
          v-model="listKeyword"
          placeholder="昵称 / 手机号搜索"
          clearable
          style="width:220px"
          @keyup.enter="onListFilterChange"
          @clear="onListFilterChange"
        />
        <el-button
          type="primary"
          @click="onListFilterChange"
        >
          查询
        </el-button>
        <el-button @click="resetListFilter">
          重置
        </el-button>
        <el-button
          style="margin-left:auto"
          @click="fetchMembers"
        >
          刷新
        </el-button>
      </div>

      <el-table
        v-loading="listLoading"
        :data="memberRows"
        stripe
      >
        <el-table-column
          label="用户"
          min-width="160"
        >
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar
                :size="28"
                :src="row.avatar"
              >
                {{ (row.nickname || '?').slice(0, 1) }}
              </el-avatar>
              <span>{{ row.nickname || '未命名' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="phone"
          label="手机号"
          width="130"
        />
        <el-table-column
          label="会员等级"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="levelTagType(row.memberLevel)"
            >
              {{ levelLabel(row.memberLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="账号状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.status === 'ACTIVE' ? 'success' : 'danger'"
            >
              {{ row.status === 'ACTIVE' ? '正常' : row.status === 'DISABLED' ? '已封禁' : (row.status || '—') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="用户ID"
          width="120"
        >
          <template #default="{ row }">
            <el-tooltip
              :content="row.id + '（点击复制）'"
              placement="top"
            >
              <span
                class="id-copy"
                @click="copyId(row.id)"
              >{{ (row.id || '').slice(0, 8) }}…</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          label="注册时间"
          width="150"
        >
          <template #default="{ row }">
            {{ fmtDate(row.createdAt) }}
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
              link
              type="primary"
              @click="grantFromRow(row)"
            >
              授予/续期
            </el-button>
            <el-button
              v-if="row.memberLevel && row.memberLevel !== 'NONE'"
              size="small"
              link
              type="danger"
              @click="revokeFromRow(row)"
            >
              撤销
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="listError ? '加载失败' : (listKeyword ? '未找到匹配用户，换个关键词试试' : '当前等级下暂无用户')"
            :image-size="80"
          >
            <el-button
              v-if="listError"
              type="primary"
              @click="fetchMembers"
            >
              重试
            </el-button>
          </el-empty>
        </template>
      </el-table>
      <el-pagination
        v-model:current-page="listPage"
        v-model:page-size="listPageSize"
        :total="listTotal"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @change="fetchMembers"
      />
    </div>

    <!-- 授予 -->
    <div
      v-if="activeTab === 'grant'"
      style="max-width:560px;margin-top:16px"
    >
      <el-form
        :model="grantForm"
        label-width="90px"
      >
        <el-form-item
          label="用户"
          required
        >
          <el-select
            v-model="grantForm.userId"
            filterable
            remote
            clearable
            allow-create
            default-first-option
            :remote-method="searchUsers"
            :loading="userSearching"
            placeholder="输入昵称/手机号搜索用户，或直接粘贴用户ID"
            style="width:100%"
          >
            <el-option
              v-for="u in userOptions"
              :key="u.id"
              :label="u.label"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="会员等级"
          required
        >
          <el-select
            v-model="grantForm.level"
            style="width:100%"
          >
            <el-option
              label="月卡"
              value="MONTHLY"
            />
            <el-option
              label="季卡"
              value="QUARTERLY"
            />
            <el-option
              label="年卡"
              value="YEARLY"
            />
            <el-option
              label="永久"
              value="LIFETIME"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="grantForm.level !== 'LIFETIME'"
          label="有效天数"
        >
          <el-input-number
            v-model="grantForm.durationDays"
            :min="1"
            :max="3650"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="granting"
            @click="doGrant"
          >
            确认授予
          </el-button>
        </el-form-item>
      </el-form>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-top:12px"
      >
        <template #title>
          手动授予不收费，到期时间按所选等级计算。月卡默认30天、季卡默认90天、年卡默认365天、永久无需设置天数。
        </template>
      </el-alert>
    </div>

    <!-- 撤销 -->
    <div
      v-if="activeTab === 'revoke'"
      style="max-width:560px;margin-top:16px"
    >
      <el-form label-width="90px">
        <el-form-item
          label="用户"
          required
        >
          <el-select
            v-model="revokeUserId"
            filterable
            remote
            clearable
            allow-create
            default-first-option
            :remote-method="searchUsers"
            :loading="userSearching"
            placeholder="输入昵称/手机号搜索用户，或直接粘贴用户ID"
            style="width:100%"
          >
            <el-option
              v-for="u in userOptions"
              :key="u.id"
              :label="u.label"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="danger"
            :loading="revoking"
            @click="doRevoke"
          >
            确认撤销
          </el-button>
        </el-form-item>
      </el-form>
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        style="margin-top:12px"
      >
        <template #title>
          撤销后用户将立即降为普通用户（非会员），所有会员权益失效。此操作不可逆，请谨慎。
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { memberAdminApi, userApi } from '@/api'

/** 会员列表行（GET /users 返回·后端已 maskPhone） */
interface MemberUserRow {
  id: string
  nickname?: string
  avatar?: string
  phone?: string
  memberLevel?: string
  status?: string
  createdAt?: string
}

const activeTab = ref('list')
const granting = ref(false); const revoking = ref(false); const revokeUserId = ref('')
const grantForm = reactive({ userId: '', level: 'MONTHLY', durationDays: 30 })

/** 等级中文（与 prisma enum MemberLevel 对齐：NONE/MONTHLY/QUARTERLY/YEARLY/LIFETIME） */
const LEVEL_LABEL: Record<string, string> = {
  NONE: '非会员', MONTHLY: '月卡', QUARTERLY: '季卡', YEARLY: '年卡', LIFETIME: '永久',
}
function levelLabel(l?: string) { return (l && LEVEL_LABEL[l]) || l || '非会员' }
function levelTagType(l?: string): 'success' | 'warning' | 'danger' | 'info' {
  if (l === 'LIFETIME') return 'danger'
  if (l === 'YEARLY') return 'warning'
  if (l === 'MONTHLY' || l === 'QUARTERLY') return 'success'
  return 'info'
}
/** 授予时各等级默认天数 */
const LEVEL_DEFAULT_DAYS: Record<string, number> = { MONTHLY: 30, QUARTERLY: 90, YEARLY: 365 }

function fmtDate(d?: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '—' }

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    ElMessage.success('已复制用户ID')
  } catch { ElMessage.error('复制失败，请手动选择复制') }
}

// ───────── 会员列表 Tab ─────────
const LEVEL_OPTIONS = [
  { label: '月卡会员', value: 'MONTHLY' },
  { label: '季卡会员', value: 'QUARTERLY' },
  { label: '年卡会员', value: 'YEARLY' },
  { label: '永久会员', value: 'LIFETIME' },
  { label: '非会员', value: 'NONE' },
]
const listLevel = ref('MONTHLY')
const listKeyword = ref('')
const listPage = ref(1)
const listPageSize = ref(20)
const listTotal = ref(0)
const listLoading = ref(false)
const listError = ref(false)
const memberRows = ref<MemberUserRow[]>([])

function onListFilterChange() { listPage.value = 1; fetchMembers() }
function resetListFilter() { listLevel.value = 'MONTHLY'; listKeyword.value = ''; listPage.value = 1; fetchMembers() }

async function fetchMembers() {
  listLoading.value = true
  listError.value = false
  try {
    const { data } = await userApi.list({
      page: listPage.value,
      pageSize: listPageSize.value,
      memberLevel: listLevel.value,
      keyword: listKeyword.value.trim() || undefined,
    })
    memberRows.value = data.users || data.items || []
    listTotal.value = data.total || 0
  } catch {
    memberRows.value = []
    listTotal.value = 0
    listError.value = true
  } finally { listLoading.value = false }
}
fetchMembers()

/** 从列表行带入授予/撤销表单，减少手抄ID */
function grantFromRow(row: MemberUserRow) {
  grantForm.userId = row.id
  userOptions.value = [{ id: row.id, label: `${row.nickname || '未命名'}（${row.phone || '无手机号'}）` }]
  activeTab.value = 'grant'
}
function revokeFromRow(row: MemberUserRow) {
  revokeUserId.value = row.id
  userOptions.value = [{ id: row.id, label: `${row.nickname || '未命名'}（${row.phone || '无手机号'}）` }]
  activeTab.value = 'revoke'
}

// ───────── 用户远程搜索（授予/撤销共用） ─────────
const userOptions = ref<{ id: string; label: string }[]>([])
const userSearching = ref(false)

async function searchUsers(kw: string) {
  const k = String(kw || '').trim()
  if (!k) { userOptions.value = []; return }
  userSearching.value = true
  try {
    const { data } = await userApi.list({ keyword: k, pageSize: 20 })
    const users: MemberUserRow[] = data.users || data.items || []
    userOptions.value = users.map((u) => ({
      id: u.id,
      label: `${u.nickname || '未命名'}（${u.phone || '无手机号'}）· ${levelLabel(u.memberLevel)}`,
    }))
  } catch { userOptions.value = [] } finally { userSearching.value = false }
}

/** 选中项的展示名（确认框里"人指代人"） */
function selectedUserLabel(id: string) {
  return userOptions.value.find((u) => u.id === id)?.label || id
}

async function doGrant() {
  if (!grantForm.userId) { ElMessage.warning('请选择或粘贴用户ID'); return }
  const label = LEVEL_LABEL[grantForm.level] || grantForm.level
  const days = grantForm.level === 'LIFETIME'
    ? ''
    : `，有效期 ${grantForm.durationDays || LEVEL_DEFAULT_DAYS[grantForm.level] || 30} 天`
  try {
    await ElMessageBox.confirm(
      `确认授予「${selectedUserLabel(grantForm.userId)}」${label}会员${days}？手动授予不收费。`,
      '授予确认',
      { confirmButtonText: '确认授予', cancelButtonText: '取消', type: 'warning' },
    )
  } catch { return }
  granting.value = true
  try {
    await memberAdminApi.grant({ userId: grantForm.userId, level: grantForm.level, durationDays: grantForm.level === 'LIFETIME' ? undefined : (grantForm.durationDays || undefined) })
    ElMessage.success(`已授予「${selectedUserLabel(grantForm.userId)}」${label}会员`)
    fetchMembers()
  } catch { /* 拦截器已提示错误 */ } finally { granting.value = false }
}

async function doRevoke() {
  if (!revokeUserId.value) { ElMessage.warning('请选择或粘贴用户ID'); return }
  try {
    await ElMessageBox.confirm(
      `确定撤销「${selectedUserLabel(revokeUserId.value)}」的会员资格吗？将立即降为非会员，此操作不可逆。`,
      '危险操作',
      { type: 'error', confirmButtonText: '确认撤销' },
    )
  } catch { return }
  revoking.value = true
  try {
    await memberAdminApi.revoke(revokeUserId.value)
    ElMessage.success(`已撤销「${selectedUserLabel(revokeUserId.value)}」的会员资格`)
    fetchMembers()
  } catch { /* 拦截器已提示错误 */ } finally { revoking.value = false }
}
</script>
<style scoped>
.page { padding: 16px; }
.filter-row { display: flex; gap: 8px; align-items: center; margin: 12px 0 16px; }
.user-cell { display: flex; align-items: center; gap: 8px; }
.id-copy { cursor: pointer; color: var(--el-color-primary); font-family: monospace; font-size: 13px; }
</style>
