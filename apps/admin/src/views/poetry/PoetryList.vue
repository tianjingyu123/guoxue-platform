<template>
  <div class="poetry-page">
    <PageHeader title="诗词管理">
      <template #actions>
        <el-button
          type="primary"
          @click="openEdit()"
        >
          添加诗词
        </el-button>
      </template>
    </PageHeader>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索标题/作者/正文"
        clearable
        style="width: 220px"
        @keyup.enter="reload"
        @clear="reload"
      />
      <el-select
        v-model="filters.status"
        placeholder="全部状态"
        clearable
        style="width: 140px"
        @change="reload"
      >
        <el-option
          label="已发布"
          value="PUBLISHED"
        />
        <el-option
          label="草稿"
          value="DRAFT"
        />
        <el-option
          label="已隐藏"
          value="HIDDEN"
        />
      </el-select>
      <el-select
        v-model="filters.categoryId"
        placeholder="全部分类"
        clearable
        style="width: 160px"
        @change="reload"
      >
        <el-option
          v-for="c in categories"
          :key="c.id"
          :label="c.name"
          :value="c.id"
        />
      </el-select>
      <el-select
        v-model="filters.dynasty"
        placeholder="全部朝代"
        clearable
        filterable
        allow-create
        default-first-option
        style="width: 140px"
        @change="reload"
      >
        <el-option
          v-for="d in dynastyOptions"
          :key="d"
          :label="d"
          :value="d"
        />
      </el-select>
      <el-button @click="reload">
        查询
      </el-button>
    </div>

    <!-- 错误态 -->
    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      :sub-title="error"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchPoems"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-table
      v-else
      v-loading="loading"
      :data="poems"
      border
      stripe
    >
      <template #empty>
        <el-empty
          description="暂无诗词"
          :image-size="80"
        />
      </template>
      <el-table-column
        prop="title"
        label="标题"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="author"
        label="作者"
        width="110"
      />
      <el-table-column
        prop="dynasty"
        label="朝代"
        width="80"
      />
      <el-table-column
        prop="form"
        label="体裁"
        width="100"
      >
        <template #default="{ row }">
          {{ row.form || "—" }}
        </template>
      </el-table-column>
      <el-table-column
        label="分类"
        width="110"
      >
        <template #default="{ row }">
          {{ categoryName(row.categoryId) }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="推荐"
        width="70"
        align="center"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.isRecommended"
            type="warning"
            size="small"
          >
            荐
          </el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="每日一首"
        width="90"
        align="center"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.isToday"
            type="success"
            size="small"
          >
            今
          </el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="sortOrder"
        label="排序"
        width="70"
      />
      <el-table-column
        label="操作"
        width="160"
        fixed="right"
      >
        <template #default="{ row }">
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
            @click="delPoem(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="!error"
      class="pager"
    >
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="fetchPoems"
        @size-change="reload"
      />
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing.id ? '编辑诗词' : '添加诗词'"
      width="680px"
      top="6vh"
    >
      <el-form
        :model="form"
        label-width="84px"
      >
        <el-form-item
          label="标题"
          required
        >
          <el-input v-model="form.title" />
        </el-form-item>
        <div class="form-row">
          <el-form-item
            label="作者"
            required
          >
            <el-input v-model="form.author" />
          </el-form-item>
          <el-form-item
            label="朝代"
            required
          >
            <el-input
              v-model="form.dynasty"
              placeholder="如 唐 / 宋"
            />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="体裁">
            <el-input
              v-model="form.form"
              placeholder="如 五言绝句"
            />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number
              v-model="form.sortOrder"
              :min="0"
              controls-position="right"
            />
          </el-form-item>
        </div>
        <el-form-item
          label="正文"
          required
        >
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            placeholder="多句以换行分隔"
          />
        </el-form-item>
        <div class="form-row">
          <el-form-item label="分类">
            <el-select
              v-model="form.categoryId"
              clearable
              placeholder="选择分类"
            >
              <el-option
                v-for="c in categories"
                :key="c.id"
                :label="c.name"
                :value="c.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="合集">
            <el-select
              v-model="form.collectionId"
              clearable
              filterable
              placeholder="选择合集"
            >
              <el-option
                v-for="c in collections"
                :key="c.id"
                :label="c.title"
                :value="c.id"
              />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="译文">
          <el-input
            v-model="form.translation"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="赏析">
          <el-input
            v-model="form.appreciation"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="AI赏析">
          <el-input
            v-model="form.aiAppreciation"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <div class="form-row">
          <el-form-item label="作者简介">
            <el-input v-model="form.authorIntro" />
          </el-form-item>
          <el-form-item label="生卒年">
            <el-input v-model="form.authorYears" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="作者头衔">
            <el-input v-model="form.authorTitle" />
          </el-form-item>
          <el-form-item label="封面">
            <CosImageUpload v-model="form.cover" />
          </el-form-item>
        </div>
        <el-form-item label="标签">
          <el-input
            v-model="tagsText"
            placeholder="多个标签以逗号分隔"
          />
        </el-form-item>
        <div class="form-row">
          <el-form-item label="状态">
            <el-select v-model="form.status">
              <el-option
                label="草稿"
                value="DRAFT"
              />
              <el-option
                label="已发布"
                value="PUBLISHED"
              />
              <el-option
                label="已隐藏"
                value="HIDDEN"
              />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="首页推荐">
            <el-switch v-model="form.isRecommended" />
          </el-form-item>
          <el-form-item label="每日一首">
            <el-switch v-model="form.isToday" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="savePoem"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { poetryAdminApi } from "@/api";
import PageHeader from "@/components/PageHeader.vue";
import CosImageUpload from "@/components/upload/CosImageUpload.vue";

/** 诗词行/表单字段（宽松 optional，按模板与脚本访问声明） */
interface PoemRow {
  id?: string;
  title?: string;
  author?: string;
  dynasty?: string;
  content?: string;
  form?: string;
  translation?: string;
  appreciation?: string;
  aiAppreciation?: string;
  authorIntro?: string;
  authorYears?: string;
  authorTitle?: string;
  categoryId?: string;
  collectionId?: string;
  cover?: string;
  tags?: string[];
  isRecommended?: boolean;
  isToday?: boolean;
  status?: string;
  sortOrder?: number;
}
/** 编辑表单（字段均有默认值，故为必填） */
interface PoemForm {
  title: string; author: string; dynasty: string; content: string;
  form: string; translation: string; appreciation: string; aiAppreciation: string;
  authorIntro: string; authorYears: string; authorTitle: string;
  categoryId: string; collectionId: string; cover: string;
  isRecommended: boolean; isToday: boolean; status: string; sortOrder: number;
}
interface PoetryCategoryOption { id: string; name: string }
interface PoetryCollectionOption { id: string; title: string }
/** axios 错误对象（无类型来源，本地声明） */
interface ApiError { response?: { data?: { message?: string } }; message?: string }

const poems = ref<PoemRow[]>([]);
const categories = ref<PoetryCategoryOption[]>([]);
const collections = ref<PoetryCollectionOption[]>([]);
const loading = ref(false);
const error = ref("");
const submitting = ref(false);

const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const filters = reactive({ keyword: "", status: "", categoryId: "", dynasty: "" });
const dynastyOptions = ["先秦", "汉", "魏晋", "南北朝", "隋", "唐", "五代", "宋", "元", "明", "清", "近现代"];

const dialogVisible = ref(false);
const editing = ref<PoemRow>({});
const tagsText = ref("");
const form = reactive<PoemForm>({
  title: "", author: "", dynasty: "", content: "",
  form: "", translation: "", appreciation: "", aiAppreciation: "",
  authorIntro: "", authorYears: "", authorTitle: "",
  categoryId: "", collectionId: "", cover: "",
  isRecommended: false, isToday: false, status: "DRAFT", sortOrder: 0,
});

onMounted(() => { fetchOptions(); fetchPoems(); });

function statusLabel(s: string) {
  return s === "PUBLISHED" ? "已发布" : s === "HIDDEN" ? "已隐藏" : "草稿";
}
function statusTag(s: string) {
  return s === "PUBLISHED" ? "success" : s === "HIDDEN" ? "info" : "warning";
}
function categoryName(id: string) {
  if (!id) return "—";
  return categories.value.find((c) => c.id === id)?.name || "—";
}

async function fetchOptions() {
  try {
    const { data } = await poetryAdminApi.listCategories();
    categories.value = data || [];
  } catch { /* 选项加载失败不阻塞主表 */ }
  try {
    const { data } = await poetryAdminApi.listCollections({ page: 1, pageSize: 200 });
    collections.value = data?.items || [];
  } catch { /* 选项加载失败不阻塞主表 */ }
}

function reload() {
  page.value = 1;
  fetchPoems();
}

async function fetchPoems() {
  loading.value = true;
  error.value = "";
  try {
    const params: { page: number; pageSize: number; status?: string; categoryId?: string; dynasty?: string; keyword?: string } = { page: page.value, pageSize: pageSize.value };
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.status) params.status = filters.status;
    if (filters.categoryId) params.categoryId = filters.categoryId;
    if (filters.dynasty) params.dynasty = filters.dynasty;
    const { data } = await poetryAdminApi.listPoems(params);
    poems.value = data?.items || [];
    total.value = data?.total || 0;
  } catch (e) {
    error.value = (e as ApiError)?.response?.data?.message || (e as ApiError)?.message || "加载诗词列表失败";
  } finally {
    loading.value = false;
  }
}

function openEdit(row?: PoemRow) {
  editing.value = row || {};
  if (row) {
    Object.assign(form, {
      title: row.title || "", author: row.author || "", dynasty: row.dynasty || "",
      content: row.content || "", form: row.form || "",
      translation: row.translation || "", appreciation: row.appreciation || "",
      aiAppreciation: row.aiAppreciation || "", authorIntro: row.authorIntro || "",
      authorYears: row.authorYears || "", authorTitle: row.authorTitle || "",
      categoryId: row.categoryId || "", collectionId: row.collectionId || "",
      cover: row.cover || "", isRecommended: !!row.isRecommended, isToday: !!row.isToday,
      status: row.status || "DRAFT", sortOrder: row.sortOrder ?? 0,
    });
    tagsText.value = Array.isArray(row.tags) ? row.tags.join(", ") : "";
  } else {
    Object.assign(form, {
      title: "", author: "", dynasty: "", content: "", form: "",
      translation: "", appreciation: "", aiAppreciation: "",
      authorIntro: "", authorYears: "", authorTitle: "",
      categoryId: "", collectionId: "", cover: "",
      isRecommended: false, isToday: false, status: "DRAFT", sortOrder: 0,
    });
    tagsText.value = "";
  }
  dialogVisible.value = true;
}

async function savePoem() {
  if (submitting.value) return;
  if (!form.title.trim() || !form.author.trim() || !form.dynasty.trim() || !form.content.trim()) {
    ElMessage.warning("标题、作者、朝代、正文为必填项");
    return;
  }
  submitting.value = true;
  try {
    const payload: Record<string, unknown> = { ...form };
    payload.tags = tagsText.value.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    if (!payload.categoryId) payload.categoryId = null;
    if (!payload.collectionId) payload.collectionId = null;
    if (editing.value.id) {
      await poetryAdminApi.updatePoem(editing.value.id, payload);
      ElMessage.success("已更新");
    } else {
      await poetryAdminApi.createPoem(payload);
      ElMessage.success("已添加");
    }
    dialogVisible.value = false;
    fetchPoems();
  } catch (e) {
    ElMessage.error((e as ApiError)?.response?.data?.message || "保存失败");
  } finally {
    submitting.value = false;
  }
}

function delPoem(id: string) {
  ElMessageBox.confirm("确定删除该诗词？", "警告", { type: "warning" })
    .then(async () => {
      try {
        await poetryAdminApi.deletePoem(id);
        ElMessage.success("已删除");
        fetchPoems();
      } catch (e) {
        ElMessage.error((e as ApiError)?.response?.data?.message || "删除失败");
      }
    })
    .catch(() => {});
}
</script>

<style scoped>
.poetry-page { padding: 0; }
.filter-bar {
  display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;
}
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
.form-row { display: flex; gap: 16px; }
.form-row :deep(.el-form-item) { flex: 1; }
</style>
