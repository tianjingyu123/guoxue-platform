<template>
  <TopicScreenFrame
    title="AI 能力观测中心"
    subtitle="分析调用、业务场景与知识资产"
    topic="ai"
    :snapshot="snapshot"
    :updated-at="data.updatedAt"
    footer="分析记录统计，不等同于全部 AI 网关调用"
    @refresh="refresh"
  >
    <div class="ts-ai-layout">
      <section class="ts-surface ts-ai-wing">
        <div class="ts-section-head">
          <div><h2>场景调用分布</h2><p>累计分析记录，按调用量排序</p></div>
        </div>
        <TopicBreakdown
          :rows="scenes.items"
          :selected="selectedScene"
          label="累计场景分布"
          :empty="Array.isArray(data.sceneDistribution) ? '暂无场景分析记录' : '场景数据暂未提供'"
          hint="业务产生分析记录后，展示各场景调用规模。"
          @select="selectedScene = $event"
        />
        <p class="ts-note">
          {{ selectedSceneItem ? `${selectedSceneItem.label}：${metric(selectedSceneItem.value)} 次，占累计场景记录 ${percent(selectedSceneItem.share)}。` : '选择一个场景查看贡献。该分布为累计数据，不与右侧本月模型数量直接比较。' }}
        </p>
      </section>
      <section
        class="ts-ai-center"
        aria-label="分析调用规模"
      >
        <h2>分析调用规模</h2>
        <div class="ts-ring">
          <svg
            viewBox="0 0 260 260"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="130"
              cy="130"
              r="124"
              stroke="#84aec137"
              stroke-dasharray="1 7"
            />
            <circle
              cx="130"
              cy="130"
              r="106"
              stroke="#294b60"
              stroke-width="6"
            />
            <circle
              v-if="monthShare"
              cx="130"
              cy="130"
              r="106"
              stroke="#94bfff"
              stroke-width="6"
              pathLength="100"
              :stroke-dasharray="`${monthShare} ${100-monthShare}`"
              transform="rotate(-90 130 130)"
            />
            <circle
              cx="130"
              cy="130"
              r="89"
              stroke="#294b60"
              stroke-width="6"
            />
            <circle
              v-if="todayShare"
              cx="130"
              cy="130"
              r="89"
              stroke="#69dfd0"
              stroke-width="6"
              pathLength="100"
              :stroke-dasharray="`${todayShare} ${100-todayShare}`"
              transform="rotate(-90 130 130)"
            />
            <path
              d="M124 48h12M124 212h12M48 124v12M212 124v12"
              stroke="#8bb6c757"
            />
          </svg>
          <div class="ts-ring-label">
            <span>累计分析调用</span><strong>{{ metric(data.totalApiCalls) }}</strong><small>条分析记录</small>
          </div>
        </div>
        <div class="ts-ai-periods">
          <dl class="ts-stat">
            <dt>本月调用</dt><dd>{{ metric(data.monthApiCalls) }}</dd><small>外轨：占累计 {{ percent(monthShare) }}</small>
          </dl>
          <dl class="ts-stat">
            <dt>今日调用</dt><dd>{{ metric(data.todayApiCalls) }}</dd><small>内轨：占本月 {{ percent(todayShare) }}</small>
          </dl>
        </div>
        <div class="ts-ai-resources">
          <dl class="ts-stat">
            <dt>智能体对话记录</dt><dd>{{ metric(data.botConversations) }}</dd><small>独立累计，不叠加为分析调用</small>
          </dl>
          <dl class="ts-stat">
            <dt>知识库条目</dt><dd>{{ metric(data.knowledgeBaseSize) }}</dd><small>圈子知识资产规模</small>
          </dl>
        </div>
      </section>
      <section class="ts-surface ts-ai-wing">
        <div class="ts-section-head">
          <div><h2>模型使用分布</h2><p>本自然月分析记录，按调用量排序</p></div>
        </div>
        <TopicBreakdown
          :rows="models.items"
          :selected="selectedModel"
          label="本月模型分布"
          :empty="Array.isArray(data.modelDistribution) ? '本月暂无模型记录' : '模型数据暂未提供'"
          hint="模型标识来自实际分析记录，不等同于可用模型清单。"
          @select="selectedModel = $event"
        />
        <p class="ts-note">
          {{ selectedModelItem ? `${selectedModelItem.label}：${metric(selectedModelItem.value)} 次，占本月模型记录 ${percent(selectedModelItem.share)}。` : '选择模型查看本月使用占比。这里只呈现使用分布，不据此判断服务健康状况。' }}
        </p>
      </section>
    </div>
    <p class="ts-context">
      本屏未接入成功率、响应耗时、Token 或费用数据，不作服务质量或成本推断。双轨表示时间范围占比，不表示执行进度。
    </p>
    <template #scope>
      <p>累计、今日、本月调用取自分析记录；今日和本月以服务端时间为准。场景分布取累计记录，模型分布仅取本自然月；智能体对话来自对话日志，知识库来自圈子知识条目。缺失或分母为零时比例显示“—”，不会填满圆环或显示虚假成功率。</p>
    </template>
  </TopicScreenFrame>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { bigscreenApi } from '@/api'
import TopicScreenFrame from '@/components/TopicScreenFrame.vue'
import TopicBreakdown from '@/components/TopicBreakdown.vue'
import { useTopicSnapshot } from '@/composables/useTopicSnapshot'
import { distribution, metric, percent, proportion, type AiScreen } from '@/utils/topic-screen'
const { snapshot, data, refresh } = useTopicSnapshot<AiScreen>(token => bigscreenApi.aiCapability(token, true))
const selectedScene = ref<string | null>(null), selectedModel = ref<string | null>(null)
// 必须在新身份响应到达前同步清空，不能仅依赖异步分布监听清理旧选择。
watch(() => snapshot.value.data, value => { if (!value) { selectedScene.value = null; selectedModel.value = null } }, { flush: 'sync' })
const scenes = computed(() => distribution(Array.isArray(data.value.sceneDistribution) ? data.value.sceneDistribution.map(item => ({ key: JSON.stringify(item.scene), label: item.scene || '未标注场景', value: item.count })) : undefined))
const models = computed(() => distribution(Array.isArray(data.value.modelDistribution) ? data.value.modelDistribution.map(item => ({ key: JSON.stringify(item.model), label: item.model || '未标注模型', value: item.count })) : undefined))
const selectedSceneItem = computed(() => scenes.value.items.find(item => item.key === selectedScene.value))
const selectedModelItem = computed(() => models.value.items.find(item => item.key === selectedModel.value))
const monthShare = computed(() => proportion(data.value.monthApiCalls, data.value.totalApiCalls))
const todayShare = computed(() => proportion(data.value.todayApiCalls, data.value.monthApiCalls))
watch(scenes, value => { if (!value.items.some(item => item.key === selectedScene.value)) selectedScene.value = null })
watch(models, value => { if (!value.items.some(item => item.key === selectedModel.value)) selectedModel.value = null })
</script>
