<template>
  <div class="page">
    <PageHeader title="Bot管理">
      <template #actions>
        <div class="header-actions">
          <el-select
            v-model="typeFilter"
            placeholder="类型筛选"
            clearable
            style="width:140px"
            @change="fetchList"
          >
            <el-option
              label="全部"
              value=""
            />
            <el-option
              label="八字"
              value="BAZI"
            />
            <el-option
              label="紫微斗数"
              value="ZIWEI"
            />
            <el-option
              label="通用"
              value="GENERAL"
            />
          </el-select>
          <el-button
            type="primary"
            @click="openCreate"
          >
            新建Bot
          </el-button>
        </div>
      </template>
    </PageHeader>

    <!-- 错误态 -->
    <el-result
      v-if="loadError"
      icon="error"
      title="Bot 列表加载失败"
      sub-title="无法获取数据，请检查网络或稍后重试"
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
      v-else
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <template #empty>
        <el-empty description="暂无 Bot 数据" />
      </template>
      <el-table-column
        prop="name"
        label="名称"
        width="140"
      />
      <el-table-column
        label="类型"
        width="90"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ typeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="免费/付费"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.isFree ? 'success' : 'warning'"
            size="small"
          >
            {{ row.isFree ? '免费' : '付费' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="价格"
        width="90"
      >
        <template #default="{ row }">
          {{ row.isFree ? '-' : (row.price != null ? '¥' + row.price : '-') }}
        </template>
      </el-table-column>
      <el-table-column
        prop="dailyLimit"
        label="日限额"
        width="70"
        align="center"
      />
      <el-table-column
        prop="sortOrder"
        label="排序"
        width="60"
        align="center"
      />
      <el-table-column
        label="操作"
        width="310"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            @click="openDetail(row)"
          >
            详情
          </el-button>
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            @click="openBindCircle(row)"
          >
            绑定圈子
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="formDialogVisible"
      :title="isEditing ? '编辑Bot' : '新建Bot'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="名称"
          required
        >
          <el-input
            v-model="form.name"
            placeholder="Bot名称"
          />
        </el-form-item>
        <el-form-item
          label="类型"
          required
        >
          <el-select
            v-model="form.type"
            style="width:100%"
          >
            <el-option
              label="八字"
              value="BAZI"
            />
            <el-option
              label="紫微斗数"
              value="ZIWEI"
            />
            <el-option
              label="通用"
              value="GENERAL"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="Bot ID"
          required
        >
          <el-input
            v-model="form.botId"
            placeholder="第三方Bot标识"
          />
        </el-form-item>
        <el-form-item
          label="API Key"
          required
        >
          <el-input
            v-model="form.apiKey"
            type="password"
            show-password
            placeholder="API密钥"
          />
        </el-form-item>
        <el-form-item label="头像">
          <el-input
            v-model="form.avatar"
            placeholder="头像图片URL"
          />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="3"
            placeholder="Bot简介说明"
          />
        </el-form-item>
        <el-form-item label="免费/付费">
          <el-switch
            v-model="form.isFree"
            active-text="免费"
            inactive-text="付费"
          />
        </el-form-item>
        <template v-if="!form.isFree">
          <el-form-item label="价格(元)">
            <el-input-number
              v-model="form.price"
              :min="0"
              :precision="2"
            />
          </el-form-item>
          <el-form-item label="月卡价格(元)">
            <el-input-number
              v-model="form.monthlyPrice"
              :min="0"
              :precision="2"
            />
          </el-form-item>
        </template>
        <el-form-item label="日限额">
          <el-input-number
            v-model="form.dailyLimit"
            :min="1"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="form.sortOrder"
            :min="0"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveForm"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="Bot详情"
      width="750px"
      :close-on-click-modal="false"
    >
      <template v-if="detailData">
        <el-descriptions
          :column="2"
          border
        >
          <el-descriptions-item label="名称">
            {{ detailData.name }}
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ typeLabel(detailData.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="Bot ID">
            {{ detailData.botId }}
          </el-descriptions-item>
          <el-descriptions-item label="免费/付费">
            {{ detailData.isFree ? '免费' : '付费' }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="!detailData.isFree"
            label="价格"
          >
            {{ detailData.price != null ? '¥' + detailData.price : '-' }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="!detailData.isFree"
            label="月卡价格"
          >
            {{ detailData.monthlyPrice != null ? '¥' + detailData.monthlyPrice : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="日限额">
            {{ detailData.dailyLimit }}
          </el-descriptions-item>
          <el-descriptions-item label="排序">
            {{ detailData.sortOrder }}
          </el-descriptions-item>
          <el-descriptions-item
            label="简介"
            :span="2"
          >
            {{ detailData.intro || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <h3 class="section-title">
          已绑定圈子
        </h3>
        <el-table
          v-if="(detailData.circleBots || []).length > 0"
          :data="detailData.circleBots || []"
          border
          size="small"
        >
          <el-table-column
            prop="circle.name"
            label="圈子名称"
          />
          <el-table-column
            prop="knowledgeBaseId"
            label="知识库ID"
            show-overflow-tooltip
          />
        </el-table>
        <el-empty
          v-else
          description="暂未绑定圈子"
          :image-size="60"
        />

        <h3 class="section-title">
          知识库
        </h3>
        <el-table
          v-if="(detailData.knowledgeBases || []).length > 0"
          :data="detailData.knowledgeBases || []"
          border
          size="small"
        >
          <el-table-column
            prop="title"
            label="标题"
            width="180"
            show-overflow-tooltip
          />
          <el-table-column
            prop="content"
            label="内容"
            min-width="200"
            show-overflow-tooltip
          />
          <el-table-column
            prop="sourceType"
            label="来源类型"
            width="90"
          />
          <el-table-column
            label="操作"
            width="70"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                type="danger"
                @click="handleDeleteKnowledge(row.id)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty
          v-else
          description="知识库为空"
          :image-size="60"
        />

        <h3 class="section-title">
          添加知识库条目
        </h3>
        <el-form
          :model="knowledgeForm"
          label-width="80px"
        >
          <el-form-item
            label="标题"
            required
          >
            <el-input
              v-model="knowledgeForm.title"
              placeholder="知识条目标题"
            />
          </el-form-item>
          <el-form-item
            label="内容"
            required
          >
            <el-input
              v-model="knowledgeForm.content"
              type="textarea"
              :rows="3"
              placeholder="知识条目内容"
            />
          </el-form-item>
          <el-form-item label="来源类型">
            <el-input
              v-model="knowledgeForm.sourceType"
              placeholder="如: classic, course"
            />
          </el-form-item>
          <el-form-item label="来源ID">
            <el-input
              v-model="knowledgeForm.sourceId"
              placeholder="对应来源的ID"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :loading="addingKnowledge"
              @click="handleAddKnowledge"
            >
              添加
            </el-button>
          </el-form-item>
        </el-form>
      </template>
    </el-dialog>

    <!-- 绑定圈子对话框 -->
    <el-dialog
      v-model="bindDialogVisible"
      title="绑定圈子"
      width="450px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="bindForm"
        label-width="80px"
      >
        <el-form-item
          label="选择圈子"
          required
        >
          <el-select
            v-model="bindForm.circleId"
            filterable
            placeholder="请选择圈子"
            style="width:100%"
          >
            <el-option
              v-for="c in circleList"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="binding"
          @click="handleBindCircle"
        >
          绑定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import { botApi, circleApi } from "@/api";

const list = ref<any[]>([]);
const loading = ref(false);
const loadError = ref(false);
const typeFilter = ref("");

// ---- 创建/编辑表单 ----
const formDialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref("");
const saving = ref(false);
const form = reactive({
  name: "",
  type: "BAZI",
  avatar: "",
  intro: "",
  botId: "",
  apiKey: "",
  isFree: true,
  dailyLimit: 5,
  price: 0,
  monthlyPrice: 0,
  sortOrder: 0,
});

// ---- 详情对话框 ----
const detailDialogVisible = ref(false);
const detailData = ref<any>(null);
const knowledgeForm = reactive({ title: "", content: "", sourceType: "", sourceId: "" });
const addingKnowledge = ref(false);

// ---- 绑定圈子对话框 ----
const bindDialogVisible = ref(false);
const bindBotId = ref("");
const bindForm = reactive({ circleId: "" });
const circleList = ref<any[]>([]);
const binding = ref(false);

onMounted(() => fetchList());

/** 类型中文映射 */
function typeLabel(t: string): string {
  const map: Record<string, string> = { BAZI: "八字", ZIWEI: "紫微斗数", GENERAL: "通用" };
  return map[t] || t;
}

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const params: any = {};
    if (typeFilter.value) params.type = typeFilter.value;
    const { data } = await botApi.list(params);
    list.value = Array.isArray(data) ? data : [];
  } catch {
    loadError.value = true;
    list.value = [];
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.name = "";
  form.type = "BAZI";
  form.avatar = "";
  form.intro = "";
  form.botId = "";
  form.apiKey = "";
  form.isFree = true;
  form.dailyLimit = 5;
  form.price = 0;
  form.monthlyPrice = 0;
  form.sortOrder = 0;
}

function openCreate() {
  isEditing.value = false;
  editingId.value = "";
  resetForm();
  formDialogVisible.value = true;
}

function openEdit(row: any) {
  isEditing.value = true;
  editingId.value = row.id;
  form.name = row.name;
  form.type = row.type;
  form.avatar = row.avatar || "";
  form.intro = row.intro || "";
  form.botId = row.botId;
  form.apiKey = row.apiKey;
  form.isFree = row.isFree;
  form.dailyLimit = row.dailyLimit ?? 5;
  form.price = row.price ?? 0;
  form.monthlyPrice = row.monthlyPrice ?? 0;
  form.sortOrder = row.sortOrder ?? 0;
  formDialogVisible.value = true;
}

async function saveForm() {
  if (!form.name || !form.botId || !form.apiKey) {
    ElMessage.warning("请填写名称、Bot ID 和 API Key");
    return;
  }
  saving.value = true;
  try {
    const payload = { ...form };
    if (isEditing.value) {
      await botApi.update(editingId.value, payload);
      ElMessage.success("已更新");
    } else {
      await botApi.create(payload);
      ElMessage.success("已创建");
    }
    formDialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除 Bot「${row.name}」？此操作不可恢复。`, "确认", {
    type: "warning",
    confirmButtonText: "删除",
    cancelButtonText: "取消",
  });
  await botApi.remove(row.id);
  ElMessage.success("已删除");
  fetchList();
}

async function openDetail(row: any) {
  detailDialogVisible.value = true;
  try {
    const { data } = await botApi.detail(row.id);
    detailData.value = data;
  } catch {
    detailDialogVisible.value = false;
  }
}

async function handleAddKnowledge() {
  if (!knowledgeForm.title || !knowledgeForm.content) {
    ElMessage.warning("请填写标题和内容");
    return;
  }
  if (!detailData.value?.id) return;
  addingKnowledge.value = true;
  try {
    await botApi.addKnowledge(detailData.value.id, { ...knowledgeForm });
    ElMessage.success("已添加");
    knowledgeForm.title = "";
    knowledgeForm.content = "";
    knowledgeForm.sourceType = "";
    knowledgeForm.sourceId = "";
    // 刷新详情
    const { data } = await botApi.detail(detailData.value.id);
    detailData.value = data;
  } finally {
    addingKnowledge.value = false;
  }
}

async function handleDeleteKnowledge(knowledgeId: string) {
  await ElMessageBox.confirm("确定删除此知识库条目？", "确认", {
    type: "warning",
    confirmButtonText: "删除",
    cancelButtonText: "取消",
  });
  await botApi.deleteKnowledge(knowledgeId);
  ElMessage.success("已删除");
  if (detailData.value?.id) {
    const { data } = await botApi.detail(detailData.value.id);
    detailData.value = data;
  }
}

async function openBindCircle(row: any) {
  bindBotId.value = row.id;
  bindForm.circleId = "";
  try {
    const { data } = await circleApi.list({ pageSize: 200 });
    circleList.value = data.circles || (Array.isArray(data) ? data : []);
    bindDialogVisible.value = true;
  } catch {
  }
}

async function handleBindCircle() {
  if (!bindForm.circleId) {
    ElMessage.warning("请选择圈子");
    return;
  }
  binding.value = true;
  try {
    await botApi.bindCircle(bindBotId.value, { circleId: bindForm.circleId });
    ElMessage.success("绑定成功");
    bindDialogVisible.value = false;
  } finally {
    binding.value = false;
  }
}
</script>

<style scoped>
.page { padding: 0; }
.section-title {
  margin: 20px 0 10px;
  font-size: 15px;
  color: var(--color-text-title);
  padding-left: 8px;
  border-left: 3px solid var(--color-info);
}
</style>
