<template>
  <view class="page">
    <view
      v-if="loading"
      class="loading-state"
    >
      <text class="loading-text">
        加载中...
      </text>
    </view>

    <template v-else>
      <view
        v-if="addresses.length === 0"
        class="empty"
      >
        <text class="empty-icon">
          📍
        </text>
        <text class="empty-text">
          暂无收货地址
        </text>
      </view>

      <view
        v-for="addr in addresses"
        :key="addr.id"
        class="addr-card"
        @click="onSelect(addr)"
      >
        <view class="addr-info">
          <text class="addr-name">
            {{ addr.name }}
          </text>
          <text class="addr-phone">
            {{ addr.phone }}
          </text>
          <text
            v-if="addr.isDefault"
            class="default-tag"
          >
            默认
          </text>
        </view>
        <text class="addr-detail">
          {{ addr.province }}{{ addr.city }}{{ addr.district }} {{ addr.detail }}
        </text>
        <view class="addr-actions">
          <text
            v-if="!addr.isDefault"
            class="action-link"
            @click.stop="setDefault(addr.id)"
          >
            设为默认
          </text>
          <text
            class="action-link"
            @click.stop="editAddr(addr)"
          >
            编辑
          </text>
          <text
            class="action-link danger"
            @click.stop="deleteAddr(addr.id)"
          >
            删除
          </text>
        </view>
        <text
          v-if="isSelectMode"
          class="select-check"
        >
          {{ addr.id === selectedId ? '✓' : '' }}
        </text>
      </view>
    </template>

    <view class="bottom-fixed">
      <view
        class="btn-add"
        @click="addAddr"
      >
        + 新增地址
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { shopApi } from "../../api";

const loading = ref(true);
const addresses = ref<any[]>([]);
const isSelectMode = ref(false);
const selectedId = ref("");

onMounted(() => {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as any;
  isSelectMode.value = current?.options?.select === "1";
});

onShow(() => fetchList());

async function fetchList() {
  try {
    addresses.value = await shopApi.listAddresses();
  } catch {
    /* */
  } finally {
    loading.value = false;
  }
}

function onSelect(addr: any) {
  if (isSelectMode.value) {
    selectedId.value = addr.id;
    // 将所选地址传回上一个页面
    const prevPage = getCurrentPages()[getCurrentPages().length - 2] as any;
    if (prevPage?.$vm) {
      uni.$emit("addressSelected", addr);
    }
    uni.navigateBack();
  }
}

async function setDefault(id: string) {
  await shopApi.setDefaultAddress(id);
  await fetchList();
}

async function deleteAddr(id: string) {
  const { confirm } = await uni.showModal({
    title: "删除地址",
    content: "确定删除该收货地址吗？",
  });
  if (!confirm) return;
  await shopApi.deleteAddress(id);
  await fetchList();
}

function editAddr(addr: any) {
  uni.navigateTo({
    url: `/pages/shop/address-edit?id=${addr.id}&data=${encodeURIComponent(JSON.stringify(addr))}`,
  });
}

function addAddr() {
  uni.navigateTo({ url: "/pages/shop/address-edit" });
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding: 0 0 80px; }

.loading-state { display: flex; justify-content: center; padding: 80px 0; }
.loading-text { color: #999; font-size: 14px; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 80px 0; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 14px; color: #999; }

.addr-card {
  background: #fff; margin: 10px; padding: 16px;
  border-radius: 10px; position: relative;
}
.addr-info { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.addr-name { font-size: 15px; font-weight: 600; color: #2C2C2C; }
.addr-phone { font-size: 13px; color: #666; }
.default-tag { font-size: 10px; background: #C41E3A; color: #fff; padding: 1px 6px; border-radius: 3px; }
.addr-detail { font-size: 13px; color: #666; line-height: 1.5; }
.addr-actions { display: flex; gap: 16px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #F5F0E8; }
.action-link { font-size: 12px; color: #C9A96E; }
.action-link.danger { color: #C41E3A; }
.select-check { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 20px; color: #C41E3A; }

.bottom-fixed { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px 16px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); background: #fff; }
.btn-add { width: 100%; padding: 13px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; text-align: center; }
</style>
