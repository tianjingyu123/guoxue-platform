<template>
  <div class="page">
    <div class="toolbar">
      <h3>邮件管理</h3>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane
        label="发送邮件"
        name="send"
      />
      <el-tab-pane
        label="模板管理"
        name="templates"
      />
      <el-tab-pane
        label="发送历史"
        name="history"
      />
    </el-tabs>

    <!-- 发送邮件 -->
    <div v-if="activeTab === 'send'">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-card>
            <template #header>
              发送单封邮件
            </template>
            <el-form
              :model="emailForm"
              label-width="80px"
            >
              <el-form-item
                label="收件人"
                required
              >
                <el-input
                  v-model="emailForm.to"
                  placeholder="user@example.com"
                />
              </el-form-item>
              <el-form-item
                label="主题"
                required
              >
                <el-input v-model="emailForm.subject" />
              </el-form-item>
              <el-form-item label="使用模板">
                <el-select
                  v-model="selectedTemplate"
                  placeholder="选择已保存的模板"
                  clearable
                  style="width:100%"
                  @change="applyTemplate"
                >
                  <el-option
                    v-for="t in templates"
                    :key="t.id"
                    :label="t.name"
                    :value="t.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item
                label="内容(HTML)"
                required
              >
                <el-input
                  v-model="emailForm.html"
                  type="textarea"
                  :rows="8"
                  placeholder="HTML 格式邮件内容，支持变量 {{ username }} {{ siteName }}"
                />
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="sending"
                  @click="sendEmail"
                >
                  发送邮件
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>
              邮件配置测试
            </template>
            <p style="color:var(--color-text-secondary);margin-bottom:16px">
              测试当前 SMTP 邮件服务配置是否正常
            </p>
            <el-form label-width="80px">
              <el-form-item
                label="邮箱地址"
                required
              >
                <el-input
                  v-model="verifyEmail"
                  placeholder="user@example.com"
                />
              </el-form-item>
              <el-form-item>
                <el-button
                  :loading="sending"
                  @click="sendVerifyCode"
                >
                  发送测试验证码
                </el-button>
              </el-form-item>
            </el-form>
            <el-divider />
            <el-button
              type="primary"
              :loading="sending"
              @click="testEmail"
            >
              测试 SMTP 连接
            </el-button>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 模板管理 -->
    <div v-if="activeTab === 'templates'">
      <div style="margin-bottom:12px">
        <el-button
          type="primary"
          size="small"
          @click="openTemplateCreate"
        >
          新建模板
        </el-button>
      </div>
      <el-table
        :data="templates"
        stripe
        empty-text=" "
      >
        <template #empty>
          <el-empty description="暂无模板 — 模板保存在浏览器本地存储" />
        </template>
        <el-table-column
          prop="name"
          label="模板名称"
          min-width="150"
        />
        <el-table-column
          prop="subject"
          label="默认主题"
          min-width="150"
        />
        <el-table-column
          label="上次更新"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
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
              @click="openTemplateEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="useTemplate(row)"
            >
              使用
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="delTemplate(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog
        v-model="tVis"
        :title="tEditingId ? '编辑模板' : '新建模板'"
        width="550px"
      >
        <el-form
          :model="tForm"
          label-width="80px"
        >
          <el-form-item
            label="名称"
            required
          >
            <el-input v-model="tForm.name" />
          </el-form-item>
          <el-form-item label="默认主题">
            <el-input
              v-model="tForm.subject"
              placeholder="可以为空，使用时手动填写"
            />
          </el-form-item>
          <el-form-item
            label="内容(HTML)"
            required
          >
            <el-input
              v-model="tForm.html"
              type="textarea"
              :rows="10"
              placeholder="支持变量 {{ username }} {{ siteName }} {{ date }}"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="tVis = false">
            取消
          </el-button><el-button
            type="primary"
            :loading="tSaving"
            @click="saveTemplate"
          >
            保存模板
          </el-button>
        </template>
      </el-dialog>
    </div>

    <!-- 发送历史 -->
    <div v-if="activeTab === 'history'">
      <el-table
        :data="sendHistory"
        stripe
        empty-text=" "
      >
        <template #empty>
          <el-empty description="暂无发送历史" />
        </template>
        <el-table-column
          prop="to"
          label="收件人"
          min-width="160"
        />
        <el-table-column
          prop="subject"
          label="主题"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'ok' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 'ok' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="发送时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.sentAt) }}
          </template>
        </el-table-column>
      </el-table>
      <div
        v-if="sendHistory.length > 0"
        style="margin-top:12px"
      >
        <el-button
          size="small"
          @click="clearHistory"
        >
          清空历史
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { emailApi } from '@/api'

const activeTab = ref('send'); const sending = ref(false)
const emailForm = ref({ to: '', subject: '', html: '' })
const verifyEmail = ref(''); const selectedTemplate = ref('')

// 模板管理（localStorage）
interface EmailTemplate { id: string; name: string; subject: string; html: string; updatedAt: string }
const templates = ref<EmailTemplate[]>([])
const tVis = ref(false); const tSaving = ref(false); const tEditingId = ref('')
const tForm = ref({ name: '', subject: '', html: '' })

// 发送历史
interface SendRecord { to: string; subject: string; status: string; sentAt: string }
const sendHistory = ref<SendRecord[]>([])

onMounted(() => { loadTemplates(); loadHistory() })
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

function loadTemplates() {
  try { templates.value = JSON.parse(localStorage.getItem('email_templates') || '[]') } catch { templates.value = [] }
}
function saveTemplates() { localStorage.setItem('email_templates', JSON.stringify(templates.value)) }
function loadHistory() {
  try { sendHistory.value = JSON.parse(localStorage.getItem('email_history') || '[]') } catch { sendHistory.value = [] }
}
function saveHistory() { localStorage.setItem('email_history', JSON.stringify(sendHistory.value.slice(0, 50))) }

function openTemplateCreate() { tEditingId.value = ''; tForm.value = { name: '', subject: '', html: '' }; tVis.value = true }
function openTemplateEdit(row: EmailTemplate) { tEditingId.value = row.id; tForm.value = { name: row.name, subject: row.subject, html: row.html }; tVis.value = true }
async function saveTemplate() {
  if (!tForm.value.name) { ElMessage.warning('请输入模板名称'); return }
  tSaving.value = true
  try {
    if (tEditingId.value) {
      const idx = templates.value.findIndex(t => t.id === tEditingId.value)
      if (idx >= 0) { templates.value[idx] = { ...templates.value[idx], ...tForm.value, updatedAt: new Date().toISOString() } }
    } else {
      templates.value.push({ id: Date.now().toString(), ...tForm.value, updatedAt: new Date().toISOString() })
    }
    saveTemplates(); loadTemplates(); tVis.value = false; ElMessage.success('模板已保存')
  } finally { tSaving.value = false }
}
async function delTemplate(id: string) {
  try { await ElMessageBox.confirm('删除此模板？', '提示', { type: 'warning' }); templates.value = templates.value.filter(t => t.id !== id); saveTemplates(); loadTemplates(); ElMessage.success('已删除') } catch {}
}
function applyTemplate(templateId: string) {
  const t = templates.value.find(t => t.id === templateId)
  if (t) { emailForm.value.html = t.html; if (t.subject) emailForm.value.subject = t.subject }
}
function useTemplate(row: EmailTemplate) { emailForm.value.html = row.html; if (row.subject) emailForm.value.subject = row.subject; activeTab.value = 'send'; ElMessage.success(`已加载模板「${row.name}」`) }
function clearHistory() { sendHistory.value = []; saveHistory() }

async function sendEmail() {
  if (!emailForm.value.to || !emailForm.value.subject) { ElMessage.warning('请填写收件人和主题'); return }
  sending.value = true
  try {
    await emailApi.send(emailForm.value)
    ElMessage.success('邮件已发送')
    sendHistory.value.unshift({ to: emailForm.value.to, subject: emailForm.value.subject, status: 'ok', sentAt: new Date().toISOString() })
    saveHistory(); loadHistory()
  } catch {
    sendHistory.value.unshift({ to: emailForm.value.to, subject: emailForm.value.subject, status: 'failed', sentAt: new Date().toISOString() })
    saveHistory(); loadHistory()
  } finally { sending.value = false }
}

async function sendVerifyCode() {
  if (!verifyEmail.value) { ElMessage.warning('请输入邮箱'); return }
  sending.value = true
  try { await emailApi.sendVerifyCode(verifyEmail.value); ElMessage.success('验证码已发送') } catch {} finally { sending.value = false }
}

async function testEmail() {
  sending.value = true
  try { await emailApi.test(); ElMessage.success('邮件服务配置正常') } catch {} finally { sending.value = false }
}
</script>
<style scoped>.page { padding: 20px; } .toolbar { margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
