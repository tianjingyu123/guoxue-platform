<template>
  <div class="page">
    <PageHeader title="电子书管理" />
    <div class="toolbar">
      <div class="toolbar-right">
        <el-select
          v-model="filterStatus"
          placeholder="状态"
          clearable
          style="width:120px"
          @change="fetchList"
        >
          <el-option
            label="草稿"
            value="DRAFT"
          />
          <el-option
            label="已发布"
            value="PUBLISHED"
          />
          <el-option
            label="已禁用"
            value="DISABLED"
          />
        </el-select>
        <el-button
          type="primary"
          @click="openCreate"
        >
          新建电子书
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      type="error"
      title="电子书列表加载失败"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        type="primary"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无电子书" />
      </template>
      <el-table-column
        prop="title"
        label="书名"
        min-width="160"
      />
      <el-table-column
        prop="author"
        label="作者"
        width="100"
      />
      <el-table-column
        label="分类"
        width="100"
      >
        <template #default="{ row }">
          {{ row.category?.name || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="价格"
        width="80"
      >
        <template #default="{ row }">
          ¥{{ Number(row.price).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="totalChapters"
        label="章节数"
        width="80"
      />
      <el-table-column
        prop="purchaseCount"
        label="购买数"
        width="80"
      />
      <el-table-column
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'PUBLISHED' ? 'success' : row.status === 'DISABLED' ? 'danger' : 'info'"
            size="small"
          >
            {{ row.status === 'PUBLISHED' ? '已发布' : row.status === 'DISABLED' ? '已禁用' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="160"
      >
        <template #default="{ row }">
          {{ fmt(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="200"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            text
            type="primary"
            @click="openChapters(row)"
          >
            章节
          </el-button>
          <el-button
            size="small"
            text
            type="primary"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            text
            type="danger"
            @click="del(row.id)"
          >
            删除
          </el-button>
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

    <!-- 电子书对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑电子书' : '新建电子书'"
      width="600px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item
          label="书名"
          required
        >
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="form.author" />
        </el-form-item>
        <el-form-item label="封面URL">
          <el-input v-model="form.cover" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="form.categoryId"
            clearable
            style="width:100%"
          >
            <el-option
              v-for="c in categories"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number
            v-model="form.price"
            :min="0"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="原价">
          <el-input-number
            v-model="form.originalPrice"
            :min="0"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="文件类型">
          <el-select
            v-model="form.fileType"
            style="width:100%"
          >
            <el-option
              label="PDF"
              value="PDF"
            /><el-option
              label="EPUB"
              value="EPUB"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="文件URL">
          <el-input v-model="form.fileUrl" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="form.status"
            style="width:100%"
          >
            <el-option
              label="草稿"
              value="DRAFT"
            /><el-option
              label="已发布"
              value="PUBLISHED"
            /><el-option
              label="已禁用"
              value="DISABLED"
            />
          </el-select>
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
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 章节管理对话框 -->
    <el-dialog
      v-model="chapterDialog"
      :title="`章节管理 — ${chapterBook?.title || ''}`"
      width="700px"
    >
      <div style="margin-bottom:12px">
        <el-button
          type="primary"
          size="small"
          @click="openChapterCreate"
        >
          添加章节
        </el-button>
      </div>
      <el-table
        :data="chapterList"
        stripe
        max-height="400"
      >
        <el-table-column
          prop="title"
          label="章节标题"
          min-width="150"
        />
        <el-table-column
          label="页码"
          width="120"
        >
          <template #default="{ row }">
            {{ row.pageStart }} — {{ row.pageEnd }}
          </template>
        </el-table-column>
        <el-table-column
          prop="sortOrder"
          label="排序"
          width="70"
        />
        <el-table-column
          label="试读"
          width="70"
        >
          <template #default="{ row }">
            {{ row.freeTrial ? '是' : '否' }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="120"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              text
              type="primary"
              @click="openChapterEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              text
              type="danger"
              @click="delChapter(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="chapterDialog = false">
          关闭
        </el-button>
      </template>
    </el-dialog>

    <!-- 章节表单对话框 -->
    <el-dialog
      v-model="chapterFormDialog"
      :title="editingChapterId ? '编辑章节' : '新建章节'"
      width="500px"
    >
      <el-form
        :model="chapterForm"
        label-width="80px"
      >
        <el-form-item
          label="标题"
          required
        >
          <el-input v-model="chapterForm.title" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input
            v-model="chapterForm.content"
            type="textarea"
            :rows="5"
          />
        </el-form-item>
        <el-form-item label="起始页">
          <el-input-number
            v-model="chapterForm.pageStart"
            :min="0"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="结束页">
          <el-input-number
            v-model="chapterForm.pageEnd"
            :min="0"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="chapterForm.sortOrder"
            :min="0"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="免费试读">
          <el-switch v-model="chapterForm.freeTrial" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="chapterFormDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveChapter"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from "@/components/PageHeader.vue";
import { ebookApi } from '@/api'

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const filterStatus = ref('')
const categories = ref<any[]>([])

const dialogVisible = ref(false)
const editingId = ref('')
const form = ref({ title: '', author: '', cover: '', categoryId: '', price: 0, originalPrice: undefined as number | undefined, fileType: 'PDF', fileUrl: '', description: '', status: 'DRAFT' })

const chapterDialog = ref(false)
const chapterBook = ref<any>(null)
const chapterList = ref<any[]>([])
const chapterFormDialog = ref(false)
const editingChapterId = ref('')
const chapterForm = ref({ title: '', content: '', pageStart: 0, pageEnd: 0, sortOrder: 0, freeTrial: false })

function fmt(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-' }

onMounted(() => { fetchList(); fetchCategories() })

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: any = { page: page.value, pageSize: 20 }
    if (filterStatus.value) params.status = filterStatus.value
    const res = await ebookApi.listBooks(params)
    const data = res.data as any
    list.value = data.list || data.items || []
    total.value = data.total || 0
  } catch {
    error.value = true
    list.value = []
    total.value = 0
  } finally { loading.value = false }
}

async function fetchCategories() {
  try { const res = await ebookApi.listCategories(); categories.value = (res.data as any) || [] } catch {}
}

function resetForm() { form.value = { title: '', author: '', cover: '', categoryId: '', price: 0, originalPrice: undefined, fileType: 'PDF', fileUrl: '', description: '', status: 'DRAFT' }; editingId.value = '' }
function openCreate() { resetForm(); dialogVisible.value = true }
function openEdit(row: any) { resetForm(); editingId.value = row.id; Object.assign(form.value, { title: row.title, author: row.author, cover: row.cover, categoryId: row.categoryId, price: Number(row.price), originalPrice: row.originalPrice ? Number(row.originalPrice) : undefined, fileType: row.fileType, fileUrl: row.fileUrl, description: row.description, status: row.status }); dialogVisible.value = true }

async function save() {
  if (!form.value.title) { ElMessage.warning('请输入书名'); return }
  saving.value = true
  try {
    if (editingId.value) { await ebookApi.update(editingId.value, form.value); ElMessage.success('已更新') }
    else { await ebookApi.create(form.value); ElMessage.success('已创建') }
    dialogVisible.value = false; fetchList()
  } catch (e: any) { }
  finally { saving.value = false }
}

async function del(id: string) {
  try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await ebookApi.delete(id); ElMessage.success('已删除'); fetchList() } catch {}
}

// 章节
async function openChapters(row: any) { chapterBook.value = row; await fetchChapters(row.id); chapterDialog.value = true }
async function fetchChapters(ebookId: string) {
  try { const res = await ebookApi.detail(ebookId); chapterList.value = ((res.data as any)?.chapters) || [] } catch {}
}
function openChapterCreate() { chapterForm.value = { title: '', content: '', pageStart: 0, pageEnd: 0, sortOrder: chapterList.value.length, freeTrial: false }; editingChapterId.value = ''; chapterFormDialog.value = true }
function openChapterEdit(row: any) { editingChapterId.value = row.id; Object.assign(chapterForm.value, row); chapterFormDialog.value = true }

async function saveChapter() {
  if (!chapterForm.value.title) { ElMessage.warning('请输入章节标题'); return }
  saving.value = true
  try {
    if (editingChapterId.value) { await ebookApi.updateChapter(editingChapterId.value, chapterForm.value); ElMessage.success('已更新') }
    else { await ebookApi.createChapter(chapterBook.value.id, chapterForm.value); ElMessage.success('已创建') }
    chapterFormDialog.value = false; fetchChapters(chapterBook.value.id)
  } catch (e: any) { }
  finally { saving.value = false }
}

async function delChapter(id: string) {
  try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await ebookApi.deleteChapter(id); ElMessage.success('已删除'); fetchChapters(chapterBook.value.id) } catch {}
}
</script>

<style scoped>
.page { padding: 0; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-lg); }
.toolbar-right { display: flex; align-items: center; gap: var(--spacing-md); }
</style>
