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
          @keyup.enter="fetchList"
        />
        <el-select
          v-model="typeFilter"
          placeholder="类型"
          clearable
          style="width:120px"
          @change="fetchList"
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
          @click="fetchList"
        >
          查询
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
      width="600px"
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
          <el-input
            v-model="form.cover"
            placeholder="图片URL"
          />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="原价">
              <el-input-number
                v-model="form.originalPrice"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="售价">
              <el-input-number
                v-model="form.sellPrice"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序">
              <el-input-number
                v-model="form.sortOrder"
                :min="0"
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

function openCreate() { resetForm(); isEdit.value = false; dialogVisible.value = true; }
function openEdit(row: any) {
  isEdit.value = true; editId.value = row.id;
  Object.assign(form, { name: row.name, type: row.type, target: row.target, cover: row.cover || "", intro: row.intro || "", originalPrice: row.originalPrice || 0, sellPrice: row.sellPrice || 0, sortOrder: row.sortOrder || 0, status: row.status || "ACTIVE", items: (row.items || []).map((i: any) => ({ itemType: i.itemType, itemId: i.itemId, sortOrder: i.sortOrder || 0 })) });
  dialogVisible.value = true;
}

async function save() {
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
