<script setup lang="ts">
/**
 * 排盘工具入口页（从原型 app/paipan/page.tsx 1:1 高保真迁移）
 * 结构：顶栏 / AI智能解盘卡 / 排盘工具网格(展开收起) / 中医工具 / AI智能体横滚 / 合规提示 / 底部导航
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ToolIcon from '@/components/paipan/tool-icon.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import { tools, medicalTools, agents, AGENT_AVATAR_GRADIENT } from '@/lib/tools-data'
import { navigateTo } from '@/utils/router'

const showAllTools = ref(false)
const showMedical = ref(false)

const displayTools = computed(() => (showAllTools.value ? tools : tools.slice(0, 32)))
const displayMedical = computed(() => (showMedical.value ? medicalTools : medicalTools.slice(0, 8)))
const displayAgents = computed(() => agents.slice(0, 6))

function gradientStyle(avatar: string) {
  const g = AGENT_AVATAR_GRADIENT[avatar] || AGENT_AVATAR_GRADIENT.master
  return { background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }
}
</script>

<template>
  <view class="paipan">
    <!-- 顶部标题栏 -->
    <view class="header">
      <text class="header-title">
        排盘工具
      </text>
      <view
        class="header-action"
        @tap="navigateTo('/paipan/history')"
      >
        <app-icon
          name="history"
          :size="40"
          color="#999999"
        />
      </view>
    </view>

    <scroll-view
      scroll-y
      class="content"
    >
      <!-- AI 智能解盘入口 -->
      <view class="section-px ai-wrap">
        <view
          class="ai-card"
          @tap="navigateTo('/paipan/ai')"
        >
          <view class="ai-blob ai-blob-1" />
          <view class="ai-blob ai-blob-2" />
          <view class="ai-row">
            <view class="ai-icon">
              <app-icon
                name="sparkles"
                :size="56"
                color="#ffffff"
              />
            </view>
            <view class="ai-text">
              <view class="ai-title-row">
                <text class="ai-title">
                  AI 智能解盘
                </text>
                <text class="ai-badge">
                  新功能
                </text>
              </view>
              <text class="ai-sub">
                输入命盘信息，AI 为您深度解析
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="40"
              color="rgba(255,255,255,0.6)"
            />
          </view>
        </view>
      </view>

      <!-- 排盘工具网格 -->
      <view class="section-px section-tools">
        <view class="sec-head">
          <text class="sec-title">
            排盘工具
          </text>
          <view
            class="sec-link"
            @tap="navigateTo('/paipan/history')"
          >
            <text class="sec-link-text">
              历史记录
            </text>
            <app-icon
              name="chevron-right"
              :size="28"
              color="#c41e3a"
            />
          </view>
        </view>
        <view class="grid">
          <view
            v-for="tool in displayTools"
            :key="tool.id"
            class="cell"
            @tap="navigateTo(tool.href)"
          >
            <view class="cell-icon">
              <tool-icon
                :icon-id="tool.iconId"
                :size="88"
              />
              <view
                v-if="tool.badge"
                class="badge badge-red"
              />
            </view>
            <text class="cell-name">
              {{ tool.name }}
            </text>
          </view>
        </view>
        <view
          v-if="tools.length > 32"
          class="toggle"
          @tap="showAllTools = !showAllTools"
        >
          <text class="toggle-text">
            {{ showAllTools ? '收起' : '展开更多' }}
          </text>
          <app-icon
            :name="showAllTools ? 'chevron-up' : 'chevron-down'"
            :size="32"
            color="#999999"
          />
        </view>
      </view>

      <!-- 中医工具 -->
      <view class="section-px section-mt">
        <view class="sec-head">
          <view class="sec-title-row">
            <app-icon
              name="stethoscope"
              :size="32"
              color="#059669"
            />
            <text class="sec-title">
              中医工具
            </text>
          </view>
        </view>
        <view class="grid">
          <view
            v-for="tool in displayMedical"
            :key="tool.id"
            class="cell"
            @tap="navigateTo(tool.href)"
          >
            <view class="cell-icon">
              <tool-icon
                :icon-id="tool.iconId"
                :size="88"
              />
              <view
                v-if="tool.badge"
                class="badge badge-green"
              />
            </view>
            <text class="cell-name">
              {{ tool.name }}
            </text>
          </view>
        </view>
        <view
          v-if="medicalTools.length > 8"
          class="toggle"
          @tap="showMedical = !showMedical"
        >
          <text class="toggle-text">
            {{ showMedical ? '收起' : '展开更多' }}
          </text>
          <app-icon
            :name="showMedical ? 'chevron-up' : 'chevron-down'"
            :size="32"
            color="#999999"
          />
        </view>
      </view>

      <!-- AI 智能体 -->
      <view class="section-px section-mt">
        <view class="sec-head">
          <text class="sec-title">
            AI 智能体
          </text>
          <view
            class="sec-link"
            @tap="navigateTo('/agents')"
          >
            <text class="sec-link-text">
              查看全部
            </text>
            <app-icon
              name="chevron-right"
              :size="28"
              color="#c41e3a"
            />
          </view>
        </view>
        <scroll-view
          scroll-x
          class="agents-scroll"
        >
          <view class="agents-row">
            <view
              v-for="agent in displayAgents"
              :key="agent.id"
              class="agent-card"
              @tap="navigateTo(agent.href)"
            >
              <view
                class="agent-avatar"
                :style="gradientStyle(agent.avatar)"
              >
                <app-icon
                  name="sparkles"
                  :size="40"
                  color="#ffffff"
                />
              </view>
              <text class="agent-name">
                {{ agent.name }}
              </text>
              <text class="agent-desc">
                {{ agent.description }}
              </text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 合规提示 -->
      <view class="section-px disclaimer">
        <text class="disclaimer-text">
          平台命理工具仅供传统文化爱好者研究学习，排盘与分析结果不构成任何决策建议。
        </text>
      </view>
    </scroll-view>

    <bottom-nav active="paipan" />
  </view>
</template>

<style scoped lang="scss">
.paipan { min-height: 100vh; background: var(--bg-paper, #faf8f5); }

/* 顶栏 */
.header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 40;
  height: 88rpx; padding: 0 32rpx;
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg-paper, #faf8f5);
  border-bottom: 2rpx solid var(--line, #e8e0d5);
}
.header-title { font-size: 36rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); }
.header-action { padding: 16rpx; margin-right: -16rpx; }

.content { position: absolute; top: 88rpx; bottom: 112rpx; left: 0; right: 0; }
.section-px { padding-left: 32rpx; padding-right: 32rpx; }

/* AI 解盘卡 */
.ai-wrap { padding-top: 32rpx; }
.ai-card {
  position: relative; overflow: hidden;
  border-radius: 32rpx; padding: 32rpx;
  background: linear-gradient(to right, #c41e3a, rgba(196,30,58,0.9), rgba(196,30,58,0.8));
}
.ai-blob { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.1); }
.ai-blob-1 { right: 0; top: 0; width: 256rpx; height: 256rpx; transform: translate(25%, -50%); }
.ai-blob-2 { right: 64rpx; bottom: 0; width: 160rpx; height: 160rpx; transform: translateY(50%); }
.ai-row { position: relative; display: flex; align-items: center; gap: 32rpx; }
.ai-icon {
  width: 112rpx; height: 112rpx; border-radius: 24rpx;
  background: rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
}
.ai-text { flex: 1; }
.ai-title-row { display: flex; align-items: center; gap: 16rpx; }
.ai-title { font-size: 36rpx; font-weight: 700; color: #fff; }
.ai-badge {
  padding: 2rpx 16rpx; font-size: 20rpx; color: #fff;
  background: rgba(255,255,255,0.2); border-radius: 999rpx;
}
.ai-sub { display: block; font-size: 28rpx; color: rgba(255,255,255,0.8); margin-top: 4rpx; }

/* 分区标题 */
.section-tools { padding-top: 48rpx; }
.section-mt { padding-top: 32rpx; }
.sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sec-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.sec-title-row { display: flex; align-items: center; gap: 16rpx; }
.sec-link { display: flex; align-items: center; gap: 4rpx; }
.sec-link-text { font-size: 24rpx; color: var(--brand, #c41e3a); }

/* 工具网格 4 列 */
.grid { display: grid; grid-template-columns: repeat(4, 1fr); row-gap: 24rpx; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 16rpx 0; }
.cell-icon { position: relative; }
.badge { position: absolute; top: -4rpx; right: -4rpx; width: 16rpx; height: 16rpx; border-radius: 50%; }
.badge-red { background: var(--brand, #c41e3a); }
.badge-green { background: #10b981; }
.cell-name { font-size: 24rpx; color: var(--text-ink, #2c2c2c); text-align: center; line-height: 1.2; }

/* 展开/收起 */
.toggle { display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 24rpx 0; margin-top: 8rpx; }
.toggle-text { font-size: 28rpx; color: var(--text-soft, #999); }

/* 智能体横滚 */
.agents-scroll { width: 100%; white-space: nowrap; }
.agents-row { display: inline-flex; gap: 24rpx; padding-bottom: 16rpx; }
.agent-card {
  display: inline-flex; flex-direction: column;
  width: 280rpx; padding: 24rpx;
  background: var(--card, #fff); border-radius: 24rpx;
  border: 2rpx solid var(--line, #e8e0d5);
}
.agent-avatar {
  width: 96rpx; height: 96rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.12);
}
.agent-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2c2c2c); margin-top: 16rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-desc { font-size: 24rpx; color: var(--text-soft, #999); margin-top: 4rpx; white-space: normal; line-height: 1.3; }

/* 合规提示 */
.disclaimer { padding-top: 16rpx; padding-bottom: 32rpx; }
.disclaimer-text { font-size: 22rpx; color: var(--text-soft, #999); line-height: 1.5; text-align: center; }
</style>
