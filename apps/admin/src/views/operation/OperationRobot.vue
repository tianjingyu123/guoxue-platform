<template>
  <div class="operation-robot">
    <div class="page-header">
      <h2>运营机器人管理</h2>
      <div>
        <el-button
          type="primary"
          :loading="initializing"
          @click="doInit"
        >
          重新初始化
        </el-button>
        <el-button @click="fetchStatus">
          刷新
        </el-button>
      </div>
    </div>

    <p class="desc">
      虚拟运营机器人用于自动化社区互动维护，包括内容点赞、评论互动、圈子签到、付费提问等。请根据需要管理各机器人的开关状态。
    </p>

    <!-- 机器人卡片 -->
    <el-row :gutter="16">
      <el-col
        v-for="bot in bots"
        :key="bot.role"
        :span="6"
      >
        <el-card
          class="bot-card"
          :class="{ disabled: !bot.enabled }"
        >
          <template #header>
            <div class="bot-header">
              <span class="bot-icon">{{ ROLE_ICONS[bot.role] || '🤖' }}</span>
              <span class="bot-name">{{ bot.name }}</span>
            </div>
          </template>

          <div class="bot-body">
            <div class="bot-role-tag">
              {{ ROLE_LABELS[bot.role] || bot.role }}
            </div>
            <div class="bot-desc">
              {{ bot.description }}
            </div>

            <el-divider />

            <div class="bot-status">
              <span class="label">当前状态：</span>
              <el-tag :type="bot.enabled ? 'success' : 'info'">
                {{ bot.enabled ? '运行中' : '已关闭' }}
              </el-tag>
            </div>

            <div class="bot-status">
              <span class="label">执行频率：</span>
              <el-tag size="small">
                {{ FREQ_MAP[bot.frequency] || bot.frequency }}
              </el-tag>
            </div>

            <div class="bot-status">
              <span class="label">角色标识：</span>
              <code>{{ bot.role }}</code>
            </div>

            <el-divider />

            <el-switch
              v-model="bot.enabled"
              :active-text="bot.enabled ? '开启' : '关闭'"
              :loading="toggling === bot.role"
              @change="(val: boolean) => toggleBot(bot, val)"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 使用说明 -->
    <el-card class="usage-card">
      <template #header>
        <h3>📖 机器人机制说明</h3>
      </template>
      <el-table
        :data="mechanismData"
        size="small"
      >
        <el-table-column
          prop="role"
          label="机器人"
          width="160"
        >
          <template #default="{ row }">
            {{ ROLE_ICONS[row.role] }} {{ row.name }}
          </template>
        </el-table-column>
        <el-table-column
          prop="trigger"
          label="触发条件"
          min-width="250"
        />
        <el-table-column
          prop="action"
          label="执行动作"
          min-width="200"
        />
        <el-table-column
          prop="impact"
          label="影响范围"
          width="180"
        />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/api";

const ROLE_ICONS: Record<string, string> = {
  like_bot: "👍",
  comment_bot: "💬",
  signin_bot: "📝",
  question_bot: "❓",
};

const ROLE_LABELS: Record<string, string> = {
  like_bot: "内容点赞助手",
  comment_bot: "评论互动助手",
  signin_bot: "圈子签到助手",
  question_bot: "问题提问助手",
};

const FREQ_MAP: Record<string, string> = {
  low: "低频",
  medium: "中频",
  high: "高频",
};

interface Bot {
  role: string;
  name: string;
  enabled: boolean;
  frequency: string;
  description: string;
}

const bots = ref<Bot[]>([]);
const toggling = ref("");
const initializing = ref(false);

const mechanismData = [
  { role: "like_bot", name: "内容点赞助手", trigger: "每小时检查最近2小时发布、点赞≤2的内容", action: "随机增加1-3个点赞", impact: "新发布的冷门内容" },
  { role: "comment_bot", name: "评论互动助手", trigger: "每2小时检查点赞≥5但评论少的24h内内容", action: "AI生成50字以内的互动评论", impact: "热门但缺评论的内容" },
  { role: "signin_bot", name: "圈子签到助手", trigger: "每12小时检查24h内无新帖的圈子", action: "随机发布国学话题帖", impact: "低活跃度圈子" },
  { role: "question_bot", name: "问题提问助手", trigger: "每日10点检查已开通付费问答的圈子", action: "AI生成专业问题并提交（按定价付费）", impact: "付费问答功能" },
];

async function fetchStatus() {
  try {
    const { data } = await api.get("/operation-robots");
    bots.value = (data as Bot[]) || [];
    // 补充描述信息
    for (const bot of bots.value) {
      if (!bot.description) {
        bot.description = ROLE_LABELS[bot.role] || bot.role;
      }
    }
  } catch { /* ignore */ }
}

async function toggleBot(bot: Bot, enabled: boolean) {
  toggling.value = bot.role;
  try {
    const { data } = await api.post(`/operation-robots/${bot.role}/toggle`, { enabled });
    ElMessage.success(`「${bot.name}」已${(data as any)?.enabled ? "开启" : "关闭"}`);
  } catch {
    // 回滚开关
    bot.enabled = !enabled;
  } finally {
    toggling.value = "";
  }
}

async function doInit() {
  initializing.value = true;
  try {
    const { data } = await api.post("/operation-robots/init");
    ElMessage.success((data as any)?.message || "机器人系统已初始化");
    await fetchStatus();
  } finally {
    initializing.value = false;
  }
}

onMounted(() => fetchStatus());
</script>

<style scoped>
.operation-robot { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.page-header h2 { margin: 0; font-size: 20px; }
.desc { color: #909399; font-size: 13px; margin-bottom: 16px; }

.bot-card { margin-bottom: 16px; transition: opacity .3s; }
.bot-card.disabled { opacity: 0.5; }
.bot-header { display: flex; align-items: center; gap: 8px; }
.bot-icon { font-size: 24px; }
.bot-name { font-size: 16px; font-weight: 600; }

.bot-body { font-size: 13px; }
.bot-role-tag { color: #409eff; margin-bottom: 6px; }
.bot-desc { color: #606266; margin-bottom: 4px; line-height: 1.5; }
.bot-status { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.bot-status .label { color: #909399; width: 70px; flex-shrink: 0; }
.bot-status code { background: #f5f7fa; padding: 2px 6px; border-radius: 4px; font-size: 12px; }

.usage-card { margin-top: 24px; }
</style>
