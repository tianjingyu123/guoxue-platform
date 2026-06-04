<template>
  <view class="page">
    <view class="form">
      <view class="form-item">
        <text class="form-label">
          收货人
        </text>
        <input
          v-model="form.name"
          class="form-input"
          placeholder="请输入收货人姓名"
        >
      </view>
      <view class="form-item">
        <text class="form-label">
          手机号
        </text>
        <input
          v-model="form.phone"
          class="form-input"
          type="number"
          maxlength="11"
          placeholder="请输入手机号"
        >
      </view>
      <view class="form-item">
        <text class="form-label">
          所在地区
        </text>
        <input
          v-model="regionText"
          class="form-input"
          disabled
          placeholder="请选择省市区"
          @click="pickRegion"
        >
      </view>
      <view class="form-item">
        <text class="form-label">
          详细地址
        </text>
        <input
          v-model="form.detail"
          class="form-input"
          placeholder="街道、门牌号等"
        >
      </view>
      <view class="form-item switch-item">
        <text class="form-label">
          设为默认
        </text>
        <switch
          :checked="form.isDefault"
          color="#C41E3A"
          @change="form.isDefault = $event.detail.value"
        />
      </view>
    </view>

    <view class="btn-area">
      <view
        class="btn-save"
        @click="save"
      >
        保存
      </view>
      <view
        v-if="isEdit"
        class="btn-delete"
        @click="remove"
      >
        删除地址
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { shopApi } from "../../api";

const isEdit = ref(false);
const editId = ref("");
const regionText = ref("");

const form = reactive({
  name: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  detail: "",
  isDefault: false,
});

onMounted(() => {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as any;
  if (current?.options?.id) {
    isEdit.value = true;
    editId.value = current.options.id;
    try {
      const data = JSON.parse(decodeURIComponent(current.options.data || "{}"));
      form.name = data.name || "";
      form.phone = data.phone || "";
      form.province = data.province || "";
      form.city = data.city || "";
      form.district = data.district || "";
      form.detail = data.detail || "";
      form.isDefault = data.isDefault || false;
      if (form.province) {
        regionText.value = `${form.province} ${form.city} ${form.district}`;
      }
    } catch { /* */ }
  }
});

function pickRegion() {
  // uni-app 的地区选择器，简化处理 — 使用普通picker或让用户手动输入
  // 实际项目中可接入省市区数据
  uni.showToast({ title: "请手动输入省/市/区", icon: "none" });
  // 引导用户分别输入
  uni.showModal({
    title: "输入地区",
    content: "请按顺序输入 省 市 区（空格分隔）",
    editable: true,
    placeholderText: "例如：浙江省 杭州市 西湖区",
    success: (res) => {
      if (res.confirm) {
        const parts = (res.content || "").trim().split(/\s+/);
        if (parts.length >= 3) {
          form.province = parts[0];
          form.city = parts[1];
          form.district = parts[2];
          regionText.value = parts.join(" ");
        }
      }
    },
  });
}

async function save() {
  if (!form.name.trim()) { uni.showToast({ title: "请输入收货人", icon: "none" }); return; }
  if (!/^1\d{10}$/.test(form.phone)) { uni.showToast({ title: "请输入正确手机号", icon: "none" }); return; }
  if (!form.province || !form.city) { uni.showToast({ title: "请选择所在地区", icon: "none" }); return; }
  if (!form.detail.trim()) { uni.showToast({ title: "请输入详细地址", icon: "none" }); return; }

  try {
    const data = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      province: form.province,
      city: form.city,
      district: form.district,
      detail: form.detail.trim(),
      isDefault: form.isDefault,
    };
    if (isEdit.value) {
      await shopApi.updateAddress(editId.value, data);
    } else {
      await shopApi.createAddress(data);
      // 如果设为默认
      if (form.isDefault) {
        const addrs = await shopApi.listAddresses();
        const created = addrs?.find((a: any) => !addrs.find((b: any) => b.id !== a.id && b.isDefault));
      }
    }
    uni.showToast({ title: "保存成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e: any) {
    uni.showToast({ title: e?.message || "保存失败", icon: "none" });
  }
}

async function remove() {
  const { confirm } = await uni.showModal({ title: "确认删除", content: "确定删除该地址吗？" });
  if (!confirm) return;
  try {
    await shopApi.deleteAddress(editId.value);
    uni.showToast({ title: "已删除", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch {
    uni.showToast({ title: "删除失败", icon: "none" });
  }
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 40px; }

.form { background: #fff; margin: 10px; border-radius: 10px; padding: 0 16px; }
.form-item { display: flex; align-items: center; padding: 14px 0; border-bottom: 1px solid #F5F0E8; }
.form-item:last-child { border-bottom: none; }
.form-label { font-size: 14px; color: #2C2C2C; width: 70px; flex-shrink: 0; }
.form-input { flex: 1; font-size: 14px; color: #333; }
.switch-item { display: flex; justify-content: space-between; }

.btn-area { padding: 20px 16px; display: flex; flex-direction: column; gap: 12px; }
.btn-save { width: 100%; padding: 14px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 16px; font-weight: 600; text-align: center; }
.btn-delete { width: 100%; padding: 14px; background: #fff; color: #C41E3A; border: 1px solid #C41E3A; border-radius: 22px; font-size: 14px; text-align: center; }
</style>
