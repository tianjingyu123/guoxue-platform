import { computed, onMounted, onUnmounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { ElMessageBox } from "element-plus";

export interface UnsavedChangesOptions {
  title?: string;
  message?: string;
}

/**
 * 统一保护后台编辑现场：站内跳转二次确认，刷新/关闭标签页使用浏览器原生提醒。
 * 调用方在异步数据加载完成、保存成功后调用 captureBaseline 更新已保存基线。
 */
export function useUnsavedChanges(
  source: () => unknown,
  options: UnsavedChangesOptions = {},
) {
  const baseline = ref(serialize(source()));
  const isDirty = computed(() => serialize(source()) !== baseline.value);

  function captureBaseline(): void {
    baseline.value = serialize(source());
  }

  function onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!isDirty.value) return;
    event.preventDefault();
    event.returnValue = "";
  }

  onBeforeRouteLeave(async () => {
    if (!isDirty.value) return true;
    try {
      await ElMessageBox.confirm(
        options.message || "当前页面有尚未保存的修改，离开后将丢失。确定离开？",
        options.title || "未保存的修改",
        {
          type: "warning",
          confirmButtonText: "放弃修改并离开",
          cancelButtonText: "留在当前页",
          distinguishCancelAndClose: true,
        },
      );
      return true;
    } catch {
      return false;
    }
  });

  onMounted(() => window.addEventListener("beforeunload", onBeforeUnload));
  onUnmounted(() => window.removeEventListener("beforeunload", onBeforeUnload));

  return { isDirty, captureBaseline };
}

function serialize(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    // 非可序列化状态按“已修改”处理，避免异常时静默丢数据。
    return `__unserializable__${Date.now()}`;
  }
}
