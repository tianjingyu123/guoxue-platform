<template>
  <div class="cat-page">
    <div class="page-header">
      <h3>品类标签管理</h3>
      <div>
        <el-button
          type="success"
          :loading="autoFilling"
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
      </div>
    </div>

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
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.totalCategories }}</span><span class="label">二级品类总数</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card warn">
          <span class="value">{{ stats.emptyCategories }}</span><span class="label">空品类</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card info">
          <span class="value">{{ stats.lowContentCategories }}</span><span class="label">低内容(&lt;5篇)</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ totalPublished }}</span><span class="label">已发布内容</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ totalDraft }}</span><span class="label">草稿内容</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ Object.keys(categoryTree).length }}</span><span class="label">一级品类</span>
        </div>
      </el-col>
    </el-row>

    <!-- 品类表格 -->
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>品类健康度一览</span>
          <el-input
            v-model="search"
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
        row-key="key"
      >
        <template #empty>
          <el-empty description="暂无品类数据" />
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
                :percentage="row.total === 0 ? 0 : Math.min(100, Math.round(row.published / Math.max(row.total, 5) * 100))"
                :status="row.total === 0 ? 'exception' : row.total < 5 ? 'warning' : 'success'"
                :stroke-width="16"
                style="flex:1"
              />
              <el-tag
                v-if="row.total === 0"
                type="danger"
                size="small"
              >
                空
              </el-tag>
              <el-tag
                v-else-if="row.total < 5"
                type="warning"
                size="small"
              >
                不足
              </el-tag>
              <el-tag
                v-else
                type="success"
                size="small"
              >
                健康
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="已发布"
          width="90"
          prop="published"
          sortable
        />
        <el-table-column
          label="草稿"
          width="90"
          prop="draft"
          sortable
        />
        <el-table-column
          label="合计"
          width="90"
          prop="total"
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
      width="700px"
    >
      <div
        v-for="(subs, level1) in editTree"
        :key="level1"
        style="margin-bottom:16px;padding:12px;background:var(--color-bg-page);border-radius:8px"
      >
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <el-input
            v-model="editLevel1Names[level1]"
            size="small"
            style="width:140px;font-weight:600"
          />
          <el-button
            size="small"
            type="danger"
            circle
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
              size="small"
              style="width:100px;border:none"
            />
          </el-tag>
          <el-button
            size="small"
            type="primary"
            circle
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
        <el-button @click="showEditTree = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="savingTree"
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
      width="500px"
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
        <el-descriptions-item label="已发布">
          {{ genTarget?.published }}
        </el-descriptions-item>
        <el-descriptions-item label="草稿">
          {{ genTarget?.draft }}
        </el-descriptions-item>
      </el-descriptions>
      <div style="margin-top:16px">
        <el-checkbox-group v-model="genTypes">
          <el-checkbox label="knowledge">
            基础知识库（3篇）
          </el-checkbox>
          <el-checkbox label="classics">
            经典精华库（5条）
          </el-checkbox>
          <el-checkbox label="tutorial">
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
          @click="doGenerate"
        >
          开始生成
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, contentGenerationApi, systemApi } from "@/api";

const router = useRouter();

// 品类健康度行（字段宽松 optional）
interface StatRow {
  key?: string;
  level1: string;
  level2: string;
  published: number;
  draft: number;
  total: number;
}

const loading = ref(false);
const error = ref(false);
const search = ref("");
const categoryTree = ref<Record<string, string[]>>({});
const stats = reactive({ totalCategories: 0, emptyCategories: 0, lowContentCategories: 0 });
const statRows = ref<StatRow[]>([]);
const autoFilling = ref(false);
const genLoading = ref("");
const showGenDialog = ref(false);
const genTarget = ref<StatRow | null>(null);
const genTypes = ref(["knowledge"]);

const totalPublished = computed(() => statRows.value.reduce((s: number, r: StatRow) => s + r.published, 0));
const totalDraft = computed(() => statRows.value.reduce((s: number, r: StatRow) => s + r.draft, 0));
const filteredStats = computed(() => {
  if (!search.value) return statRows.value;
  const q = search.value.toLowerCase();
  return statRows.value.filter((r: StatRow) => r.level1.includes(q) || r.level2.includes(q));
});

function rowKey(r: StatRow) { return `${r.level1}/${r.level2}`; }

onMounted(() => refresh());

async function refresh() {
  loading.value = true;
  error.value = false;
  try {
    const [treeRes, statsRes] = await Promise.all([
      systemApi.listConfigs(),
      contentGenerationApi.getStats(),
    ]);

    // 尝试从配置中读取品类树
    // axios 响应 data 无类型来源
    const configs: { configKey?: string; configValue?: string }[] = (treeRes.data as any)?.configs || [];
    const catCfg = configs.find((c) => c.configKey === "category_tree");
    if (catCfg?.configValue) {
      try { categoryTree.value = JSON.parse(catCfg.configValue); } catch { /* fallback */ }
    }

    // 如果配置中没有，从 content-generation 获取
    if (!Object.keys(categoryTree.value).length) {
      try {
        const catRes = await contentGenerationApi.getCategories();
        categoryTree.value = catRes.data as any;
      } catch { /* ignore */ }
    }

    const d = statsRes.data as any;
    stats.totalCategories = d?.totalCategories || 0;
    stats.emptyCategories = d?.emptyCategories || 0;
    stats.lowContentCategories = d?.lowContentCategories || 0;
    statRows.value = d?.stats || [];
  } catch {
    error.value = true;
    statRows.value = [];
  } finally { loading.value = false; }
}

function generateFor(row: StatRow) {
  genTarget.value = row;
  genTypes.value = row.total === 0 ? ["knowledge", "classics", "tutorial"] : ["knowledge"];
  showGenDialog.value = true;
}

async function doGenerate() {
  if (!genTarget.value || genTypes.value.length === 0) return;
  genLoading.value = "target";
  try {
    await contentGenerationApi.generate({
      categoryLevel1: genTarget.value.level1,
      categoryLevel2: genTarget.value.level2,
      types: genTypes.value as any,
    });
    ElMessage.success(`已触发「${genTarget.value.level1} / ${genTarget.value.level2}」内容生成`);
    showGenDialog.value = false;
    refresh();
  } finally { genLoading.value = ""; }
}

async function autoFillAll() {
  autoFilling.value = true;
  try {
    await contentGenerationApi.autoFill();
    ElMessage.success("空品类自动填充已触发，内容将逐步生成");
    refresh();
  } finally { autoFilling.value = false; }
}

function viewContent(row: StatRow) {
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

function openEditTree() {
  editTree.value = JSON.parse(JSON.stringify(categoryTree.value));
  editLevel1Names.value = {};
  for (const k of Object.keys(editTree.value)) {
    editLevel1Names.value[k] = k;
  }
  showEditTree.value = true;
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
  // 处理一级品类重命名
  const finalTree: Record<string, string[]> = {};
  for (const [oldKey, subs] of Object.entries(editTree.value)) {
    const newName = editLevel1Names.value[oldKey] || oldKey;
    finalTree[newName] = subs.filter((s) => s.trim());
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
    showEditTree.value = false;
    refresh();
  } catch {
    ElMessage.error("品类树保存失败，请重试");
  } finally { savingTree.value = false; }
}

</script>

<style scoped>
.cat-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 26px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.stat-card.warn .value { color: var(--color-warning); }
.stat-card.info .value { color: var(--color-info); }
</style>
