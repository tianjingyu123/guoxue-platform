<template>
  <router-view />
</template>

<style>
/* ── Element Plus 主题覆盖：Workbuddy 国学红 ── */
:root {
  --el-color-primary: #C41E3A;
  --el-color-primary-light-3: #d35d6a;
  --el-color-primary-light-5: #e08b94;
  --el-color-primary-light-7: #eeb9bf;
  --el-color-primary-light-8: #f4ced3;
  --el-color-primary-light-9: #f8e7e9;
  --el-color-primary-dark-2: #9d1830;
  --el-color-success: #52b855;
  --el-color-warning: #C9A96E;
  --el-color-danger: #C41E3A;
  --el-color-info: #909399;
  --el-border-radius-base: 8px;
  --el-border-radius-round: 20px;
}

/* 侧边栏子菜单覆盖 */
.el-menu--vertical,
.el-menu--collapse {
  --el-menu-bg-color: #1a1a1a;
  --el-menu-text-color: #bfcbd9;
  --el-menu-hover-bg-color: rgba(201, 169, 110, 0.12);
  --el-menu-active-color: #C9A96E;
}

/* 按钮 hover/active 保持品牌红 */
.el-button--primary {
  --el-button-bg-color: #C41E3A;
  --el-button-border-color: #C41E3A;
  --el-button-hover-bg-color: #d43550;
  --el-button-hover-border-color: #d43550;
  --el-button-active-bg-color: #9d1830;
  --el-button-active-border-color: #9d1830;
}

/* 标签/分页/开关等交互元素 */
.el-tag--primary {
  --el-tag-bg-color: rgba(196, 30, 58, 0.1);
  --el-tag-border-color: rgba(196, 30, 58, 0.2);
  --el-tag-text-color: #C41E3A;
}

/* 面包屑/链接颜色 */
.el-breadcrumb__inner.is-link,
.el-link.el-link--primary {
  color: #C41E3A;
}
.el-breadcrumb__inner.is-link:hover,
.el-link.el-link--primary:hover {
  color: #d43550;
}
</style>
