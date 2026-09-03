<script setup lang="ts">
/** 后台运营助手：悬浮按钮 + 抽屉。答疑（页面感知·只指导不代改）+ 反馈问题（落库汇总给管理层）。 */
import { ref, nextTick, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { ChatDotRound, Promotion, Warning } from "@element-plus/icons-vue";
import { adminAssistantApi, uploadApi } from "@/api";

const route = useRoute();
const open = ref(false);
const tab = ref<"chat" | "feedback" | "mine">("chat");

// ── 对话（记录保留：存 localStorage，员工回来还能看到之前的对话） ──
interface Msg { role: "user" | "assistant"; content: string }
const CHAT_KEY = "admin_assistant_chat";
const welcome: Msg = { role: "assistant", content: "你好，我是后台运营助手 👋 有不会操作的、想了解某个功能怎么用的，直接问我。遇到点了没反应/报错这类程序问题，点『反馈这个问题』记录给管理层。" };
function loadChat(): Msg[] {
  try { const s = localStorage.getItem(CHAT_KEY); if (s) { const a = JSON.parse(s); if (Array.isArray(a) && a.length) return a; } } catch { /* ignore */ }
  return [welcome];
}
const messages = ref<Msg[]>(loadChat());
watch(messages, (v) => { try { localStorage.setItem(CHAT_KEY, JSON.stringify(v.slice(-40))); } catch { /* ignore */ } }, { deep: true });
function clearChat() { messages.value = [welcome]; }
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

// 一键反馈：把最近一次问答带进反馈表单（员工确认后提交，确保"说了会反馈就真的记录"）
function reportThis() {
  const lastUser = [...messages.value].reverse().find((m) => m.role === "user");
  const lastAssistant = [...messages.value].reverse().find((m) => m.role === "assistant");
  const q = lastUser?.content || "";
  fb.value.category = "BUG";
  fb.value.title = q.slice(0, 60) || "后台使用中遇到的问题";
  fb.value.detail = `【员工描述】${q}\n【助手判断】${(lastAssistant?.content || "").slice(0, 300)}\n\n（请补充：在哪个页面、做了什么、期望什么、实际什么、有无报错）`;
  tab.value = "feedback";
}

// ── 反馈 ──
const fb = ref<{ category: string; title: string; detail: string; images: string[] }>({ category: "QUESTION", title: "", detail: "", images: [] });
const submitting = ref(false);
// 截图上传（原生 input 触发·规避 el-upload 首次点击问题）
const shotInputRef = ref<HTMLInputElement | null>(null);
const shotUploading = ref(false);
function pickShot() { if (!shotUploading.value && fb.value.images.length < 6) shotInputRef.value?.click(); }
async function onShotFile(e: Event) {
  const inp = e.target as HTMLInputElement; const file = inp.files?.[0]; inp.value = "";
  if (!file) return;
  shotUploading.value = true;
  try { const { data } = await uploadApi.image(file); if (data.url) fb.value.images.push(data.url); }
  catch { ElMessage.error("截图上传失败"); } finally { shotUploading.value = false; }
}
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
    await adminAssistantApi.createFeedback({ page: route.path, category: fb.value.category, title: fb.value.title.trim(), detail: fb.value.detail.trim(), images: fb.value.images });
    ElMessage.success("已提交，感谢反馈！问题会汇总给管理层处理");
    fb.value = { category: "QUESTION", title: "", detail: "", images: [] };
    tab.value = "mine";
    fetchMine();
  } catch {
    ElMessage.error("提交失败，请重试");
  } finally {
    submitting.value = false;
  }
}

// ── 我的反馈（员工看自己提交的问题及处理结果·状态/批复可见·便于复测追问） ──
interface MyFb { id: string; category: string; title: string; detail: string; status: string; reply: string; page: string; createdAt: string; images?: string[] }
const myList = ref<MyFb[]>([]);
const myLoading = ref(false);
const statusMeta: Record<string, { label: string; type: string }> = {
  PENDING: { label: "待处理", type: "info" },
  REVIEWED: { label: "已阅", type: "info" },
  ADOPTED: { label: "已采纳·排期优化", type: "warning" },
  REJECTED: { label: "不采纳", type: "danger" },
  DONE: { label: "已优化·请复测", type: "success" },
};
async function fetchMine() {
  myLoading.value = true;
  try { const { data } = await adminAssistantApi.myFeedback(); myList.value = (data as unknown as MyFb[]) || []; }
  catch { /* ignore */ } finally { myLoading.value = false; }
}
watch(tab, (t) => { if (t === "mine") fetchMine(); });

// 打开时滚到底
watch(open, (v) => { if (v) { scrollBottom(); if (tab.value === "mine") fetchMine(); } });
</script>

<template>
  <div class="assistant-root">
    <!-- 悬浮按钮 -->
    <div
      v-if="!open"
      class="fab"
      @click="open = true"
    >
      <el-icon :size="24">
        <ChatDotRound />
      </el-icon>
      <span class="fab-txt">运营助手</span>
    </div>

    <!-- 抽屉面板 -->
    <div
      v-if="open"
      class="panel"
    >
      <div class="panel-hd">
        <div class="hd-left">
          <el-icon :size="18">
            <ChatDotRound />
          </el-icon>
          <span>后台运营助手</span>
        </div>
        <el-icon
          class="hd-close"
          @click="open = false"
        >
          <i class="close-x">✕</i>
        </el-icon>
      </div>
      <div class="panel-tabs">
        <div
          class="tab"
          :class="{ on: tab === 'chat' }"
          @click="tab = 'chat'"
        >
          答疑指导
        </div>
        <div
          class="tab"
          :class="{ on: tab === 'feedback' }"
          @click="tab = 'feedback'"
        >
          反馈问题
        </div>
        <div
          class="tab"
          :class="{ on: tab === 'mine' }"
          @click="tab = 'mine'"
        >
          我的反馈
        </div>
      </div>

      <!-- 对话 -->
      <template v-if="tab === 'chat'">
        <div class="chat-toolbar">
          <span class="chat-hint">对话已自动保留，方便你回来追问</span>
          <span
            class="chat-clear"
            @click="clearChat"
          >清空对话</span>
        </div>
        <div
          ref="bodyRef"
          class="chat-body"
        >
          <div
            v-for="(m, i) in messages"
            :key="i"
            class="msg"
            :class="m.role"
          >
            <div class="bubble">
              {{ m.content }}
            </div>
          </div>
          <div
            v-if="sending"
            class="msg assistant"
          >
            <div class="bubble typing">
              正在思考…
            </div>
          </div>
        </div>
        <!-- 一键把刚才的问题正式提交给管理层（解决"助手说会反馈其实没反馈"） -->
        <div
          v-if="messages.length > 1"
          class="report-bar"
          @click="reportThis"
        >
          <el-icon><Warning /></el-icon>
          <span>这是程序问题？点这里把它反馈给管理层</span>
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
          <el-button
            type="primary"
            :icon="Promotion"
            :loading="sending"
            @click="send"
          >
            发送
          </el-button>
        </div>
      </template>

      <!-- 反馈 -->
      <template v-else-if="tab === 'feedback'">
        <div class="fb-body">
          <div class="fb-tip">
            <el-icon><Warning /></el-icon> 遇到程序问题（点了没反应/报错/白屏/数据不对）请记录下来，会汇总给管理层，由技术团队处理。
          </div>
          <el-form
            label-position="top"
            size="default"
          >
            <el-form-item label="问题类型">
              <el-select
                v-model="fb.category"
                style="width:100%"
              >
                <el-option
                  v-for="c in categories"
                  :key="c.value"
                  :label="c.label"
                  :value="c.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item
              label="标题（一句话说清）"
              required
            >
              <el-input
                v-model="fb.title"
                maxlength="80"
                placeholder="如：商品编辑页详情图点上传没反应"
              />
            </el-form-item>
            <el-form-item label="详细描述">
              <el-input
                v-model="fb.detail"
                type="textarea"
                :rows="4"
                maxlength="1000"
                placeholder="在哪个页面、做了什么、期望什么、实际发生了什么、有没有报错文字"
              />
            </el-form-item>
            <el-form-item label="截图（可选，截图标注问题更易定位）">
              <input
                ref="shotInputRef"
                type="file"
                accept="image/*"
                style="display:none"
                @change="onShotFile"
              >
              <div class="shot-area">
                <div
                  v-for="(img, i) in fb.images"
                  :key="i"
                  class="shot-thumb"
                >
                  <img :src="img">
                  <span
                    class="shot-del"
                    @click="fb.images.splice(i, 1)"
                  >✕</span>
                </div>
                <div
                  v-if="fb.images.length < 6"
                  class="shot-add"
                  :class="{ 'is-loading': shotUploading }"
                  @click="pickShot"
                >
                  <span>{{ shotUploading ? '上传中' : '+ 截图' }}</span>
                </div>
              </div>
            </el-form-item>
            <div class="fb-page">
              当前页面：{{ route.path }}（会自动附带，便于定位）
            </div>
            <el-button
              type="primary"
              style="width:100%"
              :loading="submitting"
              @click="submitFeedback"
            >
              提交反馈
            </el-button>
          </el-form>
        </div>
      </template>

      <!-- 我的反馈（处理结果·员工可复测追问） -->
      <template v-else>
        <div
          v-loading="myLoading"
          class="mine-body"
        >
          <div
            v-if="myList.length === 0 && !myLoading"
            class="mine-empty"
          >
            你还没有提交过反馈。遇到程序问题可在「反馈问题」里记录，处理结果会显示在这里。
          </div>
          <div
            v-for="f in myList"
            :key="f.id"
            class="mine-card"
          >
            <div class="mine-head">
              <el-tag
                :type="statusMeta[f.status]?.type || 'info'"
                size="small"
              >
                {{ statusMeta[f.status]?.label || f.status }}
              </el-tag>
              <span class="mine-time">{{ String(f.createdAt).slice(0, 16).replace('T', ' ') }}</span>
            </div>
            <div class="mine-title">
              {{ f.title }}
            </div>
            <div
              v-if="f.images && f.images.length"
              class="mine-shots"
            >
              <el-image
                v-for="(img, i) in f.images"
                :key="i"
                :src="img"
                :preview-src-list="f.images"
                :initial-index="i"
                fit="cover"
                class="mine-shot"
              />
            </div>
            <div
              v-if="f.reply"
              class="mine-reply"
            >
              <b>处理批复：</b>{{ f.reply }}
            </div>
            <div
              v-if="f.status === 'DONE'"
              class="mine-retest"
            >
              ✅ 已优化，请到对应页面复测；若仍有问题，欢迎再提一条反馈。
            </div>
          </div>
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
.report-bar { display: flex; align-items: center; gap: 6px; margin: 0 12px; padding: 8px 10px; font-size: 12px; color: #9a6a00; background: #fff8e6; border: 1px solid #ffe4a0; border-radius: 8px; cursor: pointer; }
.report-bar:hover { background: #fff2cc; }
.chat-input { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee; align-items: flex-end; }
.fb-body { flex: 1; overflow-y: auto; padding: 16px; }
.fb-tip { display: flex; gap: 6px; align-items: flex-start; font-size: 12px; color: #9a6a00; background: #fff8e6; border: 1px solid #ffe4a0; border-radius: 8px; padding: 10px; margin-bottom: 14px; line-height: 1.5; }
.fb-page { font-size: 12px; color: #999; margin: 4px 0 12px; }
.chat-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #f0f0f0; }
.chat-hint { font-size: 11px; color: #bbb; }
.chat-clear { font-size: 12px; color: #c41e3a; cursor: pointer; }
.mine-body { flex: 1; overflow-y: auto; padding: 14px; }
.mine-empty { font-size: 13px; color: #999; text-align: center; padding: 40px 20px; line-height: 1.6; }
.mine-card { background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
.mine-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.mine-time { font-size: 11px; color: #aaa; }
.mine-title { font-size: 14px; font-weight: 600; color: #333; line-height: 1.5; }
.mine-reply { font-size: 13px; color: #555; margin-top: 8px; background: #faf9f7; border-radius: 6px; padding: 8px; line-height: 1.5; }
.mine-retest { font-size: 12px; color: #52c41a; margin-top: 8px; }
.shot-area { display: flex; flex-wrap: wrap; gap: 8px; }
.shot-thumb { position: relative; width: 64px; height: 64px; }
.shot-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; border: 1px solid #eee; }
.shot-del { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 50%; background: #c41e3a; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.shot-add { width: 64px; height: 64px; border: 1px dashed #c0c4cc; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #909399; cursor: pointer; }
.shot-add:hover { border-color: #c41e3a; color: #c41e3a; }
.shot-add.is-loading { opacity: .6; cursor: not-allowed; }
.mine-shots { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.mine-shot { width: 54px; height: 54px; border-radius: 6px; border: 1px solid #eee; cursor: pointer; }
</style>
