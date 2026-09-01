<template>
  <el-dialog
    v-model="visible"
    width="min(680px, calc(100vw - 28px))"
    class="command-dialog"
    :show-close="false"
    :lock-scroll="true"
    @closed="reset"
  >
    <template #header>
      <div class="command-heading">
        <div>
          <p>运营目录索引</p>
          <h2>快速到达任何工作页面</h2>
        </div>
        <kbd>Esc</kbd>
      </div>
    </template>

    <el-input
      ref="inputRef"
      v-model="query"
      size="large"
      clearable
      aria-label="搜索后台功能"
      placeholder="输入页面或业务名称，例如：退款、商家、审计日志"
      class="command-input"
      @keydown="handleInputKeydown"
    >
      <template #prefix>
        <span aria-hidden="true">⌕</span>
      </template>
    </el-input>

    <div class="command-meta">
      <span>{{ query.trim() ? '搜索结果' : recentEntries.length ? '最近访问' : '常用入口' }}</span>
      <span>已按当前账号权限筛选 · {{ allEntries.length }} 个入口</span>
    </div>

    <div
      v-if="displayEntries.length"
      class="command-results"
      role="listbox"
      aria-label="后台页面搜索结果"
    >
      <button
        v-for="(entry, index) in displayEntries"
        :key="entry.path"
        type="button"
        role="option"
        class="command-result"
        :class="{ 'is-active': index === activeIndex }"
        :aria-selected="index === activeIndex"
        @mouseenter="activeIndex = index"
        @click="go(entry.path)"
      >
        <span
          class="result-mark"
          aria-hidden="true"
        >{{ entry.title.slice(0, 1) }}</span>
        <span class="result-copy">
          <strong>{{ entry.title }}</strong>
          <small>{{ entry.trail }}</small>
        </span>
        <span
          class="result-enter"
          aria-hidden="true"
        >↵</span>
      </button>
    </div>

    <div
      v-else
      class="command-empty"
      role="status"
    >
      <span aria-hidden="true">⌕</span>
      <strong>没有找到匹配页面</strong>
      <p>试试更短的业务词，或检查当前账号是否拥有该功能权限。</p>
    </div>

    <div
      class="command-footer"
      aria-label="键盘操作说明"
    >
      <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
      <span><kbd>Enter</kbd> 打开</span>
      <span><kbd>Ctrl</kbd><kbd>K</kbd> 随时搜索</span>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { InputInstance } from "element-plus";
import type { MenuItem } from "@/store/auth";

interface CommandEntry {
  path: string;
  title: string;
  trail: string;
}

const props = defineProps<{
  modelValue: boolean;
  items: MenuItem[];
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const router = useRouter();
const route = useRoute();
const inputRef = ref<InputInstance>();
const query = ref("");
const activeIndex = ref(0);

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

const allEntries = computed<CommandEntry[]>(() => {
  const result = new Map<string, CommandEntry>();
  const walk = (nodes: MenuItem[], parents: string[]) => {
    for (const node of nodes) {
      const nextParents = [...parents, node.title];
      if (node.path) {
        result.set(node.path, {
          path: node.path,
          title: node.title,
          trail: nextParents.join(" / "),
        });
      }
      if (node.children?.length) walk(node.children, nextParents);
    }
  };
  walk(props.items, []);
  return [...result.values()];
});

const recentPaths = ref<string[]>(loadRecentPaths());
const recentEntries = computed(() => {
  const byPath = new Map(allEntries.value.map((entry) => [entry.path, entry]));
  return recentPaths.value
    .map((path) => byPath.get(path))
    .filter((entry): entry is CommandEntry => Boolean(entry))
    .slice(0, 8);
});

const displayEntries = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase("zh-CN");
  if (!keyword) {
    return recentEntries.value.length ? recentEntries.value : allEntries.value.slice(0, 10);
  }
  return allEntries.value
    .map((entry) => {
      const title = entry.title.toLocaleLowerCase("zh-CN");
      const trail = entry.trail.toLocaleLowerCase("zh-CN");
      const score = title === keyword ? 0 : title.startsWith(keyword) ? 1 : title.includes(keyword) ? 2 : trail.includes(keyword) ? 3 : 99;
      return { entry, score };
    })
    .filter(({ score }) => score < 99)
    .sort((a, b) => a.score - b.score || a.entry.title.localeCompare(b.entry.title, "zh-CN"))
    .slice(0, 12)
    .map(({ entry }) => entry);
});

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    activeIndex.value = 0;
    void nextTick(() => inputRef.value?.focus());
  },
);

watch(query, () => { activeIndex.value = 0; });

watch(
  () => [route.path, allEntries.value.length] as const,
  ([path]) => {
    if (!allEntries.value.some((entry) => entry.path === path)) return;
    recentPaths.value = [path, ...recentPaths.value.filter((item) => item !== path)].slice(0, 8);
    localStorage.setItem("admin_recent_routes", JSON.stringify(recentPaths.value));
  },
  { immediate: true },
);

function loadRecentPaths(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("admin_recent_routes") || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string" && value.startsWith("/") && !value.startsWith("//")).slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function handleInputKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, Math.max(displayEntries.value.length - 1, 0));
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (event.key === "Enter") {
    event.preventDefault();
    const entry = displayEntries.value[activeIndex.value];
    if (entry) void go(entry.path);
  } else if (event.key === "Escape") {
    visible.value = false;
  }
}

function onGlobalShortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
    event.preventDefault();
    visible.value = !visible.value;
  }
}

async function go(path: string) {
  visible.value = false;
  if (route.path !== path) await router.push(path);
}

function reset() {
  query.value = "";
  activeIndex.value = 0;
}

onMounted(() => window.addEventListener("keydown", onGlobalShortcut));
onUnmounted(() => window.removeEventListener("keydown", onGlobalShortcut));
</script>

<style scoped>
:deep(.command-dialog) {
  overflow: hidden;
  border: 1px solid rgba(139, 105, 20, 0.2);
  background: #fff;
}
:deep(.command-dialog .el-dialog__header) { margin: 0; padding: 22px 24px 16px; }
:deep(.command-dialog .el-dialog__body) { padding: 0 24px 18px; }
.command-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.command-heading p { margin: 0 0 4px; color: var(--color-gold-dark); font-size: 11px; font-weight: 700; letter-spacing: .16em; }
.command-heading h2 { margin: 0; color: var(--color-text-title); font-family: var(--font-family-display); font-size: 21px; font-weight: 600; }
kbd { min-width: 22px; padding: 2px 6px; border: 1px solid var(--color-divider); border-bottom-width: 2px; border-radius: 5px; background: var(--color-bg-paper); color: var(--color-text-secondary); font: 11px/1.5 var(--font-family); text-align: center; }
.command-heading > kbd { margin-top: 4px; }
.command-input { --el-input-height: 46px; }
.command-meta { display: flex; justify-content: space-between; gap: 12px; padding: 14px 2px 8px; color: var(--color-text-secondary); font-size: 11px; }
.command-meta span:first-child { color: var(--color-gold-dark); font-weight: 700; letter-spacing: .08em; }
.command-results { max-height: min(440px, 55vh); overflow-y: auto; padding: 2px; }
.command-result { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid transparent; border-radius: 9px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.command-result.is-active { border-color: rgba(201, 169, 110, .32); background: linear-gradient(90deg, rgba(201, 169, 110, .12), rgba(201, 169, 110, .03)); }
.result-mark { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid rgba(139, 105, 20, .22); border-radius: 8px; background: var(--color-bg-paper); color: var(--color-primary); font-family: var(--font-family-display); font-weight: 700; }
.result-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 3px; }
.result-copy strong { color: var(--color-text-title); font-size: 14px; font-weight: 600; }
.result-copy small { overflow: hidden; color: var(--color-text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.result-enter { opacity: 0; color: var(--color-gold-dark); font-size: 16px; }
.command-result.is-active .result-enter { opacity: 1; }
.command-empty { min-height: 220px; display: grid; place-items: center; align-content: center; gap: 8px; color: var(--color-text-secondary); text-align: center; }
.command-empty > span { color: var(--color-gold); font-size: 30px; }
.command-empty strong { color: var(--color-text-title); }
.command-empty p { margin: 0; font-size: 12px; }
.command-footer { display: flex; gap: 18px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-divider); color: var(--color-text-secondary); font-size: 11px; }
.command-footer span { display: flex; align-items: center; gap: 4px; }
@media (max-width: 560px) {
  .command-meta span:last-child { display: none; }
  .command-footer { gap: 10px; overflow-x: auto; }
  .command-footer span:last-child { display: none; }
}
</style>
