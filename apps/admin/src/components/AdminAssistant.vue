<script setup lang="ts">
/** 后台运营助手：悬浮按钮 + 抽屉。答疑（页面感知·只指导不代改）+ 反馈问题（落库汇总给管理层）。 */
import { ref, nextTick, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { ChatDotRound, Promotion, Warning } from "@element-plus/icons-vue";
import { adminAssistantApi } from "@/api";

const route = useRoute();
const open = ref(false);
const tab = ref<"chat" | "feedback">("chat");

// ── 对话 ──
interface Msg { role: "user" | "assistant"; content: string }
const messages = ref<Msg[]>([
  { role: "assistant", content: "你好，我是后台运营助手 👋 有不会操作的、想了解某个功能怎么用的，直接问我。遇到点了没反应/报错这类程序问题，我会帮你记录反馈给技术团队。" },
]);
const input = ref("");
const sending = ref(false);
const bodyRef = ref<HTMLElement | null>(null);

async function scrollBottom() {
  await nextTick();
  if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight;
}

async function send() {
  const text = input.value.trim();
  if (!text || sending.value) return;
  messages.value.push({ role: "user", content: text });
  input.value = "";
  sending.value = true;
  await scrollBottom();
  try {
    const history = messages.value.slice(-7, -1).map((m) => ({ role: m.role, content: m.content }));
    const { data } = await adminAssistantApi.chat({ message: text, page: route.path, history });
    messages.value.push({ role: "assistant", content: data?.answer || "（无回复）" });
  } catch {
    messages.value.push({ role: "assistant", content: "助手服务暂时不可用，可切到「反馈问题」把问题记录下来。" });
  } finally {
    sending.value = false;
    await scrollBottom();
  }
}

// ── 反馈 ──
const fb = ref({ category: "QUESTION", title: "", detail: "" });
const submitting = ref(false);
const categories = [
  { value: "BUG", label: "程序问题/报错" },
  { value: "OPTIMIZE", label: "优化建议" },
  { value: "QUESTION", label: "操作疑问" },
  { value: "OTHER", label: "其他" },
];
async function submitFeedback() {
  if (!fb.value.title.trim()) { ElMessage.warning("请填写问题标题"); return; }
  if (submitting.value) return;
  submitting.value = true;
  try {
    await adminAssistantApi.createFeedback({ page: route.path, category: fb.value.category, title: fb.value.title.trim(), detail: fb.value.detail.trim() });
    ElMessage.success("已提交，感谢反馈！问题会汇总给管理层处理");
    fb.value = { category: "QUESTION", title: "", detail: "" };
    tab.value = "chat";
  } catch {
    ElMessage.error("提交失败，请重试");
  } finally {
    submitting.value = false;
  }
}

// 打开时滚到底
watch(open, (v) => { if (v) scrollBottom(); });
</script>

<template>
  <div class="assistant-root">
    <!-- 悬浮按钮 -->
    <div v-if="!open" class="fab" @click="open = true">
      <el-icon :size="24"><ChatDotRound /></el-icon>
      <span class="fab-txt">运营助手</span>
    </div>

    <!-- 抽屉面板 -->
    <div v-if="open" class="panel">
      <div class="panel-hd">
        <div class="hd-left">
          <el-icon :size="18"><ChatDotRound /></el-icon>
          <span>后台运营助手</span>
        </div>
        <el-icon class="hd-close" @click="open = false"><i class="close-x">✕</i></el-icon>
      </div>
      <div class="panel-tabs">
        <div class="tab" :class="{ on: tab === 'chat' }" @click="tab = 'chat'">答疑指导</div>
        <div class="tab" :class="{ on: tab === 'feedback' }" @click="tab = 'feedback'">反馈问题</div>
      </div>

      <!-- 对话 -->
      <template v-if="tab === 'chat'">
        <div ref="bodyRef" class="chat-body">
          <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
            <div class="bubble">{{ m.content }}</div>
          </div>
          <div v-if="sending" class="msg assistant"><div class="bubble typing">正在思考…</div></div>
        </div>
        <div class="chat-input">
          <el-input
            v-model="input"
            type="textarea"
            :rows="2"
            resize="none"
            placeholder="问我怎么操作，或某功能怎么用…"
            @keyup.enter.exact.prevent="send"
          />
          <el-button type="primary" :icon="Promotion" :loading="sending" @click="send">发送</el-button>
        </div>
      </template>

      <!-- 反馈 -->
      <template v-else>
        <div class="fb-body">
          <div class="fb-tip"><el-icon><Warning /></el-icon> 遇到程序问题（点了没反应/报错/白屏/数据不对）请记录下来，会汇总给管理层，由技术团队处理。</div>
          <el-form label-position="top" size="default">
            <el-form-item label="问题类型">
              <el-select v-model="fb.category" style="width:100%">
                <el-option v-for="c in categories" :key="c.value" :label="c.label" :value="c.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="标题（一句话说清）" required>
              <el-input v-model="fb.title" maxlength="80" placeholder="如：商品编辑页详情图点上传没反应" />
            </el-form-item>
            <el-form-item label="详细描述">
              <el-input v-model="fb.detail" type="textarea" :rows="4" maxlength="1000" placeholder="在哪个页面、做了什么、期望什么、实际发生了什么、有没有报错文字" />
            </el-form-item>
            <div class="fb-page">当前页面：{{ route.path }}（会自动附带，便于定位）</div>
            <el-button type="primary" style="width:100%" :loading="submitting" @click="submitFeedback">提交反馈</el-button>
          </el-form>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.assistant-root { position: fixed; right: 24px; bottom: 24px; z-index: 3000; }
.fab { display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 999px; background: linear-gradient(135deg, #c41e3a, #a01530); color: #fff; cursor: pointer; box-shadow: 0 6px 20px rgba(196,30,58,.35); transition: transform .15s; }
.fab:hover { transform: translateY(-2px); }
.fab-txt { font-size: 14px; font-weight: 600; }
.panel { width: 400px; height: 560px; max-height: 78vh; display: flex; flex-direction: column; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,.22); }
.panel-hd { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: linear-gradient(135deg, #c41e3a, #a01530); color: #fff; }
.hd-left { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.hd-close { cursor: pointer; }
.close-x { font-style: normal; font-size: 16px; }
.panel-tabs { display: flex; border-bottom: 1px solid #eee; }
.tab { flex: 1; text-align: center; padding: 10px; font-size: 14px; color: #666; cursor: pointer; }
.tab.on { color: #c41e3a; font-weight: 600; box-shadow: inset 0 -2px 0 #c41e3a; }
.chat-body { flex: 1; overflow-y: auto; padding: 16px; background: #faf9f7; }
.msg { display: flex; margin-bottom: 12px; }
.msg.user { justify-content: flex-end; }
.bubble { max-width: 80%; padding: 10px 12px; border-radius: 10px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.msg.assistant .bubble { background: #fff; color: #333; border: 1px solid #eee; }
.msg.user .bubble { background: #c41e3a; color: #fff; }
.typing { color: #999; }
.chat-input { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee; align-items: flex-end; }
.fb-body { flex: 1; overflow-y: auto; padding: 16px; }
.fb-tip { display: flex; gap: 6px; align-items: flex-start; font-size: 12px; color: #9a6a00; background: #fff8e6; border: 1px solid #ffe4a0; border-radius: 8px; padding: 10px; margin-bottom: 14px; line-height: 1.5; }
.fb-page { font-size: 12px; color: #999; margin: 4px 0 12px; }
</style>
