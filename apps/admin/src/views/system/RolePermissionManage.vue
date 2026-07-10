<script setup lang="ts">
import { ref, computed } from 'vue'
import { Check } from '@element-plus/icons-vue'

// ─────────────────────────────────────────────────────────────
// 诚实呈现：本平台采用「固定角色权限模型」(RBAC by role)。
// 角色与可访问范围由后端静态 @Roles 装饰器 + 菜单配置 + 路由守卫
// 共同钉死，运行期不可在线编辑。此页为「角色权限总览（只读）」，
// 数据源对齐后端 menu.config.ts 的角色可见性声明（单一声源）。
// ─────────────────────────────────────────────────────────────

const roleList = [
  { label: '超级管理员', value: 'SUPER_ADMIN' },
  { label: '运营管理员', value: 'OPERATION_ADMIN' },
  { label: '内容审核员', value: 'CONTENT_AUDITOR' },
  { label: '财务管理员', value: 'FINANCE_ADMIN' },
  { label: '客服', value: 'CUSTOMER_SERVICE' },
  { label: '商品审核员', value: 'GOODS_AUDITOR' },
]

const ALL_ADMIN = roleList.map(r => r.value)

// 功能模块 → 可访问角色（对齐后端 menu.config.ts，单一声源）
interface MenuScope { title: string; roles: string[] }
const menuScopes: MenuScope[] = [
  { title: '工作台', roles: ALL_ADMIN },
  { title: '内容管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CONTENT_AUDITOR'] },
  { title: '古籍管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CONTENT_AUDITOR'] },
  { title: '诗词雅集', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CONTENT_AUDITOR'] },
  { title: '圈子管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CONTENT_AUDITOR'] },
  { title: '排盘工具', roles: ALL_ADMIN },
  { title: '赛事管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: '课程管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CONTENT_AUDITOR'] },
  { title: '用户管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CUSTOMER_SERVICE'] },
  { title: '文章管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CONTENT_AUDITOR'] },
  { title: '交易管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'FINANCE_ADMIN', 'GOODS_AUDITOR'] },
  { title: '会员管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'FINANCE_ADMIN'] },
  { title: '商城管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'GOODS_AUDITOR'] },
  { title: '创作者中心', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: '商家管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: '营销管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: '财务管理', roles: ['SUPER_ADMIN', 'FINANCE_ADMIN'] },
  { title: '营销分佣', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'FINANCE_ADMIN'] },
  { title: '风控中心', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CUSTOMER_SERVICE'] },
  { title: 'AI管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: '管理驾驶舱', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: '对外大屏', roles: ALL_ADMIN },
  { title: '数据看板', roles: ALL_ADMIN },
  { title: '线下管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: '通知管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CUSTOMER_SERVICE'] },
  { title: '短信管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: '研究院管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: '举报管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CUSTOMER_SERVICE'] },
  { title: '评论管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CONTENT_AUDITOR'] },
  { title: '互动数据', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CONTENT_AUDITOR'] },
  { title: '自动化运营', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: '搜索分析', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: 'IM管理', roles: ['SUPER_ADMIN', 'OPERATION_ADMIN'] },
  { title: '系统管理', roles: ['SUPER_ADMIN'] },
]

const selectedRole = ref('SUPER_ADMIN')

const currentRoleLabel = computed(
  () => roleList.find(r => r.value === selectedRole.value)?.label || '',
)

const accessibleMenus = computed(
  () => menuScopes.filter(m => m.roles.includes(selectedRole.value)),
)
const deniedMenus = computed(
  () => menuScopes.filter(m => !m.roles.includes(selectedRole.value)),
)

function canAccess(menu: MenuScope, role: string) {
  return menu.roles.includes(role)
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>角色权限总览（只读）</h3>
    </div>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom:16px"
    >
      <template #title>
        平台采用固定角色权限模型（RBAC by role）
      </template>
      <div style="line-height:1.7">
        各角色的可访问菜单与功能范围由系统在代码层固定（后端静态权限校验 + 菜单配置 + 路由守卫共同生效），
        <strong>不支持在线编辑</strong>。本页仅作权限范围只读展示，如需调整角色权限，请联系开发团队。
      </div>
    </el-alert>

    <div class="layout">
      <div class="left-panel">
        <div class="panel-title">
          角色列表
        </div>
        <el-radio-group
          v-model="selectedRole"
          style="width:100%"
        >
          <el-radio-button
            v-for="role in roleList"
            :key="role.value"
            :value="role.value"
            style="display:block;margin-bottom:8px"
          >
            {{ role.label }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="right-panel">
        <div class="panel-title">
          可访问范围 — {{ currentRoleLabel }}
        </div>

        <div class="scope-block">
          <div class="scope-label">
            可访问功能（{{ accessibleMenus.length }}）
          </div>
          <div class="tag-wrap">
            <el-tag
              v-for="m in accessibleMenus"
              :key="m.title"
              type="success"
              effect="light"
              size="large"
              style="margin:0 8px 8px 0"
            >
              {{ m.title }}
            </el-tag>
          </div>
        </div>

        <div
          v-if="deniedMenus.length"
          class="scope-block"
        >
          <div class="scope-label">
            无权限（{{ deniedMenus.length }}）
          </div>
          <div class="tag-wrap">
            <el-tag
              v-for="m in deniedMenus"
              :key="m.title"
              type="info"
              effect="plain"
              size="large"
              style="margin:0 8px 8px 0;opacity:.6"
            >
              {{ m.title }}
            </el-tag>
          </div>
        </div>

        <div class="panel-title" style="margin-top:24px">
          全角色权限矩阵
        </div>
        <el-table
          :data="menuScopes"
          border
          size="small"
          max-height="480"
        >
          <el-table-column
            prop="title"
            label="功能模块"
            width="140"
            fixed
          />
          <el-table-column
            v-for="role in roleList"
            :key="role.value"
            :label="role.label"
            align="center"
            min-width="110"
          >
            <template #default="{ row }">
              <el-icon
                v-if="canAccess(row, role.value)"
                color="var(--el-color-success)"
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.layout { display: flex; gap: 20px; min-height: 500px; }
.left-panel { width: 200px; flex-shrink: 0; }
.right-panel { flex: 1; min-width: 0; }
.panel-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid var(--color-primary, #8b4513); color: var(--color-text-title); }
.scope-block { margin-bottom: 20px; }
.scope-label { font-size: 14px; font-weight: 500; margin-bottom: 10px; color: var(--color-text-regular); }
.tag-wrap { display: flex; flex-wrap: wrap; }
</style>
