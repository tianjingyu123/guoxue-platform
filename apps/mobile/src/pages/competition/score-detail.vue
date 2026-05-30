<template>
  <view class="page">
    <view v-for="(q, idx) in questions" :key="q.id || idx" class="q-card">
      <text class="q-num">第{{ idx + 1 }}题 <text :class="q.correct ? 'tag-right' : 'tag-wrong'">{{ q.correct ? '✓' : '✗' }}</text></text>
      <text class="q-title">{{ q.title }}</text>
      <view class="q-opts">
        <view v-for="(opt, oi) in q.options" :key="oi" class="opt" :class="{ right: oi === q.answer, wrong: oi === q.userAnswer && !q.correct }">
          <text>{{ ['A','B','C','D'][oi] }}. {{ opt }}</text>
        </view>
      </view>
      <text v-if="q.explanation" class="explain">解析：{{ q.explanation }}</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { competitionApi } from '../../api'
const questions = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await competitionApi.getScoreDetail(); questions.value = Array.isArray(res) ? res : res?.data || [] } catch {}
})
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.q-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 10px; }
.q-num { font-size: 13px; color: #666; display: block; margin-bottom: 6px; }
.tag-right { color: #4CAF50; }
.tag-wrong { color: #C41E3A; }
.q-title { font-size: 14px; font-weight: 500; line-height: 1.5; display: block; margin-bottom: 10px; }
.opt { padding: 8px 12px; border-radius: 6px; margin-bottom: 4px; font-size: 13px; background: #f9f9f9; }
.opt.right { background: #E8F5E9; color: #4CAF50; }
.opt.wrong { background: #FFF0F0; color: #C41E3A; }
.explain { font-size: 12px; color: #C9A96E; display: block; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #eee; }
</style>
