<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { useAuthStore } from '@/store/auth'
const auth = useAuthStore()
const rows = ref<any[]>([])
const signedJson = ref('')
const percentage = ref(0)
const preview = ref<any>(null)
const error = ref('')
async function load() {
  try {
    const { data } = await api.get('/system/resources')
    rows.value = data || []
  } catch {
    error.value = '资源列表加载失败'
  }
}
onMounted(load)
function inspect() {
  try {
    preview.value = JSON.parse(signedJson.value)
    error.value = ''
  } catch {
    error.value = '签名清单 JSON 格式错误'
    preview.value = null
  }
}
async function save() {
  inspect()
  if (!preview.value?.manifest || !preview.value.signature) return
  await api.post('/system/resources/draft', {
    ...preview.value,
    rolloutPercentage: percentage.value,
  })
  ElMessage.success('签名草稿已保存，未分发')
  await load()
}
async function action(row: any, type: 'publish' | 'retire' | 'rollback') {
  const labels = { publish: '发布', retire: '停发', rollback: '回退分发' }
  await ElMessageBox.confirm(
    labels[type] +
      ' ' +
      row.applicationId +
      '/' +
      row.platform +
      '/' +
      row.channelId +
      ' 资源 ' +
      row.resourceVersion +
      '？仅影响此渠道分发；回退记录不会降低已装资源，坏启动必须由原生恢复机制处理。',
    '资源分发审批',
    { type: 'warning' },
  )
  await api.post('/system/resources/' + row.id + '/' + type)
  await load()
}
</script>
<template>
  <section class="resources">
    <h3>签名资源版本</h3>
    <el-alert
      type="warning"
      :closable="false"
      title="所有渠道默认禁发 WGT。生产签名、商店许可与启动前原生恢复证据缺一不可；当前无生产更新桥接器。"
    />
    <el-input
      v-model="signedJson"
      type="textarea"
      :rows="4"
      placeholder="粘贴离线签名程序生成的 manifest / signature；不得填写签名私钥"
    />
    <el-input-number v-model="percentage" :min="0" :max="100" /> %
    <el-button @click="inspect">预览清单</el-button>
    <el-button @click="save">保存草稿</el-button>
    <el-alert v-if="error" :title="error" type="error" />
    <pre v-if="preview">{{ JSON.stringify(preview.manifest, null, 2) }}</pre>
    <el-table :data="rows">
      <el-table-column prop="applicationId" label="应用" />
      <el-table-column prop="channelId" label="渠道" />
      <el-table-column prop="resourceVersion" label="资源版本" />
      <el-table-column prop="status" label="状态" />
      <el-table-column prop="rolloutPercentage" label="灰度 %" />
      <el-table-column label="操作"
        ><template #default="{ row }">
          <template v-if="auth.isSuperAdmin">
            <el-button v-if="row.status === 'DRAFT'" @click="action(row, 'publish')"
              >发布</el-button
            >
            <el-button v-if="row.status === 'ACTIVE'" @click="action(row, 'retire')"
              >停发</el-button
            >
            <el-button v-if="row.status === 'RETIRED'" @click="action(row, 'rollback')"
              >回退分发</el-button
            >
          </template>
        </template></el-table-column
      >
    </el-table>
  </section>
</template>
<style scoped>
.resources {
  margin-top: 28px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
