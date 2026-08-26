<template>
  <view
    class="app-safe-area-top"
    aria-hidden="true"
  />
</template>

<style scoped>
.app-safe-area-top {
  flex: 0 0 auto;
  width: 100%;
  height: var(--status-bar-height, 0px);
  height: max(var(--status-bar-height, 0px), env(safe-area-inset-top));
  pointer-events: none;
}
</style>
