<template>
  <div class="page">
    <div class="page-header">
      <h3>评价管理</h3>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="productTitle" label="商品" min-width="150" show-overflow-tooltip />
      <el-table-column prop="userName" label="用户" width="100" />
      <el-table-column label="评分" width="100">
        <template #default="{ row }">
          <el-rate :model-value="row.rating" disabled show-score text-color="#C9A96E" size="small" />
        </template>
      </el-table-column>
      <el-table-column prop="content" label="评价内容" min-width="200" show-overflow-tooltip />
      <el-table-column label="时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column prop="reply" label="商家回复" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.reply" style="color:#67C23A">{{ row.reply }}</span>
          <span v-else style="color:#ccc">暂未回复</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click="openReply(row)">{{ row.reply ? "修改回复" : "回复" }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      @current-change="fetchList"
      style="margin-top:16px;justify-content:flex-end"
    />

    <el-dialog v-model="replyDialog" title="回复评价" width="500px">
      <el-form label-width="80px">
        <el-form-item label="回复内容" required>
          <el-input v-model="replyContent" type="textarea" :rows="4" placeholder="请输入回复内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doReply">提交回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { merchantBackendApi } from "@/api";

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const saving = ref(false);
const replyDialog = ref(false);
const replyId = ref("");
const replyContent = ref("");

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const res = await merchantBackendApi.listReviews({ page: page.value, pageSize: 20 });
    const data = (res as any).data ?? res;
    list.value = data.list || data.data || [];
    total.value = data.total || 0;
  } finally { loading.value = false; }
}

function openReply(row: any) {
  replyId.value = row.id;
  replyContent.value = row.reply || "";
  replyDialog.value = true;
}

async function doReply() {
  if (!replyContent.value) { ElMessage.warning("请填写回复内容"); return; }
  saving.value = true;
  try {
    await merchantBackendApi.replyReview(replyId.value, { reply: replyContent.value });
    ElMessage.success("回复成功");
    replyDialog.value = false;
    fetchList();
  } catch { /* */ } finally { saving.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { margin-bottom: 16px; }
.page-header h3 { margin: 0; }
</style>
