<template>
  <TopicScreenFrame
    title="交易指挥中心"
    subtitle="从今日成交结构，看到业务动向"
    topic="transactions"
    :snapshot="snapshot"
    :updated-at="data.updatedAt"
    :interval="15"
    footer="今日统计按服务端日期与订单创建时间"
    @refresh="refresh"
  >
    <section
      class="ts-transaction-top"
      aria-label="交易核心指标"
    >
      <dl class="ts-stat">
        <dt>今日成交额</dt><dd><strong class="ts-hero-number">{{ metric(data.todayRevenue, true) }}</strong></dd><small>已支付及后续有效状态订单</small>
      </dl>
      <dl class="ts-stat">
        <dt>今日成交订单</dt><dd>{{ metric(data.todayOrders) }}</dd><small>单</small>
      </dl>
      <dl class="ts-stat">
        <dt>近一小时订单</dt><dd>{{ metric(data.hourOrders) }}</dd><small>按订单创建时间</small>
      </dl>
      <dl class="ts-stat">
        <dt>今日客单价</dt><dd>{{ metric(quotient(data.todayRevenue, data.todayOrders), true) }}</dd><small>今日成交额 ÷ 今日单量</small>
      </dl>
    </section>
    <div class="ts-transaction-grid">
      <section class="ts-surface">
        <div class="ts-section-head">
          <div><h2>今日成交结构</h2><p>选择品类，联动查看最近成交</p></div><div
            class="ts-segment"
            aria-label="构成统计方式"
          >
            <button
              :aria-pressed="mode === 'amount'"
              @click="mode = 'amount'"
            >
              按金额
            </button><button
              :aria-pressed="mode === 'count'"
              @click="mode = 'count'"
            >
              按单量
            </button>
          </div>
        </div>
        <div class="ts-transaction-composition">
          <div class="ts-ring">
            <svg
              viewBox="0 0 240 240"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="120"
                cy="120"
                r="110"
                stroke="#6ba5bb22"
                stroke-dasharray="1 8"
              />
              <circle
                cx="120"
                cy="120"
                r="90"
                stroke="#325365"
                stroke-width="14"
              />
              <circle
                v-for="row in composition.items.filter(item => item.share)"
                :key="row.key"
                cx="120"
                cy="120"
                r="90"
                pathLength="100"
                :stroke="row.color"
                stroke-width="14"
                :stroke-dasharray="`${row.share} ${100 - row.share!}`"
                :stroke-dashoffset="-row.offset"
                transform="rotate(-90 120 120)"
                :opacity="!selected || selected === row.key ? 1 : 0.25"
              />
            </svg>
            <div class="ts-ring-label">
              <span>{{ selectedItem?.label ?? '全部品类' }}</span><strong
                :aria-label="metric(selectedItem ? selectedItem.value : composition.total, mode === 'amount')"
                :title="metric(selectedItem ? selectedItem.value : composition.total, mode === 'amount')"
              >{{ compactMetric(selectedItem ? selectedItem.value : composition.total, mode === 'amount') }}</strong><small>{{ mode === 'amount' ? '今日成交额' : '今日订单数' }}</small>
            </div>
          </div>
          <TopicBreakdown
            :rows="composition.items"
            :selected="selected"
            :money="mode === 'amount'"
            label="今日品类构成"
            :empty="Array.isArray(data.typeBreakdown) ? '今日暂无成交' : '品类数据暂未提供'"
            hint="有效成交进入统计后，将显示真实构成。"
            @select="selected = $event"
          />
        </div>
        <p class="ts-context">
          {{ selectedItem ? `${selectedItem.label}占今日${mode === 'amount' ? '成交额' : '单量'} ${percent(selectedItem.share)}。最近成交列表已按该品类筛选。` : '金额与单量提供两个观察角度。客单价不是利润，成交构成也不是全天趋势。' }}
        </p>
      </section>
      <section class="ts-surface ts-ledger">
        <div class="ts-section-head">
          <div><h2>最近成交</h2><p>最近 20 笔中的 {{ filteredOrders.length }} 笔，不限今日</p></div><select
            v-model="selected"
            class="ts-select"
            aria-label="筛选成交品类"
          >
            <option :value="null">
              全部品类
            </option><option
              v-for="kind in kinds"
              :key="kind"
              :value="kind"
            >
              {{ typeLabel(kind) }}
            </option>
          </select>
        </div>
        <div
          v-if="filteredOrders.length"
          class="ts-table-scroll"
          tabindex="0"
          aria-label="最近成交明细"
        >
          <table class="ts-table">
            <thead>
              <tr>
                <th scope="col">
                  业务 / 订单尾号
                </th><th scope="col">
                  创建时间
                </th><th
                  scope="col"
                  class="ts-align-right"
                >
                  成交额
                </th>
              </tr>
            </thead><tbody>
              <tr
                v-for="order in filteredOrders"
                :key="order.id"
              >
                <td>{{ typeLabel(order.type) }}<small>#{{ order.id.slice(-8) }}</small></td><td>{{ formatScreenTime(order.at) }}</td><td class="ts-align-right ts-amount">
                  {{ metric(order.amount, true) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-else
          class="ts-empty"
        >
          <span
            class="ts-empty-mark"
            aria-hidden="true"
          >∅</span><strong>{{ selected ? '最近记录中暂无该品类' : Array.isArray(data.recentOrders) ? '尚无有效成交记录' : '成交明细暂未提供' }}</strong><p>{{ selected ? '切换全部品类查看其他成交。筛选范围仅为最近 20 笔。' : '订单成交后会在此列出，当前不会用模拟流水填充。' }}</p><button
            v-if="selected"
            class="ts-button"
            @click="selected = null"
          >
            查看全部品类
          </button>
        </div>
        <p class="ts-note">
          最新记录按创建时间排序；只显示订单尾号，不展示客户资料。
        </p>
      </section>
    </div>
    <template #scope>
      <p>今日和近一小时均按服务端订单创建时间统计，且只计入已支付及后续有效状态；最近成交最多返回 20 笔，跨日期。品类比例分别以当日各品类金额合计或单量合计为分母。缺失数据与无法计算的客单价显示“—”，不等于零。</p>
    </template>
  </TopicScreenFrame>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { bigscreenApi } from '@/api'
import TopicScreenFrame from '@/components/TopicScreenFrame.vue'
import TopicBreakdown from '@/components/TopicBreakdown.vue'
import { useTopicSnapshot } from '@/composables/useTopicSnapshot'
import { formatScreenTime, orderTypeLabel } from '@/utils/platform-screen'
import { compactMetric, distribution, metric, percent, quotient, selectedDistribution, type TransactionScreen } from '@/utils/topic-screen'

const { snapshot, data, refresh } = useTopicSnapshot<TransactionScreen>(token => bigscreenApi.transactions(token, true), 15000)
const mode = ref<'amount' | 'count'>('amount')
const selected = ref<string | null>(null)
// 筛选与统计视角属于当前权限快照，不跨账号、令牌或撤权恢复继承。
watch(() => snapshot.value.data, value => { if (!value) { selected.value = null; mode.value = 'amount' } }, { flush: 'sync' })
const orders = computed(() => Array.isArray(data.value.recentOrders) ? data.value.recentOrders : [])
const breakdown = computed(() => Array.isArray(data.value.typeBreakdown) ? data.value.typeBreakdown : undefined)
const kinds = computed(() => Array.from(new Set([...(breakdown.value ?? []).map(item => item.type), ...orders.value.map(order => order.type)])))
function typeLabel(type: string) { return ({ CIRCLE_JOIN: '入圈', BOT_SERVICE: '智能体', PAIPAN: '排盘' } as Record<string, string>)[type] ?? orderTypeLabel(type) }
const composition = computed(() => distribution(breakdown.value?.map(item => ({ key: item.type, label: typeLabel(item.type), value: item[mode.value] }))))
const selectedItem = computed(() => selectedDistribution(composition.value, selected.value, typeLabel(selected.value ?? '')))
const filteredOrders = computed(() => orders.value.filter(order => !selected.value || order.type === selected.value))
watch(kinds, values => { if (selected.value && !values.includes(selected.value)) selected.value = null })
</script>
