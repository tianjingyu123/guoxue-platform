<template>
  <div class="page">
    <div class="header">
      <h2>定价规则管理</h2>
      <el-button
        type="primary"
        @click="openAddDialog"
      >
        添加规则
      </el-button>
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
        <el-empty description="暂无定价规则" />
      </template>
      <el-table-column
        prop="name"
        label="规则名称"
        min-width="140"
      />
      <el-table-column
        prop="targetType"
        label="目标类型"
        width="110"
      >
        <template #default="{ row }">
          <el-tag>{{ targetTypeLabel(row.targetType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="strategy"
        label="策略"
        width="120"
      >
        <template #default="{ row }">
          <el-tag :type="strategyTag(row.strategy)">
            {{ strategyLabel(row.strategy) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="basePrice"
        label="基础价格"
        width="110"
        sortable
      >
        <template #default="{ row }">
          ￥{{ row.basePrice }}
        </template>
      </el-table-column>
      <el-table-column
        prop="minPrice"
        label="最低价"
        width="100"
      >
        <template #default="{ row }">
          ￥{{ row.minPrice }}
        </template>
      </el-table-column>
      <el-table-column
        prop="maxPrice"
        label="最高价"
        width="100"
      >
        <template #default="{ row }">
          ￥{{ row.maxPrice }}
        </template>
      </el-table-column>
      <el-table-column
        prop="priority"
        label="优先级"
        width="90"
        sortable
      />
      <el-table-column
        prop="isActive"
        label="启用状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="200"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="$router.push(`/pricing/rules/${row.id}`)"
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

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next"
      @current-change="fetchList"
      @size-change="fetchList"
    />

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑规则' : '添加规则'"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="110px"
      >
        <el-form-item
          label="规则名称"
          prop="name"
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item
          label="目标类型"
          prop="targetType"
        >
          <el-select
            v-model="form.targetType"
            style="width:100%"
          >
            <el-option
              label="商品"
              value="PRODUCT"
            />
            <el-option
              label="课程"
              value="COURSE"
            />
            <el-option
              label="会员"
              value="MEMBERSHIP"
            />
            <el-option
              label="电子书"
              value="EBOOK"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="策略"
          prop="strategy"
        >
          <el-select
            v-model="form.strategy"
            style="width:100%"
          >
            <el-option
              label="固定价格"
              value="FIXED"
            />
            <el-option
              label="阶梯定价"
              value="TIERED"
            />
            <el-option
              label="动态定价"
              value="DYNAMIC"
            />
            <el-option
              label="促销定价"
              value="PROMOTION"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="基础价格"
          prop="basePrice"
        >
          <el-input-number
            v-model="form.basePrice"
            :min="0"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item
          label="最低价格"
          prop="minPrice"
        >
          <el-input-number
            v-model="form.minPrice"
            :min="0"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item
          label="最高价格"
          prop="maxPrice"
        >
          <el-input-number
            v-model="form.maxPrice"
            :min="0"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item
          label="策略配置"
          prop="strategyConfig"
        >
          <el-input
            v-model="form.strategyConfig"
            type="textarea"
            :rows="3"
            placeholder="JSON格式策略配置"
          />
        </el-form-item>
        <el-form-item
          label="优先级"
          prop="priority"
        >
          <el-input-number
            v-model="form.priority"
            :min="0"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { pricingApi } from "@/api";

interface PricingRule {
  id: string;
  name: string;
  targetType: string;
  strategy: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  strategyConfig: string;
  priority: number;
  isActive: boolean;
}

const loading = ref(false);
const error = ref(false);
const deleting = ref(false);
const list = ref<PricingRule[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const currentRow = ref<PricingRule | null>(null);

const form = reactive({
  name: "",
  targetType: "PRODUCT",
  strategy: "FIXED",
  basePrice: 0,
  minPrice: 0,
  maxPrice: 0,
  strategyConfig: "",
  priority: 0,
});

const rules = {
  name: [{ required: true, message: "请输入规则名称", trigger: "blur" }],
};

function targetTypeLabel(type: string) {
  const map: Record<string, string> = { PRODUCT: "商品", COURSE: "课程", MEMBERSHIP: "会员", EBOOK: "电子书" };
  return map[type] || type;
}

function strategyLabel(strategy: string) {
  const map: Record<string, string> = { FIXED: "固定价格", TIERED: "阶梯定价", DYNAMIC: "动态定价", PROMOTION: "促销定价" };
  return map[strategy] || strategy;
}

function strategyTag(strategy: string) {
  const map: Record<string, string> = { FIXED: "", TIERED: "warning", DYNAMIC: "danger", PROMOTION: "success" };
  return map[strategy] || "";
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const res = await pricingApi.getRules({ page: page.value, pageSize: pageSize.value });
    list.value = res.data.items || res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    list.value = [];
    total.value = 0;
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function openAddDialog() {
  isEdit.value = false;
  form.name = "";
  form.targetType = "PRODUCT";
  form.strategy = "FIXED";
  form.basePrice = 0;
  form.minPrice = 0;
  form.maxPrice = 0;
  form.strategyConfig = "";
  form.priority = 0;
  dialogVisible.value = true;
}

function openEditDialog(row: PricingRule) {
  isEdit.value = true;
  currentRow.value = row;
  form.name = row.name;
  form.targetType = row.targetType;
  form.strategy = row.strategy;
  form.basePrice = row.basePrice;
  form.minPrice = row.minPrice;
  form.maxPrice = row.maxPrice;
  form.strategyConfig = row.strategyConfig;
  form.priority = row.priority;
  dialogVisible.value = true;
}

async function handleSubmit() {
  submitting.value = true;
  try {
    if (isEdit.value && currentRow.value) {
      await pricingApi.updateRule(currentRow.value.id, form);
      ElMessage.success("更新成功");
    } else {
      await pricingApi.createRule(form);
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    fetchList();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: PricingRule) {
  try {
    await ElMessageBox.confirm(`确定删除规则"${row.name}"吗？`, "确认删除", { type: "warning" });
    if (deleting.value) return;
    deleting.value = true;
    await pricingApi.deleteRule(row.id);
    ElMessage.success("删除成功");
    fetchList();
  } catch {
    // cancelled or error
  } finally {
    deleting.value = false;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
</style>
