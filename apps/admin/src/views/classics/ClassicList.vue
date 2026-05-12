<template>
  <div class="classic-page">
    <div class="header">
      <h2>古籍管理</h2>
      <el-button
        type="primary"
        @click="openEdit()"
      >
        添加古籍
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="books"
      border
      stripe
    >
      <el-table-column
        prop="title"
        label="书名"
        width="140"
      />
      <el-table-column
        prop="author"
        label="作者"
        width="120"
      />
      <el-table-column
        prop="dynasty"
        label="朝代"
        width="80"
      />
      <el-table-column
        label="分类"
        width="70"
      >
        <template #default="{ row }">
          {{ row.category }}
        </template>
      </el-table-column>
      <el-table-column
        prop="intro"
        label="简介"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        prop="chapterCount"
        label="章节"
        width="70"
      />
      <el-table-column
        prop="viewCount"
        label="阅读"
        width="80"
      />
      <el-table-column
        label="操作"
        width="180"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openChapters(row)"
          >
            章节
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
            @click="delBook(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingBook?.id ? '编辑古籍' : '添加古籍'"
      width="560px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item label="书名">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="form.author" />
        </el-form-item>
        <el-form-item label="朝代">
          <el-input v-model="form.dynasty" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category">
            <el-option
              label="经部"
              value="经"
            />
            <el-option
              label="史部"
              value="史"
            />
            <el-option
              label="子部"
              value="子"
            />
            <el-option
              label="集部"
              value="集"
            />
            <el-option
              label="佛教"
              value="释"
            />
            <el-option
              label="道教"
              value="道"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="封面">
          <ImageUpload v-model="form.cover" />
        </el-form-item>
        <el-form-item label="版本来源">
          <el-input v-model="form.source" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveBook"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 章节管理对话框 -->
    <el-dialog
      v-model="chapterVisible"
      title="章节管理"
      width="700px"
    >
      <el-table
        :data="chapters"
        border
        size="small"
        max-height="400"
      >
        <el-table-column
          prop="title"
          label="标题"
          width="180"
        />
        <el-table-column
          prop="content"
          label="原文"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          label="操作"
          width="120"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              @click="editChapter(row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="delChapter(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:12px">
        <el-button
          size="small"
          type="primary"
          @click="editChapter()"
        >
          添加章节
        </el-button>
      </div>
      <template #footer>
        <el-button @click="chapterVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>

    <!-- 章节编辑对话框 -->
    <el-dialog
      v-model="chEditVisible"
      :title="chForm.id ? '编辑章节' : '添加章节'"
      width="600px"
    >
      <el-form
        :model="chForm"
        label-width="80px"
      >
        <el-form-item label="标题">
          <el-input v-model="chForm.title" />
        </el-form-item>
        <el-form-item label="原文">
          <el-input
            v-model="chForm.content"
            type="textarea"
            :rows="6"
          />
        </el-form-item>
        <el-form-item label="译文">
          <el-input
            v-model="chForm.translation"
            type="textarea"
            :rows="4"
          />
        </el-form-item>
        <el-form-item label="注释">
          <el-input
            v-model="chForm.annotation"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="chEditVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveChapter"
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
import { classicApi } from "@/api";
import ImageUpload from "@/components/ImageUpload.vue";

const books = ref<any[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);
const editingBook = ref<any>({});

const form = reactive({ title: "", author: "", dynasty: "", category: "子", cover: "", source: "", intro: "" });

onMounted(() => fetchBooks());

async function fetchBooks() {
  loading.value = true;
  try {
    const { data } = await classicApi.list({ pageSize: 100 });
    books.value = data.books || data || [];
  } finally {
    loading.value = false;
  }
}

function openEdit(row?: any) {
  editingBook.value = row || {};
  if (row) {
    Object.assign(form, { title: row.title, author: row.author || "", dynasty: row.dynasty || "", category: row.category || "子", cover: row.cover || "", source: row.source || "", intro: row.intro || "" });
  } else {
    Object.assign(form, { title: "", author: "", dynasty: "", category: "子", cover: "", source: "", intro: "" });
  }
  dialogVisible.value = true;
}

async function saveBook() {
  if (!form.title.trim()) {
    ElMessage.warning("请输入书名");
    return;
  }
  saving.value = true;
  try {
    if (editingBook.value.id) {
      await classicApi.update(editingBook.value.id, { ...form });
      ElMessage.success("已更新");
    } else {
      await classicApi.create({ ...form });
      ElMessage.success("已添加");
    }
    dialogVisible.value = false;
    fetchBooks();
  } catch (e: any) {
    const msg = e.response?.data?.message;
  } finally {
    saving.value = false;
  }
}

function delBook(id: string) {
  ElMessageBox.confirm("确定删除？", "警告", { type: "warning" }).then(async () => {
    await classicApi.remove(id);
    fetchBooks();
    ElMessage.success("已删除");
  }).catch(() => {});
}

// ── 章节管理 ──
const chapterVisible = ref(false);
const chEditVisible = ref(false);
const chapters = ref<any[]>([]);
const currentBookId = ref("");
const chForm = reactive({ id: "", title: "", content: "", translation: "", annotation: "" });

async function openChapters(row: any) {
  currentBookId.value = row.id;
  const { data } = await classicApi.getChapters(row.id);
  chapters.value = data.chapters || [];
  chapterVisible.value = true;
}

function editChapter(row?: any) {
  if (row) {
    Object.assign(chForm, { id: row.id, title: row.title, content: row.content, translation: row.translation || "", annotation: row.annotation || "" });
  } else {
    Object.assign(chForm, { id: "", title: "", content: "", translation: "", annotation: "" });
  }
  chEditVisible.value = true;
}

async function saveChapter() {
  if (!chForm.title.trim() || !chForm.content.trim()) {
    ElMessage.warning("章节标题和原文不能为空");
    return;
  }
  saving.value = true;
  try {
    if (chForm.id) {
      await classicApi.updateChapter(chForm.id, { title: chForm.title, content: chForm.content, translation: chForm.translation, annotation: chForm.annotation });
    } else {
      await classicApi.addChapter(currentBookId.value, { title: chForm.title, content: chForm.content, translation: chForm.translation, annotation: chForm.annotation, sortOrder: chapters.value.length });
    }
    chEditVisible.value = false;
    ElMessage.success("已保存");
    openChapters({ id: currentBookId.value });
  } catch (e: any) {
    const msg = e.response?.data?.message;
  } finally {
    saving.value = false;
  }
}

async function delChapter(id: string) {
  ElMessageBox.confirm("确定删除？", "警告", { type: "warning" }).then(async () => {
    await classicApi.deleteChapter(id);
    openChapters({ id: currentBookId.value });
    ElMessage.success("已删除");
  }).catch(() => {});
}
</script>

<style scoped>
.classic-page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: #8b4513; }
</style>
