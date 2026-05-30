<template>
  <view class="page">
    <view class="progress"><text>{{ current + 1 }}/{{ questions.length }}</text><view class="bar"><view class="fill" :style="{ width: ((current + 1) / questions.length * 100) + '%' }" /></view></view>
    <view v-if="questions.length" class="question-card">
      <text class="q-text">{{ questions[current]?.title }}</text>
      <view class="options">
        <view v-for="(opt, idx) in questions[current]?.options || []" :key="idx" class="opt" :class="{ selected: selected === idx }" @click="selected = idx">
          <text>{{ ['A','B','C','D'][idx] }}. {{ opt }}</text>
        </view>
      </view>
    </view>
    <view class="actions">
      <button v-if="current > 0" class="btn-prev" @click="prev">上一题</button>
      <button class="btn-next" @click="next">{{ current === questions.length - 1 ? '提交' : '下一题' }}</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { competitionApi } from '../../api'
const questions = ref<any[]>([]); const current = ref(0); const selected = ref(-1); const answers = ref<number[]>([])
onMounted(async () => {
  const pages = getCurrentPages(); const id = (pages[pages.length - 1] as any)?.options?.id
  try { const res: any = await competitionApi.getQuestions(id); questions.value = Array.isArray(res) ? res : res?.data || [] } catch {}
})
function prev() { if (current.value > 0) { answers.value[current.value] = selected.value; current.value--; selected.value = answers.value[current.value] ?? -1 } }
function next() {
  answers.value[current.value] = selected.value
  if (current.value < questions.value.length - 1) { current.value++; selected.value = answers.value[current.value] ?? -1 }
  else { submit() }
}
async function submit() {
  try { await competitionApi.submitAnswers({ answers: answers.value }); uni.redirectTo({ url: '/pages/competition/result' }) } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.progress { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 13px; color: #666; }
.bar { flex: 1; height: 4px; background: #ddd; border-radius: 2px; }
.fill { height: 100%; background: #C41E3A; border-radius: 2px; transition: width 0.3s; }
.question-card { background: #fff; border-radius: 12px; padding: 20px 16px; }
.q-text { font-size: 15px; font-weight: 500; line-height: 1.6; display: block; margin-bottom: 16px; }
.opt { padding: 12px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 8px; font-size: 14px; }
.opt.selected { border-color: #C41E3A; background: #FFF8F8; color: #C41E3A; }
.actions { display: flex; gap: 12px; margin-top: 16px; }
.btn-prev { flex: 1; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px; font-size: 14px; }
.btn-next { flex: 1; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 14px; }
</style>
