<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import zhCn from "element-plus/es/locale/lang/zh-cn";
</script>

<style>
/* ═══════════════════════════════════════════════════════════════════
   Element Plus 主题覆盖 · 热卜国学品牌色
   ═══════════════════════════════════════════════════════════════════ */
:root {
  --el-color-primary: #B4233E;
  --el-color-primary-light-3: #C65B70;
  --el-color-primary-light-5: #D9919E;
  --el-color-primary-light-7: #EBC2C9;
  --el-color-primary-light-8: #F2D9DE;
  --el-color-primary-light-9: #F8ECEE;
  --el-color-primary-dark-2: #8F1C33;
  --el-color-success: #168A62;
  --el-color-warning: #B7791F;
  --el-color-danger: #C73E4E;
  --el-color-info: #64748B;
  --el-border-radius-base: 10px;
  --el-border-radius-round: 999px;

  --el-font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", "Microsoft YaHei", sans-serif;

  --el-bg-color-page: #F3F5F8;
  --el-fill-color-light: #F3F5F8;
  --el-fill-color-lighter: #F8F9FB;
  --el-border-color: #D8DEE7;
  --el-border-color-light: #E7EBF0;
  --el-border-color-lighter: #EDF0F4;
  --el-text-color-primary: #17202E;
  --el-text-color-regular: #475467;
  --el-text-color-secondary: #7A8493;
}

/* 侧边栏 */
.el-menu--vertical,
.el-menu--collapse {
  --el-menu-bg-color: #0F1F32;
  --el-menu-text-color: rgba(235, 241, 247, 0.68);
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.065);
  --el-menu-active-color: #F4E0B8;
}

/* 按钮 */
.el-button--primary {
  --el-button-bg-color: #B4233E;
  --el-button-border-color: #B4233E;
  --el-button-hover-bg-color: #C8324C;
  --el-button-hover-border-color: #C8324C;
  --el-button-active-bg-color: #8F1C33;
  --el-button-active-border-color: #8F1C33;
}
.el-button {
  font-weight: 500;
  letter-spacing: 0;
}

/* 标签 */
.el-tag--primary {
  --el-tag-bg-color: rgba(196, 30, 58, 0.08);
  --el-tag-border-color: rgba(196, 30, 58, 0.15);
  --el-tag-text-color: #B4233E;
}

/* 链接 */
.el-breadcrumb__inner.is-link,
.el-link.el-link--primary { color: #B4233E; }
.el-breadcrumb__inner.is-link:hover,
.el-link.el-link--primary:hover { color: #C8324C; }

/* Tab */
.el-tabs__active-bar { background-color: #B4233E; }
.el-tabs__item.is-active { color: #B4233E; }
.el-tabs__item:hover { color: #B4233E; }

/* Switch */
.el-switch.is-checked .el-switch__core {
  background-color: #B4233E;
  border-color: #B4233E;
}

/* Checkbox / Radio */
.el-checkbox__input.is-checked .el-checkbox__inner,
.el-radio__input.is-checked .el-radio__inner {
  background-color: #B4233E;
  border-color: #B4233E;
}
.el-checkbox__input.is-checked + .el-checkbox__label,
.el-radio__input.is-checked + .el-radio__label { color: var(--color-text-title); }
</style>
