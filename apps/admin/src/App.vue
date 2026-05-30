<template>
  <router-view />
</template>

<style>
/* ═══════════════════════════════════════════════════════════════════
   Element Plus 主题覆盖 · 热卜国学品牌色
   ═══════════════════════════════════════════════════════════════════ */
:root {
  --el-color-primary: #C41E3A;
  --el-color-primary-light-3: #d35d6a;
  --el-color-primary-light-5: #e08b94;
  --el-color-primary-light-7: #eeb9bf;
  --el-color-primary-light-8: #f4ced3;
  --el-color-primary-light-9: #f9e8eb;
  --el-color-primary-dark-2: #9d1830;
  --el-color-success: #52C41A;
  --el-color-warning: #C9A96E;
  --el-color-danger: #FF4D4F;
  --el-color-info: #999999;
  --el-border-radius-base: 8px;
  --el-border-radius-round: 20px;

  --el-font-family: "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  --el-bg-color-page: #FAF8F5;
  --el-fill-color-light: rgba(201, 169, 110, 0.06);
  --el-fill-color-lighter: rgba(201, 169, 110, 0.04);
  --el-border-color: #E8E3DB;
  --el-border-color-light: #F0EBE2;
}

/* 侧边栏 */
.el-menu--vertical,
.el-menu--collapse {
  --el-menu-bg-color: #1A1A2E;
  --el-menu-text-color: rgba(255, 255, 255, 0.65);
  --el-menu-hover-bg-color: rgba(201, 169, 110, 0.1);
  --el-menu-active-color: #C9A96E;
}

/* 按钮 */
.el-button--primary {
  --el-button-bg-color: #C41E3A;
  --el-button-border-color: #C41E3A;
  --el-button-hover-bg-color: #d43550;
  --el-button-hover-border-color: #d43550;
  --el-button-active-bg-color: #9d1830;
  --el-button-active-border-color: #9d1830;
}
.el-button {
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* 标签 */
.el-tag--primary {
  --el-tag-bg-color: rgba(196, 30, 58, 0.08);
  --el-tag-border-color: rgba(196, 30, 58, 0.15);
  --el-tag-text-color: #C41E3A;
}

/* 链接 */
.el-breadcrumb__inner.is-link,
.el-link.el-link--primary { color: #C41E3A; }
.el-breadcrumb__inner.is-link:hover,
.el-link.el-link--primary:hover { color: #d43550; }

/* Tab */
.el-tabs__active-bar { background-color: #C41E3A; }
.el-tabs__item.is-active { color: #C41E3A; }
.el-tabs__item:hover { color: #C41E3A; }

/* Switch */
.el-switch.is-checked .el-switch__core {
  background-color: #C41E3A;
  border-color: #C41E3A;
}

/* Checkbox / Radio */
.el-checkbox__input.is-checked .el-checkbox__inner,
.el-radio__input.is-checked .el-radio__inner {
  background-color: #C41E3A;
  border-color: #C41E3A;
}
.el-checkbox__input.is-checked + .el-checkbox__label,
.el-radio__input.is-checked + .el-radio__label { color: var(--color-text-title); }
</style>
