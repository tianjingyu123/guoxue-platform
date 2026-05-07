<template>
  <view class="page">
    <view class="logo">国学平台</view>

    <view class="tabs">
      <text :class="{ active: tab === 'login' }" @click="tab = 'login'">登录</text>
      <text :class="{ active: tab === 'register' }" @click="tab = 'register'">注册</text>
    </view>

    <!-- 登录表单 -->
    <view v-if="tab === 'login'" class="form">
      <input v-model="loginForm.phone" placeholder="手机号" class="input" type="number" maxlength="11" />
      <input v-model="loginForm.password" placeholder="密码" class="input" type="password" />
      <button class="submit-btn" @click="doLogin" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
    </view>

    <!-- 注册表单 -->
    <view v-if="tab === 'register'" class="form">
      <input v-model="regForm.nickname" placeholder="昵称" class="input" />
      <input v-model="regForm.phone" placeholder="手机号" class="input" type="number" maxlength="11" />
      <input v-model="regForm.password" placeholder="密码（至少6位）" class="input" type="password" />
      <button class="submit-btn" @click="doRegister" :disabled="loading">{{ loading ? '注册中...' : '注册' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { authApi } from "../../api";

const tab = ref("login");
const loading = ref(false);

const loginForm = ref({ phone: "", password: "" });
const regForm = ref({ nickname: "", phone: "", password: "" });

async function doLogin() {
  if (!loginForm.value.phone || !loginForm.value.password) {
    uni.showToast({ title: "请填写完整", icon: "none" });
    return;
  }
  loading.value = true;
  try {
    const data = await authApi.login({ account: loginForm.value.phone, password: loginForm.value.password });
    uni.setStorageSync("token", data.accessToken);
    uni.showToast({ title: "登录成功" });
    setTimeout(() => uni.navigateBack(), 800);
  } catch { /* api层已提示 */ }
  finally { loading.value = false; }
}

async function doRegister() {
  if (!regForm.value.nickname || !regForm.value.phone || !regForm.value.password) {
    uni.showToast({ title: "请填写完整", icon: "none" });
    return;
  }
  if (regForm.value.password.length < 6) {
    uni.showToast({ title: "密码至少6位", icon: "none" });
    return;
  }
  loading.value = true;
  try {
    await authApi.register({ nickname: regForm.value.nickname, phone: regForm.value.phone, password: regForm.value.password });
    uni.showToast({ title: "注册成功，请登录" });
    tab.value = "login";
    loginForm.value.phone = regForm.value.phone;
  } catch { /* */ }
  finally { loading.value = false; }
}
</script>

<style>
.page { padding: 40px 24px; background: #f5f0e6; min-height: 100vh; }
.logo { text-align: center; font-size: 28px; font-weight: bold; color: #8b4513; margin-bottom: 24px; }

.tabs { display: flex; justify-content: center; gap: 32px; margin-bottom: 24px; }
.tabs text { font-size: 16px; color: #999; padding-bottom: 6px; }
.tabs text.active { color: #8b4513; font-weight: bold; border-bottom: 2px solid #8b4513; }

.form { display: flex; flex-direction: column; gap: 14px; }
.input {
  background: #fff; border-radius: 8px; padding: 12px 16px; font-size: 15px;
  border: 1px solid #e0d5c1;
}
.submit-btn {
  background: #8b4513; color: #fff; border-radius: 24px; padding: 12px;
  font-size: 16px; border: none; margin-top: 8px;
}
</style>
