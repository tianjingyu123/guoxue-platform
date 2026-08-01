<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";

const exporting = ref("");
const exportTypes = [
  { key: "users", label: "用户数据", icon: "👤", desc: "导出用户列表，含昵称、手机号、注册时间等" },
  { key: "orders", label: "订单数据", icon: "📦", desc: "导出订单列表，含金额、状态、支付时间等" },
  { key: "contents", label: "内容数据", icon: "📝", desc: "导出内容列表，含标题、类型、发布时间等" },
  { key: "audit-logs", label: "审计日志", icon: "📋", desc: "导出操作审计日志，含操作人、动作、时间等" },
  { key: "earnings", label: "佣金收益", icon: "💰", desc: "导出佣金收益记录，含分站、金额、状态等" },
];

const excelTypes = [
  { key: "users", label: "用户数据 (Excel)", icon: "📊" },
  { key: "orders", label: "订单数据 (Excel)", icon: "📊" },
];

async function exportCsv(type: string) {
  exporting.value = type;
  try {
    const { api } = await import("@/api");
    // 后端导出端点均为 POST（system.controller @Post("export/users") 等），此前误写为 GET 导致 404
    const res = await api.post(`/system/export/${type}`, {}, { responseType: "blob" });
    downloadBlob(res.data, `${type}-${Date.now()}.csv`);
    ElMessage.success("导出成功");
  } catch {
    ElMessage.error("导出失败");
  } finally {
    exporting.value = "";
  }
}

async function exportExcel(type: string) {
  exporting.value = type;
  try {
    const { api } = await import("@/api");
    const res = await api.post("/system/export/excel", { type, filters: {} }, { responseType: "blob" });
    downloadBlob(res.data, `${type}-${Date.now()}.xls`);
    ElMessage.success("导出成功");
  } catch {
    ElMessage.error("导出失败");
  } finally {
    exporting.value = "";
  }
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h2>数据导出中心</h2>
    </div>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="导出口径：全量导出"
      description="本页所有导出均为「全量导出」——不带任何筛选条件，导出对应数据表的全部记录。数据量大时文件较大、耗时较长，且可能包含手机号等敏感字段，请遵守数据安全规范，导出后妥善保管、勿外传。如需按条件筛选导出，请到对应业务列表页（如订单、用户）使用页内导出。"
      style="margin-bottom:16px"
    />

    <el-row :gutter="16">
      <el-col
        v-for="t in exportTypes"
        :key="t.key"
        :span="8"
        style="margin-bottom:16px"
      >
        <el-card shadow="hover">
          <template #header>
            <span>{{ t.icon }} {{ t.label }}</span>
          </template>
          <p style="color:var(--color-text-secondary);font-size:13px;min-height:36px">
            {{ t.desc }}
          </p>
          <el-button
            type="primary"
            :loading="exporting === t.key"
            style="width:100%"
            @click="exportCsv(t.key)"
          >
            导出 CSV
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <el-divider content-position="left">
      Excel 导出
    </el-divider>

    <el-row :gutter="16">
      <el-col
        v-for="t in excelTypes"
        :key="t.key"
        :span="8"
        style="margin-bottom:16px"
      >
        <el-card shadow="hover">
          <template #header>
            <span>{{ t.icon }} {{ t.label }}</span>
          </template>
          <el-button
            type="success"
            :loading="exporting === t.key"
            style="width:100%"
            @click="exportExcel(t.key)"
          >
            导出 Excel
          </el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0; }
</style>
