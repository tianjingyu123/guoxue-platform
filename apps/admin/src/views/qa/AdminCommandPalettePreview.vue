<template>
  <main class="preview-shell">
    <section>
      <p>管理端视觉验收</p>
      <h1>全局运营目录</h1>
      <button
        type="button"
        @click="open = true"
      >
        打开目录搜索
      </button>
    </section>
    <AdminCommandPalette
      v-model="open"
      :items="previewMenus"
    />
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AdminCommandPalette from "@/components/AdminCommandPalette.vue";
import type { MenuItem } from "@/store/auth";

const open = ref(true);
const previewMenus: MenuItem[] = [
  {
    title: "经营总览",
    children: [
      { title: "运营工作台", path: "/dashboard" },
      { title: "平台综合大屏", path: "/dashboard/platform" },
      { title: "转化漏斗", path: "/dashboard/funnel" },
    ],
  },
  {
    title: "交易与履约",
    children: [
      { title: "统一订单中心", path: "/order-center" },
      { title: "退款审核", path: "/shop/refunds" },
      { title: "对账管理", path: "/finance/reconciliation" },
    ],
  },
  {
    title: "平台治理",
    children: [
      { title: "审计日志", path: "/system/audit-log" },
      { title: "角色权限", path: "/system/roles" },
      { title: "合规扫描", path: "/operation/compliance" },
    ],
  },
];
</script>

<style scoped>
.preview-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--color-bg-page);
}
.preview-shell section { text-align: center; }
.preview-shell p { color: var(--color-gold-dark); font-weight: 700; letter-spacing: .16em; }
.preview-shell h1 { font-family: var(--font-family-display); font-weight: 600; }
.preview-shell button {
  padding: 10px 18px;
  border: 0;
  border-radius: 8px;
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
}
</style>
