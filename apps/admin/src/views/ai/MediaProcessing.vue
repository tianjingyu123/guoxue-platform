<template>
  <div class="mp-page">
    <div class="page-header">
      <h3>AI 媒体处理</h3>
      <el-button @click="refresh">
        刷新
      </el-button>
    </div>

    <!-- 统计 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ stats.totalTasks }}</span><span class="label">总处理任务</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card info">
          <span class="value">{{ stats.imageAuditCount }}</span><span class="label">图像审核</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ stats.ttsCount }}</span><span class="label">语音合成</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card warn">
          <span class="value">{{ stats.transcribeCount }}</span><span class="label">语音转写</span>
        </div>
      </el-col>
    </el-row>

    <el-tabs
      v-model="activeTab"
      @tab-change="onTabChange"
    >
      <!-- 图像审核 -->
      <el-tab-pane
        label="图像审核"
        name="image-audit"
      >
        <el-row :gutter="16">
          <el-col :span="10">
            <el-card>
              <template #header>
                <span>提交图像审核</span>
              </template>
              <el-form
                label-width="80px"
                size="small"
              >
                <el-form-item label="图片URL">
                  <el-input
                    v-model="auditForm.imageUrl"
                    placeholder="请输入图片的URL地址"
                  />
                </el-form-item>
                <el-form-item label="上下文">
                  <el-input
                    v-model="auditForm.context"
                    type="textarea"
                    :rows="2"
                    placeholder="图片的使用场景描述（可选）"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="primary"
                    :loading="auditing"
                    @click="submitAudit"
                  >
                    提交AI审核
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>

            <el-card
              v-if="lastAuditResult"
              style="margin-top:12px"
            >
              <template #header>
                <span>最近审核结果</span>
              </template>
              <el-descriptions
                :column="1"
                border
                size="small"
              >
                <el-descriptions-item label="图片URL">
                  {{ lastAuditResult.imageUrl }}
                </el-descriptions-item>
                <el-descriptions-item label="安全判定">
                  <el-tag :type="lastAuditResult.safe ? 'success' : 'danger'">
                    {{ lastAuditResult.safe ? '合规' : '违规' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item
                  v-if="lastAuditResult.category"
                  label="违规类别"
                >
                  {{ lastAuditResult.category }}
                </el-descriptions-item>
                <el-descriptions-item label="置信度">
                  {{ ((lastAuditResult.confidence || 0) * 100).toFixed(0) }}%
                </el-descriptions-item>
                <el-descriptions-item label="理由">
                  {{ lastAuditResult.reason }}
                </el-descriptions-item>
                <el-descriptions-item label="模型">
                  {{ lastAuditResult.model }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
          <el-col :span="14">
            <el-card>
              <template #header>
                <span>图像审核历史</span>
              </template>
              <el-table
                v-loading="tasksLoading"
                :data="imageAuditLogs"
                stripe
                size="small"
                max-height="420"
              >
                <el-table-column
                  label="图片URL"
                  min-width="180"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    {{ row.inputSummary?.substring(0, 100) || '-' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="结果"
                  min-width="180"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    {{ row.outputSummary?.substring(0, 100) || row.analysisContent?.substring(0, 100) || '-' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="延迟"
                  width="70"
                >
                  <template #default="{ row }">
                    {{ row.latency ? row.latency + 'ms' : '-' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="时间"
                  width="170"
                >
                  <template #default="{ row }">
                    {{ fmt(row.createdAt) }}
                  </template>
                </el-table-column>
                <template #empty>
                  <div
                    v-if="loadErr"
                    class="tbl-state"
                  >
                    <span>加载失败</span>
                    <el-button
                      size="small"
                      type="primary"
                      @click="refresh"
                    >
                      重试
                    </el-button>
                  </div>
                  <el-empty
                    v-else
                    description="暂无图像审核记录"
                    :image-size="60"
                  />
                </template>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 语音合成 TTS -->
      <el-tab-pane
        label="语音合成"
        name="tts"
      >
        <el-row :gutter="16">
          <el-col :span="10">
            <el-card>
              <template #header>
                <span>文字转语音</span>
              </template>
              <el-form
                label-width="80px"
                size="small"
              >
                <el-form-item label="文本内容">
                  <el-input
                    v-model="ttsForm.text"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入要转为语音的文本"
                  />
                </el-form-item>
                <el-form-item label="音色">
                  <el-select
                    v-model="ttsForm.voice"
                    style="width:100%"
                  >
                    <el-option
                      label="女声 (晓晓)"
                      value="zh-CN-XiaoxiaoNeural"
                    />
                    <el-option
                      label="男声 (云希)"
                      value="zh-CN-YunxiNeural"
                    />
                    <el-option
                      label="女声 (晓悠)"
                      value="zh-CN-XiaoyouNeural"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="语速">
                  <el-slider
                    v-model="ttsForm.speed"
                    :min="0.5"
                    :max="2.0"
                    :step="0.1"
                    show-input
                  />
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="primary"
                    :loading="ttsGenerating"
                    @click="submitTts"
                  >
                    生成语音
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>
          <el-col :span="14">
            <el-card>
              <template #header>
                <span>TTS 历史</span>
              </template>
              <el-table
                v-loading="tasksLoading"
                :data="ttsLogs"
                stripe
                size="small"
                max-height="420"
              >
                <el-table-column
                  label="输入文本"
                  min-width="180"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    {{ row.inputSummary?.substring(0, 100) || '-' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="合成结果"
                  min-width="180"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    {{ row.outputSummary?.substring(0, 100) || '-' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="时间"
                  width="170"
                >
                  <template #default="{ row }">
                    {{ fmt(row.createdAt) }}
                  </template>
                </el-table-column>
                <template #empty>
                  <div
                    v-if="loadErr"
                    class="tbl-state"
                  >
                    <span>加载失败</span>
                    <el-button
                      size="small"
                      type="primary"
                      @click="refresh"
                    >
                      重试
                    </el-button>
                  </div>
                  <el-empty
                    v-else
                    description="暂无语音合成记录"
                    :image-size="60"
                  />
                </template>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 语音转写 -->
      <el-tab-pane
        label="语音转写"
        name="transcribe"
      >
        <el-row :gutter="16">
          <el-col :span="10">
            <el-card>
              <template #header>
                <span>语音转文字</span>
              </template>
              <el-form
                label-width="80px"
                size="small"
              >
                <el-form-item label="音频URL">
                  <el-input
                    v-model="transcribeForm.audioUrl"
                    placeholder="请输入音频文件的URL地址"
                  />
                </el-form-item>
                <el-form-item label="语言">
                  <el-select
                    v-model="transcribeForm.language"
                    style="width:100%"
                  >
                    <el-option
                      label="中文"
                      value="zh-CN"
                    />
                    <el-option
                      label="英文"
                      value="en-US"
                    />
                    <el-option
                      label="自动检测"
                      value="auto"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="primary"
                    :loading="transcribing"
                    @click="submitTranscribe"
                  >
                    开始转写
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>
          <el-col :span="14">
            <el-card>
              <template #header>
                <span>转写历史</span>
              </template>
              <el-table
                v-loading="tasksLoading"
                :data="transcribeLogs"
                stripe
                size="small"
                max-height="420"
              >
                <el-table-column
                  label="音频URL"
                  min-width="180"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    {{ row.inputSummary?.substring(0, 100) || '-' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="转写结果"
                  min-width="200"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    {{ row.outputSummary?.substring(0, 100) || row.analysisContent?.substring(0, 100) || '-' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="时间"
                  width="170"
                >
                  <template #default="{ row }">
                    {{ fmt(row.createdAt) }}
                  </template>
                </el-table-column>
                <template #empty>
                  <div
                    v-if="loadErr"
                    class="tbl-state"
                  >
                    <span>加载失败</span>
                    <el-button
                      size="small"
                      type="primary"
                      @click="refresh"
                    >
                      重试
                    </el-button>
                  </div>
                  <el-empty
                    v-else
                    description="暂无转写记录"
                    :image-size="60"
                  />
                </template>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/api";

// 图像审核结果
interface AuditResult {
  imageUrl?: string;
  safe?: boolean;
  category?: string;
  confidence?: number;
  reason?: string;
  model?: string;
}
// 媒体任务历史行
interface MediaTask {
  inputSummary?: string;
  outputSummary?: string;
  analysisContent?: string;
  latency?: number;
  createdAt?: string;
}

const activeTab = ref("image-audit");

const stats = reactive({ totalTasks: 0, imageAuditCount: 0, ttsCount: 0, transcribeCount: 0 });

// 图像审核
const auditForm = reactive({ imageUrl: "", context: "" });
const auditing = ref(false);
const lastAuditResult = ref<AuditResult | null>(null);

// TTS
const ttsForm = reactive({ text: "", voice: "zh-CN-XiaoxiaoNeural", speed: 1.0 });
const ttsGenerating = ref(false);

// 转写
const transcribeForm = reactive({ audioUrl: "", language: "zh-CN" });
const transcribing = ref(false);

// 历史日志
const imageAuditLogs = ref<MediaTask[]>([]);
const ttsLogs = ref<MediaTask[]>([]);
const transcribeLogs = ref<MediaTask[]>([]);
const tasksLoading = ref(false);
const loadErr = ref(false);

function fmt(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }

onMounted(() => refresh());

async function refresh() {
  await Promise.all([loadTasks(), loadTaskCounts()]);
}

async function loadTasks() {
  tasksLoading.value = true;
  loadErr.value = false;
  try {
    const [imageRes, ttsRes, transRes] = await Promise.all([
      api.get("/ai/media/tasks", { params: { type: "image_audit", pageSize: 20 } }),
      api.get("/ai/media/tasks", { params: { type: "tts", pageSize: 20 } }),
      api.get("/ai/media/tasks", { params: { type: "transcribe", pageSize: 20 } }),
    ]);
    imageAuditLogs.value = (imageRes.data as { list?: MediaTask[] })?.list || [];
    ttsLogs.value = (ttsRes.data as { list?: MediaTask[] })?.list || [];
    transcribeLogs.value = (transRes.data as { list?: MediaTask[] })?.list || [];
  } catch {
    loadErr.value = true;
  } finally { tasksLoading.value = false; }
}

async function loadTaskCounts() {
  try {
    const [allRes, imgRes, ttsRes, transRes] = await Promise.all([
      api.get("/ai/media/tasks", { params: { pageSize: 1 } }),
      api.get("/ai/media/tasks", { params: { type: "image_audit", pageSize: 1 } }),
      api.get("/ai/media/tasks", { params: { type: "tts", pageSize: 1 } }),
      api.get("/ai/media/tasks", { params: { type: "transcribe", pageSize: 1 } }),
    ]);
    stats.totalTasks = (allRes.data as { total?: number })?.total || 0;
    stats.imageAuditCount = (imgRes.data as { total?: number })?.total || 0;
    stats.ttsCount = (ttsRes.data as { total?: number })?.total || 0;
    stats.transcribeCount = (transRes.data as { total?: number })?.total || 0;
  } catch { /* ignore */ }
}

async function submitAudit() {
  if (!auditForm.imageUrl) { ElMessage.warning("请输入图片URL"); return; }
  auditing.value = true;
  try {
    const { data } = await api.post("/ai/media/image-audit", {
      imageUrl: auditForm.imageUrl,
      context: auditForm.context || undefined,
    });
    lastAuditResult.value = data;
    ElMessage.success("AI审核完成");
    loadTasks();
  } catch { /* ignore */ } finally { auditing.value = false; }
}

async function submitTts() {
  if (!ttsForm.text) { ElMessage.warning("请输入文本"); return; }
  ttsGenerating.value = true;
  try {
    await api.post("/ai/media/tts", {
      text: ttsForm.text,
      voice: ttsForm.voice,
      speed: ttsForm.speed,
    });
    ElMessage.success("TTS任务已提交");
    loadTasks();
  } catch { /* ignore */ } finally { ttsGenerating.value = false; }
}

async function submitTranscribe() {
  if (!transcribeForm.audioUrl) { ElMessage.warning("请输入音频URL"); return; }
  transcribing.value = true;
  try {
    await api.post("/ai/media/transcribe", {
      audioUrl: transcribeForm.audioUrl,
      language: transcribeForm.language,
    });
    ElMessage.success("转写任务已提交");
    loadTasks();
  } catch { /* ignore */ } finally { transcribing.value = false; }
}

function onTabChange(_tab: string) { loadTasks(); }
</script>

<style scoped>
.mp-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.stat-card.warn .value { color: var(--color-warning); }
.stat-card.info .value { color: var(--color-info); }
.tbl-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 0; color: var(--color-text-secondary); }
</style>
