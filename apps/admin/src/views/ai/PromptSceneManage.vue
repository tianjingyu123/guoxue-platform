<template>
  <div class="page">
    <PageHeader title="AI Prompt 场景化管理" />

    <!-- 场景选择标签 -->
    <el-tabs v-model="activeScene" @tab-change="onSceneChange" type="border-card">
      <el-tab-pane v-for="s in scenes" :key="s.key" :label="s.name" :name="s.key" />
    </el-tabs>

    <el-card v-if="currentScene" style="margin-top:16px">
      <template #header>
        <div class="card-header">
          <span>{{ currentScene.name }} — Prompt 配置</span>
          <el-switch
            v-model="currentScene.enabled"
            active-text="启用"
            inactive-text="停用"
            @change="onToggleScene"
          />
        </div>
      </template>

      <el-form :model="sceneForm" label-width="110px">
        <el-form-item label="系统 Prompt">
          <el-input
            v-model="sceneForm.systemPrompt"
            type="textarea"
            :rows="6"
            placeholder="输入系统级的 Prompt 指令..."
          />
        </el-form-item>
        <el-form-item label="用户 Prompt 模板">
          <el-input
            v-model="sceneForm.userPromptTemplate"
            type="textarea"
            :rows="4"
            placeholder="支持 {{变量}} 占位符，如 {{userInput}} {{context}}"
          />
        </el-form-item>
        <el-form-item label="变量说明">
          <div v-if="sceneForm.variables && sceneForm.variables.length > 0" class="var-list">
            <el-tag v-for="v in sceneForm.variables" :key="v.name" size="small" style="margin-right:8px">
              {{ '{{' + v.name + '}}' }} — {{ v.description }}
            </el-tag>
          </div>
          <span v-else style="color:#909399">无变量</span>
        </el-form-item>
        <el-form-item label="模型">
          <el-select v-model="sceneForm.model" placeholder="选择模型">
            <el-option label="Claude Opus 4.7" value="claude-opus-4-7" />
            <el-option label="Claude Sonnet 4.6" value="claude-sonnet-4-6" />
            <el-option label="DeepSeek V4" value="deepseek-v4" />
            <el-option label="GPT-4o" value="gpt-4o" />
          </el-select>
        </el-form-item>
        <el-form-item label="Temperature">
          <el-slider v-model="sceneForm.temperature" :min="0" :max="1" :step="0.1" show-input style="width:300px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveScene" :loading="saving">保存配置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 风格库 -->
    <el-card v-if="currentScene" style="margin-top:16px">
      <template #header>
        <div class="card-header">
          <span>风格库管理（{{ currentScene.name }}）</span>
          <el-button size="small" type="primary" @click="showStyleDialog()">添加风格</el-button>
        </div>
      </template>
      <el-table :data="styles" border stripe>
        <el-table-column prop="name" label="风格名称" width="140" />
        <el-table-column prop="prompt" label="风格 Prompt" minWidth="300" show-overflow-tooltip />
        <el-table-column prop="example" label="示例" width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="showStyleDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除?" @confirm="deleteStyle(row.id)">
              <template #reference>
                <el-button size="small" text type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 效果统计 -->
    <el-card style="margin-top:16px">
      <template #header>场景效果统计（近7天）</template>
      <el-row :gutter="16">
        <el-col :span="6" v-for="st in sceneStats" :key="st.label">
          <div class="stat-item">
            <div class="stat-val">{{ st.value }}</div>
            <div class="stat-lbl">{{ st.label }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- AI功能全局开关 -->
    <el-card style="margin-top:16px">
      <template #header>
        <div class="card-header">
          <span>AI 功能开关总览</span>
          <el-button size="small" type="primary" @click="fetchToggles">刷新</el-button>
        </div>
      </template>
      <el-table :data="toggles" border stripe>
        <el-table-column prop="label" label="功能" width="200" />
        <el-table-column prop="scene" label="所属场景" width="160" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="onToggleFeature(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" minWidth="200" />
      </el-table>
    </el-card>

    <!-- 风格编辑弹窗 -->
    <el-dialog v-model="styleDialogVisible" :title="editingStyle?.id ? '编辑风格' : '添加风格'" width="540px">
      <el-form :model="styleForm" label-width="100px">
        <el-form-item label="风格名称" required>
          <el-input v-model="styleForm.name" placeholder="如：正式、轻松、幽默、文艺" />
        </el-form-item>
        <el-form-item label="风格 Prompt" required>
          <el-input v-model="styleForm.prompt" type="textarea" :rows="4" placeholder="描述该风格的写作特点" />
        </el-form-item>
        <el-form-item label="示例">
          <el-input v-model="styleForm.example" type="textarea" :rows="2" placeholder="展示该风格的示例输出" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="styleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveStyle">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { aiPromptApi } from "@/api"
import PageHeader from "@/components/PageHeader.vue"

const activeScene = ref("")
const currentScene = ref<any>(null)
const scenes = ref<any[]>([])
const styles = ref<any[]>([])
const sceneStats = ref<any[]>([])
const toggles = ref<any[]>([])
const saving = ref(false)
const styleDialogVisible = ref(false)
const editingStyle = ref<any>(null)
const styleForm = reactive({ name: "", prompt: "", example: "" })

const sceneForm = reactive({
  systemPrompt: "",
  userPromptTemplate: "",
  variables: [] as any[],
  model: "claude-sonnet-4-6",
  temperature: 0.7,
})

const sceneNameMap: Record<string, string> = {
  comment_polish: "国风评论润色",
  topic_recommend: "话题推荐",
  share_card: "分享卡片生成",
  course_summary: "课程摘要",
  reading_companion: "阅读伴侣",
  learning_summary: "学习小结",
  share_copy: "分享文案",
  fortune_card: "运势卡片",
  course_outline: "课程大纲",
  promotion_copy: "推广文案",
}

async function fetchScenes() {
  try {
    const res: any = await aiPromptApi.listScenes()
    scenes.value = ((res?.data ?? res)?.scenes ?? []).map((s: any) => ({
      ...s,
      name: sceneNameMap[s.key] ?? s.name ?? s.key,
    }))
    if (scenes.value.length > 0 && !activeScene.value) {
      activeScene.value = scenes.value[0].key
      await onSceneChange(activeScene.value)
    }
  } catch { /* */ }
}

async function onSceneChange(key: string) {
  try {
    const res: any = await aiPromptApi.getScene(key)
    const d = (res?.data ?? res) ?? {}
    currentScene.value = d
    sceneForm.systemPrompt = d.systemPrompt ?? ""
    sceneForm.userPromptTemplate = d.userPromptTemplate ?? ""
    sceneForm.variables = d.variables ?? []
    sceneForm.model = d.model ?? "claude-sonnet-4-6"
    sceneForm.temperature = d.temperature ?? 0.7
    await fetchStyles(key)
    await fetchStats(key)
  } catch { /* */ }
}

async function fetchStyles(scene: string) {
  try {
    const res: any = await aiPromptApi.listStyles(scene)
    styles.value = (res?.data ?? res)?.styles ?? (res?.data ?? res)?.list ?? []
  } catch { /* */ }
}

async function fetchStats(scene?: string) {
  try {
    const res: any = await aiPromptApi.getSceneStats(scene)
    const d = (res?.data ?? res) ?? {}
    sceneStats.value = [
      { label: "总调用次数", value: d.totalCalls ?? 0 },
      { label: "用户采纳率", value: (d.adoptionRate ?? 0) + "%" },
      { label: "平均评分", value: (d.avgRating ?? 0) + "/5" },
      { label: "节约时间(估)", value: (d.timeSaved ?? 0) + "h" },
    ]
  } catch { /* */ }
}

async function fetchToggles() {
  try {
    const res: any = await aiPromptApi.getToggles()
    const list = (res?.data ?? res)?.toggles ?? (res?.data ?? res)?.list ?? []
    toggles.value = list.map((t: any) => ({ ...t, label: sceneNameMap[t.scene] ?? t.label ?? t.scene }))
  } catch { /* */ }
}

async function saveScene() {
  saving.value = true
  try {
    await aiPromptApi.updateScene(activeScene.value, {
      systemPrompt: sceneForm.systemPrompt,
      userPromptTemplate: sceneForm.userPromptTemplate,
      variables: sceneForm.variables,
      model: sceneForm.model,
      temperature: sceneForm.temperature,
    })
    ElMessage.success("保存成功")
  } catch { /* */ }
  finally { saving.value = false }
}

async function onToggleScene(val: boolean) {
  try {
    await aiPromptApi.toggleFeature(activeScene.value, val)
  } catch { /* */ }
}

async function onToggleFeature(row: any) {
  try {
    await aiPromptApi.toggleFeature(row.scene, row.enabled)
    ElMessage.success(row.enabled ? "已启用" : "已停用")
  } catch { row.enabled = !row.enabled }
}

function showStyleDialog(row?: any) {
  if (row) {
    editingStyle.value = row
    styleForm.name = row.name
    styleForm.prompt = row.prompt
    styleForm.example = row.example ?? ""
  } else {
    editingStyle.value = null
    styleForm.name = ""
    styleForm.prompt = ""
    styleForm.example = ""
  }
  styleDialogVisible.value = true
}

async function saveStyle() {
  try {
    if (editingStyle.value?.id) {
      await aiPromptApi.updateStyle(editingStyle.value.id, { ...styleForm })
    } else {
      await aiPromptApi.createStyle(activeScene.value, { ...styleForm })
    }
    ElMessage.success("保存成功")
    styleDialogVisible.value = false
    fetchStyles(activeScene.value)
  } catch { /* */ }
}

async function deleteStyle(id: string) {
  try {
    await aiPromptApi.deleteStyle(id)
    ElMessage.success("删除成功")
    fetchStyles(activeScene.value)
  } catch { /* */ }
}

onMounted(() => { fetchScenes(); fetchToggles() })
</script>

<style scoped>
.page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.var-list { display: flex; flex-wrap: wrap; gap: 4px; }
.stat-item { text-align: center; padding: 12px; background: #f5f7fa; border-radius: 8px; }
.stat-val { font-size: 22px; font-weight: 700; color: #409eff; }
.stat-lbl { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
</style>
