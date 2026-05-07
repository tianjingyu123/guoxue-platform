<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2>国学平台管理后台</h2>
      <el-form :model="form" label-width="0">
        <el-form-item>
          <el-input v-model="form.account" placeholder="手机号/邮箱" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" block @click="handleLogin">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { authApi } from "../api";

const router = useRouter();
const loading = ref(false);
const form = ref({ account: "", password: "" });

async function handleLogin() {
  loading.value = true;
  try {
    const { data } = await authApi.login(form.value);
    localStorage.setItem("token", data.accessToken);
    router.push("/");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f0f2f5;
}
.login-card {
  width: 400px;
}
.login-card h2 {
  text-align: center;
  margin-bottom: 24px;
}
</style>
