<template>
  <div class="page">
    <PageHeader title="圈子管理">
      <template #actions>
        <el-button @click="fetchList">
          刷新
        </el-button>
        <el-button
          type="primary"
          @click="openEdit()"
        >
          添加圈子
        </el-button>
      </template>
    </PageHeader>

    <!-- 筛选栏（关键词/类型走 GET /circles·仅覆盖正常圈；默认列表走管理员端点·含全部状态） -->
    <el-card
      shadow="never"
      class="filter-card"
    >
      <div class="filter-row">
        <el-input
          v-model="keyword"
          placeholder="搜索圈子名称/简介"
          clearable
          style="width:220px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-select
          v-model="typeFilter"
          placeholder="类型"
          clearable
          style="width:120px"
          @change="onSearch"
        >
          <el-option
            label="免费"
            value="FREE"
          />
          <el-option
            label="付费"
            value="PAID"
          />
          <el-option
            label="年费"
            value="YEARLY"
          />
        </el-select>
        <el-button
          type="primary"
          @click="onSearch"
        >
          查询
        </el-button>
        <el-button @click="resetFilter">
          重置
        </el-button>
        <span
          v-if="filteredMode"
          class="filter-hint"
        >搜索结果仅含「正常」状态圈子（后端 /circles 搜索限制，封禁/待审核圈请清空筛选查看）</span>
      </div>
    </el-card>

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
          :description="filteredMode ? '没有匹配的圈子，换个筛选条件试试' : '暂无圈子，点右上角「添加圈子」创建'"
          :image-size="80"
        />
      </template>
      <el-table-column
        prop="name"
        label="圈子名称"
        min-width="140"
        show-overflow-tooltip
      />
      <el-table-column
        prop="intro"
        label="简介"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        label="类型"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.type === 'FREE' ? 'success' : 'warning'"
            size="small"
          >
            {{ typeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="成员"
        width="80"
        align="center"
      >
        <template #default="{ row }">
          {{ row.memberCount ?? row._count?.members ?? 0 }}
        </template>
      </el-table-column>
      <el-table-column
        prop="postCount"
        label="帖子"
        width="80"
        align="center"
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusTagType(rowStatus(row))"
            size="small"
          >
            {{ statusLabel(rowStatus(row)) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="230"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="router.push(`/circles/${row.id}`)"
          >
            详情
          </el-button>
          <el-tooltip
            :disabled="adminUpdateSupported"
            content="待后端部署新端点（admin-update）"
            placement="top"
          >
            <el-button
              size="small"
              type="primary"
              :disabled="!adminUpdateSupported"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
          </el-tooltip>
          <!-- 封禁/解封按真实状态渲染：仅 DISABLED 显示解封（旧版 status 缺失时全显解封=黑盒实锤已修） -->
          <el-tooltip
            :disabled="adminStatusSupported"
            content="待后端部署新端点（admin-status）"
            placement="top"
          >
            <el-button
              v-if="rowStatus(row) === 'DISABLED'"
              size="small"
              type="success"
              :disabled="!adminStatusSupported"
              @click="changeStatus(row, 'ACTIVE')"
            >
              解封
            </el-button>
            <el-button
              v-else
              size="small"
              type="danger"
              :disabled="!adminStatusSupported"
              @click="changeStatus(row, 'DISABLED')"
            >
              封禁
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-show="!loadError"
      class="pagination-row"
    >
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="fetchList"
        @size-change="onPageSizeChange"
      />
    </div>

    <!-- 创建/编辑对话框（编辑走 admin-update 白名单：name/intro/cover/categoryLevel1/categoryLevel2；类型/价格后端不支持管理员修改，已从编辑态移除） -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑圈子' : '添加圈子'"
      width="500px"
    >
      <el-form
        ref="dialogFormRef"
        :model="form"
        :rules="dialogRules"
        label-width="90px"
      >
        <el-form-item
          label="名称"
          prop="name"
        >
          <el-input
            v-model="form.name"
            maxlength="30"
            show-word-limit
          />
        </el-form-item>
        <el-form-item
          label="封面"
          prop="cover"
        >
          <CosImageUpload v-model="form.cover" />
        </el-form-item>
        <el-form-item
          label="简介"
          prop="intro"
        >
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="至少 10 个字"
          />
        </el-form-item>
        <template v-if="!editingId">
          <el-form-item
            label="类型"
            prop="type"
          >
            <el-select v-model="form.type">
              <el-option
                label="免费"
                value="FREE"
              />
              <el-option
                label="付费"
                value="PAID"
              />
              <el-option
                label="年费"
                value="YEARLY"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="form.type !== 'FREE'"
            label="价格(元)"
            prop="price"
          >
            <el-input-number
              v-model="form.price"
              :min="0"
              :precision="2"
            />
          </el-form-item>
          <el-form-item label="标签">
            <el-input
              v-model="tagsStr"
              placeholder="逗号分隔"
            />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="品类">
            <el-input
              v-model="form.categoryLevel1"
              placeholder="一级品类"
              style="width:150px"
            />
            <el-input
              v-model="form.categoryLevel2"
              placeholder="二级品类"
              style="width:150px;margin-left:8px"
            />
          </el-form-item>
          <!-- 编辑态不提供「类型 FREE/PAID」修改：admin-update 契约不支持改类型/价格/标签（已记后端清单） -->
        </template>
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
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { api, circleApi, circleBackendApi } from "@/api";
import PageHeader from "@/components/PageHeader.vue";
import CosImageUpload from "@/components/upload/CosImageUpload.vue";

const router = useRouter();

/** 圈子行（后端圈子列表项，字段宽松 optional） */
interface CircleRow {
  id: string;
  name?: string;
  intro?: string;
  cover?: string;
  type?: string;
  price?: number;
  status?: string;
  memberCount?: number;
  postCount?: number;
  tags?: string[];
  categoryLevel1?: string;
  categoryLevel2?: string;
  _count?: { members?: number };
}

const list = ref<CircleRow[]>([]);
const loading = ref(false);
const loadError = ref(false);
const acting = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref("");
const form = reactive({ name: "", cover: "", intro: "", type: "FREE", price: 0, categoryLevel1: "", categoryLevel2: "" });
const dialogFormRef = ref<FormInstance>();
const dialogRules: FormRules = {
  name: [
    { required: true, message: "请输入圈子名称", trigger: "blur" },
    { min: 2, max: 30, message: "名称需 2-30 个字", trigger: "blur" },
  ],
  intro: [
    { required: true, message: "请输入圈子简介", trigger: "blur" },
    { min: 10, max: 500, message: "简介需 10-500 个字（后端要求至少 10 字）", trigger: "blur" },
  ],
  type: [{ required: true, message: "请选择圈子类型", trigger: "change" }],
};
const tagsStr = ref("");

// 分页 + 筛选（翻页保筛选态）
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const keyword = ref("");
const typeFilter = ref("");
// 有关键词/类型筛选时走 GET /circles（后端只读核实：支持 page/pageSize/keyword/type，且只返回 ACTIVE 圈、不含 status 字段）；
// 无筛选时走管理员端点 GET /circle-backend/admin/circles（全部状态 + 真实 status，封禁/解封按钮才有真依据）
const filteredMode = computed(() => Boolean(keyword.value.trim() || typeFilter.value));

// 新契约端点降级开关：调用得到 404 时置灰按钮 + tooltip，绝不假成功
const adminStatusSupported = ref(true);
const adminUpdateSupported = ref(true);

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    if (filteredMode.value) {
      const params: Record<string, unknown> = { page: page.value, pageSize: pageSize.value };
      if (keyword.value.trim()) params.keyword = keyword.value.trim();
      if (typeFilter.value) params.type = typeFilter.value;
      const { data } = await circleApi.list(params);
      list.value = data.circles || data.items || [];
      total.value = data.total || 0;
    } else {
      try {
        const { data } = await circleBackendApi.adminCircles({ page: page.value, pageSize: pageSize.value });
        list.value = data.circles || data.items || [];
        total.value = data.total || 0;
      } catch (e: unknown) {
        // 管理员端点需 SUPER_ADMIN/OPERATION_ADMIN；低权限角色 403 时降级到 C 端列表（仅正常圈·无真实状态），封禁/解封不可用
        if ((e as { response?: { status?: number } })?.response?.status === 403) {
          const { data } = await circleApi.list({ page: page.value, pageSize: pageSize.value });
          list.value = data.circles || data.items || [];
          total.value = data.total || 0;
          adminStatusSupported.value = false;
          ElMessage.warning("当前角色无管理员圈子列表权限，已降级展示（仅正常圈，封禁/解封不可用）");
        } else { throw e; }
      }
    }
  } catch {
    loadError.value = true;
    ElMessage.error("加载圈子列表失败");
  } finally { loading.value = false; }
}

function onSearch() {
  page.value = 1;
  fetchList();
}

function resetFilter() {
  keyword.value = "";
  typeFilter.value = "";
  page.value = 1;
  fetchList();
}

function onPageSizeChange() {
  page.value = 1;
  fetchList();
}

/** 行真实状态：筛选源（GET /circles）不返回 status 且只含 ACTIVE 圈，缺省按 ACTIVE 处理 */
function rowStatus(row: CircleRow): string {
  return row.status || "ACTIVE";
}
function statusLabel(s: string) {
  return ({ ACTIVE: "正常", DISABLED: "已封禁", PENDING: "待审核" } as Record<string, string>)[s] || s;
}
function statusTagType(s: string) {
  return s === "ACTIVE" ? "success" : s === "DISABLED" ? "danger" : "warning";
}
function typeLabel(t?: string) {
  return ({ FREE: "免费", PAID: "付费", YEARLY: "年费" } as Record<string, string>)[t || ""] || t || "-";
}

function openEdit(row?: CircleRow) {
  if (row) {
    editingId.value = row.id;
    form.name = row.name || "";
    form.cover = row.cover || "";
    form.intro = row.intro || "";
    form.type = row.type || "FREE";
    form.price = Number(row.price) || 0;
    form.categoryLevel1 = row.categoryLevel1 || "";
    form.categoryLevel2 = row.categoryLevel2 || "";
    tagsStr.value = (row.tags || []).join(",");
  } else {
    editingId.value = "";
    form.name = "";
    form.cover = "";
    form.intro = "";
    form.type = "FREE";
    form.price = 0;
    form.categoryLevel1 = "";
    form.categoryLevel2 = "";
    tagsStr.value = "";
  }
  dialogVisible.value = true;
  dialogFormRef.value?.clearValidate();
}

async function save() {
  const valid = await dialogFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (editingId.value) {
      // 编辑走管理员契约 PUT /circles/:id/admin-update（白名单字段），不再走 C 端 update
      await api.put(`/circles/${editingId.value}/admin-update`, {
        name: form.name,
        intro: form.intro,
        cover: form.cover || undefined,
        categoryLevel1: form.categoryLevel1 || undefined,
        categoryLevel2: form.categoryLevel2 || undefined,
      });
      ElMessage.success("已更新");
    } else {
      const payload: Record<string, unknown> = {
        name: form.name,
        cover: form.cover,
        intro: form.intro,
        type: form.type,
        tags: tagsStr.value.split(",").map(s => s.trim()).filter(Boolean),
      };
      if (form.type !== "FREE") payload.price = form.price;
      await circleApi.create(payload);
      ElMessage.success("已添加");
    }
    dialogVisible.value = false;
    fetchList();
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (editingId.value && status === 404) {
      adminUpdateSupported.value = false;
      ElMessage.warning("编辑功能待后端部署新端点（admin-update），本次未保存");
      dialogVisible.value = false;
    }
    // 其余错误由 api 拦截器统一弹出人话提示
  } finally { saving.value = false; }
}

/** 封禁/解封：走管理员契约 PUT /circles/:id/admin-status，理由必填（L2 危险操作） */
async function changeStatus(row: CircleRow, status: "ACTIVE" | "DISABLED") {
  const isBan = status === "DISABLED";
  let reason = "";
  try {
    const { value } = await ElMessageBox.prompt(
      isBan
        ? `确定封禁圈子「${row.name}」？封禁后 ${row.memberCount ?? row._count?.members ?? 0} 名成员将无法访问。请填写封禁理由：`
        : `确定解封圈子「${row.name}」？请填写解封理由：`,
      isBan ? "封禁圈子" : "解封圈子",
      {
        type: "warning",
        confirmButtonText: isBan ? "确定封禁" : "确定解封",
        cancelButtonText: "取消",
        inputPlaceholder: "理由必填，将写入操作日志",
        inputValidator: (v: string) => (v && v.trim().length >= 2) || "请填写理由（至少 2 个字）",
      },
    );
    reason = value.trim();
  } catch { return; } // 用户取消
  if (acting.value) return;
  acting.value = true;
  try {
    await api.put(`/circles/${row.id}/admin-status`, { status, reason });
    ElMessage.success(isBan ? "已封禁" : "已解封");
    fetchList();
  } catch (e: unknown) {
    const st = (e as { response?: { status?: number } })?.response?.status;
    if (st === 404) {
      adminStatusSupported.value = false;
      ElMessage.warning("封禁/解封待后端部署新端点（admin-status），本次未生效");
    }
    // 其余错误由 api 拦截器统一提示
  } finally { acting.value = false; }
}
</script>

<style scoped>
.page { padding: 0; }
.filter-card { margin-bottom: 12px; }
.filter-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-hint { font-size: 12px; color: var(--color-text-secondary); }
.pagination-row { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
