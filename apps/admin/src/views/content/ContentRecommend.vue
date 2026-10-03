<template>
  <!--
    本页原为独立"推荐位管理"表单页，但与「推荐规则」页（/recommend/rules）调用同一后端端点
    （/admin/recommend/rules），且旧表单字段（position/weight/startTime/endTime/status）与后端
    CreateRecommendRuleDto（scene/ruleType/targetType/targetId/ruleValue/priority/startAt/endAt）
    完全不匹配，保存必 400 —— 双入口+假表单，按标准第九节"一个业务一个入口"收敛为引导页。
    菜单项已由壳层代理隐藏，本页兜底承接旧收藏/直达链接。
  -->
  <div class="recommend-redirect-page">
    <el-result
      icon="info"
      title="推荐位管理已并入「推荐规则」"
      sub-title="固定推荐、加权/降权、屏蔽等推荐运营能力已统一在「推荐规则」页配置，本入口不再单独维护。"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="goRules"
        >
          前往推荐规则
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goRules() {
  // 目标路由存在：router/index.ts path "recommend/rules" · name=RecommendRuleList
  router.push({ name: 'RecommendRuleList' })
}
</script>

<style scoped>
.recommend-redirect-page {
  padding: 40px 16px;
  background: var(--color-bg-card);
  border-radius: 8px;
}
</style>
