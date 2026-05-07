<template>
  <div class="page">
    <div class="header">
      <h2>首页Banner管理</h2>
      <el-button type="primary" @click="openAdd">添加Banner</el-button>
    </div>

    <el-table :data="banners" border stripe>
      <el-table-column label="图标" width="70">
        <template #default="{ row }">
          <span style="font-size:24px">{{ row.icon || '📜' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" width="160" />
      <el-table-column prop="sub" label="副标题" min-width="250" />
      <el-table-column label="背景色" width="200">
        <template #default="{ row }">
          <div class="bg-preview" :style="{ background: row.bg }">{{ row.bg }}</div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row, $index }">
          <el-button type="primary" size="small" @click="openEdit($index)">编辑</el-button>
          <el-button type="danger" size="small" @click="removeBanner($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top:16px">
      <el-button @click="saveBanners" :loading="saving" type="success">保存到服务器</el-button>
      <span style="margin-left:12px;color:#999;font-size:13px">编辑后需点击保存生效</span>
    </div>

    <el-dialog v-model="dialogVisible" :title="editIdx >= 0 ? '编辑Banner' : '添加Banner'" width="500px" :close-on-click-modal="false">
      <el-form :model="form" label-width="80px">
        <el-form-item label="图标emoji">
          <el-input v-model="form.icon" placeholder="如 📜" />
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="如 国学经典" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="form.sub" placeholder="如 品读四书五经，传承中华文化" />
        </el-form-item>
        <el-form-item label="背景渐变">
          <el-input v-model="form.bg" placeholder="如 linear-gradient(135deg, #8b4513, #a0522d)" />
          <div class="bg-sample" :style="{ background: form.bg, marginTop: '8px', height: '40px', borderRadius: '6px' }"></div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEdit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { systemApi } from "@/api";
import { ElMessage } from "element-plus";

interface Banner {
  icon: string;
  title: string;
  sub: string;
  bg: string;
}

const banners = ref<Banner[]>([]);
const saving = ref(false);
const dialogVisible = ref(false);
const editIdx = ref(-1);
const form = ref<Banner>({ icon: "", title: "", sub: "", bg: "" });

onMounted(async () => {
  try {
    const { data } = await systemApi.listConfigs();
    const config = (data.configs || []).find((c: any) => c.configKey === "home_banners");
    if (config) {
      try { banners.value = JSON.parse(config.configValue); } catch { }
    }
    if (banners.value.length === 0) {
      banners.value = getDefaults();
    }
  } catch {
    banners.value = getDefaults();
  }
});

function getDefaults(): Banner[] {
  return [
    { icon: "📜", title: "国学经典", sub: "品读四书五经，传承中华文化", bg: "linear-gradient(135deg, #8b4513, #a0522d)" },
    { icon: "🌸", title: "诗词欣赏", sub: "唐诗宋词，感受千年风雅", bg: "linear-gradient(135deg, #6b3a1f, #c4943a)" },
    { icon: "🧘", title: "修身养性", sub: "以文化人，以德润身", bg: "linear-gradient(135deg, #5a3a1a, #8b6914)" },
  ];
}

function openAdd() {
  editIdx.value = -1;
  form.value = { icon: "", title: "", sub: "", bg: "linear-gradient(135deg, #8b4513, #a0522d)" };
  dialogVisible.value = true;
}

function openEdit(idx: number) {
  editIdx.value = idx;
  form.value = { ...banners.value[idx] };
  dialogVisible.value = true;
}

function confirmEdit() {
  if (!form.value.title) return;
  if (editIdx.value >= 0) {
    banners.value[editIdx.value] = { ...form.value };
  } else {
    banners.value.push({ ...form.value });
  }
  dialogVisible.value = false;
}

function removeBanner(idx: number) {
  banners.value.splice(idx, 1);
}

async function saveBanners() {
  saving.value = true;
  try {
    await systemApi.setConfig("home_banners", {
      value: JSON.stringify(banners.value),
      description: "首页轮播Banner配置",
    });
    ElMessage.success("Banner已保存");
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: #8b4513; }
.bg-preview { padding: 4px 10px; border-radius: 4px; color: #fff; font-size: 11px; }
</style>
