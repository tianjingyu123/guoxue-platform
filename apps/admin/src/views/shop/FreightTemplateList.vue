<template>
  <div class="page">
    <div class="toolbar">
      <h3>运费模板管理</h3>
      <el-button
        type="primary"
        @click="openCreate()"
      >
        添加模板
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
      :data="templates"
      stripe
    >
      <template #empty>
        <el-empty description="暂无运费模板" />
      </template>
      <el-table-column
        prop="name"
        label="模板名称"
        min-width="150"
      />
      <el-table-column
        label="计费方式"
        width="100"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ typeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="默认运费"
        width="100"
      >
        <template #default="{ row }">
          ¥{{ Number(row.defaultFee).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        label="包邮条件"
        width="130"
      >
        <template #default="{ row }">
          <span v-if="conditionFreeText(row)">{{ conditionFreeText(row) }}</span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="区域运费"
        width="90"
      >
        <template #default="{ row }">
          <el-tooltip
            v-if="row.regions && Object.keys(row.regions).length"
            :content="JSON.stringify(row.regions)"
            placement="top"
          >
            <el-tag
              size="small"
              type="info"
              effect="plain"
            >
              已配置
            </el-tag>
          </el-tooltip>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.isActive ? 'success' : 'info'"
            size="small"
          >
            {{ row.isActive ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="150"
        fixed="right"
      >
        <template #default="{ row }">
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
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑运费模板' : '新增运费模板'"
      width="520px"
    >
      <el-form
        :model="form"
        label-width="90px"
      >
        <el-form-item label="模板名称">
          <el-input
            v-model="form.name"
            placeholder="如：全国包邮"
          />
        </el-form-item>
        <el-form-item label="计费方式">
          <el-select v-model="form.type">
            <el-option
              label="包邮"
              value="FREE"
            />
            <el-option
              label="固定运费"
              value="FIXED"
            />
            <el-option
              label="条件包邮"
              value="CONDITIONAL"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="form.type !== 'FREE'"
          label="默认运费"
        >
          <el-input-number
            v-model="form.defaultFee"
            :min="0"
            :precision="2"
          />
          <span class="field-hint">元 / 单</span>
        </el-form-item>
        <!-- 条件包邮阈值（后端 DTO conditionFree JSON·结构化成"满 X 元包邮"） -->
        <el-form-item
          v-if="form.type === 'CONDITIONAL'"
          label="包邮阈值"
        >
          <el-input-number
            v-model="form.freeThreshold"
            :min="0"
            :precision="2"
          />
          <span class="field-hint">元 —— 订单满该金额免运费，未满收默认运费</span>
        </el-form-item>
        <!-- 区域运费（后端 DTO regions JSON·先以 JSON 文本域开放，格式见说明） -->
        <el-form-item
          v-if="form.type !== 'FREE'"
          label="区域运费"
        >
          <el-input
            v-model="form.regionsText"
            type="textarea"
            :rows="3"
            placeholder="选填 JSON 对象，如 {&quot;新疆&quot;: 20, &quot;西藏&quot;: 20, &quot;内蒙古&quot;: 15}（省份名: 运费元）；留空按默认运费"
          />
          <div class="field-hint">
            格式：{"省份名": 运费元, ...}。填写有误将无法保存。
          </div>
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="form.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 分页 -->
    <el-pagination
      v-if="total > 0"
      v-model:current-page="page"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

/** 运费模板行（字段宽松 optional）·conditionFree 兼容对象 {threshold} 与历史数组 [{threshold}] 两种存法 */
interface FreightRow {
  id?: string;
  name?: string;
  type?: string;
  defaultFee?: number | string;
  conditionFree?: { threshold?: number | string } | { threshold?: number | string }[] | null;
  regions?: Record<string, unknown> | null;
  isActive?: boolean;
}

/** 包邮条件展示：兼容对象/数组两种历史形态 */
function conditionFreeText(row: FreightRow): string {
  const cf = row.conditionFree;
  if (!cf) return "";
  const items = Array.isArray(cf) ? cf : [cf];
  const parts = items
    .filter((c) => c && c.threshold != null && c.threshold !== "")
    .map((c) => `满 ¥${Number(c.threshold).toFixed(2)} 包邮`);
  return parts.join("、");
}

const loading = ref(false);
const error = ref(false);
const saving = ref(false);
const deleting = ref(false);
const templates = ref<FreightRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const dialogVisible = ref(false);
const isEdit = ref(false);
const form = ref({
  id: "", name: "", type: "FIXED", defaultFee: 0, isActive: true,
  /** 条件包邮阈值（元）·0/空 = 不设置 */
  freeThreshold: 0,
  /** 区域运费 JSON 文本（提交前解析校验） */
  regionsText: "",
});

function typeLabel(t: string) {
  const map: Record<string, string> = { FREE: "包邮", FIXED: "固定运费", CONDITIONAL: "条件包邮" };
  return map[t] || t;
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await api.get("/shop/freight-templates", { params: { page: page.value, pageSize: pageSize.value } });
    templates.value = data?.items || data?.data || [];
    total.value = data?.total || 0;
  } catch {
    templates.value = [];
    total.value = 0;
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  isEdit.value = false;
  form.value = { id: "", name: "", type: "FIXED", defaultFee: 0, isActive: true, freeThreshold: 0, regionsText: "" };
  dialogVisible.value = true;
}

function openEdit(row: FreightRow) {
  isEdit.value = true;
  const cf = row.conditionFree;
  const first = Array.isArray(cf) ? cf[0] : cf;
  form.value = {
    id: row.id ?? "", name: row.name ?? "", type: row.type ?? "FIXED",
    defaultFee: Number(row.defaultFee) || 0,
    isActive: row.isActive ?? true,
    freeThreshold: first?.threshold != null ? Number(first.threshold) : 0,
    regionsText: row.regions && Object.keys(row.regions).length ? JSON.stringify(row.regions, null, 2) : "",
  };
  dialogVisible.value = true;
}

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning("请输入模板名称");
    return;
  }
  // 区域运费 JSON 校验：必须是纯对象（后端 DTO @IsObject·数组/标量会 400），解析失败不发请求
  let regions: Record<string, unknown> | undefined;
  const regionsText = form.value.regionsText.trim();
  if (regionsText && form.value.type !== "FREE") {
    try {
      const parsed = JSON.parse(regionsText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        ElMessage.warning('区域运费需为 JSON 对象，如 {"新疆": 20}');
        return;
      }
      regions = parsed;
    } catch {
      ElMessage.warning("区域运费 JSON 格式有误，请检查引号与逗号");
      return;
    }
  }
  if (saving.value) return;
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: form.value.name, type: form.value.type,
      defaultFee: form.value.defaultFee, isActive: form.value.isActive,
    };
    // 条件包邮：以对象形态提交（后端 DTO @IsObject 拒收数组）
    if (form.value.type === "CONDITIONAL" && form.value.freeThreshold > 0) {
      payload.conditionFree = { threshold: form.value.freeThreshold };
    }
    if (regions) payload.regions = regions;
    if (isEdit.value) {
      await api.put(`/shop/freight-templates/${form.value.id}`, payload);
      ElMessage.success("更新成功");
    } else {
      await api.post("/shop/freight-templates", payload);
      ElMessage.success("添加成功");
    }
    dialogVisible.value = false;
    fetchList();
  } catch (e) {
    ElMessage.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "操作失败");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: FreightRow) {
  try {
    await ElMessageBox.confirm(`确定删除模板「${row.name}」吗？`, "删除确认", { type: "warning" });
    if (deleting.value) return;
    deleting.value = true;
    await api.delete(`/shop/freight-templates/${row.id}`);
    ElMessage.success("已删除");
    fetchList();
  } catch { /* 取消 */ } finally { deleting.value = false; }
}
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 16px; }
.field-hint { margin-left: 8px; font-size: 12px; color: #909399; }
</style>
