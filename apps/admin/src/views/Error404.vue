<template>
  <div class="error-page">
    <div class="error-icon">
      📄
    </div>
    <h1 class="error-code">
      404
    </h1>
    <p class="error-desc">
      页面不存在
    </p>
    <p class="error-hint">
      请检查链接是否正确，或返回首页
    </p>
    <div class="error-actions">
      <el-button
        type="primary"
        @click="$router.push('/dashboard')"
      >
        返回首页
      </el-button>
      <el-button @click="$router.back()">
        返回上页
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 404 页面不存在
</script>

<style scoped>
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70vh;
  color: #666;
  text-align: center;
}
.error-icon { font-size: 64px; margin-bottom: 8px; }
.error-code { font-size: 80px; color: #C9A96E; margin: 0; font-weight: 300; line-height: 1; }
.error-desc { font-size: 18px; margin: 16px 0 8px; color: #333; }
.error-hint { font-size: 13px; color: var(--color-text-secondary); margin: 0 0 28px; }
.error-actions { display: flex; gap: 12px; }
</style>
