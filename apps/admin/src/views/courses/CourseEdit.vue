<template>
  <div class="course-edit">
    <el-page-header
      title="返回"
      style="margin-bottom:16px"
      @back="router.push('/courses')"
    >
      <template #content>
        {{ isEdit ? '编辑课程' : '新建课程' }}
      </template>
    </el-page-header>

    <div class="edit-body">
      <!-- 主编辑区 -->
      <div class="edit-main">
        <el-card>
          <el-form
            :model="form"
            label-width="80px"
          >
            <el-form-item
              label="标题"
              required
            >
              <el-input
                v-model="form.title"
                placeholder="课程标题"
                size="large"
              />
            </el-form-item>
            <el-form-item label="简介">
              <el-input
                v-model="form.intro"
                type="textarea"
                :rows="3"
                placeholder="课程简介"
              />
            </el-form-item>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="类型">
                  <el-select
                    v-model="form.type"
                    style="width:100%"
                  >
                    <el-option
                      label="视频"
                      value="VIDEO"
                    />
                    <el-option
                      label="音频"
                      value="AUDIO"
                    />
                    <el-option
                      label="文本"
                      value="TEXT"
                    />
                    <el-option
                      label="电子书"
                      value="EBOOK"
                    />
                    <el-option
                      label="组合"
                      value="COMBO"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="价格">
                  <el-input-number
                    v-model="form.price"
                    :min="0"
                    :precision="2"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="原价">
                  <el-input-number
                    v-model="form.originalPrice"
                    :min="0"
                    :precision="2"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item>
              <el-button
                type="primary"
                :loading="saving"
                @click="save"
              >
                保存课程
              </el-button>
              <el-button
                v-if="isEdit"
                type="danger"
                @click="handleDelete"
              >
                删除课程
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 章节管理（仅编辑模式） -->
        <el-card
          v-if="isEdit"
          style="margin-top:16px"
        >
          <template #header>
            <div class="section-header">
              <span>章节管理 ({{ chapters.length }})</span>
              <el-button
                type="primary"
                size="small"
                @click="openChapterDialog()"
              >
                添加章节
              </el-button>
            </div>
          </template>
          <el-table
            :data="chapters"
            stripe
          >
            <el-table-column
              label="排序"
              width="60"
              prop="sortOrder"
            />
            <el-table-column
              prop="title"
              label="标题"
              min-width="200"
            />
            <el-table-column
              label="类型"
              width="80"
            >
              <template #default="{ row }">
                {{ row.mediaUrl ? '视频' : row.content ? '文本' : '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="时长"
              width="80"
            >
              <template #default="{ row }">
                {{ row.duration ? row.duration + '分' : '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="试看"
              width="70"
            >
              <template #default="{ row }">
                <el-tag
                  v-if="row.freeTrial"
                  type="success"
                  size="small"
                >
                  免费
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="150"
            >
              <template #default="{ row }">
                <el-button
                  size="small"
                  @click="openChapterDialog(row)"
                >
                  编辑
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="deleteChapter(row.id)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <!-- 右侧面板 -->
      <div
        v-if="isEdit"
        class="edit-sidebar"
      >
        <div class="sidebar-section">
          <h4>封面图片</h4>
          <div class="cover-upload">
            <div
              v-if="form.cover"
              class="cover-preview"
            >
              <img
                :src="form.cover"
                alt="封面"
              >
              <el-button
                size="small"
                type="danger"
                class="cover-remove"
                @click="form.cover = ''"
              >
                移除
              </el-button>
            </div>
            <div
              v-else
              class="cover-placeholder"
            >
              <span>暂无封面</span>
            </div>
            <div class="cover-input-row">
              <el-input
                v-model="coverUrl"
                placeholder="输入图片URL"
                size="small"
              />
              <el-button
                size="small"
                @click="form.cover = coverUrl"
              >
                设置
              </el-button>
            </div>
            <el-upload
              :show-file-list="false"
              :http-request="handleCoverUpload"
              accept="image/*"
              style="margin-top:8px"
            >
              <el-button
                size="small"
                type="primary"
                :loading="uploading"
              >
                本地上传
              </el-button>
            </el-upload>
          </div>
        </div>
      </div>
    </div>

    <!-- 章节编辑弹窗 -->
    <el-dialog
      v-model="chapterDialog"
      :title="editingChapter ? '编辑章节' : '添加章节'"
      width="700px"
      top="5vh"
    >
      <el-form
        :model="chapterForm"
        label-width="80px"
      >
        <el-form-item
          label="标题"
          required
        >
          <el-input
            v-model="chapterForm.title"
            placeholder="章节标题"
          />
        </el-form-item>
        <el-form-item label="媒体URL">
          <el-input
            v-model="chapterForm.mediaUrl"
            placeholder="视频/音频URL"
          />
        </el-form-item>
        <el-form-item label="正文">
          <div
            ref="chapterEditorEl"
            class="chapter-editor-box"
          />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="时长(分)">
              <el-input-number
                v-model="chapterForm.duration"
                :min="0"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序">
              <el-input-number
                v-model="chapterForm.sortOrder"
                :min="0"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="免费试看">
              <el-switch v-model="chapterForm.freeTrial" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="chapterDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="saveChapter"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { courseApi, uploadApi } from '@/api'

const route = useRoute()
const router = useRouter()
const isEdit = ref(!!route.params.id)
const courseId = route.params.id as string

const form = reactive({
  title: '',
  cover: '',
  intro: '',
  type: 'VIDEO' as string,
  price: 0,
  originalPrice: undefined as number | undefined,
})

const chapters = ref<any[]>([])
const saving = ref(false)
const uploading = ref(false)
const coverUrl = ref('')

const chapterForm = reactive({
  title: '',
  content: '',
  mediaUrl: '',
  duration: undefined as number | undefined,
  freeTrial: false,
  sortOrder: 0,
})
const chapterDialog = ref(false)
const editingChapter = ref<any>(null)
const chapterEditorEl = ref<HTMLElement | null>(null)
let chapterQuill: any = null

onMounted(async () => {
  if (isEdit.value) {
    const { data } = await courseApi.detail(courseId)
    Object.assign(form, {
      title: data.title,
      cover: data.cover || '',
      intro: data.intro || '',
      type: data.type,
      price: Number(data.price) || 0,
      originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
    })
    await loadChapters()
  }
})

async function loadChapters() {
  const { data } = await courseApi.getChapters(courseId)
  chapters.value = data
}

async function save() {
  saving.value = true
  try {
    if (isEdit.value) {
      await courseApi.update(courseId, form)
    } else {
      const { data } = await courseApi.create(form)
      router.replace(`/courses/${data.id}/edit`)
      isEdit.value = true
    }
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

async function handleCoverUpload(options: any) {
  uploading.value = true
  try {
    const { data } = await uploadApi.image(options.file)
    form.cover = data.url
    coverUrl.value = data.url
    ElMessage.success('封面上传成功')
  } catch (e: any) {
  } finally {
    uploading.value = false
  }
}

function openChapterDialog(ch?: any) {
  if (ch) {
    editingChapter.value = ch
    Object.assign(chapterForm, { title: ch.title, content: ch.content || '', mediaUrl: ch.mediaUrl || '', duration: ch.duration, freeTrial: ch.freeTrial || false, sortOrder: ch.sortOrder || 0 })
  } else {
    editingChapter.value = null
    Object.assign(chapterForm, { title: '', content: '', mediaUrl: '', duration: undefined, freeTrial: false, sortOrder: chapters.value.length + 1 })
  }
  chapterDialog.value = true
  nextTick(() => initChapterEditor())
}

async function saveChapter() {
  if (!isEdit.value) {
    await save()
  }
  // 同步 editor 内容到表单
  if (chapterQuill) {
    chapterForm.content = chapterQuill.root.innerHTML
  }
  const payload = { ...chapterForm }
  if (editingChapter.value) {
    await courseApi.updateChapter(courseId, editingChapter.value.id, payload)
  } else {
    await courseApi.addChapter(courseId, payload)
  }
  chapterDialog.value = false
  ElMessage.success('章节已保存')
  await loadChapters()
}

async function deleteChapter(chapterId: string) {
  await courseApi.deleteChapter(courseId, chapterId)
  ElMessage.success('已删除')
  await loadChapters()
}

async function handleDelete() {
  await courseApi.remove(courseId)
  ElMessage.success('已删除课程')
  router.push('/courses')
}

function initChapterEditor() {
  if (!chapterEditorEl.value) return
  if (chapterQuill) {
    chapterQuill.root.innerHTML = chapterForm.content || ''
    return
  }
  const Q = (window as any).Quill
  if (!Q) {
    // fallback: 无 Quill 时隐藏 editor
    return
  }
  chapterQuill = new Q(chapterEditorEl.value, {
    theme: 'snow',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ header: 1 }, { header: 2 }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link'],
        ['clean'],
      ],
    },
    placeholder: '章节正文...',
  })
  chapterQuill.root.innerHTML = chapterForm.content || ''
  chapterQuill.on('text-change', () => {
    chapterForm.content = chapterQuill.root.innerHTML
  })
}
</script>

<style scoped>
.course-edit { padding: 16px; }

.edit-body { display: flex; gap: 16px; }
.edit-main { flex: 1; min-width: 0; }
.edit-sidebar { width: 260px; flex-shrink: 0; }

.section-header { display: flex; justify-content: space-between; align-items: center; }
.sidebar-section { margin-bottom: 16px; }
.sidebar-section h4 { margin: 0 0 10px; font-size: 14px; color: #8b4513; border-bottom: 1px solid #f0e6d3; padding-bottom: 6px; }

.cover-preview { position: relative; width: 100%; aspect-ratio: 16/10; border-radius: 4px; overflow: hidden; background: #f5f5f5; margin-bottom: 8px; }
.cover-preview img { width: 100%; height: 100%; object-fit: cover; }
.cover-remove { position: absolute; top: 4px; right: 4px; }
.cover-placeholder { width: 100%; aspect-ratio: 16/10; border: 2px dashed #E8E0D5; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 13px; margin-bottom: 8px; }
.cover-input-row { display: flex; gap: 4px; }

.chapter-editor-box { min-height: 200px; max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; }

@media (max-width: 900px) {
  .edit-body { flex-direction: column; }
  .edit-sidebar { width: 100%; }
}
</style>
