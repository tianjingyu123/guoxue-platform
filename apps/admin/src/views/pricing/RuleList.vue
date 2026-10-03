<template>
  <main class="pricing-hub">
    <section
      class="hero"
      aria-labelledby="pricing-title"
    >
      <div class="hero-copy">
        <div class="eyebrow">
          <span
            class="status-dot"
            aria-hidden="true"
          />
          真实交易计价入口
        </div>
        <h1 id="pricing-title">
          价格与促销中心
        </h1>
        <p class="hero-lead">
          基础价在业务对象中维护，活动价在营销模块中维护；下单时由统一计价服务重新核算并锁定订单金额。
        </p>
        <div class="hero-actions">
          <el-button
            type="primary"
            @click="go('/products')"
          >
            管理商品价格
          </el-button>
          <el-button
            class="ghost-button"
            @click="go('/pricing/demand')"
          >
            查看需求热度
          </el-button>
        </div>
      </div>

      <div
        class="price-path"
        aria-label="真实价格生效路径"
      >
        <div class="path-step">
          <span class="step-index">壹</span>
          <div>
            <strong>基础价</strong>
            <p>商品、课程、圈子</p>
          </div>
        </div>
        <span
          class="path-line"
          aria-hidden="true"
        />
        <div class="path-step">
          <span class="step-index">贰</span>
          <div>
            <strong>活动核算</strong>
            <p>折扣、秒杀、拼团、满减</p>
          </div>
        </div>
        <span
          class="path-line"
          aria-hidden="true"
        />
        <div class="path-step">
          <span class="step-index">叁</span>
          <div>
            <strong>订单锁价</strong>
            <p>服务端复算，支付金额落单</p>
          </div>
        </div>
      </div>
    </section>

    <section
      class="content-section"
      aria-labelledby="base-price-heading"
    >
      <div class="section-heading">
        <div>
          <span class="section-kicker">价格底账</span>
          <h2 id="base-price-heading">
            维护基础售价
          </h2>
        </div>
        <p>基础售价是所有优惠计算的起点，修改后进入统一计价链路。</p>
      </div>

      <div class="entry-grid base-grid">
        <button
          v-for="entry in baseEntries"
          :key="entry.path"
          type="button"
          class="entry-card"
          :class="`tone-${entry.tone}`"
          @click="go(entry.path)"
        >
          <span
            class="entry-icon"
            aria-hidden="true"
          >
            <el-icon><component :is="entry.icon" /></el-icon>
          </span>
          <span class="entry-content">
            <span class="entry-meta">{{ entry.meta }}</span>
            <strong>{{ entry.title }}</strong>
            <span class="entry-desc">{{ entry.description }}</span>
          </span>
          <span class="entry-action">进入管理 <span aria-hidden="true">→</span></span>
        </button>
      </div>
    </section>

    <section
      class="content-section"
      aria-labelledby="promotion-heading"
    >
      <div class="section-heading">
        <div>
          <span class="section-kicker">成交策略</span>
          <h2 id="promotion-heading">
            配置真实促销
          </h2>
        </div>
        <p>这些活动已接入商品展示与结算服务，生效范围、时间和库存仍需逐项核对。</p>
      </div>

      <div class="entry-grid promotion-grid">
        <button
          v-for="entry in promotionEntries"
          :key="entry.path"
          type="button"
          class="entry-card compact"
          :class="`tone-${entry.tone}`"
          @click="go(entry.path)"
        >
          <span
            class="entry-icon"
            aria-hidden="true"
          >
            <el-icon><component :is="entry.icon" /></el-icon>
          </span>
          <span class="entry-content">
            <span class="entry-meta">{{ entry.meta }}</span>
            <strong>{{ entry.title }}</strong>
            <span class="entry-desc">{{ entry.description }}</span>
          </span>
          <span class="entry-action">配置 <span aria-hidden="true">→</span></span>
        </button>
      </div>
    </section>

    <aside
      class="legacy-note"
      aria-label="旧动态定价说明"
    >
      <div
        class="legacy-mark"
        aria-hidden="true"
      >
        止
      </div>
      <div>
        <strong>旧“动态定价规则”已停用</strong>
        <p>
          旧规则表从未接入真实下单计价，继续编辑会造成“后台显示已生效、用户结算不变化”的误判。历史记录保留用于审计，不再提供新增、修改或删除入口。
        </p>
      </div>
    </aside>
  </main>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import { useRouter } from "vue-router";
import {
  Discount,
  Goods,
  Money,
  Reading,
  Sell,
  Tickets,
  Timer,
  User,
} from "@element-plus/icons-vue";

type Tone = "jade" | "indigo" | "cinnabar" | "gold" | "slate";

interface HubEntry {
  title: string;
  description: string;
  meta: string;
  path: string;
  tone: Tone;
  icon: Component;
}

const router = useRouter();

const baseEntries: HubEntry[] = [
  {
    title: "商品与 SKU 价格",
    description: "维护商品售价、划线价和不同规格价格，商城下单以服务端复算结果为准。",
    meta: "商品中心",
    path: "/products",
    tone: "jade",
    icon: Goods,
  },
  {
    title: "课程售价",
    description: "维护单课基础价与划线价，限时折扣会在此价格之上计算。",
    meta: "课程中心",
    path: "/courses",
    tone: "indigo",
    icon: Reading,
  },
  {
    title: "圈子入圈价格",
    description: "维护付费圈子的加入价格，用户下单时再次读取当前有效价格。",
    meta: "圈子中心",
    path: "/circles",
    tone: "cinnabar",
    icon: User,
  },
];

const promotionEntries: HubEntry[] = [
  {
    title: "限时折扣",
    description: "按商品、课程或圈子配置活动时段与折扣比例。",
    meta: "时段优惠",
    path: "/marketing/discounts",
    tone: "indigo",
    icon: Timer,
  },
  {
    title: "秒杀活动",
    description: "配置商品秒杀价、活动库存和单人限购数量。",
    meta: "库存型活动",
    path: "/marketing/flash-sales",
    tone: "cinnabar",
    icon: Sell,
  },
  {
    title: "拼团活动",
    description: "配置拼团价、成团人数与订单有效时间。",
    meta: "社交成交",
    path: "/marketing/group-buys",
    tone: "jade",
    icon: User,
  },
  {
    title: "满减与赠品",
    description: "按订单门槛配置减免金额或赠品，结算阶段统一核算。",
    meta: "订单优惠",
    path: "/marketing/full-reductions",
    tone: "gold",
    icon: Money,
  },
  {
    title: "优惠券",
    description: "管理领取、使用范围、门槛和有效期，避免活动叠加失控。",
    meta: "用户权益",
    path: "/coupons",
    tone: "slate",
    icon: Tickets,
  },
  {
    title: "优惠券模板",
    description: "维护可复用的发券模板，再由活动或运营场景投放。",
    meta: "投放模板",
    path: "/marketing/coupons",
    tone: "gold",
    icon: Discount,
  },
];

function go(path: string) {
  router.push(path);
}
</script>

<style scoped>
.pricing-hub {
  --ink: #172033;
  --muted: #667085;
  --line: #e5e9f0;
  --paper: #f4f6f9;
  display: grid;
  gap: 28px;
  padding: 22px;
  color: var(--ink);
  background: var(--paper);
  min-height: 100%;
}

.hero {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(480px, 1.15fr);
  gap: 44px;
  align-items: center;
  padding: 34px 38px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: #fff;
  background:
    linear-gradient(110deg, rgba(181, 71, 50, 0.13), transparent 42%),
    #172033;
  box-shadow: 0 14px 38px rgba(23, 32, 51, 0.13);
}

.hero::after {
  content: "价";
  position: absolute;
  right: -18px;
  bottom: -86px;
  color: rgba(255, 255, 255, 0.025);
  font: 700 250px/1 "STSong", "Songti SC", serif;
  pointer-events: none;
}

.hero-copy,
.price-path {
  position: relative;
  z-index: 1;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 13px;
  color: #b9e5dc;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.12em;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #57c8ad;
  box-shadow: 0 0 0 5px rgba(87, 200, 173, 0.13);
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-family: "STSong", "Songti SC", "Noto Serif SC", serif;
  font-size: clamp(30px, 3vw, 42px);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.hero-lead {
  max-width: 590px;
  margin-top: 14px;
  color: #cfd5df;
  font-size: 15px;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

.hero-actions :deep(.el-button--primary) {
  --el-button-bg-color: #b54732;
  --el-button-border-color: #b54732;
  --el-button-hover-bg-color: #c85b43;
  --el-button-hover-border-color: #c85b43;
}

.ghost-button {
  --el-button-bg-color: rgba(255, 255, 255, 0.04);
  --el-button-border-color: rgba(255, 255, 255, 0.25);
  --el-button-text-color: #fff;
  --el-button-hover-bg-color: rgba(255, 255, 255, 0.1);
  --el-button-hover-border-color: rgba(255, 255, 255, 0.4);
  --el-button-hover-text-color: #fff;
}

.price-path {
  display: grid;
  grid-template-columns: 1fr 34px 1fr 34px 1fr;
  align-items: center;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.055);
  backdrop-filter: blur(8px);
}

.path-step {
  min-width: 0;
}

.step-index {
  display: block;
  margin-bottom: 12px;
  color: #d6b56f;
  font: 600 12px/1 "DIN Alternate", "Arial Narrow", sans-serif;
  letter-spacing: 0.16em;
}

.path-step strong {
  display: block;
  color: #fff;
  font-size: 16px;
}

.path-step p {
  margin-top: 7px;
  color: #aeb8c8;
  font-size: 12px;
  line-height: 1.55;
}

.path-line {
  height: 1px;
  margin: 0 8px;
  background: linear-gradient(90deg, rgba(214, 181, 111, 0.25), #d6b56f, rgba(214, 181, 111, 0.25));
}

.content-section {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 19px;
}

.section-kicker {
  display: block;
  margin-bottom: 5px;
  color: #9b6c24;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.section-heading h2 {
  font-size: 21px;
  letter-spacing: 0.01em;
}

.section-heading > p {
  max-width: 580px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.65;
  text-align: right;
}

.entry-grid {
  display: grid;
  gap: 14px;
}

.base-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.promotion-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.entry-card {
  --accent: #177267;
  --accent-soft: #e8f4f1;
  position: relative;
  display: grid;
  grid-template-columns: 42px 1fr auto;
  gap: 14px;
  align-items: start;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: inherit;
  text-align: left;
  background: #fff;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.entry-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 36%, #fff);
  box-shadow: 0 10px 25px rgba(23, 32, 51, 0.08);
}

.entry-card:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent) 24%, transparent);
  outline-offset: 2px;
}

.entry-card.compact {
  min-height: 126px;
}

.entry-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 20px;
}

.entry-content {
  min-width: 0;
}

.entry-meta {
  display: block;
  margin: 1px 0 5px;
  color: var(--accent);
  font: 700 11px/1.2 "DIN Alternate", "Arial Narrow", sans-serif;
  letter-spacing: 0.08em;
}

.entry-content strong {
  display: block;
  font-size: 16px;
}

.entry-desc {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.62;
}

.entry-action {
  align-self: center;
  white-space: nowrap;
  color: var(--accent);
  font-size: 12px;
  font-weight: 650;
}

.tone-indigo {
  --accent: #465b91;
  --accent-soft: #edf0f8;
}

.tone-cinnabar {
  --accent: #b54732;
  --accent-soft: #f9ece9;
}

.tone-gold {
  --accent: #9b6c24;
  --accent-soft: #f7f0e2;
}

.tone-slate {
  --accent: #566176;
  --accent-soft: #eef1f5;
}

.legacy-note {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 14px;
  align-items: start;
  padding: 18px 20px;
  border: 1px solid #ead9d3;
  border-radius: 12px;
  background: #fff9f7;
}

.legacy-mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid #c66a55;
  border-radius: 50%;
  color: #a73f2b;
  font-family: "STSong", "Songti SC", serif;
  font-weight: 700;
}

.legacy-note strong {
  display: block;
  color: #8f3323;
  font-size: 14px;
}

.legacy-note p {
  margin-top: 5px;
  color: #795d57;
  font-size: 13px;
  line-height: 1.7;
}

@media (max-width: 1180px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .base-grid,
  .promotion-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .pricing-hub {
    padding: 14px;
  }

  .hero,
  .content-section {
    padding: 22px;
  }

  .hero-actions,
  .section-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-actions :deep(.el-button) {
    margin-left: 0;
  }

  .price-path {
    grid-template-columns: 1fr;
    gap: 13px;
  }

  .path-line {
    width: 1px;
    height: 18px;
    margin: 0 0 0 5px;
  }

  .section-heading > p {
    text-align: left;
  }

  .base-grid,
  .promotion-grid {
    grid-template-columns: 1fr;
  }

  .entry-card {
    grid-template-columns: 42px 1fr;
  }

  .entry-action {
    grid-column: 2;
    justify-self: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .entry-card {
    transition: none;
  }

  .entry-card:hover {
    transform: none;
  }
}
</style>
