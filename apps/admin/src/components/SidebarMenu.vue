<template>
  <template
    v-for="item in items"
    :key="item.path || item.title"
  >
    <el-sub-menu
      v-if="item.children && item.children.length"
      :index="item.path || item.title"
    >
      <template #title>
        <el-icon v-if="menuIcon(item)">
          <component :is="menuIcon(item)" />
        </el-icon>
        <span>{{ cleanTitle(item.title) }}</span>
      </template>
      <SidebarMenu
        :items="item.children"
        :depth="depth + 1"
      />
    </el-sub-menu>
    <el-menu-item
      v-else-if="item.path"
      :index="item.path"
    >
      <el-icon v-if="menuIcon(item)">
        <component :is="menuIcon(item)" />
      </el-icon>
      <span>{{ cleanTitle(item.title) }}</span>
    </el-menu-item>
  </template>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import {
  Aim,
  Bell,
  Box,
  ChatDotRound,
  ChatDotSquare,
  ChatLineSquare,
  Checked,
  Cpu,
  DataAnalysis,
  DataBoard,
  Document,
  EditPen,
  Goods,
  Grid,
  List,
  Medal,
  Message,
  Money,
  Monitor,
  Notebook,
  Odometer,
  OfficeBuilding,
  Postcard,
  Present,
  Reading,
  School,
  Search,
  Service,
  Setting,
  Share,
  Shop,
  ShoppingCart,
  Timer,
  TrendCharts,
  Trophy,
  User,
  Van,
  VideoCamera,
  Warning,
  WarningFilled,
} from "@element-plus/icons-vue";
import type { MenuItem } from "@/store/auth";

const props = withDefaults(defineProps<{ items: MenuItem[]; depth?: number }>(), {
  depth: 0,
});

const MENU_ICONS: Record<string, Component> = {
  Aim,
  Bell,
  Box,
  ChatDotRound,
  ChatDotSquare,
  ChatLineSquare,
  Checked,
  Cpu,
  DataAnalysis,
  DataBoard,
  Document,
  EditPen,
  Goods,
  Grid,
  List,
  Medal,
  Message,
  Money,
  Monitor,
  Notebook,
  Odometer,
  OfficeBuilding,
  Postcard,
  Present,
  Reading,
  Robot: Cpu,
  School,
  Search,
  Service,
  Setting,
  Share,
  Shop,
  ShoppingCart,
  Timer,
  TrendCharts,
  Trophy,
  User,
  Van,
  VideoCamera,
  Warning,
  WarningFilled,
};

function cleanTitle(title: string): string {
  return title.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\s]+/u, "").trim();
}

function menuIcon(item: MenuItem): Component | null {
  const name = item.icon || (props.depth === 0 && item.path ? "Grid" : "");
  return name ? MENU_ICONS[name] || null : null;
}
</script>

<style scoped>
.el-icon {
  flex: 0 0 auto;
  width: 18px;
  margin-right: 11px;
  font-size: 17px;
  opacity: .82;
}
.is-active > .el-icon { opacity: 1; }
</style>
