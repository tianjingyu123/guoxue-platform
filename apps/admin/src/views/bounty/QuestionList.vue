<template>
  <div class="page">
    <div class="header">
      <h2>赏金问题管理</h2>
    </div>

    <el-form
      :inline="true"
      class="search-bar"
    >
      <el-form-item label="分类">
        <el-select
          v-model="filterCategory"
          placeholder="全部"
          clearable
        >
          <el-option
            label="八字"
            value="BAZI"
          />
          <el-option
            label="紫微"
            value="ZIWEI"
          />
          <el-option
            label="六爻"
            value="LIUYAO"
          />
          <el-option
            label="风水"
            value="FENGSHUI"
          />
          <el-option
            label="综合"
            value="GENERAL"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select
          v-model="filterStatus"
          placeholder="全部"
          clearable
        >
          <el-option
            label="待回答"
            value="PENDING"
          />
          <el-option
            label="已回答"
            value="ANSWERED"
          />
          <el-option
            label="已采纳"
            value="ACCEPTED"
          />
          <el-option
            label="已关闭"
            value="CLOSED"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="fetchList"
        >
          搜索
        </el-button>
        <el-button @click="resetFilter">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        prop="title"
        label="问题标题"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        prop="category"
        label="分类"
        width="90"
      >
        <template #default="{ row }">
          <el-tag>{{ categoryLabel(row.category) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="bountyCoin"
        label="赏金"
        width="90"
        sortable
      >
        <template #default="{ row }">
          {{ row.bountyCoin }} 币
        </template>
      </el-table-column>
      <el-table-column
        prop="asker"
        label="提问者"
        width="130"
      >
        <template #default="{ row }">
          {{ row.asker?.nickname || row.askerId }}
        </template>
      </el-table-column>
      <el-table-column
        prop="answerer"
        label="回答者"
        width="130"
      >
        <template #default="{ row }">
          {{ row.answerer?.nickname || row.answererId || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="status"
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        label="创建时间"
        width="170"
      />
      <el-table-column
        label="操作"
        width="120"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="danger"
            @click="handleClose(row)"
          >
            关闭
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";

const loading = ref(false);
const list = ref<any[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterCategory = ref("");
const filterStatus = ref("");

function categoryLabel(cat: string) {
  const map: Record<string, string> = { BAZI: "八字", ZIWEI: "紫微", LIUYAO: "六爻", FENGSHUI: "风水", GENERAL: "综合" };
  return map[cat] || cat;
}

function statusTag(status: string) {
  const map: Record<string, string> = { PENDING: "info", ANSWERED: "warning", ACCEPTED: "success", CLOSED: "danger" };
  return map[status] || "info";
}

function statusLabel(status: string) {
  const map: Record<string, string> = { PENDING: "待回答", ANSWERED: "已回答", ACCEPTED: "已采纳", CLOSED: "已关闭" };
  return map[status] || status;
}

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (filterCategory.value) params.category = filterCategory.value;
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await axios.get("/admin/bounty/questions", { params });
    list.value = res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    ElMessage.error("获取问题列表失败");
  } finally {
    loading.value = false;
  }
}

function resetFilter() {
  filterCategory.value = "";
  filterStatus.value = "";
  fetchList();
}

async function handleClose(row: any) {
  try {
    await ElMessageBox.confirm(`确定关闭问题"${row.title}"吗？`, "确认关闭", { type: "warning" });
    await axios.put(`/admin/bounty/questions/${row.id}/close`);
    ElMessage.success("已关闭");
    fetchList();
  } catch {
    // cancelled or error
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
</style>
