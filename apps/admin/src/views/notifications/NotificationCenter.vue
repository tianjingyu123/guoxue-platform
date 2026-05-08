<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import api from "../../api";

const notifications = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

// 发送表单
const sendForm = ref({ title: "", content: "", type: "SYSTEM", targetUserId: "", link: "" });
const showSend = ref(false);

// 批量发送表单
const batchForm = ref({ title: "", content: "", type: "SYSTEM", link: "" });
const showBatch = ref(false);

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
  const payload = { ...sendForm.value };
  if (!payload.targetUserId) delete payload.targetUserId;
  if (!payload.link) delete payload.link;
  await api.post("/notifications", payload);
  ElMessage.success("已发送");
  showSend.value = false;
  sendForm.value = { title: "", content: "", type: "SYSTEM", targetUserId: "", link: "" };
}

async function handleBatchSend() {
  const payload = { ...batchForm.value };
  if (!payload.link) delete payload.link;
  await api.post("/notifications/batch", payload);
  ElMessage.success("批量发送成功");
  showBatch.value = false;
  batchForm.value = { title: "", content: "", type: "SYSTEM", link: "" };
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm("确定删除该通知？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    await api.delete(`/notifications/${row.id}`);
    ElMessage.success("已删除");
    fetchList();
  } catch {
    // 取消或失败不处理
  }
}
</script>

<template>
  <div class="notification-page">
    <div class="toolbar">
      <h3>通知管理</h3>
      <div>
        <el-button @click="showBatch = true">批量发送</el-button>
        <el-button type="primary" @click="showSend = true">发送通知</el-button>
      </div>
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
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="page" :total="total" @change="fetchList" layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end" />

    <!-- 发送弹窗 -->
    <el-dialog v-model="showSend" title="发送通知" width="500px">
      <el-form :model="sendForm" label-width="100px">
        <el-form-item label="标题" required>
          <el-input v-model="sendForm.title" placeholder="通知标题" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="sendForm.content" type="textarea" :rows="3" placeholder="通知内容" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="sendForm.type">
            <el-option label="系统通知" value="SYSTEM" />
            <el-option label="圈子通知" value="CIRCLE" />
            <el-option label="个人通知" value="PERSONAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标用户">
          <el-input v-model="sendForm.targetUserId" placeholder="留空为发送给全部用户" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="sendForm.link" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSend = false">取消</el-button>
        <el-button type="primary" @click="handleSend">发送</el-button>
      </template>
    </el-dialog>

    <!-- 批量发送弹窗 -->
    <el-dialog v-model="showBatch" title="批量发送通知" width="500px">
      <el-form :model="batchForm" label-width="100px">
        <el-form-item label="标题" required>
          <el-input v-model="batchForm.title" placeholder="通知标题" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="batchForm.content" type="textarea" :rows="3" placeholder="通知内容" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="batchForm.type">
            <el-option label="系统通知" value="SYSTEM" />
            <el-option label="圈子通知" value="CIRCLE" />
            <el-option label="个人通知" value="PERSONAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="batchForm.link" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatch = false">取消</el-button>
        <el-button type="primary" @click="handleBatchSend">批量发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.notification-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; }
</style>
