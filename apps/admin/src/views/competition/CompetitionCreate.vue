<template>
  <div class="competition-create">
    <el-page-header
      title="返回"
      style="margin-bottom:16px"
      @back="router.push('/competitions')"
    >
      <template #content>
        新建赛事（创建向导）
      </template>
    </el-page-header>

    <el-card>
      <el-steps
        :active="step"
        finish-status="success"
        align-center
        style="margin-bottom:28px"
      >
        <el-step title="基本信息" />
        <el-step title="阶段配置" />
        <el-step title="评审团" />
        <el-step title="奖品与承诺" />
      </el-steps>

      <!-- ═══════ 第1步 基本信息 ═══════ -->
      <el-form
        v-show="step === 0"
        ref="basicFormRef"
        :model="form"
        :rules="basicRules"
        label-width="110px"
      >
        <el-form-item
          label="赛事标题"
          prop="title"
        >
          <el-input
            v-model="form.title"
            placeholder="如：首届经学杯·论语知识大赛"
            maxlength="50"
            show-word-limit
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
            <el-form-item label="赛事级别">
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
            <el-form-item label="赛制">
              <el-select
                v-model="form.format"
                style="width:100%"
              >
                <el-option
                  label="QUIZ - 答题赛"
                  value="QUIZ"
                />
                <el-option
                  label="LIVE_PK - 直播PK赛"
                  value="LIVE_PK"
                />
                <el-option
                  label="HYBRID - 混合（答题+直播PK）"
                  value="HYBRID"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="评分模型">
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
          <el-col :span="8">
            <el-form-item label="报名费（元）">
              <el-input-number
                v-model="form.entryFee"
                :min="0"
                :step="1"
                :precision="2"
                style="width:100%"
              />
              <span class="hint">0=免费报名，提交时自动按分存储</span>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="人数上限">
              <el-input-number
                v-model="form.maxParticipants"
                :min="0"
                style="width:100%"
              />
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
      </el-form>

      <!-- ═══════ 第2步 阶段配置 ═══════ -->
      <div v-show="step === 1">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom:16px"
        >
          阶段时间须递增不重叠；除最后阶段外每阶段必须配置晋级规则。创建后将按此配置自动生成赛程阶段。
        </el-alert>

        <div
          v-for="(stage, idx) in form.stagesConfig"
          :key="idx"
          class="stage-card"
        >
          <div class="stage-head">
            <el-tag type="warning">
              阶段 {{ idx + 1 }}
            </el-tag>
            <el-button
              size="small"
              type="danger"
              :icon="Delete"
              circle
              :disabled="form.stagesConfig.length <= 1"
              @click="form.stagesConfig.splice(idx, 1)"
            />
          </div>
          <el-row :gutter="12">
            <el-col :span="8">
              <div class="field-label">
                阶段名称
              </div>
              <el-input
                v-model="stage.name"
                placeholder="如：海选·答题"
                size="default"
              />
            </el-col>
            <el-col :span="4">
              <div class="field-label">
                阶段赛制
              </div>
              <el-select
                v-model="stage.format"
                style="width:100%"
              >
                <el-option
                  label="答题"
                  value="QUIZ"
                />
                <el-option
                  label="直播PK"
                  value="LIVE_PK"
                />
              </el-select>
            </el-col>
            <el-col :span="6">
              <div class="field-label">
                开始时间
              </div>
              <el-date-picker
                v-model="stage.startAt"
                type="datetime"
                placeholder="开始时间"
                style="width:100%"
                value-format="YYYY-MM-DDTHH:mm:ss"
              />
            </el-col>
            <el-col :span="6">
              <div class="field-label">
                结束时间
              </div>
              <el-date-picker
                v-model="stage.endAt"
                type="datetime"
                placeholder="结束时间"
                style="width:100%"
                value-format="YYYY-MM-DDTHH:mm:ss"
              />
            </el-col>
          </el-row>
          <el-row
            v-if="idx < form.stagesConfig.length - 1"
            :gutter="12"
            style="margin-top:10px"
          >
            <el-col :span="4">
              <div class="field-label">
                晋级方式
              </div>
              <el-select
                v-model="stage.advanceType"
                style="width:100%"
              >
                <el-option
                  label="按人数"
                  value="count"
                />
                <el-option
                  label="按比例"
                  value="percent"
                />
              </el-select>
            </el-col>
            <el-col :span="6">
              <div class="field-label">
                {{ stage.advanceType === 'percent' ? '晋级比例（%）' : '晋级人数' }}
              </div>
              <el-input-number
                v-model="stage.advanceValue"
                :min="1"
                :max="stage.advanceType === 'percent' ? 100 : 100000"
                style="width:100%"
              />
            </el-col>
          </el-row>
          <div
            v-else
            class="hint"
            style="margin-top:10px"
          >
            最后阶段（决出最终名次，无需晋级规则）
          </div>
        </div>

        <el-button
          type="primary"
          plain
          style="width:100%"
          @click="addStage"
        >
          + 添加阶段
        </el-button>
      </div>

      <!-- ═══════ 第3步 评审团 ═══════ -->
      <div v-show="step === 2">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom:16px"
        >
          评审团用于直播评审阶段的多维打分（可留空，纯答题赛无需评审团）。观众票权重决定最终排名中观众投票的占比。
        </el-alert>

        <el-form label-width="110px">
          <el-form-item label="观众票权重">
            <el-slider
              v-model="form.voteWeight"
              :min="0"
              :max="0.3"
              :step="0.05"
              show-stops
              :format-tooltip="(v: number) => (v * 100).toFixed(0) + '%'"
              style="width:320px"
            />
            <span class="hint">当前 {{ (form.voteWeight * 100).toFixed(0) }}%（评审 {{ (100 - form.voteWeight * 100).toFixed(0) }}%）</span>
          </el-form-item>
        </el-form>

        <div
          v-for="(judge, idx) in form.judgePanel"
          :key="idx"
          class="judge-row"
        >
          <el-tooltip
            content="填写平台用户ID：到「用户管理」搜索该评委的账号，复制用户ID粘贴到此处"
            placement="top"
          >
            <el-input
              v-model="judge.userId"
              placeholder="评委用户ID（从用户管理复制）"
              style="width:260px"
            />
          </el-tooltip>
          <el-input
            v-model="judge.title"
            placeholder="头衔（如：特邀评审）"
            style="width:200px"
          />
          <el-input-number
            v-model="judge.weight"
            :min="0"
            :max="10"
            :step="0.1"
            placeholder="权重"
            style="width:140px"
          />
          <el-button
            size="small"
            type="danger"
            :icon="Delete"
            circle
            @click="form.judgePanel.splice(idx, 1)"
          />
        </div>
        <el-button
          type="primary"
          plain
          @click="form.judgePanel.push({ userId: '', title: '', weight: 1 })"
        >
          + 添加评委
        </el-button>
      </div>

      <!-- ═══════ 第4步 奖品与承诺 ═══════ -->
      <div v-show="step === 3">
        <el-form label-width="130px">
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="奖品类型">
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
                    label="混合"
                    value="MIXED"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="总奖金池（元）">
                <el-input-number
                  v-model="form.totalPrize"
                  :min="0"
                  :step="100"
                  :precision="2"
                  style="width:100%"
                />
                <span class="hint">{{ form.totalPrize > 0 ? '= ¥' + form.totalPrize.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0=无现金奖池' }}</span>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="奖品明细">
            <div style="width:100%">
              <div
                v-for="(prize, idx) in form.prizes"
                :key="idx"
                class="prize-row"
              >
                <el-input
                  v-model="prize.rank"
                  placeholder="名次（如 1 / 4-10）"
                  style="width:130px"
                />
                <el-input
                  v-model="prize.title"
                  placeholder="奖项名（如 冠军）"
                  style="width:140px"
                />
                <el-input-number
                  v-model="prize.prize"
                  :min="0"
                  :step="100"
                  :precision="2"
                  placeholder="奖金(元)"
                  style="width:140px"
                />
                <el-input
                  v-model="prize.description"
                  placeholder="描述（可选）"
                  style="width:200px"
                />
                <el-button
                  size="small"
                  type="danger"
                  :icon="Delete"
                  circle
                  @click="form.prizes.splice(idx, 1)"
                />
              </div>
              <el-button
                size="small"
                type="primary"
                plain
                @click="form.prizes.push({ rank: '', title: '', prize: 0, description: '' })"
              >
                + 添加奖项
              </el-button>
            </div>
          </el-form-item>

          <el-divider content-position="left">
            赛后分享承诺
          </el-divider>

          <el-form-item label="报名必选承诺">
            <el-switch v-model="form.shareCommitmentRequired" />
            <span class="hint">开启后，选手报名时必须勾选《赛后分享承诺》：获奖后参与经验分享直播/案例复盘</span>
          </el-form-item>
        </el-form>

        <el-descriptions
          title="创建预览"
          :column="2"
          border
          style="margin-top:8px"
        >
          <el-descriptions-item label="赛事标题">
            {{ form.title || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="类型/级别/赛制">
            {{ typeLabels[form.type] || form.type }} / {{ form.level }}级 / {{ form.format }}
          </el-descriptions-item>
          <el-descriptions-item label="阶段数">
            {{ form.stagesConfig.length }} 个阶段
          </el-descriptions-item>
          <el-descriptions-item label="评审团">
            {{ form.judgePanel.length ? form.judgePanel.length + ' 位评委·观众票 ' + (form.voteWeight * 100).toFixed(0) + '%' : '无（纯自动判分）' }}
          </el-descriptions-item>
          <el-descriptions-item label="奖品">
            {{ form.prizes.length ? form.prizes.length + ' 档奖项' : '仅总奖池展示' }}
          </el-descriptions-item>
          <el-descriptions-item label="分享承诺">
            {{ form.shareCommitmentRequired ? '报名必选' : '自愿' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- ═══════ 底部导航 ═══════ -->
      <div class="wizard-footer">
        <el-button
          v-if="step > 0"
          @click="step--"
        >
          上一步
        </el-button>
        <el-button
          v-if="step < 3"
          type="primary"
          @click="nextStep"
        >
          下一步
        </el-button>
        <el-button
          v-if="step === 3"
          type="primary"
          :loading="submitting"
          @click="submit"
        >
          创建赛事并生成阶段
        </el-button>
        <el-button @click="router.push('/competitions')">
          取消
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Delete } from "@element-plus/icons-vue";
import { competitionApi } from "@/api";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";

const router = useRouter();

const typeLabels: Record<string, string> = {
  BAZI_PREDICT: "八字预测赛", LIUYAO: "六爻断卦赛", QIMEN_DUNJIA: "奇门遁甲赛",
  MEIHUA_YISHU: "梅花易数赛", ZIWEI_DOUSHU: "紫微斗数赛", FENGSHUI: "风水堪舆赛",
  NAME_ANALYSIS: "姓名学赛", POETRY: "诗词大赛", COUPLET: "对联大赛",
  CALLIGRAPHY: "书法大赛", PAINTING: "国画大赛", MUSIC: "民乐/古琴大赛",
  GO_CHESS: "围棋/象棋赛", TEA_CEREMONY: "茶道赛", INCENSE: "香道赛",
  MARTIAL_ARTS: "武术/太极赛", TCM_DIAGNOSIS: "中医辨证赛", CLASSIC_RECITE: "经典诵读赛",
  GEWU_PERCEIVE: "格物感知赛", UNKNOWN_PREDICT: "未知预测赛",
};

interface StageForm {
  name: string;
  format: string;
  startAt: string;
  endAt: string;
  advanceType: "count" | "percent";
  advanceValue: number;
}

const step = ref(0);
const submitting = ref(false);
const basicFormRef = ref<any>(null); // el-form 实例引用，保留 any

const form = reactive({
  title: "",
  type: "POETRY",
  level: "B",
  scoringModel: "A",
  format: "QUIZ",
  description: "",
  rules: "",
  entryFee: 0,
  maxParticipants: 0,
  stagesConfig: [
    { name: "海选·答题", format: "QUIZ", startAt: "", endAt: "", advanceType: "count", advanceValue: 10 },
    { name: "决赛", format: "QUIZ", startAt: "", endAt: "", advanceType: "count", advanceValue: 3 },
  ] as StageForm[],
  judgePanel: [] as { userId: string; title: string; weight: number }[],
  voteWeight: 0.2,
  prizeType: "CASH",
  totalPrize: 0,
  prizes: [] as { rank: string; title: string; prize: number; description: string }[],
  shareCommitmentRequired: false,
});
const { captureBaseline } = useUnsavedChanges(
  () => form,
  { message: "赛事创建向导中还有未提交的配置，离开后将丢失。确定离开？" },
);

const basicRules = {
  title: [{ required: true, message: "请输入赛事标题", trigger: "blur" }],
  type: [{ required: true, message: "请选择赛事类型", trigger: "change" }],
};

function addStage() {
  form.stagesConfig.push({
    name: "", format: "QUIZ", startAt: "", endAt: "", advanceType: "count", advanceValue: 10,
  });
}

/** 阶段配置本地校验（与后端 validateStagesConfig 同规则） */
function validateStages(): string | null {
  const stages = form.stagesConfig;
  if (stages.length === 0) return "至少配置一个阶段";
  let prevEnd = 0;
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    const label = `阶段${i + 1}`;
    if (!s.name.trim()) return `${label}：名称必填`;
    if (!s.startAt || !s.endAt) return `${label}：起止时间必填`;
    const start = new Date(s.startAt).getTime();
    const end = new Date(s.endAt).getTime();
    if (start >= end) return `${label}：开始时间必须早于结束时间`;
    if (prevEnd && start < prevEnd) return `${label}：与上一阶段时间重叠（须递增不重叠）`;
    prevEnd = end;
    const isLast = i === stages.length - 1;
    if (!isLast) {
      if (!s.advanceValue || s.advanceValue < 1) return `${label}：晋级${s.advanceType === "percent" ? "比例" : "人数"}必须大于 0`;
      if (s.advanceType === "percent" && s.advanceValue > 100) return `${label}：晋级比例不能超过 100%`;
    }
  }
  return null;
}

/** 评审团本地校验 */
function validateJudges(): string | null {
  const seen = new Set<string>();
  for (let i = 0; i < form.judgePanel.length; i++) {
    const j = form.judgePanel[i];
    if (!j.userId.trim()) return `评委${i + 1}：用户ID必填`;
    if (seen.has(j.userId.trim())) return `评委${i + 1}：用户ID重复`;
    seen.add(j.userId.trim());
  }
  return null;
}

async function nextStep() {
  if (step.value === 0) {
    const valid = await basicFormRef.value?.validate?.().catch(() => false);
    if (!valid) return;
  }
  if (step.value === 1) {
    const err = validateStages();
    if (err) { ElMessage.warning(err); return; }
  }
  if (step.value === 2) {
    const err = validateJudges();
    if (err) { ElMessage.warning(err); return; }
  }
  step.value++;
}

async function submit() {
  if (submitting.value) return;
  const stageErr = validateStages();
  if (stageErr) { ElMessage.warning(stageErr); step.value = 1; return; }
  const judgeErr = validateJudges();
  if (judgeErr) { ElMessage.warning(judgeErr); step.value = 2; return; }

  submitting.value = true;
  try {
    const payload: Record<string, unknown> = {
      title: form.title,
      type: form.type,
      level: form.level,
      scoringModel: form.scoringModel,
      format: form.format,
      description: form.description || undefined,
      rules: form.rules || undefined,
      // 表单以「元」输入，后端字段以「分」存储（prisma entryFee/totalPrize 注释已核实）：提交时 ×100
      entryFee: Math.round((Number(form.entryFee) || 0) * 100),
      maxParticipants: Number(form.maxParticipants) || 0,
      voteWeight: form.voteWeight,
      shareCommitmentRequired: form.shareCommitmentRequired,
      prizeType: form.prizeType,
      totalPrize: Math.round((Number(form.totalPrize) || 0) * 100),
      stagesConfig: form.stagesConfig.map((s, i) => ({
        seq: i + 1,
        name: s.name.trim(),
        format: s.format,
        startAt: new Date(s.startAt).toISOString(),
        endAt: new Date(s.endAt).toISOString(),
        ...(i < form.stagesConfig.length - 1
          ? { advanceRule: { type: s.advanceType, value: s.advanceValue } }
          : {}),
      })),
      ...(form.judgePanel.length > 0
        ? { judgePanel: form.judgePanel.map((j) => ({ userId: j.userId.trim(), title: j.title.trim(), weight: j.weight })) }
        : {}),
      ...(form.prizes.length > 0
        ? { prizes: form.prizes.map((p) => ({ ...p, prize: Math.round((Number(p.prize) || 0) * 100) })) }
        : {}),
    };

    const { data } = await competitionApi.create(payload);
    // 按 stagesConfig 生成 CompetitionStage 行（幂等）
    await competitionApi.generateStages(data.id);
    ElMessage.success("赛事创建成功，阶段已生成");
    captureBaseline();
    router.replace(`/competitions/${data.id}`);
  } catch {
    ElMessage.error("创建失败，请检查配置后重试");
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.competition-create { padding: 16px; }
.hint { margin-left: 8px; color: var(--color-text-secondary); font-size: 12px; }
.stage-card { border: 1px solid #f0e6d3; border-radius: 6px; padding: 14px; margin-bottom: 12px; background: var(--color-bg-page, #fafafa); }
.stage-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.field-label { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.judge-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.prize-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.wizard-footer { display: flex; justify-content: center; gap: 12px; margin-top: 28px; padding-top: 16px; border-top: 1px solid #f0e6d3; }
</style>
