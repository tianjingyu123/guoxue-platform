<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2>🏮 热卜国学管理后台</h2>
      <el-form
        :model="form"
        label-width="0"
      >
        <el-form-item>
          <el-input
            v-model="form.account"
            placeholder="手机号/邮箱"
          />
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
          <el-button
            type="primary"
            :loading="loading"
            block
            @click="handleLogin"
          >
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
import { useAuthStore } from "@/store/auth";

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const form = ref({ account: "", password: "" });

async function handleLogin() {
  loading.value = true;
  try {
    await auth.login(form.value.account, form.value.password);
    // 检查是否需要跳回过期前的页面
    const redirect = localStorage.getItem("redirect_after_login");
    if (redirect) {
      localStorage.removeItem("redirect_after_login");
      router.push(redirect);
      return;
    }
    // 按角色跳转不同首页
    const cached = localStorage.getItem("user_roles");
    const roles: string[] = cached ? JSON.parse(cached) : [];
    if (roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN")) {
      router.push("/dashboard");
    } else if (roles.includes("FINANCE_ADMIN")) {
      router.push("/finance/reconciliation");
    } else if (roles.includes("CUSTOMER_SERVICE")) {
      router.push("/users");
    } else if (roles.includes("CONTENT_AUDITOR")) {
      router.push("/contents/audit");
    } else if (roles.includes("GOODS_AUDITOR")) {
      router.push("/products");
    } else {
      router.push("/dashboard");
    }
  } catch {
    // 错误已由 axios 拦截器提示
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
  background: linear-gradient(135deg, #F5F0E8 0%, #E8E0D5 100%);
}
.login-card {
  width: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}
.login-card h2 {
  text-align: center;
  margin-bottom: 24px;
  color: #C41E3A;
  font-size: 22px;
  letter-spacing: 2px;
}
</style>
