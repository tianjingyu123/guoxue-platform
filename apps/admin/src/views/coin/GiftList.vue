<template>
  <div class="page">
    <div class="header">
      <h2>礼物管理</h2>
      <div class="filter-row">
        <el-button
          type="primary"
          @click="openCreate"
        >
          新增礼物
        </el-button>
        <el-button @click="exportData">
          导出CSV
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
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
        <el-empty description="暂无礼物" />
      </template>
      <el-table-column
        prop="name"
        label="名称"
        min-width="140"
      />
      <el-table-column
        label="图标"
        width="80"
      >
        <template #default="{ row }">
          <el-image
            v-if="row.icon"
            :src="row.icon"
            style="width: 36px; height: 36px; border-radius: 4px"
            fit="cover"
          />
          <span
            v-else
            style="color: #999"
          >无</span>
        </template>
      </el-table-column>
      <el-table-column
        label="价格（币）"
        width="110"
      >
        <template #default="{ row }">
          {{ row.priceCoin ?? row.price }} 币
        </template>
      </el-table-column>
      <el-table-column
        label="等级"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="levelType(row.level)"
            size="small"
          >
            {{ levelLabel(row.level) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="排序"
        width="70"
      >
        <template #default="{ row }">
          {{ row.sortOrder ?? row.sort }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-switch
            :model-value="(row.status ?? 'ACTIVE') === 'ACTIVE'"
            active-text="启用"
            inactive-text="停用"
            :loading="togglingId === row.id"
            @change="(v: boolean) => toggleStatus(row, v)"
          />
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="180"
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
            @click="handleDeleteGift(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > pageSize"
      v-model:current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top: 16px; justify-content: flex-end"
      @current-change="fetchList"
    />

    <!-- 新增/编辑礼物弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑礼物' : '新增礼物'"
      width="550px"
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
            placeholder="礼物名称"
          />
        </el-form-item>
        <el-form-item
          label="图标URL"
          required
        >
          <el-input
            v-model="form.icon"
            placeholder="https://..."
          />
          <div
            v-if="form.icon"
            style="margin-top: 8px"
          >
            <el-image
              :src="form.icon"
              style="width: 48px; height: 48px; border-radius: 4px"
              fit="cover"
            />
          </div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item
              label="价格（币）"
              required
            >
              <el-input-number
                v-model="form.price"
                :min="1"
                :step="10"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="等级"
              required
            >
              <el-select
                v-model="form.level"
                style="width: 100%"
              >
                <el-option
                  label="基础"
                  value="BASIC"
                />
                <el-option
                  label="中级"
                  value="MID"
                />
                <el-option
                  label="高级"
                  value="HIGH"
                />
                <el-option
                  label="顶级"
                  value="TOP"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item
          label="排序"
          required
        >
          <el-input-number
            v-model="form.sort"
            :min="0"
            :step="1"
            style="width: 100%"
          />
          <span style="color: var(--color-text-secondary); font-size: 12px; margin-left: 8px">数字越小越靠前</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveGift"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { coinApi, api } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";
import { exportCSV } from "@/utils/export";

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref(false);
const saving = ref(false);

const dialogVisible = ref(false);
const editingId = ref("");
const togglingId = ref("");

const form = reactive({
  name: "",
  icon: "",
  price: 10,
  level: "BASIC",
  sort: 0,
});

onMounted(() => fetchList());

function levelType(level: string) {
  const map: Record<string, string> = {
    BASIC: "info",
    MID: "primary",
    HIGH: "warning",
    TOP: "danger",
  };
  return map[level] || "info";
}

function levelLabel(level: string) {
  const map: Record<string, string> = {
    BASIC: "基础",
    MID: "中级",
    HIGH: "高级",
    TOP: "顶级",
  };
  return map[level] || level;
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await coinApi.getGifts();
    const items = (data as any).gifts || (data as any).list || data || [];
    list.value = Array.isArray(items) ? items : [];
    total.value = list.value.length;
  } catch {
    list.value = [];
    total.value = 0;
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, { name: "", icon: "", price: 10, level: "BASIC", sort: 0 });
  editingId.value = "";
}

function openCreate() {
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: any) {
  resetForm();
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name || "",
    icon: row.icon || "",
    price: Number(row.priceCoin ?? row.price) || 10,
    level: row.level || "BASIC",
    sort: row.sortOrder ?? row.sort ?? 0,
  });
  dialogVisible.value = true;
}

async function saveGift() {
  if (saving.value) return;
  if (!form.name) {
    ElMessage.warning("请输入礼物名称");
    return;
  }
  if (!form.icon) {
    ElMessage.warning("请输入图标URL");
    return;
  }
  saving.value = true;
  try {
    if (editingId.value) {
      // 编辑走 PUT /coin/gifts/:id（原误调 POST 创建端点会生成重复礼物）
      await api.put(`/coin/gifts/${editingId.value}`, { ...form });
      ElMessage.success("已更新");
    } else {
      await coinApi.createGift({ ...form });
      ElMessage.success("已创建");
    }
    dialogVisible.value = false;
    fetchList();
  } catch {
    /* 错误由请求拦截器统一提示 */
  } finally {
    saving.value = false;
  }
}

async function handleDeleteGift(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除礼物「${row.name}」？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    await coinApi.deleteGift(row.id);
    ElMessage.success("已删除");
    fetchList();
  } catch {
    // 取消不处理
  }
}

// 启用/停用：调 PUT /coin/gifts/:id 更新 status（后端已支持 status 字段，
// admin 列表返回全部礼物含停用项；C 端送礼面板走 /live/gifts 仅返回 ACTIVE，不受影响）
async function toggleStatus(row: any, active: boolean) {
  if (togglingId.value) return;
  togglingId.value = row.id;
  const nextStatus = active ? "ACTIVE" : "INACTIVE";
  try {
    await api.put(`/coin/gifts/${row.id}`, { status: nextStatus });
    row.status = nextStatus;
    ElMessage.success(active ? "已启用" : "已停用");
  } catch {
    /* 错误由请求拦截器统一提示；开关因绑定 model-value 会自动回弹 */
  } finally {
    togglingId.value = "";
  }
}

// 已移除「发送/发放礼物」入口：唯一可用端点 POST /coin/gifts/send 走直播打赏链路，
// 会从管理员本人账户扣除灵石、直播间写死为 "admin"，并触发平台抽成，并非「管理员向用户发放礼物」。
// 平台无「管理员赠礼/发放」端点，故移除该误用入口（如需发放可走 POST /coin/admin/recharge 直接充值灵石）。

function exportData() {
  exportCSV(
    "礼物列表",
    [
      { label: "名称", key: "name" },
      { label: "图标", key: "icon" },
      { label: "价格(币)", key: "price" },
      { label: "等级", key: "level" },
      { label: "排序", key: "sort" },
    ],
    list.value.map((g) => ({
      name: g.name,
      icon: g.icon || "--",
      price: g.priceCoin ?? g.price,
      level: levelLabel(g.level),
      sort: g.sortOrder ?? g.sort,
    })),
  );
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: var(--color-text-title); }
.filter-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>
