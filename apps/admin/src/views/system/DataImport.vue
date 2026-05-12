<template>
  <div class="page">
    <div class="toolbar"><h3>数据导入</h3></div>

    <el-card>
      <el-form label-width="100px">
        <el-form-item label="导入类型" required>
          <el-select v-model="importType" style="width:300px">
            <el-option label="文章" value="article" />
            <el-option label="课程" value="course" />
            <el-option label="商品" value="product" />
            <el-option label="古籍" value="classic" />
            <el-option label="用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="CSV文件" required>
          <el-upload
            :auto-upload="false"
            :limit="1"
            accept=".csv"
            :on-change="onFileChange"
            :on-remove="() => file = null"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip><span style="margin-left:8px;color:#999">仅支持 CSV 格式，最大 10MB</span></template>
          </el-upload>
        </el-form-item>
        <el-form-item>
          <el-button type="success" :loading="importing" @click="doImport" :disabled="!file">
            开始导入
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="importResult" style="margin-top:16px">
      <template #header>导入结果</template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="总行数">{{ importResult.total }}</el-descriptions-item>
        <el-descriptions-item label="成功">{{ importResult.success }}</el-descriptions-item>
        <el-descriptions-item label="失败">{{ importResult.failed }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="importResult.errors?.length" style="margin-top:12px">
        <h4>错误详情</h4>
        <el-table :data="importResult.errors" stripe max-height="300">
          <el-table-column prop="row" label="行号" width="80" />
          <el-table-column prop="message" label="错误信息" />
        </el-table>
      </div>
    </el-card>

    <el-card style="margin-top:16px">
      <template #header>CSV 格式说明</template>
      <div v-if="importType === 'article'">
        <p><strong>文章</strong> — 列：title, content, tags(逗号分隔), cover, status</p>
      </div>
      <div v-else-if="importType === 'course'">
        <p><strong>课程</strong> — 列：title, intro, cover, price, type(VIDEO/AUDIO/TEXT), tags(逗号分隔)</p>
      </div>
      <div v-else-if="importType === 'product'">
        <p><strong>商品</strong> — 列：title, intro, detail, price, stock, images(逗号分隔), categoryId</p>
      </div>
      <div v-else-if="importType === 'classic'">
        <p><strong>古籍</strong> — 列：title, author, dynasty, category(经/史/子/集/释/道), intro</p>
      </div>
      <div v-else-if="importType === 'user'">
        <p><strong>用户</strong> — 列：nickname, phone, email, gender(0/1), bio</p>
      </div>
      <p style="color:#999;margin-top:8px">第一行为表头，编码需为 UTF-8</p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { importApi } from '@/api'

const importType = ref('article')
const file = ref<File | null>(null)
const importing = ref(false)
const importResult = ref<any>(null)

function onFileChange(uploadFile: any) { file.value = uploadFile.raw }

async function doImport() {
  if (!file.value) { ElMessage.warning('请选择文件'); return }
  importing.value = true
  try {
    const res = await importApi.importCsv(importType.value, file.value)
    importResult.value = res.data
    ElMessage.success('导入完成')
  } catch (e: any) { }
  finally { importing.value = false }
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { margin-bottom: 16px; }
</style>
