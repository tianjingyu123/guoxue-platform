<template>
  <div class="page">
    <PageHeader title="文化仪式感内容管理" />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="二十四节气" name="solar" />
      <el-tab-pane label="每日一首" name="daily" />
    </el-tabs>

    <!-- 二十四节气 -->
    <template v-if="activeTab === 'solar'">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>节气提醒内容配置</span>
            <el-button size="small" type="primary" @click="saveAllSolarTerms" :loading="saving">批量保存</el-button>
          </div>
        </template>
        <el-table :data="solarTerms" border stripe>
          <el-table-column prop="name" label="节气" width="100" />
          <el-table-column label="日期" width="120">
            <template #default="{ row }">
              <el-date-picker
                v-model="row.pushDate"
                type="date"
                size="small"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                style="width:130px"
              />
            </template>
          </el-table-column>
          <el-table-column label="推送时间" width="120">
            <template #default="{ row }">
              <el-time-picker v-model="row.pushTime" size="small" format="HH:mm" value-format="HH:mm" placeholder="推送时间" style="width:110px" />
            </template>
          </el-table-column>
          <el-table-column label="标题" width="180">
            <template #default="{ row }">
              <el-input v-model="row.title" size="small" placeholder="节气标题" />
            </template>
          </el-table-column>
          <el-table-column label="内容" minWidth="300">
            <template #default="{ row }">
              <el-input v-model="row.content" size="small" type="textarea" :rows="2" placeholder="节气提醒内容..." />
            </template>
          </el-table-column>
          <el-table-column label="配图" width="140">
            <template #default="{ row }">
              <el-input v-model="row.imageUrl" size="small" placeholder="图片URL" />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" size="small" />
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <!-- 每日一首 -->
    <template v-if="activeTab === 'daily'">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>每日一首内容库</span>
            <div>
              <el-select v-model="dailyFilter" size="small" placeholder="状态筛选" clearable style="width:120px;margin-right:8px" @change="fetchDaily">
                <el-option label="全部" value="" />
                <el-option label="待发布" value="PENDING" />
                <el-option label="已发布" value="PUBLISHED" />
                <el-option label="草稿" value="DRAFT" />
              </el-select>
              <el-button size="small" type="primary" @click="showDailyDialog()">添加内容</el-button>
            </div>
          </div>
        </template>
        <el-table :data="dailyVerses" border stripe v-loading="dailyLoading">
          <template #empty>
            <el-empty :description="dailyError ? '加载失败，请重试' : '暂无内容'">
              <el-button v-if="dailyError" size="small" type="primary" @click="fetchDaily">重试</el-button>
            </el-empty>
          </template>
          <el-table-column prop="title" label="标题" width="200" show-overflow-tooltip />
          <el-table-column prop="author" label="作者/出处" width="120" />
          <el-table-column prop="content" label="内容" minWidth="280" show-overflow-tooltip />
          <el-table-column label="配图" width="100">
            <template #default="{ row }">
              <el-image v-if="row.imageUrl" :src="row.imageUrl" :preview-src-list="[row.imageUrl]" style="width:48px;height:48px;border-radius:4px" fit="cover" />
              <span v-else style="color:#ccc">无</span>
            </template>
          </el-table-column>
          <el-table-column label="发布日期" width="130">
            <template #default="{ row }">{{ row.publishDate }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 'PUBLISHED' ? 'success' : 'info'">
                {{ row.status === 'PUBLISHED' ? '已发布' : row.status === 'DRAFT' ? '草稿' : '待发布' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="阅读" width="80" align="center" prop="viewCount" />
          <el-table-column label="分享" width="80" align="center" prop="shareCount" />
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="showDailyDialog(row)">编辑</el-button>
              <el-popconfirm title="确定删除?" @confirm="deleteDaily(row.id)">
                <template #reference>
                  <el-button size="small" text type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="dailyPage"
          v-model:page-size="dailyPageSize"
          :total="dailyTotal"
          layout="total, sizes, prev, pager, next"
          style="margin-top:16px;justify-content:flex-end"
          @current-change="fetchDaily"
          @size-change="fetchDaily"
        />
      </el-card>
    </template>

    <!-- 每日一首编辑弹窗 -->
    <el-dialog v-model="dailyDialogVisible" :title="editingDaily?.id ? '编辑内容' : '添加内容'" width="520px">
      <el-form :model="dailyForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="dailyForm.title" placeholder="如：春江花月夜" />
        </el-form-item>
        <el-form-item label="作者/出处">
          <el-input v-model="dailyForm.author" placeholder="如：张若虚《春江花月夜》" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="dailyForm.content" type="textarea" :rows="6" placeholder="诗词/文章内容..." />
        </el-form-item>
        <el-form-item label="配图">
          <el-input v-model="dailyForm.imageUrl" placeholder="图片URL" />
        </el-form-item>
        <el-form-item label="发布日期" required>
          <el-date-picker v-model="dailyForm.publishDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dailyForm.status">
            <el-radio value="DRAFT">草稿</el-radio>
            <el-radio value="PENDING">待发布</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dailyDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingDaily" @click="saveDaily">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { ritualContentApi } from "@/api"
import PageHeader from "@/components/PageHeader.vue"

const activeTab = ref("solar")
const saving = ref(false)
const savingDaily = ref(false)
const dailyLoading = ref(false)
const dailyError = ref(false)

// 节气
const solarTerms = ref<any[]>([])

// 每日一首
const dailyFilter = ref("")
const dailyPage = ref(1)
const dailyPageSize = ref(10)
const dailyTotal = ref(0)
const dailyVerses = ref<any[]>([])
const dailyDialogVisible = ref(false)
const editingDaily = ref<any>(null)
const dailyForm = reactive({ title: "", author: "", content: "", imageUrl: "", publishDate: "", status: "PENDING" })

async function fetchSolarTerms() {
  try {
    const res: any = await ritualContentApi.listSolarTerms()
    solarTerms.value = ((res?.data ?? res)?.list ?? []).map((t: any) => ({
      ...t, pushDate: t.pushDate ?? "", pushTime: t.pushTime ?? "08:00", enabled: t.enabled ?? true,
    }))
  } catch { ElMessage.error("节气配置加载失败") }
}

async function saveAllSolarTerms() {
  saving.value = true
  try {
    for (const t of solarTerms.value) {
      await ritualContentApi.updateSolarTerm(t.id, {
        title: t.title, content: t.content, imageUrl: t.imageUrl, pushTime: t.pushTime,
      })
    }
    ElMessage.success("所有节气配置已保存")
  } catch { /* */ }
  finally { saving.value = false }
}

async function fetchDaily() {
  dailyLoading.value = true
  dailyError.value = false
  try {
    const res: any = await ritualContentApi.listDailyVerses({
      page: dailyPage.value, pageSize: dailyPageSize.value,
      status: dailyFilter.value || undefined,
    })
    const d = res?.data ?? res
    dailyVerses.value = d.list ?? d.data ?? []
    dailyTotal.value = d.total ?? 0
  } catch {
    dailyError.value = true
    dailyVerses.value = []
    dailyTotal.value = 0
  }
  finally { dailyLoading.value = false }
}

function showDailyDialog(row?: any) {
  if (row) {
    editingDaily.value = row
    dailyForm.title = row.title; dailyForm.author = row.author ?? ""
    dailyForm.content = row.content; dailyForm.imageUrl = row.imageUrl ?? ""
    dailyForm.publishDate = row.publishDate ?? ""; dailyForm.status = row.status ?? "PENDING"
  } else {
    editingDaily.value = null
    dailyForm.title = ""; dailyForm.author = ""; dailyForm.content = ""
    dailyForm.imageUrl = ""; dailyForm.publishDate = ""; dailyForm.status = "PENDING"
  }
  dailyDialogVisible.value = true
}

async function saveDaily() {
  if (savingDaily.value) return
  savingDaily.value = true
  try {
    if (editingDaily.value?.id) {
      await ritualContentApi.updateDailyVerse(editingDaily.value.id, { ...dailyForm })
    } else {
      await ritualContentApi.createDailyVerse({ ...dailyForm })
    }
    ElMessage.success("保存成功"); dailyDialogVisible.value = false; fetchDaily()
  } catch { ElMessage.error("保存失败") }
  finally { savingDaily.value = false }
}

async function deleteDaily(id: string) {
  try { await ritualContentApi.deleteDailyVerse(id); ElMessage.success("已删除"); fetchDaily() } catch { /* */ }
}

onMounted(() => { fetchSolarTerms(); fetchDaily() })
</script>

<style scoped>
.page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
