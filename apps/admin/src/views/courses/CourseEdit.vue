<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { courseApi } from "../../api";

const route = useRoute();
const router = useRouter();
const isEdit = ref(!!route.params.id);
const courseId = route.params.id as string;

const form = reactive({
  title: "",
  cover: "",
  intro: "",
  type: "VIDEO" as string,
  price: 0,
  originalPrice: undefined as number | undefined,
});

const chapters = ref<any[]>([]);
const saving = ref(false);

const chapterForm = reactive({
  title: "",
  content: "",
  mediaUrl: "",
  duration: undefined as number | undefined,
  freeTrial: false,
  sortOrder: 0,
});
const chapterDialog = ref(false);
const editingChapter = ref<any>(null);

onMounted(async () => {
  if (isEdit.value) {
    const { data } = await courseApi.detail(courseId);
    Object.assign(form, data);
    await loadChapters();
  }
});

async function loadChapters() {
  const { data } = await courseApi.getChapters(courseId);
  chapters.value = data;
}

async function save() {
  saving.value = true;
  try {
    if (isEdit.value) {
      await courseApi.update(courseId, form);
    } else {
      const { data } = await courseApi.create(form);
      router.replace(`/courses/${data.id}/edit`);
      isEdit.value = true;
    }
    ElMessage.success("保存成功");
  } finally {
    saving.value = false;
  }
}

function openChapterDialog(ch?: any) {
  if (ch) {
    editingChapter.value = ch;
    Object.assign(chapterForm, ch);
  } else {
    editingChapter.value = null;
    Object.assign(chapterForm, { title: "", content: "", mediaUrl: "", duration: undefined, freeTrial: false, sortOrder: chapters.value.length + 1 });
  }
  chapterDialog.value = true;
}

async function saveChapter() {
  if (!isEdit.value) {
    await save();
  }
  if (editingChapter.value) {
    await courseApi.updateChapter(courseId, editingChapter.value.id, chapterForm);
  } else {
    await courseApi.addChapter(courseId, chapterForm);
  }
  chapterDialog.value = false;
  ElMessage.success("章节已保存");
  await loadChapters();
}

async function deleteChapter(chapterId: string) {
  await courseApi.deleteChapter(courseId, chapterId);
  ElMessage.success("已删除");
  await loadChapters();
}

async function handleDelete() {
  await courseApi.remove(courseId);
  ElMessage.success("已删除课程");
  router.push("/courses");
}
</script>

<template>
  <div class="course-edit">
    <el-page-header @back="router.push('/courses')" title="返回" style="margin-bottom:16px">
      <template #content>{{ isEdit ? '编辑课程' : '新建课程' }}</template>
    </el-page-header>

    <el-card>
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="课程标题" />
        </el-form-item>
        <el-form-item label="封面">
          <el-input v-model="form.cover" placeholder="封面图URL" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.intro" type="textarea" :rows="3" placeholder="课程简介" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="类型">
              <el-select v-model="form.type">
                <el-option label="视频" value="VIDEO" />
                <el-option label="音频" value="AUDIO" />
                <el-option label="文本" value="TEXT" />
                <el-option label="电子书" value="EBOOK" />
                <el-option label="组合" value="COMBO" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="价格">
              <el-input-number v-model="form.price" :min="0" :precision="2" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="原价">
              <el-input-number v-model="form.originalPrice" :min="0" :precision="2" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" @click="save" :loading="saving">保存课程</el-button>
          <el-button v-if="isEdit" type="danger" @click="handleDelete">删除课程</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 章节管理（仅编辑模式） -->
    <el-card v-if="isEdit" style="margin-top:16px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>章节管理 ({{ chapters.length }})</span>
          <el-button type="primary" size="small" @click="openChapterDialog()">添加章节</el-button>
        </div>
      </template>
      <el-table :data="chapters" stripe>
        <el-table-column label="排序" width="60" prop="sortOrder" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">{{ row.mediaUrl ? '视频' : row.content ? '文本' : '-' }}</template>
        </el-table-column>
        <el-table-column label="时长" width="80">
          <template #default="{ row }">{{ row.duration ? row.duration + '分' : '-' }}</template>
        </el-table-column>
        <el-table-column label="试看" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.freeTrial" type="success" size="small">免费</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="openChapterDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteChapter(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 章节编辑弹窗 -->
    <el-dialog v-model="chapterDialog" :title="editingChapter ? '编辑章节' : '添加章节'" width="560px">
      <el-form :model="chapterForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="chapterForm.title" placeholder="章节标题" />
        </el-form-item>
        <el-form-item label="媒体URL">
          <el-input v-model="chapterForm.mediaUrl" placeholder="视频/音频URL" />
        </el-form-item>
        <el-form-item label="文本内容">
          <el-input v-model="chapterForm.content" type="textarea" :rows="4" placeholder="文本内容" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="时长(分)">
              <el-input-number v-model="chapterForm.duration" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序">
              <el-input-number v-model="chapterForm.sortOrder" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="免费试看">
              <el-switch v-model="chapterForm.freeTrial" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="chapterDialog = false">取消</el-button>
        <el-button type="primary" @click="saveChapter">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.course-edit { padding: 16px; }
</style>
