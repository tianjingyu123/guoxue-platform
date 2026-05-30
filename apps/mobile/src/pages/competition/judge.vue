<template>
  <view class="page">
    <text class="title">评审打分</text>
    <view v-for="s in submissions" :key="s.id" class="sub-card">
      <text class="sub-name">{{ s.participantName }}</text>
      <text class="sub-work">{{ s.title || '作品' }}</text>
      <view class="score-row">
        <text>评分：</text>
        <input v-model="s.score" type="number" class="score-input" placeholder="0-100" />
      </view>
      <textarea v-model="s.comment" placeholder="评语（选填）" class="textarea" />
      <button class="btn-score" @click="submitScore(s)">提交评分</button>
    </view>
    <EmptyState v-if="!submissions.length" text="暂无待评作品" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import EmptyState from '../../components/EmptyState.vue'
import { competitionApi } from '../../api'
const submissions = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await competitionApi.getJudgeSubmissions(); submissions.value = Array.isArray(res) ? res : res?.data || [] } catch {}
})
async function submitScore(s: any) {
  try { await competitionApi.submitScore({ submissionId: s.id, score: Number(s.score), comment: s.comment }); uni.showToast({ title: '提交成功' }) } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.title { font-size: 16px; font-weight: 600; display: block; margin-bottom: 12px; }
.sub-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.sub-name { font-size: 14px; font-weight: 500; display: block; }
.sub-work { font-size: 12px; color: #999; display: block; margin-top: 2px; margin-bottom: 10px; }
.score-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 14px; }
.score-input { width: 80px; border: 1px solid #ddd; border-radius: 6px; padding: 6px 8px; font-size: 14px; text-align: center; }
.textarea { border: 1px solid #ddd; border-radius: 8px; padding: 8px; font-size: 13px; height: 50px; width: 100%; box-sizing: border-box; margin-bottom: 10px; }
.btn-score { background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; }
</style>
