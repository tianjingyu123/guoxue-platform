<template>
  <div class="content-edit">
    <div class="edit-header">
      <h3>{{ isEdit ? '编辑内容' : '新建内容' }}</h3>
      <div class="header-actions">
        <el-button
          type="primary"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </el-button>
        <el-button
          :loading="saving"
          @click="handleSave('DRAFT')"
        >
          存草稿
        </el-button>
        <el-button @click="$router.back()">
          取消
        </el-button>
      </div>
    </div>

    <div class="edit-body">
      <!-- 左侧：编辑区 -->
      <div class="edit-main">
        <el-form
          :model="form"
          label-width="60px"
        >
          <el-form-item label="标题">
            <el-input
              v-model="form.title"
              placeholder="请输入标题"
              size="large"
            />
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="类型">
                <el-select
                  v-model="form.type"
                  size="large"
                  style="width:100%"
                >
                  <el-option
                    label="文章"
                    value="ARTICLE"
                  />
                  <el-option
                    label="诗词"
                    value="POEM"
                  />
                  <el-option
                    label="经典"
                    value="CLASSIC"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="作者">
                <el-input
                  v-model="form.author"
                  placeholder="作者"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="朝代">
                <el-input
                  v-model="form.dynasty"
                  placeholder="如 唐、宋"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="摘要">
            <el-input
              v-model="form.excerpt"
              type="textarea"
              :rows="2"
              placeholder="简要描述"
            />
          </el-form-item>

          <el-form-item label="正文">
            <div class="editor-wrapper">
              <div
                ref="editorEl"
                class="ql-editor-container"
              />
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- 右侧：属性面板 -->
      <div class="edit-sidebar">
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

        <div class="sidebar-section">
          <h4>标签</h4>
          <div class="tag-input-row">
            <el-input
              v-model="tagInput"
              placeholder="输入标签"
              size="small"
              @keyup.enter="addTag"
            />
            <el-button
              size="small"
              @click="addTag"
            >
              添加
            </el-button>
          </div>
          <div class="tag-list">
            <el-tag
              v-for="t in form.tags"
              :key="t"
              closable
              size="small"
              @close="form.tags = form.tags.filter(x => x !== t)"
            >
              {{ t }}
            </el-tag>
            <span
              v-if="!form.tags?.length"
              class="no-tags"
            >暂无标签</span>
          </div>
        </div>

        <div class="sidebar-section">
          <h4>状态</h4>
          <el-radio-group
            v-model="form.status"
            size="small"
          >
            <el-radio-button value="PUBLISHED">
              发布
            </el-radio-button>
            <el-radio-button value="DRAFT">
              草稿
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { contentApi, uploadApi } from '@/api'
import { ElMessage } from 'element-plus'
import type { UploadRequestOptions } from 'element-plus'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string | undefined
const isEdit = !!id
const saving = ref(false)
const uploading = ref(false)

const form = reactive({
  title: '',
  type: 'ARTICLE' as string,
  author: '',
  dynasty: '',
  excerpt: '',
  body: '',
  cover: '',
  tags: [] as string[],
  status: 'PUBLISHED' as string,
})

const coverUrl = ref('')
const tagInput = ref('')
const editorEl = ref<HTMLElement | null>(null)
// Quill 编辑器实例：经 CDN 动态加载，无类型声明，保留 any
let quill: any = null

onMounted(async () => {
  if (isEdit && id) {
    try {
      const { data } = await contentApi.detail(id)
      Object.assign(form, {
      title: data.title,
      type: data.type,
      author: data.author || '',
      dynasty: data.dynasty || '',
      excerpt: data.excerpt || '',
      body: data.body || '',
      cover: data.cover || '',
      tags: data.tags || [],
      status: data.status || 'PUBLISHED',
      })
    } catch {
      ElMessage.error('内容加载失败，请返回重试')
    }
  }

  // 初始化 Quill 编辑器
  await nextTick()
  initQuill()
})

function initQuill() {
  if (!editorEl.value) return
  // 动态加载 Quill
  const script = document.createElement('script')
  script.src = 'https://cdn.quilljs.com/1.3.7/quill.min.js'
  script.onload = () => {
    // window.Quill 由 CDN 脚本注入，无类型声明，保留 any
    const Q = (window as any).Quill
    if (!Q) return
    quill = new Q(editorEl.value, {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ header: 1 }, { header: 2 }],
          [{ align: [] }],
          ['blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          [{ color: [] }, { background: [] }],
          ['link', 'image'],
          ['clean'],
        ],
      },
      placeholder: '请输入正文...',
    })
    if (form.body) {
      quill.root.innerHTML = form.body
    }
    quill.on('text-change', () => {
      form.body = quill.root.innerHTML
    })
  }
  document.head.appendChild(script)
}

function addTag() {
  const t = tagInput.value.trim()
  if (!t) return
  if (!form.tags.includes(t)) {
    form.tags.push(t)
  }
  tagInput.value = ''
}

async function handleCoverUpload(options: UploadRequestOptions) {
  uploading.value = true
  try {
    const { data } = await uploadApi.image(options.file)
    form.cover = data.url
    coverUrl.value = data.url
    ElMessage.success('封面上传成功')
  } catch {
  } finally {
    uploading.value = false
  }
}

async function handleSave(status?: string) {
  if (!form.title.trim()) {
    ElMessage.warning('请输入标题')
    return
  }
  if (!form.body.trim()) {
    ElMessage.warning('请输入正文')
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form,
      type: form.type,
      tags: form.tags || [],
    }
    if (status) payload.status = status

    if (isEdit && id) {
      await contentApi.update(id, payload)
    } else {
      await contentApi.create(payload)
    }
    ElMessage.success('保存成功')
    router.push('/contents')
  } catch {
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.content-edit { min-height: 100vh; background: #f5f0e6; }

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
}
.edit-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.header-actions { display: flex; gap: 8px; }

.edit-body {
  display: flex;
  gap: 0;
  padding: 16px 24px;
  max-width: 1400px;
}

.edit-main {
  flex: 1;
  min-width: 0;
  background: var(--color-bg-card);
  padding: 20px;
  border-radius: 8px 0 0 8px;
  border: 1px solid var(--color-border);
  border-right: none;
}

.edit-sidebar {
  width: 280px;
  flex-shrink: 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 0 8px 8px 0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-section h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--color-text-title);
  border-bottom: 1px solid #f0e6d3;
  padding-bottom: 6px;
}

/* 编辑器 */
.editor-wrapper { border: 1px solid #ddd; border-radius: 4px; min-height: 400px; }
.ql-editor-container { min-height: 380px; }
:deep(.ql-toolbar) { border-radius: 4px 4px 0 0; }

/* 封面 */
.cover-upload { display: flex; flex-direction: column; gap: 8px; }
.cover-preview { position: relative; width: 100%; aspect-ratio: 16/10; border-radius: 4px; overflow: hidden; background: var(--color-bg-page); }
.cover-preview img { width: 100%; height: 100%; object-fit: cover; }
.cover-remove { position: absolute; top: 4px; right: 4px; }
.cover-placeholder { width: 100%; aspect-ratio: 16/10; border: 2px dashed var(--color-border); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--color-text-placeholder); font-size: 13px; }
.cover-input-row { display: flex; gap: 4px; }

/* 标签 */
.tag-input-row { display: flex; gap: 4px; margin-bottom: 8px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 4px; min-height: 24px; }
.no-tags { color: var(--color-text-placeholder); font-size: 12px; }

@media (max-width: 900px) {
  .edit-body { flex-direction: column; }
  .edit-sidebar { width: 100%; border-radius: 0 0 8px 8px; border-top: none; border-left: 1px solid var(--color-border); }
  .edit-main { border-radius: 8px 8px 0 0; border-right: 1px solid var(--color-border); }
}
</style>
