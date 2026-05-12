<template>
  <div class="page">
    <div class="header">
      <h2>视频管理</h2>
      <div style="display:flex;gap:8px">
        <el-select
          v-model="statusFilter"
          placeholder="状态筛选"
          clearable
          style="width:120px"
          @change="fetchList"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="待审核"
            value="PENDING"
          />
          <el-option
            label="已发布"
            value="PUBLISHED"
          />
          <el-option
            label="已下架"
            value="REMOVED"
          />
        </el-select>
        <el-button
          type="primary"
          @click="openCreate()"
        >
          添加视频
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        prop="title"
        label="标题"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="user.nickname"
        label="作者"
        width="100"
      />
      <el-table-column
        prop="duration"
        label="时长"
        width="80"
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'PUBLISHED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'info'"
            size="small"
          >
            {{ row.status === 'PUBLISHED' ? '已发布' : row.status === 'PENDING' ? '待审核' : row.status === 'REMOVED' ? '已下架' : row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="likeCount"
        label="点赞"
        width="70"
      />
      <el-table-column
        prop="createdAt"
        label="发布时间"
        width="170"
      >
        <template #default="{ row }">
          {{ row.createdAt?.slice(0,16).replace('T',' ') }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="220"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="viewDetail(row)"
          >
            详情
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
            @click="del(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="detailVisible"
      title="视频详情"
      width="600px"
    >
      <div
        v-if="detail"
        class="detail"
      >
        <video
          v-if="detail.url"
          :src="detail.url"
          controls
          style="width:100%;max-height:360px;border-radius:8px;margin-bottom:12px"
        />
        <p><b>标题：</b>{{ detail.title }}</p>
        <p><b>作者：</b>{{ detail.user?.nickname }}</p>
        <p><b>时长：</b>{{ detail.duration || '-' }}</p>
        <p v-if="detail.description">
          <b>描述：</b>{{ detail.description }}
        </p>
        <p><b>状态：</b>{{ detail.status }}</p>
      </div>
    </el-dialog>

    <!-- 创建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑视频' : '添加视频'"
      width="600px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item label="标题">
          <el-input
            v-model="form.title"
            placeholder="视频标题"
          />
        </el-form-item>
        <el-form-item label="封面">
          <el-input
            v-model="form.cover"
            placeholder="封面图片URL"
          />
        </el-form-item>
        <el-form-item label="视频地址">
          <el-input
            v-model="form.videoUrl"
            placeholder="视频播放URL"
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="时长">
              <el-input
                v-model="form.duration"
                placeholder="如 15:30"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="标签">
              <el-input
                v-model="form.tags"
                placeholder="逗号分隔"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
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
          @click="saveVideo"
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
import { videoApi } from "@/api";

const list = ref<any[]>([]);
const loading = ref(false);
const statusFilter = ref("");
const detailVisible = ref(false);
const detail = ref<any>(null);

// 创建/编辑弹窗
const dialogVisible = ref(false);
const editingId = ref('');
const saving = ref(false);
const form = reactive({
  title: '',
  cover: '',
  videoUrl: '',
  duration: '',
  description: '',
  tags: '',
});

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { pageSize: 100 };
    if (statusFilter.value) params.status = statusFilter.value;
    const { data } = await videoApi.list(params);
    list.value = data.videos || data || [];
  } finally { loading.value = false; }
}

function resetForm() {
  Object.assign(form, { title: '', cover: '', videoUrl: '', duration: '', description: '', tags: '' });
  editingId.value = '';
}

function openCreate() {
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: any) {
  resetForm();
  editingId.value = row.id;
  Object.assign(form, {
    title: row.title || '',
    cover: row.cover || '',
    videoUrl: row.videoUrl || row.url || '',
    duration: row.duration || '',
    description: row.description || '',
    tags: Array.isArray(row.tags) ? row.tags.join(',') : (row.tags || ''),
  });
  dialogVisible.value = true;
}

async function saveVideo() {
  saving.value = true;
  try {
    const payload: any = { ...form };
    if (typeof payload.tags === 'string') {
      payload.tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    if (editingId.value) {
      await videoApi.update(editingId.value, payload);
      ElMessage.success('已更新');
    } else {
      await videoApi.create(payload);
      ElMessage.success('已创建');
    }
    dialogVisible.value = false;
    fetchList();
  } catch (e: any) {
  } finally { saving.value = false; }
}

async function viewDetail(row: any) {
  try {
    const { data } = await videoApi.detail(row.id);
    detail.value = data;
    detailVisible.value = true;
  } catch { /* */ }
}

function del(id: string) {
  ElMessageBox.confirm("确定删除？", "警告", { type: "warning" }).then(async () => {
    await videoApi.remove(id);
    ElMessage.success("已删除");
    fetchList();
  }).catch(() => {});
}
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: #8b4513; }
.detail p { margin: 6px 0; font-size: 14px; color: #333; }
</style>
