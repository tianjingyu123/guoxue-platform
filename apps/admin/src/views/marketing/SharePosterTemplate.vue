<template>
  <div class="page">
    <PageHeader title="分享海报模板管理" />

    <!-- 品牌元素配置 -->
    <el-card style="margin-bottom:16px">
      <template #header>
        <div class="card-header">
          <span>品牌元素配置</span>
          <el-button size="small" type="primary" @click="saveBrand" :loading="brandSaving">保存品牌配置</el-button>
        </div>
      </template>
      <el-form :model="brandConfig" label-width="100px" inline>
        <el-form-item label="主色">
          <el-color-picker v-model="brandConfig.primaryColor" />
        </el-form-item>
        <el-form-item label="背景色">
          <el-color-picker v-model="brandConfig.bgColor" />
        </el-form-item>
        <el-form-item label="字体">
          <el-select v-model="brandConfig.fontFamily" placeholder="选择字体" style="width:160px">
            <el-option label="思源宋体" value="Source Han Serif" />
            <el-option label="思源黑体" value="Source Han Sans" />
            <el-option label="站酷文艺体" value="ZCOOL WenYi" />
          </el-select>
        </el-form-item>
        <el-form-item label="Logo">
          <el-input v-model="brandConfig.logoUrl" placeholder="Logo 图片 URL" style="width:240px" />
        </el-form-item>
        <el-form-item label="水印">
          <el-input v-model="brandConfig.watermarkUrl" placeholder="水印图片 URL" style="width:240px" />
        </el-form-item>
      </el-form>
    </el-card>

    <SearchFilter
      ref="searchRef"
      :filters="filters"
      :custom-filters="filterDefs"
      placeholder="搜索模板名称"
      @search="onSearch"
      @reset="onReset"
    />

    <!-- 模板列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>海报模板列表（{{ pagination.total }}个）</span>
          <el-button size="small" type="primary" @click="showEditDialog()">新建模板</el-button>
        </div>
      </template>

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="name" label="模板名称" width="180" />
        <el-table-column label="场景" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ sceneLabel(row.scene) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="背景图" width="120">
          <template #default="{ row }">
            <el-image
              v-if="row.backgroundImage"
              :src="row.backgroundImage"
              :preview-src-list="[row.backgroundImage]"
              style="width:60px;height:60px;border-radius:4px"
              fit="cover"
            />
            <span v-else style="color:#ccc">无</span>
          </template>
        </el-table-column>
        <el-table-column label="元素" width="80" align="center">
          <template #default="{ row }">{{ row.elements?.length ?? 0 }}个</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.status === 'ACTIVE' ? '启用' : '草稿' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="版本" width="80" align="center">
          <template #default="{ row }">{{ row.versionCount ?? 1 }}</template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="150">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="previewPoster(row)">预览</el-button>
            <el-button size="small" text type="primary" @click="showEditDialog(row)">编辑</el-button>
            <el-button size="small" text type="info" @click="showVersions(row)">版本</el-button>
            <el-popconfirm title="确定删除?" @confirm="deleteTemplate(row.id)">
              <template #reference>
                <el-button size="small" text type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无模板" />
        </template>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" :title="editingId ? '编辑模板' : '新建模板'" width="700px" @close="resetEditForm">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="editForm.name" placeholder="如：课程结课证书" />
        </el-form-item>
        <el-form-item label="适用场景" required>
          <el-select v-model="editForm.scene" placeholder="选择场景" style="width:100%">
            <el-option v-for="s in sceneOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="背景图" required>
          <el-input v-model="editForm.backgroundImage" placeholder="背景图 URL" />
        </el-form-item>
        <el-form-item label="模板元素">
          <div class="elements-editor">
            <div v-for="(el, i) in editForm.elements" :key="i" class="element-row">
              <el-select v-model="el.type" size="small" style="width:100px">
                <el-option label="文字" value="text" />
                <el-option label="图片" value="image" />
                <el-option label="二维码" value="qrcode" />
                <el-option label="头像" value="avatar" />
              </el-select>
              <el-input v-model="el.label" size="small" placeholder="标识" style="width:100px" />
              <el-input-number v-model="el.x" size="small" :min="0" placeholder="X" style="width:80px" />
              <el-input-number v-model="el.y" size="small" :min="0" placeholder="Y" style="width:80px" />
              <el-button size="small" type="danger" circle @click="editForm.elements.splice(i,1)">×</el-button>
            </div>
            <el-button size="small" type="primary" plain @click="editForm.elements.push({ type:'text', label:'', x:0, y:0 })">
              + 添加元素
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="editForm.status" active-value="ACTIVE" inactive-value="DRAFT" active-text="启用" inactive-text="草稿" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 版本历史弹窗 -->
    <el-dialog v-model="versionVisible" title="版本历史" width="560px">
      <el-table :data="versions" border stripe>
        <el-table-column label="版本号" width="80">
          <template #default="{ $index }">v{{ versions.length - $index }}</template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="160">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column prop="updatedBy" label="操作人" width="120" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-popconfirm title="回滚到此版本?" @confirm="rollbackVersion(row.id)">
              <template #reference>
                <el-button size="small" text type="warning">回滚</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="海报预览" width="420px">
      <div v-if="previewUrl" style="text-align:center">
        <el-image :src="previewUrl" style="max-width:375px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15)" />
      </div>
      <div v-else style="text-align:center;padding:40px;color:#909399">预览加载中...</div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { posterApi } from "@/api"
import SearchFilter from "@/components/SearchFilter.vue"
import PageHeader from "@/components/PageHeader.vue"
import { useTable } from "@/composables/useTable"

const brandSaving = ref(false)
const saving = ref(false)
const editVisible = ref(false)
const versionVisible = ref(false)
const previewVisible = ref(false)
const previewUrl = ref("")
const editingId = ref<string | null>(null)
const editingTemplateId = ref<string>("")
// 海报模板元素（可视化坐标元素）
interface PosterElement { type: string; label: string; x: number; y: number }
// 海报模板行：依据表格列与编辑/预览访问字段声明
interface PosterTemplateRow {
  id: string
  name?: string
  scene?: string
  backgroundImage?: string
  elements?: PosterElement[]
  status?: string
  versionCount?: number
  updatedAt?: string
}
// 版本历史行
interface PosterVersionRow { id: string; updatedAt?: string; updatedBy?: string }
const versions = ref<PosterVersionRow[]>([])

const brandConfig = reactive({
  primaryColor: "#C41E1E",
  bgColor: "#F5E6D3",
  fontFamily: "Source Han Serif",
  logoUrl: "",
  watermarkUrl: "",
})

const sceneOptions = [
  { label: "完成课程", value: "course_complete" },
  { label: "完成排盘", value: "paipan_complete" },
  { label: "读完古籍", value: "classic_complete" },
  { label: "加入圈子", value: "circle_join" },
  { label: "购买商品", value: "product_purchase" },
  { label: "获得成就", value: "achievement" },
  { label: "智能体对话", value: "ai_dialogue" },
  { label: "精彩评论", value: "comment_share" },
  { label: "直播分享", value: "live_share" },
  { label: "赛事成绩", value: "competition_result" },
  { label: "邀请好友", value: "invite_friend" },
]

function sceneLabel(v: string): string {
  return sceneOptions.find(s => s.value === v)?.label ?? v
}

const editForm = reactive({
  name: "", scene: "", backgroundImage: "", elements: [] as PosterElement[], status: "DRAFT" as string,
})

function resetEditForm() {
  editingId.value = null
  editForm.name = ""; editForm.scene = ""; editForm.backgroundImage = ""
  editForm.elements = []; editForm.status = "DRAFT"
}

const filterDefs = [
  { key: "scene", label: "场景", type: "select" as const, options: [{ label: "全部", value: "" }, ...sceneOptions] },
  { key: "status", label: "状态", type: "select" as const, options: [
    { label: "全部", value: "" }, { label: "启用", value: "ACTIVE" }, { label: "草稿", value: "DRAFT" },
  ]},
]

const columns: unknown[] = []

const { loading, tableData, pagination, filters, fetchList, handleSearch } = useTable({
  fetchApi: posterApi.listTemplates,
  defaultPageSize: 10,
  // data 为 useTable 透传的后端原始响应（无类型来源），保留 any 作边界
  transformResponse: (data: any) => ({ items: data.list ?? data.data ?? [], total: data.total ?? 0 }),
})

function onSearch(f: Record<string, any>) { Object.assign(filters, f); handleSearch() }
function onReset() { Object.keys(filters).forEach(k => { (filters as any)[k] = undefined }); handleSearch() }
function formatTime(d: string): string { return d ? d.slice(0, 16).replace("T", " ") : "" }

async function fetchBrandConfig() {
  try {
    const res: any = await posterApi.getBrandConfig()
    const d = (res?.data ?? res) ?? {}
    if (d.primaryColor) brandConfig.primaryColor = d.primaryColor
    if (d.bgColor) brandConfig.bgColor = d.bgColor
    if (d.fontFamily) brandConfig.fontFamily = d.fontFamily
    if (d.logoUrl) brandConfig.logoUrl = d.logoUrl
    if (d.watermarkUrl) brandConfig.watermarkUrl = d.watermarkUrl
  } catch { /* */ }
}

async function saveBrand() {
  brandSaving.value = true
  try { await posterApi.updateBrandConfig({ ...brandConfig }); ElMessage.success("品牌配置已保存") }
  catch { /* */ }
  finally { brandSaving.value = false }
}

function showEditDialog(row?: PosterTemplateRow) {
  if (row) {
    editingId.value = row.id
    editForm.name = row.name ?? ""; editForm.scene = row.scene ?? ""
    editForm.backgroundImage = row.backgroundImage ?? ""
    editForm.elements = row.elements ? [...row.elements] : []
    editForm.status = row.status ?? "DRAFT"
  } else {
    resetEditForm()
  }
  editVisible.value = true
}

async function saveTemplate() {
  saving.value = true
  try {
    if (editingId.value) {
      await posterApi.update(editingId.value, { ...editForm })
    } else {
      await posterApi.create({ ...editForm })
    }
    ElMessage.success("保存成功"); editVisible.value = false; fetchList()
  } catch { /* */ }
  finally { saving.value = false }
}

async function deleteTemplate(id: string) {
  try { await posterApi.delete(id); ElMessage.success("删除成功"); fetchList() } catch { /* */ }
}

async function previewPoster(row: PosterTemplateRow) {
  previewVisible.value = true; previewUrl.value = ""
  try {
    const res: any = await posterApi.preview(row.id)
    previewUrl.value = (res?.data ?? res)?.previewUrl ?? ""
  } catch { /* */ }
}

async function showVersions(row: PosterTemplateRow) {
  editingTemplateId.value = row.id
  try {
    const res: any = await posterApi.listVersions(row.id)
    versions.value = (res?.data ?? res)?.list ?? (res?.data ?? res)?.versions ?? []
    versionVisible.value = true
  } catch { /* */ }
}

async function rollbackVersion(versionId: string) {
  try {
    await posterApi.rollbackVersion(editingTemplateId.value, versionId)
    ElMessage.success("回滚成功"); versionVisible.value = false; fetchList()
  } catch { /* */ }
}

onMounted(() => { fetchBrandConfig() })
</script>

<style scoped>
.page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.elements-editor { width: 100%; }
.element-row { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; }
</style>
