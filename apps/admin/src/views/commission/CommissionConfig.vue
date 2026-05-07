<template>
  <div class="commission-config">
    <h3>分佣配置管理</h3>
    <el-description-item>调整各业务场景的分佣比例，修改即时生效。</el-description-item>

    <el-table :data="configs" border stripe style="margin-top: 16px">
      <el-table-column prop="configKey" label="配置键" width="160" />
      <el-table-column prop="configName" label="名称" width="180" />
      <el-table-column label="角色A比例" width="120">
        <template #default="{ row }">
          <el-input-number
            v-model="row._rateA"
            :min="0"
            :max="row.configKey === 'withdrawal_min' ? 99999 : 1"
            :step="row.configKey === 'withdrawal_min' ? 10 : 0.01"
            :precision="row.configKey === 'withdrawal_min' ? 0 : 2"
            size="small"
            controls-position="right"
            style="width: 100px"
          />
        </template>
      </el-table-column>
      <el-table-column label="角色B比例" width="120">
        <template #default="{ row }">
          <el-input-number
            v-model="row._rateB"
            :min="0"
            :max="1"
            :step="0.01"
            :precision="2"
            size="small"
            controls-position="right"
            style="width: 100px"
          />
        </template>
      </el-table-column>
      <el-table-column prop="description" label="说明" min-width="200" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="save(row)">保存</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { commissionApi } from "@/api";
import { ElMessage } from "element-plus";

const configs = ref<any[]>([]);

onMounted(async () => {
  const { data } = await commissionApi.configs();
  configs.value = (data || []).map((c: any) => ({
    ...c,
    _rateA: Number(c.rateA),
    _rateB: Number(c.rateB),
  }));
});

async function save(row: any) {
  try {
    await commissionApi.updateConfig(row.configKey, {
      rateA: row._rateA,
      rateB: row._rateB,
    });
    ElMessage.success(`${row.configName} 已更新`);
  } catch {
    // 拦截器已处理错误
  }
}
</script>

<style scoped>
h3 {
  margin: 0 0 4px;
  font-size: 18px;
}
</style>
