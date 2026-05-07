<template>
  <div>
    <div class="toolbar">
      <h3>内容管理</h3>
      <el-button type="primary" @click="$router.push('/contents/create')">新建内容</el-button>
    </div>
    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="title" label="标题" min-width="200" />
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">
          <el-tag>{{ typeLabels[row.type] ?? row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="author" label="作者" width="120" />
      <el-table-column prop="dynasty" label="朝代" width="100" />
      <el-table-column prop="viewCount" label="浏览" width="80" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="$router.push(`/contents/${row.id}/edit`)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="pageSize"
      layout="prev, pager, next"
      @current-change="fetchList"
      style="margin-top: 16px; justify-content: center"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { contentApi } from "../api";
import { ElMessageBox } from "element-plus";

const typeLabels: Record<string, string> = {
  ARTICLE: "文章",
  POEM: "诗词",
  CLASSIC: "经典",
};

const list = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const pageSize = 10;

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await contentApi.list({ page: page.value, pageSize });
    list.value = data.data;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function handleDelete(id: string) {
  await ElMessageBox.confirm("确定删除？", "提示", { type: "warning" });
  await contentApi.remove(id);
  fetchList();
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.toolbar h3 { margin: 0; }
</style>
