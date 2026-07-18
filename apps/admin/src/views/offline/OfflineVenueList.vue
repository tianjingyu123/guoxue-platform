<template>
  <div class="page">
    <div class="header">
      <h2>线下驿站管理</h2>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新建驿站
      </el-button>
    </div>

    <!-- 搜索筛选 -->
    <el-form
      :model="filters"
      inline
      class="filters"
    >
      <el-form-item label="城市">
        <el-input
          v-model="filters.city"
          placeholder="城市名称"
          clearable
          @clear="fetchList"
          @keyup.enter="fetchList"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select
          v-model="filters.status"
          placeholder="全部"
          clearable
          @change="fetchList"
        >
          <el-option
            label="待审核"
            value="PENDING"
          />
          <el-option
            label="已启用"
            value="ACTIVE"
          />
          <el-option
            label="已禁用"
            value="DISABLED"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="fetchList"
        >
          查询
        </el-button>
      </el-form-item>
    </el-form>

    <el-table
      v-loading="loading"
      :data="venues"
      border
      stripe
    >
      <el-table-column
        prop="name"
        label="名称"
        width="150"
      />
      <el-table-column
        prop="city"
        label="城市"
        width="100"
      />
      <el-table-column
        prop="address"
        label="地址"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        prop="phone"
        label="联系电话"
        width="130"
      />
      <el-table-column
        label="负责人"
        width="120"
      >
        <template #default="{ row }">
          {{ row.owner?.nickname || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="押金"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ Number(row.depositAmount ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusType(row.status)"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="170"
      >
        <template #default="{ row }">
          {{ new Date(row.createdAt).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="280"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            @click="viewCourses(row)"
          >
            课程
          </el-button>
          <el-button
            v-if="row.status === 'PENDING'"
            size="small"
            type="success"
            @click="handleAudit(row, 'ACTIVE')"
          >
            通过
          </el-button>
          <el-button
            v-if="row.status === 'PENDING'"
            size="small"
            type="danger"
            @click="handleAudit(row, 'DISABLED')"
          >
            拒绝
          </el-button>
          <el-button
            v-if="row.status === 'ACTIVE'"
            size="small"
            type="warning"
            @click="handleAudit(row, 'DISABLED')"
          >
            禁用
          </el-button>
          <el-button
            v-if="row.status === 'DISABLED'"
            size="small"
            type="success"
            @click="handleAudit(row, 'ACTIVE')"
          >
            启用
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="loadError ? '加载失败' : '暂无驿站数据'">
          <el-button
            v-if="loadError"
            type="primary"
            @click="fetchList"
          >
            重试
          </el-button>
        </el-empty>
      </template>
    </el-table>

    <div
      v-if="total > pageSize"
      class="pagination-wrap"
    >
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <!-- 新建驿站对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="新建驿站"
      width="550px"
    >
      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="名称"
          required
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item
          label="城市"
          required
        >
          <el-input v-model="form.city" />
        </el-form-item>
        <el-form-item
          label="地址"
          required
        >
          <el-input v-model="form.address" />
        </el-form-item>
        <el-form-item
          label="联系电话"
          required
        >
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="封面图">
          <CosImageUpload v-model="form.cover" />
        </el-form-item>
        <el-form-item label="押金金额">
          <el-input-number
            v-model="form.depositAmount"
            :min="0"
            :precision="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 线下课程对话框 -->
    <el-dialog
      v-model="coursesDialogVisible"
      :title="'课程列表 - ' + (currentVenue?.name || '')"
      width="700px"
    >
      <div class="courses-toolbar">
        <el-button
          type="primary"
          size="small"
          @click="openCreateCourse"
        >
          新建课程
        </el-button>
      </div>
      <el-table
        v-loading="coursesLoading"
        :data="courses"
        border
        stripe
        size="small"
      >
        <el-table-column
          prop="title"
          label="课程名称"
          min-width="150"
        />
        <el-table-column
          prop="type"
          label="类型"
          width="80"
        >
          <template #default="{ row }">
            <el-tag size="small">
              {{ row.type === 'HYBRID' ? '混合' : '线下' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="时间"
          width="300"
        >
          <template #default="{ row }">
            {{ new Date(row.startTime).toLocaleString() }} ~ {{ new Date(row.endTime).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column
          prop="location"
          label="地点"
          width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="price"
          label="价格"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            ¥{{ Number(row.price ?? 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="maxStudents"
          label="人数"
          width="60"
        />
        <el-table-column
          label="状态"
          width="80"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'PUBLISHED' ? 'success' : 'info'"
              size="small"
            >
              {{ row.status === 'PUBLISHED' ? '已发布' : row.status === 'DRAFT' ? '草稿' : row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="该驿站暂无课程" />
        </template>
      </el-table>
    </el-dialog>

    <!-- 新建课程对话框 -->
    <el-dialog
      v-model="courseCreateVisible"
      title="新建线下课程"
      width="550px"
    >
      <el-form
        :model="courseForm"
        label-width="100px"
      >
        <el-form-item
          label="标题"
          required
        >
          <el-input v-model="courseForm.title" />
        </el-form-item>
        <el-form-item label="封面">
          <CosImageUpload v-model="courseForm.cover" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="courseForm.intro"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item
          label="上课地点"
          required
        >
          <el-input v-model="courseForm.location" />
        </el-form-item>
        <el-form-item
          label="最大人数"
          required
        >
          <el-input-number
            v-model="courseForm.maxStudents"
            :min="1"
          />
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number
            v-model="courseForm.price"
            :min="0"
            :precision="2"
          />
        </el-form-item>
        <el-form-item
          label="开始时间"
          required
        >
          <el-date-picker
            v-model="courseForm.startTime"
            type="datetime"
            placeholder="选择开始时间"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item
          label="结束时间"
          required
        >
          <el-date-picker
            v-model="courseForm.endTime"
            type="datetime"
            placeholder="选择结束时间"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="courseCreateVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="courseSaving"
          @click="saveCourse"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { offlineApi } from "@/api";
import CosImageUpload from "@/components/upload/CosImageUpload.vue";

/** 驿站行（字段宽松 optional） */
interface VenueRow {
  id: string
  name?: string
  city?: string
  address?: string
  phone?: string
  owner?: { nickname?: string }
  depositAmount?: number
  status?: string
  createdAt?: string
}
/** 驿站课程行 */
interface VenueCourseRow {
  title?: string
  type?: string
  startTime?: string
  endTime?: string
  location?: string
  price?: number
  maxStudents?: number
  status?: string
}

const venues = ref<VenueRow[]>([]);
const loading = ref(false);
const loadError = ref(false);
const auditing = ref(false);
const page = ref(1);
const pageSize = 20;
const total = ref(0);

const filters = reactive({ city: "", status: "" });

// 新建驿站
const dialogVisible = ref(false);
const saving = ref(false);
const form = reactive({
  name: "", city: "", address: "", phone: "", cover: "", depositAmount: 0,
});

// 课程弹窗
const coursesDialogVisible = ref(false);
const coursesLoading = ref(false);
const currentVenue = ref<VenueRow | null>(null);
const courses = ref<VenueCourseRow[]>([]);

// 新建课程
const courseCreateVisible = ref(false);
const courseSaving = ref(false);
const courseForm = reactive({
  title: "", cover: "", intro: "", location: "", maxStudents: 30,
  price: 0, startTime: null as string | null, endTime: null as string | null,
});

onMounted(() => fetchList());

function statusType(status: string) {
  switch (status) {
    case "ACTIVE": return "success";
    case "PENDING": return "warning";
    case "DISABLED": return "danger";
    default: return "info";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "ACTIVE": return "已启用";
    case "PENDING": return "待审核";
    case "DISABLED": return "已禁用";
    default: return status;
  }
}

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize };
    if (filters.city) params.city = filters.city;
    if (filters.status) params.status = filters.status;
    const { data } = await offlineApi.list(params);
    venues.value = data.items || data.stations || [];
    total.value = data.total || 0;
  } catch {
    venues.value = [];
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  form.name = "";
  form.city = "";
  form.address = "";
  form.phone = "";
  form.cover = "";
  form.depositAmount = 0;
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    await offlineApi.create({ ...form });
    ElMessage.success("驿站已创建，等待审核");
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

// ── 审核 ──

async function handleAudit(row: VenueRow, status: string) {
  if (auditing.value) return;
  const isDanger = status === "DISABLED";
  const label = status === "ACTIVE" ? (row.status === "PENDING" ? "通过" : "启用") : row.status === "PENDING" ? "拒绝" : "禁用";
  try {
    if (isDanger) {
      // L2 危险操作：理由必填 + 确认（后端 AuditStationDto 暂不落理由，落库已记后端清单，前端先拦误操作）
      const { value } = await ElMessageBox.prompt(
        `确定${label}驿站「${row.name || row.id}」？${row.status === "ACTIVE" ? "禁用后该驿站将对用户不可见，其课程与预约入口关闭。" : ""}请填写理由：`,
        `${label}驿站`,
        {
          confirmButtonText: "确认" + label,
          cancelButtonText: "取消",
          inputPlaceholder: "必填，例：资质材料不全 / 违规经营",
          inputValidator: (v: string) => (v && v.trim().length >= 2 ? true : "请填写理由（至少2个字）"),
          type: "warning",
        },
      );
      if (!value) return;
    } else {
      await ElMessageBox.confirm(`确定${label}驿站「${row.name || row.id}」？`, "确认操作", { type: "info" });
    }
  } catch {
    return; // 用户取消
  }
  auditing.value = true;
  try {
    await offlineApi.audit(row.id, status);
    ElMessage.success(`已${label}`);
    fetchList();
  } catch {
    ElMessage.error("操作失败，请重试");
  } finally {
    auditing.value = false;
  }
}

// ── 课程管理 ──

async function viewCourses(row: VenueRow) {
  currentVenue.value = row;
  coursesDialogVisible.value = true;
  coursesLoading.value = true;
  try {
    const { data } = await offlineApi.courses({ stationId: row.id });
    courses.value = Array.isArray(data) ? data : [];
  } finally {
    coursesLoading.value = false;
  }
}

function openCreateCourse() {
  if (!currentVenue.value) return;
  courseForm.title = "";
  courseForm.cover = "";
  courseForm.intro = "";
  courseForm.location = "";
  courseForm.maxStudents = 30;
  courseForm.price = 0;
  courseForm.startTime = null;
  courseForm.endTime = null;
  courseCreateVisible.value = true;
}

async function saveCourse() {
  if (!courseForm.title || !courseForm.location || !courseForm.maxStudents || !courseForm.startTime || !courseForm.endTime) {
    ElMessage.warning("请填写完整信息");
    return;
  }
  courseSaving.value = true;
  try {
    await offlineApi.createCourse({
      // 弹窗打开时 currentVenue 必有值，断言非空（纯类型）
      stationId: currentVenue.value!.id,
      title: courseForm.title,
      cover: courseForm.cover || undefined,
      intro: courseForm.intro || undefined,
      location: courseForm.location,
      maxStudents: courseForm.maxStudents,
      price: courseForm.price,
      startTime: courseForm.startTime,
      endTime: courseForm.endTime,
    });
    ElMessage.success("课程已创建");
    courseCreateVisible.value = false;
    // 刷新课程列表
    const { data } = await offlineApi.courses({ stationId: currentVenue.value!.id });
    courses.value = Array.isArray(data) ? data : [];
  } finally {
    courseSaving.value = false;
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
.header h2 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.filters { margin-bottom: 16px; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: center; }
.courses-toolbar { margin-bottom: 12px; }
</style>
