<template>
  <div class="aigw-page">
    <div class="page-header">
      <h3>AI网关 — 模型路由配置</h3>
      <div>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveConfig"
        >
          保存全部
        </el-button>
        <el-button @click="refresh">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 预算概览 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ sceneCount }}</span><span class="label">已配置场景</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ defaultModel }}</span><span class="label">默认模型</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card warn">
          <span class="value">{{ cappedScenes }}</span><span class="label">超预算场景</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ sceneBudgets ? Object.keys(sceneBudgets.scenes || {}).length : 0 }}</span><span class="label">有预算配额的场景</span>
        </div>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
      <!-- 默认配置 -->
      <el-tab-pane
        label="默认配置"
        name="default"
      >
        <el-card>
          <template #header>
            <span>全局默认路由参数（所有未独立配置的场景使用）</span>
          </template>
          <el-form
            :model="config.default"
            label-width="120px"
            size="small"
          >
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="默认模型">
                  <el-select
                    v-model="config.default.model"
                    style="width:100%"
                  >
                    <el-option
                      v-for="m in availableModels"
                      :key="m.value"
                      :label="m.label"
                      :value="m.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="备用模型">
                  <el-select
                    v-model="config.default.fallbackModel"
                    clearable
                    style="width:100%"
                  >
                    <el-option
                      v-for="m in availableModels"
                      :key="m.value"
                      :label="m.label"
                      :value="m.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="Temperature">
                  <el-input-number
                    v-model="config.default.temperature"
                    :min="0"
                    :max="2"
                    :step="0.1"
                    :precision="1"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="Max Tokens">
                  <el-input-number
                    v-model="config.default.maxTokens"
                    :min="256"
                    :max="32768"
                    :step="256"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="Top P">
                  <el-input-number
                    v-model="config.default.topP"
                    :min="0"
                    :max="1"
                    :step="0.05"
                    :precision="2"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="超时(秒)">
                  <el-input-number
                    v-model="config.default.timeoutSec"
                    :min="5"
                    :max="60"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 场景配置 -->
      <el-tab-pane
        label="场景配置"
        name="scenes"
      >
        <div style="margin-bottom:12px;display:flex;gap:8px">
          <el-input
            v-model="newSceneName"
            placeholder="新场景名（如 content_generation）"
            size="small"
            style="width:280px"
          />
          <el-button
            size="small"
            type="primary"
            :disabled="!newSceneName.trim()"
            @click="addScene"
          >
            添加场景
          </el-button>
        </div>

        <el-table
          :data="sceneList"
          stripe
          size="small"
        >
          <el-table-column
            label="场景"
            width="200"
          >
            <template #default="{ row }">
              <el-tag>{{ row.name }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="主模型"
            width="200"
          >
            <template #default="{ row }">
              <el-select
                v-model="row.config.model"
                size="small"
                style="width:100%"
              >
                <el-option
                  v-for="m in availableModels"
                  :key="m.value"
                  :label="m.label"
                  :value="m.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column
            label="备用模型"
            width="180"
          >
            <template #default="{ row }">
              <el-select
                v-model="row.config.fallbackModel"
                size="small"
                clearable
                style="width:100%"
              >
                <el-option
                  v-for="m in availableModels"
                  :key="m.value"
                  :label="m.label"
                  :value="m.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column
            label="灰度发布"
            width="160"
          >
            <template #default="{ row }">
              <template v-if="row.config.grayRelease">
                <span style="font-size:12px">{{ row.config.grayRelease.newModel }} ({{ row.config.grayRelease.percentage }}%)</span>
              </template>
              <template v-else>
                <el-button
                  size="small"
                  @click="row._showGray = true"
                >
                  启用灰度
                </el-button>
              </template>
            </template>
          </el-table-column>
          <el-table-column
            label="月度预算(Token)"
            width="170"
          >
            <template #default="{ row }">
              <template v-if="row.config.budgetControl">
                <el-progress
                  :percentage="getBudgetPercent(row.name)"
                  :status="getBudgetPercent(row.name) >= 100 ? 'exception' : undefined"
                  :stroke-width="16"
                  style="width:120px"
                />
                <span style="font-size:11px;color:#909399">{{ formatTokens(row.config.budgetControl.monthlyTokenLimit) }}</span>
              </template>
              <template v-else>
                <el-button
                  size="small"
                  @click="row._showBudget = true"
                >
                  设置预算
                </el-button>
              </template>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="160"
            fixed="right"
          >
            <template #default="{ row, $index }">
              <el-button
                size="small"
                @click="editScene(row)"
              >
                详细配置
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="removeScene($index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 预算看板 -->
      <el-tab-pane
        label="预算看板"
        name="budgets"
      >
        <el-table
          :data="budgetList"
          stripe
          size="small"
        >
          <el-table-column
            label="场景"
            width="200"
          >
            <template #default="{ row }">
              <el-tag>{{ row.scene }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="已用Token"
            width="150"
          >
            <template #default="{ row }">
              {{ formatTokens(row.used) }}
            </template>
          </el-table-column>
          <el-table-column
            label="月度上限"
            width="150"
          >
            <template #default="{ row }">
              {{ formatTokens(row.limit) }}
            </template>
          </el-table-column>
          <el-table-column
            label="剩余"
            width="150"
          >
            <template #default="{ row }">
              <span :style="{ color: row.remaining <= 0 ? '#f56c6c' : '#67c23a' }">{{ formatTokens(row.remaining) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="用量"
            min-width="200"
          >
            <template #default="{ row }">
              <el-progress
                :percentage="row.limit === 0 ? 0 : Math.min(100, Math.round(row.used / row.limit * 100))"
                :status="row.percentage >= 100 ? 'exception' : row.percentage >= 80 ? 'warning' : undefined"
                :stroke-width="16"
              />
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 场景详细编辑对话框 -->
    <el-dialog
      v-model="editDialog"
      title="场景详细配置"
      width="600px"
    >
      <el-form
        v-if="editTarget"
        :model="editTarget"
        label-width="110px"
      >
        <el-form-item label="场景名">
          <el-input
            v-model="editTarget.name"
            disabled
          />
        </el-form-item>

        <el-divider content-position="left">
          模型选择
        </el-divider>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="主模型">
              <el-select
                v-model="editTarget.config.model"
                style="width:100%"
              >
                <el-option
                  v-for="m in availableModels"
                  :key="m.value"
                  :label="m.label"
                  :value="m.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备用模型">
              <el-select
                v-model="editTarget.config.fallbackModel"
                clearable
                style="width:100%"
              >
                <el-option
                  v-for="m in availableModels"
                  :key="m.value"
                  :label="m.label"
                  :value="m.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          模型参数
        </el-divider>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="Temperature">
              <el-input-number
                v-model="editTarget.config.temperature"
                :min="0"
                :max="2"
                :step="0.1"
                :precision="1"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Max Tokens">
              <el-input-number
                v-model="editTarget.config.maxTokens"
                :min="256"
                :max="32768"
                :step="256"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Top P">
              <el-input-number
                v-model="editTarget.config.topP"
                :min="0"
                :max="1"
                :step="0.05"
                :precision="2"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          灰度发布
        </el-divider>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="灰度模型">
              <el-select
                v-model="editTarget.config.grayRelease.newModel"
                clearable
                style="width:100%"
              >
                <el-option
                  v-for="m in availableModels"
                  :key="m.value"
                  :label="m.label"
                  :value="m.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="灰度比例(%)">
              <el-input-number
                v-model="editTarget.config.grayRelease.percentage"
                :min="0"
                :max="100"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          成本控制
        </el-divider>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="月度Token上限">
              <el-input-number
                v-model="editTarget.config.budgetControl.monthlyTokenLimit"
                :min="0"
                :step="100000"
                style="width:100%"
              />
              <div style="font-size:11px;color:#909399">
                0 表示不限制
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="超预算降级模型">
              <el-select
                v-model="editTarget.config.budgetControl.lightModel"
                style="width:100%"
              >
                <el-option
                  v-for="m in availableModels"
                  :key="m.value"
                  :label="m.label"
                  :value="m.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="confirmSceneEdit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { systemApi, api } from "@/api";

const availableModels = [
  { label: "DeepSeek V4 Flash (快速)", value: "deepseek-v4-flash" },
  { label: "DeepSeek V4 Pro (高质)", value: "deepseek-v4-pro" },
  { label: "DeepSeek R1 (推理)", value: "deepseek-r1" },
  { label: "Claude Opus 4.7 (高精度)", value: "claude-opus-4-7" },
  { label: "Claude Sonnet 4.6 (均衡)", value: "claude-sonnet-4-6" },
  { label: "Claude Haiku 4.5 (极速)", value: "claude-haiku-4-5-20251001" },
  { label: "GPT-5 (通用)", value: "gpt-5" },
];

const activeTab = ref("scenes");
const saving = ref(false);
const newSceneName = ref("");

const config = reactive({
  default: { model: "deepseek-v4-flash", fallbackModel: "deepseek-v4-flash", temperature: 0.3, maxTokens: 2048, topP: 0.9, timeoutSec: 5 },
  scenes: {} as Record<string, any>,
});

const sceneBudgets = ref<any>(null);
const editDialog = ref(false);
const editTarget = ref<any>(null);

const sceneCount = computed(() => Object.keys(config.scenes).length);
const defaultModel = computed(() => config.default.model);
const cappedScenes = computed(() => {
  if (!sceneBudgets.value?.scenes) return 0;
  return Object.values(sceneBudgets.value.scenes as Record<string, any>).filter((s: any) => s.percentage >= 100).length;
});

const sceneList = computed(() => {
  return Object.entries(config.scenes).map(([name, cfg]) => ({ name, config: cfg as any }));
});

const budgetList = computed(() => {
  if (!sceneBudgets.value?.scenes) return [];
  return Object.entries(sceneBudgets.value.scenes as Record<string, any>).map(([scene, info]: [string, any]) => ({
    scene, ...info,
  }));
});

function getBudgetPercent(scene: string): number {
  if (!sceneBudgets.value?.scenes?.[scene]) return 0;
  return sceneBudgets.value.scenes[scene].percentage || 0;
}

function formatTokens(n: number): string {
  if (!n || n === 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

onMounted(() => refresh());

async function refresh() {
  try {
    // 读取路由配置
    const { data: cfgRes } = await api.get("/ai/routing-config");
    const cfg = cfgRes as any;
    config.default = { ...config.default, ...cfg?.default };
    config.scenes = cfg?.scenes || {};

    // 读取预算
    const { data: budgetRes } = await api.get("/ai/scene-budgets");
    sceneBudgets.value = budgetRes;
  } catch { /* ignore */ }
}

async function saveConfig() {
  saving.value = true;
  try {
    const routingConfig = {
      default: config.default,
      scenes: config.scenes,
    };
    await systemApi.setConfig("ai_model_routing", {
      value: JSON.stringify(routingConfig),
      description: "AI模型路由配置",
    });
    ElMessage.success("路由配置已保存");
  } finally { saving.value = false; }
}

function addScene() {
  const name = newSceneName.value.trim();
  if (!name) return;
  if (config.scenes[name]) {
    ElMessage.warning("场景名已存在");
    return;
  }
  config.scenes[name] = {
    model: config.default.model,
    fallbackModel: config.default.fallbackModel,
    temperature: config.default.temperature,
    maxTokens: config.default.maxTokens,
    topP: config.default.topP,
  };
  newSceneName.value = "";
}

function removeScene(index: number) {
  const name = sceneList.value[index]?.name;
  if (name) delete config.scenes[name];
}

function editScene(row: any) {
  editTarget.value = {
    name: row.name,
    config: {
      model: row.config.model || config.default.model,
      fallbackModel: row.config.fallbackModel || config.default.fallbackModel,
      temperature: row.config.temperature ?? config.default.temperature,
      maxTokens: row.config.maxTokens ?? config.default.maxTokens,
      topP: row.config.topP ?? config.default.topP,
      grayRelease: row.config.grayRelease ? { ...row.config.grayRelease } : { newModel: "", percentage: 10 },
      budgetControl: row.config.budgetControl ? { ...row.config.budgetControl } : { monthlyTokenLimit: 0, lightModel: "deepseek-v4-flash" },
    },
  };
  editDialog.value = true;
}

function confirmSceneEdit() {
  if (!editTarget.value) return;
  const { name, config: sceneCfg } = editTarget.value;

  // 清理空值
  if (!sceneCfg.grayRelease?.newModel || sceneCfg.grayRelease?.percentage === 0) {
    delete sceneCfg.grayRelease;
  }
  if (!sceneCfg.budgetControl?.monthlyTokenLimit || sceneCfg.budgetControl?.monthlyTokenLimit === 0) {
    delete sceneCfg.budgetControl;
  }

  config.scenes[name] = sceneCfg;
  editDialog.value = false;
}
</script>

<style scoped>
.aigw-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: #8b4513; }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: #303133; }
.stat-card .label { display: block; font-size: 12px; color: #909399; margin-top: 2px; }
.stat-card.warn .value { color: #e6a23c; }
</style>
