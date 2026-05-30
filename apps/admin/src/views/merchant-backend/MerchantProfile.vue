<template>
  <div class="page">
    <div class="page-header">
      <h3>店铺设置</h3>
    </div>

    <el-card v-loading="loading" style="max-width:600px">
      <el-form ref="formRef" :model="form" label-width="100px">
        <el-form-item label="店铺名称">
          <el-input v-model="form.shopName" maxlength="50" />
        </el-form-item>
        <el-form-item label="店铺Logo">
          <div class="logo-section">
            <img v-if="form.shopLogo" :src="form.shopLogo" class="logo-preview" />
            <el-input v-model="logoUrl" placeholder="图片URL" size="small" style="width:260px" />
            <el-button size="small" @click="form.shopLogo = logoUrl">设置</el-button>
            <el-upload :show-file-list="false" :http-request="handleUpload" accept="image/*" style="display:inline-block;margin-left:8px">
              <el-button size="small" type="primary" :loading="uploading">本地上传</el-button>
            </el-upload>
          </div>
        </el-form-item>
        <el-form-item label="店铺简介">
          <el-input v-model="form.shopIntro" type="textarea" :rows="4" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { merchantBackendApi, uploadApi } from "@/api";

const loading = ref(false);
const saving = ref(false);
const uploading = ref(false);
const logoUrl = ref("");

const form = reactive({ shopName: "", shopLogo: "", shopIntro: "" });

onMounted(async () => {
  loading.value = true;
  try {
    const res = await merchantBackendApi.getProfile();
    const data = (res as any).data ?? res;
    form.shopName = data.shopName || "";
    form.shopLogo = data.shopLogo || "";
    form.shopIntro = data.shopIntro || "";
    logoUrl.value = form.shopLogo;
  } finally {
    loading.value = false;
  }
});

async function handleUpload(options: any) {
  uploading.value = true;
  try {
    const res = await uploadApi.image(options.file);
    const url = (res as any).data?.url ?? (res as any).url ?? "";
    form.shopLogo = url;
    logoUrl.value = url;
    ElMessage.success("上传成功");
  } catch { /* */ } finally { uploading.value = false; }
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
.logo-preview { width: 60px; height: 60px; border-radius: 6px; object-fit: cover; border: 1px solid #eee; }
</style>
