<template>
  <div class="competition-edit">
    <el-page-header
      title="返回"
      style="margin-bottom:16px"
      @back="router.push('/competitions')"
    >
      <template #content>
        {{ isEdit ? '编辑赛事' : '新建赛事' }}
      </template>
    </el-page-header>

    <div class="edit-body">
      <div class="edit-main">
        <el-card>
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="110px"
          >
            <el-form-item
              label="赛事标题"
              prop="title"
            >
              <el-input
                v-model="form.title"
                placeholder="赛事标题"
                size="large"
                maxlength="50"
              />
            </el-form-item>

            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item
                  label="赛事类型"
                  prop="type"
                >
                  <el-select
                    v-model="form.type"
                    placeholder="选择类型"
                    style="width:100%"
                  >
                    <el-option
                      v-for="(label, val) in typeLabels"
                      :key="val"
                      :label="label"
                      :value="val"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item
                  label="赛事级别"
                  prop="level"
                >
                  <el-select
                    v-model="form.level"
                    style="width:100%"
                  >
                    <el-option
                      label="S级（平台官方赛）"
                      value="S"
                    />
                    <el-option
                      label="A级（圈子联合赛）"
                      value="A"
                    />
                    <el-option
                      label="B级（圈子内部赛）"
                      value="B"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item
                  label="评分模型"
                  prop="scoringModel"
                >
                  <el-select
                    v-model="form.scoringModel"
                    style="width:100%"
                  >
                    <el-option
                      label="A - 全自动评分"
                      value="A"
                    />
                    <el-option
                      label="B - AI+评委混合"
                      value="B"
                    />
                    <el-option
                      label="C - 纯评委评分"
                      value="C"
                    />
                    <el-option
                      label="D - 对弈引擎"
                      value="D"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="赛事描述">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="4"
                placeholder="赛事描述（支持Markdown）"
              />
            </el-form-item>

            <el-form-item label="赛事规则">
              <el-input
                v-model="form.rules"
                type="textarea"
                :rows="3"
                placeholder="赛事规则（支持Markdown）"
              />
            </el-form-item>

            <el-divider content-position="left">
              报名设置
            </el-divider>

            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="报名费（分）">
                  <el-input-number
                    v-model="form.entryFee"
                    :min="0"
                    :step="100"
                    style="width:100%"
                  />
                  <span class="hint">0=免费报名</span>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="人数上限">
                  <el-input-number
                    v-model="form.maxParticipants"
                    :min="0"
                    style="width:100%"
                  />
                  <span class="hint">0=不限</span>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="最低等级">
                  <el-input-number
                    v-model="form.minLevel"
                    :min="0"
                    style="width:100%"
                  />
                  <span class="hint">0=不限</span>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="邀请制">
                  <el-switch v-model="form.isInviteOnly" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="需实名认证">
                  <el-switch v-model="form.requireIdentity" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-divider content-position="left">
              奖励设置
            </el-divider>

            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item
                  label="奖品类型"
                  prop="prizeType"
                >
                  <el-select
                    v-model="form.prizeType"
                    style="width:100%"
                  >
                    <el-option
                      label="现金奖金"
                      value="CASH"
                    />
                    <el-option
                      label="实物奖品"
                      value="PHYSICAL"
                    />
                    <el-option
                      label="虚拟商品"
                      value="VIRTUAL"
                    />
                    <el-option
                      label="混合（现金+实物/虚拟）"
                      value="MIXED"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="总奖金池">
                  <el-input-number
                    v-model="form.totalPrize"
                    :min="0"
                    :step="100"
                    style="width:100%"
                    :disabled="form.prizeType === 'PHYSICAL' || form.prizeType === 'VIRTUAL'"
                  />
                  <span class="hint">{{ form.totalPrize > 0 ? '= ¥' + (form.totalPrize / 100).toFixed(2) : '0=无现金' }}</span>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="邀请分润（‰）">
                  <el-input-number
                    v-model="form.invitationShare"
                    :min="0"
                    :max="1000"
                    style="width:100%"
                  />
                  <span class="hint">如50=5%</span>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="奖品分配">
              <div class="prize-config">
                <div
                  v-for="(item, idx) in form.prizeConfig"
                  :key="idx"
                  class="prize-row"
                >
                  <el-input
                    v-model="item.rank"
                    placeholder="名次"
                    size="small"
                    style="width:80px"
                  />
                  <el-input
                    v-model="item.title"
                    placeholder="奖项名"
                    size="small"
                    style="width:100px"
                  />
                  <el-select
                    v-model="item.prizeType"
                    size="small"
                    style="width:100px"
                  >
                    <el-option
                      label="现金"
                      value="CASH"
                    />
                    <el-option
                      label="实物"
                      value="PHYSICAL"
                    />
                    <el-option
                      label="虚拟"
                      value="VIRTUAL"
                    />
                  </el-select>
                  <template v-if="item.prizeType === 'CASH' || !item.prizeType">
                    <el-input-number
                      v-model="item.prize"
                      :min="0"
                      :step="100"
                      size="small"
                      style="width:120px"
                      placeholder="金额(分)"
                    />
                    <span class="hint">{{ (item.prize ?? 0) > 0 ? '¥' + ((item.prize ?? 0) / 100).toFixed(0) : '' }}</span>
                  </template>
                  <template v-else>
                    <el-input
                      v-model="item.prizeItem"
                      placeholder="奖品名称"
                      size="small"
                      style="width:120px"
                    />
                  </template>
                  <el-input
                    v-model="item.description"
                    placeholder="描述（可选）"
                    size="small"
                    style="width:140px"
                  />
                  <el-button
                    size="small"
                    type="danger"
                    :icon="Delete"
                    circle
                    @click="form.prizeConfig.splice(idx, 1)"
                  />
                </div>
                <el-button
                  size="small"
                  type="primary"
                  @click="addPrizeRow"
                >
                  + 添加奖项
                </el-button>
                <span
                  class="hint"
                  style="margin-left:12px"
                >设置前几名分别奖励什么，不设则仅展示总奖金池</span>
              </div>
            </el-form-item>

            <el-divider content-position="left">
              其他
            </el-divider>

            <el-form-item label="封面图片">
              <div class="cover-upload">
                <div
                  v-if="form.coverImage"
                  class="cover-preview"
                >
                  <img
                    :src="form.coverImage"
                    alt="封面"
                  >
                  <el-button
                    size="small"
                    type="danger"
                    class="cover-remove"
                    @click="form.coverImage = ''"
                  >
                    移除
                  </el-button>
                </div>
                <div class="cover-input-row">
                  <el-input
                    v-model="coverUrl"
                    placeholder="图片URL"
                    size="small"
                  />
                  <el-button
                    size="small"
                    @click="form.coverImage = coverUrl"
                  >
                    设置
                  </el-button>
                </div>
                <el-upload
                  :show-file-list="false"
                  :http-request="handleCoverUpload"
                  accept="image/*"
                  style="margin-top:8px"
                >
                  <el-button
                    size="small"
                    type="primary"
                    :loading="uploading"
                  >
                    本地上传
                  </el-button>
                </el-upload>
              </div>
            </el-form-item>

            <el-form-item label="标签">
              <el-tag
                v-for="(tag, idx) in form.tags"
                :key="idx"
                closable
                style="margin-right:6px"
                @close="form.tags.splice(idx, 1)"
              >
                {{ tag }}
              </el-tag>
              <el-input
                v-if="tagInputVisible"
                ref="tagInputRef"
                v-model="tagInputValue"
                size="small"
                style="width:100px"
                @keyup.enter="addTag"
                @blur="addTag"
              />
              <el-button
                v-else
                size="small"
                @click="showTagInput"
              >
                + 添加标签
              </el-button>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :loading="saving"
                @click="save"
              >
                {{ isEdit ? '保存修改' : '创建赛事' }}
              </el-button>
              <el-button
                v-if="isEdit"
                type="danger"
                :loading="deleting"
                @click="handleDelete"
              >
                删除赛事
              </el-button>
              <el-button @click="router.back()">
                取消
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <div
        v-if="isEdit"
        class="edit-sidebar"
      >
        <div class="sidebar-section">
          <h4>赛事状态</h4>
          <el-tag
            :type="statusLabels[form.status]?.type || 'info'"
            size="large"
            style="margin-bottom:12px"
          >
            {{ statusLabels[form.status]?.text || form.status }}
          </el-tag>
          <div style="display:flex;flex-direction:column;gap:8px">
            <el-button
              v-if="form.status === 'DRAFT'"
              type="success"
              size="small"
              :loading="statusChanging"
              @click="changeStatus('publish')"
            >
              发布赛事
            </el-button>
            <el-button
              v-if="form.status === 'PUBLISHED'"
              type="warning"
              size="small"
              :loading="statusChanging"
              @click="changeStatus('start')"
            >
              开始赛事
            </el-button>
            <el-button
              v-if="form.status === 'IN_PROGRESS'"
              type="danger"
              size="small"
              :loading="statusChanging"
              @click="changeStatus('finish')"
            >
              结束赛事
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete } from "@element-plus/icons-vue";
import { competitionApi, uploadApi } from "@/api";

const route = useRoute();
const router = useRouter();
const isEdit = ref(!!route.params.id);
const competitionId = route.params.id as string;

const typeLabels: Record<string, string> = {
  BAZI_PREDICT: "八字预测赛", LIUYAO: "六爻断卦赛", QIMEN_DUNJIA: "奇门遁甲赛",
  MEIHUA_YISHU: "梅花易数赛", ZIWEI_DOUSHU: "紫微斗数赛", FENGSHUI: "风水堪舆赛",
  NAME_ANALYSIS: "姓名学赛", POETRY: "诗词大赛", COUPLET: "对联大赛",
  CALLIGRAPHY: "书法大赛", PAINTING: "国画大赛", MUSIC: "民乐/古琴大赛",
  GO_CHESS: "围棋/象棋赛", TEA_CEREMONY: "茶道赛", INCENSE: "香道赛",
  MARTIAL_ARTS: "武术/太极赛", TCM_DIAGNOSIS: "中医辨证赛", CLASSIC_RECITE: "经典诵读赛",
  GEWU_PERCEIVE: "格物感知赛", UNKNOWN_PREDICT: "未知预测赛",
};

const statusLabels: Record<string, { text: string; type: string }> = {
  DRAFT: { text: "草稿", type: "info" },
  PUBLISHED: { text: "已发布", type: "success" },
  IN_PROGRESS: { text: "进行中", type: "warning" },
  FINISHED: { text: "已结束", type: "" },
};

const formRef = ref<any>(null);
const saving = ref(false);
const uploading = ref(false);
const statusChanging = ref(false);
const deleting = ref(false);
const coverUrl = ref("");

const form = reactive({
  title: "",
  type: "BAZI_PREDICT",
  level: "B",
  scoringModel: "A",
  description: "",
  coverImage: "",
  rules: "",
  entryFee: 0,
  maxParticipants: 0,
  isInviteOnly: false,
  requireIdentity: false,
  minLevel: 0,
  totalPrize: 0,
  prizeType: "CASH" as string,
  prizeConfig: [] as { rank: string; title: string; prize?: number; prizeItem?: string; prizeType?: string; description?: string }[],
  invitationShare: 50,
  tags: [] as string[],
  status: "DRAFT" as string,
});

const rules = {
  title: [{ required: true, message: "请输入赛事标题", trigger: "blur" }],
  type: [{ required: true, message: "请选择赛事类型", trigger: "change" }],
};

// 标签输入
const tagInputVisible = ref(false);
const tagInputValue = ref("");
const tagInputRef = ref<any>(null);

function showTagInput() { tagInputVisible.value = true; nextTick(() => tagInputRef.value?.focus?.()); }
function addPrizeRow() {
  form.prizeConfig.push({ rank: "", title: "", prize: 0, prizeItem: "", prizeType: form.prizeType || "CASH", description: "" });
}
function addTag() {
  const val = tagInputValue.value.trim();
  if (val && !form.tags.includes(val)) form.tags.push(val);
  tagInputValue.value = "";
  tagInputVisible.value = false;
}

// 初始化
onMounted(async () => {
  if (isEdit.value) {
    try {
      const { data } = await competitionApi.detail(competitionId);
      Object.assign(form, {
        title: data.title || "",
        type: data.type || "BAZI_PREDICT",
        level: data.level || "B",
        scoringModel: data.scoringModel || "A",
        description: data.description || "",
        coverImage: data.coverImage || "",
        rules: data.rules || "",
        entryFee: Number(data.entryFee) || 0,
        maxParticipants: Number(data.maxParticipants) || 0,
        isInviteOnly: data.isInviteOnly || false,
        requireIdentity: data.requireIdentity || false,
        minLevel: Number(data.minLevel) || 0,
        totalPrize: Number(data.totalPrize) || 0,
        prizeType: data.prizeType || "CASH",
        prizeConfig: Array.isArray(data.prizeConfig) ? [...data.prizeConfig] : [],
        invitationShare: Number(data.invitationShare) || 50,
        tags: data.tags || [],
        status: data.status || "DRAFT",
      });
      coverUrl.value = data.coverImage || "";
    } catch {
      ElMessage.error("加载赛事数据失败");
    }
  }
});

async function save() {
  if (saving.value) return;
  saving.value = true;
  try {
    const payload = {
      ...form,
      entryFee: Number(form.entryFee) || 0,
      maxParticipants: Number(form.maxParticipants) || 0,
      minLevel: Number(form.minLevel) || 0,
      totalPrize: Number(form.totalPrize) || 0,
      invitationShare: Number(form.invitationShare) || 0,
    };
    if (isEdit.value) {
      await competitionApi.update(competitionId, payload);
      ElMessage.success("保存成功");
    } else {
      const { data } = await competitionApi.create(payload);
      ElMessage.success("创建成功");
      router.replace(`/competitions/${data.id}/edit`);
    }
  } catch {
    ElMessage.error("保存失败，请重试");
  } finally {
    saving.value = false;
  }
}

async function handleCoverUpload(options: any) {
  uploading.value = true;
  try {
    const { data } = await uploadApi.image(options.file);
    form.coverImage = data.url;
    coverUrl.value = data.url;
    ElMessage.success("封面上传成功");
  } catch { /* skip */ } finally { uploading.value = false }
}

async function changeStatus(action: string) {
  if (statusChanging.value) return;
  statusChanging.value = true;
  try {
    if (action === "publish") { await competitionApi.publish(competitionId); form.status = "PUBLISHED"; }
    else if (action === "start") { await competitionApi.start(competitionId); form.status = "IN_PROGRESS"; }
    else if (action === "finish") {
      await ElMessageBox.confirm("确定结束该赛事？", "提示", { type: "warning" });
      await competitionApi.finish(competitionId);
      form.status = "FINISHED";
    }
    ElMessage.success("操作成功");
  } catch { /* 取消或接口拦截器已提示 */ } finally { statusChanging.value = false }
}

async function handleDelete() {
  if (deleting.value) return;
  try {
    await ElMessageBox.confirm("确定删除该赛事？仅草稿状态可删除。", "警告", { type: "error", confirmButtonClass: "el-button--danger" });
    deleting.value = true;
    await competitionApi.delete(competitionId);
    ElMessage.success("已删除");
    router.push("/competitions");
  } catch (e) {
    if (e !== "cancel" && e !== "close") ElMessage.error("删除失败");
  } finally {
    deleting.value = false;
  }
}
</script>

<style scoped>
.competition-edit { padding: 16px; }
.edit-body { display: flex; gap: 16px; }
.edit-main { flex: 1; min-width: 0; }
.edit-sidebar { width: 220px; flex-shrink: 0; }
.sidebar-section { margin-bottom: 16px; }
.sidebar-section h4 { margin: 0 0 10px; font-size: 14px; color: var(--color-text-title); border-bottom: 1px solid #f0e6d3; padding-bottom: 6px; }
.hint { margin-left: 8px; color: var(--color-text-secondary); font-size: 12px; }
.cover-upload { margin-top: 4px; }
.cover-preview { position: relative; width: 200px; aspect-ratio: 16/10; border-radius: 4px; overflow: hidden; background: var(--color-bg-page); margin-bottom: 8px; }
.cover-preview img { width: 100%; height: 100%; object-fit: cover; }
.cover-remove { position: absolute; top: 4px; right: 4px; }
.cover-input-row { display: flex; gap: 4px; margin-bottom: 8px; }
.prize-config { width: 100%; }
.prize-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
@media (max-width: 900px) { .edit-body { flex-direction: column; } .edit-sidebar { width: 100%; } }
</style>
