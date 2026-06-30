<template>
  <div class="page">
    <PageHeader title="圈子管理">
      <template #actions>
        <el-button
          type="primary"
          @click="openEdit()"
        >
          添加圈子
        </el-button>
      </template>
    </PageHeader>

    <el-result
      v-if="loadError && !loading"
      icon="error"
      title="加载失败"
      sub-title="圈子列表加载失败，请检查网络后重试"
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
      :data="list"
      border
      stripe
    >
      <template #empty>
        <el-empty
          description="暂无圈子"
          :image-size="80"
        />
      </template>
      <el-table-column
        prop="name"
        label="圈子名称"
        width="160"
      />
      <el-table-column
        prop="intro"
        label="简介"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        label="类型"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.type === 'PAID' ? 'warning' : 'success'"
            size="small"
          >
            {{ row.type === 'PAID' ? '付费' : '免费' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="memberCount"
        label="成员"
        width="80"
      />
      <el-table-column
        prop="postCount"
        label="帖子"
        width="80"
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ACTIVE' ? 'success' : 'danger'"
            size="small"
          >
            {{ row.status === 'ACTIVE' ? '正常' : row.status === 'BANNED' ? '已封禁' : row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="250"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="router.push(`/circles/${row.id}`)"
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
            v-if="row.status === 'ACTIVE'"
            size="small"
            type="danger"
            @click="toggleStatus(row, 'BANNED')"
          >
            封禁
          </el-button>
          <el-button
            v-else
            size="small"
            type="success"
            @click="toggleStatus(row, 'ACTIVE')"
          >
            解封
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="delCircle(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑圈子' : '添加圈子'"
      width="500px"
    >
      <el-form
        ref="dialogFormRef"
        :model="form"
        :rules="dialogRules"
        label-width="80px"
      >
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="封面URL">
          <el-input
            v-model="form.cover"
            placeholder="封面图片地址"
          />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type">
            <el-option
              label="免费"
              value="FREE"
            />
            <el-option
              label="付费"
              value="PAID"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="form.type === 'PAID'"
          label="价格"
        >
          <el-input-number
            v-model="form.price"
            :min="0"
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-input
            v-model="tagsStr"
            placeholder="逗号分隔"
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
          @click="save"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { circleApi } from "@/api";
import PageHeader from "@/components/PageHeader.vue";

const router = useRouter();

const list = ref<any[]>([]);
const loading = ref(false);
const loadError = ref(false);
const acting = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref("");
const form = reactive({ name: "", cover: "", intro: "", type: "FREE", price: 0 });
const dialogFormRef = ref<any>(null);
const dialogRules = {
  name: [{ required: true, message: "请输入圈子名称", trigger: "blur" }],
  type: [{ required: true, message: "请选择圈子类型", trigger: "change" }],
};
const tagsStr = ref("");

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await circleApi.list({ pageSize: 100 });
    list.value = data.circles || data || [];
  } catch {
    loadError.value = true;
    ElMessage.error("加载圈子列表失败");
  } finally { loading.value = false; }
}

function openEdit(row?: any) {
  if (row) {
    editingId.value = row.id;
    form.name = row.name;
    form.cover = row.cover || "";
    form.intro = row.intro || "";
    form.type = row.type;
    form.price = row.price || 0;
    tagsStr.value = (row.tags || []).join(",");
  } else {
    editingId.value = "";
    form.name = "";
    form.cover = "";
    form.intro = "";
    form.type = "FREE";
    form.price = 0;
    tagsStr.value = "";
  }
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    const payload: Record<string, any> = {
      ...form,
      tags: tagsStr.value.split(",").filter(Boolean),
    };
    if (form.type !== "PAID") delete payload.price;

    if (editingId.value) {
      await circleApi.update(editingId.value, payload);
      ElMessage.success("已更新");
    } else {
      await circleApi.create(payload);
      ElMessage.success("已添加");
    }
    dialogVisible.value = false;
    fetchList();
  } finally { saving.value = false; }
}

async function toggleStatus(row: any, status: string) {
  if (acting.value) return;
  acting.value = true;
  try {
    await circleApi.update(row.id, { status });
    ElMessage.success(status === "BANNED" ? "已封禁" : "已解封");
    fetchList();
  } finally { acting.value = false; }
}

function delCircle(id: string) {
  ElMessageBox.confirm("确定删除该圈子？", "警告", { type: "warning" }).then(async () => {
    if (acting.value) return;
    acting.value = true;
    try {
      await circleApi.remove(id);
      ElMessage.success("已删除");
      fetchList();
    } finally { acting.value = false; }
  }).catch(() => {});
}
</script>

<style scoped>
.page { padding: 0; }
</style>
