import { h, type VNode } from "vue";

export type ConfirmTone = "default" | "danger" | "warning" | "success";

export interface ConfirmMessageRow {
  label: string;
  value: unknown;
  tone?: ConfirmTone;
}

export interface ConfirmMessageOptions {
  headline: string;
  headlineTone?: ConfirmTone;
  rows?: ConfirmMessageRow[];
  description?: string;
  warning?: string;
  warningTone?: "warning" | "danger";
}

const toneColor: Record<ConfirmTone, string> = {
  default: "var(--el-text-color-primary)",
  danger: "var(--el-color-danger)",
  warning: "var(--el-color-warning)",
  success: "var(--el-color-success)",
};

function asText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

/**
 * 生成 Element Plus MessageBox 可直接接收的安全 VNode。
 * 所有动态内容都作为文本节点交给 Vue 转义，禁止回退到 dangerouslyUseHTMLString。
 */
export function createConfirmMessage(options: ConfirmMessageOptions): VNode {
  const children: VNode[] = [
    h(
      "div",
      {
        style: {
          color: toneColor[options.headlineTone ?? "default"],
          fontWeight: "600",
        },
      },
      asText(options.headline),
    ),
  ];

  for (const row of options.rows ?? []) {
    children.push(
      h("div", { style: { marginTop: "6px" } }, [
        h("span", `${row.label}：`),
        h("strong", { style: { color: toneColor[row.tone ?? "default"] } }, asText(row.value)),
      ]),
    );
  }

  if (options.description) {
    children.push(
      h(
        "div",
        { style: { marginTop: "7px", color: "var(--el-text-color-secondary)", fontSize: "12px" } },
        asText(options.description),
      ),
    );
  }

  if (options.warning) {
    const danger = options.warningTone === "danger";
    children.push(
      h(
        "div",
        {
          style: {
            marginTop: "8px",
            padding: "8px",
            borderRadius: "4px",
            color: danger ? "var(--el-color-danger)" : "var(--el-color-warning)",
            background: danger ? "var(--el-color-danger-light-9)" : "var(--el-color-warning-light-9)",
            fontSize: "12px",
          },
        },
        asText(options.warning),
      ),
    );
  }

  return h("div", { style: { lineHeight: "1.6", wordBreak: "break-word" } }, children);
}
