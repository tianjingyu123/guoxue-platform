<template>
  <div class="km-page">
    <div class="page-header">
      <h3>知识库管理</h3>
      <div>
        <el-button
          size="small"
          type="primary"
          :loading="syncing"
          @click="syncAll"
        >
          全量同步
        </el-button>
        <el-button
          size="small"
          @click="refresh"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 圈子选择 -->
    <div
      class="toolbar-row"
      style="margin-bottom:16px"
    >
      <span style="margin-right:8px;color:#606266">选择圈子：</span>
      <el-select
        v-model="selectedCircle"
        placeholder="选择圈子"
        size="small"
        style="width:280px"
        filterable
        @change="onCircleChange"
      >
        <el-option
          v-for="c in circles"
          :key="c.id"
          :label="c.name"
          :value="c.id"
        />
      </el-select>
    </div>

    <template v-if="selectedCircle">
      <!-- 统计 -->
      <el-row
        :gutter="16"
        style="margin-bottom:16px"
      >
        <el-col :span="6">
          <div class="stat-card">
            <span class="value">{{ stats.totalEntries }}</span><span class="label">已入库内容</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card warn">
            <span class="value">{{ stats.pendingCandidates }}</span><span class="label">待确认候选</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <span class="value">{{ stats.confirmedToday }}</span><span class="label">今日确认</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <span class="value">{{ stats.lastSync ? fmtDate(stats.lastSync) : '从未' }}</span><span class="label">最近同步</span>
          </div>
        </el-col>
      </el-row>

      <el-tabs
        v-model="activeTab"
        @tab-change="onTabChange"
      >
        <!-- 候选内容审核 -->
        <el-tab-pane
          label="候选内容"
          name="candidates"
        >
          <el-table
            v-loading="candidateLoading"
            :data="candidates"
            stripe
            size="small"
            empty-text="暂无待确认的候选内容"
          >
            <el-table-column
              label="内容摘要"
              min-width="300"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.title || row.content?.substring(0, 100) || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="来源类型"
              width="100"
            >
              <template #default="{ row }">
                {{ row.sourceType || row.targetType || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="来源ID"
              prop="sourceId"
              width="200"
              show-overflow-tooltip
            />
            <el-table-column
              label="提交时间"
              width="170"
            >
              <template #default="{ row }">
                {{ fmtDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="200"
            >
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="success"
                  @click="confirmCandidate(row)"
                >
                  确认入库
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="rejectCandidate(row)"
                >
                  拒绝
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 已入库管理 -->
        <el-tab-pane
          label="已入库"
          name="knowledge"
        >
          <el-table
            v-loading="knowledgeLoading"
            :data="knowledgeEntries"
            stripe
            size="small"
            empty-text="暂无已入库内容"
          >
            <el-table-column
              label="内容标题"
              min-width="300"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.title || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="来源类型"
              width="100"
            >
              <template #default="{ row }">
                {{ row.sourceType || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="入库时间"
              width="170"
            >
              <template #default="{ row }">
                {{ fmtDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="100"
            >
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="danger"
                  @click="removeEntry(row)"
                >
                  移除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 同步控制 -->
        <el-tab-pane
          label="同步控制"
          name="sync"
        >
          <el-card style="max-width:600px">
            <el-descriptions
              :column="1"
              border
              size="small"
              style="margin-bottom:16px"
            >
              <el-descriptions-item label="圈子名称">
                {{ selectedCircleName }}
              </el-descriptions-item>
              <el-descriptions-item label="已入库数量">
                {{ stats.totalEntries }}
              </el-descriptions-item>
              <el-descriptions-item label="待确认数量">
                {{ stats.pendingCandidates }}
              </el-descriptions-item>
            </el-descriptions>
            <el-button
              type="primary"
              :loading="syncing"
              @click="syncCircle"
            >
              立即同步该圈子知识库
            </el-button>
            <span
              class="text-muted"
              style="margin-left:12px;font-size:13px"
            >
              将从已发布的文章、精华帖、热门帖子中提取内容加入候选
            </span>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </template>

    <el-empty
      v-else
      description="请选择一个圈子查看其知识库"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { circleApi, knowledgeApi } from "@/api";

const circles = ref<any[]>([]);
const selectedCircle = ref("");
const activeTab = ref("candidates");

const candidates = ref<any[]>([]);
const candidateLoading = ref(false);
const knowledgeEntries = ref<any[]>([]);
const knowledgeLoading = ref(false);
const syncing = ref(false);

const stats = reactive({ totalEntries: 0, pendingCandidates: 0, confirmedToday: 0, lastSync: "" });

const selectedCircleName = computed(() => {
  return circles.value.find((c: any) => c.id === selectedCircle.value)?.name || "";
});

function fmtDate(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }

onMounted(async () => {
  try {
    const { data } = await circleApi.list({ pageSize: 200 });
    circles.value = (data as any)?.circles || (data as any)?.data || [];
  } catch { /* ignore */ }
});

async function onCircleChange() {
  activeTab.value = "candidates";
  fetchCandidates();
  fetchKnowledge();
}

async function refresh() {
  if (selectedCircle.value) {
    fetchCandidates();
    fetchKnowledge();
  }
}

async function fetchCandidates() {
  candidateLoading.value = true;
  try {
    const { data } = await knowledgeApi.getCandidates(selectedCircle.value);
    const d = data as any;
    candidates.value = d?.candidates || d?.data || [];
    stats.pendingCandidates = d?.total || candidates.value.length;
  } catch { candidates.value = []; } finally { candidateLoading.value = false; }
}

async function fetchKnowledge() {
  knowledgeLoading.value = true;
  try {
    const { data } = await knowledgeApi.getCandidates(selectedCircle.value, "CONFIRMED");
    const d = data as any;
    knowledgeEntries.value = d?.candidates || d?.data || [];
    stats.totalEntries = d?.total || knowledgeEntries.value.length;
  } catch { knowledgeEntries.value = []; } finally { knowledgeLoading.value = false; }
}

async function confirmCandidate(row: any) {
  try {
    await knowledgeApi.confirmCandidate(row.id);
    ElMessage.success("已确认入库");
    fetchCandidates();
    fetchKnowledge();
  } catch { /* ignore */ }
}

async function rejectCandidate(row: any) {
  try {
    await knowledgeApi.rejectCandidate(row.id);
    ElMessage.success("已拒绝");
    fetchCandidates();
  } catch { /* ignore */ }
}

async function removeEntry(row: any) {
  try {
    await knowledgeApi.removeFromKnowledge(row.id, selectedCircle.value, "admin");
    ElMessage.success("已移除");
    fetchKnowledge();
  } catch { /* ignore */ }
}

async function syncCircle() {
  syncing.value = true;
  try {
    await knowledgeApi.syncCircle(selectedCircle.value);
    ElMessage.success("同步已触发，新内容将出现在候选列表中");
    stats.lastSync = new Date().toISOString();
    fetchCandidates();
  } catch { /* ignore */ } finally { syncing.value = false; }
}

async function syncAll() {
  syncing.value = true;
  try {
    await knowledgeApi.syncAll();
    ElMessage.success("全量同步已触发");
    stats.lastSync = new Date().toISOString();
    if (selectedCircle.value) fetchCandidates();
  } catch { /* ignore */ } finally { syncing.value = false; }
}

function onTabChange(tab: string) {
  if (tab === "candidates") fetchCandidates();
  if (tab === "knowledge") fetchKnowledge();
}
</script>

<style scoped>
.km-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: #8b4513; }
.toolbar-row { display: flex; align-items: center; }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 16px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: #303133; }
.stat-card .label { display: block; font-size: 13px; color: #909399; margin-top: 4px; }
.stat-card.warn .value { color: #e6a23c; }
.text-muted { color: #909399; }
</style>
