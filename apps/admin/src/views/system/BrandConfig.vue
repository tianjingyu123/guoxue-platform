<template>
  <div class="brand-config">
    <el-card v-loading="loading" shadow="never">
      <template #header>
        <div class="card-header">
          <div>
            <span class="card-title">品牌配置</span>
            <span class="card-sub">全端品牌露出的唯一来源（站名 / Logo / 主色 / 客服 / 协议主体）· 改一处配置全端生效</span>
          </div>
          <el-button type="primary" :loading="saving" @click="onSave">保存配置</el-button>
        </div>
      </template>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="tip-alert"
        title="H5 / 小程序 / App 启动时自动拉取本配置；未配置的字段使用内置默认值（当前“热卜”口径）。"
      />

      <el-form :model="form" label-width="140px" class="brand-form">
        <el-divider content-position="left">品牌标识</el-divider>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="站名（全称）">
              <el-input v-model="form.siteName" maxlength="50" placeholder="热卜国学" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="站名（简称）">
              <el-input v-model="form.siteNameShort" maxlength="10" placeholder="热卜（印章两字）" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="英文名">
              <el-input v-model="form.siteNameEn" maxlength="50" placeholder="REBU" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品牌主色">
              <div class="color-row">
                <el-color-picker v-model="form.primaryColor" />
                <el-input v-model="form.primaryColor" maxlength="20" placeholder="#c41e3a" class="color-input" />
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="主标语">
              <el-input v-model="form.slogan" maxlength="100" placeholder="探寻东方智慧" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备用标语">
              <el-input v-model="form.sloganAlt" maxlength="100" placeholder="观天地 · 明心性" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="副标题">
              <el-input v-model="form.tagline" maxlength="100" placeholder="国学知识平台" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="版权/页脚文案">
              <el-input v-model="form.copyright" maxlength="100" placeholder="热卜国学 · 让国学回归生活" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="二维码引导语">
              <el-input v-model="form.qrGuide" maxlength="100" placeholder="长按识别 · 开启国学之旅" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Logo 地址">
              <el-input v-model="form.logoUrl" maxlength="500" placeholder="留空使用内置印章 Logo" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">域名与客服</el-divider>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="主域名">
              <el-input v-model="form.domain" maxlength="200" placeholder="api.rebugx.cn" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="H5 入口地址">
              <el-input v-model="form.h5Url" maxlength="500" placeholder="https://api.rebugx.cn/h5/" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客服电话">
              <el-input v-model="form.servicePhone" maxlength="30" placeholder="选填" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客服邮箱">
              <el-input v-model="form.serviceEmail" maxlength="100" placeholder="选填" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客服微信">
              <el-input v-model="form.serviceWechat" maxlength="50" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">协议主体六项（协议/合作文书从此处取）</el-divider>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="公司全称">
              <el-input v-model="form.companyName" maxlength="100" placeholder="营业执照登记的公司全称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="平台名">
              <el-input v-model="form.platformName" maxlength="50" placeholder="热卜国学" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="网址">
              <el-input v-model="form.websiteUrl" maxlength="200" placeholder="https://…" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="form.contactPerson" maxlength="50" placeholder="协议联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="form.contactPhone" maxlength="30" placeholder="协议联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系邮箱">
              <el-input v-model="form.contactEmail" maxlength="100" placeholder="协议联系邮箱" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 品牌配置页（租-T0 品牌抽象）：读写 BrandConfig 单行表，改一处配置全端生效
import { reactive, ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { systemApi } from "@/api";

const loading = ref(false);
const saving = ref(false);
const error = ref("");

const form = reactive<Record<string, string>>({
  siteName: "",
  siteNameShort: "",
  siteNameEn: "",
  slogan: "",
  sloganAlt: "",
  tagline: "",
  copyright: "",
  qrGuide: "",
  logoUrl: "",
  primaryColor: "",
  domain: "",
  h5Url: "",
  servicePhone: "",
  serviceEmail: "",
  serviceWechat: "",
  companyName: "",
  platformName: "",
  websiteUrl: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
});

async function fetchConfig() {
  loading.value = true;
  error.value = "";
  try {
    const res = await systemApi.getBrandConfig();
    const data = (res?.data ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(form)) {
      const v = data[key];
      if (typeof v === "string") form[key] = v;
    }
  } catch (e) {
    error.value = (e as Error)?.message || "加载失败";
    ElMessage.error("品牌配置加载失败，请刷新重试");
  } finally {
    loading.value = false;
  }
}

async function onSave() {
  if (saving.value) return;
  saving.value = true;
  try {
    await systemApi.updateBrandConfig({ ...form });
    ElMessage.success("品牌配置已保存，全端生效");
  } catch (e) {
    ElMessage.error((e as Error)?.message || "保存失败，请重试");
  } finally {
    saving.value = false;
  }
}

onMounted(fetchConfig);
</script>

<style scoped>
.brand-config {
  max-width: 1080px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
}
.card-sub {
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.tip-alert {
  margin-bottom: 20px;
}
.brand-form {
  padding-right: 8px;
}
.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.color-input {
  flex: 1;
}
</style>
