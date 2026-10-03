<script setup lang="ts">
import { onMounted, ref } from "vue";
import { legacyStationPaipanApi } from "@/pkg-operator/lib/legacy-paipan-station";

const loading = ref(true);
const authorizationUrl = ref("");
const statusText = ref("页面不存在");
const canRetry = ref(false);
const synced = ref(false);

async function loadAuthorization() {
  if (loading.value && canRetry.value) return;
  loading.value = true;
  canRetry.value = false;
  synced.value = false;
  authorizationUrl.value = "";
  try {
    const state = await legacyStationPaipanApi.getState();
    if (state.state === "SYNCED") {
      synced.value = true;
      statusText.value = "排盘账号已关联，可返回分站使用";
      return;
    }
    if (state.state !== "PENDING_AUTHORIZATION" || !state.authorizationUrl) {
      statusText.value = "排盘账号尚未完成同步，请返回分站重试";
      return;
    }
    authorizationUrl.value = state.authorizationUrl;
    // #ifdef H5
    window.location.replace(state.authorizationUrl);
    // #endif
  } catch {
    // 此处只读取当前账号状态，不展示其他站长或第三方账号信息。
    statusText.value = "暂时无法读取授权状态，请重试或返回分站";
    canRetry.value = true;
  } finally {
    loading.value = false;
  }
}

function backToStation() {
  uni.navigateBack({ delta: 1, fail: () => uni.redirectTo({ url: "/pkg-operator/station-home/index" }) });
}

onMounted(loadAuthorization);
</script>

<template>
  <!-- #ifndef H5 -->
  <web-view v-if="authorizationUrl" :src="authorizationUrl" />
  <!-- #endif -->
  <view v-if="loading" class="state"><text>正在打开授权页面</text></view>
  <view v-else-if="!authorizationUrl" class="state">
    <text>{{ statusText }}</text>
    <button v-if="canRetry" @tap="loadAuthorization">重新加载</button>
    <button @tap="backToStation">{{ synced ? '返回分站使用排盘' : '返回分站' }}</button>
  </view>
</template>

<style scoped>
.state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  align-items: center;
  justify-content: center;
  color: #777;
  background: #faf8f5;
}
</style>
