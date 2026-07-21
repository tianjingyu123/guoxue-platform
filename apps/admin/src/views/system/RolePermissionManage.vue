<script setup lang="ts">
import { computed, ref } from "vue";
import { Check } from "@element-plus/icons-vue";
import { buildMenus, type MenuNode } from "@/lib/menu-structure";

const roleList = [
  { label: "超级管理员", value: "SUPER_ADMIN" },
  { label: "运营管理员", value: "OPERATION_ADMIN" },
  { label: "内容审核员", value: "CONTENT_AUDITOR" },
  { label: "财务管理员", value: "FINANCE_ADMIN" },
  { label: "客服管理员", value: "CUSTOMER_SERVICE" },
  { label: "商品审核员", value: "GOODS_AUDITOR" },
];

interface FlatMenu {
  path: string;
  title: string;
  breadcrumb: string;
  group: string;
}

interface PermissionRow extends FlatMenu {
  roles: string[];
}

function flattenMenus(nodes: MenuNode[], trail: string[] = []): FlatMenu[] {
  const out: FlatMenu[] = [];
  for (const node of nodes) {
    const nextTrail = [...trail, node.title];
    if (node.path) {
      out.push({
        path: node.path,
        title: node.title,
        breadcrumb: nextTrail.join(" / "),
        group: trail[0] || node.title || "其他",
      });
    }
    if (node.children?.length) out.push(...flattenMenus(node.children, nextTrail));
  }
  return out;
}

/**
 * 权限矩阵直接由当前菜单构建器生成：路由 meta.roles、菜单下架项和兜底入口
 * 发生变化时本页同步更新，不再维护第二套容易过期的手工权限清单。
 */
const permissionRows = computed<PermissionRow[]>(() => {
  const rows = new Map<string, PermissionRow>();
  for (const role of roleList) {
    for (const item of flattenMenus(buildMenus([role.value]))) {
      const existing = rows.get(item.path);
      if (existing) {
        existing.roles.push(role.value);
      } else {
        rows.set(item.path, { ...item, roles: [role.value] });
      }
    }
  }
  return [...rows.values()].sort((a, b) =>
    a.group.localeCompare(b.group, "zh-CN") || a.breadcrumb.localeCompare(b.breadcrumb, "zh-CN"),
  );
});

const selectedRole = ref("SUPER_ADMIN");
const keyword = ref("");
const accessFilter = ref<"all" | "allowed" | "denied">("all");

const currentRoleLabel = computed(
  () => roleList.find((r) => r.value === selectedRole.value)?.label || "",
);

const accessibleMenus = computed(() =>
  permissionRows.value.filter((item) => item.roles.includes(selectedRole.value)),
);

const groupSummary = computed(() => {
  const groups = new Map<string, number>();
  for (const item of accessibleMenus.value) {
    groups.set(item.group, (groups.get(item.group) || 0) + 1);
  }
  return [...groups.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
});

const visibleRows = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  return permissionRows.value.filter((row) => {
    const allowed = row.roles.includes(selectedRole.value);
    if (accessFilter.value === "allowed" && !allowed) return false;
    if (accessFilter.value === "denied" && allowed) return false;
    if (!q) return true;
    return `${row.breadcrumb} ${row.path}`.toLowerCase().includes(q);
  });
});

function canAccess(row: PermissionRow, role: string) {
  return row.roles.includes(role);
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h3>角色权限总览</h3>
        <p>按当前路由权限与菜单结构实时生成，只读展示实际可达入口。</p>
      </div>
      <el-tag
        type="info"
        effect="plain"
      >
        固定 RBAC · 不支持在线改权
      </el-tag>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="truth-alert"
    >
      <template #title>
        本页数据来自当前菜单构建器和路由 meta.roles
      </template>
      <div class="alert-copy">
        页面入口权限与后端接口权限共同生效；这里展示的是当前前端可达范围，后端仍会对每次请求独立鉴权。
        如需调整角色权限，必须经代码评审与发布流程完成。
      </div>
    </el-alert>

    <el-card
      shadow="never"
      class="role-card"
    >
      <div class="role-title">
        查看角色
      </div>
      <el-radio-group
        v-model="selectedRole"
        class="role-selector"
      >
        <el-radio-button
          v-for="role in roleList"
          :key="role.value"
          :value="role.value"
        >
          {{ role.label }}
        </el-radio-button>
      </el-radio-group>
      <div class="role-meta">
        <strong>{{ currentRoleLabel }}</strong>
        <span>可访问 {{ accessibleMenus.length }} 个页面入口，覆盖 {{ groupSummary.length }} 个工作分组</span>
      </div>
      <div class="group-grid">
        <div
          v-for="group in groupSummary"
          :key="group.name"
          class="group-stat"
        >
          <span>{{ group.name }}</span>
          <strong>{{ group.count }}</strong>
        </div>
      </div>
    </el-card>

    <el-card
      shadow="never"
      class="matrix-card"
    >
      <div class="matrix-toolbar">
        <div>
          <h4>精确入口权限矩阵</h4>
          <span>共 {{ permissionRows.length }} 个当前可用入口</span>
        </div>
        <div class="matrix-filters">
          <el-input
            v-model="keyword"
            clearable
            placeholder="搜索功能或路径"
          />
          <el-select
            v-model="accessFilter"
            style="width:140px"
          >
            <el-option
              label="全部入口"
              value="all"
            />
            <el-option
              :label="`${currentRoleLabel}可访问`"
              value="allowed"
            />
            <el-option
              :label="`${currentRoleLabel}无权限`"
              value="denied"
            />
          </el-select>
        </div>
      </div>
      <el-table
        :data="visibleRows"
        row-key="path"
        border
        stripe
        size="small"
        max-height="640"
      >
        <el-table-column
          prop="breadcrumb"
          label="功能入口"
          min-width="260"
          fixed
        />
        <el-table-column
          prop="path"
          label="路由"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column
          v-for="role in roleList"
          :key="role.value"
          :label="role.label"
          align="center"
          min-width="110"
        >
          <template #default="{ row }: { row: PermissionRow }">
            <el-icon
              v-if="canAccess(row, role.value)"
              color="var(--el-color-success-dark-2)"
            >
              <Check />
            </el-icon>
            <span
              v-else
              style="color:var(--color-text-secondary)"
            >—</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="matrix-foot">
        当前筛选显示 {{ visibleRows.length }} 条
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
}
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.page-head h3 {
  margin: 0;
  font-size: 20px;
  color: var(--color-text-title);
}
.page-head p {
  margin: 6px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.truth-alert {
  margin-bottom: 16px;
}
.alert-copy {
  line-height: 1.7;
}
.role-card,
.matrix-card {
  border-color: var(--color-divider);
}
.matrix-card {
  margin-top: 16px;
}
.role-title {
  margin-bottom: 10px;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.role-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 0;
}
.role-meta {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 18px;
}
.role-meta strong {
  color: var(--color-primary);
  font-size: 18px;
}
.role-meta span {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.group-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
}
.group-stat span {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-regular);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group-stat strong {
  margin-left: 10px;
  color: var(--color-gold);
  font-variant-numeric: tabular-nums;
}
.matrix-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.matrix-toolbar h4 {
  margin: 0 0 4px;
  color: var(--color-text-title);
  font-size: 16px;
}
.matrix-toolbar span {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.matrix-filters {
  display: flex;
  gap: 10px;
  width: min(480px, 100%);
}
.matrix-filters .el-input {
  flex: 1;
}
.matrix-foot {
  margin-top: 10px;
  color: var(--color-text-secondary);
  font-size: 12px;
  text-align: right;
}

@media (max-width: 900px) {
  .page-head,
  .matrix-toolbar,
  .role-meta {
    align-items: stretch;
    flex-direction: column;
  }
  .matrix-filters {
    width: 100%;
  }
}
</style>
