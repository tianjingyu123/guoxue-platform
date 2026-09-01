<template>
  <main class="login-page">
    <section class="login-shell" aria-labelledby="login-title">
      <div class="brand-panel">
        <BrandLogo :title="BRAND.name" subtitle="平台运营中枢" />

        <div class="brand-statement">
          <p class="brand-eyebrow">数字化国学馆藏 · 运营中枢</p>
          <h1>把文化内容，运营成可信赖的长期资产。</h1>
          <p class="brand-description">
            从内容治理到交易履约，以统一权限、审计留痕和数据洞察支撑每一次运营决策。
          </p>
        </div>

        <ul class="capability-list" aria-label="平台核心治理能力">
          <li><span>内容</span>审核、版权与发布全链路治理</li>
          <li><span>经营</span>商家、订单与履约统一协同</li>
          <li><span>安全</span>资金、权限与风险实时留痕</li>
        </ul>

        <div class="system-status">
          <i aria-hidden="true" />
          生产级治理体系
        </div>
      </div>

      <div class="login-panel">
        <div class="mobile-logo">
          <BrandLogo :title="BRAND.name" subtitle="管理后台" theme="light" />
        </div>

        <div class="login-heading">
          <p>安全登录</p>
          <h2 id="login-title">欢迎回来</h2>
          <span>请使用已授权的管理账号进入工作台</span>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          status-icon
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <el-form-item label="手机号" prop="phone">
            <el-input
              v-model="form.phone"
              placeholder="请输入 11 位手机号"
              inputmode="numeric"
              autocomplete="username"
              maxlength="11"
              clearable
            />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入登录密码"
              autocomplete="current-password"
              show-password
            />
          </el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            :loading="loading"
            class="login-button"
          >
            {{ loading ? "正在验证" : "进入管理后台" }}
          </el-button>
        </el-form>

        <p class="security-note">
          登录行为将写入安全审计；请勿在公共设备保存账号信息。
        </p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import type { FormInstance, FormRules } from "element-plus";
import { useAuthStore } from "@/store/auth";
import BrandLogo from "@/components/BrandLogo.vue";
import { BRAND } from "@/lib/brand";
import { consumeAdminRedirect } from "@/utils/auth-session";

const router = useRouter();
const auth = useAuthStore();
const formRef = ref<FormInstance>();
const loading = ref(false);
const form = reactive({ phone: "", password: "" });
const rules: FormRules<typeof form> = {
  phone: [
    { required: true, message: "请输入手机号", trigger: "blur" },
    { pattern: /^1\d{10}$/, message: "请输入正确的 11 位手机号", trigger: "blur" },
  ],
  password: [{ required: true, message: "请输入登录密码", trigger: "blur" }],
};

async function handleLogin() {
  if (loading.value) return;
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await auth.login(form.phone, form.password);
    const redirect = consumeAdminRedirect();
    if (redirect) {
      window.location.href = redirect;
      return;
    }
    if (auth.isMerchant) {
      await router.push("/merchant-backend/dashboard");
      return;
    }
    const cached = localStorage.getItem("user_roles");
    const roles: string[] = cached ? JSON.parse(cached) : [];
    if (roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN")) {
      await router.push("/dashboard");
    } else if (roles.includes("FINANCE_ADMIN")) {
      await router.push("/finance/reconciliation");
    } else if (roles.includes("CUSTOMER_SERVICE")) {
      await router.push("/users");
    } else if (roles.includes("CONTENT_AUDITOR")) {
      await router.push("/contents/audit");
    } else if (roles.includes("GOODS_AUDITOR")) {
      await router.push("/products");
    } else {
      await router.push("/dashboard");
    }
  } catch {
    // 请求层统一呈现服务端错误，表单保留输入以便修正后重试。
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 40px;
  overflow: hidden;
  background:
    linear-gradient(rgba(201, 169, 110, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(201, 169, 110, 0.045) 1px, transparent 1px),
    var(--color-bg-page);
  background-size: 32px 32px;
}

.login-shell {
  width: min(1080px, 100%);
  min-height: 620px;
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(380px, 0.88fr);
  overflow: hidden;
  border: 1px solid rgba(139, 105, 20, 0.18);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 28px 80px rgba(55, 44, 29, 0.13);
}

.brand-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 52px 58px 46px;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.76);
  background:
    linear-gradient(90deg, rgba(232, 218, 179, 0.065) 1px, transparent 1px),
    linear-gradient(#243b35, #1b302b);
  background-size: 48px 100%, auto;
}

.brand-panel::after {
  content: "学";
  position: absolute;
  right: -24px;
  bottom: -92px;
  color: rgba(232, 218, 179, 0.055);
  font-family: var(--font-family-display);
  font-size: 330px;
  line-height: 1;
  pointer-events: none;
}

.brand-statement {
  position: relative;
  z-index: 1;
  margin-top: 96px;
  max-width: 470px;
}

.brand-eyebrow,
.login-heading > p {
  margin: 0 0 16px;
  color: var(--color-gold);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
}

.brand-statement h1 {
  margin: 0;
  color: #f5f0e6;
  font-family: var(--font-family-display);
  font-size: clamp(34px, 3.1vw, 46px);
  font-weight: 600;
  line-height: 1.34;
  letter-spacing: 0.055em;
}

.brand-description {
  max-width: 430px;
  margin: 24px 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 14px;
  line-height: 1.9;
}

.capability-list {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 12px;
  margin: 42px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}

.capability-list li {
  display: flex;
  align-items: center;
  gap: 12px;
}

.capability-list span {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(201, 169, 110, 0.46);
  border-radius: 50%;
  color: #e7d4a7;
  font-family: var(--font-family-display);
}

.system-status {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: auto;
  color: rgba(255, 255, 255, 0.46);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.system-status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7fc69d;
  box-shadow: 0 0 0 4px rgba(127, 198, 157, 0.1);
}

.login-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 62px;
  background:
    linear-gradient(180deg, rgba(251, 249, 242, 0.38), transparent 35%),
    #fff;
}

.mobile-logo {
  display: none;
}

.login-heading > p {
  color: var(--color-primary);
  margin-bottom: 10px;
}

.login-heading h2 {
  margin: 0;
  color: var(--color-text-title);
  font-family: var(--font-family-display);
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.login-heading span {
  display: block;
  margin-top: 10px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.login-form {
  margin-top: 42px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.login-form :deep(.el-form-item__label) {
  padding-bottom: 8px;
  line-height: 1.2;
}

.login-form :deep(.el-input__wrapper) {
  min-height: 44px;
}

.login-button {
  width: 100%;
  height: 46px;
  margin-top: 6px;
  letter-spacing: 0.12em;
}

.security-note {
  margin: 24px 0 0;
  color: var(--color-text-placeholder);
  font-size: 12px;
  line-height: 1.7;
}

@media (max-width: 860px) {
  .login-page {
    padding: 22px;
  }

  .login-shell {
    max-width: 480px;
    min-height: auto;
    grid-template-columns: 1fr;
  }

  .brand-panel {
    display: none;
  }

  .login-panel {
    padding: 40px 34px 36px;
  }

  .mobile-logo {
    display: block;
    margin-bottom: 42px;
  }
}

@media (max-width: 480px) {
  .login-page {
    align-items: stretch;
    padding: 0;
    background: #fff;
  }

  .login-shell {
    width: 100%;
    min-height: 100vh;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .login-panel {
    justify-content: flex-start;
    padding: max(32px, env(safe-area-inset-top)) 24px 28px;
  }

  .login-heading h2 {
    font-size: 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-page *,
  .login-page *::before,
  .login-page *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
