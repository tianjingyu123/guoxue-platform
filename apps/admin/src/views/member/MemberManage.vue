<template>
  <div class="page">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="手动授予" name="grant" />
      <el-tab-pane label="撤销会员" name="revoke" />
    </el-tabs>

    <!-- 授予 -->
    <div v-if="activeTab === 'grant'" style="max-width:500px;margin-top:16px">
      <el-form :model="grantForm" label-width="90px">
        <el-form-item label="用户ID" required>
          <el-input v-model="grantForm.userId" placeholder="输入要授予的用户ID" />
        </el-form-item>
        <el-form-item label="会员等级" required>
          <el-select v-model="grantForm.level" style="width:100%">
            <el-option label="月卡 (MONTHLY)" value="MONTHLY" />
            <el-option label="年卡 (YEARLY)" value="YEARLY" />
            <el-option label="永久 (LIFETIME)" value="LIFETIME" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="grantForm.level !== 'LIFETIME'" label="有效天数">
          <el-input-number v-model="grantForm.durationDays" :min="1" :max="3650" style="width:100%" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="granting" @click="doGrant">确认授予</el-button>
        </el-form-item>
      </el-form>
      <el-alert type="info" :closable="false" show-icon style="margin-top:12px">
        <template #title>手动授予不收费，到期时间按所选等级计算。月卡默认30天、年卡默认365天、永久无需设置天数。</template>
      </el-alert>
    </div>

    <!-- 撤销 -->
    <div v-if="activeTab === 'revoke'" style="max-width:500px;margin-top:16px">
      <el-form label-width="90px">
        <el-form-item label="用户ID" required>
          <el-input v-model="revokeUserId" placeholder="输入要撤销的用户ID" />
        </el-form-item>
        <el-form-item>
          <el-button type="danger" :loading="revoking" @click="doRevoke">确认撤销</el-button>
        </el-form-item>
      </el-form>
      <el-alert type="warning" :closable="false" show-icon style="margin-top:12px">
        <template #title>撤销后用户将立即降为普通用户（NONE），所有会员权益失效。此操作不可逆，请谨慎。</template>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { memberAdminApi } from '@/api'

const activeTab = ref('grant')
const granting = ref(false); const revoking = ref(false); const revokeUserId = ref('')
const grantForm = reactive({ userId: '', level: 'MONTHLY', durationDays: 30 })

async function doGrant() {
  if (!grantForm.userId) { ElMessage.warning('请输入用户ID'); return }
  granting.value = true
  try {
    await memberAdminApi.grant({ userId: grantForm.userId, level: grantForm.level, durationDays: grantForm.durationDays || undefined })
    ElMessage.success(`已授予 ${grantForm.userId} ${grantForm.level} 会员`)
  } catch { } finally { granting.value = false }
}

async function doRevoke() {
  if (!revokeUserId.value) { ElMessage.warning('请输入用户ID'); return }
  try {
    await ElMessageBox.confirm(`确定撤销 ${revokeUserId.value} 的会员资格吗？此操作不可逆。`, '危险操作', { type: 'error', confirmButtonText: '确认撤销' })
  } catch { return }
  revoking.value = true
  try {
    await memberAdminApi.revoke(revokeUserId.value)
    ElMessage.success(`已撤销 ${revokeUserId.value} 的会员`)
  } catch { } finally { revoking.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
