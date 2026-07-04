<template>
  <div
    class="brand-logo"
    :class="{
      'brand-logo--compact': compact,
      'brand-logo--light': theme === 'light',
    }"
  >
    <!-- 印章外框（印章两字由品牌简称驱动） -->
    <div class="logo-seal">
      <span
        v-for="(ch, i) in sealChars"
        :key="i"
        class="logo-char"
      >{{ ch }}</span>
    </div>
    <!-- 品牌文字 -->
    <div
      v-if="!compact"
      class="logo-text"
    >
      <span class="logo-name">{{ displayTitle }}</span>
      <span
        v-if="subtitle"
        class="logo-sub"
      >{{ subtitle }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BRAND } from '@/lib/brand'

const props = withDefaults(defineProps<{
  title?: string
  subtitle?: string
  compact?: boolean
  theme?: 'dark' | 'light'
}>(), {
  title: '',
  subtitle: '',
  theme: 'dark',
})

// 印章两字：取品牌简称前两字
const sealChars = computed(() => BRAND.nameShort.split('').slice(0, 2))
// 显示标题：外部传入优先，缺省回落品牌全称
const displayTitle = computed(() => props.title || BRAND.name)
</script>

<style scoped>
.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  user-select: none;
}

/* ── 印章 ── */
.logo-seal {
  width: 40px;
  height: 40px;
  border: 2.5px solid var(--color-gold);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(201,169,110,0.08), rgba(201,169,110,0.02));
  flex-shrink: 0;
  position: relative;
}
.logo-seal::before {
  content: '';
  position: absolute;
  inset: 3px;
  border: 1px solid rgba(201,169,110,0.3);
  border-radius: 4px;
  pointer-events: none;
}
.logo-char {
  font-family: var(--font-family-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-gold);
  line-height: 1.15;
  letter-spacing: 1px;
}

/* ── 文字 ── */
.logo-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.logo-name {
  font-family: var(--font-family-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--color-gold);
  letter-spacing: 3px;
  white-space: nowrap;
  line-height: 1.3;
}
.logo-sub {
  font-size: var(--font-size-small);
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 2px;
  white-space: nowrap;
}

/* 浅色主题（登录页等白色背景） */
.brand-logo--light .logo-name {
  color: var(--color-text-title);
}
.brand-logo--light .logo-sub {
  color: var(--color-text-secondary);
}
.brand-logo--light .logo-seal {
  background: linear-gradient(135deg, rgba(196,30,58,0.06), rgba(201,169,110,0.04));
  border-color: var(--color-primary);
}
.brand-logo--light .logo-seal::before {
  border-color: rgba(196,30,58,0.2);
}
.brand-logo--light .logo-char {
  color: var(--color-primary);
}

/* ── 紧凑模式（折叠侧边栏） ── */
.brand-logo--compact .logo-seal {
  width: 32px;
  height: 32px;
  border-radius: 5px;
}
.brand-logo--compact .logo-char {
  font-size: 12px;
}
</style>
