<template>
  <template v-for="item in items" :key="item.path || item.title">
    <el-sub-menu
      v-if="item.children && item.children.length"
      :index="item.path || item.title"
    >
      <template #title>
        <span>{{ item.title }}</span>
      </template>
      <SidebarMenu :items="item.children" />
    </el-sub-menu>
    <el-menu-item
      v-else-if="item.path"
      :index="item.path"
    >
      <span>{{ item.title }}</span>
    </el-menu-item>
  </template>
</template>

<script setup lang="ts">
import type { MenuItem } from "@/store/auth";
defineProps<{ items: MenuItem[] }>();
</script>
