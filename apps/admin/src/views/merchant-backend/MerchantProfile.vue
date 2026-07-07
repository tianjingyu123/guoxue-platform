<template>
  <div class="page">
    <div class="page-header">
      <h3>店铺设置</h3>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="店铺信息加载失败，请稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchProfile"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-card
      v-else
      v-loading="loading"
      style="max-width:600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        label-width="100px"
      >
        <el-form-item label="店铺名称">
          <el-input
            v-model="form.shopName"
            maxlength="50"
          />
        </el-form-item>
        <el-form-item label="店铺Logo">
          <CosImageUpload v-model="form.shopLogo" />
        </el-form-item>
        <el-form-item label="店铺简介">
          <el-input
            v-model="form.shopIntro"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="saving"
            @click="save"
          >
            保存
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { merchantBackendApi } from "@/api";
import CosImageUpload from "@/components/upload/CosImageUpload.vue";

const loading = ref(false);
const error = ref(false);
const saving = ref(false);

const form = reactive({ shopName: "", shopLogo: "", shopIntro: "" });

onMounted(() => fetchProfile());

async function fetchProfile() {
  loading.value = true;
  error.value = false;
  try {
    const res = await merchantBackendApi.getProfile();
    type ProfileData = { shopName?: string; shopLogo?: string; shopIntro?: string };
    const data = (res as { data?: ProfileData }).data ?? (res as ProfileData);
    form.shopName = data.shopName || "";
    form.shopLogo = data.shopLogo || "";
    form.shopIntro = data.shopIntro || "";
  } catch (e) {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await merchantBackendApi.updateProfile({
      shopName: form.shopName,
      shopLogo: form.shopLogo,
      shopIntro: form.shopIntro,
    });
    ElMessage.success("保存成功");
  } catch { /* */ } finally { saving.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.logo-section { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.logo-preview { width: 60px; height: 60px; border-radius: 6px; object-fit: cover; border: 1px solid var(--color-divider); }
</style>
