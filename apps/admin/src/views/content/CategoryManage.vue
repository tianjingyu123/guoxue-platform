<template>
  <div class="cat-page">
    <PageHeader
      title="品类标签管理"
      description="看清内容覆盖与缺口，安全维护全平台品类树"
    >
      <template #actions>
        <el-button
          type="success"
          :loading="autoFilling"
          :disabled="loading || error || stats.emptyCategories === 0"
          @click="autoFillAll"
        >
          一键填充空品类
        </el-button>
        <el-button
          type="primary"
          @click="openEditTree"
        >
          编辑品类树
        </el-button>
        <el-button @click="refresh">
          刷新
        </el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="error"
      type="error"
      title="品类数据加载失败"
      :closable="false"
      show-icon
      style="margin-bottom:16px"
    >
      <el-button
        size="small"
        type="primary"
        @click="refresh"
      >
        重试
      </el-button>
    </el-alert>

    <!-- 总览卡片 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col
        :xs="12"
        :sm="8"
        :lg="4"
      >
        <div class="stat-card">
          <span class="value">{{ stats.totalCategories }}</span><span class="label">二级品类总数</span>
        </div>
      </el-col>
      <el-col
        :xs="12"
        :sm="8"
        :lg="4"
      >
        <div class="stat-card warn">
          <span class="value">{{ stats.emptyCategories }}</span><span class="label">空品类</span>
        </div>
      </el-col>
      <el-col
        :xs="12"
        :sm="8"
        :lg="4"
      >
        <div class="stat-card info">
          <span class="value">{{ stats.lowContentCategories }}</span><span class="label">内容待补齐</span>
        </div>
      </el-col>
      <el-col
        :xs="12"
        :sm="8"
        :lg="4"
      >
        <div class="stat-card">
          <span class="value">{{ totalContent }}</span><span class="label">内容条目（不含草稿）</span>
        </div>
      </el-col>
      <el-col
        :xs="12"
        :sm="8"
        :lg="4"
      >
        <div class="stat-card">
          <span class="value">{{ totalGeneratedToday }}</span><span class="label">今日生成</span>
        </div>
      </el-col>
      <el-col
        :xs="12"
        :sm="8"
        :lg="4"
      >
        <div class="stat-card">
          <span class="value">{{ Object.keys(categoryTree).length }}</span><span class="label">一级品类</span>
        </div>
      </el-col>
    </el-row>

    <!-- 品类表格 -->
    <el-card>
      <template #header>
        <div class="table-heading">
          <div>
            <span>品类健康度一览</span>
            <p class="metric-note">
              按基础知识 3 篇、经典精华 5 条、玩法教程 2 篇的覆盖目标计算
            </p>
          </div>
          <el-input
            v-model="search"
            aria-label="搜索一级或二级品类"
            placeholder="搜索品类"
            size="small"
            style="width:240px"
            clearable
          />
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="filteredStats"
        stripe
        size="small"
        :row-key="rowKey"
      >
        <template #empty>
          <el-empty :description="search ? '没有匹配的品类，请更换关键词' : '暂无品类数据，请先配置品类树'" />
        </template>
        <el-table-column
          label="一级品类"
          width="120"
        >
          <template #default="{ row }">
            <el-tag
              type="primary"
              size="small"
            >
              {{ row.level1 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="二级品类"
          width="140"
          prop="level2"
        />
        <el-table-column
          label="健康度"
          width="200"
        >
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px">
              <el-progress
                :percentage="row.healthScore"
                :status="row.totalCount === 0 ? 'exception' : row.healthScore < 100 ? 'warning' : 'success'"
                :stroke-width="16"
                style="flex:1"
              />
              <el-tag
                v-if="row.totalCount === 0"
                type="danger"
                size="small"
              >
                空
              </el-tag>
              <el-tag
                v-else-if="row.healthScore < 100"
                type="warning"
                size="small"
              >
                待补齐
              </el-tag>
              <el-tag
                v-else
                type="success"
                size="small"
              >
                达标
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="基础知识"
          width="90"
          prop="knowledgeCount"
          sortable
        />
        <el-table-column
          label="经典精华"
          width="90"
          prop="classicsCount"
          sortable
        />
        <el-table-column
          label="玩法教程"
          width="90"
          prop="tutorialCount"
          sortable
        />
        <el-table-column
          label="合计"
          width="90"
          prop="totalCount"
          sortable
        />
        <el-table-column
          label="操作"
          width="200"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              :loading="genLoading === rowKey(row)"
              @click="generateFor(row)"
            >
              生成内容
            </el-button>
            <el-button
              size="small"
              @click="viewContent(row)"
            >
              查看内容
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑品类树对话框 -->
    <el-dialog
      v-model="showEditTree"
      title="编辑品类标签树"
      width="min(700px, calc(100vw - 32px))"
      :close-on-click-modal="false"
      :before-close="requestCloseTree"
    >
      <div
        v-for="(subs, level1) in editTree"
        :key="level1"
        style="margin-bottom:16px;padding:12px;background:var(--color-bg-page);border-radius:8px"
      >
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <el-input
            v-model="editLevel1Names[level1]"
            :aria-label="`一级品类 ${level1}`"
            maxlength="30"
            size="small"
            style="width:140px;font-weight:600"
          />
          <el-button
            size="small"
            type="danger"
            circle
            :aria-label="`移除一级品类 ${editLevel1Names[level1]}`"
            @click="deleteLevel1(level1)"
          >
            ✕
          </el-button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          <el-tag
            v-for="(sub, idx) in subs"
            :key="idx"
            closable
            size="small"
            @close="removeSub(level1, idx)"
          >
            <el-input
              v-model="editTree[level1][idx]"
              :aria-label="`${editLevel1Names[level1]} 的第 ${idx + 1} 个二级品类`"
              maxlength="30"
              size="small"
              style="width:100px;border:none"
            />
          </el-tag>
          <el-button
            size="small"
            type="primary"
            circle
            :aria-label="`为 ${editLevel1Names[level1]} 添加二级品类`"
            @click="addSub(level1)"
          >
            +
          </el-button>
        </div>
      </div>
      <div style="margin-top:12px">
        <el-button
          size="small"
          @click="addLevel1"
        >
          + 添加一级品类
        </el-button>
      </div>
      <template #footer>
        <span
          v-if="isTreeDirty"
          class="unsaved-note"
        >有未保存的修改</span>
        <el-button
          :disabled="savingTree"
          @click="requestCloseTree()"
        >
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="savingTree"
          :disabled="!isTreeDirty"
          @click="saveTree"
        >
          保存品类树
        </el-button>
      </template>
    </el-dialog>

    <!-- 生成内容对话框 -->
    <el-dialog
      v-model="showGenDialog"
      title="触发生成内容"
      width="min(500px, calc(100vw - 32px))"
    >
      <el-descriptions
        :column="2"
        border
        size="small"
      >
        <el-descriptions-item label="一级品类">
          {{ genTarget?.level1 }}
        </el-descriptions-item>
        <el-descriptions-item label="二级品类">
          {{ genTarget?.level2 }}
        </el-descriptions-item>
        <el-descriptions-item label="内容条目">
          {{ genTarget?.totalCount }}
        </el-descriptions-item>
        <el-descriptions-item label="覆盖健康度">
          {{ genTarget?.healthScore }}%
        </el-descriptions-item>
      </el-descriptions>
      <div style="margin-top:16px">
        <el-checkbox-group v-model="genTypes">
          <el-checkbox value="knowledge">
            基础知识库（3篇）
          </el-checkbox>
          <el-checkbox value="classics">
            经典精华库（5条）
          </el-checkbox>
          <el-checkbox value="tutorial">
            玩法教程库（2篇）
          </el-checkbox>
        </el-checkbox-group>
      </div>
      <template #footer>
        <el-button @click="showGenDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="genLoading === 'target'"
          :disabled="genTypes.length === 0"
          @click="doGenerate"
        >
          开始生成
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, contentGenerationApi } from "@/api";
import PageHeader from "@/components/PageHeader.vue";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { buildCategoryTreePayload, readCategoryTree, readContentCategoryStats } from "@/utils/category-stats";
import type { ContentCategoryStat } from "@/utils/category-stats";

const router = useRouter();

const loading = ref(false);
const error = ref(false);
const search = ref("");
const categoryTree = ref<Record<string, string[]>>({});
const statRows = ref<ContentCategoryStat[]>([]);
const totalGeneratedToday = ref(0);
const autoFilling = ref(false);
const genLoading = ref("");
const showGenDialog = ref(false);
const genTarget = ref<ContentCategoryStat | null>(null);
const genTypes = ref(["knowledge"]);

const stats = computed(() => ({
  totalCategories: statRows.value.length,
  emptyCategories: statRows.value.filter((row) => row.totalCount === 0).length,
  lowContentCategories: statRows.value.filter((row) => row.totalCount > 0 && row.healthScore < 100).length,
}));
const totalContent = computed(() => statRows.value.reduce((sum, row) => sum + row.totalCount, 0));
const filteredStats = computed(() => {
  const q = search.value.trim().toLocaleLowerCase();
  if (!q) return statRows.value;
  return statRows.value.filter((row) => row.level1.toLocaleLowerCase().includes(q) || row.level2.toLocaleLowerCase().includes(q));
});

function rowKey(row: ContentCategoryStat) { return JSON.stringify([row.level1, row.level2]); }

onMounted(() => refresh());

async function refresh() {
  loading.value = true;
  error.value = false;
  try {
    const [treeRes, statsRes] = await Promise.all([
      contentGenerationApi.getCategories(),
      contentGenerationApi.getStats(),
    ]);
    categoryTree.value = readCategoryTree(treeRes.data);
    const data = readContentCategoryStats(statsRes.data);
    statRows.value = data.rows;
    totalGeneratedToday.value = data.totalGeneratedToday;
  } catch {
    error.value = true;
    statRows.value = [];
    totalGeneratedToday.value = 0;
  } finally { loading.value = false; }
}

function generateFor(row: ContentCategoryStat) {
  genTarget.value = row;
  genTypes.value = row.totalCount === 0 ? ["knowledge", "classics", "tutorial"] : ["knowledge"];
  showGenDialog.value = true;
}

async function doGenerate() {
  if (!genTarget.value || genTypes.value.length === 0) return;
  genLoading.value = "target";
  try {
    await contentGenerationApi.generate({
      categoryLevel1: genTarget.value.level1,
      categoryLevel2: genTarget.value.level2,
      types: genTypes.value,
    });
    ElMessage.success(`已触发「${genTarget.value.level1} / ${genTarget.value.level2}」内容生成`);
    showGenDialog.value = false;
    refresh();
  } finally { genLoading.value = ""; }
}

async function autoFillAll() {
  try {
    await ElMessageBox.confirm(
      `将为 ${stats.value.emptyCategories} 个空品类发起内容生成任务，可能产生 AI 调用费用。生成结果仍需按发布规则处理，是否继续？`,
      "批量生成确认",
      { type: "warning", confirmButtonText: "确认生成", cancelButtonText: "暂不生成" },
    );
  } catch { return; }
  autoFilling.value = true;
  try {
    await contentGenerationApi.autoFill();
    ElMessage.success("空品类自动填充已触发，内容将逐步生成");
    refresh();
  } finally { autoFilling.value = false; }
}

function viewContent(row: ContentCategoryStat) {
  // 真实联动：内容列表后端只支持 keyword（标题/作者 contains），不支持 level1/level2 参数
  // （content.dto.ts ContentListQueryDto 已核实）；此前带 level1/level2 跳转是假联动（列表不读也筛不了）。
  // 用 router.resolve 生成带应用 base 的地址（此前硬拼 /contents 会丢 BASE_URL 打开 404）。
  const href = router.resolve({ path: "/contents", query: { keyword: row.level2 } }).href;
  window.open(href, "_blank");
}

// ── 品类树编辑 ──
const showEditTree = ref(false);
const savingTree = ref(false);
const editTree = ref<Record<string, string[]>>({});
const editLevel1Names = ref<Record<string, string>>({});
const { isDirty: isTreeDirty, captureBaseline: captureTreeBaseline } = useUnsavedChanges(
  () => ({ tree: editTree.value, names: editLevel1Names.value }),
);

function openEditTree() {
  editTree.value = JSON.parse(JSON.stringify(categoryTree.value));
  editLevel1Names.value = {};
  for (const k of Object.keys(editTree.value)) {
    editLevel1Names.value[k] = k;
  }
  captureTreeBaseline();
  showEditTree.value = true;
}

function resetTreeEditor() {
  showEditTree.value = false;
  editTree.value = {};
  editLevel1Names.value = {};
  captureTreeBaseline();
}

async function requestCloseTree(done?: () => void) {
  if (savingTree.value) return;
  if (isTreeDirty.value) {
    try {
      await ElMessageBox.confirm("品类树有尚未保存的修改，关闭后将丢失。", "放弃品类修改？", {
        type: "warning", confirmButtonText: "放弃修改", cancelButtonText: "继续编辑",
      });
    } catch { return; }
  }
  resetTreeEditor();
  done?.();
}

function addSub(level1: string) {
  editTree.value[level1].push("新二级品类");
}

function removeSub(level1: string, idx: number) {
  editTree.value[level1].splice(idx, 1);
}

function addLevel1() {
  const name = "新品类";
  let n = 1;
  while (editTree.value[name + n]) n++;
  const key = name + n;
  editTree.value[key] = ["新二级品类"];
  editLevel1Names.value[key] = key;
}

function deleteLevel1(level1: string) {
  delete editTree.value[level1];
}

async function saveTree() {
  if (savingTree.value || !isTreeDirty.value) return;
  let finalTree: Record<string, string[]>;
  try {
    finalTree = buildCategoryTreePayload(editTree.value, editLevel1Names.value);
  } catch (cause) {
    ElMessage.warning(cause instanceof Error ? cause.message : "请检查品类名称");
    return;
  }
  // L3 影响预告：品类树是全平台内容归类与前台分类展示的依据
  const level1Count = Object.keys(finalTree).length;
  const level2Count = Object.values(finalTree).reduce((s, arr) => s + arr.length, 0);
  try {
    await ElMessageBox.confirm(
      `即将保存品类树（${level1Count} 个一级品类 / ${level2Count} 个二级品类）。品类树影响全平台内容归类与前台分类展示：删除或重命名品类不会迁移已归类内容，可能产生「无主内容」。确定保存？`,
      "保存品类树确认",
      { type: "warning", confirmButtonText: "确认保存" },
    );
  } catch { return; /* 用户取消 */ }
  savingTree.value = true;
  try {
    await api.put("/system/category-tree", finalTree);
    categoryTree.value = finalTree;
    ElMessage.success("品类树已更新");
    resetTreeEditor();
    refresh();
  } catch {
    ElMessage.error("品类树保存失败，请重试");
  } finally { savingTree.value = false; }
}

</script>

<style scoped>
.cat-page { padding: 0; }
.stat-card { background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 14px; padding: 18px 12px; margin-bottom: 12px; text-align: center; }
.stat-card .value { display: block; font-family: var(--font-family-number); font-size: 30px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.stat-card.warn .value { color: var(--color-warning); }
.stat-card.info .value { color: var(--color-info); }
.table-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.metric-note { margin: 6px 0 0; color: var(--color-text-secondary); font-size: 12px; font-weight: 400; line-height: 1.6; }
.unsaved-note { margin-right: 16px; color: var(--color-warning); font-size: 12px; }
@media (max-width: 760px) {
  .table-heading { align-items: flex-start; flex-direction: column; }
  .unsaved-note { display: block; margin: 0 0 10px; }
}
</style>
