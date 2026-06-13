<template>
  <div class="login-page">
    <el-card class="login-card">
      <div class="login-logo">
        <BrandLogo title="热卜国学" subtitle="管理后台" theme="light" />
      </div>
      <el-form
        :model="form"
        label-width="0"
      >
        <el-form-item>
          <el-input
            v-model="form.phone"
            placeholder="手机号"
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
import BrandLogo from "@/components/BrandLogo.vue";

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const form = ref({ phone: "", password: "" });

async function handleLogin() {
  if (!form.value.phone || !form.value.password) {
    return;
  }
  loading.value = true;
  try {
    await auth.login(form.value.phone, form.value.password);
    // 检查是否需要跳回过期前的页面
    const redirect = localStorage.getItem("redirect_after_login");
    if (redirect) {
      localStorage.removeItem("redirect_after_login");
      window.location.href = redirect;
      return;
    }
    // 商家用户跳转商家后台
    if (auth.isMerchant) {
      router.push("/merchant-backend/dashboard");
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
  background: linear-gradient(135deg, var(--color-bg-page) 0%, rgba(201, 169, 110, 0.1) 100%);
}
.login-card {
  width: 400px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-divider);
}
.login-logo {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-xl);
  padding-top: var(--spacing-sm);
}
</style>
