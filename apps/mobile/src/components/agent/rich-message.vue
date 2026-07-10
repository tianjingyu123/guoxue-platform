<script setup lang="ts">
/**
 * 富消息渲染器 —— 对话消息按 type 分发到对应卡片组件。
 *
 * ## 扩展方法（新增一种卡片，不动对话页主体）
 * 1. 在 components/agent/cards/ 下新建 xxx-card.vue（props: { payload: unknown }）；
 * 2. 在下方 CARD_COMPONENTS 注册表加一行 `'xxx-card': XxxCard`；
 * 3. 后端在消息流里下发 {type:'card', cardType:'xxx-card', payload}（流式）
 *    或 messages 数组里插 {type:'xxx-card', payload}（非流式）即可。
 *
 * 向前兼容：未注册的 type 自动降级显示 content 文本（旧客户端不至于白屏）。
 */
import type { Component } from 'vue'
import BaziCard from './cards/bazi-card.vue'

const props = defineProps<{
  /** 消息类型：text | bazi-card | ...（未知类型降级为文本） */
  type?: string
  /** 文本内容（text 类型主体 / 未知卡片的降级文案） */
  content?: string
  /** 卡片结构化载荷 */
  payload?: unknown
}>()

/** 卡片注册表：新增卡片只需在此登记 */
const CARD_COMPONENTS: Record<string, Component> = {
  'bazi-card': BaziCard,
}

const cardComp = props.type && props.type !== 'text' ? CARD_COMPONENTS[props.type] : undefined
</script>

<template>
  <!-- 已注册卡片：分发到对应组件 -->
  <component :is="cardComp" v-if="cardComp" :payload="payload" />
  <!-- 文本 / 未知类型降级 -->
  <text v-else class="rm-text">{{ content || '' }}</text>
</template>

<style scoped>
.rm-text { font-size: 28rpx; line-height: 1.6; white-space: pre-wrap; color: inherit; }
</style>
