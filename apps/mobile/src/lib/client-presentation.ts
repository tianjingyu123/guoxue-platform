import {
  EMPTY_PRESENTATION,
  PRESENTATION_ENTRIES,
  PresentationSurface,
  projectPresentationEntries,
} from "@guoxue/shared";
import { getRemoteConfig } from "./remote-config";
import type { LayoutBlock } from "./page-layout-data";
export function getClientPresentation() {
  return getRemoteConfig().ui.presentation ?? EMPTY_PRESENTATION;
}
export function presentedCoreEntries() {
  return projectPresentationEntries(PRESENTATION_ENTRIES, getClientPresentation().entries);
}
export function presentedNavigation<T extends { id: string; label: string }>(tabs: readonly T[]) {
  const config = getClientPresentation().navigation;
  // 首页及“我的”固定保留；隐藏发现入口不取消历史订单、退款及已购阅读。
  return [
    tabs.find((tab) => tab.id === "home")!,
    ...projectPresentationEntries(
      tabs.filter((tab) => !["home", "profile"].includes(tab.id)),
      config,
    ),
    tabs.find((tab) => tab.id === "profile")!,
  ];
}
export function presentationBlocks(surface: PresentationSurface): LayoutBlock[] {
  const available = presentedCoreEntries();
  const assetOrigin = String((import.meta as any).env?.VITE_PUBLIC_ASSET_ORIGIN || "").replace(
    /\/$/,
    "",
  );
  return (getClientPresentation().pages[surface] ?? []).map((block, index) => ({
    id: block.id,
    type: block.type === "entry-grid" ? "kingkong" : block.type,
    title: block.title,
    sortOrder: index,
    config: {
      title: block.title,
      text: block.text,
      link: available.find((entry) => entry.id === block.targetEntryId)?.href ?? "",
      columns: block.columns ?? 5,
      image:
        block.imagePath && /^https:\/\//.test(assetOrigin) ? assetOrigin + block.imagePath : "",
      items: block.entries.flatMap((id) => {
        const entry = available.find((entry) => entry.id === id);
        return entry ? [{ icon: entry.icon, label: entry.label, link: entry.href }] : [];
      }),
    },
  }));
}
