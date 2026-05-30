<template>
  <view class="page">
    <view class="form">
      <input v-model="oldPwd" class="input" type="password" placeholder="请输入旧密码" />
      <input v-model="newPwd" class="input" type="password" placeholder="新密码（6-20位）" />
      <input v-model="confirmPwd" class="input" type="password" placeholder="确认新密码" />
      <button class="btn" @click="submit">确认修改</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '../../api'
const oldPwd = ref(''); const newPwd = ref(''); const confirmPwd = ref('')
async function submit() {
  if (!oldPwd.value || !newPwd.value) { uni.showToast({ title: '请填写完整', icon: 'none' }); return }
  if (newPwd.value !== confirmPwd.value) { uni.showToast({ title: '两次密码不一致', icon: 'none' }); return }
  try { await authApi.changePassword({ oldPassword: oldPwd.value, newPassword: newPwd.value }); uni.showToast({ title: '密码已修改', icon: 'success' }) } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.form { background: #fff; border-radius: 12px; padding: 16px; }
.input { border: 1px solid #ddd; border-radius: 10px; padding: 12px; font-size: 14px; background: #F5F0E8; margin-bottom: 12px; }
.btn { width: 100%; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; margin-top: 12px; text-align: center; line-height: 44px; }
</style>
