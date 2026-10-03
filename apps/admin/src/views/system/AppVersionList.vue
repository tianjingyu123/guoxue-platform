<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { createConfirmMessage } from '@/lib/confirm-message'
import { useAuthStore } from '@/store/auth'
import { APP_CHANNELS } from '@guoxue/shared'
import ResourceReleasePanel from './ResourceReleasePanel.vue'

interface AppVersionRow {
  id: string
  applicationId: string
  channelId: string
  rolloutPercentage: number
  targetUserIds: string[]
  platform: 'android' | 'ios' | 'harmony'
  version: string
  buildNumber?: string
  changelog?: string
  forceUpdate?: boolean
  downloadUrl?: string
  checksumSha256?: string
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED'
  minSupportedVersion?: string
  minSupportedBuildNumber?: string
  publishedAt?: string
  createdAt?: string
}

const BASE = '/system/version'
const auth = useAuthStore()
const loading = ref(false)
const loadError = ref(false)
const saving = ref(false)
const list = ref<AppVersionRow[]>([])
const dialogVisible = ref(false)
const editingId = ref('')
const platformFilter = ref('')

const applicationFilter = ref('rebu')
const channelFilter = ref('')
const registrations = ref<any[]>([])
const registrationVisible = ref(false)
const registration = reactive({
  productId: 'rebu',
  applicationId: 'rebu',
  platform: 'android',
  channelId: 'xiaomi',
  clientKey: '',
  packageName: '',
  signingCertificateSha256: '',
})

const form = reactive({
  platform: 'android' as AppVersionRow['platform'],
  applicationId: 'rebu',
  channelId: 'legacy',
  rolloutPercentage: 100,
  targetUserIdsText: '',
  version: '',
  buildNumber: '',
  changelog: '',
  forceUpdate: false,
  downloadUrl: '',
  checksumSha256: '',
})

const isSuperAdmin = computed(() => auth.isSuperAdmin)
const releaseReadiness = computed(() =>
  registrations.value.map((scope) => ({
  platform: scope.platform,
    applicationId: scope.applicationId,
    channelId: scope.channelId,
  active: list.value.find((item) => item.platform === scope.platform &&
        item.applicationId === scope.applicationId &&
        item.channelId === scope.channelId && item.status === 'ACTIVE',
    ),
  drafts: list.value.filter((item) => item.platform === scope.platform &&
        item.applicationId === scope.applicationId &&
        item.channelId === scope.channelId && item.status === 'DRAFT',
    ).length,
})),
)

onMounted(() => {
  void fetchList()
  void loadRegistrations()
})
async function loadRegistrations() {
  const { data } = await api.get('/system/distributions')
  registrations.value = data || []
}
async function registerChannel() {
  saving.value = true
  try {
    await api.post('/system/distributions', {
      ...registration,
      signingCertificateSha256: registration.signingCertificateSha256 || undefined,
    })
    registrationVisible.value = false
    await loadRegistrations()
    ElMessage.success('渠道已登记，WGT 默认禁止')
  } finally {
    saving.value = false
  }
}
const channelLabel = (id: string) => APP_CHANNELS.find((c) => c.id === id)?.name || id

async function fetchList() {
  loading.value = true
  loadError.value = false
  try {
    const params: Record<string, string> = {}
    if (platformFilter.value) params.platform = platformFilter.value
    if (applicationFilter.value) params.applicationId = applicationFilter.value
    if (channelFilter.value) params.channelId = channelFilter.value
    const { data } = await api.get(BASE, { params })
    list.value = data ?? []
  } catch {
    loadError.value = true
    list.value = []
    ElMessage.error('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, {
    platform: 'android', version: '', buildNumber: '', changelog: '',
    forceUpdate: false, downloadUrl: '', checksumSha256: '',
    applicationId: applicationFilter.value || 'rebu',
    channelId: channelFilter.value || 'legacy',
    rolloutPercentage: 100,
    targetUserIdsText: '',
  })
}

function openCreate(platform = 'android', applicationId?: string, channelId?: string) {
  editingId.value = ''
  resetForm()
  form.platform = ['android', 'ios', 'harmony'].includes(platform)
    ? (platform as AppVersionRow['platform'])
    : 'android'
  if (applicationId) form.applicationId = applicationId
  if (channelId) form.channelId = channelId
  dialogVisible.value = true
}

function openEdit(row: AppVersionRow) {
  editingId.value = row.id
  Object.assign(form, {
    platform: row.platform,
    applicationId: row.applicationId,
    channelId: row.channelId,
    rolloutPercentage: row.rolloutPercentage,
    targetUserIdsText: (row.targetUserIds || []).join('\n'),
    version: row.version,
    buildNumber: row.buildNumber ?? '',
    changelog: row.changelog ?? '',
    forceUpdate: row.forceUpdate ?? false,
    downloadUrl: row.downloadUrl ?? '',
    checksumSha256: row.checksumSha256 ?? '',
  })
  dialogVisible.value = true
}

function buildPayload() {
  return {
    platform: form.platform,
    applicationId: form.applicationId,
    channelId: form.channelId,
    rolloutPercentage: form.rolloutPercentage,
    targetUserIds: form.targetUserIdsText
      .split(/[\n,，]/)
      .map((v) => v.trim())
      .filter(Boolean),
    version: form.version.trim(),
    buildNumber: form.buildNumber.trim() || undefined,
    changelog: form.changelog.trim() || undefined,
    forceUpdate: form.forceUpdate,
    downloadUrl: form.downloadUrl.trim() || undefined,
    checksumSha256: form.checksumSha256.trim() || undefined,
  }
}

async function save() {
  if (!form.version.trim()) {
    ElMessage.warning('请输入版本号')
    return
  }
  saving.value = true
  try {
    const payload = buildPayload()
    if (editingId.value) await api.put(`${BASE}/${editingId.value}`, payload)
    else await api.post(BASE, payload)
    ElMessage.success('草稿已保存，尚未对客户端生效')
    dialogVisible.value = false
    fetchList()
  } catch { /* 错误由请求拦截器统一提示 */ } finally {
    saving.value = false
  }
}

async function publish(row: AppVersionRow) {
  if (!row.buildNumber || !row.changelog?.trim() || !row.downloadUrl) {
    ElMessage.warning('发布前请补齐构建号、更新日志和最终下载地址')
    return
  }
  try {
    await ElMessageBox.confirm(
      createConfirmMessage({
        headline: row.forceUpdate ? '即将建立新的强制更新最低线' : '即将切换客户端当前版本',
        headlineTone: row.forceUpdate ? 'danger' : 'warning',
        rows: [
          { label: '平台', value: platformLabel(row.platform) },
          { label: '应用 / 渠道', value: row.applicationId + ' / ' + channelLabel(row.channelId) },
          { label: '灰度', value: String(row.rolloutPercentage) + '%' },
          { label: '版本 / 构建', value: `${row.version} / ${row.buildNumber}`, tone: 'warning' },
          { label: '最终地址', value: row.downloadUrl },
          { label: '更新策略', value: row.forceUpdate ? '低于此版本必须升级' : '推荐升级' },
        ],
        description: '发布后该记录不可编辑或删除，原当前版本自动退役。请先在真实设备验证最终地址和安装包。',
      }),
      '客户端版本发布审批',
      { type: 'warning', confirmButtonText: '确认发布' },
    )
    await api.post(`${BASE}/${row.id}/publish`)
    ElMessage.success('版本已发布并开始用于客户端更新检查')
    fetchList()
  } catch { /* cancelled or handled by interceptor */ }
}

async function rollback(row: AppVersionRow) {
  try {
    await ElMessageBox.confirm(
      createConfirmMessage({
        headline: '回退平台当前版本',
        headlineTone: 'danger',
        rows: [
          { label: '平台', value: platformLabel(row.platform) },
          { label: '回退到', value: `${row.version} / ${row.buildNumber || '-'}`, tone: 'warning' },
        ],
        description: '高版本客户端不会被降级；尚未升级的客户端将改为收到此版本。该操作会完整保留发布审计记录。',
      }),
      '版本回退确认',
      { type: 'warning', confirmButtonText: '确认回退' },
    )
    await api.post(`${BASE}/${row.id}/rollback`)
    ElMessage.success('已回退当前发布版本')
    fetchList()
  } catch { /* cancelled or handled by interceptor */ }
}

async function retire(row: AppVersionRow) {
  try {
    await ElMessageBox.confirm(
      '停用后仅此应用、平台、渠道停止分发新版本。其他商店不受影响。确定继续？',
      '紧急停用确认',
      { type: 'error', confirmButtonText: '确认紧急停用' },
    )
    await api.post(`${BASE}/${row.id}/retire`)
    ElMessage.success('当前版本已紧急停用')
    fetchList()
  } catch { /* cancelled or handled by interceptor */ }
}

async function del(row: AppVersionRow) {
  try {
    await ElMessageBox.confirm(
      `确定删除 ${platformLabel(row.platform)} ${row.version} 草稿？`,
      '删除草稿',
      { type: 'warning', confirmButtonText: '确定删除' },
    )
    await api.delete(`${BASE}/${row.id}`)
    ElMessage.success('草稿已删除')
    fetchList()
  } catch { /* cancelled or handled by interceptor */ }
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}
function platformLabel(platform: string) {
  if (platform === 'ios') return 'iOS'
  if (platform === 'harmony') return '鸿蒙'
  return 'Android'
}
function statusLabel(status: AppVersionRow['status']) {
  return status === 'ACTIVE' ? '当前生效' : status === 'RETIRED' ? '已退役' : '草稿'
}
function statusType(status: AppVersionRow['status']) {
  return status === 'ACTIVE' ? 'success' : status === 'RETIRED' ? 'info' : 'warning'
}
</script>

<template>
  <div class="page">
    <section class="release-guard">
      <div>
        <p class="eyebrow">
          RELEASE CONTROL
        </p>
        <h2>客户端版本发布台</h2>
        <p>运营创建草稿，超级管理员核验最终地址后发布。已发布记录只退役、不覆写，确保可追溯和可回退。</p>
      </div>
      <div class="readiness-grid">
        <article
          v-for="item in releaseReadiness"
          :key="item.applicationId + item.platform + item.channelId"
          class="readiness-item"
        >
          <span>{{ item.applicationId }} / {{ platformLabel(item.platform) }} /
            {{ channelLabel(item.channelId) }}</span>
          <strong>{{ item.active ? item.active.version : '未发布' }}</strong>
          <small>{{ item.drafts }} 个草稿</small>
          <el-button
            v-if="!item.active"
            link
            class="create-link"
            @click="openCreate(item.platform, item.applicationId, item.channelId)"
          >
            创建首个草稿
          </el-button>
        </article>
      </div>
    </section>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="当前无版本记录不会影响现有 App 使用，但客户端不会收到更新提示；请勿用测试地址占位发布。"
      class="guard-alert"
    />

    <div class="toolbar">
      <h3>发布记录与草稿</h3>
      <div class="toolbar-actions">
        <el-input
          v-model="applicationFilter"
          placeholder="应用标识"
          style="width: 130px"
          @change="fetchList"
        />
        <el-select
          v-model="channelFilter"
          clearable
          placeholder="全部渠道"
          style="width: 170px"
          @change="fetchList"
        >
          <el-option
            v-for="channel in APP_CHANNELS"
            :key="channel.id"
            :label="channel.name"
            :value="channel.id"
          />
        </el-select>
        <el-button v-if="isSuperAdmin" @click="registrationVisible = true">登记渠道</el-button>
        <el-select
          v-model="platformFilter"
          placeholder="全部平台"
          clearable
          style="width: 130px"
          @change="fetchList"
        >
          <el-option
            label="Android"
            value="android"
          />
          <el-option
            label="iOS"
            value="ios"
          />
          <el-option
            label="鸿蒙"
            value="harmony"
          />
        </el-select>
        <el-button
          type="primary"
          @click="openCreate()"
        >
          创建版本草稿
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败，请重试"
      class="guard-alert"
    >
      <el-button
        size="small"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
      empty-text=" ">
      <el-table-column prop="applicationId" label="应用" width="100" />
      <el-table-column label="渠道" width="150"
        ><template #default="{ row }">{{ channelLabel(row.channelId) }}</template></el-table-column
      >
      <el-table-column prop="rolloutPercentage" label="灰度 %" width="90" />
      <template #empty>
        <el-empty description="三端均暂无版本记录；最终客户端地址就绪后再创建真实草稿" />
      </template>
      <el-table-column
        label="平台"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.platform === 'ios' ? 'success' : ''"
            size="small"
          >
            {{ platformLabel(row.platform) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusType(row.status)"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="version"
        label="版本号"
        width="110"
      />
      <el-table-column
        prop="buildNumber"
        label="构建号"
        width="90"
      />
      <el-table-column
        label="更新策略"
        width="190"
      >
        <template #default="{ row }">
          <span
            v-if="row.forceUpdate"
            class="danger-text"
          >建立强更线</span>
          <span v-else-if="row.minSupportedVersion">推荐更新（最低 {{ row.minSupportedVersion }}）</span>
          <span v-else>推荐更新</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="changelog"
        label="更新日志"
        min-width="210"
        show-overflow-tooltip
      />
      <el-table-column
        prop="downloadUrl"
        label="最终地址"
        min-width="220"
        show-overflow-tooltip
      />
      <el-table-column
        label="发布时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.publishedAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="250"
        fixed="right"
      >
        <template #default="{ row }">
          <template v-if="row.status === 'DRAFT'">
            <el-button
              type="primary"
              size="small"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="isSuperAdmin"
              type="success"
              size="small"
              @click="publish(row)"
            >
              发布
            </el-button>
            <el-button
              v-if="isSuperAdmin"
              type="danger"
              size="small"
              link
              @click="del(row)"
            >
              删除
            </el-button>
          </template>
          <el-button
            v-else-if="row.status === 'ACTIVE' && isSuperAdmin"
            type="danger"
            size="small"
            plain
            @click="retire(row)"
          >
            紧急停用
          </el-button>
          <el-button
            v-else-if="row.status === 'RETIRED' && isSuperAdmin"
            type="warning"
            size="small"
            plain
            @click="rollback(row)"
          >
            回退到此版本
          </el-button>
          <span
            v-else
            class="muted"
          >只读</span>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑版本草稿' : '创建版本草稿'"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-alert
        type="info"
        :closable="false"
        title="保存只生成草稿，不会触发任何客户端更新。发布由超级管理员另行确认。"
        class="dialog-alert"
      />
      <el-form label-width="118px">
        <el-form-item
          label="应用标识" required
          ><el-input v-model="form.applicationId" :disabled="!!editingId"
        /></el-form-item>
        <el-form-item label="渠道" required>
          <el-select v-model="form.channelId" :disabled="!!editingId">
            <el-option
              v-for="channel in APP_CHANNELS.filter((c) =>
                (c.platforms as readonly string[]).includes(form.platform),
              )"
              :key="channel.id"
              :label="channel.name"
              :value="channel.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="灰度百分比"
          ><el-input-number v-model="form.rolloutPercentage" :min="0" :max="100"
        /></el-form-item>
        <el-form-item label="内部账号"
          ><el-input
            v-model="form.targetUserIdsText"
            type="textarea"
            placeholder="每行一个用户 ID；非 100% 灰度匿名不命中"
        /></el-form-item>
        <el-form-item label="平台"
          required
        >
          <el-select
            v-model="form.platform"
            class="w-full"
            :disabled="!!editingId"
          >
            <el-option
              label="Android"
              value="android"
            />
            <el-option
              label="iOS"
              value="ios"
            />
            <el-option
              label="鸿蒙"
              value="harmony"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="版本号"
          required
        >
          <el-input
            v-model="form.version"
            placeholder="例如 1.2.0"
          />
        </el-form-item>
        <el-form-item label="构建号">
          <el-input
            v-model="form.buildNumber"
            placeholder="发布前必填，例如 120"
          />
        </el-form-item>
        <el-form-item label="更新日志">
          <el-input
            v-model="form.changelog"
            type="textarea"
            :rows="4"
            placeholder="发布前必填；说明用户可感知变化和关键修复"
          />
        </el-form-item>
        <el-form-item label="最终下载地址">
          <el-input
            v-model="form.downloadUrl"
            placeholder="HTTPS 或对应平台官方市场地址"
          />
          <div class="field-help">
            不接受 HTTP、内网或 localhost；发布前请用真实设备验证。
          </div>
        </el-form-item>
        <el-form-item label="包 SHA-256">
          <el-input
            v-model="form.checksumSha256"
            placeholder="直链安装包建议填写 64 位校验值"
          />
        </el-form-item>
        <el-form-item label="强制更新最低线">
          <el-switch v-model="form.forceUpdate" />
          <span class="switch-help">开启后，低于本版本的客户端无法跳过升级</span>
        </el-form-item>
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
          保存草稿
        </el-button>
      </template>
    </el-dialog>
  <el-dialog v-model="registrationVisible" title="登记实际分发身份" width="560px">
      <el-alert
        title="目录项不等于已上架。请填写经核验的实际包身份；登记不会启用 WGT。"
        type="warning"
        :closable="false"
      />
      <el-form label-width="120px">
        <el-form-item label="产品"><el-input v-model="registration.productId" /></el-form-item>
        <el-form-item label="应用"><el-input v-model="registration.applicationId" /></el-form-item>
        <el-form-item label="平台"
          ><el-select v-model="registration.platform"
            ><el-option
              v-for="p in ['android', 'ios', 'harmony']"
              :key="p"
              :label="p"
              :value="p" /></el-select
        ></el-form-item>
        <el-form-item label="渠道"
          ><el-select v-model="registration.channelId"
            ><el-option
              v-for="c in APP_CHANNELS.filter((c) =>
                (c.platforms as readonly string[]).includes(registration.platform),
              )"
              :key="c.id"
              :label="c.name"
              :value="c.id" /></el-select
        ></el-form-item>
        <el-form-item label="公开 clientKey"
          ><el-input v-model="registration.clientKey"
        /></el-form-item>
        <el-form-item label="实际包名"
          ><el-input v-model="registration.packageName"
        /></el-form-item>
        <el-form-item label="签名证书 SHA"
          ><el-input v-model="registration.signingCertificateSha256"
        /></el-form-item>
      </el-form>
      <template #footer
        ><el-button :loading="saving" type="primary" @click="registerChannel"
          >保存登记</el-button
        ></template
      >
    </el-dialog>
    <ResourceReleasePanel />
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.release-guard { display: grid; grid-template-columns: minmax(260px, 0.9fr) 1.4fr; gap: 24px; padding: 22px 24px; color: #f5f0df; background: #133d32; border: 1px solid #9a7b3f; border-radius: 12px; box-shadow: 0 12px 30px rgb(19 61 50 / 14%); }
.release-guard h2 { margin: 2px 0 8px; font-family: Georgia, 'Noto Serif SC', serif; font-size: 25px; }
.release-guard p { margin: 0; line-height: 1.65; color: #d8ddcf; }
.eyebrow { color: #d9bd7a !important; font-size: 11px; letter-spacing: 0.18em; }
.readiness-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; align-items: stretch; }
.readiness-item { display: flex; flex-direction: column; justify-content: center; min-height: 104px; padding: 14px; background: rgb(255 255 255 / 7%); border: 1px solid rgb(217 189 122 / 36%); border-radius: 9px; }
.readiness-item span { color: #d9bd7a; font-size: 12px; }
.readiness-item strong { margin: 4px 0; font-size: 19px; }
.readiness-item small { color: #c4cec6; }
.create-link { align-self: flex-start; margin-top: 4px; padding: 0; color: #f2d798; }
.guard-alert { margin: 14px 0; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin: 18px 0 12px; }
.toolbar h3 { margin: 0; color: #173c32; }
.toolbar-actions { display: flex; gap: 8px; }
.w-full { width: 100%; }
.dialog-alert { margin-bottom: 18px; }
.field-help { margin-top: 4px; color: #8a6c35; font-size: 12px; line-height: 1.5; }
.switch-help { margin-left: 10px; color: #666; font-size: 12px; }
.danger-text { color: var(--el-color-danger); font-weight: 600; }
.muted { color: var(--el-text-color-secondary); font-size: 12px; }
@media (max-width: 960px) {
  .release-guard { grid-template-columns: 1fr; }
  .readiness-grid { grid-template-columns: 1fr; }
}
</style>
