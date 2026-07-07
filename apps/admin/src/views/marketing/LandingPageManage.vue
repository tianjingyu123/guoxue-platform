<template>
  <div class="page">
    <PageHeader title="分享落地页管理" />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="落地页模板" name="templates" />
      <el-tab-pane label="下载引导配置" name="download" />
    </el-tabs>

    <!-- 落地页模板 -->
    <template v-if="activeTab === 'templates'">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>H5落地页模板</span>
            <el-button size="small" type="primary" @click="showPageDialog()">新建模板</el-button>
          </div>
        </template>
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
          <el-table-column prop="name" label="模板名称" width="180" />
          <el-table-column label="适用场景" width="140">
            <template #default="{ row }">
              <el-tag size="small">{{ sceneLabel(row.scene) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="预览" width="100">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="previewPage(row)">预览</el-button>
            </template>
          </el-table-column>
          <el-table-column prop="pvCount" label="访问PV" width="100" align="center" sortable />
          <el-table-column prop="downloadRate" label="下载转化" width="100" align="center">
            <template #default="{ row }">{{ row.downloadRate ?? 0 }}%</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.status === 'ACTIVE' ? '使用中' : '草稿' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" width="150">
            <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="showPageDialog(row)">编辑</el-button>
              <el-popconfirm title="确定删除?" @confirm="deletePage(row.id)">
                <template #reference>
                  <el-button size="small" text type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="pageError ? '加载失败，请重试' : '暂无数据'" />
          </template>
        </el-table>
        <el-pagination
          v-model:current-page="pagePage"
          v-model:page-size="pagePageSize"
          :total="pageTotal"
          layout="total, sizes, prev, pager, next"
          style="margin-top:16px;justify-content:flex-end"
          @current-change="fetchPages"
          @size-change="fetchPages"
        />
      </el-card>
    </template>

    <!-- 下载引导配置 -->
    <template v-if="activeTab === 'download'">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>下载引导内容配置</span>
            <el-button size="small" type="primary" @click="saveDownloadConfig" :loading="saving">保存配置</el-button>
          </div>
        </template>
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
        <el-form-item label="场景" required>
          <el-select v-model="pageForm.scene" style="width:100%">
            <el-option v-for="s in sceneOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="页面内容">
          <el-input v-model="pageForm.content" type="textarea" :rows="6" placeholder="HTML内容或组件JSON配置..." />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="pageForm.status" active-value="ACTIVE" inactive-value="DRAFT" active-text="使用" inactive-text="草稿" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePage">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="落地页预览" width="400px">
      <div style="text-align:center">
        <el-image v-if="previewSrc" :src="previewSrc" style="max-width:375px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15)" />
        <div v-else style="padding:40px;color:#909399">暂无可预览内容</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { marketingApi } from "@/api"
import PageHeader from "@/components/PageHeader.vue"
import CosImageUpload from "@/components/upload/CosImageUpload.vue"

const activeTab = ref("templates")
const pageLoading = ref(false)
const pageError = ref(false)
const saving = ref(false)

// 落地页模板行：依据表格列与编辑/预览访问字段声明
interface LandingPageRow {
  id: string
  name?: string
  scene?: string
  content?: string
  status?: string
  previewUrl?: string
  pvCount?: number
  downloadRate?: number
  updatedAt?: string
}
const pages = ref<LandingPageRow[]>([])
const pagePage = ref(1)
const pagePageSize = ref(10)
const pageTotal = ref(0)
const pageDialogVisible = ref(false)
const editingPage = ref<LandingPageRow | null>(null)
const pageForm = reactive({ name: "", scene: "", content: "", status: "DRAFT" })

// 预览
const previewVisible = ref(false)
const previewSrc = ref("")

// 下载配置
const downloadConfig = reactive({
  title: "下载国学平台App，开启你的文化之旅",
  description: "",
  iosUrl: "",
  androidUrl: "",
  miniAppId: "",
  guideImage: "",
})

const sceneOptions = [
  { label: "课程分享", value: "course_share" },
  { label: "古籍分享", value: "classic_share" },
  { label: "圈子邀请", value: "circle_invite" },
  { label: "商品分享", value: "product_share" },
  { label: "成就分享", value: "achievement_share" },
  { label: "通用下载引导", value: "download_guide" },
]

function sceneLabel(v: string): string { return sceneOptions.find(s => s.value === v)?.label ?? v }
function formatTime(d: string): string { return d ? d.slice(0, 16).replace("T", " ") : "" }

async function fetchPages() {
  pageLoading.value = true
  pageError.value = false
  try {
    const res: any = await marketingApi.listPages()
    const d = res?.data ?? res
    pages.value = d.list ?? d.data ?? []
    pageTotal.value = d.total ?? 0
  } catch { pageError.value = true }
  finally { pageLoading.value = false }
}

function showPageDialog(row?: LandingPageRow) {
  if (row) {
    editingPage.value = row
    pageForm.name = row.name ?? ""; pageForm.scene = row.scene ?? ""
    pageForm.content = row.content ?? ""; pageForm.status = row.status ?? "DRAFT"
  } else {
    editingPage.value = null
    pageForm.name = ""; pageForm.scene = ""; pageForm.content = ""; pageForm.status = "DRAFT"
  }
  pageDialogVisible.value = true
}

async function savePage() {
  try {
    if (editingPage.value?.id) {
      await marketingApi.updatePage(editingPage.value.id, { ...pageForm })
    } else {
      await marketingApi.createPage({ ...pageForm })
    }
    ElMessage.success("保存成功"); pageDialogVisible.value = false; fetchPages()
  } catch { /* */ }
}

async function deletePage(id: string) {
  try { await marketingApi.deletePage(id); ElMessage.success("已删除"); fetchPages() } catch { /* */ }
}

function previewPage(row: LandingPageRow) {
  previewSrc.value = row.previewUrl ?? row.content ?? ""
  previewVisible.value = true
}

async function saveDownloadConfig() {
  saving.value = true
  try { await systemApi.setConfig("download_guide", { value: JSON.stringify(downloadConfig) }); ElMessage.success("配置已保存") }
  catch { /* */ }
  finally { saving.value = false }
}

// 导入 systemApi
import { systemApi } from "@/api"

onMounted(() => { fetchPages() })
</script>

<style scoped>
.page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
