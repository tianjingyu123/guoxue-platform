<script setup lang="ts">
import { onMounted, ref } from "vue";
import { legacyStationPaipanApi } from "@/pkg-operator/lib/legacy-paipan-station";

const loading = ref(true);
const authorizationUrl = ref("");

onMounted(async () => {
  try {
    const state = await legacyStationPaipanApi.getState();
    if (state.state !== "PENDING_AUTHORIZATION" || !state.authorizationUrl) return;
    authorizationUrl.value = state.authorizationUrl;
    // #ifdef H5
    window.location.replace(state.authorizationUrl);
    // #endif
  } catch {
    // 未登录、非分站所有者或状态不匹配均保持统一 404 外观。
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <!-- #ifndef H5 -->
  <web-view v-if="authorizationUrl" :src="authorizationUrl" />
  <!-- #endif -->
  <view v-if="loading" class="state"><text>正在打开授权页面</text></view>
  <view v-else-if="!authorizationUrl" class="state"><text>页面不存在</text></view>
</template>

<style scoped>
.state {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #777;
  background: #faf8f5;
}
</style>
