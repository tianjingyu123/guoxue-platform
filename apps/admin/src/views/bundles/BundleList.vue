<template>
  <div class="page">
    <div class="header">
      <h2>课程组合包管理</h2>
      <div class="search-row">
        <el-input
          v-model="keyword"
          placeholder="搜索名称"
          clearable
          style="width:200px"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="typeFilter"
          placeholder="类型"
          clearable
          style="width:120px"
          @change="handleSearch"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="免费赠品"
            value="FREE_GIFT"
          />
          <el-option
            label="付费包"
            value="PAID_BUNDLE"
          />
          <el-option
            label="会员专属"
            value="MEMBER_ONLY"
          />
        </el-select>
        <el-button
          type="primary"
          @click="handleSearch"
        >
          查询
        </el-button>
        <el-button @click="handleReset">
          重置
        </el-button>
        <el-button
          type="success"
          @click="openCreate"
        >
          新增组合包
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        加载失败，请
        <el-button
          link
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <template #empty>
        <el-empty description="暂无组合包" />
      </template>
      <el-table-column
        label="名称"
        min-width="180"
      >
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:8px">
            <el-avatar
              v-if="row.cover"
              :src="row.cover"
              shape="square"
              size="small"
            />
            <span>{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ typeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="目标"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            type="info"
          >
            {{ targetLabel(row.target) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="原价"
        width="90"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ row.originalPrice || 0 }}
        </template>
      </el-table-column>
      <el-table-column
        label="售价"
        width="90"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ row.sellPrice || 0 }}
        </template>
      </el-table-column>
      <el-table-column
        label="组合项"
        width="80"
        align="center"
      >
        <template #default="{ row }">
          {{ row._count?.items || 0 }}项
        </template>
      </el-table-column>
      <el-table-column
        label="领取"
        width="80"
        align="center"
      >
        <template #default="{ row }">
          {{ row._count?.stationAccess || 0 }}次
        </template>
      </el-table-column>
      <el-table-column
        label="排序"
        width="70"
        prop="sortOrder"
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ACTIVE' ? 'success' : 'info'"
            size="small"
          >
            {{ row.status === 'ACTIVE' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="160"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
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

    <div
      v-if="total > pageSize"
      class="pagination"
    >
      <el-pagination
        v-model:current-page="page"
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        @current-change="fetchList"
      />
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑组合包' : '新增组合包'"
      width="680px"
    >
      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="名称"
          required
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="form.type"
            style="width:100%"
          >
            <el-option
              label="免费赠品"
              value="FREE_GIFT"
            />
            <el-option
              label="付费包"
              value="PAID_BUNDLE"
            />
            <el-option
              label="会员专属"
              value="MEMBER_ONLY"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标人群">
          <el-select
            v-model="form.target"
            style="width:100%"
          >
            <el-option
              label="分站"
              value="STATION"
            />
            <el-option
              label="运营商"
              value="OPERATOR"
            />
            <el-option
              label="全部"
              value="ALL"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="封面图">
          <CosImageUpload v-model="form.cover" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <!-- 修复（董事长反馈）：600px 弹窗里三列各继承 100px label，输入框被 +/- 步进按钮挤没、无法编辑。
             改法：行内 label 缩到 60px + 去掉步进按钮（:controls="false"），留出完整可输入区。 -->
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item
              label="原价"
              label-width="60px"
            >
              <el-input-number
                v-model="form.originalPrice"
                :min="0"
                :precision="2"
                :controls="false"
                placeholder="0.00"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item
              label="售价"
              label-width="60px"
            >
              <el-input-number
                v-model="form.sellPrice"
                :min="0"
                :precision="2"
                :controls="false"
                placeholder="0.00"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item
              label="排序"
              label-width="60px"
            >
              <el-input-number
                v-model="form.sortOrder"
                :min="0"
                :precision="0"
                :controls="false"
                placeholder="数字越小越靠前"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="状态">
          <el-select
            v-model="form.status"
            style="width:100%"
          >
            <el-option
              label="启用"
              value="ACTIVE"
            /><el-option
              label="禁用"
              value="DISABLED"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="组合项">
          <div
            v-for="(item, i) in form.items"
            :key="i"
            style="display:flex;gap:8px;margin-bottom:8px;align-items:center"
          >
            <el-select
              v-model="item.itemType"
              style="width:140px"
            >
              <el-option
                label="课程"
                value="COURSE"
              /><el-option
                label="商品"
                value="PRODUCT"
              /><el-option
                label="电子书"
                value="EBOOK"
              />
            </el-select>
            <el-input
              v-model="item.itemId"
              placeholder="项目ID"
              style="width:200px"
            />
            <el-input-number
              v-model="item.sortOrder"
              :min="0"
              :controls="false"
              placeholder="排序"
              style="width:80px"
            />
            <el-button
              type="danger"
              :icon="'Delete'"
              circle
              size="small"
              @click="form.items.splice(i,1)"
            />
          </div>
          <el-button
            size="small"
            @click="form.items.push({ itemType: 'COURSE', itemId: '', sortOrder: 0 })"
          >
            + 添加组合项
          </el-button>
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
import { ElMessage, ElMessageBox } from "element-plus";
import CosImageUpload from "@/components/upload/CosImageUpload.vue";
import { bundleApi } from "@/api";

const list = ref<any[]>([]);
const loading = ref(false);
const error = ref(false);
const deleting = ref(false);
const keyword = ref("");
const typeFilter = ref("");
const page = ref(1);
const pageSize = 20;
const total = ref(0);

const dialogVisible = ref(false);
const saving = ref(false);
const isEdit = ref(false);
const editId = ref("");
const form = reactive<any>({ name: "", type: "FREE_GIFT", target: "STATION", cover: "", intro: "", originalPrice: 0, sellPrice: 0, sortOrder: 0, status: "ACTIVE", items: [] });

function typeLabel(t: string) { const m: Record<string,string> = { FREE_GIFT: "免费赠品", PAID_BUNDLE: "付费包", MEMBER_ONLY: "会员专属" }; return m[t] || t; }
function targetLabel(t: string) { const m: Record<string,string> = { STATION: "分站", OPERATOR: "运营商", ALL: "全部" }; return m[t] || t; }

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: any = { page: page.value, pageSize };
    if (keyword.value) params.keyword = keyword.value;
    if (typeFilter.value) params.type = typeFilter.value;
    const { data } = await bundleApi.list(params);
    list.value = data.items || data.bundles || [];
    total.value = data.total || 0;
  } catch {
    list.value = [];
    total.value = 0;
    error.value = true;
  } finally { loading.value = false; }
}

function resetForm() {
  Object.assign(form, { name: "", type: "FREE_GIFT", target: "STATION", cover: "", intro: "", originalPrice: 0, sellPrice: 0, sortOrder: 0, status: "ACTIVE", items: [] });
}

function handleSearch() { page.value = 1; fetchList(); }
function handleReset() { keyword.value = ""; typeFilter.value = ""; page.value = 1; fetchList(); }

function openCreate() { resetForm(); isEdit.value = false; dialogVisible.value = true; }

// 编辑打开前保存的原组合项数量（用于保存时"清空组合项"确认）
const originalItemCount = ref(0);

async function openEdit(row: any) {
  isEdit.value = true; editId.value = row.id;
  // 修复 P0：列表接口不含 items（只有 _count），直接用 row 回填会把 items 置空，
  // 保存时后端全量替换导致所有组合项被清空。改为先拉详情（GET /bundles/:id 含 items）再回填。
  let detail: any = row;
  try {
    const { data } = await bundleApi.getById(row.id);
    detail = data || row;
  } catch {
    ElMessage.warning("组合包详情加载失败，组合项可能不完整，请勿直接保存");
  }
  originalItemCount.value = (detail.items || []).length || (row._count?.items || 0);
  Object.assign(form, { name: detail.name, type: detail.type, target: detail.target, cover: detail.cover || "", intro: detail.intro || "", originalPrice: detail.originalPrice || 0, sellPrice: detail.sellPrice || 0, sortOrder: detail.sortOrder || 0, status: detail.status || "ACTIVE", items: (detail.items || []).map((i: any) => ({ itemType: i.itemType, itemId: i.itemId, sortOrder: i.sortOrder || 0 })) });
  dialogVisible.value = true;
}

async function save() {
  // 名称必填真校验
  if (!form.name || !String(form.name).trim()) {
    ElMessage.warning("请填写组合包名称");
    return;
  }
  // 组合项 itemId 空值校验
  const emptyIdx = (form.items || []).findIndex((it: any) => !it.itemId || !String(it.itemId).trim());
  if (emptyIdx >= 0) {
    ElMessage.warning(`第 ${emptyIdx + 1} 个组合项未填写项目ID，请补全或删除该项`);
    return;
  }
  // L3 影响预告：编辑态下把原有组合项全删光要二次确认
  if (isEdit.value && form.items.length === 0 && originalItemCount.value > 0) {
    try {
      await ElMessageBox.confirm(
        `保存后将清空该组合包原有的 ${originalItemCount.value} 个组合项，已领取用户将无法看到这些内容。确定继续？`,
        "清空组合项确认",
        { type: "warning", confirmButtonText: "确定清空并保存", cancelButtonText: "取消" },
      );
    } catch { return; }
  }
  saving.value = true;
  try {
    if (isEdit.value) {
      await bundleApi.update(editId.value, { ...form });
    } else {
      await bundleApi.create({ ...form });
    }
    ElMessage.success(isEdit.value ? "已更新" : "已创建");
    dialogVisible.value = false;
    fetchList();
  } catch {
    ElMessage.error("保存失败，请重试");
  } finally { saving.value = false; }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除组合包「${row.name}」？`, "提示", { type: "warning" });
  if (deleting.value) return;
  deleting.value = true;
  try {
    await bundleApi.delete(row.id);
    ElMessage.success("已删除");
    fetchList();
  } finally { deleting.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: var(--color-text-title); }
.search-row { display: flex; gap: 8px; align-items: center; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
