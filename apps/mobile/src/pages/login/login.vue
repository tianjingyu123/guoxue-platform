<template>
  <view class="page">
    <!-- 品牌区 -->
    <view class="brand-area">
      <view class="brand-icon">📚</view>
      <text class="brand-name">国学传承平台</text>
      <text class="brand-slogan">传承国学智慧 · 涵养文化自信</text>
    </view>

    <!-- 标签切换 -->
    <view class="tabs">
      <text :class="{ active: tab === 'login' }" @click="tab = 'login'">登录</text>
      <text :class="{ active: tab === 'register' }" @click="tab = 'register'">注册</text>
    </view>

    <!-- 登录表单 -->
    <view v-if="tab === 'login'" class="form">
      <view class="input-wrap">
        <text class="input-icon">📱</text>
        <input v-model="loginForm.phone" placeholder="请输入手机号" class="input" type="number" maxlength="11" />
      </view>
      <view class="input-wrap">
        <text class="input-icon">🔒</text>
        <input v-model="loginForm.password" placeholder="请输入密码" class="input" :type="showPwd ? 'text' : 'password'" />
        <text class="pwd-toggle" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁' }}</text>
      </view>
      <button class="submit-btn" @click="doLogin" :disabled="loading" :loading="loading">
        {{ loading ? '登录中...' : '登 录' }}
      </button>
      <view class="form-extra">
        <text class="extra-link" @click="tab = 'register'">没有账号？立即注册</text>
      </view>
    </view>

    <!-- 注册表单 -->
    <view v-if="tab === 'register'" class="form">
      <view class="input-wrap">
        <text class="input-icon">👤</text>
        <input v-model="regForm.nickname" placeholder="请输入昵称" class="input" />
      </view>
      <view class="input-wrap">
        <text class="input-icon">📱</text>
        <input v-model="regForm.phone" placeholder="请输入手机号" class="input" type="number" maxlength="11" />
      </view>
      <view class="input-wrap">
        <text class="input-icon">🔒</text>
        <input v-model="regForm.password" placeholder="密码（至少6位）" class="input" :type="showRegPwd ? 'text' : 'password'" />
        <text class="pwd-toggle" @click="showRegPwd = !showRegPwd">{{ showRegPwd ? '🙈' : '👁' }}</text>
      </view>
      <!-- 协议勾选 -->
      <view class="agree-row" @click="agreed = !agreed">
        <text class="agree-box" :class="{ checked: agreed }">{{ agreed ? '✓' : '' }}</text>
        <text class="agree-text">已阅读并同意 <text class="agree-link">《用户协议》</text> 和 <text class="agree-link">《隐私政策》</text></text>
      </view>
      <button class="submit-btn" @click="doRegister" :disabled="loading" :loading="loading">
        {{ loading ? '注册中...' : '注 册' }}
      </button>
      <view class="form-extra">
        <text class="extra-link" @click="tab = 'login'">已有账号？立即登录</text>
      </view>
    </view>

    <!-- 第三方登录 -->
    <view class="third-party">
      <text class="third-label">—— 其他方式登录 ——</text>
      <view class="third-icons">
        <view class="third-item" @click="wechatLogin">
          <text class="third-icon">💬</text>
          <text class="third-name">微信</text>
        </view>
        <view class="third-item" @click="appleLogin">
          <text class="third-icon">🍎</text>
          <text class="third-name">Apple</text>
        </view>
        <view class="third-item" @click="visitorLogin">
          <text class="third-icon">👀</text>
          <text class="third-name">游客</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { authApi } from "../../api";

const tab = ref("login");
const loading = ref(false);
const showPwd = ref(false);
const showRegPwd = ref(false);
const agreed = ref(false);

const loginForm = ref({ phone: "", password: "" });
const regForm = ref({ nickname: "", phone: "", password: "" });

async function doLogin() {
  if (!loginForm.value.phone || !loginForm.value.password) {
    uni.showToast({ title: "请填写完整", icon: "none" });
    return;
  }
  if (!/^1\d{10}$/.test(loginForm.value.phone)) {
    uni.showToast({ title: "手机号格式不正确", icon: "none" });
    return;
  }
  loading.value = true;
  try {
    const data = await authApi.login({ account: loginForm.value.phone, password: loginForm.value.password });
    uni.setStorageSync("token", data.accessToken);
    uni.showToast({ title: "登录成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 800);
  } catch { /* api层已提示 */ }
  finally { loading.value = false; }
}

async function doRegister() {
  if (!regForm.value.nickname || !regForm.value.phone || !regForm.value.password) {
    uni.showToast({ title: "请填写完整", icon: "none" });
    return;
  }
  if (!/^1\d{10}$/.test(regForm.value.phone)) {
    uni.showToast({ title: "手机号格式不正确", icon: "none" });
    return;
  }
  if (regForm.value.password.length < 6) {
    uni.showToast({ title: "密码至少6位", icon: "none" });
    return;
  }
  if (!agreed.value) {
    uni.showToast({ title: "请先同意用户协议", icon: "none" });
    return;
  }
  loading.value = true;
  try {
    await authApi.register({ nickname: regForm.value.nickname, phone: regForm.value.phone, password: regForm.value.password });
    uni.showToast({ title: "注册成功，请登录", icon: "success" });
    tab.value = "login";
    loginForm.value.phone = regForm.value.phone;
  } catch { /* */ }
  finally { loading.value = false; }
}

function wechatLogin() {
  uni.showToast({ title: "微信登录开发中", icon: "none" });
}

function appleLogin() {
  uni.showToast({ title: "Apple登录开发中", icon: "none" });
}

function visitorLogin() {
  uni.setStorageSync("token", "visitor");
  uni.showToast({ title: "游客模式", icon: "success" });
  setTimeout(() => uni.navigateBack(), 500);
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #F5F0E8 0%, #e8dfd0 100%);
  padding: 40px 28px;
}

/* 品牌区 */
.brand-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}
.brand-icon {
  font-size: 52px;
  margin-bottom: 8px;
}
.brand-name {
  font-size: 24px;
  font-weight: bold;
  color: #C41E3A;
  letter-spacing: 2px;
}
.brand-slogan {
  font-size: 13px;
  color: #999;
  margin-top: 6px;
}

/* 标签切换 */
.tabs {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 28px;
}
.tabs text {
  font-size: 17px;
  color: #999;
  padding-bottom: 8px;
  transition: all 0.2s;
}
.tabs text.active {
  color: #C41E3A;
  font-weight: bold;
  border-bottom: 3px solid #C41E3A;
}

/* 表单 */
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.input-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 10px;
  padding: 0 14px;
  border: 1px solid #E8E0D5;
  transition: border-color 0.2s;
}
.input-wrap:focus-within {
  border-color: #C9A96E;
}
.input-icon {
  font-size: 18px;
  margin-right: 8px;
}
.input {
  flex: 1;
  padding: 13px 0;
  font-size: 15px;
}
.pwd-toggle {
  font-size: 16px;
  padding: 4px;
}

.agree-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.agree-box {
  width: 18px;
  height: 18px;
  border: 2px solid #E8E0D5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #C41E3A;
  flex-shrink: 0;
}
.agree-box.checked {
  border-color: #C41E3A;
  background: #C41E3A;
  color: #fff;
}
.agree-text {
  font-size: 12px;
  color: #999;
  line-height: 1.4;
}
.agree-link {
  color: #C41E3A;
}

.submit-btn {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  border-radius: 24px;
  padding: 13px;
  font-size: 17px;
  border: none;
  margin-top: 6px;
  letter-spacing: 4px;
  font-weight: bold;
}
.submit-btn[disabled] {
  opacity: 0.6;
}

.form-extra {
  text-align: center;
  margin-top: 4px;
}
.extra-link {
  font-size: 13px;
  color: #C41E3A;
}

/* 第三方登录 */
.third-party {
  margin-top: 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.third-label {
  font-size: 12px;
  color: #ccc;
}
.third-icons {
  display: flex;
  gap: 40px;
}
.third-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.third-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.third-name {
  font-size: 11px;
  color: #999;
}
</style>
