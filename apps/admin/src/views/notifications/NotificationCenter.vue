<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import api from "../../api";

const notifications = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

// 发送表单
const sendForm = ref({ userId: "", type: "SYSTEM", title: "", content: "", targetType: "", targetId: "" });
const showSend = ref(false);

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await api.get("/notifications", { params: { page: page.value, pageSize: 20 } });
    notifications.value = data.notifications;
    total.value = data.total;
  } finally { loading.value = false; }
}

async function handleSend() {
  await api.post("/notifications", sendForm.value);
  ElMessage.success("已发送");
  showSend.value = false;
  sendForm.value = { userId: "", type: "SYSTEM", title: "", content: "", targetType: "", targetId: "" };
}
</script>

<template>
  <div class="notification-page">
    <div class="toolbar">
      <h3>通知管理</h3>
      <el-button type="primary" @click="showSend = true">发送通知</el-button>
    </div>

    <el-table :data="notifications" v-loading="loading" stripe>
      <el-table-column label="类型" width="100">
        <template #default="{ row }"><el-tag size="small">{{ row.type }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" />
      <el-table-column prop="content" label="内容" min-width="250" show-overflow-tooltip />
      <el-table-column label="已读" width="70">
        <template #default="{ row }">{{ row.isRead ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="page" :total="total" @change="fetchList" layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end" />

    <!-- 发送弹窗 -->
    <el-dialog v-model="showSend" title="发送通知" width="500px">
      <el-form :model="sendForm" label-width="80px">
        <el-form-item label="用户ID" required>
          <el-input v-model="sendForm.userId" placeholder="接收用户ID" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="sendForm.type">
            <el-option label="系统通知" value="SYSTEM" />
            <el-option label="评论通知" value="COMMENT" />
            <el-option label="点赞通知" value="LIKE" />
            <el-option label="关注通知" value="FOLLOW" />
            <el-option label="购买通知" value="PURCHASE" />
            <el-option label="收益通知" value="EARNING" />
            <el-option label="审核通知" value="AUDIT" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="sendForm.title" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="sendForm.content" type="textarea" :rows="3" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="跳转类型">
              <el-input v-model="sendForm.targetType" placeholder="可选" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="跳转ID">
              <el-input v-model="sendForm.targetId" placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showSend = false">取消</el-button>
        <el-button type="primary" @click="handleSend">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.notification-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; }
</style>
