<script setup lang="ts">
/**
 * 后台·课程发布/编辑页（2026-07-11 董事长点名重做·参照 ProductEditor 范式）
 *
 * 设计要点（对应董事长痛点）：
 * 1. 去富文本编辑器化：课程不是文章，只需"章节 + 封面 + 简介 + 价格 + 权限"等常规操作，
 *    简介用纯文本、介绍用详情图序列（上传+拖拽排序），全程无 wangEditor。
 * 2. 全屏独立编辑页（路由页非弹窗）：左侧分区块表单 + 右侧手机实时预览，编辑即所见。
 * 3. 章节管理卡片化：增删改 + 上移/下移排序 + VodUpload 本地直传（自动读时长）+ 试看开关。
 *    注：数据库 CourseChapter 为单级结构（每章节即一节课时，C 端按此渲染），不做假两级。
 * 4. 价格体系明确：售价 + 划线价（须高于售价）+ 会员免费开关 + 有效期天数（0=永久）。
 * 5. 上架控制：状态展示 + 立即上架/下架 + 定时上下架（scheduledOnAt/scheduledOffAt·后端 cron 每分钟翻转）。
 *
 * 字段落库映射：Course.{title,cover,intro,type,price,originalPrice,tags,categoryLevel1/2,
 * validityDays,detailImages,visibility,circleId,stationId,scheduledOnAt,scheduledOffAt}
 * + memberFree（独立端点 PUT /courses/:id/member-free）+ auditStatus（PUT /courses/:id/status）。
 */
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Delete, Top, Bottom, InfoFilled, VideoPlay, Headset, Picture } from "@element-plus/icons-vue";
import { courseApi } from "@/api";
import CosImageUpload from "@/components/upload/CosImageUpload.vue";
import ImageListUpload from "@/components/upload/ImageListUpload.vue";
import VodUpload from "@/components/upload/VodUpload.vue";

const route = useRoute();
const router = useRouter();
const courseId = ref((route.params.id as string) || "");
const isEdit = computed(() => !!courseId.value);

/* ══════════════ 表单状态 ══════════════ */

const form = reactive({
  title: "",
  cover: "",
  intro: "",
  type: "VIDEO" as string,
  price: 0 as number | null,
  originalPrice: null as number | null,
  tags: [] as string[],
  categoryLevel1: "",
  categoryLevel2: "",
  validityDays: 0,
  detailImages: [] as string[],
  visibility: "PLATFORM" as string,
  circleId: "",
  stationId: "",
  scheduledOnAt: null as string | null,
  scheduledOffAt: null as string | null,
});
const memberFree = ref(false);
let origMemberFree = false;
const auditStatus = ref("DRAFT"); // 当前状态（编辑态从后端回填）

interface ChapterDraft {
  id?: string;
  title: string;
  mediaUrl: string;
  content: string;
  duration: number | null;
  freeTrial: boolean;
}
const chapters = ref<ChapterDraft[]>([]);
/** 打开时章节快照（保存时 diff：删/改/增） */
let origChapters: Array<ChapterDraft & { id: string; sortOrder: number }> = [];

const loading = ref(false);
const saving = ref(false);
const statusChanging = ref(false);

/* ── 标签输入 ── */
const tagInputVisible = ref(false);
const tagInputValue = ref("");
function addTag() {
  const val = tagInputValue.value.trim();
  if (val && !form.tags.includes(val)) form.tags.push(val);
  tagInputValue.value = "";
  tagInputVisible.value = false;
}

/* ── 品类（两级下拉·沿用课程品类树端点） ── */
const categoryTree = ref<Record<string, string[]>>({});
const categoryLevel1List = computed(() => Object.keys(categoryTree.value));
const categoryLevel2Options = computed(() => (form.categoryLevel1 ? categoryTree.value[form.categoryLevel1] || [] : []));
function onLevel1Change() {
  if (form.categoryLevel2 && !categoryLevel2Options.value.includes(form.categoryLevel2)) form.categoryLevel2 = "";
}
async function fetchCategories() {
  try {
    const { data } = await courseApi.getCategories();
    if (data && Object.keys(data).length > 0) categoryTree.value = data;
  } catch { /* 品类树加载失败不阻塞编辑 */ }
}

/* ── 课程类型 ── */
const baseTypeOptions = [
  { value: "VIDEO", label: "视频课", icon: VideoPlay },
  { value: "AUDIO", label: "音频课", icon: Headset },
  { value: "TEXT", label: "图文课", icon: Picture },
];
// 存量课程可能是 EBOOK/COMBO（旧类型不再新建），编辑时保留展示避免误改
const typeOptions = computed(() => {
  if (form.type === "EBOOK") return [...baseTypeOptions, { value: "EBOOK", label: "电子书(旧)", icon: Picture }];
  if (form.type === "COMBO") return [...baseTypeOptions, { value: "COMBO", label: "组合(旧)", icon: Picture }];
  return baseTypeOptions;
});
const isMediaCourse = computed(() => form.type === "VIDEO" || form.type === "AUDIO");

/* ── 状态标签 ── */
const statusMeta: Record<string, { text: string; type: "success" | "info" | "warning" | "danger" }> = {
  APPROVED: { text: "已上架", type: "success" },
  DRAFT: { text: "草稿/已下架", type: "info" },
  PENDING: { text: "待审核", type: "warning" },
  REJECTED: { text: "已驳回", type: "danger" },
};

/* ══════════════ 加载（编辑态回填） ══════════════ */

onMounted(async () => {
  fetchCategories();
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const { data } = await courseApi.detail(courseId.value);
    Object.assign(form, {
      title: data.title || "",
      cover: data.cover || "",
      intro: data.intro || "",
      type: data.type || "VIDEO",
      price: data.price != null ? Number(data.price) : 0,
      originalPrice: data.originalPrice != null ? Number(data.originalPrice) : null,
      tags: [...(data.tags || [])],
      categoryLevel1: data.categoryLevel1 || "",
      categoryLevel2: data.categoryLevel2 || "",
      validityDays: data.validityDays || 0,
      detailImages: [...(data.detailImages || [])],
      visibility: data.visibility === "CIRCLE_ONLY" ? "CIRCLE_ONLY" : "PLATFORM",
      circleId: data.circleId || "",
      stationId: data.stationId || "",
      scheduledOnAt: data.scheduledOnAt || null,
      scheduledOffAt: data.scheduledOffAt || null,
    });
    memberFree.value = !!data.memberFree;
    origMemberFree = memberFree.value;
    auditStatus.value = data.auditStatus || "DRAFT";
    // 详情端点自带完整章节（getChapters 只回元数据，无 mediaUrl/content）
    const chs = (data.chapters || []) as Array<Record<string, unknown>>;
    chapters.value = chs.map((c) => ({
      id: c.id as string,
      title: (c.title as string) || "",
      mediaUrl: (c.mediaUrl as string) || "",
      content: (c.content as string) || "",
      duration: c.duration != null ? Number(c.duration) : null,
      freeTrial: !!c.freeTrial,
    }));
    origChapters = chapters.value.map((c, i) => ({ ...c, id: c.id as string, sortOrder: i + 1 }));
  } catch {
    ElMessage.error("课程加载失败，请重试");
    router.push("/courses");
  } finally {
    loading.value = false;
  }
});

/* ══════════════ 章节操作 ══════════════ */

function addChapterCard() {
  chapters.value.push({ title: "", mediaUrl: "", content: "", duration: null, freeTrial: false });
}
function removeChapterCard(idx: number) {
  chapters.value.splice(idx, 1);
}
function moveChapter(idx: number, delta: number) {
  const to = idx + delta;
  if (to < 0 || to >= chapters.value.length) return;
  const [moved] = chapters.value.splice(idx, 1);
  chapters.value.splice(to, 0, moved);
}
function onChapterDuration(ch: ChapterDraft, seconds: number) {
  ch.duration = seconds;
}
function fmtDuration(sec?: number | null) {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}分${s > 0 ? s + "秒" : ""}` : `${s}秒`;
}

/* ══════════════ 校验 + 保存 ══════════════ */

function validate(publish: boolean): string | null {
  if (!form.title.trim()) return "请填写课程标题";
  if (!form.cover) return "请上传课程封面（列表与详情页展示必需）";
  if (form.price == null || form.price < 0) return "请填写课程售价（0=免费）";
  if (form.originalPrice != null && form.originalPrice > 0 && form.originalPrice <= form.price) {
    return "划线价应高于售价，否则请留空";
  }
  for (let i = 0; i < chapters.value.length; i++) {
    if (!chapters.value[i].title.trim()) return `第 ${i + 1} 个章节请填写标题`;
  }
  if (publish) {
    if (chapters.value.length === 0) return "上架前请至少添加一个章节";
    for (let i = 0; i < chapters.value.length; i++) {
      const ch = chapters.value[i];
      if (isMediaCourse.value && !ch.mediaUrl) return `第 ${i + 1} 个章节尚未上传${form.type === "VIDEO" ? "视频" : "音频"}，上架前请补齐`;
      if (form.type === "TEXT" && !ch.content.trim() && !ch.mediaUrl) return `第 ${i + 1} 个章节内容为空，上架前请补齐`;
    }
  }
  // 按时间实值比较（回填值可能是 Z 结尾 ISO、新设值带 +08:00 偏移，字符串比较不可靠）
  if (form.scheduledOnAt && form.scheduledOffAt
    && new Date(form.scheduledOffAt).getTime() <= new Date(form.scheduledOnAt).getTime()) {
    return "定时下架时间应晚于定时上架时间";
  }
  return null;
}

function buildPayload(): Record<string, unknown> {
  return {
    title: form.title.trim(),
    cover: form.cover,
    intro: form.intro.trim(),
    type: form.type,
    price: Number(form.price) || 0,
    originalPrice: form.originalPrice != null && form.originalPrice > 0 ? Number(form.originalPrice) : undefined,
    tags: form.tags,
    categoryLevel1: form.categoryLevel1 || undefined,
    categoryLevel2: form.categoryLevel2 || undefined,
    validityDays: Number(form.validityDays) || 0,
    detailImages: form.detailImages.slice(0, 6),
    visibility: form.visibility,
    circleId: form.circleId || undefined,
    stationId: form.stationId || undefined,
    // 定时上下架：null=清除（后端 cron 每分钟翻转 auditStatus 并清空该字段）
    scheduledOnAt: form.scheduledOnAt || null,
    scheduledOffAt: form.scheduledOffAt || null,
  };
}

/** 章节同步（diff）：删除消失的 → 按当前顺序改/增（sortOrder=序号） */
async function syncChapters(id: string): Promise<number> {
  let failed = 0;
  const keptIds = new Set(chapters.value.filter((c) => c.id).map((c) => c.id as string));
  for (const orig of origChapters) {
    if (!keptIds.has(orig.id)) {
      try { await courseApi.deleteChapter(id, orig.id); } catch { failed++; }
    }
  }
  for (let i = 0; i < chapters.value.length; i++) {
    const ch = chapters.value[i];
    const payload = {
      title: ch.title.trim(),
      content: ch.content || "",
      mediaUrl: ch.mediaUrl || "",
      duration: ch.duration != null ? Math.round(ch.duration) : undefined,
      freeTrial: ch.freeTrial,
      sortOrder: i + 1,
    };
    try {
      if (ch.id) {
        const orig = origChapters.find((o) => o.id === ch.id);
        const unchanged = orig && orig.title === payload.title && orig.content === payload.content
          && orig.mediaUrl === payload.mediaUrl && (orig.duration ?? undefined) === payload.duration
          && orig.freeTrial === payload.freeTrial && orig.sortOrder === payload.sortOrder;
        if (!unchanged) await courseApi.updateChapter(id, ch.id, payload);
      } else {
        await courseApi.addChapter(id, payload);
      }
    } catch { failed++; }
  }
  return failed;
}

/**
 * 保存主流程：
 * @param publish true=保存并上架（forceStatus APPROVED）/ false=存草稿（forceStatus DRAFT）/ null=仅保存不动状态
 */
async function save(publish: boolean | null) {
  const err = validate(publish === true);
  if (err) { ElMessage.warning(err); return; }
  saving.value = true;
  try {
    let id = courseId.value;
    if (id) {
      await courseApi.update(id, buildPayload());
    } else {
      const { data } = await courseApi.create(buildPayload());
      id = (data as { id?: string })?.id || "";
      if (!id) { ElMessage.error("课程创建失败，请重试"); return; }
    }

    const chapterFailed = await syncChapters(id);

    // 会员精品课标记（独立端点·仅变化时调用）
    if (memberFree.value !== origMemberFree) {
      try {
        await courseApi.setMemberFree(id, memberFree.value);
        origMemberFree = memberFree.value;
      } catch { ElMessage.warning("会员精品课标记设置失败（仅平台运营可操作）"); }
    }

    if (publish !== null) {
      const target = publish ? "APPROVED" : "DRAFT";
      if (auditStatus.value !== target) {
        await courseApi.forceStatus(id, target);
        auditStatus.value = target;
      }
    }

    if (chapterFailed > 0) {
      ElMessage.warning(`课程已保存，但 ${chapterFailed} 个章节同步失败，请进入编辑页重试`);
    } else {
      ElMessage.success(publish === true ? "已保存并上架" : publish === false ? "已存为草稿" : "保存成功");
    }
    router.push("/courses");
  } catch { /* 请求错误已由拦截器提示 */ } finally {
    saving.value = false;
  }
}

/** 立即上架/下架（编辑态·不经保存流程） */
async function changeStatus(target: "APPROVED" | "DRAFT") {
  if (!courseId.value) return;
  try {
    await ElMessageBox.confirm(
      target === "APPROVED" ? "立即上架该课程？C 端用户将可见可购买。" : "立即下架该课程？C 端将不再展示（已购学员不受影响）。",
      "提示", { type: "warning" },
    );
  } catch { return; }
  statusChanging.value = true;
  try {
    await courseApi.forceStatus(courseId.value, target);
    auditStatus.value = target;
    ElMessage.success(target === "APPROVED" ? "已上架" : "已下架");
  } finally { statusChanging.value = false; }
}

/* ══════════════ 预览派生 ══════════════ */

const previewPrice = computed(() => Number(form.price) || 0);
const previewValidity = computed(() => ((form.validityDays || 0) > 0 ? `购后 ${form.validityDays} 天有效` : "永久有效"));
</script>

<template>
  <div class="course-editor">
    <!-- 顶栏 -->
    <div class="editor-header">
      <div class="header-title">
        <el-page-header
          title="返回"
          @back="router.push('/courses')"
        >
          <template #content>
            <span class="header-h3">{{ isEdit ? "编辑课程" : "发布课程" }}</span>
            <el-tag
              v-if="isEdit"
              :type="statusMeta[auditStatus]?.type || 'info'"
              size="small"
              style="margin-left:10px"
            >
              {{ statusMeta[auditStatus]?.text || auditStatus }}
            </el-tag>
          </template>
        </el-page-header>
        <span class="header-sub">左侧编辑 · 右侧手机实时预览 · 无需富文本编辑器</span>
      </div>
      <div class="header-actions">
        <el-button
          :loading="saving"
          @click="save(false)"
        >
          存草稿
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="save(true)"
        >
          保存并上架
        </el-button>
      </div>
    </div>

    <div
      v-loading="loading"
      class="editor-layout"
    >
      <!-- ═══ 左：分区块表单 ═══ -->
      <div class="form-col">
        <!-- 块1：课程封面 -->
        <section class="form-block">
          <div class="block-title">
            课程封面 <span class="block-req">*</span>
          </div>
          <div class="zone-desc">
            1 张 · 建议 16:9 横图 · 展示在课程列表卡片与详情页顶部
          </div>
          <CosImageUpload v-model="form.cover" />
        </section>

        <!-- 块2：基本信息 -->
        <section class="form-block">
          <div class="block-title">
            基本信息
          </div>
          <el-form label-position="top">
            <el-form-item required>
              <template #label>
                课程标题
              </template>
              <el-input
                v-model="form.title"
                maxlength="80"
                show-word-limit
                placeholder="请输入课程标题"
              />
            </el-form-item>
            <el-form-item label="一句话简介">
              <el-input
                v-model="form.intro"
                type="textarea"
                :rows="2"
                maxlength="200"
                show-word-limit
                placeholder="展示在课程标题下方（纯文本·选填）"
              />
            </el-form-item>
            <el-form-item label="课程类型">
              <el-radio-group v-model="form.type">
                <el-radio-button
                  v-for="opt in typeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  <el-icon style="vertical-align:-2px;margin-right:4px">
                    <component :is="opt.icon" />
                  </el-icon>{{ opt.label }}
                </el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="一级品类">
                  <el-select
                    v-model="form.categoryLevel1"
                    placeholder="选择品类"
                    clearable
                    style="width:100%"
                    @change="onLevel1Change"
                  >
                    <el-option
                      v-for="cat in categoryLevel1List"
                      :key="cat"
                      :label="cat"
                      :value="cat"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="二级品类">
                  <el-select
                    v-model="form.categoryLevel2"
                    placeholder="选择二级品类"
                    clearable
                    style="width:100%"
                  >
                    <el-option
                      v-for="cat in categoryLevel2Options"
                      :key="cat"
                      :label="cat"
                      :value="cat"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="标签">
                  <el-tag
                    v-for="(tag, idx) in form.tags"
                    :key="idx"
                    closable
                    style="margin-right:4px"
                    @close="form.tags.splice(idx, 1)"
                  >
                    {{ tag }}
                  </el-tag>
                  <el-input
                    v-if="tagInputVisible"
                    v-model="tagInputValue"
                    size="small"
                    style="width:90px"
                    autofocus
                    @keyup.enter="addTag"
                    @blur="addTag"
                  />
                  <el-button
                    v-else
                    size="small"
                    @click="tagInputVisible = true"
                  >
                    + 标签
                  </el-button>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </section>

        <!-- 块3：介绍详情图（替代富文本详情） -->
        <section class="form-block">
          <div class="block-title">
            课程介绍图
          </div>
          <div class="zone-desc">
            最多 6 张 · 按顺序从上到下拼接展示在课程详情页"简介"区 · 按住图片拖动即可排序
          </div>
          <ImageListUpload
            v-model="form.detailImages"
            :max="6"
          />
        </section>

        <!-- 块4：章节管理 -->
        <section class="form-block">
          <div class="block-title">
            章节管理
            <span class="block-count">共 {{ chapters.length }} 节</span>
          </div>
          <div
            v-if="chapters.length === 0"
            class="chapter-empty"
          >
            还没有章节，点击下方按钮添加第一节课
          </div>
          <div
            v-for="(ch, idx) in chapters"
            :key="ch.id || 'new-' + idx"
            class="chapter-card"
          >
            <div class="chapter-head">
              <span class="chapter-index">第 {{ idx + 1 }} 节</span>
              <el-input
                v-model="ch.title"
                placeholder="章节标题（必填）"
                class="chapter-title-input"
              />
              <div class="chapter-ops">
                <el-tooltip content="上移">
                  <el-button
                    size="small"
                    :icon="Top"
                    :disabled="idx === 0"
                    @click="moveChapter(idx, -1)"
                  />
                </el-tooltip>
                <el-tooltip content="下移">
                  <el-button
                    size="small"
                    :icon="Bottom"
                    :disabled="idx === chapters.length - 1"
                    @click="moveChapter(idx, 1)"
                  />
                </el-tooltip>
                <el-button
                  size="small"
                  type="danger"
                  text
                  :icon="Delete"
                  @click="removeChapterCard(idx)"
                />
              </div>
            </div>
            <div class="chapter-body">
              <!-- 视频/音频课时：VOD 本地直传 + 自动读时长 -->
              <template v-if="isMediaCourse">
                <VodUpload
                  v-model="ch.mediaUrl"
                  :accept="form.type === 'AUDIO' ? 'audio/*,video/*' : 'video/*'"
                  :button-text="form.type === 'AUDIO' ? '本地上传音频' : '本地上传视频'"
                  @update:duration="onChapterDuration(ch, $event)"
                />
                <div
                  v-if="ch.duration"
                  class="chapter-duration"
                >
                  时长：{{ fmtDuration(ch.duration) }}（选择文件后自动读取）
                </div>
              </template>
              <!-- 图文课时：纯文本内容（C 端按文本渲染） -->
              <el-input
                v-if="form.type === 'TEXT' || ch.content || form.type === 'EBOOK'"
                v-model="ch.content"
                type="textarea"
                :rows="4"
                :placeholder="form.type === 'TEXT' ? '图文课时正文（纯文本）' : '章节正文（选填）'"
                style="margin-top:8px"
              />
              <div class="chapter-foot">
                <el-switch
                  v-model="ch.freeTrial"
                  active-text="免费试看"
                />
                <span class="chapter-foot-tip">开启后未购买用户也可学习本节</span>
              </div>
            </div>
          </div>
          <el-button
            :icon="Plus"
            style="width:100%;margin-top:4px"
            @click="addChapterCard"
          >
            添加章节
          </el-button>
        </section>

        <!-- 块5：定价 -->
        <section class="form-block">
          <div class="block-title">
            定价
          </div>
          <div class="price-note">
            <el-icon class="note-icon">
              <InfoFilled />
            </el-icon>
            <span>
              售价 0 元 = 免费课程。划线价仅作营销展示（须高于售价）。
              开启「会员免费」后有效会员无需购买即可学习（平台运营专属操作）。
            </span>
          </div>
          <el-form label-position="top">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item required>
                  <template #label>
                    售价（元）
                  </template>
                  <el-input-number
                    v-model="form.price"
                    :min="0"
                    :precision="2"
                    :controls="false"
                    placeholder="0 = 免费"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="划线价（选填）">
                  <el-input-number
                    v-model="form.originalPrice"
                    :min="0"
                    :precision="2"
                    :controls="false"
                    placeholder="原价·须高于售价"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="有效期（天）">
                  <el-input-number
                    v-model="form.validityDays"
                    :min="0"
                    :precision="0"
                    :controls="false"
                    placeholder="0 = 永久"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item>
              <template #label>
                会员免费 <span class="switch-note">（会员精品课·有效会员免费学习）</span>
              </template>
              <el-switch v-model="memberFree" />
            </el-form-item>
          </el-form>
        </section>

        <!-- 块6：权限与开放范围 -->
        <section class="form-block">
          <div class="block-title">
            权限与开放范围
          </div>
          <el-form label-position="top">
            <el-form-item label="开放范围">
              <el-radio-group v-model="form.visibility">
                <el-radio value="PLATFORM">
                  全平台可见
                </el-radio>
                <el-radio value="CIRCLE_ONLY">
                  仅圈子内可见
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="所属圈子">
                  <el-input
                    v-model="form.circleId"
                    placeholder="圈子ID（留空 = 官方圈子）"
                    clearable
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="所属分站">
                  <el-input
                    v-model="form.stationId"
                    placeholder="分站ID（留空 = 平台级）"
                    clearable
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </section>

        <!-- 块7：上架控制 -->
        <section class="form-block">
          <div class="block-title">
            上架控制
          </div>
          <div
            v-if="isEdit"
            class="status-row"
          >
            <span class="status-label">当前状态：</span>
            <el-tag
              :type="statusMeta[auditStatus]?.type || 'info'"
            >
              {{ statusMeta[auditStatus]?.text || auditStatus }}
            </el-tag>
            <el-button
              v-if="auditStatus !== 'APPROVED'"
              type="success"
              size="small"
              :loading="statusChanging"
              style="margin-left:12px"
              @click="changeStatus('APPROVED')"
            >
              立即上架
            </el-button>
            <el-button
              v-if="auditStatus === 'APPROVED'"
              type="warning"
              size="small"
              :loading="statusChanging"
              style="margin-left:12px"
              @click="changeStatus('DRAFT')"
            >
              立即下架
            </el-button>
          </div>
          <div
            v-else
            class="zone-desc"
          >
            新建课程：右上角「存草稿」暂不上架，「保存并上架」立即对 C 端可见。
          </div>
          <el-form
            label-position="top"
            style="margin-top:8px"
          >
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="定时上架">
                  <!-- value-format 带时区偏移（Z→+08:00）：避免浏览器与服务器时区不一致时定时点漂移 -->
                  <el-date-picker
                    v-model="form.scheduledOnAt"
                    type="datetime"
                    placeholder="到点自动上架（留空不启用）"
                    value-format="YYYY-MM-DDTHH:mm:ssZ"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="定时下架">
                  <el-date-picker
                    v-model="form.scheduledOffAt"
                    type="datetime"
                    placeholder="到点自动下架（留空不启用）"
                    value-format="YYYY-MM-DDTHH:mm:ssZ"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
          <div class="zone-desc">
            定时上下架每分钟检查一次，到点自动翻转状态并清除定时；保存课程后生效。
          </div>
        </section>
      </div>

      <!-- ═══ 右：手机壳实时预览 ═══ -->
      <div class="preview-col">
        <div class="phone-frame">
          <div class="phone-notch" />
          <div class="phone-screen">
            <!-- 封面 -->
            <img
              v-if="form.cover"
              :src="form.cover"
              class="pv-cover"
            >
            <div
              v-else
              class="pv-cover pv-cover-empty"
            >
              课程封面预览（16:9）
            </div>

            <!-- 价格 + 标题 -->
            <div class="pv-info">
              <div class="pv-price">
                <template v-if="previewPrice > 0">
                  <span class="pv-price-symbol">¥</span>{{ previewPrice.toFixed(2) }}
                  <span
                    v-if="form.originalPrice && form.originalPrice > previewPrice"
                    class="pv-price-origin"
                  >¥{{ Number(form.originalPrice).toFixed(2) }}</span>
                </template>
                <span
                  v-else
                  class="pv-price-free"
                >免费</span>
                <span
                  v-if="memberFree"
                  class="pv-member-badge"
                >会员免费</span>
              </div>
              <div class="pv-title">
                {{ form.title || "课程标题" }}
              </div>
              <div
                v-if="form.intro"
                class="pv-intro"
              >
                {{ form.intro }}
              </div>
              <div class="pv-meta">
                <span>{{ baseTypeOptions.find(t => t.value === form.type)?.label || form.type }}</span>
                <span>·</span>
                <span>{{ chapters.length }} 节</span>
                <span>·</span>
                <span>{{ previewValidity }}</span>
              </div>
              <div
                v-if="form.tags.length"
                class="pv-tags"
              >
                <span
                  v-for="(tag, idx) in form.tags"
                  :key="idx"
                  class="pv-tag"
                >{{ tag }}</span>
              </div>
            </div>

            <!-- 简介：详情图无缝拼接 -->
            <div
              v-if="form.detailImages.length"
              class="pv-detail"
            >
              <div class="pv-section-label">
                课程介绍
              </div>
              <img
                v-for="(url, idx) in form.detailImages"
                :key="idx"
                :src="url"
                class="pv-detail-img"
              >
            </div>

            <!-- 目录 -->
            <div class="pv-chapters">
              <div class="pv-section-label">
                课程目录（{{ chapters.length }}）
              </div>
              <div
                v-for="(ch, idx) in chapters"
                :key="idx"
                class="pv-chapter-item"
              >
                <span class="pv-chapter-idx">{{ idx + 1 }}</span>
                <span class="pv-chapter-title">{{ ch.title || "未命名章节" }}</span>
                <span
                  v-if="ch.freeTrial"
                  class="pv-chapter-free"
                >试看</span>
                <span
                  v-if="ch.duration"
                  class="pv-chapter-dur"
                >{{ fmtDuration(ch.duration) }}</span>
              </div>
              <div
                v-if="chapters.length === 0"
                class="pv-chapter-empty"
              >
                章节将按顺序展示在这里
              </div>
            </div>
          </div>
        </div>
        <div class="preview-caption">
          手机端实时预览
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.course-editor { padding: 16px 20px 40px; }

/* 顶栏 */
.editor-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; gap: 16px;
}
.header-title { display: flex; align-items: baseline; gap: 12px; min-width: 0; }
.header-h3 { font-size: 18px; font-weight: 600; }
.header-sub { font-size: 12px; color: var(--color-text-secondary, #999); white-space: nowrap; }
.header-actions { display: flex; gap: 8px; flex-shrink: 0; }

.editor-layout { display: flex; gap: 24px; align-items: flex-start; max-width: 1400px; margin: 0 auto; }

/* 左列 */
.form-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.form-block {
  background: var(--el-bg-color, #fff);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 10px; padding: 20px;
}
.block-title {
  font-size: 15px; font-weight: 600; margin-bottom: 12px;
  padding-left: 10px; border-left: 3px solid var(--el-color-primary, #409eff);
  line-height: 1.2; display: flex; align-items: baseline; gap: 8px;
}
.block-req { color: var(--el-color-danger, #f56c6c); }
.block-count { font-size: 12px; font-weight: normal; color: var(--color-text-secondary, #999); }
.zone-desc { font-size: 12px; color: var(--color-text-secondary, #999); margin-bottom: 10px; line-height: 1.6; }

/* 章节卡片 */
.chapter-empty {
  padding: 24px 0; text-align: center; color: #b0b3ba; font-size: 13px;
  background: var(--el-fill-color-lighter, #f6f6f8); border-radius: 8px; margin-bottom: 10px;
}
.chapter-card {
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;
  background: var(--el-fill-color-blank, #fff);
}
.chapter-head { display: flex; align-items: center; gap: 10px; }
.chapter-index { flex-shrink: 0; font-size: 13px; font-weight: 600; color: var(--el-color-primary, #409eff); white-space: nowrap; }
.chapter-title-input { flex: 1; }
.chapter-ops { display: flex; align-items: center; gap: 0; flex-shrink: 0; }
.chapter-body { margin-top: 10px; padding-left: 2px; }
.chapter-duration { font-size: 12px; color: var(--color-text-secondary, #999); margin-top: 6px; }
.chapter-foot { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.chapter-foot-tip { font-size: 12px; color: var(--color-text-secondary, #999); }

/* 定价提示 */
.price-note {
  display: flex; gap: 8px; align-items: flex-start;
  background: var(--el-color-primary-light-9, #ecf5ff);
  border-radius: 8px; padding: 10px 12px; margin-bottom: 16px;
  font-size: 12px; line-height: 1.7; color: var(--el-color-primary, #409eff);
}
.note-icon { margin-top: 3px; flex-shrink: 0; }
.switch-note { font-size: 12px; color: var(--color-text-secondary, #999); font-weight: normal; }

/* 上架控制 */
.status-row { display: flex; align-items: center; margin-bottom: 8px; }
.status-label { font-size: 13px; color: var(--color-text-secondary, #666); }

/* 右列：手机壳 */
.preview-col {
  width: 395px; flex-shrink: 0;
  position: sticky; top: 0;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.phone-frame {
  width: 375px; border-radius: 36px; padding: 10px;
  background: #1c1c1e; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  position: relative;
}
.phone-notch {
  position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
  width: 120px; height: 22px; background: #1c1c1e; border-radius: 0 0 14px 14px; z-index: 2;
}
.phone-screen {
  border-radius: 28px; overflow-y: auto; background: #f6f6f8;
  height: calc(100vh - 190px); min-height: 480px;
}
.phone-screen::-webkit-scrollbar { width: 0; }

.pv-cover { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
.pv-cover-empty {
  display: flex; align-items: center; justify-content: center;
  color: #b0b3ba; font-size: 13px; background: #ececf0;
}
.pv-info { background: #fff; padding: 12px 14px; margin-bottom: 8px; }
.pv-price { color: #e64340; font-size: 22px; font-weight: 700; line-height: 1.3; display: flex; align-items: baseline; gap: 8px; }
.pv-price-symbol { font-size: 14px; }
.pv-price-origin { font-size: 12px; color: #b0b3ba; text-decoration: line-through; font-weight: normal; }
.pv-price-free { color: #2e7d32; font-size: 18px; }
.pv-member-badge {
  font-size: 10px; color: #b8894b; background: rgba(184, 137, 75, 0.12);
  border: 1px solid rgba(184, 137, 75, 0.35); border-radius: 4px; padding: 1px 6px; font-weight: normal;
}
.pv-title { font-size: 15px; font-weight: 600; margin-top: 6px; line-height: 1.45; word-break: break-all; }
.pv-intro { font-size: 12px; color: #8a8f99; margin-top: 4px; line-height: 1.5; }
.pv-meta { display: flex; gap: 6px; font-size: 11px; color: #8a8f99; margin-top: 6px; }
.pv-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pv-tag {
  font-size: 10px; color: #b8894b; background: rgba(184, 137, 75, 0.1);
  border-radius: 4px; padding: 2px 6px;
}
.pv-section-label { font-size: 13px; font-weight: 600; margin-bottom: 8px; padding: 0 14px; }
.pv-detail { background: #fff; padding: 12px 0; margin-bottom: 8px; }
.pv-detail-img { width: 100%; display: block; }
.pv-chapters { background: #fff; padding: 12px 0 20px; }
.pv-chapter-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  font-size: 13px; border-bottom: 1px solid #f4f4f6;
}
.pv-chapter-idx {
  flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
  background: #f2f3f5; color: #666; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
}
.pv-chapter-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pv-chapter-free {
  flex-shrink: 0; font-size: 10px; color: #52c41a; border: 1px solid #b7eb8f;
  border-radius: 4px; padding: 0 4px; background: #f6ffed;
}
.pv-chapter-dur { flex-shrink: 0; font-size: 11px; color: #b0b3ba; }
.pv-chapter-empty { padding: 24px 14px; text-align: center; color: #b0b3ba; font-size: 12px; }
.preview-caption { font-size: 12px; color: var(--color-text-secondary, #999); }

@media (max-width: 1100px) { .preview-col { display: none; } }
</style>
