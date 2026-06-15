<template>
  <div class="page">
    <PageHeader title="认证标识管理" />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="认证类型管理" name="types" />
      <el-tab-pane label="认证申请审批" name="applications">
        <template #label>
          认证申请审批
          <el-badge v-if="pendingCount > 0" :value="pendingCount" style="margin-left:4px" />
        </template>
      </el-tab-pane>
      <el-tab-pane label="已认证用户" name="users" />
    </el-tabs>

    <!-- 认证类型管理 -->
    <template v-if="activeTab === 'types'">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>认证类型列表</span>
            <el-button size="small" type="primary" @click="showTypeDialog()">新建类型</el-button>
          </div>
        </template>
        <el-table :data="certTypes" border stripe>
          <el-table-column label="图标" width="70">
            <template #default="{ row }">
              <span :style="{ color: row.color, fontSize: '20px' }">{{ row.icon || '🏅' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" width="120" />
          <el-table-column prop="description" label="说明" minWidth="200" show-overflow-tooltip />
          <el-table-column label="自动授予" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.autoGrantRole" size="small" type="success">{{ roleLabel(row.autoGrantRole) }}</el-tag>
              <span v-else style="color:#ccc">手动</span>
            </template>
          </el-table-column>
          <el-table-column prop="userCount" label="已认证用户" width="100" align="center" />
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="showTypeDialog(row)">编辑</el-button>
              <el-popconfirm title="确定删除?" @confirm="deleteType(row.id)">
                <template #reference>
                  <el-button size="small" text type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <!-- 认证申请审批 -->
    <template v-if="activeTab === 'applications'">
      <SearchFilter
        :filters="appFilters"
        :custom-filters="appFilterDefs"
        placeholder="搜索用户"
        @search="onAppSearch"
        @reset="onAppReset"
      />
      <el-card>
        <el-table :data="applications" border stripe v-loading="appLoading">
          <el-table-column prop="userName" label="用户" width="140" />
          <el-table-column label="申请认证" width="120">
            <template #default="{ row }">
              <el-tag size="small">{{ row.certTypeName }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="申请理由" minWidth="200" show-overflow-tooltip />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="appStatusColor(row.status)">{{ appStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="申请时间" width="150">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" v-if="showAppActions">
            <template #default="{ row }">
              <template v-if="row.status === 'PENDING'">
                <el-button size="small" type="success" @click="approveApp(row)">通过</el-button>
                <el-button size="small" type="danger" @click="showRejectDialog(row)">拒绝</el-button>
              </template>
              <span v-else style="color:#909399">-</span>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="appPagination.page"
          v-model:page-size="appPagination.pageSize"
          :total="appPagination.total"
          layout="total, sizes, prev, pager, next"
          style="margin-top:16px;justify-content:flex-end"
          @current-change="fetchApplications"
          @size-change="fetchApplications"
        />
      </el-card>
    </template>

    <!-- 已认证用户 -->
    <template v-if="activeTab === 'users'">
      <SearchFilter
        :filters="userFilters"
        :custom-filters="userFilterDefs"
        placeholder="搜索用户昵称或ID"
        @search="onUserSearch"
        @reset="onUserReset"
      />
      <el-card>
        <el-table :data="certUsers" border stripe v-loading="userLoading">
          <el-table-column prop="userName" label="用户" width="160" />
          <el-table-column label="认证标识" width="200">
            <template #default="{ row }">
              <el-tag
                v-for="c in row.certifications"
                :key="c.typeId"
                size="small"
                :color="c.color"
                style="margin-right:4px;color:#fff"
              >
                {{ c.icon }} {{ c.name }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="certCount" label="标识数" width="80" align="center" />
          <el-table-column prop="createdAt" label="首次认证时间" width="150">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-popconfirm title="确定撤销该用户的所有认证?" @confirm="revokeUserCert(row)">
                <template #reference>
                  <el-button size="small" text type="danger">撤销认证</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="userPagination.page"
          v-model:page-size="userPagination.pageSize"
          :total="userPagination.total"
          layout="total, sizes, prev, pager, next"
          style="margin-top:16px;justify-content:flex-end"
          @current-change="fetchCertUsers"
          @size-change="fetchCertUsers"
        />
      </el-card>
    </template>

    <!-- 认证类型编辑弹窗 -->
    <el-dialog v-model="typeDialogVisible" :title="editingType?.id ? '编辑认证类型' : '新建认证类型'" width="520px">
      <el-form :model="typeForm" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="typeForm.name" placeholder="如：圈主、讲师、达人" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="typeForm.icon" placeholder="emoji 或文本" style="width:120px" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="typeForm.color" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="typeForm.description" type="textarea" :rows="2" placeholder="描述该认证的含义和获取条件" />
        </el-form-item>
        <el-form-item label="自动授予角色">
          <el-select v-model="typeForm.autoGrantRole" placeholder="选择自动授予的角色（可选）" clearable style="width:100%">
            <el-option label="圈主" value="CIRCLE_OWNER" />
            <el-option label="讲师" value="LECTURER" />
            <el-option label="分站长" value="STATION_MASTER" />
            <el-option label="研究院成员" value="INSTITUTE_MEMBER" />
            <el-option label="达人" value="EXPERT" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveType">保存</el-button>
      </template>
    </el-dialog>

    <!-- 拒绝原因弹窗 -->
    <el-dialog v-model="rejectVisible" title="拒绝认证申请" width="420px">
      <el-form>
        <el-form-item label="拒绝原因">
          <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="填写拒绝原因（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { certificationApi } from "@/api"
import SearchFilter from "@/components/SearchFilter.vue"
import PageHeader from "@/components/PageHeader.vue"

const activeTab = ref("types")
const pendingCount = ref(0)

// 认证类型
const certTypes = ref<any[]>([])
const typeDialogVisible = ref(false)
const editingType = ref<any>(null)
const typeForm = reactive({ name: "", icon: "🏅", color: "#C41E1E", description: "", autoGrantRole: "" as string })

// 认证申请
const appLoading = ref(false)
const applications = ref<any[]>([])
const appPagination = reactive({ page: 1, pageSize: 10, total: 0 })
const appFilters = reactive<Record<string, any>>({})
const rejectVisible = ref(false)
const rejectReason = ref("")
const rejectingApp = ref<any>(null)

const appFilterDefs: { key: string; label: string; type: 'input' | 'select' | 'date'; options: { label: string; value: string | number }[] }[] = [
  { key: "status", label: "状态", type: "select" as const, options: [
    { label: "全部", value: "" }, { label: "待审批", value: "PENDING" },
    { label: "已通过", value: "APPROVED" }, { label: "已拒绝", value: "REJECTED" },
  ]},
  { key: "typeId", label: "认证类型", type: "select" as const, options: [] as { label: string; value: string | number }[] },
]

// 已认证用户
const userLoading = ref(false)
const certUsers = ref<any[]>([])
const userPagination = reactive({ page: 1, pageSize: 10, total: 0 })
const userFilters = reactive<Record<string, any>>({})

const userFilterDefs: { key: string; label: string; type: 'input' | 'select' | 'date'; options: { label: string; value: string | number }[] }[] = [
  { key: "typeId", label: "认证类型", type: "select" as const, options: [] as { label: string; value: string | number }[] },
]

const roleLabelMap: Record<string, string> = { CIRCLE_OWNER: "圈主", LECTURER: "讲师", STATION_MASTER: "分站长", INSTITUTE_MEMBER: "研究院", EXPERT: "达人" }
function roleLabel(r: string): string { return roleLabelMap[r] ?? r }
function formatTime(d: string): string { return d ? d.slice(0, 16).replace("T", " ") : "" }
function appStatusLabel(s: string): string {
  const m: Record<string, string> = { PENDING: "待审批", APPROVED: "已通过", REJECTED: "已拒绝" }; return m[s] ?? s
}
function appStatusColor(s: string): string {
  const m: Record<string, string> = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" }; return m[s] ?? ""
}
const showAppActions = ref(true)

// === 认证类型 ===
async function fetchCertTypes() {
  try {
    const res: any = await certificationApi.listTypes()
    certTypes.value = (res?.data ?? res)?.list ?? (res?.data ?? res)?.types ?? []
    // 更新筛选选项
    const typeOpts = certTypes.value.map(t => ({ label: t.name, value: t.id }))
    appFilterDefs[1].options = [{ label: "全部", value: "" }, ...typeOpts]
    userFilterDefs[0].options = [{ label: "全部", value: "" }, ...typeOpts]
  } catch { /* */ }
}

function showTypeDialog(row?: any) {
  if (row) {
    editingType.value = row
    typeForm.name = row.name; typeForm.icon = row.icon ?? "🏅"
    typeForm.color = row.color ?? "#C41E1E"; typeForm.description = row.description ?? ""
    typeForm.autoGrantRole = row.autoGrantRole ?? ""
  } else {
    editingType.value = null
    typeForm.name = ""; typeForm.icon = "🏅"; typeForm.color = "#C41E1E"
    typeForm.description = ""; typeForm.autoGrantRole = ""
  }
  typeDialogVisible.value = true
}

async function saveType() {
  try {
    if (editingType.value?.id) {
      await certificationApi.updateType(editingType.value.id, { ...typeForm })
    } else {
      await certificationApi.createType({ ...typeForm })
    }
    ElMessage.success("保存成功"); typeDialogVisible.value = false; fetchCertTypes()
  } catch { /* */ }
}

async function deleteType(id: string) {
  try { await certificationApi.deleteType(id); ElMessage.success("删除成功"); fetchCertTypes() } catch { /* */ }
}

// === 认证申请 ===
async function fetchApplications() {
  appLoading.value = true
  try {
    const params = { page: appPagination.page, pageSize: appPagination.pageSize, ...appFilters }
    const res: any = await certificationApi.listApplications(params)
    const d = res?.data ?? res
    applications.value = (d.list ?? d.data ?? []).map((a: any) => ({
      ...a, userName: a.user?.nickname ?? '未知', certTypeName: a.certType?.name ?? '未知'
    }))
    appPagination.total = d.total ?? 0
    pendingCount.value = d.pendingCount ?? 0
  } catch { /* */ }
  finally { appLoading.value = false }
}

function onAppSearch(f: Record<string, any>) { Object.assign(appFilters, f); appPagination.page = 1; fetchApplications() }
function onAppReset() { Object.keys(appFilters).forEach(k => { appFilters[k] = undefined }); appPagination.page = 1; fetchApplications() }

async function approveApp(row: any) {
  try { await certificationApi.approveApplication(row.id); ElMessage.success("已通过"); fetchApplications() } catch { /* */ }
}

function showRejectDialog(row: any) {
  rejectingApp.value = row; rejectReason.value = ""; rejectVisible.value = true
}

async function confirmReject() {
  try {
    await certificationApi.rejectApplication(rejectingApp.value.id, rejectReason.value)
    ElMessage.success("已拒绝"); rejectVisible.value = false; fetchApplications()
  } catch { /* */ }
}

// === 已认证用户 ===
async function fetchCertUsers() {
  userLoading.value = true
  try {
    const params = { page: userPagination.page, pageSize: userPagination.pageSize, ...userFilters }
    const res: any = await certificationApi.listCertifiedUsers(params)
    const d = res?.data ?? res
    certUsers.value = (d.list ?? d.data ?? []).map((u: any) => ({
      ...u, userName: u.user?.nickname ?? '未知', certCount: u.certifications?.length ?? 0
    }))
    userPagination.total = d.total ?? 0
  } catch { /* */ }
  finally { userLoading.value = false }
}

function onUserSearch(f: Record<string, any>) { Object.assign(userFilters, f); userPagination.page = 1; fetchCertUsers() }
function onUserReset() { Object.keys(userFilters).forEach(k => { userFilters[k] = undefined }); userPagination.page = 1; fetchCertUsers() }

async function revokeUserCert(row: any) {
  try {
    await certificationApi.revokeCertification(row.userId ?? row.user?.id, row.certifications?.[0]?.typeId)
    ElMessage.success("已撤销"); fetchCertUsers()
  } catch { /* */ }
}

onMounted(() => { fetchCertTypes(); fetchApplications(); fetchCertUsers() })
</script>

<style scoped>
.page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
