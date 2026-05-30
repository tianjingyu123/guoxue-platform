<template>
  <view class="page">
    <view class="form">
      <text class="tip">{{ hasOld ? '修改支付密码' : '设置支付密码' }}</text>
      <input v-if="hasOld" v-model="oldCode" class="input" type="password" maxlength="6" placeholder="请输入原支付密码" />
      <input v-model="newCode" class="input" type="password" maxlength="6" placeholder="新支付密码（6位数字）" />
      <input v-model="confirmCode" class="input" type="password" maxlength="6" placeholder="确认新支付密码" />
      <button class="btn" @click="submit">确认</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { userApi } from '../../api'
const hasOld = ref(true)
const oldCode = ref(''); const newCode = ref(''); const confirmCode = ref('')
async function submit() {
  if (newCode.value !== confirmCode.value) { uni.showToast({ title: '两次密码不一致', icon: 'none' }); return }
  try {
    if (hasOld.value) await userApi.updatePaymentPassword({ oldPassword: oldCode.value, newPassword: newCode.value })
    else await userApi.setPaymentPassword({ password: newCode.value })
    uni.showToast({ title: '设置成功', icon: 'success' })
  } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.form { background: #fff; border-radius: 12px; padding: 16px; }
.tip { font-size: 15px; font-weight: 500; display: block; margin-bottom: 16px; text-align: center; }
.input { border: 1px solid #ddd; border-radius: 10px; padding: 12px; font-size: 14px; background: #F5F0E8; margin-bottom: 12px; text-align: center; letter-spacing: 8px; }
.btn { width: 100%; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; margin-top: 12px; text-align: center; line-height: 44px; }
</style>
