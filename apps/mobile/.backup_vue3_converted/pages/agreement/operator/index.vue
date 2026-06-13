<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border flex items-center justify-between px-4 h-12 flex-shrink-0">
      <view @click="goBack" class="p-1"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">运营商协议</text>
      <view class="w-7" />
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="flex-1 px-4 pt-4">
      <view class="bg-blue-50 rounded-xl p-4 mb-4 animate-pulse">
        <view class="w-24 h-4 bg-blue-100 rounded mb-2" />
        <view class="w-full h-3 bg-blue-100 rounded mb-1" />
        <view class="w-3/4 h-3 bg-blue-100 rounded" />
      </view>
      <view v-for="i in 6" :key="i" class="bg-white rounded-xl p-4 mb-3 animate-pulse">
        <view class="w-40 h-4 bg-muted rounded mb-2" />
        <view class="w-full h-3 bg-muted rounded mb-1" />
        <view class="w-4/5 h-3 bg-muted rounded" />
      </view>
    </view>

    <!-- 主内容 -->
    <scroll-view v-else scroll-y class="flex-1 px-4 pt-4 pb-6 overflow-y-auto">
      <!-- 协议标题 -->
      <view class="text-center mb-5">
        <text class="text-xl font-bold text-foreground block" style="font-family: 'STKaiti', serif;">热卜国学平台运营商合作协议</text>
        <view class="flex items-center justify-center gap-3 mt-2">
          <text class="text-xs text-muted-foreground">版本：V2.1</text>
          <view class="w-px h-3 bg-[#E8E0D5]" />
          <text class="text-xs text-muted-foreground">生效日期：2024年6月1日</text>
        </view>
      </view>

      <!-- 重要提示 -->
      <view class="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4">
        <view class="flex items-start gap-2">
          <text class="text-blue-600 text-base mt-0.5">⚠</text>
          <view>
            <text class="font-semibold text-blue-900 block mb-1">重要提示</text>
            <text class="text-sm text-blue-800 leading-relaxed">
              本协议自您成为平台运营商时生效。请仔细阅读全文，如有任何疑问，请联系平台客服（service@rebugx.com）。签署本协议即表示您同意接受全部条款的约束。
            </text>
          </view>
        </view>
      </view>

      <!-- 协议内容 -->
      <view class="space-y-3">
        <view class="bg-white border border-border rounded-xl p-4">
          <text class="text-sm font-semibold text-foreground block mb-3">一、定义</text>
          <text class="text-sm text-ink-soft leading-relaxed">
            1.1 "平台"指由热卜公司运营的国学传统文化综合服务平台（包括但不限于网站、移动应用及小程序）。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            1.2 "运营商"指经平台审核通过，获得推广和发展分站站长资格的合作方。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            1.3 "分站站长"指由运营商发展并管理，在特定区域或领域内提供线下服务的合作者。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            1.4 "合作收益"指运营商因推广和服务而获得的平台服务费分成。
          </text>
        </view>

        <view class="bg-white border border-border rounded-xl p-4">
          <text class="text-sm font-semibold text-foreground block mb-3">二、运营商资格与义务</text>
          <text class="text-sm text-ink-soft leading-relaxed">
            2.1 运营商须为具有完全民事行为能力的自然人，或依法注册的法人实体。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            2.2 运营商须提供真实、准确、完整的注册信息，并在信息变更时及时更新。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            2.3 运营商应遵守国家法律法规，不得利用平台从事非法活动，包括但不限于传播封建迷信、欺诈等行为。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            2.4 运营商应维护平台声誉，不得进行虚假宣传、夸大服务效果等不当行为。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            2.5 运营商应妥善保管账号信息，对账号下所有活动承担法律责任。
          </text>
        </view>

        <view class="bg-white border border-border rounded-xl p-4">
          <text class="text-sm font-semibold text-foreground block mb-3">三、运营商权利</text>
          <text class="text-sm text-ink-soft leading-relaxed">
            3.1 运营商有权在平台授权范围内开展推广活动，发展和管理分站站长团队。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            3.2 运营商有权获得推广收益分配，具体比例以平台运营政策为准。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            3.3 运营商有权获得平台提供的技术支持和运营培训。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            3.4 运营商有权查看团队运营数据和收益明细。
          </text>
        </view>

        <view class="bg-white border border-border rounded-xl p-4">
          <text class="text-sm font-semibold text-foreground block mb-3">四、收益结算</text>
          <text class="text-sm text-ink-soft leading-relaxed">
            4.1 运营商收益按月结算，结算周期为自然月，次月15日前完成对账。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            4.2 结算金额根据运营商团队业绩和平台当期政策确定，具体以平台系统数据为准。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            4.3 运营商收益达到人民币100元方可提现，提现手续费由运营商承担。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            4.4 如因违反协议导致账号冻结，未结算收益按照平台处理规则执行。
          </text>
        </view>

        <view class="bg-white border border-border rounded-xl p-4">
          <text class="text-sm font-semibold text-foreground block mb-3">五、协议期限与终止</text>
          <text class="text-sm text-ink-soft leading-relaxed">
            5.1 本协议自运营商签署之日起生效，有效期为一年。期满前30日双方均未提出异议则自动续期。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            5.2 任何一方可提前30日书面通知对方终止本协议。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            5.3 运营商违反本协议约定的，平台有权立即终止协议并追究法律责任。
          </text>
        </view>

        <view class="bg-white border border-border rounded-xl p-4">
          <text class="text-sm font-semibold text-foreground block mb-3">六、其他条款</text>
          <text class="text-sm text-ink-soft leading-relaxed">
            6.1 本协议适用中华人民共和国法律，争议提交平台所在地有管辖权的人民法院解决。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            6.2 平台有权根据需要修改本协议，修改后的协议在平台公示后生效。
          </text>
          <text class="text-sm text-ink-soft leading-relaxed mt-2">
            6.3 本协议未尽事宜，由双方协商解决或参照平台相关规定执行。
          </text>
        </view>
      </view>

      <!-- 版本信息 -->
      <view class="mt-6 p-4 bg-white border border-border rounded-xl text-center">
        <text class="text-xs text-muted-foreground block">版本：V2.1 | 更新日期：2024-06-01</text>
        <text class="text-xs text-muted-foreground block mt-1">热卜国学平台 · 运营管理团队</text>
      </view>

      <view class="h-5" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 1000)
})

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
