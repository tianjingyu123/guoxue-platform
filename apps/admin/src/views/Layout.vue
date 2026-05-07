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
        <el-menu-item index="/classics">
          <span>古籍管理</span>
        </el-menu-item>
        <el-sub-menu index="community">
          <template #title><span>社区管理</span></template>
          <el-menu-item index="/circles">
            <span>圈子管理</span>
          </el-menu-item>
          <el-menu-item index="/videos">
            <span>视频管理</span>
          </el-menu-item>
          <el-menu-item index="/lives">
            <span>直播管理</span>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="tools">
          <template #title><span>排盘工具</span></template>
          <el-menu-item index="/bazi">
            <span>八字排盘</span>
          </el-menu-item>
          <el-menu-item index="/ziwei">
            <span>紫微排盘</span>
          </el-menu-item>
          <el-menu-item index="/paipan-records">
            <span>排盘记录</span>
          </el-menu-item>
          <el-menu-item index="/bots">
            <span>Bot管理</span>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="edu">
          <template #title><span>教学管理</span></template>
          <el-menu-item index="/courses">
            <span>课程管理</span>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/reports">
          <span>举报管理</span>
        </el-menu-item>
        <el-menu-item index="/comments">
          <span>评论管理</span>
        </el-menu-item>
        <el-menu-item index="/search-analytics">
          <span>搜索分析</span>
        </el-menu-item>
        <el-sub-menu index="offline">
          <template #title><span>线下管理</span></template>
          <el-menu-item index="/stations">
            <span>分站管理</span>
          </el-menu-item>
          <el-menu-item index="/offline-venues">
            <span>线下驿站</span>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="shop">
          <template #title><span>商城管理</span></template>
          <el-menu-item index="/products">
            <span>商品管理</span>
          </el-menu-item>
          <el-menu-item index="/orders">
            <span>订单管理</span>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/notifications">
          <span>通知管理</span>
        </el-menu-item>
        <el-menu-item index="/institutes">
          <span>研究院管理</span>
        </el-menu-item>
        <el-sub-menu index="system">
          <template #title><span>系统管理</span></template>
          <el-menu-item index="/users">
            <span>用户管理</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <span>{{ auth.user?.nickname }}</span>
        <el-button text @click="logout">退出</el-button>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../store/auth";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

onMounted(async () => {
  try {
    await auth.fetchProfile();
  } catch {
    router.push("/login");
  }
});

function logout() {
  auth.logout();
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
