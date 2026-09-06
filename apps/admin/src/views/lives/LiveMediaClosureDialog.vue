<template>
  <el-dialog :model-value="modelValue" title="媒体资源核验" width="min(680px, calc(100vw - 32px))"
    @update:model-value="emit('update:modelValue', $event)">
    <p class="closure-room">{{ roomTitle || '当前直播间' }}</p>
    <div v-if="loading" v-loading="true" class="closure-loading" aria-live="polite">正在读取最新核验状态…</div>
    <el-result v-else-if="failed" icon="error" title="未能读取核验状态" sub-title="请检查网络或管理员权限。未读取到的数据不会显示为已完成。">
      <template #extra><el-button @click="load">重新查询</el-button></template>
    </el-result>
    <template v-else-if="data">
      <el-alert :type="data.outcome.reason === 'COMPLETED' ? 'success' : 'warning'" :closable="false"
        :title="data.outcome.title" :description="data.outcome.nextStep" show-icon />
      <dl class="closure-facts">
        <div><dt>资源额度</dt><dd>{{ quotaText[data.quotaState || ''] || '无记录，需核对' }}</dd></div>
        <div><dt>媒体连接证据</dt><dd>{{ mediaText[data.mediaState] || '待核验' }}</dd></div>
        <div><dt>供应商范围证明</dt><dd>{{ data.scopeVerified ? '当前有效' : '尚未核验或已过期' }}</dd></div>
        <div><dt>本次读取时间</dt><dd>{{ time(data.checkedAt) }}</dd></div>
      </dl>
      <h3>各媒体通道</h3>
      <el-empty v-if="!data.providers.length" description="没有可信停流记录，请运维核对历史房间，不能直接判为已收尾。" :image-size="56" />
      <section v-for="provider in data.providers" :key="provider.provider" class="closure-provider">
        <h4>{{ provider.provider === 'CSS' ? '直播推流' : '实时音视频' }}</h4>
        <dl class="closure-facts">
          <div><dt>停流处理</dt><dd>{{ stopText[provider.state] || '待核验' }}</dd></div>
          <div><dt>最新状态查询</dt><dd>{{ queryText[provider.queryState || ''] || '尚未查询' }}</dd></div>
          <div><dt>提出停流</dt><dd>{{ time(provider.requestedAt) }}</dd></div>
          <div><dt>最近查询</dt><dd>{{ time(provider.checkedAt) }}</dd></div>
          <div><dt>完成收尾</dt><dd>{{ time(provider.completedAt) }}</dd></div>
        </dl>
      </section>
      <p class="closure-note">当前节点后台任务：{{ workerText[data.worker.state] || '状态待核验' }}。此处是当前响应节点的状态，不代表另一节点。</p>
      <p class="closure-note">本页只读取已有证据，不停止直播、不重发请求、不强制释放名额。已结束直播的累计使用次数仍会保留。</p>
    </template>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
      <el-button type="primary" :loading="loading" @click="load">刷新核验状态</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { liveApi } from '@/api';

interface ClosureStatus {
  room: { id: string }; checkedAt: string; scopeVerified: boolean; quotaState: string | null; mediaState: string;
  outcome: { reason: string; title: string; nextStep: string }; worker: { state: string };
  providers: Array<{ provider: string; state: string; queryState: string | null; requestedAt: string;
    checkedAt: string | null; completedAt: string | null }>;
}
const props = defineProps<{ modelValue: boolean; roomId: string; roomTitle?: string }>();
const emit = defineEmits<{ (event: 'update:modelValue', value: boolean): void }>();
const data = ref<ClosureStatus | null>(null), loading = ref(false), failed = ref(false);
let epoch = 0;
const quotaText: Record<string, string> = { ACTIVE: '仍占用并发名额', COMPLETED: '并发已归还，次数保留', HELD: '预留中', RELEASED: '预留已取消', EXPIRED: '预留已到期' };
const mediaText: Record<string, string> = { ONLINE: '仍有连接', OFFLINE_OBSERVED: '已收到断流，仍需结合禁推核验', UNKNOWN: '证据不足或存在冲突' };
const stopText: Record<string, string> = { READY: '等待处理', DISPATCHING: '请求已发出，等待确认', UNKNOWN: '结果未知，禁止重复发送', ACKNOWLEDGED: '供应商已确认，不等于收尾完成' };
const queryText: Record<string, string> = { QUERYING: '正在查询', active: '推流活跃', inactive: '当前非活跃，未证明禁止重连', forbid: '已禁推', UNKNOWN: '查询结果未知' };
const workerText: Record<string, string> = { IDLE: '尚未运行', RUNNING: '处理中', FINISHED: '本轮已结束', FAILED: '本轮有失败项，需运维核对', WAITING_SCOPE_VERIFICATION: '等待供应商范围核验' };
function time(value: string | null) { return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'; }
async function load() {
  if (!props.modelValue || !props.roomId || loading.value) return;
  const current = ++epoch, id = props.roomId;
  loading.value = true; failed.value = false; data.value = null;
  try {
    const response = await liveApi.mediaClosure(id), result = response.data as ClosureStatus;
    if (current !== epoch) return;
    if (result?.room?.id !== id || !result.outcome?.title || !result.outcome?.nextStep || !result.worker || !Array.isArray(result.providers)) throw new Error('INVALID_STATUS');
    data.value = result;
  } catch { if (current === epoch) failed.value = true; }
  finally { if (current === epoch) loading.value = false; }
}
watch(() => [props.modelValue, props.roomId] as const, () => {
  epoch++; data.value = null; failed.value = false; loading.value = false;
  if (props.modelValue && props.roomId) void load();
}, { immediate: true });
onBeforeUnmount(() => { epoch++; });
</script>

<style scoped>
.closure-room { margin: 0 0 16px; color: #173d31; font-weight: 600; overflow-wrap: anywhere; }
.closure-loading { min-height: 140px; padding: 24px; }
.closure-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; margin: 20px 0; }
.closure-facts div { min-width: 0; }
.closure-facts dt { color: #606266; font-size: 13px; }
.closure-facts dd { margin: 5px 0 0; color: #303133; line-height: 1.6; overflow-wrap: anywhere; }
.closure-provider { border-top: 1px solid #e2ddd0; padding-top: 12px; }
.closure-provider h4 { margin: 0; color: #173d31; }
.closure-note { color: #606266; font-size: 13px; line-height: 1.7; }
@media (max-width: 520px) { .closure-facts { grid-template-columns: 1fr; } }
</style>
