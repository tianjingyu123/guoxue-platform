<template>
  <el-card
    :class="['stats-card', { 'is-loading': loading }]"
    shadow="hover"
  >
    <div class="stats-inner">
      <div
        class="stats-icon"
        :style="{ background: color }"
      >
        <el-icon :size="24">
          <component :is="icon" />
        </el-icon>
      </div>
      <div class="stats-info">
        <div class="stats-value">
          {{ loading ? '-' : value }}
        </div>
        <div class="stats-title">
          {{ title }}
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  value: number | string
  icon: any
  color: string
  loading?: boolean
}>()
</script>

<style scoped>
.stats-card { cursor: default; transition: transform 0.2s; }
.stats-card:hover { transform: translateY(-2px); }
.stats-inner { display: flex; align-items: center; gap: 16px; }
.stats-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; }
.stats-value { font-size: 28px; font-weight: 700; color: #303133; line-height: 1.2; }
.stats-title { font-size: 14px; color: #909399; margin-top: 4px; }
.is-loading .stats-value { color: #c0c4cc; }
</style>
