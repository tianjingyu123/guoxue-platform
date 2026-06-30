<template>
  <div class="rag-template">
    <div class="page-header">
      <h2>📝 RAG Prompt 模板管理</h2>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新建模板
      </el-button>
    </div>

    <p class="desc">
      Prompt 模板用于 RAG 检索增强生成场景，支持变量替换（&#123;&#123;variable&#125;&#125;）。场景包括圈主助理、智能客服、智能搜索、课程助教等。
    </p>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select
        v-model="filterScene"
        placeholder="场景筛选"
        clearable
        style="width:160px"
        @change="fetchList"
      >
        <el-option
          v-for="s in scenes"
          :key="s.value"
          :label="s.label"
          :value="s.value"
        />
      </el-select>
      <el-select
        v-model="filterStatus"
        placeholder="状态筛选"
        clearable
        style="width:120px;margin-left:8px"
        @change="fetchList"
      >
        <el-option
          label="启用"
          value="ACTIVE"
        />
        <el-option
          label="停用"
          value="INACTIVE"
        />
      </el-select>
      <el-button
        style="margin-left:8px"
        @click="fetchList"
      >
        刷新
      </el-button>
    </div>

    <!-- 模板列表 -->
    <el-card style="margin-top:12px">
      <el-table
        v-loading="loading"
        :data="templates"
        stripe
      >
        <el-table-column
          prop="templateName"
          label="模板名称"
          min-width="150"
        />
        <el-table-column
          prop="scene"
          label="场景"
          width="120"
        >
          <template #default="{ row }">
            {{ sceneLabel(row.scene) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="systemPrompt"
          label="系统提示词"
          min-width="250"
          show-overflow-tooltip
        />
        <el-table-column
          prop="variables"
          label="变量"
          width="180"
        >
          <template #default="{ row }">
            <el-tag
              v-for="v in (row.variables || [])"
              :key="v"
              size="small"
              style="margin:2px"
            >
              {{ v }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="状态"
          width="80"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'ACTIVE' ? 'success' : 'info'"
              size="small"
            >
              {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="创建时间"
          width="160"
        >
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="220"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              @click="openPreview(row)"
            >
              预览
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="del(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!loading && !loadErr && templates.length === 0"
        description="暂无模板"
      />
      <div
        v-if="!loading && loadErr"
        class="load-error"
      >
        <el-empty description="加载失败，请重试">
          <el-button
            type="primary"
            @click="fetchList"
          >
            重新加载
          </el-button>
        </el-empty>
      </div>
    </el-card>

    <!-- 编辑/创建对话框 -->
    <el-dialog
      v-model="showEdit"
      :title="editingId ? '编辑模板' : '新建模板'"
      width="640px"
      destroy-on-close
    >
      <el-form
        :model="editForm"
        label-width="100px"
      >
        <el-form-item
          label="模板名称"
          required
        >
          <el-input
            v-model="editForm.templateName"
            placeholder="如：圈主助理问答模板"
          />
        </el-form-item>
        <el-form-item
          label="场景"
          required
        >
          <el-select
            v-model="editForm.scene"
            style="width:100%"
          >
            <el-option
              v-for="s in scenes"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="系统提示词"
          required
        >
          <el-input
            v-model="editForm.systemPrompt"
            type="textarea"
            :rows="4"
            placeholder="系统级提示词，定义AI角色和行为"
          />
        </el-form-item>
        <el-form-item
          label="用户提示词模板"
          required
        >
          <el-input
            v-model="editForm.userPromptTemplate"
            type="textarea"
            :rows="4"
            placeholder="支持 &#123;&#123;variable&#125;&#125; 变量替换，如：请根据&#123;&#123;knowledge&#125;&#125;回答用户问题：&#123;&#123;question&#125;&#125;"
          />
        </el-form-item>
        <el-form-item label="变量列表">
          <el-select
            v-model="editForm.variables"
            multiple
            allow-create
            filterable
            placeholder="输入变量名后回车添加"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="editForm.status"
            active-value="ACTIVE"
            inactive-value="INACTIVE"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doSave"
        >
          {{ editingId ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 预览对话框 -->
    <el-dialog
      v-model="showPreview"
      title="模板预览与测试"
      width="640px"
    >
      <template v-if="previewTpl">
        <el-descriptions
          :column="1"
          border
          size="small"
        >
          <el-descriptions-item label="模板">
            {{ previewTpl.templateName }}
          </el-descriptions-item>
          <el-descriptions-item label="场景">
            {{ sceneLabel(previewTpl.scene) }}
          </el-descriptions-item>
          <el-descriptions-item label="系统提示词">
            <pre>{{ previewTpl.systemPrompt }}</pre>
          </el-descriptions-item>
          <el-descriptions-item label="用户提示词">
            <pre>{{ previewTpl.userPromptTemplate }}</pre>
          </el-descriptions-item>
        </el-descriptions>
        <el-divider>变量填充测试</el-divider>
        <el-form label-width="80px">
          <el-form-item
            v-for="v in (previewTpl.variables || [])"
            :key="v"
            :label="v"
          >
            <el-input
              v-model="previewVars[v]"
              :placeholder="`输入 ${v} 的值`"
            />
          </el-form-item>
        </el-form>
        <el-button
          type="primary"
          :loading="previewing"
          @click="doPreview"
        >
          生成预览
        </el-button>
        <div
          v-if="previewResult"
          class="preview-result"
        >
          <el-divider />
          <h4>预览结果：</h4>
          <div class="preview-content">
            {{ previewResult }}
          </div>
        </div>
      </template>
      <template #footer>
        <el-button @click="showPreview = false">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { ragTemplateApi } from "@/api";

const scenes = [
  { label: "圈主助理", value: "circle_assistant" },
  { label: "智能客服", value: "customer_service" },
  { label: "智能搜索", value: "smart_search" },
  { label: "课程助教", value: "course_assistant" },
  { label: "内容生成", value: "content_generation" },
  { label: "运营评论", value: "robot_comment" },
];

function sceneLabel(s: string) {
  return scenes.find(x => x.value === s)?.label || s;
}

// RAG 模板行/详情结构（列表行字段后端必返，故非可选）
interface RagTemplate {
  id: string;
  templateName: string;
  scene: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  status: string;
  createdAt?: string;
}

const loading = ref(false);
const loadErr = ref(false);
const templates = ref<RagTemplate[]>([]);
const filterScene = ref("");
const filterStatus = ref("");

const showEdit = ref(false);
const showPreview = ref(false);
const editingId = ref("");
const saving = ref(false);

const editForm = reactive({
  scene: "circle_assistant", templateName: "", systemPrompt: "",
  userPromptTemplate: "", variables: [] as string[], status: "ACTIVE",
});

const previewTpl = ref<RagTemplate | null>(null);
const previewVars = ref<Record<string, string>>({});
const previewResult = ref("");
const previewing = ref(false);

function formatTime(t: string) {
  return t ? new Date(t).toLocaleString("zh-CN") : "-";
}

async function fetchList() {
  loading.value = true;
  loadErr.value = false;
  try {
    const params: Record<string, string> = {};
    if (filterScene.value) params.scene = filterScene.value;
    if (filterStatus.value) params.status = filterStatus.value;
    const { data } = await ragTemplateApi.list(params);
    templates.value = (data as RagTemplate[]) || [];
  } catch {
    loadErr.value = true;
    templates.value = [];
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = "";
  editForm.scene = "circle_assistant";
  editForm.templateName = "";
  editForm.systemPrompt = "";
  editForm.userPromptTemplate = "";
  editForm.variables = [];
  editForm.status = "ACTIVE";
  showEdit.value = true;
}

function openEdit(row: RagTemplate) {
  editingId.value = row.id;
  editForm.scene = row.scene;
  editForm.templateName = row.templateName;
  editForm.systemPrompt = row.systemPrompt;
  editForm.userPromptTemplate = row.userPromptTemplate;
  editForm.variables = [...(row.variables || [])];
  editForm.status = row.status;
  showEdit.value = true;
}

async function doSave() {
  saving.value = true;
  try {
    if (editingId.value) {
      await ragTemplateApi.update(editingId.value, { ...editForm });
      ElMessage.success("模板已更新");
    } else {
      await ragTemplateApi.create({ ...editForm });
      ElMessage.success("模板已创建");
    }
    showEdit.value = false;
    await fetchList();
  } catch { /* ignore */ } finally {
    saving.value = false;
  }
}

async function del(id: string) {
  try {
    await ElMessageBox.confirm("删除后不可恢复，确认删除？", "确认删除", { type: "warning" });
    await ragTemplateApi.delete(id);
    ElMessage.success("已删除");
    await fetchList();
  } catch { /* cancel */ }
}

function openPreview(row: RagTemplate) {
  previewTpl.value = row;
  previewVars.value = {};
  previewResult.value = "";
  showPreview.value = true;
}

async function doPreview() {
  previewing.value = true;
  try {
    const { data } = await ragTemplateApi.preview(previewTpl.value!.id, { variables: previewVars.value });
    const d = data as { result?: string; content?: string };
    previewResult.value = d?.result || d?.content || JSON.stringify(data);
  } catch { /* ignore */ } finally {
    previewing.value = false;
  }
}

onMounted(() => fetchList());
</script>

<style scoped>
.rag-template { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.page-header h2 { margin: 0; font-size: 20px; }
.desc { color: var(--color-text-secondary); font-size: 13px; margin-bottom: 12px; }

.filter-bar { display: flex; align-items: center; }
.load-error { padding: 20px 0; }

pre { margin: 0; white-space: pre-wrap; font-size: 13px; line-height: 1.5; }
.preview-content { background: var(--color-bg-page); padding: 16px; border-radius: 8px; white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
</style>
