<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'

const loading = ref(false)
const saving = ref(false)
const treeRef = ref<any>(null)
const selectedRole = ref('SUPER_ADMIN')
const checkedKeys = ref<string[]>([])
const defaultExpandedKeys = ref<string[]>([])

const roleList = [
  { label: '超级管理员', value: 'SUPER_ADMIN' },
  { label: '运营管理员', value: 'OPERATION_ADMIN' },
  { label: '内容审核员', value: 'CONTENT_AUDITOR' },
  { label: '财务管理员', value: 'FINANCE_ADMIN' },
  { label: '客服', value: 'CUSTOMER_SERVICE' },
  { label: '商品审核员', value: 'GOODS_AUDITOR' },
]

const permissionModules = [
  {
    module: 'content',
    label: '内容管理',
    permissions: [
      { key: 'content:view', label: '查看内容' },
      { key: 'content:create', label: '创建内容' },
      { key: 'content:edit', label: '编辑内容' },
      { key: 'content:delete', label: '删除内容' },
      { key: 'content:audit', label: '审核内容' },
      { key: 'content:publish', label: '发布内容' },
    ],
  },
  {
    module: 'course',
    label: '课程管理',
    permissions: [
      { key: 'course:view', label: '查看课程' },
      { key: 'course:create', label: '创建课程' },
      { key: 'course:edit', label: '编辑课程' },
      { key: 'course:delete', label: '删除课程' },
      { key: 'course:audit', label: '审核课程' },
    ],
  },
  {
    module: 'user',
    label: '用户管理',
    permissions: [
      { key: 'user:view', label: '查看用户' },
      { key: 'user:create', label: '创建用户' },
      { key: 'user:edit', label: '编辑用户' },
      { key: 'user:ban', label: '封禁/解封' },
      { key: 'user:role', label: '分配角色' },
      { key: 'user:delete', label: '删除用户' },
    ],
  },
  {
    module: 'order',
    label: '订单管理',
    permissions: [
      { key: 'order:view', label: '查看订单' },
      { key: 'order:edit', label: '编辑订单' },
      { key: 'order:refund', label: '退款操作' },
      { key: 'order:ship', label: '发货操作' },
    ],
  },
  {
    module: 'marketing',
    label: '营销管理',
    permissions: [
      { key: 'marketing:view', label: '查看营销' },
      { key: 'marketing:create', label: '创建活动' },
      { key: 'marketing:edit', label: '编辑活动' },
      { key: 'marketing:delete', label: '删除活动' },
      { key: 'marketing:coupon', label: '优惠券管理' },
    ],
  },
  {
    module: 'finance',
    label: '财务管理',
    permissions: [
      { key: 'finance:view', label: '查看财务' },
      { key: 'finance:reconciliation', label: '对账管理' },
      { key: 'finance:settlement', label: '结算管理' },
      { key: 'finance:withdrawal', label: '提现审核' },
    ],
  },
  {
    module: 'system',
    label: '系统管理',
    permissions: [
      { key: 'system:config', label: '系统配置' },
      { key: 'system:log', label: '操作日志' },
      { key: 'system:role', label: '角色管理' },
      { key: 'system:webhook', label: 'Webhook管理' },
      { key: 'system:sensitive', label: '敏感词管理' },
    ],
  },
]

const treeData = computed(() => {
  return permissionModules.map(m => ({
    id: m.module,
    label: m.label,
    children: m.permissions.map(p => ({
      id: p.key,
      label: p.label,
    })),
  }))
})

onMounted(() => {
  defaultExpandedKeys.value = permissionModules.map(m => m.module)
  loadRolePermissions()
})

async function loadRolePermissions() {
  loading.value = true
  try {
    const { data } = await api.get(`/admin/roles/${selectedRole.value}/permissions`)
    const perms = data?.permissions || data?.data || []
    checkedKeys.value = Array.isArray(perms) ? perms : []
  } catch {
    checkedKeys.value = []
  } finally {
    loading.value = false
  }
}

function handleRoleChange(val: string) {
  selectedRole.value = val
  loadRolePermissions()
}

function onTreeCheck(_data: any, treeState: any) {
  checkedKeys.value = treeState.checkedKeys
}

async function savePermissions() {
  saving.value = true
  try {
    await api.put(`/admin/roles/${selectedRole.value}/permissions`, {
      permissions: checkedKeys.value,
    })
    ElMessage.success('权限已保存')
  } catch { } finally { saving.value = false }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>角色权限管理</h3>
    </div>

    <div class="layout">
      <div class="left-panel">
        <div class="panel-title">
          角色列表
        </div>
        <el-radio-group
          v-model="selectedRole"
          vertical
          style="width:100%"
          @change="handleRoleChange"
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
          权限分配 — {{ roleList.find(r => r.value === selectedRole)?.label }}
        </div>
        <div
          v-loading="loading"
          class="tree-wrapper"
        >
          <el-tree
            ref="treeRef"
            :data="treeData"
            :props="{ label: 'label', children: 'children' }"
            node-key="id"
            :default-checked-keys="checkedKeys"
            :default-expanded-keys="defaultExpandedKeys"
            show-checkbox
            check-strictly
            @check="onTreeCheck"
          />
        </div>
        <div style="margin-top:16px;text-align:right">
          <el-button
            type="primary"
            :loading="saving"
            @click="savePermissions"
          >
            保存权限
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
.layout { display: flex; gap: 20px; min-height: 500px; }
.left-panel { width: 200px; flex-shrink: 0; }
.right-panel { flex: 1; min-width: 0; }
.panel-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #8b4513; color: #333; }
.tree-wrapper { border: 1px solid #ebeef5; border-radius: 4px; padding: 16px; background: #fafafa; min-height: 300px; }
</style>
