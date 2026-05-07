<template>
  <div>
    <h3>{{ isEdit ? "编辑内容" : "新建内容" }}</h3>
    <el-form :model="form" label-width="80px" style="max-width: 800px">
      <el-form-item label="标题">
        <el-input v-model="form.title" />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="form.type">
          <el-option label="文章" value="ARTICLE" />
          <el-option label="诗词" value="POEM" />
          <el-option label="经典" value="CLASSIC" />
        </el-select>
      </el-form-item>
      <el-form-item label="作者">
        <el-input v-model="form.author" />
      </el-form-item>
      <el-form-item label="朝代">
        <el-input v-model="form.dynasty" />
      </el-form-item>
      <el-form-item label="摘要">
        <el-input v-model="form.excerpt" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="正文">
        <el-input v-model="form.body" type="textarea" :rows="12" />
      </el-form-item>
      <el-form-item label="标签">
        <el-input v-model="tagsStr" placeholder="逗号分隔" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
        <el-button @click="$router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { contentApi } from "../api";
import { ElMessage } from "element-plus";

const route = useRoute();
const router = useRouter();
const id = route.params.id as string | undefined;
const isEdit = !!id;
const saving = ref(false);

const form = ref({
  title: "",
  type: "ARTICLE" as string,
  author: "",
  dynasty: "",
  excerpt: "",
  body: "",
});

const tagsStr = ref("");

onMounted(async () => {
  if (isEdit && id) {
    const { data } = await contentApi.detail(id);
    form.value = data;
    tagsStr.value = (data.tags ?? []).join(",");
  }
});

async function handleSave() {
  saving.value = true;
  try {
    const payload = {
      ...form.value,
      tags: tagsStr.value ? tagsStr.value.split(",").map((t) => t.trim()) : [],
    };
    if (isEdit && id) {
      await contentApi.update(id, payload);
    } else {
      await contentApi.create(payload);
    }
    ElMessage.success("保存成功");
    router.push("/contents");
  } finally {
    saving.value = false;
  }
}
</script>
