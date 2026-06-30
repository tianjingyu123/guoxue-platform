<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { notificationApi } from "@/api";

const notifications = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const loadError = ref(false);
const sending = ref(false);
const batchSending = ref(false);
const deleting = ref(false);

// 发送表单
const sendForm = ref({ title: "", content: "", type: "SYSTEM", targetUserId: "", link: "" });
const showSend = ref(false);

// 批量发送表单
const batchForm = ref({ title: "", content: "", type: "SYSTEM", link: "" });
const showBatch = ref(false);

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await notificationApi.list({ page: page.value, pageSize: 20 });
    notifications.value = data.notifications;
    total.value = data.total;
  } catch { loadError.value = true; } finally { loading.value = false; }
}

async function handleSend() {
  if (sending.value) return;
  const payload = {
    type: sendForm.value.type,
    title: sendForm.value.title,
    content: sendForm.value.content,
    ...(sendForm.value.targetUserId ? { userId: sendForm.value.targetUserId } : {}),
    ...(sendForm.value.link ? { targetType: "LINK" as const, targetId: sendForm.value.link } : {}),
  };
  sending.value = true;
  try {
    await notificationApi.send(payload);
    ElMessage.success("已发送");
    showSend.value = false;
    sendForm.value = { title: "", content: "", type: "SYSTEM", targetUserId: "", link: "" };
  } finally {
    sending.value = false;
  }
}

async function handleBatchSend() {
  if (batchSending.value) return;
  const payload = {
    userIds: [] as string[],
    type: batchForm.value.type,
    title: batchForm.value.title,
    content: batchForm.value.content,
    ...(batchForm.value.link ? { targetType: "LINK" as const, targetId: batchForm.value.link } : {}),
  };
  batchSending.value = true;
  try {
    await notificationApi.batchSend(payload);
    ElMessage.success("批量发送成功");
    showBatch.value = false;
    batchForm.value = { title: "", content: "", type: "SYSTEM", link: "" };
  } finally {
    batchSending.value = false;
  }
}

async function handleDelete(row: any) {
  if (deleting.value) return;
  try {
    await ElMessageBox.confirm("确定删除该通知？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    deleting.value = true;
    await notificationApi.delete(row.id);
    ElMessage.success("已删除");
    fetchList();
  } catch {
    // 取消或失败不处理
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="notification-page">
    <div class="toolbar">
      <h3>通知管理</h3>
      <div>
        <el-button @click="showBatch = true">
          批量发送
        </el-button>
        <el-button
          type="primary"
          @click="showSend = true"
        >
          发送通知
        </el-button>
      </div>
    </div>

    <el-result
      v-if="loadError && !loading"
      icon="error"
      title="加载失败"
      sub-title="请检查网络后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-table
      v-show="!loadError"
      v-loading="loading"
      :data="notifications"
      stripe
    >
      <el-table-column
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="标题"
        min-width="200"
      />
      <el-table-column
        prop="content"
        label="内容"
        min-width="250"
        show-overflow-tooltip
      />
      <el-table-column
        label="已读"
        width="70"
      >
        <template #default="{ row }">
          {{ row.isRead ? '是' : '否' }}
        </template>
      </el-table-column>
      <el-table-column
        label="时间"
        width="170"
      >
        <template #default="{ row }">
          {{ new Date(row.createdAt).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="100"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="danger"
            :loading="deleting"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          description="暂无通知"
          :image-size="80"
        />
      </template>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @change="fetchList"
    />

    <!-- 发送弹窗 -->
    <el-dialog
      v-model="showSend"
      title="发送通知"
      width="500px"
    >
      <el-form
        :model="sendForm"
        label-width="100px"
      >
        <el-form-item
          label="标题"
          required
        >
          <el-input
            v-model="sendForm.title"
            placeholder="通知标题"
          />
        </el-form-item>
        <el-form-item
          label="内容"
          required
        >
          <el-input
            v-model="sendForm.content"
            type="textarea"
            :rows="3"
            placeholder="通知内容"
          />
        </el-form-item>
        <el-form-item
          label="类型"
          required
        >
          <el-select v-model="sendForm.type">
            <el-option
              label="系统通知"
              value="SYSTEM"
            />
            <el-option
              label="圈子通知"
              value="CIRCLE"
            />
            <el-option
              label="个人通知"
              value="PERSONAL"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标用户">
          <el-input
            v-model="sendForm.targetUserId"
            placeholder="留空为发送给全部用户"
          />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input
            v-model="sendForm.link"
            placeholder="可选"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSend = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="sending"
          @click="handleSend"
        >
          发送
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量发送弹窗 -->
    <el-dialog
      v-model="showBatch"
      title="批量发送通知"
      width="500px"
    >
      <el-form
        :model="batchForm"
        label-width="100px"
      >
        <el-form-item
          label="标题"
          required
        >
          <el-input
            v-model="batchForm.title"
            placeholder="通知标题"
          />
        </el-form-item>
        <el-form-item
          label="内容"
          required
        >
          <el-input
            v-model="batchForm.content"
            type="textarea"
            :rows="3"
            placeholder="通知内容"
          />
        </el-form-item>
        <el-form-item
          label="类型"
          required
        >
          <el-select v-model="batchForm.type">
            <el-option
              label="系统通知"
              value="SYSTEM"
            />
            <el-option
              label="圈子通知"
              value="CIRCLE"
            />
            <el-option
              label="个人通知"
              value="PERSONAL"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input
            v-model="batchForm.link"
            placeholder="可选"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatch = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="batchSending"
          @click="handleBatchSend"
        >
          批量发送
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.notification-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; }
</style>
