<template>
  <div class="content-edit">
    <div class="edit-header">
      <h3>{{ isEdit ? '编辑内容' : '新建内容' }}</h3>
      <div class="header-actions">
        <!-- 注意：不能写 @click="handleSave"，Vue 会把 MouseEvent 作为 status 参数传入导致提交 400 -->
        <el-button
          type="primary"
          :loading="saving"
          @click="() => handleSave()"
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
            <RichEditor
              v-model="form.body"
              placeholder="请输入正文..."
              min-height="380px"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- 右侧：属性面板 -->
      <div class="edit-sidebar">
        <div class="sidebar-section">
          <h4>封面图片</h4>
          <CosImageUpload v-model="form.cover" />
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
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { contentApi } from '@/api'
import { ElMessage } from 'element-plus'
import CosImageUpload from '@/components/upload/CosImageUpload.vue'
import RichEditor from '@/components/editor/RichEditor.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string | undefined
const isEdit = !!id
const saving = ref(false)

const form = reactive({
  title: '',
  type: 'ARTICLE' as string,
  author: '',
  dynasty: '',
  excerpt: '',
  body: '',
  cover: '',
  tags: [] as string[],
  // 旧CMS双入口收敛观察期：新建默认存草稿，不直接发布（发布需在状态面板显式选择）
  status: 'DRAFT' as string,
})

const tagInput = ref('')

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
})

function addTag() {
  const t = tagInput.value.trim()
  if (!t) return
  if (!form.tags.includes(t)) {
    form.tags.push(t)
  }
  tagInput.value = ''
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
