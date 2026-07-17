<template>
  <div class="page">
    <PageHeader title="分享落地页管理" />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="落地页模板" name="templates" />
      <el-tab-pane label="下载引导配置" name="download" />
    </el-tabs>

    <!-- 落地页模板（数据源=微页面 MarketingPage·页面内容由微页面组件构成） -->
    <template v-if="activeTab === 'templates'">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>H5落地页模板</span>
            <el-button size="small" type="primary" @click="showPageDialog()">新建模板</el-button>
          </div>
        </template>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom:12px"
        >
          <template #title>
            <span style="font-size:13px">模板的页面内容由<b>微页面组件</b>构成，请在「营销 → 微页面编辑」中配置组件；此处管理名称、路由与上下线状态。</span>
          </template>
        </el-alert>
        <el-alert
          v-if="pageError"
          type="error"
          title="数据加载失败"
          :closable="false"
          show-icon
          style="margin-bottom:12px"
        >
          <el-button size="small" type="primary" @click="fetchPages">重试</el-button>
        </el-alert>
        <el-table :data="pages" border stripe v-loading="pageLoading">
          <el-table-column prop="name" label="模板名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="route" label="路由" min-width="160" show-overflow-tooltip />
          <el-table-column prop="description" label="说明" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.description || '—' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 'PUBLISHED' ? 'success' : row.status === 'OFFLINE' ? 'warning' : 'info'">
                {{ row.status === 'PUBLISHED' ? '使用中' : row.status === 'OFFLINE' ? '已下线' : '草稿' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="150">
            <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="previewPage(row)">预览</el-button>
              <el-button size="small" text type="primary" @click="showPageDialog(row)">编辑</el-button>
              <el-button size="small" text type="danger" @click="deletePage(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="pageError ? '加载失败，请重试' : '暂无落地页模板，点右上角「新建模板」创建'" />
          </template>
        </el-table>
      </el-card>
    </template>

    <!-- 下载引导配置 -->
    <template v-if="activeTab === 'download'">
      <el-card v-loading="configLoading">
        <template #header>
          <div class="card-header">
            <span>下载引导内容配置</span>
            <el-button size="small" type="primary" @click="saveDownloadConfig" :loading="saving">保存配置</el-button>
          </div>
        </template>
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom:12px"
          title="此配置对所有分享出去的落地页实时生效，保存前请确认内容无误。"
        />
        <el-form :model="downloadConfig" label-width="120px">
          <el-form-item label="引导标题">
            <el-input v-model="downloadConfig.title" placeholder="如：下载国学平台App，开启你的文化之旅" />
          </el-form-item>
          <el-form-item label="引导描述">
            <el-input v-model="downloadConfig.description" type="textarea" :rows="3" placeholder="描述App的核心功能和价值" />
          </el-form-item>
          <el-form-item label="iOS下载链接">
            <el-input v-model="downloadConfig.iosUrl" placeholder="App Store 链接" />
          </el-form-item>
          <el-form-item label="Android下载链接">
            <el-input v-model="downloadConfig.androidUrl" placeholder="应用宝/官网APK链接" />
          </el-form-item>
          <el-form-item label="小程序AppID">
            <el-input v-model="downloadConfig.miniAppId" placeholder="微信小程序AppID" />
          </el-form-item>
          <el-form-item label="引导图片">
            <CosImageUpload v-model="downloadConfig.guideImage" tip="点击上传图片" />
          </el-form-item>
        </el-form>
      </el-card>
    </template>

    <!-- 模板编辑弹窗 -->
    <el-dialog v-model="pageDialogVisible" :title="editingPage?.id ? '编辑模板' : '新建模板'" width="560px">
      <el-form :model="pageForm" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="pageForm.name" placeholder="如：课程分享落地页" />
        </el-form-item>
        <el-form-item label="路由" required>
          <el-input v-model="pageForm.route" placeholder="如 /landing/course-share（全局唯一）" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="pageForm.description" type="textarea" :rows="2" placeholder="内部备注（可选）" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="pageForm.status" active-value="PUBLISHED" inactive-value="DRAFT" active-text="使用" inactive-text="草稿" />
        </el-form-item>
        <div class="form-hint">页面内容（banner/秒杀/拼团/富文本等组件）请在「营销 → 微页面编辑」中配置。</div>
      </el-form>
      <template #footer>
        <el-button @click="pageDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="pageSaving" @click="savePage">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗（结构化展示页面组件·不再当图片渲染） -->
    <el-dialog v-model="previewVisible" title="落地页预览" width="560px">
      <div v-loading="previewLoading">
        <el-descriptions v-if="previewData" :column="2" border size="small" style="margin-bottom:12px">
          <el-descriptions-item label="名称">{{ previewData.name }}</el-descriptions-item>
          <el-descriptions-item label="路由">{{ previewData.route }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ previewData.status === 'PUBLISHED' ? '使用中' : previewData.status === 'OFFLINE' ? '已下线' : '草稿' }}
          </el-descriptions-item>
          <el-descriptions-item label="组件数">{{ (previewData.components || []).length }}</el-descriptions-item>
        </el-descriptions>
        <el-table
          v-if="previewData && (previewData.components || []).length"
          :data="previewData.components"
          border
          size="small"
          max-height="360"
        >
          <el-table-column label="顺序" width="60">
            <template #default="{ $index }">{{ $index + 1 }}</template>
          </el-table-column>
          <el-table-column label="组件类型" width="120">
            <template #default="{ row }">{{ componentTypeLabel(row.type) }}</template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.title || '—' }}</template>
          </el-table-column>
        </el-table>
        <el-empty
          v-else-if="previewData"
          description="该页面尚未配置组件，请到「微页面编辑」添加"
        />
        <el-empty
          v-else-if="!previewLoading"
          description="预览加载失败，请重试"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { marketingApi, systemApi } from "@/api"
import PageHeader from "@/components/PageHeader.vue"
import CosImageUpload from "@/components/upload/CosImageUpload.vue"

const activeTab = ref("templates")
const pageLoading = ref(false)
const pageError = ref(false)
const saving = ref(false)
const pageSaving = ref(false)
const configLoading = ref(false)

// 落地页模板行（对齐后端 MarketingPage 模型：name/route/description/status）
interface LandingPageRow {
  id: string
  name?: string
  route?: string
  description?: string
  status?: string
  updatedAt?: string
}
// 页面组件（预览用）
interface PageComponentRow { id?: string; type?: string; title?: string; sortOrder?: number }
interface PageDetail extends LandingPageRow { components?: PageComponentRow[] }

const pages = ref<LandingPageRow[]>([])
const pageDialogVisible = ref(false)
const editingPage = ref<LandingPageRow | null>(null)
const pageForm = reactive({ name: "", route: "", description: "", status: "DRAFT" })

// 预览
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewData = ref<PageDetail | null>(null)

// 下载配置（保存于 ConfigSystem 键 download_guide）
const DOWNLOAD_CONFIG_KEY = "download_guide"
const downloadConfig = reactive({
  title: "下载国学平台App，开启你的文化之旅",
  description: "",
  iosUrl: "",
  androidUrl: "",
  miniAppId: "",
  guideImage: "",
})

const COMPONENT_TYPE_MAP: Record<string, string> = {
  banner: "轮播图", countdown: "倒计时", flashsale: "秒杀", groupbuy: "拼团",
  coupon: "优惠券", recommend: "推荐位", richtext: "富文本", tabs: "标签页",
}
function componentTypeLabel(t?: string): string { return t ? (COMPONENT_TYPE_MAP[t] || t) : "—" }
function formatTime(d?: string): string { return d ? d.slice(0, 16).replace("T", " ") : "—" }

async function fetchPages() {
  pageLoading.value = true
  pageError.value = false
  try {
    // 后端 GET /marketing/pages 返回全量数组（不支持分页），故此处不做分页控件
    const { data } = await marketingApi.listPages()
    pages.value = Array.isArray(data) ? data : (data.items || data.list || data.data || [])
  } catch { pageError.value = true }
  finally { pageLoading.value = false }
}

function showPageDialog(row?: LandingPageRow) {
  if (row) {
    editingPage.value = row
    pageForm.name = row.name ?? ""; pageForm.route = row.route ?? ""
    pageForm.description = row.description ?? ""; pageForm.status = row.status ?? "DRAFT"
  } else {
    editingPage.value = null
    pageForm.name = ""; pageForm.route = ""; pageForm.description = ""; pageForm.status = "DRAFT"
  }
  pageDialogVisible.value = true
}

async function savePage() {
  if (!pageForm.name.trim()) { ElMessage.warning("请输入模板名称"); return }
  if (!pageForm.route.trim()) { ElMessage.warning("请输入路由"); return }
  pageSaving.value = true
  try {
    if (editingPage.value?.id) {
      await marketingApi.updatePage(editingPage.value.id, {
        name: pageForm.name.trim(), route: pageForm.route.trim(),
        description: pageForm.description || undefined, status: pageForm.status,
      })
    } else {
      // 创建端点不接受 status；开关为"使用"时创建后补一次状态更新
      const { data } = await marketingApi.createPage({
        name: pageForm.name.trim(), route: pageForm.route.trim(),
        description: pageForm.description || undefined,
      })
      const newId = (data as { id?: string })?.id
      if (newId && pageForm.status === "PUBLISHED") {
        await marketingApi.updatePage(newId, { status: "PUBLISHED" })
      }
    }
    ElMessage.success("保存成功"); pageDialogVisible.value = false; fetchPages()
  } catch { /* 拦截器已提示 */ }
  finally { pageSaving.value = false }
}

async function deletePage(row: LandingPageRow) {
  const warn = row.status === "PUBLISHED"
    ? `模板「${row.name || ""}」正在使用中，删除后线上分享出去的落地页链接将立即失效。`
    : "删除后不可恢复。"
  try {
    await ElMessageBox.confirm(`${warn}确定删除？`, "删除模板", { type: "warning", confirmButtonText: "确认删除", cancelButtonText: "取消" })
  } catch { return }
  try { await marketingApi.deletePage(row.id); ElMessage.success("已删除"); fetchPages() } catch { /* 拦截器已提示 */ }
}

async function previewPage(row: LandingPageRow) {
  previewVisible.value = true
  previewLoading.value = true
  previewData.value = null
  try {
    const { data } = await marketingApi.getPage(row.id)
    previewData.value = data as PageDetail
  } catch { /* 空态兜底 */ }
  finally { previewLoading.value = false }
}

/** 回填已保存的下载引导配置（防止一进页面就用默认值覆盖线上配置） */
async function loadDownloadConfig() {
  configLoading.value = true
  try {
    const { data } = await systemApi.listConfigs()
    const configs = (data as { configs?: Array<{ configKey?: string; configValue?: string }> })?.configs || []
    const saved = configs.find(c => c.configKey === DOWNLOAD_CONFIG_KEY)
    if (saved?.configValue) {
      try { Object.assign(downloadConfig, JSON.parse(saved.configValue)) } catch { /* 历史值非 JSON 时保留默认 */ }
    }
  } catch { /* 读取失败保留默认值，保存前仍有覆盖确认拦截 */ }
  finally { configLoading.value = false }
}

async function saveDownloadConfig() {
  try {
    await ElMessageBox.confirm(
      "保存将覆盖线上下载引导配置，对所有分享出去的落地页实时生效。确定保存？",
      "覆盖线上配置",
      { type: "warning", confirmButtonText: "确认保存", cancelButtonText: "取消" },
    )
  } catch { return }
  saving.value = true
  try { await systemApi.setConfig(DOWNLOAD_CONFIG_KEY, { value: JSON.stringify(downloadConfig) }); ElMessage.success("配置已保存并生效") }
  catch { /* 拦截器已提示 */ }
  finally { saving.value = false }
}

onMounted(() => { fetchPages(); loadDownloadConfig() })
</script>

<style scoped>
.page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.form-hint { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.5; padding: 0 0 4px 100px; }
</style>
