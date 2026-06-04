<template>
  <div class="page">
    <div class="header">
      <h2>{{ isNew ? '新建定价规则' : '编辑定价规则' }}</h2>
      <el-button @click="$router.back()">
        返回
      </el-button>
    </div>

    <el-card>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item
              label="规则名称"
              prop="name"
            >
              <el-input
                v-model="form.name"
                placeholder="输入规则名称"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="目标类型"
              prop="targetType"
            >
              <el-select
                v-model="form.targetType"
                style="width:100%"
              >
                <el-option
                  label="商品"
                  value="PRODUCT"
                />
                <el-option
                  label="课程"
                  value="COURSE"
                />
                <el-option
                  label="会员"
                  value="MEMBERSHIP"
                />
                <el-option
                  label="电子书"
                  value="EBOOK"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item
              label="策略"
              prop="strategy"
            >
              <el-select
                v-model="form.strategy"
                style="width:100%"
              >
                <el-option
                  label="固定价格"
                  value="FIXED"
                />
                <el-option
                  label="阶梯定价"
                  value="TIERED"
                />
                <el-option
                  label="动态定价"
                  value="DYNAMIC"
                />
                <el-option
                  label="促销定价"
                  value="PROMOTION"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="优先级"
              prop="priority"
            >
              <el-input-number
                v-model="form.priority"
                :min="0"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item
              label="基础价格"
              prop="basePrice"
            >
              <el-input-number
                v-model="form.basePrice"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item
              label="最低价格"
              prop="minPrice"
            >
              <el-input-number
                v-model="form.minPrice"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item
              label="最高价格"
              prop="maxPrice"
            >
              <el-input-number
                v-model="form.maxPrice"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item
          label="策略配置"
          prop="strategyConfig"
        >
          <el-input
            v-model="form.strategyConfig"
            type="textarea"
            :rows="5"
            placeholder="JSON格式策略配置，例如：&#10;{\n  &quot;tiers&quot;: [\n    { &quot;minQty&quot;: 1, &quot;price&quot;: 99 },\n    { &quot;minQty&quot;: 10, &quot;price&quot;: 89 }\n  ]\n}"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="saving"
            @click="handleSave"
          >
            保存
          </el-button>
          <el-button @click="$router.back()">
            取消
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const ruleId = route.params.id as string;
const isNew = ruleId === "new" || ruleId === "create" || !ruleId;

const saving = ref(false);

const form = reactive({
  name: "",
  targetType: "PRODUCT",
  strategy: "FIXED",
  basePrice: 0,
  minPrice: 0,
  maxPrice: 0,
  strategyConfig: "",
  priority: 0,
});

const rules = {
  name: [{ required: true, message: "请输入规则名称", trigger: "blur" }],
};

async function fetchRule() {
  if (isNew) return;
  try {
    const res = await axios.get(`/admin/pricing/rules/${ruleId}`);
    const data = res.data;
    form.name = data.name;
    form.targetType = data.targetType;
    form.strategy = data.strategy;
    form.basePrice = data.basePrice;
    form.minPrice = data.minPrice;
    form.maxPrice = data.maxPrice;
    form.strategyConfig = data.strategyConfig || "";
    form.priority = data.priority;
  } catch {
    ElMessage.error("获取规则详情失败");
  }
}

async function handleSave() {
  saving.value = true;
  try {
    if (isNew) {
      await axios.post("/admin/pricing/rules", form);
      ElMessage.success("创建成功");
    } else {
      await axios.put(`/admin/pricing/rules/${ruleId}`, form);
      ElMessage.success("更新成功");
    }
    router.back();
  } catch {
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}

onMounted(fetchRule);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
</style>
