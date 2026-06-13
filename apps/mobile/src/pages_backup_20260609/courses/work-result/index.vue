<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">作业批改结果</text></view><view style="width:48rpx"/></view>

    <view v-if="isLoading" class="skel"><view v-for="i in 3" :key="i" class="skel-item"/></view>
    <view v-else class="body">
      <view class="status-card" :class="'s-'+work.status">
        <view class="sc-row"><text class="sc-icon">{{statusIcon}}</text><view><text class="sc-text">{{statusText}}</text><text v-if="work.status==='graded'" class="sc-score">{{work.score}}/{{work.maxScore}}分</text></view></view>
        <text class="sc-course">{{work.courseTitle}}·{{work.chapterTitle}}</text>
        <view v-if="work.status==='pending'" class="sc-wait"><text>● 教师正在批改中，请耐心等待...</text></view>
      </view>

      <view v-if="work.status==='graded'&&work.gradedBy" class="card"><text class="card-title">💬 教师评语</text>
        <view class="teacher-row"><text class="tr-avatar">{{work.gradedBy.name[0]}}</text><view><text class="tr-name">{{work.gradedBy.name}}</text><text class="tr-time">批改于{{work.gradedAt}}</text></view></view>
        <text class="comment-text">{{work.teacherComment}}</text>
        <view v-if="work.suggestions&&work.suggestions.length>0" class="suggestions"><text class="sg-title">修改建议：</text><text v-for="(s,i) in work.suggestions" :key="i" class="sg-item">• {{s}}</text></view>
      </view>

      <view class="card"><text class="card-title">📄 我的提交</text><text class="sub-time">{{work.submittedAt}}</text>
        <text class="sub-content">{{work.content}}</text>
        <view v-if="work.images.length>0" class="sub-imgs"><view v-for="(img,i) in work.images" :key="i" class="si-thumb" @click="previewIndex=i">🖼️</view></view>
      </view>

      <view v-if="work.status==='graded'&&work.score!==undefined" class="card"><text class="card-title">⭐ 评分详情</text>
        <view class="score-big"><text class="sb-num">{{work.score}}</text><text class="sb-max">满分{{work.maxScore}}分</text></view>
        <view class="score-bar"><view class="sb-fill" :style="{width:(work.score/work.maxScore*100)+'%'}"/></view>
      </view>
    </view>

    <view v-if="work.canResubmit" class="bottom-bar"><view class="bb-btn" @click="goResubmit">🔄 重新提交</view></view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
const isLoading=ref(true),previewIndex=ref<number|null>(null)

const work=ref<any>({id:'1',chapterTitle:'第一章：八字基础入门',courseTitle:'八字命理入门精讲',content:'通过本章学习，我对八字命理有了初步的认识。八字由年柱、月柱、日柱、时柱组成...',images:[''],submittedAt:'2024-01-15 14:30',status:'graded',score:85,maxScore:100,teacherComment:'作业完成得很好！对八字的基本概念理解准确，建议多练习排盘。',suggestions:['建议补充五行生克关系的说明','可以尝试分析自己的八字加深理解'],gradedAt:'2024-01-16 09:15',gradedBy:{name:'周易大师'},canResubmit:true})

const statusIcon=computed(()=>({pending:'⏰',graded:'✅',returned:'⚠️'} as any)[work.value.status])
const statusText=computed(()=>({pending:'批改中',graded:'已批改',returned:'已退回'} as any)[work.value.status])

function goBack(){uni.navigateBack()}
function goResubmit(){uni.navigateTo({url:'/pages/courses/work-submit/index'})}

onMounted(async()=>{await new Promise(r=>setTimeout(r,500));isLoading.value=false})
onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}
.skel{padding:24rpx}.skel-item{height:140rpx;background:#e8e8e8;border-radius:20rpx;margin-bottom:16rpx}
.body{padding:24rpx;padding-bottom:140rpx}
.status-card{border-radius:20rpx;padding:24rpx;margin-bottom:20rpx}.s-pending{background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.2)}.s-graded{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2)}.s-returned{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2)}
.sc-row{display:flex;align-items:center;gap:16rpx}.sc-icon{font-size:48rpx}.sc-text{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block}.sc-score{font-size:44rpx;font-weight:700;color:#22c55e}.sc-course{font-size:24rpx;color:#999;margin-top:8rpx;display:block}.sc-wait{padding:16rpx;background:rgba(255,255,255,.6);border-radius:12rpx;margin-top:16rpx;font-size:24rpx;color:#f97316}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}
.teacher-row{display:flex;align-items:center;gap:12rpx;margin-bottom:16rpx}.tr-avatar{width:56rpx;height:56rpx;border-radius:50%;background:rgba(196,30,58,.1);color:#C41E3A;display:flex;align-items:center;justify-content:center;font-size:24rpx}.tr-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.tr-time{font-size:22rpx;color:#999}
.comment-text{font-size:26rpx;color:#333;line-height:1.6}
.suggestions{margin-top:16rpx;padding:20rpx;background:rgba(239,68,68,.05);border-radius:16rpx}.sg-title{font-size:24rpx;color:#ef4444;font-weight:500;margin-bottom:8rpx;display:block}.sg-item{font-size:24rpx;color:#ef4444;display:block;margin-bottom:4rpx}
.sub-time{font-size:22rpx;color:#999;margin-bottom:16rpx;display:block}.sub-content{font-size:26rpx;color:#333;line-height:1.6;white-space:pre-wrap}.sub-imgs{display:flex;gap:12rpx;margin-top:16rpx;flex-wrap:wrap}.si-thumb{width:140rpx;height:140rpx;border-radius:12rpx;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:40rpx}
.score-big{text-align:center;padding:32rpx 0}.sb-num{font-size:80rpx;font-weight:900;color:#22c55e;display:block}.sb-max{font-size:24rpx;color:#999;margin-top:8rpx}.score-bar{height:12rpx;background:#E8E0D5;border-radius:6rpx;overflow:hidden}.sb-fill{height:100%;background:linear-gradient(90deg,#22c55e,#4ade80);border-radius:6rpx}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #E8E0D5;padding:20rpx 24rpx;z-index:50}.bb-btn{padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:28rpx;font-weight:600}
</style>
