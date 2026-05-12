<template>
  <div class="page">
    <div class="toolbar"><h3>邮件管理</h3></div>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card title="发送邮件">
          <template #header>发送邮件</template>
          <el-form :model="emailForm" label-width="80px">
            <el-form-item label="收件人" required><el-input v-model="emailForm.to" placeholder="user@example.com" /></el-form-item>
            <el-form-item label="主题" required><el-input v-model="emailForm.subject" /></el-form-item>
            <el-form-item label="内容(HTML)" required>
              <el-input v-model="emailForm.html" type="textarea" :rows="8" placeholder="HTML 格式邮件内容" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="sending" @click="sendEmail">发送邮件</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card title="发送验证码">
          <template #header>发送验证码</template>
          <el-form label-width="80px">
            <el-form-item label="邮箱地址" required>
              <el-input v-model="verifyEmail" placeholder="user@example.com" />
            </el-form-item>
            <el-form-item>
              <el-button :loading="sending" @click="sendVerifyCode">发送验证码</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        <el-card title="系统测试" style="margin-top:16px">
          <template #header>邮件配置测试</template>
          <p style="color:#999;margin-bottom:12px">测试当前邮件服务配置是否正常</p>
          <el-button type="primary" :loading="sending" @click="testEmail">测试连接</el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { emailApi } from '@/api'

const sending = ref(false)
const emailForm = ref({ to: '', subject: '', html: '' })
const verifyEmail = ref('')

async function sendEmail() {
  if (!emailForm.value.to || !emailForm.value.subject) { ElMessage.warning('请填写收件人和主题'); return }
  sending.value = true
  try { await emailApi.send(emailForm.value); ElMessage.success('邮件已发送') }
  catch (e: any) { ElMessage.error(e.response?.data?.message || '发送失败') }
  finally { sending.value = false }
}

async function sendVerifyCode() {
  if (!verifyEmail.value) { ElMessage.warning('请输入邮箱'); return }
  sending.value = true
  try { await emailApi.sendVerifyCode(verifyEmail.value); ElMessage.success('验证码已发送') }
  catch (e: any) { ElMessage.error(e.response?.data?.message || '发送失败') }
  finally { sending.value = false }
}

async function testEmail() {
  sending.value = true
  try { await emailApi.test(); ElMessage.success('邮件服务配置正常') }
  catch (e: any) { ElMessage.error(e.response?.data?.message || '测试失败') }
  finally { sending.value = false }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { margin-bottom: 16px; }
</style>
