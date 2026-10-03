<script setup lang="ts">
import { computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import type { PresentationSurface } from "@guoxue/shared";
import BlockRenderer from "./block-renderer.vue";
import { presentationBlocks } from "@/lib/client-presentation";
import { getRemoteConfig, hydrateRemoteConfig } from "@/lib/remote-config";
const props = defineProps<{ surface: PresentationSurface }>();
const blocks = computed(() => presentationBlocks(props.surface));
const state = computed(() => {
  const key = (
    {
      shop: "shop_checkout",
      live: "live_start",
      course: "client_course_purchase",
      circle: "client_circle_join",
      agent: "client_agent_purchase",
    } as Record<string, string>
  )[props.surface];
  return key ? getRemoteConfig().operations[key] : undefined;
});
const stateLabel: Record<string, string> = {
  UNOPENED: "暂停新业务",
  MAINTENANCE: "新业务维护中",
  READ_ONLY: "仅保留历史服务",
};
// 页面返回/重新打开时更新声明式快照，弱网时继续有效文案，写业务另由过期防线收窄。
onShow(() => {
  void hydrateRemoteConfig(true);
});
</script>
<template>
  <view v-if="state && state !== 'OPEN'" role="status"
    ><text>{{ stateLabel[state] }}，订单、退款、已购内容和既有服务仍按原权限访问。</text></view
  >
  <BlockRenderer v-if="blocks.length" :blocks="blocks" />
</template>
