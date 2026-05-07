<template>
  <el-container class="layout">
    <el-aside width="220px">
      <div class="logo">国学平台</div>
      <el-menu router :default-active="route.path" background-color="#304156" text-color="#bfcbd9" active-text-color="#409eff">
        <el-menu-item index="/dashboard">
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/contents">
          <span>内容管理</span>
        </el-menu-item>
        <el-sub-menu index="tools">
          <template #title><span>排盘工具</span></template>
          <el-menu-item index="/bazi">
            <span>八字排盘</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <span>{{ user?.nickname }}</span>
        <el-button text @click="logout">退出</el-button>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { authApi } from "../api";

const router = useRouter();
const route = useRoute();
const user = ref<any>(null);

onMounted(async () => {
  try {
    const { data } = await authApi.getProfile();
    user.value = data;
  } catch {
    router.push("/login");
  }
});

function logout() {
  localStorage.removeItem("token");
  router.push("/login");
}
</script>

<style scoped>
.layout { height: 100vh; }
.el-aside { background: #304156; }
.logo { color: #fff; text-align: center; padding: 16px; font-size: 18px; font-weight: bold; }
.el-header { background: #fff; display: flex; align-items: center; justify-content: flex-end; gap: 12px; border-bottom: 1px solid #e6e6e6; }
.el-main { background: #f0f2f5; }
</style>
